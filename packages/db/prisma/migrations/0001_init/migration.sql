CREATE TYPE "CloudProvider" AS ENUM ('AWS', 'GCP');
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO', 'TEAM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');
CREATE TYPE "AlertChannel" AS ENUM ('EMAIL', 'SLACK');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Project" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "name")
);

CREATE TABLE "CloudAccount" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "provider" "CloudProvider" NOT NULL DEFAULT 'AWS',
  "accountLabel" TEXT NOT NULL,
  "externalAccountId" TEXT NOT NULL,
  "roleArn" TEXT,
  "accessKeyEncrypted" TEXT,
  "secretKeyEncrypted" TEXT,
  "encryptionKeyVersion" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("provider", "externalAccountId")
);

CREATE TABLE "CostRecord" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "cloudAccountId" TEXT NOT NULL REFERENCES "CloudAccount"("id") ON DELETE CASCADE,
  "serviceName" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "amount" DECIMAL(12,4) NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "granularity" TEXT NOT NULL DEFAULT 'HOURLY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("cloudAccountId", "serviceName", "periodStart", "periodEnd")
);

CREATE TABLE "AlertRule" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE,
  "dailyBudget" DECIMAL(12,2),
  "monthlyBudget" DECIMAL(12,2),
  "spikeThresholdPct" INTEGER,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "slackWebhookUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AlertSent" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "projectId" TEXT NOT NULL,
  "alertRuleId" TEXT REFERENCES "AlertRule"("id") ON DELETE SET NULL,
  "channel" "AlertChannel" NOT NULL,
  "reason" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Subscription" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "stripeCustomerId" TEXT NOT NULL UNIQUE,
  "stripeSubscriptionId" TEXT UNIQUE,
  "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "currentPeriodStart" TIMESTAMP(3),
  "currentPeriodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX "Project_userId_idx" ON "Project"("userId");
CREATE INDEX "CloudAccount_projectId_idx" ON "CloudAccount"("projectId");
CREATE INDEX "CloudAccount_userId_idx" ON "CloudAccount"("userId");
CREATE INDEX "CostRecord_projectId_periodStart_idx" ON "CostRecord"("projectId", "periodStart");
CREATE INDEX "CostRecord_cloudAccountId_periodStart_idx" ON "CostRecord"("cloudAccountId", "periodStart");
CREATE INDEX "AlertRule_projectId_idx" ON "AlertRule"("projectId");
CREATE INDEX "AlertSent_userId_sentAt_idx" ON "AlertSent"("userId", "sentAt");
CREATE INDEX "AlertSent_projectId_sentAt_idx" ON "AlertSent"("projectId", "sentAt");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
