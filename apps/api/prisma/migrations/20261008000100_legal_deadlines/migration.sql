CREATE TYPE "legal_deadline_priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');
CREATE TYPE "legal_deadline_status" AS ENUM ('OPEN', 'COMPLETED', 'DISMISSED');

CREATE TABLE "legal_deadlines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "legal_case_id" UUID NOT NULL,
    "assigned_to_user_id" UUID NOT NULL,
    "completed_by_user_id" UUID,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "due_at" TIMESTAMPTZ(3) NOT NULL,
    "priority" "legal_deadline_priority" NOT NULL DEFAULT 'NORMAL',
    "status" "legal_deadline_status" NOT NULL DEFAULT 'OPEN',
    "resolution_note" VARCHAR(2000),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),
    CONSTRAINT "legal_deadlines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "legal_deadlines_organization_id_status_due_at_deleted_at_idx" ON "legal_deadlines"("organization_id", "status", "due_at", "deleted_at");
CREATE INDEX "legal_deadlines_organization_id_legal_case_id_due_at_idx" ON "legal_deadlines"("organization_id", "legal_case_id", "due_at");
CREATE INDEX "legal_deadlines_assigned_to_user_id_status_due_at_idx" ON "legal_deadlines"("assigned_to_user_id", "status", "due_at");

ALTER TABLE "legal_deadlines" ADD CONSTRAINT "legal_deadlines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "legal_deadlines" ADD CONSTRAINT "legal_deadlines_legal_case_id_fkey" FOREIGN KEY ("legal_case_id") REFERENCES "legal_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "legal_deadlines" ADD CONSTRAINT "legal_deadlines_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "legal_deadlines" ADD CONSTRAINT "legal_deadlines_completed_by_user_id_fkey" FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
