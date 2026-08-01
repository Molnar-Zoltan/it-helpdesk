-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "reopenReason" TEXT,
ADD COLUMN     "reopenedAt" TIMESTAMP(3),
ADD COLUMN     "reopenedBy" TEXT;
