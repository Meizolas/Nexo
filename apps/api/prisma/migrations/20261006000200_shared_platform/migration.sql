-- CreateEnum
CREATE TYPE "party_type" AS ENUM ('PERSON', 'COMPANY');

-- CreateEnum
CREATE TYPE "party_role_code" AS ENUM ('CLIENT', 'OWNER', 'TENANT');

-- CreateEnum
CREATE TYPE "document_visibility" AS ENUM ('INTERNAL', 'CLIENT_VISIBLE', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('UNREAD', 'READ');

-- CreateTable
CREATE TABLE "parties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "type" "party_type" NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "tax_id" VARCHAR(14),
    "email" VARCHAR(320),
    "phone" VARCHAR(13),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "parties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "party_roles" (
    "party_id" UUID NOT NULL,
    "role" "party_role_code" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "party_roles_pkey" PRIMARY KEY ("party_id","role")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "uploaded_by_user_id" UUID NOT NULL,
    "original_name" VARCHAR(255) NOT NULL,
    "storage_bucket" VARCHAR(80) NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(160) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "visibility" "document_visibility" NOT NULL,
    "status" "document_status" NOT NULL DEFAULT 'ACTIVE',
    "context_type" VARCHAR(80),
    "context_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "data" JSONB,
    "status" "notification_status" NOT NULL DEFAULT 'UNREAD',
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parties_organization_id_type_deleted_at_idx" ON "parties"("organization_id", "type", "deleted_at");

-- CreateIndex
CREATE INDEX "parties_organization_id_name_idx" ON "parties"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "parties_organization_id_tax_id_key" ON "parties"("organization_id", "tax_id");

-- CreateIndex
CREATE INDEX "documents_organization_id_context_type_context_id_idx" ON "documents"("organization_id", "context_type", "context_id");

-- CreateIndex
CREATE INDEX "documents_organization_id_visibility_deleted_at_idx" ON "documents"("organization_id", "visibility", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "documents_storage_bucket_storage_path_key" ON "documents"("storage_bucket", "storage_path");

-- CreateIndex
CREATE INDEX "notifications_organization_id_recipient_user_id_status_crea_idx" ON "notifications"("organization_id", "recipient_user_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "parties" ADD CONSTRAINT "parties_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "party_roles" ADD CONSTRAINT "party_roles_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
