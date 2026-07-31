-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "closeReason" TEXT,
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedBy" TEXT;
