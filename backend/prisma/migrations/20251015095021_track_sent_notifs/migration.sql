-- AlterTable
ALTER TABLE "PeerSession" ADD COLUMN     "reminder1hSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminder24hSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminder5mSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StudyRoom" ADD COLUMN     "reminder1hSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminder24hSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reminder5mSent" BOOLEAN NOT NULL DEFAULT false;
