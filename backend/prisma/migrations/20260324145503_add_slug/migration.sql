/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `StudyRoom` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "StudyRoom" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StudyRoom_slug_key" ON "StudyRoom"("slug");
