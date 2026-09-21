import type { LoyaltyTier, TierName } from "./types";

/**
 * Level Rewards.
 *
 * Thresholds and earn rates match the prototype's store.tsx TIERS table.
 * The prototype's ChatWidget quoted entirely different numbers (0/5k/15k/30k
 * and "1 point per dollar") — these are the correct ones, and JERALD now
 * reads from here so the two can never drift again.
 */
export const TIERS: readonly LoyaltyTier[] = [
  {
    name: "Bronze",
    min: 0,
    rate: 0.05,
    color: "var(--color-tier-bronze)",
    headline: "5% back in Level Credits",
    perks: [
      "5 pts per $100 spent",
      "Member-only pricing",
      "Booking history & receipts",
      "Email & SMS reminders",
    ],
  },
  {
    name: "Silver",
    min: 2_500,
    rate: 0.08,
    color: "var(--color-tier-silver)",
    headline: "Free delivery, priority queue",
    perks: [
      "8 pts per $100 spent",
      "Complimentary delivery & pickup",
      "Priority booking queue",
      "Early access to new listings",
    ],
  },
  {
    name: "Gold",
    min: 8_000,
    rate: 0.12,
    color: "var(--color-tier-gold)",
    headline: "Upgrades and a dedicated line",
    perks: [
      "12 pts per $100 spent",
      "Complimentary vehicle upgrade",
      "Dedicated Gold concierge line",
      "Exclusive member events",
    ],
  },
  {
    name: "Platinum",
    min: 20_000,
    rate: 0.18,
    color: "var(--color-tier-platinum)",
    headline: "24/7 concierge, zero blackouts",
    perks: [
      "18 pts per $100 spent",
      "Dedicated concierge, 24/7",
      "Private track-day invitations",
      "Complimentary driver in select markets",
      "Zero blackout dates",
    ],
  },
] as const;

/** Points redemption rules. Accrual exists in the prototype; redemption did not. */
export const REDEMPTION = {
  /** Points needed per $1 of credit. */
  pointsPerDollar: 100,
  /** Smallest redeemable balance. */
  minimumPoints: 500,
  /** Points expire this many months after they are earned. */
  validMonths: 24,
} as const;

/** The tier a points balance currently sits in. */
export function tierFor(points: number): LoyaltyTier {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (points >= tier.min) current = tier;
  }
  return current;
}

/** The next tier up, or null at Platinum. */
export function nextTierAfter(points: number): LoyaltyTier | null {
  return TIERS.find((t) => t.min > points) ?? null;
}

export function tierByName(name: TierName): LoyaltyTier {
  return TIERS.find((t) => t.name === name) ?? TIERS[0];
}

/** Points earned on a spend. Only enrolled members accrue. */
export function pointsFor(spend: number, points: number, enrolled: boolean): number {
  if (!enrolled) return 0;
  return Math.round(spend * tierFor(points).rate);
}

/** Dollar value of a points balance, respecting the minimum. */
export function redeemableValue(points: number): number {
  if (points < REDEMPTION.minimumPoints) return 0;
  return Math.floor(points / REDEMPTION.pointsPerDollar);
}

/** Progress toward the next tier, 0–1. Platinum is always 1. */
export function tierProgress(points: number): number {
  const current = tierFor(points);
  const next = nextTierAfter(points);
  if (!next) return 1;
  const span = next.min - current.min;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (points - current.min) / span));
}

/** Delivery and pickup are complimentary from Silver up. */
export function hasComplimentaryDelivery(points: number): boolean {
  return tierFor(points).min >= tierByName("Silver").min;
}
