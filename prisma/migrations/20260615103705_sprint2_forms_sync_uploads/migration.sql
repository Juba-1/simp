-- CreateEnum
CREATE TYPE "StandardFormCode" AS ENUM ('MAR', 'MIR', 'MDR', 'SDS', 'MSS', 'WIR', 'NCR', 'SOR', 'RFI', 'CVI', 'DPR', 'VO', 'IPC', 'AS_BUILT', 'PTW', 'IR');

-- CreateEnum
CREATE TYPE "FormInstanceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_INTERNAL_APPROVAL', 'PENDING_EXTERNAL_APPROVAL', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AuditSource" AS ENUM ('API', 'SYNC', 'SYSTEM', 'APPROVAL');

-- CreateEnum
CREATE TYPE "SyncActionType" AS ENUM ('FORM_INSTANCE_UPSERT', 'FORM_INSTANCE_DELETE', 'FILE_ATTACHMENT_LINK');

-- CreateEnum
CREATE TYPE "SyncActionResult" AS ENUM ('APPLIED', 'SKIPPED_STALE', 'CONFLICT_OVERWRITTEN', 'FAILED');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "client_action_id" TEXT,
ADD COLUMN     "device_timestamp" TIMESTAMP(3),
ADD COLUMN     "is_conflict_overwrite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "server_sync_timestamp" TIMESTAMP(3),
ADD COLUMN     "source" "AuditSource" NOT NULL DEFAULT 'API',
ADD COLUMN     "sync_batch_id" UUID;

-- CreateTable
CREATE TABLE "form_templates" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "code" "StandardFormCode" NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "schema" JSONB NOT NULL,
    "ui_schema" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_org_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_instances" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "template_version" INTEGER NOT NULL,
    "organization_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "reference_number" TEXT,
    "comments" TEXT NOT NULL DEFAULT '',
    "status" "FormInstanceStatus" NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL DEFAULT '{}',
    "device_timestamp" TIMESTAMP(3) NOT NULL,
    "server_sync_timestamp" TIMESTAMP(3),
    "time_spoofing_flag" BOOLEAN NOT NULL DEFAULT false,
    "client_revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "form_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_attachments" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "form_instance_id" UUID,
    "uploaded_by_user_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "gps_lat" DECIMAL(10,7) NOT NULL,
    "gps_lng" DECIMAL(10,7) NOT NULL,
    "capture_timestamp" TIMESTAMP(3) NOT NULL,
    "server_received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "device_metadata" JSONB NOT NULL DEFAULT '{}',
    "checksum" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "file_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_action_receipts" (
    "id" UUID NOT NULL,
    "client_action_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "action_type" "SyncActionType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "result" "SyncActionResult" NOT NULL,
    "result_payload" JSONB,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_action_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_templates_code_idx" ON "form_templates"("code");

-- CreateIndex
CREATE INDEX "form_templates_project_id_idx" ON "form_templates"("project_id");

-- CreateIndex
CREATE INDEX "form_templates_deleted_at_idx" ON "form_templates"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "form_templates_project_id_code_version_key" ON "form_templates"("project_id", "code", "version");

-- CreateIndex
CREATE INDEX "form_instances_project_id_status_idx" ON "form_instances"("project_id", "status");

-- CreateIndex
CREATE INDEX "form_instances_template_id_idx" ON "form_instances"("template_id");

-- CreateIndex
CREATE INDEX "form_instances_organization_id_idx" ON "form_instances"("organization_id");

-- CreateIndex
CREATE INDEX "form_instances_device_timestamp_idx" ON "form_instances"("device_timestamp");

-- CreateIndex
CREATE INDEX "form_instances_deleted_at_idx" ON "form_instances"("deleted_at");

-- CreateIndex
CREATE INDEX "file_attachments_project_id_idx" ON "file_attachments"("project_id");

-- CreateIndex
CREATE INDEX "file_attachments_form_instance_id_idx" ON "file_attachments"("form_instance_id");

-- CreateIndex
CREATE INDEX "file_attachments_organization_id_idx" ON "file_attachments"("organization_id");

-- CreateIndex
CREATE INDEX "file_attachments_capture_timestamp_idx" ON "file_attachments"("capture_timestamp");

-- CreateIndex
CREATE INDEX "file_attachments_deleted_at_idx" ON "file_attachments"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "sync_action_receipts_client_action_id_key" ON "sync_action_receipts"("client_action_id");

-- CreateIndex
CREATE INDEX "sync_action_receipts_batch_id_idx" ON "sync_action_receipts"("batch_id");

-- CreateIndex
CREATE INDEX "sync_action_receipts_user_id_idx" ON "sync_action_receipts"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_source_idx" ON "audit_logs"("source");

-- CreateIndex
CREATE INDEX "audit_logs_sync_batch_id_idx" ON "audit_logs"("sync_batch_id");

-- AddForeignKey
ALTER TABLE "form_templates" ADD CONSTRAINT "form_templates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "form_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_form_instance_id_fkey" FOREIGN KEY ("form_instance_id") REFERENCES "form_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_attachments" ADD CONSTRAINT "file_attachments_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
