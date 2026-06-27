-- Sprint 5: Analytics & search performance indexes
CREATE INDEX IF NOT EXISTS "idx_form_instances_project_billed"
  ON "form_instances" ("project_id", "is_billed")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_form_instances_liability_alert"
  ON "form_instances" ("project_id", "liability_shift_red_alert")
  WHERE "deleted_at" IS NULL AND "liability_shift_red_alert" = true;

CREATE INDEX IF NOT EXISTS "idx_audit_logs_project_created"
  ON "audit_logs" ("project_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity"
  ON "audit_logs" ("entity_id", "created_at" DESC);
