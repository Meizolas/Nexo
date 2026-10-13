CREATE TYPE "payment_proof_status" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

CREATE TABLE "payment_proofs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "charge_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "status" "payment_proof_status" NOT NULL DEFAULT 'PENDING',
    "review_note" VARCHAR(500),
    "reviewed_by_user_id" UUID,
    "reviewed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_proofs_review_check" CHECK (
        ("status" = 'PENDING' AND "reviewed_by_user_id" IS NULL AND "reviewed_at" IS NULL) OR
        ("status" <> 'PENDING' AND "reviewed_by_user_id" IS NOT NULL AND "reviewed_at" IS NOT NULL)
    ),
    CONSTRAINT "payment_proofs_rejection_note_check" CHECK ("status" <> 'REJECTED' OR LENGTH(TRIM("review_note")) >= 3)
);

CREATE UNIQUE INDEX "payment_proofs_document_id_key" ON "payment_proofs"("document_id");
CREATE INDEX "payment_proofs_organization_id_charge_id_status_created_at_idx" ON "payment_proofs"("organization_id", "charge_id", "status", "created_at");

ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_organization_id_charge_id_fkey" FOREIGN KEY ("organization_id", "charge_id") REFERENCES "charges"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
