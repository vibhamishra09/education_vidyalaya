DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'StudyRoomParticipantRole'
  ) THEN
    CREATE TYPE "StudyRoomParticipantRole" AS ENUM ('PARTICIPANT', 'COHOST');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ExternalInviteRole'
  ) THEN
    CREATE TYPE "ExternalInviteRole" AS ENUM ('PARTICIPANT', 'COHOST');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'ExternalJoinRequestStatus'
  ) THEN
    CREATE TYPE "ExternalJoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

ALTER TABLE "StudyRoom"
  ADD COLUMN IF NOT EXISTS "allowExternalUsers" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "externalPasscode" TEXT,
  ADD COLUMN IF NOT EXISTS "externalAutoAccept" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "StudyRoomParticipant"
  ADD COLUMN IF NOT EXISTS "role" "StudyRoomParticipantRole" NOT NULL DEFAULT 'PARTICIPANT';

CREATE TABLE IF NOT EXISTS "StudyRoomExternalInvite" (
  "id" TEXT NOT NULL,
  "studyRoomId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "ExternalInviteRole" NOT NULL DEFAULT 'PARTICIPANT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudyRoomExternalInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudyRoomExternalJoinRequest" (
  "id" TEXT NOT NULL,
  "studyRoomId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" "ExternalJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "decidedAt" TIMESTAMP(3),
  "decidedBy" TEXT,
  CONSTRAINT "StudyRoomExternalJoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudyRoomGuestParticipant" (
  "id" TEXT NOT NULL,
  "studyRoomId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "StudyRoomParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
  "livekitIdentity" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedBy" TEXT,
  CONSTRAINT "StudyRoomGuestParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudyRoomGuestAccessToken" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "studyRoomId" TEXT NOT NULL,
  "guestParticipantId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt" TIMESTAMP(3),
  CONSTRAINT "StudyRoomGuestAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudyRoomExternalInvite_studyRoomId_email_key"
ON "StudyRoomExternalInvite"("studyRoomId", "email");
CREATE INDEX IF NOT EXISTS "StudyRoomExternalInvite_studyRoomId_idx"
ON "StudyRoomExternalInvite"("studyRoomId");

CREATE INDEX IF NOT EXISTS "StudyRoomExternalJoinRequest_studyRoomId_status_idx"
ON "StudyRoomExternalJoinRequest"("studyRoomId", "status");
CREATE INDEX IF NOT EXISTS "StudyRoomExternalJoinRequest_email_idx"
ON "StudyRoomExternalJoinRequest"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "StudyRoomGuestParticipant_studyRoomId_email_key"
ON "StudyRoomGuestParticipant"("studyRoomId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "StudyRoomGuestParticipant_livekitIdentity_key"
ON "StudyRoomGuestParticipant"("livekitIdentity");
CREATE INDEX IF NOT EXISTS "StudyRoomGuestParticipant_studyRoomId_idx"
ON "StudyRoomGuestParticipant"("studyRoomId");

CREATE UNIQUE INDEX IF NOT EXISTS "StudyRoomGuestAccessToken_token_key"
ON "StudyRoomGuestAccessToken"("token");
CREATE INDEX IF NOT EXISTS "StudyRoomGuestAccessToken_studyRoomId_idx"
ON "StudyRoomGuestAccessToken"("studyRoomId");
CREATE INDEX IF NOT EXISTS "StudyRoomGuestAccessToken_guestParticipantId_idx"
ON "StudyRoomGuestAccessToken"("guestParticipantId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyRoomExternalInvite_studyRoomId_fkey'
  ) THEN
    ALTER TABLE "StudyRoomExternalInvite"
      ADD CONSTRAINT "StudyRoomExternalInvite_studyRoomId_fkey"
      FOREIGN KEY ("studyRoomId") REFERENCES "StudyRoom"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyRoomExternalJoinRequest_studyRoomId_fkey'
  ) THEN
    ALTER TABLE "StudyRoomExternalJoinRequest"
      ADD CONSTRAINT "StudyRoomExternalJoinRequest_studyRoomId_fkey"
      FOREIGN KEY ("studyRoomId") REFERENCES "StudyRoom"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyRoomGuestParticipant_studyRoomId_fkey'
  ) THEN
    ALTER TABLE "StudyRoomGuestParticipant"
      ADD CONSTRAINT "StudyRoomGuestParticipant_studyRoomId_fkey"
      FOREIGN KEY ("studyRoomId") REFERENCES "StudyRoom"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyRoomGuestAccessToken_studyRoomId_fkey'
  ) THEN
    ALTER TABLE "StudyRoomGuestAccessToken"
      ADD CONSTRAINT "StudyRoomGuestAccessToken_studyRoomId_fkey"
      FOREIGN KEY ("studyRoomId") REFERENCES "StudyRoom"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StudyRoomGuestAccessToken_guestParticipantId_fkey'
  ) THEN
    ALTER TABLE "StudyRoomGuestAccessToken"
      ADD CONSTRAINT "StudyRoomGuestAccessToken_guestParticipantId_fkey"
      FOREIGN KEY ("guestParticipantId") REFERENCES "StudyRoomGuestParticipant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
