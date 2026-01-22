-- CreateEnum
CREATE TYPE "DebateStatus" AS ENUM ('WAITING', 'PREP', 'LIVE', 'ENDED', 'PROCESSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TurnOrderType" AS ENUM ('FIFO', 'RANDOM');

-- CreateEnum
CREATE TYPE "DebateSide" AS ENUM ('FOR', 'AGAINST');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('ACTIVE', 'DISCONNECTED', 'BANNED', 'LEFT');

-- CreateTable
CREATE TABLE "DebateRoom" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "description" TEXT,
    "status" "DebateStatus" NOT NULL DEFAULT 'WAITING',
    "maxParticipants" INTEGER NOT NULL DEFAULT 6,
    "turnDurationSeconds" INTEGER NOT NULL DEFAULT 120,
    "prepTimeSeconds" INTEGER NOT NULL DEFAULT 30,
    "turnOrder" "TurnOrderType" NOT NULL DEFAULT 'FIFO',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "currentTurnIndex" INTEGER NOT NULL DEFAULT 0,
    "currentSpeakerId" TEXT,
    "turnStartedAt" TIMESTAMP(3),
    "hostId" TEXT NOT NULL,
    "livekitRoomName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebateRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateTeam" (
    "id" TEXT NOT NULL,
    "debateRoomId" TEXT NOT NULL,
    "side" "DebateSide" NOT NULL,
    "totalScore" DOUBLE PRECISION,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebateTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateParticipant" (
    "id" TEXT NOT NULL,
    "debateRoomId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "turnCompleted" BOOLEAN NOT NULL DEFAULT false,
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebateParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateModerator" (
    "id" TEXT NOT NULL,
    "debateRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebateModerator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateTurnQueue" (
    "id" TEXT NOT NULL,
    "debateRoomId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "turnOrder" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "DebateTurnQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateTranscript" (
    "id" TEXT NOT NULL,
    "debateRoomId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "turnNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebateTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateReport" (
    "id" TEXT NOT NULL,
    "debateRoomId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "ideaScore" DOUBLE PRECISION NOT NULL,
    "clarityScore" DOUBLE PRECISION NOT NULL,
    "rebuttalScore" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "suggestions" JSONB NOT NULL,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebateReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DebateRoom_hostId_idx" ON "DebateRoom"("hostId");

-- CreateIndex
CREATE INDEX "DebateRoom_status_idx" ON "DebateRoom"("status");

-- CreateIndex
CREATE INDEX "DebateTeam_debateRoomId_idx" ON "DebateTeam"("debateRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "DebateTeam_debateRoomId_side_key" ON "DebateTeam"("debateRoomId", "side");

-- CreateIndex
CREATE INDEX "DebateParticipant_debateRoomId_idx" ON "DebateParticipant"("debateRoomId");

-- CreateIndex
CREATE INDEX "DebateParticipant_teamId_idx" ON "DebateParticipant"("teamId");

-- CreateIndex
CREATE INDEX "DebateParticipant_userId_idx" ON "DebateParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DebateParticipant_debateRoomId_userId_key" ON "DebateParticipant"("debateRoomId", "userId");

-- CreateIndex
CREATE INDEX "DebateModerator_debateRoomId_idx" ON "DebateModerator"("debateRoomId");

-- CreateIndex
CREATE INDEX "DebateModerator_userId_idx" ON "DebateModerator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DebateModerator_debateRoomId_userId_key" ON "DebateModerator"("debateRoomId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "DebateTurnQueue_participantId_key" ON "DebateTurnQueue"("participantId");

-- CreateIndex
CREATE INDEX "DebateTurnQueue_debateRoomId_turnOrder_idx" ON "DebateTurnQueue"("debateRoomId", "turnOrder");

-- CreateIndex
CREATE INDEX "DebateTranscript_debateRoomId_idx" ON "DebateTranscript"("debateRoomId");

-- CreateIndex
CREATE INDEX "DebateTranscript_participantId_idx" ON "DebateTranscript"("participantId");

-- CreateIndex
CREATE INDEX "DebateTranscript_debateRoomId_turnNumber_idx" ON "DebateTranscript"("debateRoomId", "turnNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DebateReport_participantId_key" ON "DebateReport"("participantId");

-- CreateIndex
CREATE INDEX "DebateReport_debateRoomId_idx" ON "DebateReport"("debateRoomId");

-- AddForeignKey
ALTER TABLE "DebateRoom" ADD CONSTRAINT "DebateRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateTeam" ADD CONSTRAINT "DebateTeam_debateRoomId_fkey" FOREIGN KEY ("debateRoomId") REFERENCES "DebateRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateParticipant" ADD CONSTRAINT "DebateParticipant_debateRoomId_fkey" FOREIGN KEY ("debateRoomId") REFERENCES "DebateRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateParticipant" ADD CONSTRAINT "DebateParticipant_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "DebateTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateParticipant" ADD CONSTRAINT "DebateParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateModerator" ADD CONSTRAINT "DebateModerator_debateRoomId_fkey" FOREIGN KEY ("debateRoomId") REFERENCES "DebateRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateModerator" ADD CONSTRAINT "DebateModerator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateTurnQueue" ADD CONSTRAINT "DebateTurnQueue_debateRoomId_fkey" FOREIGN KEY ("debateRoomId") REFERENCES "DebateRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateTurnQueue" ADD CONSTRAINT "DebateTurnQueue_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "DebateParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateTranscript" ADD CONSTRAINT "DebateTranscript_debateRoomId_fkey" FOREIGN KEY ("debateRoomId") REFERENCES "DebateRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateTranscript" ADD CONSTRAINT "DebateTranscript_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "DebateParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateReport" ADD CONSTRAINT "DebateReport_debateRoomId_fkey" FOREIGN KEY ("debateRoomId") REFERENCES "DebateRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebateReport" ADD CONSTRAINT "DebateReport_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "DebateParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
