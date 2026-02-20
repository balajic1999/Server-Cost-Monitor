import { z } from "zod";

export const createAlertRuleSchema = z.object({
    projectId: z.string().min(1),
    dailyBudget: z.number().positive().optional(),
    monthlyBudget: z.number().positive().optional(),
    spikeThresholdPct: z.number().int().min(10).max(1000).optional(),
    emailEnabled: z.boolean().default(true),
    slackWebhookUrl: z.string().url().optional(),
}).refine(
    (d) => d.dailyBudget || d.monthlyBudget || d.spikeThresholdPct,
    { message: "At least one alert condition is required (dailyBudget, monthlyBudget, or spikeThresholdPct)" }
);

export const updateAlertRuleSchema = z.object({
    dailyBudget: z.number().positive().nullable().optional(),
    monthlyBudget: z.number().positive().nullable().optional(),
    spikeThresholdPct: z.number().int().min(10).max(1000).nullable().optional(),
    emailEnabled: z.boolean().optional(),
    slackWebhookUrl: z.string().url().nullable().optional(),
});

export type CreateAlertRuleInput = z.infer<typeof createAlertRuleSchema>;
export type UpdateAlertRuleInput = z.infer<typeof updateAlertRuleSchema>;
