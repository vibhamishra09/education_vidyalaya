-- AlterTable
ALTER TABLE "PeerSession" ADD COLUMN "hostDetailsUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StudyRoom" ADD COLUMN "hostDetailsUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DebateRoom" ADD COLUMN "hostDetailsUpdatedAt" TIMESTAMP(3);
