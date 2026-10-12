CREATE TYPE "lease_status" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED', 'CANCELED');

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE "leases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "status" "lease_status" NOT NULL DEFAULT 'DRAFT',
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "monthly_rent" DECIMAL(14,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
    "due_day" INTEGER NOT NULL,
    "activated_at" TIMESTAMPTZ(3),
    "ended_at" TIMESTAMPTZ(3),
    "canceled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "leases_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "leases_positive_monthly_rent_check" CHECK ("monthly_rent" > 0),
    CONSTRAINT "leases_due_day_check" CHECK ("due_day" BETWEEN 1 AND 28),
    CONSTRAINT "leases_date_range_check" CHECK ("end_date" IS NULL OR "end_date" >= "start_date")
);

CREATE TABLE "lease_tenants" (
    "organization_id" UUID NOT NULL,
    "lease_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "is_financial_responsible" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lease_tenants_pkey" PRIMARY KEY ("lease_id", "party_id")
);

CREATE UNIQUE INDEX "leases_organization_id_id_key" ON "leases"("organization_id", "id");
CREATE INDEX "leases_organization_id_status_start_date_end_date_idx" ON "leases"("organization_id", "status", "start_date", "end_date");
CREATE INDEX "leases_organization_id_unit_id_status_idx" ON "leases"("organization_id", "unit_id", "status");
CREATE INDEX "lease_tenants_organization_id_party_id_lease_id_idx" ON "lease_tenants"("organization_id", "party_id", "lease_id");
CREATE UNIQUE INDEX "lease_tenants_one_financial_responsible_key" ON "lease_tenants"("lease_id") WHERE "is_financial_responsible" = true;

ALTER TABLE "leases" ADD CONSTRAINT "leases_no_active_period_overlap" EXCLUDE USING gist (
    "organization_id" WITH =,
    "unit_id" WITH =,
    daterange("start_date", COALESCE("end_date", 'infinity'::date), '[]') WITH &&
) WHERE ("status" = 'ACTIVE');

ALTER TABLE "leases" ADD CONSTRAINT "leases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "leases" ADD CONSTRAINT "leases_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lease_tenants" ADD CONSTRAINT "lease_tenants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lease_tenants" ADD CONSTRAINT "lease_tenants_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_tenants" ADD CONSTRAINT "lease_tenants_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
