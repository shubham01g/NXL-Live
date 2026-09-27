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
 * what checkout submits, so the customer and the invoice agree.
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

/* ------------------------------ adjustments ------------------------------- */

/** The subset of a promo code pricing needs — keeps this module free of the ops types. */
export interface PromoRule {
  code: string;
  type: "percent" | "flat" | "free-delivery" | "free-insurance";
  value: number;
  appliesTo: "all" | "cars" | "homes";
  status: "active" | "scheduled" | "expired" | "paused";
  expiresAt: number | null;
  uses: number;
  maxUses: number | null;
  minSpend?: Money;
  description: string;
}

export type PromoCheck = { ok: true; promo: PromoRule } | { ok: false; error: string };

/** Validate a code against a booking, with a reason when it does not apply. */
export function checkPromo(
  raw: string,
  promos: PromoRule[],
  listing: Listing,
  subtotal: Money,
  now = Date.now(),
): PromoCheck {
  const code = raw.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code." };
  const promo = promos.find((p) => p.code === code);
  if (!promo) return { ok: false, error: "That code isn't recognised." };
  if (promo.status === "paused") return { ok: false, error: "That code is paused right now." };
  if (promo.status === "scheduled") return { ok: false, error: "That code isn't live yet." };
  if (promo.status === "expired" || (promo.expiresAt !== null && promo.expiresAt < now)) {
    return { ok: false, error: "That code has expired." };
  }
  if (promo.maxUses !== null && promo.uses >= promo.maxUses) return { ok: false, error: "That code has been fully redeemed." };
  if (promo.appliesTo === "cars" && listing.kind !== "car") return { ok: false, error: "That code is for car rentals only." };
  if (promo.appliesTo === "homes" && listing.kind !== "home") return { ok: false, error: "That code is for estate stays only." };
  if (promo.minSpend && subtotal < promo.minSpend) {
    return { ok: false, error: `That code needs a booking of $${promo.minSpend.toLocaleString()} or more.` };
  }
  return { ok: true, promo };
}

export interface Settlement {
  /** The quote's lines plus any discount lines. */
  lineItems: QuoteLineItem[];
  /** Total after promo and points — the booking's value. */
  total: Money;
  promoDiscount: Money;
  pointsUsed: number;
  pointsValue: Money;
  walletApplied: Money;
  /** What the card is charged today. */
  cardCharge: Money;
  pointsEarned: number;
}

/**
 * Apply a promo, a points redemption and drive credit to a quote, in that
 * order — the order the prototype's Loyalty page promised ("stacks with
 * promo codes"). Credits and points never create a negative balance.
 */
export function settle(
  q: Quote,
  opts: {
    promo?: PromoRule | null;
    redeemPoints?: boolean;
    memberPoints?: number;
    enrolled?: boolean;
    walletCredits?: Money;
    useWallet?: boolean;
  },
): Settlement {
  const lines = [...q.lineItems];
  const charge = (key: string) => lines.find((l) => l.key === key && l.kind === "charge")?.amount ?? 0;
  let total = q.dueNow;

  let promoDiscount = 0;
  const promo = opts.promo;
  if (promo) {
    if (promo.type === "percent") promoDiscount = Math.round((charge("rental") * promo.value) / 100);
    else if (promo.type === "flat") promoDiscount = Math.min(promo.value, total);
    else if (promo.type === "free-delivery") promoDiscount = charge("delivery") + charge("pickup");
    else if (promo.type === "free-insurance") promoDiscount = charge("insurance");
    promoDiscount = Math.min(promoDiscount, total);
    if (promoDiscount > 0) {
      lines.push({ key: "promo", label: `Promo ${promo.code}`, amount: -promoDiscount, kind: "credit" });
      total -= promoDiscount;
    }
  }

  let pointsUsed = 0;
  let pointsValue = 0;
  if (opts.redeemPoints && opts.memberPoints) {
    const dollars = Math.min(redeemableDollars(opts.memberPoints), total);
    if (dollars > 0) {
      pointsValue = dollars;
      pointsUsed = dollars * 100;
      lines.push({ key: "points", label: `Level Rewards · ${pointsUsed.toLocaleString()} pts`, amount: -dollars, kind: "credit" });
      total -= dollars;
    }
  }

  const walletApplied = opts.useWallet ? Math.min(opts.walletCredits ?? 0, total) : 0;

  return {
    lineItems: lines,
    total,
    promoDiscount,
    pointsUsed,
    pointsValue,
    walletApplied,
    cardCharge: total - walletApplied,
    pointsEarned: pointsFor(total, opts.memberPoints ?? 0, opts.enrolled ?? false),
  };
}

/** Whole dollars a points balance is worth at checkout (100 pts = $1, 500 minimum). */
function redeemableDollars(points: number): number {
  if (points < 500) return 0;
  return Math.floor(points / 100);
}

/* ------------------------------ availability ------------------------------ */

export function overlaps(a: { start: number; end: number }, b: { start: number; end: number }) {
  return a.start < b.end && b.start < a.end;
}
