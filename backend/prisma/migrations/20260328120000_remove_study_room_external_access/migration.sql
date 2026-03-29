-- Remove passcode-based external guest access (invites + join requests). Webinar guest participants remain.

DROP TABLE IF EXISTS "StudyRoomExternalJoinRequest";
DROP TABLE IF EXISTS "StudyRoomExternalInvite";

ALTER TABLE "StudyRoom" DROP COLUMN IF EXISTS "allowExternalUsers";
ALTER TABLE "StudyRoom" DROP COLUMN IF EXISTS "externalPasscode";
ALTER TABLE "StudyRoom" DROP COLUMN IF EXISTS "externalAutoAccept";

DROP TYPE IF EXISTS "ExternalJoinRequestStatus";
DROP TYPE IF EXISTS "ExternalInviteRole";
