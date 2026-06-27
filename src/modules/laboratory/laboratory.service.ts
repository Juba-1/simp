import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  AuditSource,
  LabTestRequestStatus,
  OrganizationType,
  Prisma,
  StandardFormCode,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { AuditService } from '../../common/services/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PRISMA_INTERACTIVE_TX_OPTIONS } from '../../database/prisma-transaction.options';
import { BarcodeService } from './barcode.service';
import {
  CreateLabTestRequestDto,
  SubmitLabTestResultDto,
} from './dto/laboratory.dto';

/** Blind view — lab sees sample context, not contractor identity */
export interface ParentFormReference {
  referenceNumber: string;
  templateCode: string;
  location?: string;
  materialType?: string;
  chainage?: string;
}

export interface BlindSampleView {
  id: string;
  ltrId: string;
  testType: string;
  anonymousLabel: string;
  status: LabTestRequestStatus;
  requestedAt: Date;
  sampleCategory: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  parentForm: ParentFormReference;
}

@Injectable()
export class LaboratoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
    private readonly audit: AuditService,
    private readonly barcodeService: BarcodeService,
  ) {}

  async createTestRequest(
    user: AuthenticatedUser,
    dto: CreateLabTestRequestDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    const form = await this.prisma.formInstance.findFirst({
      where: { id: dto.formInstanceId, deletedAt: null },
      include: { template: true },
    });

    if (!form) {
      throw new NotFoundException('Form instance not found');
    }

    await this.tenantScope.assertProjectAccess(user, form.projectId);

    const allowedCodes: StandardFormCode[] = [
      StandardFormCode.WIR,
      StandardFormCode.MIR,
    ];

    if (!allowedCodes.includes(form.template.code)) {
      throw new BadRequestException(
        'Lab tests can only be requested for WIR or MIR forms',
      );
    }

    const existingPending = await this.prisma.labTestRequest.findFirst({
      where: {
        formInstanceId: form.id,
        status: { in: [LabTestRequestStatus.PENDING, LabTestRequestStatus.IN_PROGRESS] },
      },
    });

    if (existingPending) {
      throw new ConflictException(
        'An active lab test request already exists for this form',
      );
    }

    const testType =
      dto.testType?.trim() ||
      this.inferTestType(form.template.code, form.data as Record<string, unknown>);

    const ltrId = this.barcodeService.generate();
    const anonymousLabel = ltrId;

    const request = await this.prisma.labTestRequest.create({
      data: {
        projectId: form.projectId,
        formInstanceId: form.id,
        barcode: ltrId,
        testType,
        anonymousLabel,
        requestedByUserId: user.id,
        requestedByOrgId: user.organizationId,
      },
    });

    await this.audit.record({
      entityType: 'LabTestRequest',
      entityId: request.id,
      action: 'LAB_TEST_REQUESTED',
      newData: {
        id: request.id,
        ltrId: request.barcode,
        formInstanceId: form.id,
        testType,
      },
      context: {
        ...this.audit.buildContext(user),
        projectId: form.projectId,
        source: AuditSource.API,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { anonymousLabel },
      },
    });

    return request;
  }

  async getPendingRequestsForLab(user: AuthenticatedUser) {
    this.assertLaboratory(user);
    const projectIds = await this.getLabProjectIds(user);
    if (projectIds.length === 0) return [];

    return this.prisma.labTestRequest.findMany({
      where: {
        projectId: { in: projectIds },
        status: {
          in: [LabTestRequestStatus.PENDING, LabTestRequestStatus.IN_PROGRESS],
        },
      },
      include: {
        formInstance: {
          select: { template: { select: { code: true, name: true } } },
        },
        project: { select: { id: true, code: true, name: true, nameAr: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getRequestById(user: AuthenticatedUser, requestId: string) {
    this.assertLaboratory(user);

    const request = await this.prisma.labTestRequest.findUnique({
      where: { id: requestId },
      include: {
        formInstance: { include: { template: true } },
        project: { select: { id: true, code: true, name: true, nameAr: true } },
        result: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Lab test request not found');
    }

    await this.assertLabProjectAccess(user, request.projectId);

    if (
      request.status === LabTestRequestStatus.PENDING &&
      !request.result
    ) {
      await this.prisma.labTestRequest.update({
        where: { id: request.id },
        data: { status: LabTestRequestStatus.IN_PROGRESS },
      });
      request.status = LabTestRequestStatus.IN_PROGRESS;
    }

    return this.toBlindView(request);
  }

  async submitResultByRequestId(
    user: AuthenticatedUser,
    requestId: string,
    dto: SubmitLabTestResultDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    this.assertLaboratory(user);

    const request = await this.prisma.labTestRequest.findUnique({
      where: { id: requestId },
      include: { formInstance: true, result: true },
    });

    if (!request) {
      throw new NotFoundException('Lab test request not found');
    }

    await this.assertLabProjectAccess(user, request.projectId);

    return this.submitResultForRequest(user, request, dto, meta);
  }

  /**
   * Blind lookup by LTR ID — retained for API compatibility.
   */
  async lookupByBarcode(
    user: AuthenticatedUser,
    rawBarcode: string,
  ): Promise<BlindSampleView> {
    this.assertLaboratory(user);

    const barcode = this.barcodeService.normalize(rawBarcode);

    const request = await this.prisma.labTestRequest.findUnique({
      where: { barcode },
      include: {
        formInstance: { include: { template: true } },
        project: { select: { id: true, code: true, name: true, nameAr: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('No sample found for this LTR ID');
    }

    await this.assertLabProjectAccess(user, request.projectId);

    return this.toBlindView(request);
  }

  async submitResultByBarcode(
    user: AuthenticatedUser,
    rawBarcode: string,
    dto: SubmitLabTestResultDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    this.assertLaboratory(user);

    const barcode = this.barcodeService.normalize(rawBarcode);

    const request = await this.prisma.labTestRequest.findUnique({
      where: { barcode },
      include: { formInstance: true, result: true },
    });

    if (!request) {
      throw new NotFoundException('No sample found for this LTR ID');
    }

    await this.assertLabProjectAccess(user, request.projectId);

    return this.submitResultForRequest(user, request, dto, meta);
  }

  private async submitResultForRequest(
    user: AuthenticatedUser,
    request: {
      id: string;
      barcode: string;
      formInstanceId: string;
      projectId: string;
      status: LabTestRequestStatus;
      result: { id: string } | null;
      formInstance: { data: unknown };
    },
    dto: SubmitLabTestResultDto,
    meta: { ipAddress?: string; userAgent?: string },
  ) {
    if (request.result) {
      throw new ConflictException('Results already submitted for this request');
    }

    if (request.status === LabTestRequestStatus.CANCELLED) {
      throw new BadRequestException('This test request was cancelled');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const created = await tx.labTestResult.create({
        data: {
          requestId: request.id,
          submittedByUserId: user.id,
          laboratoryOrgId: user.organizationId,
          resultStatus: dto.resultStatus,
          metrics: dto.metrics as Prisma.InputJsonValue,
          reportNotes: dto.reportNotes,
        },
      });

      await tx.labTestRequest.update({
        where: { id: request.id },
        data: { status: LabTestRequestStatus.COMPLETED },
      });

      const existingData = (request.formInstance.data ?? {}) as Record<string, unknown>;
      const labResults = Array.isArray(existingData.labResults)
        ? existingData.labResults
        : [];

      await tx.formInstance.update({
        where: { id: request.formInstanceId },
        data: {
          data: {
            ...existingData,
            labResults: [
              ...labResults,
              {
                ltrId: request.barcode,
                resultStatus: dto.resultStatus,
                metrics: dto.metrics,
                submittedAt: created.submittedAt.toISOString(),
              },
            ],
          } as Prisma.InputJsonValue,
        },
      });

      return created;
    }, PRISMA_INTERACTIVE_TX_OPTIONS);

    await this.audit.record({
      entityType: 'LabTestResult',
      entityId: result.id,
      action: 'LAB_RESULT_SUBMITTED',
      newData: {
        resultId: result.id,
        requestId: request.id,
        ltrId: request.barcode,
        resultStatus: dto.resultStatus,
        formInstanceId: request.formInstanceId,
      },
      context: {
        ...this.audit.buildContext(user),
        projectId: request.projectId,
        source: AuditSource.API,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: {
          blindSubmission: true,
          metricsKeys: Object.keys(dto.metrics),
        },
      },
    });

    return {
      result,
      linkedFormInstanceId: request.formInstanceId,
      message: 'Result submitted and linked to source form',
    };
  }

  async getRequestsByProject(user: AuthenticatedUser, projectId: string) {
    await this.tenantScope.assertProjectAccess(user, projectId);

    return this.prisma.labTestRequest.findMany({
      where: { projectId },
      include: {
        result: true,
        formInstance: {
          select: {
            id: true,
            referenceNumber: true,
            template: { select: { code: true, name: true } },
          },
        },
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            organization: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRequestsByForm(user: AuthenticatedUser, formInstanceId: string) {
    const form = await this.prisma.formInstance.findFirst({
      where: { id: formInstanceId, deletedAt: null },
    });

    if (!form) {
      throw new NotFoundException('Form instance not found');
    }

    await this.tenantScope.assertProjectAccess(user, form.projectId);

    return this.prisma.labTestRequest.findMany({
      where: { formInstanceId },
      include: { result: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getLabProjectIds(user: AuthenticatedUser): Promise<string[]> {
    const memberships = await this.prisma.projectOrganization.findMany({
      where: {
        organizationId: user.organizationId,
        role: 'LABORATORY',
        deletedAt: null,
      },
      select: { projectId: true },
    });
    return memberships.map((m) => m.projectId);
  }

  private inferTestType(
    formCode: StandardFormCode,
    data: Record<string, unknown>,
  ): string {
    const fromData = String(data.testType ?? data.materialName ?? '').trim();
    if (fromData.length >= 2) return fromData;

    switch (formCode) {
      case StandardFormCode.WIR:
        return 'CONCRETE_SLUMP';
      case StandardFormCode.MIR:
        return 'SOIL_COMPACTION';
      default:
        return 'CONCRETE_SLUMP';
    }
  }

  private extractParentFormContext(formInstance: {
    referenceNumber: string | null;
    template: { code: StandardFormCode };
    data: unknown;
  }): ParentFormReference {
    const data = (formInstance.data ?? {}) as Record<string, unknown>;
    const templateCode = formInstance.template.code;

    const location = String(
      data.location ?? data.deliveryLocation ?? data.workDescription ?? '',
    ).trim();
    const materialType = String(
      data.materialName ?? data.materialCode ?? '',
    ).trim();
    const chainage = String(data.chainage ?? data.location ?? '').trim();

    return {
      referenceNumber: formInstance.referenceNumber ?? formInstance.template.code,
      templateCode,
      ...(location ? { location } : {}),
      ...(materialType ? { materialType } : {}),
      ...(chainage && chainage !== location ? { chainage } : {}),
    };
  }

  private toBlindView(request: {
    id: string;
    barcode: string;
    testType: string;
    anonymousLabel: string;
    status: LabTestRequestStatus;
    createdAt: Date;
    projectId: string;
    project: { code: string; name: string };
    formInstance: {
      referenceNumber: string | null;
      template: { code: StandardFormCode };
      data: unknown;
    };
  }): BlindSampleView {
    return {
      id: request.id,
      ltrId: request.barcode,
      testType: request.testType,
      anonymousLabel: request.anonymousLabel,
      status: request.status,
      requestedAt: request.createdAt,
      sampleCategory: request.formInstance.template.code,
      projectId: request.projectId,
      projectCode: request.project.code,
      projectName: request.project.name,
      parentForm: this.extractParentFormContext(request.formInstance),
    };
  }

  private assertLaboratory(user: AuthenticatedUser): void {
    if (user.organizationType !== OrganizationType.LABORATORY) {
      throw new ForbiddenException(
        'Only Laboratory organizations can access lab test operations',
      );
    }
  }

  private async assertLabProjectAccess(
    user: AuthenticatedUser,
    projectId: string,
  ): Promise<void> {
    const membership = await this.prisma.projectOrganization.findFirst({
      where: {
        projectId,
        organizationId: user.organizationId,
        role: 'LABORATORY',
        deletedAt: null,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Your laboratory is not assigned to this project',
      );
    }
  }
}
