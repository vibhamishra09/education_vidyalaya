-- AlterTable
ALTER TABLE "DebateRoom" ADD COLUMN "debateDurationMinutes" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "DebateRoom" ADD COLUMN "debateSlotEndsAt" TIMESTAMP(3);

UPDATE "DebateRoom"
SET "debateSlotEndsAt" = "scheduledAt" + ("debateDurationMinutes" * INTERVAL '1 minute')
WHERE "scheduledAt" IS NOT NULL;
