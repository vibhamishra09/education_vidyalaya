DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'StudyRoomRecurrenceMode'
  ) THEN
    CREATE TYPE "StudyRoomRecurrenceMode" AS ENUM ('DAILY', 'WEEKLY', 'CUSTOM_DATES');
  END IF;
END $$;

ALTER TABLE "StudyRoom"
  ADD COLUMN IF NOT EXISTS "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "recurrenceMode" "StudyRoomRecurrenceMode",
  ADD COLUMN IF NOT EXISTS "seriesId" TEXT,
  ADD COLUMN IF NOT EXISTS "seriesRootId" TEXT,
  ADD COLUMN IF NOT EXISTS "occurrenceIndex" INTEGER,
  ADD COLUMN IF NOT EXISTS "recurrenceEndDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "occurrenceDateLocal" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "timezone" TEXT;

CREATE INDEX IF NOT EXISTS "StudyRoom_seriesId_date_idx" ON "StudyRoom"("seriesId", "date");
CREATE INDEX IF NOT EXISTS "StudyRoom_seriesId_occurrenceIndex_idx" ON "StudyRoom"("seriesId", "occurrenceIndex");
CREATE INDEX IF NOT EXISTS "StudyRoom_seriesId_sessionStatus_date_idx" ON "StudyRoom"("seriesId", "sessionStatus", "date");
