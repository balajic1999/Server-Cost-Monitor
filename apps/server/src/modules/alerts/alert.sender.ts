import nodemailer from "nodemailer";
import { env } from "../../config/env";

interface AlertEmailPayload {
  to: string;
  userName: string;
  projectName: string;
  reason: string;
  payload: Record<string, any>;
}

/**
 * Send alert notification email.
 * In development, uses Ethereal (fake SMTP) if no SMTP is configured.
 */
export async function sendAlertEmail(data: AlertEmailPayload): Promise<void> {
  const transporter = await getTransporter();

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">⚡ CloudPulse Alert</h1>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <p style="color: #334155; margin-top: 0;">Hi ${data.userName},</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #991b1b; font-weight: 600; margin: 0;">${data.reason}</p>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          <strong>Project:</strong> ${data.projectName}
        </p>
        ${data.payload.type === "daily_budget" ? `
          <p style="color: #64748b; font-size: 14px;">Today's spend: <strong>$${data.payload.todaySpend?.toFixed(2)}</strong> / Budget: <strong>$${data.payload.budget?.toFixed(2)}</strong></p>
        ` : ""}
        ${data.payload.type === "monthly_budget" ? `
          <p style="color: #64748b; font-size: 14px;">This month: <strong>$${data.payload.monthSpend?.toFixed(2)}</strong> / Budget: <strong>$${data.payload.budget?.toFixed(2)}</strong></p>
        ` : ""}
        ${data.payload.type === "spike" ? `
          <p style="color: #64748b; font-size: 14px;">Today: <strong>$${data.payload.todaySpend?.toFixed(2)}</strong> / 7-day avg: <strong>$${data.payload.dailyAvg?.toFixed(2)}</strong> (${data.payload.pctIncrease}% increase)</p>
        ` : ""}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">
          This alert was sent by CloudPulse. Manage your alert rules in the dashboard.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: env.SMTP_FROM ?? "CloudPulse <alerts@cloudpulse.dev>",
    to: data.to,
    subject: `⚡ CloudPulse Alert: ${data.projectName}`,
    html,
  });
}

/* ─── Slack Notifications ──────────────────────────────── */

interface SlackAlertPayload {
  webhookUrl: string;
  projectName: string;
  reason: string;
  payload: Record<string, any>;
}

/**
 * Send alert notification to a Slack channel via webhook.
 * Uses Slack Block Kit for rich formatting.
 */
export async function sendSlackAlert(data: SlackAlertPayload): Promise<void> {
  // Build detail text based on alert type
  let detail = "";
  switch (data.payload.type) {
    case "daily_budget":
      detail = `Today's spend: *$${Number(data.payload.todaySpend).toFixed(2)}* / Budget: *$${Number(data.payload.budget).toFixed(2)}*`;
      break;
    case "monthly_budget":
      detail = `This month: *$${Number(data.payload.monthSpend).toFixed(2)}* / Budget: *$${Number(data.payload.budget).toFixed(2)}*`;
      break;
    case "forecast_warning":
      detail = `Forecast: *$${Number(data.payload.forecast).toFixed(2)}* / Budget: *$${Number(data.payload.budget).toFixed(2)}*`;
      break;
    case "spike":
      detail = `Today: *$${Number(data.payload.todaySpend).toFixed(2)}* / 7-day avg: *$${Number(data.payload.dailyAvg).toFixed(2)}* (${data.payload.pctIncrease}% increase)`;
      break;
  }

  const slackMessage = {
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "⚡ CloudPulse Alert", emoji: true },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Project:*\n${data.projectName}` },
          { type: "mrkdwn", text: `*Alert Type:*\n${data.payload.type?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? "Alert"}` },
        ],
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `🚨 *${data.reason}*` },
      },
      ...(detail
        ? [
          {
            type: "section",
            text: { type: "mrkdwn", text: detail },
          },
        ]
        : []),
      { type: "divider" },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: "Sent by CloudPulse · Manage alerts in your dashboard" },
        ],
      },
    ],
  };

  const response = await fetch(data.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(slackMessage),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[Alert] Slack webhook failed (${response.status}): ${text}`);
    throw new Error(`Slack webhook failed: ${response.status}`);
  }

  console.log(`[Alert] Slack notification sent to ${data.projectName}`);
}

/**
 * Get or create email transporter.
 * Falls back to Ethereal test account in development.
 */
async function getTransporter() {
  if (env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER ?? "",
        pass: env.SMTP_PASS ?? "",
      },
    });
  }

  // Development fallback: Ethereal fake SMTP
  const testAccount = await nodemailer.createTestAccount();
  const transport = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log("[Alert] Using Ethereal test email. Preview at https://ethereal.email");
  return transport;
}

