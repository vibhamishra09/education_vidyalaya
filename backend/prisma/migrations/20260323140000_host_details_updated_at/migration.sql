-- Study / debate: host edit notifications (hostDetailsUpdatedAt).
-- Peer session: last edit time + who edited (other party sees banner / "Edited").
-- Single migration replaces a prior add → drop study/debate → re-add chain for clean replay.

-- AlterTable
ALTER TABLE "PeerSession" ADD COLUMN "hostDetailsUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PeerSession" ADD COLUMN "lastDetailsEditedById" TEXT;

-- AlterTable
ALTER TABLE "StudyRoom" ADD COLUMN "hostDetailsUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DebateRoom" ADD COLUMN "hostDetailsUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PeerSession" ADD CONSTRAINT "PeerSession_lastDetailsEditedById_fkey" FOREIGN KEY ("lastDetailsEditedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
