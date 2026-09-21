import type {
  InsuranceChoice,
  Listing,
  Money,
  Quote,
  QuoteLineItem,
  RateUnit,
} from "./types";
import { isHome } from "./types";
import { hasComplimentaryDelivery, pointsFor } from "./loyalty";

/**
 * Pricing.
 *
 * One home for every number the customer sees. The prototype computed the
 * same figures three different ways — the Listing page geocoded a distance
 * while Quick Reserve charged a flat $150, and JERALD quoted $150–$250/day
 * insurance against a real rate of $49. All of it now routes through here.
 *
 * Pricing is flat rate-card. The prototype shipped a `demand` multiplier and
 * a surge ticker but neutered them (livePrice returned the rate unchanged)
 * while the UI still advertised "updates with demand". We keep the honest
 * version: the price you see is the price you pay.
 */

export const PRICING = {
  /** Refundable security deposit, held at pickup — never charged at booking. */
  defaultDeposit: 500 as Money,
  /** NXL coverage, per rental day. */
  insuranceDaily: 49 as Money,
  delivery: {
    fee: 150 as Money,
    pickupFee: 150 as Money,
    /** Miles from the South Beach depot covered by the base fee. */
    baseMiles: 10,
    extraPerMile: 3 as Money,
  },
} as const;

/* ---------------------------------- units --------------------------------- */

export const UNIT_ORDER: readonly RateUnit[] = ["hour", "day", "week", "month"];

const UNIT_LABELS: Record<RateUnit, { one: string; many: string; adverb: string }> = {
  hour: { one: "hour", many: "hours", adverb: "Hourly" },
  day: { one: "day", many: "days", adverb: "Daily" },
  week: { one: "week", many: "weeks", adverb: "Weekly" },
  month: { one: "month", many: "months", adverb: "Monthly" },
};

/** "3 days", "1 week" */
export function unitLabel(unit: RateUnit, qty: number): string {
  const l = UNIT_LABELS[unit];
  return `${qty} ${qty === 1 ? l.one : l.many}`;
}

/** "Hourly", "Daily" — for rate tabs. */
export function unitAdverb(unit: RateUnit): string {
  return UNIT_LABELS[unit].adverb;
}

/** "/hr", "/day" — for price suffixes. */
export function unitSuffix(unit: RateUnit): string {
  return unit === "hour" ? "/hr" : `/${UNIT_LABELS[unit].one}`;
}

/** Units a listing can actually be booked in, in ascending order. */
export function unitsFor(listing: Listing): RateUnit[] {
  return UNIT_ORDER.filter((u) => typeof listing.rates[u] === "number");
}

/** Cheapest entry point — cars lead with the hourly rate, estates with daily. */
export function leadUnit(listing: Listing): RateUnit {
  return unitsFor(listing)[0] ?? "day";
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** A rental window's length in ms. Months bill as a flat 30 days. */
export function durationMs(unit: RateUnit, qty: number): number {
  const per: Record<RateUnit, number> = {
    hour: HOUR_MS,
    day: DAY_MS,
    week: DAY_MS * 7,
    month: DAY_MS * 30,
  };
  return per[unit] * qty;
}

/** Billable days, used for per-day fees like insurance. Minimum one. */
export function billableDays(unit: RateUnit, qty: number): number {
  if (unit === "hour") return 1;
  return Math.max(1, Math.round(durationMs(unit, qty) / DAY_MS));
}

/* --------------------------------- pieces --------------------------------- */

export function rateFor(listing: Listing, unit: RateUnit): Money {
  return listing.rates[unit] ?? 0;
}

export function rentalSubtotal(listing: Listing, unit: RateUnit, qty: number): Money {
  return rateFor(listing, unit) * qty;
}

export function insuranceFee(
  choice: InsuranceChoice | null,
  unit: RateUnit,
  qty: number,
): Money {
  if (choice !== "nxl") return 0;
  return PRICING.insuranceDaily * billableDays(unit, qty);
}

/**
 * Delivery or pickup fee. Flat within the base radius, then per-mile beyond.
 * An undefined distance means the address has not been checked yet — quote base.
 */
export function distanceFee(base: Money, miles?: number): Money {
  if (miles === undefined) return base;
  const extra = Math.max(0, miles - PRICING.delivery.baseMiles);
  return base + Math.round(extra * PRICING.delivery.extraPerMile);
}

/* --------------------------------- quote ---------------------------------- */

export interface QuoteInput {
  listing: Listing;
  unit: RateUnit;
  qty: number;
  insurance?: InsuranceChoice | null;
  delivery?: { enabled: boolean; miles?: number };
  pickup?: { enabled: boolean; miles?: number };
  /** Points balance — drives both the earn rate and the Silver+ delivery perk. */
  memberPoints?: number;
  enrolled?: boolean;
}

/**
 * Build the full price breakdown. This is what the listing page renders and
 * what M2's checkout will submit, so the customer and the invoice agree.
 */
export function quote(input: QuoteInput): Quote {
  const {
    listing,
    unit,
    qty,
    insurance = null,
    delivery,
    pickup,
    memberPoints = 0,
    enrolled = false,
  } = input;

  const items: QuoteLineItem[] = [];
  const rate = rateFor(listing, unit);
  const rental = rentalSubtotal(listing, unit, qty);

  items.push({
    key: "rental",
    label: `$${rate.toLocaleString()} × ${unitLabel(unit, qty)}`,
    amount: rental,
    kind: "charge",
  });

  if (insurance === "nxl") {
    items.push({
      key: "insurance",
      label: `NXL coverage ($${PRICING.insuranceDaily}/day)`,
      amount: insuranceFee(insurance, unit, qty),
      kind: "charge",
    });
  } else if (insurance === "own") {
    items.push({
      key: "insurance",
      label: "Own policy on file",
      amount: 0,
      note: "No fee",
      kind: "info",
    });
  }

  if (isHome(listing) && listing.cleaningFee > 0) {
    items.push({
      key: "cleaning",
      label: "Cleaning fee",
      amount: listing.cleaningFee,
      note: "Non-refundable",
      kind: "charge",
    });
  }

  const complimentary = hasComplimentaryDelivery(memberPoints);

  if (delivery?.enabled) {
    items.push({
      key: "delivery",
      label: "Delivery",
      amount: complimentary ? 0 : distanceFee(PRICING.delivery.fee, delivery.miles),
      note: complimentary ? "Complimentary — Silver & above" : undefined,
      kind: complimentary ? "info" : "charge",
    });
  }

  if (pickup?.enabled) {
    items.push({
      key: "pickup",
      label: "Pickup",
      amount: complimentary
        ? 0
        : distanceFee(PRICING.delivery.pickupFee, pickup.miles),
      note: complimentary ? "Complimentary — Silver & above" : undefined,
      kind: complimentary ? "info" : "charge",
    });
  }

  const dueNow = items
    .filter((i) => i.kind === "charge")
    .reduce((sum, i) => sum + i.amount, 0);

  return {
    lineItems: items,
    dueNow,
    depositDue: listing.deposit || PRICING.defaultDeposit,
    pointsEarned: pointsFor(dueNow, memberPoints, enrolled),
  };
}
