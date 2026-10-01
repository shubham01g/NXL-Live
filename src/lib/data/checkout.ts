"use client";

import type { InsuranceChoice, Listing, MemberAccount, PaymentCard, RateUnit } from "@/lib/domain/types";
import type { PayMethod, Promo, Reservation } from "@/lib/domain/operations";
import type { Settlement } from "@/lib/domain/pricing";
import { durationMs, overlaps } from "@/lib/domain/pricing";
import { geocode } from "@/lib/domain/geo";
import { unitLabel } from "@/lib/domain/pricing";
import { PROMOS, RESERVATIONS } from "./fixtures/operations";
import { LISTINGS } from "./fixtures/listings";
import { create, patch, readCollection } from "./demo-store";
import { C, logAudit, nextReference, raiseAlert, scheduleReminders, toRental } from "./demo";
import { updateMember } from "@/lib/auth/use-session";

/**
 * Placing a booking.
 *
 * At M2 "payment" is a card form whose last four digits are stored and whose
 * charge is simulated; the processor arrives at M5. Guests can also pay the
 * rental and/or the deposit in cash at pickup — those are recorded as due and
 * marked received by staff or the delivering driver. Everything else a real
 * booking does happens for real in the demo store: the reservation row the
 * back office dispatches, the member's rental, wallet deduction, points,
 * reminders, the partner attribution and the audit line.
 */

export interface BookingDraft {
  listing: Listing;
  unit: RateUnit;
  qty: number;
  start: number;
  guestName: string;
  email: string;
  phone: string;
  insurance: InsuranceChoice;
  delivery: string | null;
  pickup: string | null;
  settlement: Settlement;
  quoteDeposit: number;
  promoCode: string | null;
  card: { last4: string; brand: PaymentCard["brand"] } | null;
  /** How the rental balance (after wallet credit) is paid. */
  payMethod: PayMethod;
  depositMethod: PayMethod;
  partnerCode: string | null;
  notes: string | null;
}

/** Existing, unfinished bookings of a listing that clash with a window. */
export function clashes(listing: Listing, window: { start: number; end: number }): { start: number; end: number }[] {
  const booked = readCollection<Reservation>(C.reservations, RESERVATIONS)
    .filter((r) => r.listingId === listing.id && r.status !== "cancelled" && r.status !== "completed")
    .map((r) => r.window);
  // Dates blocked in the back office live on the store's copy of the listing.
  const current = readCollection<Listing>(C.listings, LISTINGS).find((l) => l.id === listing.id) ?? listing;
  return [...current.bookedRanges, ...booked].filter((w) => overlaps(w, window));
}

export function placeBooking(draft: BookingDraft, member: MemberAccount): Reservation {
  const { listing, settlement: s } = draft;
  const window = { start: draft.start, end: draft.start + durationMs(draft.unit, draft.qty) };
  const deliveryPoint = draft.delivery ? geocode(draft.delivery).point : null;
  const pickupPoint = draft.pickup ? geocode(draft.pickup).point : null;

  const reservation: Reservation = {
    id: `res-web-${Date.now().toString(36)}`,
    reference: nextReference(),
    listingId: listing.id,
    listingKind: listing.kind,
    listingName: listing.name,
    guestName: draft.guestName,
    email: draft.email,
    phone: draft.phone,
    unit: draft.unit,
    qty: draft.qty,
    window,
    lineItems: s.lineItems,
    total: s.total,
    deposit: draft.quoteDeposit,
    depositStatus: "held",
    status: "confirmed",
    insurance: draft.insurance,
    pointsEarned: s.pointsEarned,
    createdAt: Date.now(),
    channel: draft.partnerCode ? "partner" : "web",
    partnerCode: draft.partnerCode,
    driverId: null,
    deliveryAddress: draft.delivery,
    deliveryPoint,
    pickupAddress: draft.pickup,
    pickupPoint,
    driverJob: null,
    inspections: [],
    payment:
      draft.payMethod === "cash" && s.cardCharge > 0
        ? { method: "cash", last4: null, cashReceivedAt: null }
        : {
            method: s.walletApplied > 0 ? (s.cardCharge > 0 ? "split" : "wallet") : "card",
            last4: s.cardCharge > 0 ? (draft.card?.last4 ?? null) : null,
          },
    depositMethod: draft.depositMethod,
    walletApplied: s.walletApplied,
    pointsRedeemed: s.pointsUsed,
    promoCode: draft.promoCode,
    notes: draft.notes,
  };

  create(C.reservations, reservation);

  // The member's side: rental history, wallet, points.
  updateMember((m) => {
    const credits = m.credits - s.walletApplied;
    return {
      ...m,
      points: m.points - s.pointsUsed + s.pointsEarned,
      credits,
      rentals: [toRental(reservation, listing.slug), ...m.rentals],
      // The ledger is oldest-first; the wallet panel reverses it for display.
      wallet:
        s.walletApplied > 0
          ? [
              ...m.wallet,
              {
                id: `w-${reservation.id}`,
                kind: "spend",
                label: `${listing.name} · ${unitLabel(draft.unit, draft.qty)}`,
                amount: -s.walletApplied,
                balanceAfter: credits,
                createdAt: Date.now(),
              },
            ]
          : m.wallet,
    };
  });

  if (draft.promoCode) {
    const promo = readCollection<Promo>(C.promos, PROMOS).find((p) => p.code === draft.promoCode);
    if (promo) patch<Promo>(C.promos, promo, { uses: promo.uses + 1 });
  }

  scheduleReminders(reservation);
  raiseAlert(
    "booking",
    "New online reservation",
    `${draft.guestName} booked the ${listing.name} (${unitLabel(draft.unit, draft.qty)})${draft.delivery ? ` — deliver to ${draft.delivery}` : ""}.`,
  );
  logAudit(member.name, "reservation.created", reservation.reference, `${listing.name} · ${s.total.toLocaleString()} · ${draft.payMethod === "cash" && s.cardCharge > 0 ? "cash at pickup" : "card"} · ${reservation.channel}${draft.partnerCode ? ` (${draft.partnerCode})` : ""}`);

  return reservation;
}
