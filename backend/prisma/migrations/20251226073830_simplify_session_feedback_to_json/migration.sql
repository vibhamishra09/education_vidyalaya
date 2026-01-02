-- CreateTable
CREATE TABLE "SessionFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studyRoomId" TEXT,
    "peerSessionId" TEXT,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionFeedback_userId_idx" ON "SessionFeedback"("userId");

-- CreateIndex
CREATE INDEX "SessionFeedback_studyRoomId_idx" ON "SessionFeedback"("studyRoomId");

-- CreateIndex
CREATE INDEX "SessionFeedback_peerSessionId_idx" ON "SessionFeedback"("peerSessionId");

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_studyRoomId_fkey" FOREIGN KEY ("studyRoomId") REFERENCES "StudyRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_peerSessionId_fkey" FOREIGN KEY ("peerSessionId") REFERENCES "PeerSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
