CREATE TYPE "property_type" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'LAND', 'MIXED_USE', 'OTHER');
CREATE TYPE "property_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "unit_status" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "properties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "type" "property_type" NOT NULL DEFAULT 'RESIDENTIAL',
    "address_line" VARCHAR(240),
    "city" VARCHAR(120),
    "state" CHAR(2),
    "postal_code" CHAR(8),
    "status" "property_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "status" "unit_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ownerships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "property_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ownerships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "properties_organization_id_id_key" ON "properties"("organization_id", "id");
CREATE INDEX "properties_organization_id_status_deleted_at_updated_at_idx" ON "properties"("organization_id", "status", "deleted_at", "updated_at");
CREATE INDEX "properties_organization_id_name_idx" ON "properties"("organization_id", "name");
CREATE UNIQUE INDEX "units_organization_id_property_id_name_key" ON "units"("organization_id", "property_id", "name");
CREATE INDEX "units_organization_id_property_id_status_deleted_at_idx" ON "units"("organization_id", "property_id", "status", "deleted_at");
CREATE UNIQUE INDEX "ownerships_active_property_party_key" ON "ownerships"("organization_id", "property_id", "party_id") WHERE "ended_at" IS NULL;
CREATE INDEX "ownerships_organization_id_property_id_ended_at_idx" ON "ownerships"("organization_id", "property_id", "ended_at");
CREATE INDEX "ownerships_organization_id_party_id_ended_at_idx" ON "ownerships"("organization_id", "party_id", "ended_at");

ALTER TABLE "properties" ADD CONSTRAINT "properties_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "units" ADD CONSTRAINT "units_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ownerships" ADD CONSTRAINT "ownerships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ownerships" ADD CONSTRAINT "ownerships_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ownerships" ADD CONSTRAINT "ownerships_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
