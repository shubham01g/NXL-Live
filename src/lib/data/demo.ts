"use client";

import type { MemberAccount, MemberRental } from "@/lib/domain/types";
import type {
  AuditEntry,
  Customer,
  Driver,
  MemberNotice,
  MessageLogEntry,
  OpsAlert,
  Reservation,
} from "@/lib/domain/operations";
import { tierFor } from "@/lib/domain/loyalty";
import {
  ALERTS,
  AUDIT_LOG,
  CUSTOMERS,
  DRIVERS,
  RESERVATIONS,
} from "./fixtures/operations";
import { create, newId, patch, readCollection, useCollection } from "./demo-store";

/**
 * Named collections and the cross-cutting writes built on the demo store.
 *
 * One place decides what "a booking was placed" means — the reservation row,
 * the member's rental, the reminders, the ops alert and the audit line — so
 * the member portal, the back office and the driver portal can never tell
 * three different stories about the same booking.
 */

export const C = {
  reservations: "reservations",
  drivers: "drivers",
  customers: "customers",
  partners: "partners",
  payouts: "payouts",
  staff: "staff",
  purchases: "purchases",
  plans: "plans",
  promos: "promos",
  templates: "templates",
  seo: "seo",
  alerts: "alerts",
  audit: "audit",
  listings: "listings",
  members: "members",
  notices: "notices",
  messages: "messages",
  broadcasts: "broadcasts",
  reviews: "reviews",
  referrals: "referrals",
} as const;

/* --------------------------------- reads ---------------------------------- */

export const useReservations = (base: Reservation[] = RESERVATIONS) =>
  useCollection(C.reservations, base);
export const useDrivers = (base: Driver[] = DRIVERS) => useCollection(C.drivers, base);

/* --------------------------------- audit ---------------------------------- */

export function logAudit(actor: string, action: string, entity: string, detail: string) {
  create<AuditEntry>(C.audit, { id: newId("au"), at: Date.now(), actor, action, entity, detail });
}

export function raiseAlert(kind: OpsAlert["kind"], title: string, body: string) {
  create<OpsAlert>(C.alerts, { id: newId("al"), at: Date.now(), kind, title, body, read: false });
}

export function queueMessage(entry: Omit<MessageLogEntry, "id" | "at" | "status">) {
  create<MessageLogEntry>(C.messages, { ...entry, id: newId("msg"), at: Date.now(), status: "queued" });
}

/** Base rows for the admin audit and alert feeds, re-exported for convenience. */
export { ALERTS, AUDIT_LOG };

/* ------------------------------ notifications ----------------------------- */

export function notify(notice: Omit<MemberNotice, "id" | "read"> & { id?: string }) {
  create<MemberNotice>(C.notices, { read: false, ...notice, id: notice.id ?? newId("nt") });
}

const HOUR = 3_600_000;

/**
 * The reminder schedule the prototype promised: confirmation now, 24h and 2h
 * before pickup, at pickup, the day before return, and on return day. Written
 * up front with future timestamps; the feed shows each one when it falls due.
 */
export function scheduleReminders(r: Reservation) {
  const car = r.listingKind === "car";
  const when = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(r.window.start));
  const href = `/account/bookings/${r.id}`;
  const base = { email: r.email, href };

  notify({ ...base, kind: "confirmation", at: Date.now(), title: `Confirmed — ${r.listingName}`, body: `Reservation ${r.reference} is locked in for ${when}. Your refundable deposit is held at pickup, never before.` });
  const plan: [number, MemberNotice["kind"], string, string][] = [
    [r.window.start - 24 * HOUR, "reminder", "Tomorrow: your reservation", `${r.listingName} · ${when}. Reply to the concierge any time to change delivery details.`],
    [r.window.start - 2 * HOUR, "reminder", "Two hours to go", car ? `Your driver is preparing the ${r.listingName}. Keep your licence handy for the handover.` : `${r.listingName} is being readied for check-in.`],
    [r.window.start, "pickup", car ? "Handover time" : "Check-in time", car ? "Your car is at the handover point. Enjoy the drive." : "Your estate is ready. Welcome in."],
    [r.window.end - 24 * HOUR, "return", "Return tomorrow", `${r.listingName} is due back ${new Intl.DateTimeFormat("en-US", { weekday: "short", hour: "numeric" }).format(new Date(r.window.end))}.`],
    [r.window.end, "return", "Return day", "Thanks for driving with NXL. Your deposit is released after the return inspection."],
  ];
  for (const [at, kind, title, body] of plan) {
    if (at > Date.now()) notify({ ...base, kind, at, title, body });
  }
}

/* --------------------------------- members -------------------------------- */

/** Registered demo accounts, keyed by id — lets any sign-up sign back in. */
export function findMember(email: string): MemberAccount | null {
  const e = email.trim().toLowerCase();
  return readCollection<MemberAccount>(C.members, []).find((m) => m.email === e) ?? null;
}

export function rememberMember(member: MemberAccount) {
  const known = readCollection<MemberAccount>(C.members, []).some((m) => m.id === member.id);
  if (known) patch<MemberAccount>(C.members, member, member);
  else create<MemberAccount>(C.members, member);
}

/** Mirror a new sign-up into the back office's customer list. */
export function registerCustomer(member: MemberAccount, channel: Customer["channel"] = "web", referredBy: string | null = null) {
  const exists = readCollection<Customer>(C.customers, CUSTOMERS).some((c) => c.email === member.email);
  if (exists) return;
  create<Customer>(C.customers, {
    id: `cus-${member.id}`,
    name: member.name,
    email: member.email,
    phone: member.phone ?? "—",
    tier: tierFor(member.points).name,
    points: member.points,
    credits: member.credits,
    rentals: 0,
    lifetimeSpend: 0,
    joinedAt: member.joinedAt,
    enrolled: member.enrolled,
    flagged: false,
    channel,
    referredBy,
    mfaEnabled: member.security.mfaEnabled,
    card: member.card,
    insurance: member.insurance,
    address: member.address,
  });
  raiseAlert("booking", "New member", `${member.name} created an account.`);
}

/* -------------------------------- bookings -------------------------------- */

/** A reservation, as the member's rental history shows it. */
export function toRental(r: Reservation, slug: string): MemberRental {
  return {
    id: r.id,
    reference: r.reference,
    listingId: r.listingId,
    listingSlug: slug,
    listingName: r.listingName,
    listingKind: r.listingKind,
    unit: r.unit,
    qty: r.qty,
    window: r.window,
    total: r.total,
    pointsEarned: r.pointsEarned,
    status: r.status,
  };
}

export function nextReference(): string {
  return `NXL-${25000 + Math.floor((Date.now() / 1000) % 9000)}`;
}

/** Apply a change to a reservation, with an audit line. */
export function updateReservation(
  current: Reservation,
  change: Partial<Reservation>,
  actor: string,
  action: string,
  detail: string,
): Reservation {
  const next = patch<Reservation>(C.reservations, current, change);
  logAudit(actor, action, current.reference, detail);
  return next;
}

/** The reservation as the store currently has it (fixture merged with edits). */
export function currentReservation(id: string): Reservation | null {
  return readCollection<Reservation>(C.reservations, RESERVATIONS).find((r) => r.id === id) ?? null;
}
