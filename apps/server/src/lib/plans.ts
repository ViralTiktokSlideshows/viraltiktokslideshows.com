import prisma from "@viraltiktokslideshows/db";
import type { PlanTier, User } from "@viraltiktokslideshows/db";
import { env } from "@viraltiktokslideshows/env/server";

// Matches the three tiers advertised in apps/web/src/components/landing/
// pricing.tsx -- keep these in sync if pricing ever changes there.
export const PLAN_QUOTAS: Record<PlanTier, number> = {
  CREATOR: 20,
  PRO: 60,
  AGENCY: 200,
};

export const PLAN_LABELS: Record<PlanTier, string> = {
  CREATOR: "Creator",
  PRO: "Pro",
  AGENCY: "Agency",
};

// Maps a plan tier to its Dodo product id. Returns null (rather than
// throwing) when the corresponding env var isn't set yet -- subscriptions
// can go live tier-by-tier as each Dodo product gets created, without the
// other two blocking deploys. Callers surface this as a 501, not a crash.
export function productIdForPlanTier(tier: PlanTier): string | null {
  switch (tier) {
    case "CREATOR":
      return env.DODO_CREATOR_PRODUCT_ID ?? null;
    case "PRO":
      return env.DODO_PRO_PRODUCT_ID ?? null;
    case "AGENCY":
      return env.DODO_AGENCY_PRODUCT_ID ?? null;
  }
}

// The reverse lookup, used by the webhook handler to figure out which tier
// a subscription's product_id corresponds to.
export function planTierForProductId(productId: string): PlanTier | null {
  if (env.DODO_CREATOR_PRODUCT_ID && productId === env.DODO_CREATOR_PRODUCT_ID) return "CREATOR";
  if (env.DODO_PRO_PRODUCT_ID && productId === env.DODO_PRO_PRODUCT_ID) return "PRO";
  if (env.DODO_AGENCY_PRODUCT_ID && productId === env.DODO_AGENCY_PRODUCT_ID) return "AGENCY";
  return null;
}

export type PlanUsage = {
  tier: PlanTier;
  label: string;
  used: number;
  cap: number;
  periodEnd: Date | null;
};

// Null means "no active plan" -- callers (sidebar, the quota-aware
// checkout endpoint) treat that as "buy single unlocks only." Usage is
// computed by counting Purchase rows flagged includedInPlan that were
// created within the current billing period, rather than a separate
// counter on User that could drift out of sync with what was actually
// generated.
export async function getPlanUsage(user: User): Promise<PlanUsage | null> {
  if (!user.planTier || user.planStatus !== "ACTIVE" || !user.planPeriodStart) {
    return null;
  }

  const used = await prisma.purchase.count({
    where: {
      userId: user.id,
      includedInPlan: true,
      createdAt: { gte: user.planPeriodStart },
    },
  });

  return {
    tier: user.planTier,
    label: PLAN_LABELS[user.planTier],
    used,
    cap: PLAN_QUOTAS[user.planTier],
    periodEnd: user.planPeriodEnd,
  };
}
