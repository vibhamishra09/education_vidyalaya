-- Revert unused columns; peer-session-only flow uses PeerSession.hostDetailsUpdatedAt.
ALTER TABLE "StudyRoom" DROP COLUMN IF EXISTS "hostDetailsUpdatedAt";
ALTER TABLE "DebateRoom" DROP COLUMN IF EXISTS "hostDetailsUpdatedAt";
