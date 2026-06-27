/**
 * SIMP PMIS — E2E / dashboard seed (legally auditable demo dataset)
 *
 * Run:  npx prisma db seed
 * Login: all E2E users share password `Seed@2026!`
 * Super Admin: rakaizcmp@gmail.com / `Rakaiz@SIMP2026!`
 *
 * Covers: SLA breaches, rejection/resubmit revisions, IPC billing,
 * geolocation attachments, time-spoofing alerts, 60-day timeline.
 */
import {
  ApprovalActionType,
  AuditSource,
  EscalationSeverity,
  FormInstanceStatus,
  IpcStatus,
  LabTestRequestStatus,
  MaterialLedgerType,
  OrganizationType,
  Prisma,
  PrismaClient,
  ProjectOrganizationRole,
  ProjectStatus,
  StandardFormCode,
  WorkflowPhase,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { STANDARD_FORM_TEMPLATES } from '../src/modules/forms/standard-form-templates';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const SEED_PASSWORD = 'Seed@2026!';
const SUPER_ADMIN_EMAIL = 'rakaizcmp@gmail.com';
const SUPER_ADMIN_PASSWORD = 'Rakaiz@SIMP2026!';
const SUPER_ADMIN_USERNAME = 'rakaiz.superadmin';

/** Fixed "now" for reproducible 60-day timelines (do not use bare new Date()). */
const SEED_ANCHOR = new Date('2026-06-20T12:00:00.000Z');
const EXTERNAL_SLA_HOURS = 48;

// ─── Deterministic IDs (stable across re-seeds) ───────────────────────────────

const ID = {
  orgPlatform: 'e2e00000-0000-4000-8000-000000000001',
  superAdminUser: 'e2e00000-0000-4000-8000-000000000010',
  orgClient: 'e2e00001-0001-4001-8001-000000000001',
  orgConsultant: 'e2e00001-0001-4001-8001-000000000002',
  orgMc: 'e2e00001-0001-4001-8001-000000000003',
  orgSub: 'e2e00001-0001-4001-8001-000000000004',
  orgLab: 'e2e00001-0001-4001-8001-000000000005',
  project: 'e2e00002-0002-4002-8002-000000000001',
  tplMir: 'e2e00003-0003-4003-8003-000000000001',
  tplWir: 'e2e00003-0003-4003-8003-000000000002',
  tplNcr: 'e2e00003-0003-4003-8003-000000000003',
  tplSor: 'e2e00003-0003-4003-8003-000000000004',
  tplCvi: 'e2e00003-0003-4003-8003-000000000005',
  tplLtr: 'e2e00003-0003-4003-8003-000000000006',
  labReqPending: 'e2e00007-0007-4007-8007-000000000001',
  ipc1: 'e2e00004-0004-4004-8004-000000000001',
  mirApproved: 'e2e00005-0005-4005-8005-000000000001',
  mirSlaBreach: 'e2e00005-0005-4005-8005-000000000002',
  wirIpc1: 'e2e00005-0005-4005-8005-000000000011',
  wirIpc2: 'e2e00005-0005-4005-8005-000000000012',
  wirIpc3: 'e2e00005-0005-4005-8005-000000000013',
  wirSpoof: 'e2e00005-0005-4005-8005-000000000014',
  wirSlaBreach: 'e2e00005-0005-4005-8005-000000000015',
  rej1: 'e2e00005-0005-4005-8005-000000000021',
  rej2: 'e2e00005-0005-4005-8005-000000000022',
  rej3: 'e2e00005-0005-4005-8005-000000000023',
  resub1: 'e2e00005-0005-4005-8005-000000000031',
  resub2: 'e2e00005-0005-4005-8005-000000000032',
  resub3: 'e2e00005-0005-4005-8005-000000000033',
  invMir: 'e2e00006-0006-4006-8006-000000000001',
} as const;

const AL_KHOBAR_LAT = 26.28;
const AL_KHOBAR_LNG = 50.2;

const SEED_UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

/** Minimal valid 1×1 JPEG for E2E photo verification in local storage. */
const SEED_PLACEHOLDER_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0rkJzgoLEtRVGiioqM4QzpaNHo4KUnhyK4vNzszP9ao0DjW8NGr5yULL1FRkWEGJxgUos8v//EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
  'base64',
);

function buildMockSitePhoto(
  filename: string,
  capturedAt: Date,
  formId: string,
  offsetMeters = 0,
) {
  const lat = AL_KHOBAR_LAT + offsetMeters * 0.0001;
  const lng = AL_KHOBAR_LNG + offsetMeters * 0.0001;
  const storageKey = `e2e-seed/${formId}/${filename}`;

  return {
    fileName: filename,
    captureTimestamp: capturedAt.toISOString(),
    gpsLat: lat,
    gpsLng: lng,
    sizeBytes: SEED_PLACEHOLDER_JPEG.length,
    storageKey,
  };
}

async function writeSeedImageFile(storageKey: string): Promise<void> {
  const absolutePath = join(SEED_UPLOAD_DIR, storageKey);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, SEED_PLACEHOLDER_JPEG);
}

// ─── Time helpers ────────────────────────────────────────────────────────────

function atDaysAgo(days: number, hourUTC = 8, minute = 0): Date {
  const d = new Date(SEED_ANCHOR);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hourUTC, minute, 0, 0);
  return d;
}

function hoursAfter(start: Date, hours: number): Date {
  return new Date(start.getTime() + hours * 60 * 60 * 1000);
}

// ─── Cleanup (reverse FK order) ──────────────────────────────────────────────

async function wipeSeedData() {
  const orgIds = [
    ID.orgClient,
    ID.orgConsultant,
    ID.orgMc,
    ID.orgSub,
    ID.orgLab,
  ];

  const project = await prisma.project.findUnique({ where: { id: ID.project } });
  if (project) {
    await prisma.auditLog.deleteMany({ where: { projectId: ID.project } });
    await prisma.slaEscalation.deleteMany({ where: { projectId: ID.project } });
    await prisma.approvalRecord.deleteMany({
      where: { formInstance: { projectId: ID.project } },
    });
    await prisma.materialLedgerEntry.deleteMany({
      where: { formInstance: { projectId: ID.project } },
    });
    await prisma.materialInventory.deleteMany({ where: { projectId: ID.project } });
    await prisma.labTestResult.deleteMany({
      where: { request: { projectId: ID.project } },
    });
    await prisma.labTestRequest.deleteMany({ where: { projectId: ID.project } });
    await prisma.ipcLineItem.deleteMany({ where: { ipc: { projectId: ID.project } } });
    await prisma.fileAttachment.deleteMany({ where: { projectId: ID.project } });
    await prisma.formInstance.deleteMany({ where: { projectId: ID.project } });
    await prisma.interimPaymentCertificate.deleteMany({ where: { projectId: ID.project } });
    await prisma.workflowPolicy.deleteMany({ where: { projectId: ID.project } });
    await prisma.formTemplate.deleteMany({ where: { projectId: ID.project } });
    await prisma.subContractorLink.deleteMany({ where: { projectId: ID.project } });
    await prisma.projectUser.deleteMany({ where: { projectId: ID.project } });
    await prisma.projectOrganization.deleteMany({ where: { projectId: ID.project } });
    await prisma.project.delete({ where: { id: ID.project } });
  }

  // Orphan cleanup if a prior seed run failed mid-flight
  await prisma.auditLog.deleteMany({
    where: { OR: [{ projectId: ID.project }, { entityId: { in: Object.values(ID) } }] },
  });
  await prisma.approvalRecord.deleteMany({
    where: { formInstanceId: { in: Object.values(ID).filter((k) => k.startsWith('e2e00005')) } },
  });
  await prisma.formInstance.deleteMany({
    where: { id: { in: Object.values(ID).filter((k) => k.startsWith('e2e00005')) } },
  });

  await prisma.user.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.role.deleteMany({ where: { organizationId: { in: orgIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
}

// ─── Seed builders ───────────────────────────────────────────────────────────

async function hashPassword(plain: string): Promise<string> {
  const hash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
  const valid = await bcrypt.compare(plain, hash);
  if (!valid) {
    throw new Error('Password hashing failed self-check');
  }
  return hash;
}

async function hashSeedPassword(): Promise<string> {
  return hashPassword(SEED_PASSWORD);
}

async function verifySeedLogin() {
  const sample = await prisma.user.findFirst({
    where: { email: 'client.admin@e2e.simp', deletedAt: null },
    select: { passwordHash: true },
  });
  if (!sample) {
    throw new Error('Seed verification failed: sample user missing');
  }
  const valid = await bcrypt.compare(SEED_PASSWORD, sample.passwordHash);
  if (!valid) {
    throw new Error(
      'Seed verification failed: stored password_hash does not match SEED_PASSWORD',
    );
  }
}

type UserSeed = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  orgId: string;
  isOrgAdmin?: boolean;
  roleName: string;
};

/**
 * Production platform Super Admin — idempotent upsert (not removed by E2E wipe).
 * Requires organizationId; uses a dedicated platform ops org with isSuperAdmin on the user.
 */
async function seedSuperAdmin() {
  const passwordHash = await hashPassword(SUPER_ADMIN_PASSWORD);

  await prisma.organization.upsert({
    where: { id: ID.orgPlatform },
    create: {
      id: ID.orgPlatform,
      name: 'SIMP Platform Operations',
      nameAr: 'عمليات منصة سيمب',
      slug: 'simp-platform-ops',
      type: OrganizationType.CLIENT,
      isActive: true,
    },
    update: {
      name: 'SIMP Platform Operations',
      nameAr: 'عمليات منصة سيمب',
      slug: 'simp-platform-ops',
      isActive: true,
      deletedAt: null,
    },
  });

  let adminRole = await prisma.role.findFirst({
    where: {
      organizationId: ID.orgPlatform,
      name: 'Platform Super Admin',
      deletedAt: null,
    },
  });

  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        organizationId: ID.orgPlatform,
        name: 'Platform Super Admin',
        nameAr: 'مدير المنصة',
        permissions: ['*'] as Prisma.InputJsonValue,
        isSystem: true,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL.toLowerCase() },
    create: {
      id: ID.superAdminUser,
      email: SUPER_ADMIN_EMAIL.toLowerCase(),
      username: SUPER_ADMIN_USERNAME,
      passwordHash,
      firstName: 'Rakaiz',
      lastName: 'Platform Admin',
      organizationId: ID.orgPlatform,
      roleId: adminRole.id,
      isOrgAdmin: true,
      isSuperAdmin: true,
      isActive: true,
    },
    update: {
      username: SUPER_ADMIN_USERNAME,
      passwordHash,
      firstName: 'Rakaiz',
      lastName: 'Platform Admin',
      organizationId: ID.orgPlatform,
      roleId: adminRole.id,
      isOrgAdmin: true,
      isSuperAdmin: true,
      isActive: true,
      deletedAt: null,
    },
  });

  const stored = await prisma.user.findFirstOrThrow({
    where: { email: SUPER_ADMIN_EMAIL.toLowerCase() },
    select: { passwordHash: true },
  });
  const valid = await bcrypt.compare(SUPER_ADMIN_PASSWORD, stored.passwordHash);
  if (!valid) {
    throw new Error('Super Admin seed verification failed: password hash mismatch');
  }
}

async function seedOrganizationsAndUsers(passwordHash: string) {
  const orgs = [
    {
      id: ID.orgClient,
      name: 'Alpha Petrochemical Client',
      nameAr: 'العميل — ألفا للبتروكيماويات',
      slug: 'e2e-alpha-client',
      type: OrganizationType.CLIENT,
    },
    {
      id: ID.orgConsultant,
      name: 'Gulf Engineering Consultant',
      nameAr: 'الاستشاري — الخليج للهندسة',
      slug: 'e2e-gulf-consultant',
      type: OrganizationType.CONSULTANT,
    },
    {
      id: ID.orgMc,
      name: 'Khobar Main Contractor',
      nameAr: 'المقاول الرئيسي — الخبر',
      slug: 'e2e-khobar-mc',
      type: OrganizationType.MAIN_CONTRACTOR,
    },
    {
      id: ID.orgSub,
      name: 'Eastern Province Sub-Contractor',
      nameAr: 'مقاول باطن — المنطقة الشرقية',
      slug: 'e2e-eastern-sub',
      type: OrganizationType.SUB_CONTRACTOR,
    },
    {
      id: ID.orgLab,
      name: 'ARAMCO Certified Laboratory',
      nameAr: 'مختبر معتمد',
      slug: 'e2e-aramco-lab',
      type: OrganizationType.LABORATORY,
    },
  ];

  for (const o of orgs) {
    await prisma.organization.create({ data: o });
    for (const role of [
      { name: 'Org Admin', nameAr: 'مدير المؤسسة', permissions: ['*'], isSystem: true },
      { name: 'Engineer', nameAr: 'مهندس', permissions: ['forms:write'], isSystem: true },
      { name: 'QA/QC Inspector', nameAr: 'مفتش جودة', permissions: ['workflows:approve'], isSystem: true },
      { name: 'Viewer', nameAr: 'مشاهد', permissions: ['forms:read'], isSystem: true },
    ]) {
      await prisma.role.create({
        data: { organizationId: o.id, ...role, permissions: role.permissions as Prisma.InputJsonValue },
      });
    }
  }

  const roleId = async (orgId: string, name: string) => {
    const r = await prisma.role.findFirstOrThrow({
      where: { organizationId: orgId, name },
    });
    return r.id;
  };

  const users: UserSeed[] = [
    { id: 'e2e10001-0001-4001-8001-000000000001', email: 'client.admin@e2e.simp', username: 'client.admin', firstName: 'Nora', lastName: 'Al-Rashid', orgId: ID.orgClient, isOrgAdmin: true, roleName: 'Org Admin' },
    { id: 'e2e10001-0001-4001-8001-000000000002', email: 'client.finance@e2e.simp', username: 'client.finance', firstName: 'Omar', lastName: 'Hassan', orgId: ID.orgClient, roleName: 'Viewer' },
    { id: 'e2e10001-0001-4001-8001-000000000003', email: 'client.pm@e2e.simp', username: 'client.pm', firstName: 'Layla', lastName: 'Saleh', orgId: ID.orgClient, roleName: 'Viewer' },
    { id: 'e2e10002-0002-4002-8002-000000000001', email: 'consultant.lead@e2e.simp', username: 'consultant.lead', firstName: 'James', lastName: 'Whitfield', orgId: ID.orgConsultant, isOrgAdmin: true, roleName: 'Org Admin' },
    { id: 'e2e10002-0002-4002-8002-000000000002', email: 'consultant.qa@e2e.simp', username: 'consultant.qa', firstName: 'Sara', lastName: 'Menon', orgId: ID.orgConsultant, roleName: 'QA/QC Inspector' },
    { id: 'e2e10002-0002-4002-8002-000000000003', email: 'consultant.rev@e2e.simp', username: 'consultant.rev', firstName: 'Khalid', lastName: 'Ansari', orgId: ID.orgConsultant, roleName: 'Engineer' },
    { id: 'e2e10003-0003-4003-8003-000000000001', email: 'mc.admin@e2e.simp', username: 'mc.admin', firstName: 'Faisal', lastName: 'Al-Dosari', orgId: ID.orgMc, isOrgAdmin: true, roleName: 'Org Admin' },
    { id: 'e2e10003-0003-4003-8003-000000000002', email: 'mc.qaqc@e2e.simp', username: 'mc.qaqc', firstName: 'Hana', lastName: 'Qahtani', orgId: ID.orgMc, roleName: 'QA/QC Inspector' },
    { id: 'e2e10003-0003-4003-8003-000000000003', email: 'mc.pm@e2e.simp', username: 'mc.pm', firstName: 'Yousef', lastName: 'Mutairi', orgId: ID.orgMc, roleName: 'Engineer' },
    { id: 'e2e10004-0004-4004-8004-000000000001', email: 'sub.admin@e2e.simp', username: 'sub.admin', firstName: 'Ahmed', lastName: 'Subcontractor', orgId: ID.orgSub, isOrgAdmin: true, roleName: 'Org Admin' },
    { id: 'e2e10004-0004-4004-8004-000000000002', email: 'sub.eng1@e2e.simp', username: 'sub.eng1', firstName: 'Rashid', lastName: 'Field', orgId: ID.orgSub, roleName: 'Engineer' },
    { id: 'e2e10004-0004-4004-8004-000000000003', email: 'sub.eng2@e2e.simp', username: 'sub.eng2', firstName: 'Majed', lastName: 'Al-Harbi', orgId: ID.orgSub, roleName: 'Engineer' },
    { id: 'e2e10005-0005-4005-8005-000000000001', email: 'lab.admin@e2e.simp', username: 'lab.admin', firstName: 'Dr. Lina', lastName: 'Chemist', orgId: ID.orgLab, isOrgAdmin: true, roleName: 'Org Admin' },
    { id: 'e2e10005-0005-4005-8005-000000000002', email: 'lab.tech1@e2e.simp', username: 'lab.tech1', firstName: 'Nasser', lastName: 'LabTech', orgId: ID.orgLab, roleName: 'Engineer' },
    { id: 'e2e10005-0005-4005-8005-000000000003', email: 'lab.tech2@e2e.simp', username: 'lab.tech2', firstName: 'Reem', lastName: 'Analyst', orgId: ID.orgLab, roleName: 'Engineer' },
  ];

  for (const u of users) {
    await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        username: u.username,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        organizationId: u.orgId,
        roleId: await roleId(u.orgId, u.roleName),
        isOrgAdmin: u.isOrgAdmin ?? false,
        lastLoginAt: atDaysAgo(1),
        createdAt: atDaysAgo(58),
        updatedAt: atDaysAgo(1),
      },
    });
  }

  return {
    clientAdmin: users[0].id,
    consultantQa: users[4].id,
    mcQaqc: users[7].id,
    subEng1: users[10].id,
    subEng2: users[11].id,
    mcAdmin: users[6].id,
  };
}

async function seedProject(userIds: {
  clientAdmin: string;
  consultantQa: string;
  mcQaqc: string;
  subEng1: string;
}) {
  await prisma.project.create({
    data: {
      id: ID.project,
      name: 'Khobar Refinery Expansion — E2E',
      nameAr: 'توسعة مصفاة الخبر — اختبار',
      code: 'E2E-KHOBAR-001',
      description: 'Seeded demo project for PMIS dashboard E2E validation',
      ownerOrgId: ID.orgClient,
      status: ProjectStatus.ACTIVE,
      startDate: atDaysAgo(60),
      endDate: hoursAfter(SEED_ANCHOR, 24 * 365),
      createdAt: atDaysAgo(59),
      updatedAt: atDaysAgo(1),
    },
  });

  const memberships: Array<{
    organizationId: string;
    role: ProjectOrganizationRole;
    invitedByOrgId?: string;
  }> = [
    { organizationId: ID.orgClient, role: ProjectOrganizationRole.OWNER },
    { organizationId: ID.orgConsultant, role: ProjectOrganizationRole.CONSULTANT, invitedByOrgId: ID.orgClient },
    { organizationId: ID.orgMc, role: ProjectOrganizationRole.MAIN_CONTRACTOR, invitedByOrgId: ID.orgClient },
    { organizationId: ID.orgSub, role: ProjectOrganizationRole.SUB_CONTRACTOR, invitedByOrgId: ID.orgMc },
    { organizationId: ID.orgLab, role: ProjectOrganizationRole.LABORATORY, invitedByOrgId: ID.orgClient },
  ];

  for (const m of memberships) {
    await prisma.projectOrganization.create({
      data: { projectId: ID.project, ...m },
    });
  }

  await prisma.subContractorLink.create({
    data: {
      projectId: ID.project,
      mainContractorId: ID.orgMc,
      subContractorId: ID.orgSub,
      invitedByUserId: userIds.mcQaqc,
      createdAt: atDaysAgo(55),
    },
  });

  const assign = [
    userIds.clientAdmin,
    userIds.consultantQa,
    userIds.mcQaqc,
    userIds.subEng1,
    'e2e10005-0005-4005-8005-000000000002',
  ];
  for (const userId of assign) {
    await prisma.projectUser.create({ data: { projectId: ID.project, userId } });
  }
}

async function seedTemplatesAndPolicies() {
  const mirDef = STANDARD_FORM_TEMPLATES.find((t) => t.code === StandardFormCode.MIR);
  const wirDef = STANDARD_FORM_TEMPLATES.find((t) => t.code === StandardFormCode.WIR);
  if (!mirDef || !wirDef) {
    throw new Error('MIR/WIR standard templates missing from STANDARD_FORM_TEMPLATES');
  }

  await prisma.formTemplate.create({
    data: {
      id: ID.tplMir,
      projectId: ID.project,
      code: mirDef.code,
      name: mirDef.name,
      nameAr: mirDef.nameAr,
      version: 1,
      schema: mirDef.schema as Prisma.InputJsonValue,
      createdByOrgId: ID.orgClient,
      createdAt: atDaysAgo(58),
    },
  });

  await prisma.formTemplate.create({
    data: {
      id: ID.tplWir,
      projectId: ID.project,
      code: wirDef.code,
      name: wirDef.name,
      nameAr: wirDef.nameAr,
      version: 1,
      schema: wirDef.schema as Prisma.InputJsonValue,
      createdByOrgId: ID.orgClient,
      createdAt: atDaysAgo(58),
    },
  });

  for (const code of [StandardFormCode.MIR, StandardFormCode.WIR]) {
    await prisma.workflowPolicy.create({
      data: {
        projectId: ID.project,
        templateCode: code,
        requiresInternalApproval: true,
        internalApproverOrgType: OrganizationType.MAIN_CONTRACTOR,
        externalApproverOrgType: OrganizationType.CONSULTANT,
        externalSlaHours: EXTERNAL_SLA_HOURS,
      },
    });
  }

  const consultantTemplates: Array<{
    id: string;
    code: StandardFormCode;
  }> = [
    { id: ID.tplNcr, code: StandardFormCode.NCR },
    { id: ID.tplSor, code: StandardFormCode.SOR },
    { id: ID.tplCvi, code: StandardFormCode.CVI },
  ];

  for (const { id, code } of consultantTemplates) {
    const def = STANDARD_FORM_TEMPLATES.find((t) => t.code === code);
    if (!def) continue;
    await prisma.formTemplate.create({
      data: {
        id,
        projectId: ID.project,
        code: def.code,
        name: def.name,
        nameAr: def.nameAr,
        version: 1,
        schema: def.schema as Prisma.InputJsonValue,
        createdByOrgId: ID.orgConsultant,
        createdAt: atDaysAgo(58),
      },
    });
  }

  const ltrDef = STANDARD_FORM_TEMPLATES.find((t) => t.code === StandardFormCode.LTR);
  if (ltrDef) {
    await prisma.formTemplate.create({
      data: {
        id: ID.tplLtr,
        projectId: ID.project,
        code: ltrDef.code,
        name: ltrDef.name,
        nameAr: ltrDef.nameAr,
        version: 1,
        schema: ltrDef.schema as Prisma.InputJsonValue,
        createdByOrgId: ID.orgLab,
        createdAt: atDaysAgo(58),
      },
    });
  }
}

async function seedApprovalChain(
  formId: string,
  steps: Array<{
    action: ApprovalActionType;
    fromStatus: FormInstanceStatus;
    toStatus: FormInstanceStatus;
    fromPhase: WorkflowPhase;
    toPhase: WorkflowPhase;
    actorUserId: string;
    actorOrgId: string;
    comments?: string;
    at: Date;
  }>,
) {
  for (const s of steps) {
    await prisma.approvalRecord.create({
      data: {
        formInstanceId: formId,
        action: s.action,
        fromStatus: s.fromStatus,
        toStatus: s.toStatus,
        fromPhase: s.fromPhase,
        toPhase: s.toPhase,
        actorUserId: s.actorUserId,
        actorOrgId: s.actorOrgId,
        comments: s.comments ?? '',
        createdAt: s.at,
      },
    });
  }
}

async function seedAudit(
  entityId: string,
  action: string,
  userId: string,
  orgId: string,
  previousData: Prisma.InputJsonValue,
  newData: Prisma.InputJsonValue,
  at: Date,
  metadata?: Prisma.InputJsonValue,
) {
  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      projectId: ID.project,
      userId,
      entityType: 'FormInstance',
      entityId,
      action,
      source: AuditSource.APPROVAL,
      previousData,
      newData,
      metadata: metadata ?? {},
      createdAt: at,
    },
  });
}

async function seedGpsAttachment(
  formId: string,
  uploaderId: string,
  orgId: string,
  filename: string,
  capturedAt: Date,
  offsetMeters = 0,
) {
  const sitePhoto = buildMockSitePhoto(filename, capturedAt, formId, offsetMeters);
  await writeSeedImageFile(sitePhoto.storageKey);

  const lat = sitePhoto.gpsLat.toFixed(7);
  const lng = sitePhoto.gpsLng.toFixed(7);
  await prisma.fileAttachment.create({
    data: {
      projectId: ID.project,
      formInstanceId: formId,
      uploadedByUserId: uploaderId,
      organizationId: orgId,
      originalFilename: filename,
      mimeType: 'image/jpeg',
      sizeBytes: sitePhoto.sizeBytes,
      storageKey: sitePhoto.storageKey,
      gpsLat: lat,
      gpsLng: lng,
      captureTimestamp: capturedAt,
      serverReceivedAt: hoursAfter(capturedAt, 1),
      deviceMetadata: { seed: true, jurisdiction: 'Al Khobar, KSA' },
      checksum: `sha256-e2e-${formId.slice(0, 8)}`,
      createdAt: capturedAt,
    },
  });

  return sitePhoto;
}

async function seedFormsAndFinancials(userIds: {
  consultantQa: string;
  mcQaqc: string;
  subEng1: string;
  subEng2: string;
  mcAdmin: string;
}) {
  const mirSubmit = atDaysAgo(52, 9);
  const mirApproveExt = atDaysAgo(48, 14);
  const mirApprovedPhoto = buildMockSitePhoto(
    'mir-yard-photo.jpg',
    mirSubmit,
    ID.mirApproved,
  );

  // ── Approved MIR (inventory source) ───────────────────────────────────────
  await prisma.formInstance.create({
    data: {
      id: ID.mirApproved,
      projectId: ID.project,
      templateId: ID.tplMir,
      templateVersion: 1,
      organizationId: ID.orgSub,
      createdByUserId: userIds.subEng1,
      referenceNumber: 'MIR-SEED-001',
      revisionNumber: 0,
      comments: 'Ready-mix concrete delivery — Lot A',
      status: FormInstanceStatus.APPROVED,
      workflowPhase: WorkflowPhase.COMPLETED,
      currentPendingOrgType: null,
      data: {
        materialCode: 'RMX-C40',
        materialName: 'Ready-Mix Concrete C40',
        quantity: 1000,
        unit: 'm3',
        sitePhoto: mirApprovedPhoto,
      },
      deviceTimestamp: mirSubmit,
      serverSyncTimestamp: hoursAfter(mirSubmit, 2),
      submittedAt: mirSubmit,
      externalReviewStartedAt: atDaysAgo(50, 10),
      createdAt: mirSubmit,
      updatedAt: mirApproveExt,
    },
  });

  await seedApprovalChain(ID.mirApproved, [
    { action: ApprovalActionType.SUBMIT, fromStatus: FormInstanceStatus.DRAFT, toStatus: FormInstanceStatus.PENDING_INTERNAL_APPROVAL, fromPhase: WorkflowPhase.NONE, toPhase: WorkflowPhase.INTERNAL_REVIEW, actorUserId: userIds.subEng1, actorOrgId: ID.orgSub, at: mirSubmit },
    { action: ApprovalActionType.APPROVE_INTERNAL, fromStatus: FormInstanceStatus.PENDING_INTERNAL_APPROVAL, toStatus: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL, fromPhase: WorkflowPhase.INTERNAL_REVIEW, toPhase: WorkflowPhase.EXTERNAL_REVIEW, actorUserId: userIds.mcQaqc, actorOrgId: ID.orgMc, at: atDaysAgo(50, 11) },
    { action: ApprovalActionType.APPROVE_EXTERNAL, fromStatus: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL, toStatus: FormInstanceStatus.APPROVED, fromPhase: WorkflowPhase.EXTERNAL_REVIEW, toPhase: WorkflowPhase.COMPLETED, actorUserId: userIds.consultantQa, actorOrgId: ID.orgConsultant, comments: 'MIR accepted — proceed to placement', at: mirApproveExt },
  ]);

  await prisma.materialInventory.create({
    data: {
      id: ID.invMir,
      projectId: ID.project,
      mirFormInstanceId: ID.mirApproved,
      materialCode: 'RMX-C40',
      materialName: 'Ready-Mix Concrete C40',
      unit: 'm3',
      initialQuantity: 1000,
      availableBalance: 725,
      organizationId: ID.orgSub,
      createdAt: mirApproveExt,
    },
  });

  await seedGpsAttachment(ID.mirApproved, userIds.subEng1, ID.orgSub, 'mir-yard-photo.jpg', mirSubmit);

  // ── MIR stuck in external review — SLA breached (>48h) ────────────────────
  const mirSlaReviewStart = atDaysAgo(12, 8);
  const mirSlaHoursOverdue = 12 * 24 - EXTERNAL_SLA_HOURS;
  const mirSlaDevice = atDaysAgo(14, 7);
  const mirSlaPhoto = buildMockSitePhoto(
    'steel-delivery.jpg',
    mirSlaDevice,
    ID.mirSlaBreach,
    2,
  );

  await prisma.formInstance.create({
    data: {
      id: ID.mirSlaBreach,
      projectId: ID.project,
      templateId: ID.tplMir,
      templateVersion: 1,
      organizationId: ID.orgSub,
      createdByUserId: userIds.subEng2,
      referenceNumber: 'MIR-SEED-002',
      revisionNumber: 0,
      comments: 'Structural steel — pending consultant sign-off',
      status: FormInstanceStatus.SLA_BREACHED,
      workflowPhase: WorkflowPhase.EXTERNAL_REVIEW,
      currentPendingOrgType: OrganizationType.CONSULTANT,
      data: {
        materialCode: 'STL-HRB400',
        materialName: 'Reinforcement Steel HRB400',
        quantity: 45,
        unit: 'ton',
        sitePhoto: mirSlaPhoto,
      },
      deviceTimestamp: mirSlaDevice,
      serverSyncTimestamp: atDaysAgo(14, 8),
      submittedAt: atDaysAgo(14, 7),
      externalReviewStartedAt: mirSlaReviewStart,
      slaBreached: true,
      slaBreachedAt: hoursAfter(mirSlaReviewStart, EXTERNAL_SLA_HOURS + 1),
      createdAt: atDaysAgo(14, 7),
      updatedAt: atDaysAgo(2, 9),
    },
  });

  await prisma.slaEscalation.create({
    data: {
      projectId: ID.project,
      formInstanceId: ID.mirSlaBreach,
      severity: EscalationSeverity.CRITICAL,
      message: `Consultant review overdue by ${mirSlaHoursOverdue}h on MIR-SEED-002`,
      messageAr: 'تأخر اعتماد الاستشاري على تقرير فحص المواد',
      hoursOverdue: mirSlaHoursOverdue,
      createdAt: atDaysAgo(2, 9),
    },
  });

  await seedGpsAttachment(ID.mirSlaBreach, userIds.subEng2, ID.orgSub, 'steel-delivery.jpg', atDaysAgo(14, 7), 2);

  // ── Three APPROVED WIRs for IPC (only approved forms billed) ──────────────
  const ipcLines: Array<{
    id: string;
    ref: string;
    qty: number;
    rate: number;
    desc: string;
    daysAgo: number;
  }> = [
    { id: ID.wirIpc1, ref: 'WIR-SEED-101', qty: 100, rate: 150, desc: 'Foundation pour — Zone A', daysAgo: 40 },
    { id: ID.wirIpc2, ref: 'WIR-SEED-102', qty: 50, rate: 200, desc: 'Column works — Grid 3-4', daysAgo: 35 },
    { id: ID.wirIpc3, ref: 'WIR-SEED-103', qty: 75, rate: 120, desc: 'Slab on grade — Bay 2', daysAgo: 30 },
  ];

  let ipcSubtotal = 0;
  for (const line of ipcLines) {
    const amount = line.qty * line.rate;
    ipcSubtotal += amount;
    const submitted = atDaysAgo(line.daysAgo, 10);
    const approved = atDaysAgo(line.daysAgo - 3, 15);
    const wirPhoto = buildMockSitePhoto(
      `${line.ref.toLowerCase()}-site.jpg`,
      submitted,
      line.id,
      ipcLines.indexOf(line),
    );

    await prisma.formInstance.create({
      data: {
        id: line.id,
        projectId: ID.project,
        templateId: ID.tplWir,
        templateVersion: 1,
        organizationId: ID.orgSub,
        createdByUserId: userIds.subEng1,
        referenceNumber: line.ref,
        revisionNumber: 0,
        comments: line.desc,
        status: FormInstanceStatus.APPROVED,
        workflowPhase: WorkflowPhase.COMPLETED,
        currentPendingOrgType: null,
        data: {
          mirFormInstanceId: ID.mirApproved,
          quantityUsed: line.qty,
          unitRate: line.rate,
          lineAmount: amount,
          workDescription: line.desc,
          location: 'Al Khobar — Refinery Expansion',
          sitePhoto: wirPhoto,
        },
        deviceTimestamp: submitted,
        serverSyncTimestamp: hoursAfter(submitted, 1),
        submittedAt: submitted,
        externalReviewStartedAt: atDaysAgo(line.daysAgo - 1, 9),
        createdAt: submitted,
        updatedAt: approved,
      },
    });

    await seedApprovalChain(line.id, [
      { action: ApprovalActionType.SUBMIT, fromStatus: FormInstanceStatus.DRAFT, toStatus: FormInstanceStatus.PENDING_INTERNAL_APPROVAL, fromPhase: WorkflowPhase.NONE, toPhase: WorkflowPhase.INTERNAL_REVIEW, actorUserId: userIds.subEng1, actorOrgId: ID.orgSub, at: submitted },
      { action: ApprovalActionType.APPROVE_INTERNAL, fromStatus: FormInstanceStatus.PENDING_INTERNAL_APPROVAL, toStatus: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL, fromPhase: WorkflowPhase.INTERNAL_REVIEW, toPhase: WorkflowPhase.EXTERNAL_REVIEW, actorUserId: userIds.mcQaqc, actorOrgId: ID.orgMc, at: atDaysAgo(line.daysAgo - 2, 11) },
      { action: ApprovalActionType.APPROVE_EXTERNAL, fromStatus: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL, toStatus: FormInstanceStatus.APPROVED, fromPhase: WorkflowPhase.EXTERNAL_REVIEW, toPhase: WorkflowPhase.COMPLETED, actorUserId: userIds.consultantQa, actorOrgId: ID.orgConsultant, at: approved },
    ]);

    await seedGpsAttachment(line.id, userIds.subEng1, ID.orgSub, `${line.ref.toLowerCase()}-site.jpg`, submitted, ipcLines.indexOf(line));
  }

  // ── Material ledger audit trail (MIR credit + WIR debits) ─────────────────
  await prisma.materialLedgerEntry.create({
    data: {
      inventoryId: ID.invMir,
      formInstanceId: ID.mirApproved,
      ledgerType: MaterialLedgerType.MIR_CREDIT,
      quantityDelta: 1000,
      balanceBefore: 0,
      balanceAfter: 1000,
      notes: 'MIR-SEED-001 external approval — initial stock credit',
      createdAt: mirApproveExt,
    },
  });

  let ledgerBalance = 1000;
  for (const line of ipcLines) {
    const approved = atDaysAgo(line.daysAgo - 3, 15);
    const balanceAfter = ledgerBalance - line.qty;
    await prisma.materialLedgerEntry.create({
      data: {
        inventoryId: ID.invMir,
        formInstanceId: line.id,
        ledgerType: MaterialLedgerType.WIR_DEBIT,
        quantityDelta: -line.qty,
        balanceBefore: ledgerBalance,
        balanceAfter,
        notes: `${line.ref} external approval — material consumption`,
        createdAt: approved,
      },
    });
    ledgerBalance = balanceAfter;
  }

  // Remaining balance adjustment to match inventory (725 m³)
  if (ledgerBalance > 725) {
    const delta = ledgerBalance - 725;
    await prisma.materialLedgerEntry.create({
      data: {
        inventoryId: ID.invMir,
        formInstanceId: ID.wirIpc3,
        ledgerType: MaterialLedgerType.ADJUSTMENT,
        quantityDelta: -delta,
        balanceBefore: ledgerBalance,
        balanceAfter: 725,
        notes: 'Field quantity reconciliation — aligns ledger to physical count',
        createdAt: atDaysAgo(28, 16),
      },
    });
  }

  // ── WIR with anti-fraud time spoofing flag ────────────────────────────────
  const spoofDevice = atDaysAgo(20, 6);
  const spoofServer = atDaysAgo(20, 14);
  const spoofPhoto = buildMockSitePhoto(
    'spoof-flag-photo.jpg',
    spoofServer,
    ID.wirSpoof,
    5,
  );

  await prisma.formInstance.create({
    data: {
      id: ID.wirSpoof,
      projectId: ID.project,
      templateId: ID.tplWir,
      templateVersion: 1,
      organizationId: ID.orgSub,
      createdByUserId: userIds.subEng2,
      referenceNumber: 'WIR-SEED-201',
      revisionNumber: 0,
      comments: 'Suspect device clock — flagged for audit',
      status: FormInstanceStatus.PENDING_INTERNAL_APPROVAL,
      workflowPhase: WorkflowPhase.INTERNAL_REVIEW,
      currentPendingOrgType: OrganizationType.MAIN_CONTRACTOR,
      data: {
        mirFormInstanceId: ID.mirApproved,
        quantityUsed: 12,
        unitRate: 150,
        lineAmount: 1800,
        workDescription: 'Minor works — clock anomaly test',
        location: 'Al Khobar',
        sitePhoto: spoofPhoto,
      },
      deviceTimestamp: spoofDevice,
      serverSyncTimestamp: spoofServer,
      timeSpoofingFlag: true,
      submittedAt: spoofServer,
      createdAt: spoofDevice,
      updatedAt: spoofServer,
    },
  });

  await seedGpsAttachment(ID.wirSpoof, userIds.subEng2, ID.orgSub, 'spoof-flag-photo.jpg', spoofServer, 5);

  // ── WIR external SLA breach ───────────────────────────────────────────────
  const wirSlaStart = atDaysAgo(9, 7);
  const wirSlaDevice = atDaysAgo(11, 8);
  const wirSlaPhoto = buildMockSitePhoto(
    'wir-sla-breach.jpg',
    wirSlaDevice,
    ID.wirSlaBreach,
    3,
  );

  await prisma.formInstance.create({
    data: {
      id: ID.wirSlaBreach,
      projectId: ID.project,
      templateId: ID.tplWir,
      templateVersion: 1,
      organizationId: ID.orgSub,
      createdByUserId: userIds.subEng1,
      referenceNumber: 'WIR-SEED-202',
      revisionNumber: 0,
      comments: 'Awaiting consultant beyond SLA window',
      status: FormInstanceStatus.SLA_BREACHED,
      workflowPhase: WorkflowPhase.EXTERNAL_REVIEW,
      currentPendingOrgType: OrganizationType.CONSULTANT,
      data: {
        mirFormInstanceId: ID.mirApproved,
        quantityUsed: 30,
        unitRate: 175,
        lineAmount: 5250,
        workDescription: 'Retaining wall pour',
        location: 'Al Khobar — South berm',
        sitePhoto: wirSlaPhoto,
      },
      deviceTimestamp: wirSlaDevice,
      serverSyncTimestamp: atDaysAgo(11, 9),
      submittedAt: atDaysAgo(11, 8),
      externalReviewStartedAt: wirSlaStart,
      slaBreached: true,
      slaBreachedAt: hoursAfter(wirSlaStart, EXTERNAL_SLA_HOURS + 2),
      createdAt: atDaysAgo(11, 8),
      updatedAt: atDaysAgo(1, 10),
    },
  });

  await prisma.slaEscalation.create({
    data: {
      projectId: ID.project,
      formInstanceId: ID.wirSlaBreach,
      severity: EscalationSeverity.CRITICAL,
      message: 'WIR-SEED-202 consultant review exceeded 48h SLA',
      hoursOverdue: 9 * 24 - EXTERNAL_SLA_HOURS,
      createdAt: atDaysAgo(1, 10),
    },
  });

  await seedGpsAttachment(
    ID.wirSlaBreach,
    userIds.subEng1,
    ID.orgSub,
    'wir-sla-breach.jpg',
    wirSlaDevice,
    3,
  );

  // ── Three REJECTED forms (burden of proof — consultant comments) ─────────
  const rejections: Array<{
    id: string;
    ref: string;
    comment: string;
    daysAgo: number;
    engineer: string;
  }> = [
    {
      id: ID.rej1,
      ref: 'WIR-SEED-301',
      comment:
        'Insufficient photo evidence at chainage KM 4+200. Resubmit with GPS-stamped wide shot and hold-point sign visible.',
      daysAgo: 18,
      engineer: userIds.subEng1,
    },
    {
      id: ID.rej2,
      ref: 'WIR-SEED-302',
      comment:
        'Quantity claimed exceeds MIR balance. Correct quantityUsed or attach MIR amendment reference before resubmission.',
      daysAgo: 15,
      engineer: userIds.subEng2,
    },
    {
      id: ID.rej3,
      ref: 'WIR-SEED-303',
      comment:
        'Work description does not match approved method statement MS-REV-12. Align wording and cite MS clause.',
      daysAgo: 10,
      engineer: userIds.subEng1,
    },
  ];

  for (const r of rejections) {
    const submitted = atDaysAgo(r.daysAgo, 9);
    const rejected = atDaysAgo(r.daysAgo - 2, 16);
    const rejPhoto = buildMockSitePhoto(
      `${r.ref.toLowerCase()}-site.jpg`,
      submitted,
      r.id,
    );

    await prisma.formInstance.create({
      data: {
        id: r.id,
        projectId: ID.project,
        templateId: ID.tplWir,
        templateVersion: 1,
        organizationId: ID.orgSub,
        createdByUserId: r.engineer,
        referenceNumber: r.ref,
        revisionNumber: 0,
        comments: r.comment,
        status: FormInstanceStatus.REJECTED,
        workflowPhase: WorkflowPhase.COMPLETED,
        currentPendingOrgType: null,
        data: {
          mirFormInstanceId: ID.mirApproved,
          quantityUsed: 20,
          unitRate: 160,
          workDescription: 'Rejected submission — see consultant notes',
          location: 'Al Khobar',
          sitePhoto: rejPhoto,
        },
        deviceTimestamp: submitted,
        serverSyncTimestamp: hoursAfter(submitted, 1),
        submittedAt: submitted,
        externalReviewStartedAt: atDaysAgo(r.daysAgo - 1, 10),
        createdAt: submitted,
        updatedAt: rejected,
      },
    });

    await seedApprovalChain(r.id, [
      { action: ApprovalActionType.SUBMIT, fromStatus: FormInstanceStatus.DRAFT, toStatus: FormInstanceStatus.PENDING_INTERNAL_APPROVAL, fromPhase: WorkflowPhase.NONE, toPhase: WorkflowPhase.INTERNAL_REVIEW, actorUserId: r.engineer, actorOrgId: ID.orgSub, at: submitted },
      { action: ApprovalActionType.APPROVE_INTERNAL, fromStatus: FormInstanceStatus.PENDING_INTERNAL_APPROVAL, toStatus: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL, fromPhase: WorkflowPhase.INTERNAL_REVIEW, toPhase: WorkflowPhase.EXTERNAL_REVIEW, actorUserId: userIds.mcQaqc, actorOrgId: ID.orgMc, at: atDaysAgo(r.daysAgo - 1, 11) },
      { action: ApprovalActionType.REJECT_EXTERNAL, fromStatus: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL, toStatus: FormInstanceStatus.REJECTED, fromPhase: WorkflowPhase.EXTERNAL_REVIEW, toPhase: WorkflowPhase.COMPLETED, actorUserId: userIds.consultantQa, actorOrgId: ID.orgConsultant, comments: r.comment, at: rejected },
    ]);

    await seedAudit(
      r.id,
      'WORKFLOW_REJECT_EXTERNAL',
      userIds.consultantQa,
      ID.orgConsultant,
      { status: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL, revisionNumber: 0 },
      { status: FormInstanceStatus.REJECTED, revisionNumber: 0, comments: r.comment },
      rejected,
    );

    await seedGpsAttachment(
      r.id,
      r.engineer,
      ID.orgSub,
      `${r.ref.toLowerCase()}-site.jpg`,
      submitted,
    );
  }

  // ── Three RESUBMITTED forms (revision 1, full audit chain) ───────────────
  const resubmissions: Array<{
    id: string;
    ref: string;
    priorComment: string;
    daysAgo: number;
    engineer: string;
  }> = [
    {
      id: ID.resub1,
      ref: 'WIR-SEED-401',
      priorComment:
        'Original rejection: missing hold-point signage. Corrected per consultant memo CM-044.',
      daysAgo: 25,
      engineer: userIds.subEng1,
    },
    {
      id: ID.resub2,
      ref: 'WIR-SEED-402',
      priorComment:
        'Original rejection: MIR quantity mismatch. Quantity adjusted and MIR cross-reference added.',
      daysAgo: 22,
      engineer: userIds.subEng2,
    },
    {
      id: ID.resub3,
      ref: 'WIR-SEED-403',
      priorComment:
        'Original rejection: method statement citation missing. MS-REV-12 §4.2 now referenced.',
      daysAgo: 19,
      engineer: userIds.subEng1,
    },
  ];

  for (const rs of resubmissions) {
    const v0Submit = atDaysAgo(rs.daysAgo + 5, 8);
    const rejected = atDaysAgo(rs.daysAgo + 3, 15);
    const resubmitted = atDaysAgo(rs.daysAgo, 10);
    const resubPhoto = buildMockSitePhoto(
      `${rs.ref.toLowerCase()}-rev1.jpg`,
      resubmitted,
      rs.id,
      10,
    );

    await prisma.formInstance.create({
      data: {
        id: rs.id,
        projectId: ID.project,
        templateId: ID.tplWir,
        templateVersion: 1,
        organizationId: ID.orgSub,
        createdByUserId: rs.engineer,
        referenceNumber: rs.ref,
        revisionNumber: 1,
        comments: 'Revision 1 — corrective resubmission',
        status: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL,
        workflowPhase: WorkflowPhase.EXTERNAL_REVIEW,
        currentPendingOrgType: OrganizationType.CONSULTANT,
        data: {
          mirFormInstanceId: ID.mirApproved,
          quantityUsed: 18,
          unitRate: 165,
          lineAmount: 2970,
          workDescription: 'Corrected works per consultant rejection',
          location: 'Al Khobar — KM 4+200',
          sitePhoto: resubPhoto,
        },
        deviceTimestamp: resubmitted,
        serverSyncTimestamp: hoursAfter(resubmitted, 1),
        submittedAt: resubmitted,
        externalReviewStartedAt: resubmitted,
        createdAt: v0Submit,
        updatedAt: resubmitted,
      },
    });

    await seedApprovalChain(rs.id, [
      { action: ApprovalActionType.SUBMIT, fromStatus: FormInstanceStatus.DRAFT, toStatus: FormInstanceStatus.PENDING_INTERNAL_APPROVAL, fromPhase: WorkflowPhase.NONE, toPhase: WorkflowPhase.INTERNAL_REVIEW, actorUserId: rs.engineer, actorOrgId: ID.orgSub, at: v0Submit },
      { action: ApprovalActionType.APPROVE_INTERNAL, fromStatus: FormInstanceStatus.PENDING_INTERNAL_APPROVAL, toStatus: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL, fromPhase: WorkflowPhase.INTERNAL_REVIEW, toPhase: WorkflowPhase.EXTERNAL_REVIEW, actorUserId: userIds.mcQaqc, actorOrgId: ID.orgMc, at: atDaysAgo(rs.daysAgo + 4, 11) },
      { action: ApprovalActionType.REJECT_EXTERNAL, fromStatus: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL, toStatus: FormInstanceStatus.REJECTED, fromPhase: WorkflowPhase.EXTERNAL_REVIEW, toPhase: WorkflowPhase.COMPLETED, actorUserId: userIds.consultantQa, actorOrgId: ID.orgConsultant, comments: rs.priorComment, at: rejected },
      { action: ApprovalActionType.RESUBMIT, fromStatus: FormInstanceStatus.REJECTED, toStatus: FormInstanceStatus.PENDING_INTERNAL_APPROVAL, fromPhase: WorkflowPhase.COMPLETED, toPhase: WorkflowPhase.INTERNAL_REVIEW, actorUserId: rs.engineer, actorOrgId: ID.orgSub, comments: 'Corrective resubmission — Rev 1', at: atDaysAgo(rs.daysAgo, 9) },
      { action: ApprovalActionType.APPROVE_INTERNAL, fromStatus: FormInstanceStatus.PENDING_INTERNAL_APPROVAL, toStatus: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL, fromPhase: WorkflowPhase.INTERNAL_REVIEW, toPhase: WorkflowPhase.EXTERNAL_REVIEW, actorUserId: userIds.mcQaqc, actorOrgId: ID.orgMc, at: atDaysAgo(rs.daysAgo, 9, 30) },
    ]);

    await seedAudit(
      rs.id,
      'RESUBMITTED',
      rs.engineer,
      ID.orgSub,
      { status: FormInstanceStatus.REJECTED, revisionNumber: 0, comments: rs.priorComment },
      { status: FormInstanceStatus.PENDING_EXTERNAL_APPROVAL, revisionNumber: 1 },
      resubmitted,
      {
        previousRevisionNumber: 0,
        newRevisionNumber: 1,
        priorRejection: {
          action: ApprovalActionType.REJECT_EXTERNAL,
          comments: rs.priorComment,
          rejectedAt: rejected.toISOString(),
        },
      },
    );

    await seedGpsAttachment(rs.id, rs.engineer, ID.orgSub, `${rs.ref.toLowerCase()}-rev1.jpg`, resubmitted, 10);
  }

  // ── IPC — only APPROVED WIR line items ───────────────────────────────────
  await prisma.interimPaymentCertificate.create({
    data: {
      id: ID.ipc1,
      projectId: ID.project,
      contractorOrgId: ID.orgMc,
      certificateNumber: 'IPC-E2E-2026-001',
      status: IpcStatus.PENDING_CLIENT_APPROVAL,
      periodStart: atDaysAgo(45),
      periodEnd: atDaysAgo(25),
      subtotalAmount: ipcSubtotal,
      currency: 'SAR',
      notes: 'E2E seed IPC — WIR-SEED-101/102/103 only (externally approved)',
      createdByUserId: userIds.mcAdmin,
      consultantReviewedAt: atDaysAgo(20, 11),
      createdAt: atDaysAgo(20, 10),
      updatedAt: atDaysAgo(5, 14),
      lineItems: {
        create: ipcLines.map((line, idx) => ({
          formInstanceId: line.id,
          description: line.desc,
          quantity: line.qty,
          unit: 'm3',
          unitRate: line.rate,
          lineAmount: line.qty * line.rate,
          sortOrder: idx,
          createdAt: atDaysAgo(20, 10),
        })),
      },
    },
  });

  for (const line of ipcLines) {
    await prisma.formInstance.update({
      where: { id: line.id },
      data: { isBilled: true, ipcId: ID.ipc1 },
    });
  }
}

async function seedLabRequests(userIds: Awaited<ReturnType<typeof seedOrganizationsAndUsers>>) {
  await prisma.labTestRequest.create({
    data: {
      id: ID.labReqPending,
      projectId: ID.project,
      formInstanceId: ID.wirIpc1,
      barcode: 'LTR-SEED01',
      testType: 'CONCRETE_SLUMP',
      anonymousLabel: 'LTR-SEED01',
      status: LabTestRequestStatus.PENDING,
      requestedByUserId: userIds.consultantQa,
      requestedByOrgId: ID.orgConsultant,
      createdAt: atDaysAgo(38),
    },
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('SIMP E2E seed — wiping prior seed data…');
  await wipeSeedData();

  console.log('Creating organizations, roles, and 15 users…');
  const passwordHash = await hashSeedPassword();
  const userIds = await seedOrganizationsAndUsers(passwordHash);

  console.log('Creating project, memberships, templates, policies…');
  await seedProject(userIds);
  await seedTemplatesAndPolicies();

  console.log('Creating forms, SLA breaches, rejections, IPC…');
  await seedFormsAndFinancials(userIds);

  console.log('Creating pending lab test requests…');
  await seedLabRequests(userIds);

  await verifySeedLogin();

  console.log('Ensuring production Super Admin account…');
  await seedSuperAdmin();

  console.log('\n✓ Seed complete.');
  console.log(`  Project:  E2E-KHOBAR-001 (${ID.project})`);
  console.log(`  E2E password: ${SEED_PASSWORD}`);
  console.log(`  Super Admin: ${SUPER_ADMIN_EMAIL} / ${SUPER_ADMIN_PASSWORD}`);
  console.log('  Sample logins:');
  console.log('    client.admin@e2e.simp');
  console.log('    consultant.qa@e2e.simp');
  console.log('    mc.qaqc@e2e.simp');
  console.log('    sub.eng1@e2e.simp');
  console.log('    lab.tech1@e2e.simp');
  console.log(`  IPC subtotal: SAR ${100 * 150 + 50 * 200 + 75 * 120} (3 approved WIRs)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
