-- CreateEnum
CREATE TYPE "MessageAudienceType" AS ENUM ('EVERYONE', 'HOST', 'USER');

-- AlterTable
ALTER TABLE "Message"
ADD COLUMN "audienceType" "MessageAudienceType" NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN "targetUserId" TEXT;

-- CreateIndex
CREATE INDEX "Message_channelId_createdAt_idx" ON "Message"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_channelId_targetUserId_createdAt_idx" ON "Message"("channelId", "targetUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
