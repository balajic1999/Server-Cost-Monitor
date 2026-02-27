import { prisma } from "../../lib/prisma";
import { getProjectCostSummary } from "../aws/aws-cost.service";
import { sendAlertEmail, sendSlackAlert } from "./alert.sender";

interface AlertTrigger {
    ruleId: string;
    reason: string;
    payload: Record<string, any>;
}

/**
 * Evaluate all alert rules for a project and send notifications if thresholds are exceeded.
 */
export async function evaluateAlerts(projectId: string): Promise<AlertTrigger[]> {
    const rules = await prisma.alertRule.findMany({ where: { projectId } });
    if (rules.length === 0) return [];

    const summary = await getProjectCostSummary(projectId);
    const triggers: AlertTrigger[] = [];

    for (const rule of rules) {
        // Daily budget check
        if (rule.dailyBudget) {
            const budget = Number(rule.dailyBudget);
            if (Number(summary.todaySpend) > budget) {
                triggers.push({
                    ruleId: rule.id,
                    reason: `Daily budget exceeded: $${Number(summary.todaySpend).toFixed(2)} > $${budget.toFixed(2)}`,
                    payload: { type: "daily_budget", todaySpend: Number(summary.todaySpend), budget },
                });
            }
        }

        // Monthly budget check
        if (rule.monthlyBudget) {
            const budget = Number(rule.monthlyBudget);
            if (Number(summary.monthSpend) > budget) {
                triggers.push({
                    ruleId: rule.id,
                    reason: `Monthly budget exceeded: $${Number(summary.monthSpend).toFixed(2)} > $${budget.toFixed(2)}`,
                    payload: { type: "monthly_budget", monthSpend: Number(summary.monthSpend), budget },
                });
            }

            // Monthly forecast warning (80% threshold)
            if (Number(summary.monthForecast) > budget * 0.8 && Number(summary.monthSpend) <= budget) {
                triggers.push({
                    ruleId: rule.id,
                    reason: `Monthly forecast warning: $${Number(summary.monthForecast).toFixed(2)} projected vs $${budget.toFixed(2)} budget`,
                    payload: { type: "forecast_warning", forecast: Number(summary.monthForecast), budget },
                });
            }
        }

        // Spike detection: compare today's spend to 7-day average
        if (rule.spikeThresholdPct) {
            const spikeResult = await detectSpike(projectId, rule.spikeThresholdPct);
            if (spikeResult) {
                triggers.push({
                    ruleId: rule.id,
                    reason: spikeResult.reason,
                    payload: { type: "spike", ...spikeResult },
                });
            }
        }
    }

    // Send notifications and record in AlertSent
    for (const trigger of triggers) {
        const rule = rules.find((r) => r.id === trigger.ruleId)!;
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { user: { select: { id: true, email: true, name: true } } },
        });

        if (!project) continue;

        // Deduplicate: don't send same alert type within 6 hours
        const recentAlert = await prisma.alertSent.findFirst({
            where: {
                alertRuleId: trigger.ruleId,
                reason: trigger.reason,
                sentAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
            },
        });
        if (recentAlert) continue;

        const channelsSent: string[] = [];

        // Send email if enabled
        if (rule.emailEnabled && project.user.email) {
            try {
                await sendAlertEmail({
                    to: project.user.email,
                    userName: project.user.name,
                    projectName: project.name,
                    reason: trigger.reason,
                    payload: trigger.payload,
                });
                channelsSent.push("EMAIL");
            } catch (err) {
                console.error(`[Alert] Email send failed: ${(err as Error).message}`);
            }
        }

        // Send Slack notification if webhook URL is configured
        if (rule.slackWebhookUrl) {
            try {
                await sendSlackAlert({
                    webhookUrl: rule.slackWebhookUrl,
                    projectName: project.name,
                    reason: trigger.reason,
                    payload: trigger.payload,
                });
                channelsSent.push("SLACK");
            } catch (err) {
                console.error(`[Alert] Slack send failed: ${(err as Error).message}`);
            }
        }

        // Record each channel as a separate AlertSent entry
        for (const channel of channelsSent) {
            await prisma.alertSent.create({
                data: {
                    userId: project.user.id,
                    projectId,
                    alertRuleId: trigger.ruleId,
                    channel: channel as "EMAIL" | "SLACK",
                    reason: trigger.reason,
                    payload: trigger.payload,
                },
            });
        }
    }

    return triggers;
}

/**
 * Detect cost spikes by comparing today's spend to the 7-day daily average.
 */
async function detectSpike(projectId: string, thresholdPct: number) {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    const [todayResult, weekResult] = await Promise.all([
        prisma.costRecord.aggregate({
            where: {
                cloudAccount: { projectId },
                periodStart: { gte: new Date(todayStr) },
            },
            _sum: { amount: true },
        }),
        prisma.costRecord.aggregate({
            where: {
                cloudAccount: { projectId },
                periodStart: { gte: new Date(sevenDaysAgo), lt: new Date(todayStr) },
            },
            _sum: { amount: true },
        }),
    ]);

    const todaySpend = Number(todayResult._sum.amount ?? 0);
    const weekTotal = Number(weekResult._sum.amount ?? 0);
    const dailyAvg = weekTotal / 7;

    if (dailyAvg <= 0) return null;

    const pctIncrease = ((todaySpend - dailyAvg) / dailyAvg) * 100;

    if (pctIncrease >= thresholdPct) {
        return {
            reason: `Spend spike detected: ${pctIncrease.toFixed(0)}% above 7-day average ($${todaySpend.toFixed(2)} vs avg $${dailyAvg.toFixed(2)})`,
            todaySpend,
            dailyAvg,
            pctIncrease: Math.round(pctIncrease),
        };
    }

    return null;
}
