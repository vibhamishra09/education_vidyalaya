-- Manual, idempotent production schema sync for runtime-required changes.
-- This intentionally avoids destructive drops because the target database contains live data.

CREATE TABLE IF NOT EXISTS "UserRewardEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coinAmount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRewardEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserRewardEvent_userId_rewardType_periodKey_key"
ON "UserRewardEvent"("userId", "rewardType", "periodKey");

CREATE INDEX IF NOT EXISTS "UserRewardEvent_userId_createdAt_idx"
ON "UserRewardEvent"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "UserRewardEvent_rewardType_periodKey_idx"
ON "UserRewardEvent"("rewardType", "periodKey");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserRewardEvent_userId_fkey'
  ) THEN
    ALTER TABLE "UserRewardEvent"
    ADD CONSTRAINT "UserRewardEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Achievement'
      AND column_name = 'coinReward'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Achievement'
      AND column_name = 'pointReward'
  ) THEN
    ALTER TABLE "Achievement" RENAME COLUMN "coinReward" TO "pointReward";
  END IF;
END $$;
