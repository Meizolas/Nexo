ALTER TABLE "hearings" ADD COLUMN "is_client_visible" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "party_user_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "party_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "granted_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    CONSTRAINT "party_user_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "parties_organization_id_id_key" ON "parties"("organization_id", "id");
CREATE UNIQUE INDEX "party_user_links_organization_id_party_id_user_id_key" ON "party_user_links"("organization_id", "party_id", "user_id");
CREATE INDEX "party_user_links_organization_id_user_id_revoked_at_idx" ON "party_user_links"("organization_id", "user_id", "revoked_at");
CREATE INDEX "party_user_links_organization_id_party_id_revoked_at_idx" ON "party_user_links"("organization_id", "party_id", "revoked_at");

ALTER TABLE "party_user_links" ADD CONSTRAINT "party_user_links_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "party_user_links" ADD CONSTRAINT "party_user_links_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_user_links" ADD CONSTRAINT "party_user_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "party_user_links" ADD CONSTRAINT "party_user_links_granted_by_user_id_fkey" FOREIGN KEY ("granted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
