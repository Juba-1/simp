-- PMIS revision tracking + resubmit workflow action
ALTER TABLE "form_instances" ADD COLUMN IF NOT EXISTS "revision_number" INTEGER NOT NULL DEFAULT 0;

ALTER TYPE "ApprovalActionType" ADD VALUE IF NOT EXISTS 'RESUBMIT';
