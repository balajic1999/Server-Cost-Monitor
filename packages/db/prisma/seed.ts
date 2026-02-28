// Seed script: Upgrade balaji to PRO + create QA project with sample data
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // 1. Find user
    const user = await prisma.user.findUnique({
        where: { email: "balajibabuc3@gmail.com" },
    });
    if (!user) {
        console.error("❌ User balajibabuc3@gmail.com not found");
        process.exit(1);
    }
    console.log(`✅ Found user: ${user.name} (${user.id})`);

    // 2. Upgrade to PRO subscription
    const sub = await prisma.subscription.upsert({
        where: { userId: user.id },
        update: { plan: "PRO", status: "ACTIVE" },
        create: {
            userId: user.id,
            stripeCustomerId: `cus_seed_${user.id.slice(0, 8)}`,
            plan: "PRO",
            status: "ACTIVE",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 86400000),  // 1 year
        },
    });
    console.log(`✅ Subscription upgraded to PRO (id: ${sub.id})`);

    // 3. Find existing Dev project to copy data pattern from
    const devProject = await prisma.project.findFirst({
        where: { userId: user.id },
        include: {
            cloudAccounts: { include: { costRecords: true } },
        },
    });

    // 4. Create QA project
    let qaProject;
    try {
        qaProject = await prisma.project.create({
            data: {
                userId: user.id,
                name: "QA",
                timezone: "UTC",
            },
        });
        console.log(`✅ Created QA project (id: ${qaProject.id})`);
    } catch (err) {
        // Unique constraint — project already exists
        qaProject = await prisma.project.findFirst({
            where: { userId: user.id, name: "QA" },
        });
        if (qaProject) {
            console.log(`ℹ️  QA project already exists (id: ${qaProject.id})`);
        } else {
            throw err;
        }
    }

    // 5. Create a cloud account for QA project
    let qaAccount;
    try {
        qaAccount = await prisma.cloudAccount.create({
            data: {
                userId: user.id,
                projectId: qaProject.id,
                provider: "AWS",
                accountLabel: "QA Environment",
                externalAccountId: "987654321098",
                isActive: true,
            },
        });
        console.log(`✅ Created QA cloud account (id: ${qaAccount.id})`);
    } catch (err) {
        qaAccount = await prisma.cloudAccount.findFirst({
            where: { projectId: qaProject.id },
        });
        if (qaAccount) {
            console.log(`ℹ️  QA cloud account already exists (id: ${qaAccount.id})`);
        } else {
            throw err;
        }
    }

    // 6. Generate sample cost data for the last 30 days
    const services = [
        { name: "Amazon EC2", baseDaily: 3.50 },
        { name: "Amazon S3", baseDaily: 0.80 },
        { name: "Amazon RDS", baseDaily: 4.20 },
        { name: "Amazon CloudWatch", baseDaily: 0.35 },
        { name: "AWS Lambda", baseDaily: 0.60 },
        { name: "Amazon DynamoDB", baseDaily: 1.10 },
        { name: "Amazon ECS", baseDaily: 2.40 },
        { name: "AWS CloudTrail", baseDaily: 0.15 },
    ];

    const today = new Date();
    let recordCount = 0;

    for (let d = 30; d >= 0; d--) {
        const date = new Date(today.getTime() - d * 86400000);
        const periodStart = new Date(date.toISOString().split("T")[0] + "T00:00:00Z");
        const periodEnd = new Date(date.toISOString().split("T")[0] + "T23:59:59Z");

        for (const svc of services) {
            // Add some realistic variation: ±30% random, weekends ~20% lower
            const dayOfWeek = periodStart.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const variation = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
            const weekendFactor = isWeekend ? 0.8 : 1.0;
            const amount = svc.baseDaily * variation * weekendFactor;

            try {
                await prisma.costRecord.upsert({
                    where: {
                        cloudAccountId_serviceName_periodStart_periodEnd: {
                            cloudAccountId: qaAccount.id,
                            serviceName: svc.name,
                            periodStart,
                            periodEnd,
                        },
                    },
                    update: { amount },
                    create: {
                        projectId: qaProject.id,
                        cloudAccountId: qaAccount.id,
                        serviceName: svc.name,
                        currency: "USD",
                        amount,
                        periodStart,
                        periodEnd,
                        granularity: "DAILY",
                    },
                });
                recordCount++;
            } catch (err) {
                // Skip duplicates
            }
        }
    }
    console.log(`✅ Upserted ${recordCount} cost records for QA project`);

    // 7. Create an alert rule for QA project
    try {
        await prisma.alertRule.create({
            data: {
                projectId: qaProject.id,
                dailyBudget: 15.00,
                monthlyBudget: 400.00,
                spikeThresholdPct: 50,
                emailEnabled: true,
            },
        });
        console.log("✅ Created alert rule for QA project");
    } catch {
        console.log("ℹ️  Alert rule may already exist");
    }

    console.log("\n🎉 Seed complete!");
    console.log(`   User: ${user.name} (${user.email})`);
    console.log(`   Plan: PRO`);
    console.log(`   QA Project: ${qaProject.id}`);
    console.log(`   Cost Records: ${recordCount}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
