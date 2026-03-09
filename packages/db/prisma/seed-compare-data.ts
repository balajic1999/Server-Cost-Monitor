/**
 * Seed script: Add dummy cost data for BOTH projects (QA + dev)
 * with current-month data so the compare page shows real values.
 *
 * Run: npx dotenv -e ../../../.env -- tsx prisma/seed-compare-data.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    // 1. Find user
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error("❌ No user found in the database");
        process.exit(1);
    }
    console.log(`✅ Found user: ${user.name} (${user.id})`);

    // 2. Find all projects
    const projects = await prisma.project.findMany({
        where: { userId: user.id },
        include: { cloudAccounts: true },
    });
    if (projects.length < 2) {
        console.error("❌ Need at least 2 projects. Found:", projects.length);
        process.exit(1);
    }
    console.log(`✅ Found ${projects.length} projects: ${projects.map(p => p.name).join(", ")}`);

    // Service definitions – different profiles per project
    const serviceProfiles: Record<string, { name: string; baseDaily: number }[]> = {};

    // QA-like project (higher RDS/EC2 spend)
    serviceProfiles[projects[0].name] = [
        { name: "Amazon RDS", baseDaily: 4.50 },
        { name: "Amazon EC2", baseDaily: 3.80 },
        { name: "Amazon ECS", baseDaily: 2.80 },
        { name: "Amazon DynamoDB", baseDaily: 1.20 },
        { name: "Amazon S3", baseDaily: 0.90 },
        { name: "AWS Lambda", baseDaily: 0.65 },
        { name: "Amazon CloudWatch", baseDaily: 0.40 },
        { name: "AWS CloudTrail", baseDaily: 0.18 },
    ];

    // dev-like project (lower overall, more Lambda/ECS)
    serviceProfiles[projects[1].name] = [
        { name: "Amazon EC2", baseDaily: 2.10 },
        { name: "Amazon ECS", baseDaily: 1.90 },
        { name: "AWS Lambda", baseDaily: 1.50 },
        { name: "Amazon RDS", baseDaily: 1.30 },
        { name: "Amazon S3", baseDaily: 0.70 },
        { name: "Amazon DynamoDB", baseDaily: 0.45 },
        { name: "Amazon CloudWatch", baseDaily: 0.30 },
        { name: "AWS CloudTrail", baseDaily: 0.12 },
    ];

    // Any additional projects get a generic profile
    for (let i = 2; i < projects.length; i++) {
        serviceProfiles[projects[i].name] = [
            { name: "Amazon EC2", baseDaily: 2.00 + Math.random() * 2 },
            { name: "Amazon S3", baseDaily: 0.50 + Math.random() },
            { name: "AWS Lambda", baseDaily: 0.40 + Math.random() },
            { name: "Amazon RDS", baseDaily: 1.00 + Math.random() * 2 },
            { name: "Amazon CloudWatch", baseDaily: 0.20 + Math.random() * 0.3 },
        ];
    }

    const today = new Date();

    for (const project of projects) {
        console.log(`\n📁 Processing project: ${project.name}`);

        // Ensure at least one cloud account
        let account = project.cloudAccounts[0];
        if (!account) {
            console.log(`  ⚠️  No cloud account found, skipping`);
            continue;
        }
        console.log(`  Cloud account: ${account.accountLabel} (${account.id})`);

        const services = serviceProfiles[project.name] || serviceProfiles[projects[0].name];
        let recordCount = 0;

        // Generate 45 days of data (covers more than a month for trend analysis)
        for (let d = 44; d >= 0; d--) {
            const date = new Date(today.getTime() - d * 86400000);
            const dateStr = date.toISOString().split("T")[0];
            const periodStart = new Date(dateStr + "T00:00:00Z");
            const periodEnd = new Date(dateStr + "T23:59:59Z");

            for (const svc of services) {
                // Realistic cost variation
                const dayOfWeek = periodStart.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const variation = 0.65 + Math.random() * 0.7; // 0.65 to 1.35
                const weekendFactor = isWeekend ? 0.75 : 1.0;

                // Add occasional spikes (5% chance of 2-3x spike)
                const spikeChance = Math.random();
                const spikeFactor = spikeChance > 0.95 ? 2.0 + Math.random() : 1.0;

                const amount = parseFloat(
                    (svc.baseDaily * variation * weekendFactor * spikeFactor).toFixed(4)
                );

                try {
                    await prisma.costRecord.upsert({
                        where: {
                            cloudAccountId_serviceName_periodStart_periodEnd: {
                                cloudAccountId: account.id,
                                serviceName: svc.name,
                                periodStart,
                                periodEnd,
                            },
                        },
                        update: { amount },
                        create: {
                            projectId: project.id,
                            cloudAccountId: account.id,
                            serviceName: svc.name,
                            currency: "USD",
                            amount,
                            periodStart,
                            periodEnd,
                            granularity: "DAILY",
                        },
                    });
                    recordCount++;
                } catch {
                    // Skip duplicates
                }
            }
        }
        console.log(`  ✅ Upserted ${recordCount} cost records`);
    }

    // Summary
    const totalRecords = await prisma.costRecord.count();
    console.log(`\n🎉 Seed complete! Total cost records in DB: ${totalRecords}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
