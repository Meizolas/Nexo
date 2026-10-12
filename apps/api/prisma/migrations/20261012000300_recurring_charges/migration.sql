CREATE TYPE "charge_type" AS ENUM ('RENT');
CREATE TYPE "charge_status" AS ENUM ('OPEN', 'PAID', 'CANCELED');

CREATE TABLE "charges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "type" "charge_type" NOT NULL DEFAULT 'RENT',
    "competence" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "base_amount" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "charge_status" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "charges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "charges_positive_base_amount_check" CHECK ("base_amount" > 0),
    CONSTRAINT "charges_competence_first_day_check" CHECK (EXTRACT(DAY FROM "competence") = 1)
);

CREATE UNIQUE INDEX "charges_organization_id_lease_id_type_competence_key" ON "charges"("organization_id", "lease_id", "type", "competence");
CREATE INDEX "charges_organization_id_status_due_date_idx" ON "charges"("organization_id", "status", "due_date");
CREATE INDEX "charges_organization_id_competence_type_idx" ON "charges"("organization_id", "competence", "type");

ALTER TABLE "charges" ADD CONSTRAINT "charges_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "charges" ADD CONSTRAINT "charges_organization_id_lease_id_fkey" FOREIGN KEY ("organization_id", "lease_id") REFERENCES "leases"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
