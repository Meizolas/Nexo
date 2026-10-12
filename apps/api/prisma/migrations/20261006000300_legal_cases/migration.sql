-- CreateTable
CREATE TABLE "legal_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "case_number" CHAR(20),
    "subject" VARCHAR(200) NOT NULL,
    "tribunal" VARCHAR(160),
    "district" VARCHAR(160),
    "court_division" VARCHAR(160),
    "internal_notes" TEXT,
    "client_summary" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "legal_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_parties" (
    "legal_case_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "role" VARCHAR(40) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_parties_pkey" PRIMARY KEY ("legal_case_id", "party_id", "role")
);

-- CreateTable
CREATE TABLE "case_lawyer_assignments" (
    "legal_case_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_lawyer_assignments_pkey" PRIMARY KEY ("legal_case_id", "user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "legal_cases_organization_id_case_number_key" ON "legal_cases"("organization_id", "case_number");

-- CreateIndex
CREATE INDEX "legal_cases_organization_id_deleted_at_created_at_idx" ON "legal_cases"("organization_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "legal_cases_organization_id_subject_idx" ON "legal_cases"("organization_id", "subject");

-- CreateIndex
CREATE INDEX "case_parties_party_id_legal_case_id_idx" ON "case_parties"("party_id", "legal_case_id");

-- CreateIndex
CREATE INDEX "case_lawyer_assignments_user_id_legal_case_id_idx" ON "case_lawyer_assignments"("user_id", "legal_case_id");

-- AddForeignKey
ALTER TABLE "legal_cases" ADD CONSTRAINT "legal_cases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_legal_case_id_fkey" FOREIGN KEY ("legal_case_id") REFERENCES "legal_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_parties" ADD CONSTRAINT "case_parties_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_lawyer_assignments" ADD CONSTRAINT "case_lawyer_assignments_legal_case_id_fkey" FOREIGN KEY ("legal_case_id") REFERENCES "legal_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_lawyer_assignments" ADD CONSTRAINT "case_lawyer_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
