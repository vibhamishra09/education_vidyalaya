-- CreateTable
CREATE TABLE "UserRewardEvent" (
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

-- CreateIndex
CREATE UNIQUE INDEX "UserRewardEvent_userId_rewardType_periodKey_key" ON "UserRewardEvent"("userId", "rewardType", "periodKey");

-- CreateIndex
CREATE INDEX "UserRewardEvent_userId_createdAt_idx" ON "UserRewardEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserRewardEvent_rewardType_periodKey_idx" ON "UserRewardEvent"("rewardType", "periodKey");

-- AddForeignKey
ALTER TABLE "UserRewardEvent" ADD CONSTRAINT "UserRewardEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
