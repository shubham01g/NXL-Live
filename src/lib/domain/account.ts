import { tierFor, nextTierAfter, tierProgress, redeemableValue } from "./loyalty";
import type { CardBrand, LoyaltyTier, MemberAccount, Money } from "./types";

/**
 * Everything the member dashboard derives from an account.
 *
 * Kept out of the components for the same reason pricing.ts is: the header
 * badge, the action-required banner, the notification bell and four different
 * section panels all need the same answers, and they must never disagree.
 */

/* ------------------------------ setup tasks ------------------------------ */

export type SetupSeverity = "required" | "recommended";

export interface SetupTask {
  id: "card" | "insurance" | "address" | "mfa";
  /** Clause used inside the banner sentence, e.g. "your payment card". */
  clause: string;
  /** Button label. */
  action: string;
  /** Panel copy. */
  detail: string;
  href: string;
  severity: SetupSeverity;
}

/**
 * What is still missing before this account can rent.
 *
 * Card and insurance are hard requirements — we cannot hold a deposit or put
 * a member in a car without them. Address and MFA are recommended: the first
 * is only needed for statements and delivery, the second is security hygiene.
 */
export function setupTasks(member: MemberAccount): SetupTask[] {
  const tasks: SetupTask[] = [];

  if (!member.card) {
    tasks.push({
      id: "card",
      clause: "your payment card",
      action: "Add card",
      detail: "The rental is charged to this card. The deposit is held at pickup, not now.",
      href: "/account/payment",
      severity: "required",
    });
  }

  if (!member.insurance) {
    tasks.push({
      id: "insurance",
      clause: "insurance",
      action: "Add insurance",
      detail: "Use your own policy, or take the NXL daily package at checkout.",
      href: "/account/insurance",
      severity: "required",
    });
  }

  if (!member.address) {
    tasks.push({
      id: "address",
      clause: "a billing address",
      action: "Add address",
      detail: "Used for statements and to coordinate delivery.",
      href: "/account/address",
      severity: "recommended",
    });
  }

  if (!member.security.mfaEnabled) {
    tasks.push({
      id: "mfa",
      clause: "two-factor authentication",
      action: "Enable MFA",
      detail: "Adds a one-time code to every sign-in on a new device.",
      href: "/account/security",
      severity: "recommended",
    });
  }

  return tasks;
}

export function requiredTasks(member: MemberAccount): SetupTask[] {
  return setupTasks(member).filter((t) => t.severity === "required");
}

/**
 * "your payment card and insurance" — the banner reads as a sentence rather
 * than a list, so the clauses are joined properly.
 */
export function joinClauses(tasks: SetupTask[]): string {
  const parts = tasks.map((t) => t.clause);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/* -------------------------------- wallet --------------------------------- */

/** The share of loaded credit still unspent, 0–1. No wallet reads as 0. */
export function creditsRemaining(member: MemberAccount): number {
  if (member.creditsLoaded <= 0) return 0;
  return Math.min(1, Math.max(0, member.credits / member.creditsLoaded));
}

/** The 20% threshold the product promises to alert on. */
export const LOW_BALANCE_THRESHOLD = 0.2;

export function isLowBalance(member: MemberAccount): boolean {
  return member.creditsLoaded > 0 && creditsRemaining(member) <= LOW_BALANCE_THRESHOLD;
}

/* ----------------------------- notifications ----------------------------- */

export interface MemberNotification {
  id: string;
  title: string;
  body: string;
  href: string;
  tone: "warning" | "info";
}

/**
 * The bell's contents.
 *
 * Derived, never stored — so the count can never drift from the thing it is
 * counting. The prototype hard-coded a "1" badge over an empty feed.
 */
export function notificationsFor(member: MemberAccount): MemberNotification[] {
  const items: MemberNotification[] = [];

  for (const task of setupTasks(member)) {
    items.push({
      id: `setup-${task.id}`,
      title: task.action,
      body: task.detail,
      href: task.href,
      tone: task.severity === "required" ? "warning" : "info",
    });
  }

  if (isLowBalance(member)) {
    items.push({
      id: "wallet-low",
      title: "Drive credit is running low",
      body: `${Math.round(creditsRemaining(member) * 100)}% of your loaded credit is left. Top up whenever you like — nothing auto-bills.`,
      href: "/account/wallet",
      tone: "warning",
    });
  }

  return items;
}

/* --------------------------------- tier ---------------------------------- */

export interface TierStanding {
  tier: LoyaltyTier;
  next: LoyaltyTier | null;
  /** 0–1 toward the next tier. Platinum is 1. */
  progress: number;
  /** Points still needed for the next tier, or 0 at Platinum. */
  pointsToNext: number;
  /** Dollar value of the current balance at checkout. */
  redeemable: Money;
}

export function standingFor(member: MemberAccount): TierStanding {
  const tier = tierFor(member.points);
  const next = nextTierAfter(member.points);
  return {
    tier,
    next,
    progress: tierProgress(member.points),
    pointsToNext: next ? Math.max(0, next.min - member.points) : 0,
    redeemable: redeemableValue(member.points),
  };
}

/* -------------------------------- display -------------------------------- */

/** Up to two initials, for the avatar plate when there is no photo. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const CARD_BRANDS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
};

export function cardBrandLabel(brand: string): string {
  return CARD_BRANDS[brand] ?? brand;
}

/** "Visa ···· 4242" */
export function cardLabel(card: { brand: string; last4: string }): string {
  return `${cardBrandLabel(card.brand)} ···· ${card.last4}`;
}

export function cardExpiry(card: { expMonth: number; expYear: number }): string {
  return `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`;
}

/* ------------------------------ card parsing ----------------------------- */

/**
 * Brand from the leading digits.
 *
 * Enough to label the card correctly in the UI. Real validation (Luhn, BIN
 * ranges, 3DS) belongs to the payment processor at M5 — we never want to be
 * the thing that decides whether a card is good.
 */
export function detectCardBrand(digits: string): CardBrand {
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "mastercard";
  return "visa";
}

/** Strip everything that is not a digit, so paste-from-anywhere works. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Group a card number for display: "4242 4242 4242 4242". */
export function groupCardDigits(digits: string): string {
  return digits.replace(/(.{4})/g, "$1 ").trim();
}
