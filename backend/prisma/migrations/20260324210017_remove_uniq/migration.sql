-- DropIndex
DROP INDEX "public"."StudyRoom_slug_key";

-- CreateIndex
CREATE INDEX "StudyRoom_slug_idx" ON "StudyRoom"("slug");
