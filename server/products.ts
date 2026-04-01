/**
 * Stripe product and pricing configuration.
 * Price IDs must be created in the Stripe dashboard and set here.
 * In test mode, use the Stripe test price IDs.
 */

export const STRIPE_PRICES: Record<string, string> = {
  pro: process.env.STRIPE_PRICE_PRO ?? "price_pro_placeholder",
  agency: process.env.STRIPE_PRICE_AGENCY ?? "price_agency_placeholder",
};

export const PLAN_LIMITS = {
  free: {
    campaigns: 1,
    threadsPerMonth: 50,
    accounts: 2,
    schedulesPerCampaign: 0,
    label: "Free",
    price: 0,
    description: "1 campaign, 50 threads/mo, 2 accounts",
  },
  pro: {
    campaigns: 5,
    threadsPerMonth: -1, // unlimited
    accounts: 10,
    schedulesPerCampaign: 5,
    label: "Pro",
    price: 49,
    description: "5 campaigns, unlimited threads, 10 accounts, scheduling",
  },
  agency: {
    campaigns: -1, // unlimited
    threadsPerMonth: -1,
    accounts: -1,
    schedulesPerCampaign: -1,
    label: "Agency",
    price: 149,
    description: "Unlimited everything, white-label ready",
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;
