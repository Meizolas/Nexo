CREATE TYPE "charge_adjustment_type" AS ENUM ('FINE', 'INTEREST', 'DISCOUNT');
CREATE TYPE "charge_adjustment_status" AS ENUM ('ACTIVE', 'CANCELED');

CREATE UNIQUE INDEX "charges_organization_id_id_key" ON "charges"("organization_id", "id");

CREATE TABLE "charge_adjustments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "charge_id" UUID NOT NULL,
    "type" "charge_adjustment_type" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "charge_adjustment_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceled_at" TIMESTAMPTZ(3),
    CONSTRAINT "charge_adjustments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "charge_adjustments_positive_amount_check" CHECK ("amount" > 0),
    CONSTRAINT "charge_adjustments_cancellation_check" CHECK (
        ("status" = 'ACTIVE' AND "canceled_at" IS NULL) OR
        ("status" = 'CANCELED' AND "canceled_at" IS NOT NULL)
    )
);

CREATE INDEX "charge_adjustments_organization_id_charge_id_status_created_at_idx" ON "charge_adjustments"("organization_id", "charge_id", "status", "created_at");

ALTER TABLE "charge_adjustments" ADD CONSTRAINT "charge_adjustments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "charge_adjustments" ADD CONSTRAINT "charge_adjustments_organization_id_charge_id_fkey" FOREIGN KEY ("organization_id", "charge_id") REFERENCES "charges"("organization_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
