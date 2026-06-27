-- CreateEnum
CREATE TYPE "IpcStatus" AS ENUM ('DRAFT', 'PENDING_CONSULTANT_REVIEW', 'PENDING_CLIENT_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LabTestRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LabTestResultStatus" AS ENUM ('PASS', 'FAIL', 'INCONCLUSIVE');

-- AlterTable
ALTER TABLE "form_instances" ADD COLUMN     "ipc_id" UUID,
ADD COLUMN     "is_billed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "interim_payment_certificates" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "contractor_org_id" UUID NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "status" "IpcStatus" NOT NULL DEFAULT 'DRAFT',
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "subtotal_amount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "consultant_reviewed_at" TIMESTAMP(3),
    "client_approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "interim_payment_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ipc_line_items" (
    "id" UUID NOT NULL,
    "ipc_id" UUID NOT NULL,
    "form_instance_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "unit_rate" DECIMAL(18,4) NOT NULL,
    "line_amount" DECIMAL(18,4) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ipc_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_test_requests" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "form_instance_id" UUID NOT NULL,
    "barcode" TEXT NOT NULL,
    "test_type" TEXT NOT NULL,
    "anonymous_label" TEXT NOT NULL,
    "status" "LabTestRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_user_id" UUID NOT NULL,
    "requested_by_org_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_test_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_test_results" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "submitted_by_user_id" UUID NOT NULL,
    "laboratory_org_id" UUID NOT NULL,
    "result_status" "LabTestResultStatus" NOT NULL,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "report_notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interim_payment_certificates_project_id_status_idx" ON "interim_payment_certificates"("project_id", "status");

-- CreateIndex
CREATE INDEX "interim_payment_certificates_contractor_org_id_idx" ON "interim_payment_certificates"("contractor_org_id");

-- CreateIndex
CREATE INDEX "interim_payment_certificates_deleted_at_idx" ON "interim_payment_certificates"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "interim_payment_certificates_project_id_certificate_number_key" ON "interim_payment_certificates"("project_id", "certificate_number");

-- CreateIndex
CREATE UNIQUE INDEX "ipc_line_items_form_instance_id_key" ON "ipc_line_items"("form_instance_id");

-- CreateIndex
CREATE INDEX "ipc_line_items_ipc_id_idx" ON "ipc_line_items"("ipc_id");

-- CreateIndex
CREATE UNIQUE INDEX "lab_test_requests_barcode_key" ON "lab_test_requests"("barcode");

-- CreateIndex
CREATE INDEX "lab_test_requests_project_id_idx" ON "lab_test_requests"("project_id");

-- CreateIndex
CREATE INDEX "lab_test_requests_form_instance_id_idx" ON "lab_test_requests"("form_instance_id");

-- CreateIndex
CREATE INDEX "lab_test_requests_status_idx" ON "lab_test_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "lab_test_results_request_id_key" ON "lab_test_results"("request_id");

-- CreateIndex
CREATE INDEX "lab_test_results_laboratory_org_id_idx" ON "lab_test_results"("laboratory_org_id");

-- CreateIndex
CREATE INDEX "lab_test_results_result_status_idx" ON "lab_test_results"("result_status");

-- CreateIndex
CREATE INDEX "form_instances_is_billed_idx" ON "form_instances"("is_billed");

-- CreateIndex
CREATE INDEX "form_instances_ipc_id_idx" ON "form_instances"("ipc_id");

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_ipc_id_fkey" FOREIGN KEY ("ipc_id") REFERENCES "interim_payment_certificates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_payment_certificates" ADD CONSTRAINT "interim_payment_certificates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_payment_certificates" ADD CONSTRAINT "interim_payment_certificates_contractor_org_id_fkey" FOREIGN KEY ("contractor_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interim_payment_certificates" ADD CONSTRAINT "interim_payment_certificates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipc_line_items" ADD CONSTRAINT "ipc_line_items_ipc_id_fkey" FOREIGN KEY ("ipc_id") REFERENCES "interim_payment_certificates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipc_line_items" ADD CONSTRAINT "ipc_line_items_form_instance_id_fkey" FOREIGN KEY ("form_instance_id") REFERENCES "form_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_requests" ADD CONSTRAINT "lab_test_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_requests" ADD CONSTRAINT "lab_test_requests_form_instance_id_fkey" FOREIGN KEY ("form_instance_id") REFERENCES "form_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_requests" ADD CONSTRAINT "lab_test_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_results" ADD CONSTRAINT "lab_test_results_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "lab_test_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_test_results" ADD CONSTRAINT "lab_test_results_submitted_by_user_id_fkey" FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
