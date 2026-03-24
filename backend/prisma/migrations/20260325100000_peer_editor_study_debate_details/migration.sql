-- Peer session: track who last edited so the other party sees "Edited" / banner only.
ALTER TABLE "PeerSession" ADD COLUMN IF NOT EXISTS "lastDetailsEditedById" TEXT;

-- Study / debate: host edit notifications for enrolled members
ALTER TABLE "StudyRoom" ADD COLUMN IF NOT EXISTS "hostDetailsUpdatedAt" TIMESTAMP(3);
ALTER TABLE "DebateRoom" ADD COLUMN IF NOT EXISTS "hostDetailsUpdatedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PeerSession_lastDetailsEditedById_fkey'
  ) THEN
    ALTER TABLE "PeerSession"
      ADD CONSTRAINT "PeerSession_lastDetailsEditedById_fkey"
      FOREIGN KEY ("lastDetailsEditedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
