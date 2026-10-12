CREATE TYPE "hearing_status" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELED');

CREATE TABLE "hearings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "legal_case_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "scheduled_at" TIMESTAMPTZ(3) NOT NULL,
    "location" VARCHAR(300),
    "notes" TEXT,
    "status" "hearing_status" NOT NULL DEFAULT 'SCHEDULED',
    "resolution_note" VARCHAR(2000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "hearings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "hearings_org_status_sched_deleted_idx" ON "hearings"("organization_id", "status", "scheduled_at", "deleted_at");
CREATE INDEX "hearings_org_case_sched_idx" ON "hearings"("organization_id", "legal_case_id", "scheduled_at");

ALTER TABLE "hearings" ADD CONSTRAINT "hearings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_legal_case_id_fkey" FOREIGN KEY ("legal_case_id") REFERENCES "legal_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
