-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('CLIENT', 'CONSULTANT', 'MAIN_CONTRACTOR', 'LABORATORY', 'SUB_CONTRACTOR');

-- CreateEnum
CREATE TYPE "ProjectOrganizationRole" AS ENUM ('OWNER', 'CONSULTANT', 'MAIN_CONTRACTOR', 'LABORATORY', 'SUB_CONTRACTOR');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "slug" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "first_name_ar" TEXT,
    "last_name_ar" TEXT,
    "organization_id" UUID NOT NULL,
    "role_id" UUID,
    "is_org_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "owner_org_id" UUID NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_organizations" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "role" "ProjectOrganizationRole" NOT NULL,
    "invited_by_org_id" UUID,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "project_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_contractor_links" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "main_contractor_id" UUID NOT NULL,
    "sub_contractor_id" UUID NOT NULL,
    "invited_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sub_contractor_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_users" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "project_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "project_id" UUID,
    "user_id" UUID,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "previous_data" JSONB,
    "new_data" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_type_idx" ON "organizations"("type");

-- CreateIndex
CREATE INDEX "organizations_deleted_at_idx" ON "organizations"("deleted_at");

-- CreateIndex
CREATE INDEX "roles_deleted_at_idx" ON "roles"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organization_id_name_key" ON "roles"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "projects_owner_org_id_idx" ON "projects"("owner_org_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_deleted_at_idx" ON "projects"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "projects_owner_org_id_code_key" ON "projects"("owner_org_id", "code");

-- CreateIndex
CREATE INDEX "project_organizations_organization_id_idx" ON "project_organizations"("organization_id");

-- CreateIndex
CREATE INDEX "project_organizations_deleted_at_idx" ON "project_organizations"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_organizations_project_id_organization_id_key" ON "project_organizations"("project_id", "organization_id");

-- CreateIndex
CREATE INDEX "sub_contractor_links_main_contractor_id_idx" ON "sub_contractor_links"("main_contractor_id");

-- CreateIndex
CREATE INDEX "sub_contractor_links_deleted_at_idx" ON "sub_contractor_links"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "sub_contractor_links_project_id_sub_contractor_id_key" ON "sub_contractor_links"("project_id", "sub_contractor_id");

-- CreateIndex
CREATE INDEX "project_users_user_id_idx" ON "project_users"("user_id");

-- CreateIndex
CREATE INDEX "project_users_deleted_at_idx" ON "project_users"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_users_project_id_user_id_key" ON "project_users"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_project_id_idx" ON "audit_logs"("project_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_org_id_fkey" FOREIGN KEY ("owner_org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_organizations" ADD CONSTRAINT "project_organizations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_organizations" ADD CONSTRAINT "project_organizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_organizations" ADD CONSTRAINT "project_organizations_invited_by_org_id_fkey" FOREIGN KEY ("invited_by_org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_contractor_links" ADD CONSTRAINT "sub_contractor_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_contractor_links" ADD CONSTRAINT "sub_contractor_links_main_contractor_id_fkey" FOREIGN KEY ("main_contractor_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_contractor_links" ADD CONSTRAINT "sub_contractor_links_sub_contractor_id_fkey" FOREIGN KEY ("sub_contractor_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_contractor_links" ADD CONSTRAINT "sub_contractor_links_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
