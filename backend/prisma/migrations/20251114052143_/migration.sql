/*
  Warnings:

  - A unique constraint covering the columns `[externalType,externalId]` on the table `Channel` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalType" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Channel_externalType_externalId_key" ON "Channel"("externalType", "externalId");
