/*
  Warnings:

  - You are about to alter the column `amountMade` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(36,16)`.
  - You are about to alter the column `amountReceived` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(36,16)`.
  - You are about to alter the column `amountRefunded` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(36,16)`.

*/
-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "amountMade" SET DATA TYPE DECIMAL(36,16),
ALTER COLUMN "amountReceived" SET DATA TYPE DECIMAL(36,16),
ALTER COLUMN "amountRefunded" SET DATA TYPE DECIMAL(36,16);

-- AlterTable
ALTER TABLE "StudyRoom" ALTER COLUMN "joiningFee" SET DEFAULT 0,
ALTER COLUMN "joiningFee" SET DATA TYPE DECIMAL(36,16);
