import { AuditSource, Prisma } from '@prisma/client';

export interface AuditContext {
  organizationId?: string;
  projectId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  source?: AuditSource;
  deviceTimestamp?: Date;
  serverSyncTimestamp?: Date;
  isConflictOverwrite?: boolean;
  syncBatchId?: string;
  clientActionId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditRecordInput {
  entityType: string;
  entityId: string;
  action: string;
  previousData?: unknown;
  newData?: unknown;
  context?: AuditContext;
}

export type PrismaTransaction = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
