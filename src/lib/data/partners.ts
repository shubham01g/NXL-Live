"use client";

import type { Partner } from "@/lib/domain/types";
import type { PartnerReferral, Payout, Reservation } from "@/lib/domain/operations";
import { referralsFor } from "./fixtures/operations";
import { C, logAudit, raiseAlert } from "./demo";
import { create, newId, patch, readValue, useDemoValue } from "./demo-store";

/**
 * Partner economics, shared by the admin Partners/Payouts consoles and the
 * partner portal so both read the same ledger.
 */

/** The platform default. The public page says "up to 12%" — top partners earn more. */
export const DEFAULT_COMMISSION = 10;

/** Historic referrals plus every live booking that came in on the partner's code. */
export function partnerLedger(partner: Partner, reservations: Reservation[]): PartnerReferral[] {
  const live: PartnerReferral[] = reservations
    .filter((r) => r.partnerCode === partner.code && r.status !== "cancelled")
    .map((r) => ({
      id: `ref-${r.id}`,
      partnerCode: partner.code,
      guest: r.guestName,
      reference: r.reference,
      listingName: r.listingName,
      at: r.createdAt,
      amount: r.total,
      commission: Math.round((r.total * partner.commission) / 100),
      status: r.status === "completed" ? "cleared" : "pending",
    }));
  return [...live, ...referralsFor(partner)].sort((a, b) => b.at - a.at);
}

/* ----------------------------- payout method ------------------------------ */

/**
 * How a partner wants to be paid. Set by the partner in their portal and read
 * by the back office. Only the last four of the account number are ever kept.
 */
export type PayoutMethod =
  | { kind: "ach"; accountName: string; bankName: string; accountType: "checking" | "savings"; routing: string; last4: string }
  | { kind: "check"; payableTo: string; address: string; city: string; state: string; zip: string };

export const payoutMethodKey = (partnerId: string) => `payout-method:${partnerId}`;
export const payoutNotesKey = (partnerId: string) => `payout-notes:${partnerId}`;

/** Values saved before Check by Mail existed were `{ kind: "ACH" | "Wire", bank, last4 }`. */
function normaliseMethod(raw: unknown): PayoutMethod | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, string>;
  if (m.kind === "ach" || m.kind === "check") return raw as PayoutMethod;
  if (m.kind === "ACH" || m.kind === "Wire") {
    return { kind: "ach", accountName: "", bankName: m.bank ?? "", accountType: "checking", routing: "", last4: m.last4 ?? "" };
  }
  return null;
}

export function usePayoutMethod(partnerId: string | undefined): PayoutMethod | null {
  return normaliseMethod(useDemoValue<unknown>(payoutMethodKey(partnerId ?? "-"), null));
}

export function readPayoutMethod(partnerId: string): PayoutMethod | null {
  return normaliseMethod(readValue<unknown>(payoutMethodKey(partnerId), null));
}

/** "ACH · Chase ···· 6721" / "Check · Faena Hotel" — one line for tables and cards. */
export function payoutMethodLabel(method: PayoutMethod | null): string {
  if (!method) return "No payout method";
  return method.kind === "ach"
    ? `ACH · ${method.bankName || "bank"} ···· ${method.last4 || "—"}`
    : `Check · ${method.payableTo}`;
}

const railFor = (partnerId: string): Payout["method"] => (readPayoutMethod(partnerId)?.kind === "check" ? "Check" : "ACH");

export function balanceOf(partner: Partner) {
  return Math.max(0, partner.earnings - partner.paidOut);
}

/** Pay out a partner's whole unpaid balance. Simulated until M5's payout rail. */
export function payPartner(partner: Partner, actor: string, method: Payout["method"] = railFor(partner.id)) {
  const amount = balanceOf(partner);
  if (amount <= 0) return null;
  const now = Date.now();
  patch<Partner>(C.partners, partner, { paidOut: partner.earnings });
  const payout: Payout = {
    id: newId("po"),
    partnerId: partner.id,
    partnerName: partner.business,
    amount,
    period: { start: now - 30 * 86_400_000, end: now },
    status: "paid",
    scheduledFor: now,
    method,
  };
  create<Payout>(C.payouts, payout);
  logAudit(actor, "payout.paid", partner.business, `$${amount.toLocaleString()} via ${method}`);
  return payout;
}

/** A partner asks for their balance from the portal. */
export function requestPayout(partner: Partner) {
  const amount = balanceOf(partner);
  if (amount <= 0) return null;
  const payout: Payout = {
    id: newId("po"),
    partnerId: partner.id,
    partnerName: partner.business,
    amount,
    period: { start: Date.now() - 30 * 86_400_000, end: Date.now() },
    status: "scheduled",
    scheduledFor: Date.now() + 3 * 86_400_000,
    method: railFor(partner.id),
  };
  create<Payout>(C.payouts, payout);
  raiseAlert("partner", "Payout requested", `${partner.business} requested $${amount.toLocaleString()}.`);
  logAudit(partner.contact, "payout.requested", partner.business, `$${amount.toLocaleString()}`);
  return payout;
}

/** A readable, unique-ish referral code from a business name. */
export function codeFor(business: string, taken: string[]) {
  const base = business.replace(/[^a-z]/gi, "").slice(0, 7).toUpperCase() || "PARTNER";
  let code = base;
  let n = 2;
  while (taken.includes(code)) code = `${base}${n++}`;
  return code;
}
