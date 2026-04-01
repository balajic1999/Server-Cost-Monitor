-- AlterEnum
ALTER TYPE "CloudProvider" ADD VALUE 'AZURE';

-- AlterTable
ALTER TABLE "CloudAccount" ADD COLUMN     "azureClientId" TEXT,
ADD COLUMN     "azureClientSecretEncrypted" TEXT,
ADD COLUMN     "azureSubscriptionId" TEXT,
ADD COLUMN     "azureTenantId" TEXT,
ADD COLUMN     "gcpKeyJsonEncrypted" TEXT;

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
