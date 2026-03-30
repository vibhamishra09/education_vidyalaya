-- Opaque per-registration token for emailed join links (passcode-only join step).

ALTER TABLE "WebinarRegistration" ADD COLUMN "joinLinkToken" TEXT;

UPDATE "WebinarRegistration"
SET "joinLinkToken" = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE "joinLinkToken" IS NULL;

CREATE UNIQUE INDEX "WebinarRegistration_joinLinkToken_key" ON "WebinarRegistration"("joinLinkToken");

ALTER TABLE "WebinarRegistration" ALTER COLUMN "joinLinkToken" SET NOT NULL;
