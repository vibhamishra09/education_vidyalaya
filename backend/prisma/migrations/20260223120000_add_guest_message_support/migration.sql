-- AlterTable: Make senderId nullable to support guest messages
ALTER TABLE "Message" ALTER COLUMN "senderId" DROP NOT NULL;

-- AlterTable: Add guest message fields
ALTER TABLE "Message"
ADD COLUMN "guestSenderId" TEXT,
ADD COLUMN "guestEmail" TEXT;

-- CreateIndex: Add index for guest message history lookup
CREATE INDEX "Message_channelId_guestEmail_createdAt_idx" ON "Message"("channelId", "guestEmail", "createdAt");
