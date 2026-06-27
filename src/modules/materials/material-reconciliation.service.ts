import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  AuditSource,
  FormInstanceStatus,
  MaterialLedgerType,
  Prisma,
  StandardFormCode,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../common/services/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PrismaTransaction } from '../../common/interfaces/audit.interface';
import {
  extractMaterialUsage,
  extractMirMaterial,
  isMaterialUsageForm,
  isMirForm,
} from './material-payload.extractor';

export interface MaterialDeductionResult {
  accepted: true;
  ledgerEntryId: string;
  balanceBefore: string;
  balanceAfter: string;
  liabilityShiftRedAlert: boolean;
  message: string;
}

@Injectable()
export class MaterialReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Called when an MIR is externally approved — establishes inventory balance.
   */
  async establishInventoryFromMir(
    mirFormInstanceId: string,
    user: AuthenticatedUser,
    tx?: PrismaTransaction,
  ) {
    const db = tx ?? this.prisma;

    const mir = await db.formInstance.findFirst({
      where: { id: mirFormInstanceId, deletedAt: null },
      include: { template: true },
    });

    if (!mir || !isMirForm(mir.template.code)) {
      throw new BadRequestException('Approved form is not a valid MIR');
    }

    if (mir.status !== FormInstanceStatus.APPROVED) {
      throw new BadRequestException('MIR must be approved before inventory credit');
    }

    const existing = await db.materialInventory.findUnique({
      where: { mirFormInstanceId },
    });

    if (existing) {
      return existing;
    }

    const material = extractMirMaterial(mir.data as Record<string, unknown>);

    if (!material.materialCode || material.quantity <= 0) {
      throw new BadRequestException(
        'MIR payload must include materialCode and positive quantity',
      );
    }

    const quantity = new Decimal(material.quantity);

    const inventory = await db.materialInventory.create({
      data: {
        projectId: mir.projectId,
        mirFormInstanceId: mir.id,
        materialCode: material.materialCode,
        materialName: material.materialName,
        unit: material.unit ?? 'unit',
        initialQuantity: quantity,
        availableBalance: quantity,
        organizationId: mir.organizationId,
      },
    });

    await db.materialLedgerEntry.create({
      data: {
        inventoryId: inventory.id,
        formInstanceId: mir.id,
        ledgerType: MaterialLedgerType.MIR_CREDIT,
        quantityDelta: quantity,
        balanceBefore: new Decimal(0),
        balanceAfter: quantity,
        liabilityShiftRedAlert: false,
        notes: 'MIR approval — initial inventory credit',
      },
    });

    await this.audit.record(
      {
        entityType: 'MaterialInventory',
        entityId: inventory.id,
        action: 'MIR_CREDIT',
        newData: inventory,
        context: {
          ...this.audit.buildContext(user),
          projectId: mir.projectId,
          source: AuditSource.SYSTEM,
          metadata: { mirFormInstanceId },
        },
      },
      tx,
    );

    return inventory;
  }

  /**
   * WIR/MDR submission — deduct quantity. NEVER blocks; flags red alert on overage.
   */
  async processMaterialDeduction(
    formInstanceId: string,
    user: AuthenticatedUser,
    tx?: PrismaTransaction,
  ): Promise<MaterialDeductionResult> {
    const db = tx ?? this.prisma;

    const form = await db.formInstance.findFirst({
      where: { id: formInstanceId, deletedAt: null },
      include: { template: true },
    });

    if (!form) {
      throw new NotFoundException('Form instance not found');
    }

    if (!isMaterialUsageForm(form.template.code)) {
      throw new BadRequestException('Form is not a WIR or MDR');
    }

    const usage = extractMaterialUsage(form.data as Record<string, unknown>);

    if (!usage.mirFormInstanceId) {
      throw new BadRequestException(
        'WIR/MDR must reference an approved MIR via mirFormInstanceId',
      );
    }

    if (usage.quantityUsed <= 0) {
      throw new BadRequestException('quantityUsed must be positive');
    }

    const existingLedger = await db.materialLedgerEntry.findFirst({
      where: {
        formInstanceId,
        ledgerType: {
          in: [MaterialLedgerType.WIR_DEBIT, MaterialLedgerType.MDR_DEBIT],
        },
      },
    });

    if (existingLedger) {
      return {
        accepted: true,
        ledgerEntryId: existingLedger.id,
        balanceBefore: existingLedger.balanceBefore.toString(),
        balanceAfter: existingLedger.balanceAfter.toString(),
        liabilityShiftRedAlert: existingLedger.liabilityShiftRedAlert,
        message: 'Deduction already recorded (idempotent)',
      };
    }

    const inventory = await db.materialInventory.findUnique({
      where: { mirFormInstanceId: usage.mirFormInstanceId },
    });

    if (!inventory) {
      throw new BadRequestException(
        'Referenced MIR has no approved inventory balance',
      );
    }

    if (
      usage.materialCode &&
      usage.materialCode !== inventory.materialCode
    ) {
      throw new BadRequestException(
        'materialCode does not match the referenced MIR inventory',
      );
    }

    const quantityUsed = new Decimal(usage.quantityUsed);
    const balanceBefore = inventory.availableBalance;
    const balanceAfter = Decimal.max(
      balanceBefore.minus(quantityUsed),
      new Decimal(0),
    );

    const liabilityShiftRedAlert = quantityUsed.greaterThan(balanceBefore);

    const ledgerType =
      form.template.code === StandardFormCode.WIR
        ? MaterialLedgerType.WIR_DEBIT
        : MaterialLedgerType.MDR_DEBIT;

    const ledgerEntry = await db.materialLedgerEntry.create({
      data: {
        inventoryId: inventory.id,
        formInstanceId: form.id,
        ledgerType,
        quantityDelta: quantityUsed.negated(),
        balanceBefore,
        balanceAfter,
        liabilityShiftRedAlert,
        notes: liabilityShiftRedAlert
          ? `CRITICAL: quantityUsed (${quantityUsed}) exceeds available balance (${balanceBefore}). Liability shifted to Consultant.`
          : undefined,
      },
    });

    await db.materialInventory.update({
      where: { id: inventory.id },
      data: { availableBalance: balanceAfter },
    });

    if (liabilityShiftRedAlert) {
      await db.formInstance.update({
        where: { id: form.id },
        data: { liabilityShiftRedAlert: true },
      });
    }

    const message = liabilityShiftRedAlert
      ? 'Submission accepted with LIABILITY_SHIFT_RED_ALERT — Consultant must investigate'
      : 'Material deduction applied successfully';

    await this.audit.record(
      {
        entityType: 'MaterialLedgerEntry',
        entityId: ledgerEntry.id,
        action: liabilityShiftRedAlert
          ? 'LIABILITY_SHIFT_RED_ALERT'
          : 'MATERIAL_DEDUCTION',
        newData: {
          ledgerEntry,
          quantityUsed: quantityUsed.toString(),
          balanceBefore: balanceBefore.toString(),
          balanceAfter: balanceAfter.toString(),
          liabilityShiftRedAlert,
        },
        context: {
          ...this.audit.buildContext(user),
          projectId: form.projectId,
          source: AuditSource.SYSTEM,
          metadata: {
            formCode: form.template.code,
            mirFormInstanceId: usage.mirFormInstanceId,
          },
        },
      },
      tx,
    );

    return {
      accepted: true,
      ledgerEntryId: ledgerEntry.id,
      balanceBefore: balanceBefore.toString(),
      balanceAfter: balanceAfter.toString(),
      liabilityShiftRedAlert,
      message,
    };
  }

  async getInventoryById(inventoryId: string) {
    const inventory = await this.prisma.materialInventory.findUnique({
      where: { id: inventoryId },
      include: {
        mirForm: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
          },
        },
        ledgerEntries: {
          orderBy: { createdAt: 'desc' },
          include: {
            formInstance: {
              select: {
                id: true,
                referenceNumber: true,
                template: { select: { code: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!inventory) {
      throw new NotFoundException('Material inventory not found');
    }

    return inventory;
  }

  async getProjectInventory(projectId: string) {
    return this.prisma.materialInventory.findMany({
      where: { projectId },
      include: {
        mirForm: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
          },
        },
        ledgerEntries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInventoryByMir(mirFormInstanceId: string) {
    const inventory = await this.prisma.materialInventory.findUnique({
      where: { mirFormInstanceId },
      include: {
        ledgerEntries: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!inventory) {
      throw new NotFoundException('No inventory found for this MIR');
    }

    return inventory;
  }

  async getRedAlertForms(projectId: string) {
    return this.prisma.formInstance.findMany({
      where: {
        projectId,
        liabilityShiftRedAlert: true,
        deletedAt: null,
      },
      include: {
        template: { select: { code: true, name: true } },
        materialLedgerEntries: {
          where: { liabilityShiftRedAlert: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
