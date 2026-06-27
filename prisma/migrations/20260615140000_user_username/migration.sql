-- Add username for field-worker login (email remains internal for legacy/admin accounts)
ALTER TABLE "users" ADD COLUMN "username" TEXT;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username") WHERE "username" IS NOT NULL;
