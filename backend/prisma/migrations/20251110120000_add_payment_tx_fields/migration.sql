-- Add transactionHash and network columns to Payment table
ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "transactionHash" TEXT,
ADD COLUMN IF NOT EXISTS "network" TEXT;


