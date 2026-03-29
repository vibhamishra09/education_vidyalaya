-- CreateEnum
CREATE TYPE "StudyRoomSessionMode" AS ENUM ('STANDARD', 'WEBINAR');

-- AlterTable
ALTER TABLE "StudyRoom" ADD COLUMN     "sessionMode" "StudyRoomSessionMode" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "webinarConfig" JSONB,
ADD COLUMN     "webinarRegistrationSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StudyRoom_webinarRegistrationSlug_key" ON "StudyRoom"("webinarRegistrationSlug");

-- CreateTable
CREATE TABLE "WebinarRegistration" (
    "id" TEXT NOT NULL,
    "studyRoomId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "responses" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebinarRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebinarRegistration_studyRoomId_email_key" ON "WebinarRegistration"("studyRoomId", "email");

-- CreateIndex
CREATE INDEX "WebinarRegistration_studyRoomId_idx" ON "WebinarRegistration"("studyRoomId");

-- AddForeignKey
ALTER TABLE "WebinarRegistration" ADD CONSTRAINT "WebinarRegistration_studyRoomId_fkey" FOREIGN KEY ("studyRoomId") REFERENCES "StudyRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
