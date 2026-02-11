-- CreateTable
CREATE TABLE "DebateModeratorEvaluation" (
    "id" TEXT NOT NULL,
    "debateRoomId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "turnNumber" INTEGER NOT NULL,
    "notes" TEXT,
    "scores" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebateModeratorEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DebateModeratorEvaluation_debateRoomId_participantId_moderatorI_key"
ON "DebateModeratorEvaluation"("debateRoomId", "participantId", "moderatorId", "turnNumber");

-- CreateIndex
CREATE INDEX "DebateModeratorEvaluation_debateRoomId_moderatorId_idx"
ON "DebateModeratorEvaluation"("debateRoomId", "moderatorId");

-- CreateIndex
CREATE INDEX "DebateModeratorEvaluation_debateRoomId_participantId_idx"
ON "DebateModeratorEvaluation"("debateRoomId", "participantId");

-- CreateIndex
CREATE INDEX "DebateModeratorEvaluation_participantId_idx"
ON "DebateModeratorEvaluation"("participantId");

-- AddForeignKey
ALTER TABLE "DebateModeratorEvaluation"
ADD CONSTRAINT "DebateModeratorEvaluation_debateRoomId_fkey"
FOREIGN KEY ("debateRoomId") REFERENCES "DebateRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateModeratorEvaluation"
ADD CONSTRAINT "DebateModeratorEvaluation_participantId_fkey"
FOREIGN KEY ("participantId") REFERENCES "DebateParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateModeratorEvaluation"
ADD CONSTRAINT "DebateModeratorEvaluation_moderatorId_fkey"
FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
