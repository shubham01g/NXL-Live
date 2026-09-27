"use client";

import { useMemo } from "react";
import type { MemberAccount, MemberRental } from "@/lib/domain/types";
import type { Reservation } from "@/lib/domain/operations";
import { LISTINGS } from "./fixtures/listings";
import { RESERVATIONS } from "./fixtures/operations";
import { patch, useCollection } from "./demo-store";
import { C, notify, raiseAlert, updateReservation } from "./demo";
import { updateMember } from "@/lib/auth/use-session";

/**
 * A member's bookings, from both places they live at M2:
 *  - reservations (anything booked through checkout or by the concierge,
 *    which the back office and driver portal also update), and
 *  - the member's own rental history, for older trips that predate the demo
 *    store and exist only on the account.
 * Reservations win when both describe the same trip.
 */

export const slugFor = (listingId: string) => LISTINGS.find((l) => l.id === listingId)?.slug ?? "";
export const listingFor = (listingId: string) => LISTINGS.find((l) => l.id === listingId) ?? null;

/** A history-only rental, shaped as a reservation so one page can render both. */
function fromRental(r: MemberRental, member: MemberAccount): Reservation {
  return {
    id: r.id,
    reference: r.reference,
    listingId: r.listingId,
    listingKind: r.listingKind,
    listingName: r.listingName,
    guestName: member.name,
    email: member.email,
    phone: member.phone ?? "",
    unit: r.unit,
    qty: r.qty,
    window: r.window,
    lineItems: [{ key: "rental", label: `${r.qty} × ${r.unit}`, amount: r.total, kind: "charge" }],
    total: r.total,
    deposit: listingFor(r.listingId)?.deposit ?? 0,
    depositStatus: r.status === "completed" || r.status === "cancelled" ? "refunded" : "held",
    status: r.status,
    insurance: null,
    pointsEarned: r.pointsEarned,
    createdAt: r.window.start,
    channel: "web",
    partnerCode: null,
    driverId: null,
    deliveryAddress: null,
  };
}

const UPCOMING = new Set(["pending", "confirmed", "checked_out", "active"]);

export function useMemberBookings(member: MemberAccount | null): Reservation[] {
  const reservations = useCollection<Reservation>(C.reservations, RESERVATIONS);
  return useMemo(() => {
    if (!member) return [];
    const mine = reservations.filter((r) => r.email === member.email);
    const known = new Set(mine.flatMap((r) => [r.id, r.reference]));
    const history = member.rentals.filter((r) => !known.has(r.id) && !known.has(r.reference)).map((r) => fromRental(r, member));
    const all = [...mine, ...history];
    const upcoming = all.filter((r) => UPCOMING.has(r.status)).sort((a, b) => a.window.start - b.window.start);
    const past = all.filter((r) => !UPCOMING.has(r.status)).sort((a, b) => b.window.start - a.window.start);
    return [...upcoming, ...past];
  }, [member, reservations]);
}

/** Free cancellation until 48 hours before the start. */
export const FREE_CANCEL_MS = 48 * 3_600_000;

export function canCancel(r: Reservation, now: number) {
  return (r.status === "pending" || r.status === "confirmed") && r.window.start > now;
}

export function cancelBooking(r: Reservation, member: MemberAccount, now: number) {
  const late = r.window.start - now < FREE_CANCEL_MS;
  const walletBack = r.walletApplied ?? 0;
  updateReservation(r, { status: "cancelled", depositStatus: "refunded", driverJob: null }, member.name, "reservation.cancelled", late ? "Cancelled by member inside 48h" : "Cancelled by member");
  updateMember((m) => ({
    ...m,
    credits: m.credits + walletBack,
    points: Math.max(0, m.points - r.pointsEarned + (r.pointsRedeemed ?? 0)),
    rentals: m.rentals.map((x) => (x.id === r.id ? { ...x, status: "cancelled" } : x)),
    wallet:
      walletBack > 0
        ? [...m.wallet, { id: `w-refund-${r.id}`, kind: "refund", label: `Refund · ${r.listingName}`, amount: walletBack, balanceAfter: m.credits + walletBack, createdAt: now }]
        : m.wallet,
  }));
  notify({ email: r.email, kind: "update", at: now, title: `Cancelled — ${r.listingName}`, body: `Reservation ${r.reference} is cancelled.${walletBack ? ` ${walletBack.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} is back in your Drive Wallet.` : ""}`, href: `/account/bookings/${r.id}` });
  raiseAlert("booking", "Reservation cancelled", `${r.guestName} cancelled ${r.reference} (${r.listingName}).`);
}

/** Share the renter's phone location with the fleet map while the car is out. */
export function reportRenterPosition(r: Reservation, lat: number, lng: number) {
  // Not audited — a fix arrives every few seconds.
  patch<Reservation>(C.reservations, r, { carPosition: { lat, lng, at: Date.now(), source: "renter" } });
}
