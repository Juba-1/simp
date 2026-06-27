import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { OrganizationType, Prisma, StandardFormCode } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { AuditService } from '../../common/services/audit.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { AuditContext } from '../../common/interfaces/audit.interface';
import {
  CreateFormTemplateDto,
  PublishTemplateVersionDto,
  UpdateFormTemplateDto,
} from './dto/form-template.dto';
import { parseFormSchema } from './validators/form-schema.validator';
import { STANDARD_FORM_TEMPLATES } from './standard-form-templates';

@Injectable()
export class FormTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(FormTemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantScope: TenantScopeService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncStandardLtrSchemas();
  }

  /** Upgrade stale LTR templates still carrying the legacy generic schema */
  private async syncStandardLtrSchemas(): Promise<void> {
    const ltrDef = STANDARD_FORM_TEMPLATES.find(
      (t) => t.code === StandardFormCode.LTR,
    );
    if (!ltrDef) return;

    const templates = await this.prisma.formTemplate.findMany({
      where: { code: StandardFormCode.LTR, deletedAt: null },
      select: { id: true, version: true, schema: true },
    });

    for (const tpl of templates) {
      const fields = (tpl.schema as { fields?: Array<{ key: string }> })?.fields ?? [];
      const hasCmtFields = fields.some(
        (f) =>
          f.key === 'deliveryTicketNo' ||
          f.key === 'failureLoadKn' ||
          f.key === 'mdd',
      );
      const hasLegacyFields = fields.some(
        (f) => f.key === 'specifiedValue' || f.key === 'resultSummary',
      );

      if (hasCmtFields && !hasLegacyFields) continue;

      await this.prisma.formTemplate.update({
        where: { id: tpl.id },
        data: {
          schema: ltrDef.schema as Prisma.InputJsonValue,
          version: tpl.version + 1,
        },
      });
      this.logger.log(`Synced LTR CMT schema for template ${tpl.id}`);
    }
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateFormTemplateDto,
    auditContext?: AuditContext,
  ) {
    await this.tenantScope.assertProjectAccess(user, dto.projectId);

    if (user.organizationType !== OrganizationType.CLIENT) {
      throw new ForbiddenException('Only Client organizations can create form templates');
    }

    this.tenantScope.assertOrgAdmin(user);
    parseFormSchema(dto.schema);

    const existing = await this.prisma.formTemplate.findFirst({
      where: {
        projectId: dto.projectId,
        code: dto.code,
        version: 1,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Template ${dto.code} already exists for this project`,
      );
    }

    const template = await this.prisma.formTemplate.create({
      data: {
        projectId: dto.projectId,
        code: dto.code,
        name: dto.name,
        nameAr: dto.nameAr,
        schema: dto.schema as unknown as Prisma.InputJsonValue,
        uiSchema: dto.uiSchema as Prisma.InputJsonValue | undefined,
        createdByOrgId: user.organizationId,
      },
    });

    await this.audit.record({
      entityType: 'FormTemplate',
      entityId: template.id,
      action: 'CREATE',
      newData: template,
      context: {
        ...this.audit.buildContext(user, auditContext),
        projectId: dto.projectId,
      },
    });

    return template;
  }

  async findByProject(user: AuthenticatedUser, projectId: string) {
    await this.tenantScope.assertProjectAccess(user, projectId);

    return this.prisma.formTemplate.findMany({
      where: { projectId, deletedAt: null, isActive: true },
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
    });
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const template = await this.prisma.formTemplate.findFirst({
      where: { id, deletedAt: null },
    });

    if (!template) {
      throw new NotFoundException('Form template not found');
    }

    await this.tenantScope.assertProjectAccess(user, template.projectId);
    return template;
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateFormTemplateDto,
    auditContext?: AuditContext,
  ) {
    const existing = await this.findOne(user, id);
    this.tenantScope.assertOrgAdmin(user);

    if (dto.schema) {
      parseFormSchema(dto.schema);
    }

    const updated = await this.prisma.formTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        schema: dto.schema as Prisma.InputJsonValue | undefined,
        uiSchema: dto.uiSchema as Prisma.InputJsonValue | undefined,
        isActive: dto.isActive,
      },
    });

    await this.audit.record({
      entityType: 'FormTemplate',
      entityId: id,
      action: 'UPDATE',
      previousData: existing,
      newData: updated,
      context: {
        ...this.audit.buildContext(user, auditContext),
        projectId: existing.projectId,
      },
    });

    return updated;
  }

  async publishVersion(
    user: AuthenticatedUser,
    id: string,
    dto: PublishTemplateVersionDto,
    auditContext?: AuditContext,
  ) {
    const current = await this.findOne(user, id);
    this.tenantScope.assertOrgAdmin(user);
    parseFormSchema(dto.schema);

    const newVersion = await this.prisma.formTemplate.create({
      data: {
        projectId: current.projectId,
        code: current.code,
        name: current.name,
        nameAr: current.nameAr,
        version: current.version + 1,
        schema: dto.schema as unknown as Prisma.InputJsonValue,
        uiSchema: (dto.uiSchema ?? current.uiSchema) as Prisma.InputJsonValue,
        createdByOrgId: user.organizationId,
      },
    });

    await this.prisma.formTemplate.update({
      where: { id: current.id },
      data: { isActive: false },
    });

    await this.audit.record({
      entityType: 'FormTemplate',
      entityId: newVersion.id,
      action: 'PUBLISH_VERSION',
      previousData: { fromVersion: current.version, templateId: current.id },
      newData: newVersion,
      context: {
        ...this.audit.buildContext(user, auditContext),
        projectId: current.projectId,
        metadata: { previousTemplateId: current.id },
      },
    });

    return newVersion;
  }

  async remove(user: AuthenticatedUser, id: string, auditContext?: AuditContext) {
    const existing = await this.findOne(user, id);
    this.tenantScope.assertOrgAdmin(user);

    const deleted = await this.prisma.formTemplate.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await this.audit.record({
      entityType: 'FormTemplate',
      entityId: id,
      action: 'SOFT_DELETE',
      previousData: existing,
      newData: deleted,
      context: {
        ...this.audit.buildContext(user, auditContext),
        projectId: existing.projectId,
      },
    });

    return deleted;
  }

  /**
   * Idempotent seed of WIR, NCR, MIR, MDR standard JSONB templates for a project.
   */
  async seedStandardTemplates(
    user: AuthenticatedUser,
    projectId: string,
    auditContext?: AuditContext,
  ) {
    await this.tenantScope.assertProjectAccess(user, projectId);

    if (user.organizationType !== OrganizationType.CLIENT) {
      throw new ForbiddenException(
        'Only Client organizations can seed form templates',
      );
    }

    this.tenantScope.assertOrgAdmin(user);

    const created: Awaited<ReturnType<typeof this.create>>[] = [];
    const skipped: string[] = [];
    const updated: string[] = [];

    for (const def of STANDARD_FORM_TEMPLATES) {
      const existing = await this.prisma.formTemplate.findFirst({
        where: {
          projectId,
          code: def.code,
          version: 1,
          deletedAt: null,
        },
      });

      parseFormSchema(def.schema);

      if (existing) {
        await this.prisma.formTemplate.update({
          where: { id: existing.id },
          data: {
            name: def.name,
            nameAr: def.nameAr,
            schema: def.schema as unknown as Prisma.InputJsonValue,
          },
        });

        await this.audit.record({
          entityType: 'FormTemplate',
          entityId: existing.id,
          action: 'UPDATE',
          previousData: { schema: existing.schema },
          newData: { schema: def.schema },
          context: {
            ...this.audit.buildContext(user, auditContext),
            projectId,
            metadata: { code: def.code, reason: 'STANDARD_TEMPLATE_REFRESH' },
          },
        });

        updated.push(def.code);
        continue;
      }

      const template = await this.prisma.formTemplate.create({
        data: {
          projectId,
          code: def.code,
          name: def.name,
          nameAr: def.nameAr,
          schema: def.schema as unknown as Prisma.InputJsonValue,
          createdByOrgId: user.organizationId,
        },
      });

      await this.audit.record({
        entityType: 'FormTemplate',
        entityId: template.id,
        action: 'SEED_STANDARD',
        newData: template,
        context: {
          ...this.audit.buildContext(user, auditContext),
          projectId,
          metadata: { code: def.code },
        },
      });

      created.push(template);
    }

    return {
      projectId,
      createdCount: created.length,
      updatedCount: updated.length,
      skippedCodes: skipped,
      updatedCodes: updated,
      templates: created,
    };
  }
}
