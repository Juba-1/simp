-- CreateEnum
CREATE TYPE "WorkflowPhase" AS ENUM ('NONE', 'INTERNAL_REVIEW', 'EXTERNAL_REVIEW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ApprovalActionType" AS ENUM ('SUBMIT', 'APPROVE_INTERNAL', 'REJECT_INTERNAL', 'APPROVE_EXTERNAL', 'REJECT_EXTERNAL', 'SLA_ESCALATION', 'AUTO_MATERIAL_POST');

-- CreateEnum
CREATE TYPE "MaterialLedgerType" AS ENUM ('MIR_CREDIT', 'WIR_DEBIT', 'MDR_DEBIT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "EscalationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- AlterEnum
ALTER TYPE "FormInstanceStatus" ADD VALUE 'SLA_BREACHED';

-- AlterTable
ALTER TABLE "form_instances" ADD COLUMN     "current_pending_org_type" "OrganizationType",
ADD COLUMN     "external_review_started_at" TIMESTAMP(3),
ADD COLUMN     "liability_shift_red_alert" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sla_breached" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sla_breached_at" TIMESTAMP(3),
ADD COLUMN     "submitted_at" TIMESTAMP(3),
ADD COLUMN     "workflow_phase" "WorkflowPhase" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "workflow_policies" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "template_code" "StandardFormCode" NOT NULL,
    "requires_internal_approval" BOOLEAN NOT NULL DEFAULT true,
    "internal_approver_org_type" "OrganizationType" NOT NULL DEFAULT 'MAIN_CONTRACTOR',
    "external_approver_org_type" "OrganizationType" NOT NULL DEFAULT 'CONSULTANT',
    "external_sla_hours" INTEGER NOT NULL DEFAULT 48,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_records" (
    "id" UUID NOT NULL,
    "form_instance_id" UUID NOT NULL,
    "action" "ApprovalActionType" NOT NULL,
    "from_status" "FormInstanceStatus" NOT NULL,
    "to_status" "FormInstanceStatus" NOT NULL,
    "from_phase" "WorkflowPhase" NOT NULL,
    "to_phase" "WorkflowPhase" NOT NULL,
    "actor_user_id" UUID,
    "actor_org_id" UUID,
    "comments" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sla_escalations" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "form_instance_id" UUID NOT NULL,
    "severity" "EscalationSeverity" NOT NULL DEFAULT 'CRITICAL',
    "message" TEXT NOT NULL,
    "message_ar" TEXT,
    "hours_overdue" DECIMAL(8,2) NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sla_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_inventories" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "mir_form_instance_id" UUID NOT NULL,
    "material_code" TEXT NOT NULL,
    "material_name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "initial_quantity" DECIMAL(18,4) NOT NULL,
    "available_balance" DECIMAL(18,4) NOT NULL,
    "organization_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_ledger_entries" (
    "id" UUID NOT NULL,
    "inventory_id" UUID NOT NULL,
    "form_instance_id" UUID NOT NULL,
    "ledger_type" "MaterialLedgerType" NOT NULL,
    "quantity_delta" DECIMAL(18,4) NOT NULL,
    "balance_before" DECIMAL(18,4) NOT NULL,
    "balance_after" DECIMAL(18,4) NOT NULL,
    "liability_shift_red_alert" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_policies_project_id_template_code_key" ON "workflow_policies"("project_id", "template_code");

-- CreateIndex
CREATE INDEX "approval_records_form_instance_id_idx" ON "approval_records"("form_instance_id");

-- CreateIndex
CREATE INDEX "approval_records_actor_org_id_idx" ON "approval_records"("actor_org_id");

-- CreateIndex
CREATE INDEX "sla_escalations_project_id_acknowledged_idx" ON "sla_escalations"("project_id", "acknowledged");

-- CreateIndex
CREATE INDEX "sla_escalations_form_instance_id_idx" ON "sla_escalations"("form_instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_inventories_mir_form_instance_id_key" ON "material_inventories"("mir_form_instance_id");

-- CreateIndex
CREATE INDEX "material_inventories_project_id_material_code_idx" ON "material_inventories"("project_id", "material_code");

-- CreateIndex
CREATE INDEX "material_ledger_entries_form_instance_id_idx" ON "material_ledger_entries"("form_instance_id");

-- CreateIndex
CREATE INDEX "material_ledger_entries_inventory_id_idx" ON "material_ledger_entries"("inventory_id");

-- CreateIndex
CREATE INDEX "material_ledger_entries_liability_shift_red_alert_idx" ON "material_ledger_entries"("liability_shift_red_alert");

-- CreateIndex
CREATE INDEX "form_instances_workflow_phase_idx" ON "form_instances"("workflow_phase");

-- CreateIndex
CREATE INDEX "form_instances_sla_breached_idx" ON "form_instances"("sla_breached");

-- CreateIndex
CREATE INDEX "form_instances_liability_shift_red_alert_idx" ON "form_instances"("liability_shift_red_alert");

-- AddForeignKey
ALTER TABLE "workflow_policies" ADD CONSTRAINT "workflow_policies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_form_instance_id_fkey" FOREIGN KEY ("form_instance_id") REFERENCES "form_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_escalations" ADD CONSTRAINT "sla_escalations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sla_escalations" ADD CONSTRAINT "sla_escalations_form_instance_id_fkey" FOREIGN KEY ("form_instance_id") REFERENCES "form_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_inventories" ADD CONSTRAINT "material_inventories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_inventories" ADD CONSTRAINT "material_inventories_mir_form_instance_id_fkey" FOREIGN KEY ("mir_form_instance_id") REFERENCES "form_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_ledger_entries" ADD CONSTRAINT "material_ledger_entries_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "material_inventories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_ledger_entries" ADD CONSTRAINT "material_ledger_entries_form_instance_id_fkey" FOREIGN KEY ("form_instance_id") REFERENCES "form_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
