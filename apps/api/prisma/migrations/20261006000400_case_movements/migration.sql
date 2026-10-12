-- CreateTable
CREATE TABLE "case_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "legal_case_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "published_by_user_id" UUID,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "internal_description" TEXT NOT NULL,
    "client_description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "case_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_movements_organization_id_legal_case_id_occurred_at_idx" ON "case_movements"("organization_id", "legal_case_id", "occurred_at");

-- CreateIndex
CREATE INDEX "case_movements_organization_id_is_published_deleted_at_idx" ON "case_movements"("organization_id", "is_published", "deleted_at");

-- AddForeignKey
ALTER TABLE "case_movements" ADD CONSTRAINT "case_movements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_movements" ADD CONSTRAINT "case_movements_legal_case_id_fkey" FOREIGN KEY ("legal_case_id") REFERENCES "legal_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_movements" ADD CONSTRAINT "case_movements_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_movements" ADD CONSTRAINT "case_movements_published_by_user_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
