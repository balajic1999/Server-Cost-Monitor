import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { authRouter } from "./modules/auth/auth.routes";
import { projectRouter } from "./modules/projects/project.routes";
import { cloudAccountRouter } from "./modules/cloud-accounts/cloud-account.routes";
import { costRouter } from "./modules/aws/aws-cost.routes";
import { alertRouter } from "./modules/alerts/alert.routes";
import { stripeRouter } from "./modules/stripe/stripe.routes";
import { activityRouter } from "./modules/activity/activity.routes";
import { prisma } from "./lib/prisma";

export const app = express();

app.use(helmet());
app.use(cors());

// Stripe webhook needs raw body BEFORE json parsing
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300
  })
);

app.get("/health", async (_req, res) => {
  let dbStatus = "connected";
  try { await prisma.$queryRaw`SELECT 1`; } catch { dbStatus = "disconnected"; }
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    db: dbStatus,
  });
});
app.use("/api/auth", authRouter);
app.use("/api/projects", projectRouter);
app.use("/api/cloud-accounts", cloudAccountRouter);
app.use("/api/costs", costRouter);
app.use("/api/alerts", alertRouter);
app.use("/api/stripe", stripeRouter);
app.use("/api/activity", activityRouter);

