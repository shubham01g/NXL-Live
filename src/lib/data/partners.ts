"use client";

import type { Partner } from "@/lib/domain/types";
import type { PartnerReferral, Payout, Reservation } from "@/lib/domain/operations";
import { referralsFor } from "./fixtures/operations";
import { C, logAudit, raiseAlert } from "./demo";
import { create, newId, patch } from "./demo-store";

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

export function balanceOf(partner: Partner) {
  return Math.max(0, partner.earnings - partner.paidOut);
}

/** Pay out a partner's whole unpaid balance. Simulated until M5's payout rail. */
export function payPartner(partner: Partner, actor: string, method: Payout["method"] = "ACH") {
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
    method: "ACH",
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
