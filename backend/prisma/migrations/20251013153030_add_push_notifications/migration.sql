-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "actionData" TEXT,
ADD COLUMN     "actionType" TEXT,
ADD COLUMN     "peerSessionId" TEXT,
ADD COLUMN     "studyRoomId" TEXT;

-- AlterTable
ALTER TABLE "PeerSession" ADD COLUMN     "reviewReminded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StudyRoom" ADD COLUMN     "reviewReminded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_peerSessionId_fkey" FOREIGN KEY ("peerSessionId") REFERENCES "PeerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_studyRoomId_fkey" FOREIGN KEY ("studyRoomId") REFERENCES "StudyRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
