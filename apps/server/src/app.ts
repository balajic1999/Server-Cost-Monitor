import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { authRouter } from "./modules/auth/auth.routes";
import { projectRouter } from "./modules/projects/project.routes";
import { cloudAccountRouter } from "./modules/cloud-accounts/cloud-account.routes";
import { costRouter } from "./modules/aws/aws-cost.routes";
import { alertRouter } from "./modules/alerts/alert.routes";
import { stripeRouter } from "./modules/stripe/stripe.routes";
import { activityRouter } from "./modules/activity/activity.routes";
import { docsRouter } from "./lib/swagger";
import { prisma } from "./lib/prisma";
import { requestIdMiddleware } from "./middleware/request-id.middleware";
import { errorHandler } from "./middleware/error-handler.middleware";
import { env } from "./config/env";

export const app = express();

// Trust first proxy (required for correct rate limiting behind Nginx / load balancers)
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(requestIdMiddleware);

// Stripe webhook needs raw body BEFORE json parsing
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "1mb" }));
import { apiRateLimiter } from "./middleware/rate-limiter.middleware";

// ... existing code ...
app.use(express.json({ limit: "1mb" }));
app.use("/api", apiRateLimiter);

app.get("/health", async (_req, res) => {
  let dbStatus = "connected";
  try { await prisma.$queryRaw`SELECT 1`; } catch { dbStatus = "disconnected"; }

  if (env.NODE_ENV === "production") {
    return res.json({ status: dbStatus === "connected" ? "ok" : "error" });
  }

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
app.use("/api/docs", docsRouter);

// Global error handler (must be LAST middleware)
app.use(errorHandler);

