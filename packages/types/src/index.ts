export type JwtUser = {
  sub: string;
  email: string;
};

/**
 * Subscription tiers. Mirrors the Prisma enum at packages/db/prisma/schema.prisma.
 * Kept here so the web client can import it without depending on @prisma/client.
 */
export type SubscriptionPlan = "FREE" | "PRO" | "TEAM";
