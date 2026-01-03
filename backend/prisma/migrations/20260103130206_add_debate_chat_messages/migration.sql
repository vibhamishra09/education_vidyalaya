-- CreateEnum
CREATE TYPE "MessageVisibility" AS ENUM ('ALL', 'MODERATOR', 'MODERATOR_ONLY', 'TEAM_FOR', 'TEAM_AGAINST');

-- CreateTable
CREATE TABLE "DebateChatMessage" (
    "id" TEXT NOT NULL,
    "debateRoomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "side" "DebateSide",
    "visibility" "MessageVisibility" NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebateChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebateChatMessage_debateRoomId_idx" ON "DebateChatMessage"("debateRoomId");

-- CreateIndex
CREATE INDEX "DebateChatMessage_senderId_idx" ON "DebateChatMessage"("senderId");

-- CreateIndex
CREATE INDEX "DebateChatMessage_debateRoomId_createdAt_idx" ON "DebateChatMessage"("debateRoomId", "createdAt");

-- AddForeignKey
ALTER TABLE "DebateChatMessage" ADD CONSTRAINT "DebateChatMessage_debateRoomId_fkey" FOREIGN KEY ("debateRoomId") REFERENCES "DebateRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateChatMessage" ADD CONSTRAINT "DebateChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
