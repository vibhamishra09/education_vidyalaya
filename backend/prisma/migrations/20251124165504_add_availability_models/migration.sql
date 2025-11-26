-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bufferTime" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "maxFutureBooking" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "minAdvanceTime" INTEGER NOT NULL DEFAULT 120;

-- CreateTable
CREATE TABLE "UserAvailability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedTimeSlot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockedTimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAvailability_userId_idx" ON "UserAvailability"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAvailability_userId_dayOfWeek_key" ON "UserAvailability"("userId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "BlockedTimeSlot_userId_idx" ON "BlockedTimeSlot"("userId");

-- CreateIndex
CREATE INDEX "BlockedTimeSlot_startTime_endTime_idx" ON "BlockedTimeSlot"("startTime", "endTime");

-- AddForeignKey
ALTER TABLE "UserAvailability" ADD CONSTRAINT "UserAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockedTimeSlot" ADD CONSTRAINT "BlockedTimeSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
