/**
 * QA / dev seed for UI testing — targets balajibabuc3@gmail.com
 *
 * Run from repo root (requires DATABASE_URL in .env):
 *   npm run db:seed --workspace @cloudpulse/db
 *
 * - Creates user if missing (password: CloudPulseQA1!)
 * - PRO subscription
 * - Project "Multi-cloud Demo" with AWS + GCP + Azure accounts (fake credentials not required for UI)
 * - ~14 days of cost records per provider (realistic service names)
 * - Budget alert rule + sample sent alerts
 */
import { PrismaClient, CloudProvider, AlertChannel } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const QA_EMAIL = "balajibabuc3@gmail.com";
const QA_PASSWORD = "CloudPulseQA1!";
const SALT_ROUNDS = 12;

const PROJECT_NAME = "Multi-cloud Demo";

const PROVIDER_SERVICES: Record<CloudProvider, { name: string; baseDaily: number }[]> = {
  AWS: [
    { name: "Amazon EC2", baseDaily: 4.2 },
    { name: "Amazon S3", baseDaily: 0.95 },
    { name: "Amazon RDS", baseDaily: 3.8 },
    { name: "AWS Lambda", baseDaily: 0.45 },
    { name: "Amazon CloudWatch", baseDaily: 0.28 },
  ],
  GCP: [
    { name: "Compute Engine", baseDaily: 3.6 },
    { name: "Cloud Storage", baseDaily: 0.72 },
    { name: "BigQuery", baseDaily: 1.85 },
    { name: "Cloud SQL", baseDaily: 2.1 },
    { name: "Cloud Logging", baseDaily: 0.22 },
  ],
  AZURE: [
    { name: "Virtual Machines", baseDaily: 3.9 },
    { name: "Storage", baseDaily: 0.68 },
    { name: "Azure SQL Database", baseDaily: 2.55 },
    { name: "Bandwidth", baseDaily: 0.4 },
    { name: "Azure Monitor", baseDaily: 0.19 },
  ],
};

function dayBoundsUTC(d: Date): { start: Date; end: Date } {
  const y = d.toISOString().split("T")[0];
  return {
    start: new Date(`${y}T00:00:00.000Z`),
    end: new Date(`${y}T23:59:59.999Z`),
  };
}

async function main() {
  let user = await prisma.user.findUnique({ where: { email: QA_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: QA_EMAIL,
        name: "Balaji QA",
        passwordHash: await bcrypt.hash(QA_PASSWORD, SALT_ROUNDS),
      },
    });
    console.log(`✅ Created user ${QA_EMAIL} (password: ${QA_PASSWORD})`);
  } else {
    console.log(`✅ Found user: ${user.name} (${user.id})`);
  }

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: { plan: "PRO", status: "ACTIVE" },
    create: {
      userId: user.id,
      stripeCustomerId: `cus_seed_${user.id.replace(/[^a-z0-9]/gi, "").slice(0, 20)}`,
      plan: "PRO",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
    },
  });
  console.log("✅ Subscription: PRO / ACTIVE");

  const slug = user.id.slice(0, 8);
  let project = await prisma.project.findFirst({
    where: { userId: user.id, name: PROJECT_NAME },
  });
  if (!project) {
    project = await prisma.project.create({
      data: { userId: user.id, name: PROJECT_NAME, timezone: "UTC" },
    });
    console.log(`✅ Created project "${PROJECT_NAME}" (${project.id})`);
  } else {
    console.log(`ℹ️  Project "${PROJECT_NAME}" already exists (${project.id})`);
  }

  const accountDefs: { provider: CloudProvider; label: string; externalAccountId: string }[] = [
    { provider: "AWS", label: "AWS · Demo org", externalAccountId: `${slug}-aws-demo` },
    { provider: "GCP", label: "GCP · Demo project", externalAccountId: `${slug}-gcp-demo` },
    { provider: "AZURE", label: "Azure · Demo subscription", externalAccountId: `${slug}-azure-demo` },
  ];

  const accounts: { id: string; provider: CloudProvider }[] = [];

  for (const def of accountDefs) {
    const existing = await prisma.cloudAccount.findFirst({
      where: { projectId: project.id, provider: def.provider },
    });
    if (existing) {
      accounts.push({ id: existing.id, provider: existing.provider });
      console.log(`ℹ️  ${def.provider} account already linked (${existing.id})`);
      continue;
    }
    try {
      const acc = await prisma.cloudAccount.create({
        data: {
          userId: user.id,
          projectId: project.id,
          provider: def.provider,
          accountLabel: def.label,
          externalAccountId: def.externalAccountId,
          isActive: true,
        },
      });
      accounts.push({ id: acc.id, provider: acc.provider });
      console.log(`✅ Created ${def.provider} account (${acc.id})`);
    } catch (e) {
      const fallback = await prisma.cloudAccount.findFirst({
        where: { provider: def.provider, externalAccountId: def.externalAccountId },
      });
      if (fallback && fallback.projectId === project.id) {
        accounts.push({ id: fallback.id, provider: fallback.provider });
        console.log(`ℹ️  Reused ${def.provider} account (${fallback.id})`);
      } else {
        throw e;
      }
    }
  }

  const today = new Date();
  let recordCount = 0;

  for (const { id: cloudAccountId, provider } of accounts) {
    const services = PROVIDER_SERVICES[provider];
    for (let d = 14; d >= 0; d--) {
      const date = new Date(today.getTime() - d * 86400000);
      const { start: periodStart, end: periodEnd } = dayBoundsUTC(date);
      const dayOfWeek = periodStart.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      for (const svc of services) {
        const variation = 0.75 + Math.random() * 0.5;
        const weekendFactor = isWeekend ? 0.82 : 1;
        const amount = svc.baseDaily * variation * weekendFactor;

        await prisma.costRecord.upsert({
          where: {
            cloudAccountId_serviceName_periodStart_periodEnd: {
              cloudAccountId,
              serviceName: svc.name,
              periodStart,
              periodEnd,
            },
          },
          update: { amount },
          create: {
            projectId: project.id,
            cloudAccountId,
            serviceName: svc.name,
            currency: "USD",
            amount,
            periodStart,
            periodEnd,
            granularity: "DAILY",
          },
        });
        recordCount++;
      }
    }
  }
  console.log(`✅ Upserted ${recordCount} cost records (14 days × services × providers)`);

  let rule = await prisma.alertRule.findFirst({ where: { projectId: project.id } });
  if (!rule) {
    rule = await prisma.alertRule.create({
      data: {
        projectId: project.id,
        dailyBudget: 22,
        monthlyBudget: 650,
        spikeThresholdPct: 40,
        emailEnabled: true,
      },
    });
    console.log(`✅ Created alert rule (${rule.id})`);
  } else {
    await prisma.alertRule.update({
      where: { id: rule.id },
      data: {
        dailyBudget: 22,
        monthlyBudget: 650,
        spikeThresholdPct: 40,
        emailEnabled: true,
      },
    });
    console.log(`ℹ️  Updated alert rule (${rule.id})`);
  }

  const existingAlertCount = await prisma.alertSent.count({
    where: { projectId: project.id, userId: user.id },
  });

  const samples: { reason: string; payload: object; daysAgo: number }[] = [
    {
      reason: "Daily spend exceeded 80% of daily budget",
      payload: { spend: 18.4, budget: 22, currency: "USD" },
      daysAgo: 1,
    },
    {
      reason: "Monthly forecast above monthly budget threshold",
      payload: { forecast: 702.5, budget: 650, currency: "USD" },
      daysAgo: 3,
    },
    {
      reason: "Spike detected: 7-day average +45%",
      payload: { service: "Amazon EC2", pctAbove: 45 },
      daysAgo: 5,
    },
  ];

  const toAdd = Math.min(samples.length, Math.max(0, 3 - existingAlertCount));
  for (let i = 0; i < toAdd; i++) {
    const s = samples[i];
    await prisma.alertSent.create({
      data: {
        userId: user.id,
        projectId: project.id,
        alertRuleId: rule.id,
        channel: AlertChannel.EMAIL,
        reason: s.reason,
        payload: s.payload,
        sentAt: new Date(Date.now() - s.daysAgo * 86400000),
      },
    });
  }
  if (toAdd > 0) {
    console.log(`✅ Added ${toAdd} sample alert(s) (${existingAlertCount} existed)`);
  } else {
    console.log("ℹ️  Sample alerts already present (≥3 for this project)");
  }

  console.log("\n🎉 Seed complete for QA / dev UI");
  console.log(`   Login: ${QA_EMAIL} / ${QA_PASSWORD}`);
  console.log(`   Project: ${PROJECT_NAME}`);
  console.log(`   Cloud accounts: ${accounts.length} (AWS, GCP, Azure)`);
  console.log(`   Cost records: ${recordCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
