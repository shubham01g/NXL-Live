import type { Booking, DateRange, Money, Partner, TierName } from "./types";

/**
 * Back-office domain: what the Employee and Master Admin consoles read.
 *
 * Ported from the prototype's Admin.tsx store slices, which kept all of this
 * as loose arrays in localStorage. The shapes here are what M3's tables
 * implement; the screens only ever see these types.
 */

/* ---------------------------------- staff --------------------------------- */

/**
 * Staff levels, lowest first. The prototype also had an "admin" tier between
 * the two; the access floater only offers Employee and Master Admin, and the
 * team screen can still assign it.
 */
export type StaffRole = "employee" | "admin" | "master";

export const STAFF_LEVEL: Record<StaffRole, number> = {
  employee: 1,
  admin: 2,
  master: 3,
};

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  employee: "Employee",
  admin: "Admin",
  master: "Master Admin",
};

export function canAccess(role: StaffRole, min: StaffRole): boolean {
  return STAFF_LEVEL[role] >= STAFF_LEVEL[min];
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  title: string;
  active: boolean;
  addedAt: number;
  lastActiveAt: number;
}

/* ------------------------------- reservations ------------------------------ */

export type BookingChannel = "web" | "concierge" | "partner" | "walk-in";

/** A booking as the back office sees it: who brought it and who delivers it. */
export interface Reservation extends Booking {
  channel: BookingChannel;
  partnerCode: string | null;
  driverId: string | null;
  deliveryAddress: string | null;
}

/* --------------------------------- drivers -------------------------------- */

export type DriverStatus = "available" | "on-delivery" | "off-duty";
export type LicenseStatus = "verified" | "pending" | "expired";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  license: LicenseStatus;
  zone: string;
  rating: number;
  deliveries: number;
}

/* -------------------------------- customers ------------------------------- */

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: TierName;
  points: number;
  credits: Money;
  rentals: number;
  lifetimeSpend: Money;
  joinedAt: number;
  enrolled: boolean;
  flagged: boolean;
}

/* ------------------------------ credit plans ------------------------------ */

export type PlanPurchaseStatus = "active" | "depleted" | "refunded";

/** One Drive Wallet package sale — the "Subscriptions" tab. */
export interface PlanPurchase {
  id: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  price: Money;
  credits: Money;
  remaining: Money;
  purchasedAt: number;
  status: PlanPurchaseStatus;
}

/* --------------------------------- payouts -------------------------------- */

export type PayoutStatus = "scheduled" | "processing" | "paid" | "failed";

export interface Payout {
  id: string;
  partnerId: string;
  partnerName: string;
  amount: Money;
  period: DateRange;
  status: PayoutStatus;
  scheduledFor: number;
  method: "ACH" | "Wire" | "Wallet credit";
}

export type { Partner };

/* ------------------------------ audit & alerts ----------------------------- */

export interface AuditEntry {
  id: string;
  at: number;
  actor: string;
  action: string;
  entity: string;
  detail: string;
}

export type AlertKind = "booking" | "payment" | "fleet" | "partner" | "system";

export interface OpsAlert {
  id: string;
  at: number;
  kind: AlertKind;
  title: string;
  body: string;
  read: boolean;
}

/* --------------------------------- messaging ------------------------------- */

export interface MessageTemplate {
  id: string;
  name: string;
  channel: "email" | "sms";
  trigger: string;
  subject: string;
  body: string;
  enabled: boolean;
  updatedAt: number;
}

/** Merge tags every template may use, with the sample value the preview shows. */
export const MERGE_TAGS: Record<string, string> = {
  "{{guest_name}}": "Alex Rivera",
  "{{listing_name}}": "Rolls-Royce Cullinan Black Badge",
  "{{reference}}": "NXL-24817",
  "{{pickup_time}}": "Fri, Oct 3 · 10:00 AM",
  "{{total}}": "$4,198",
  "{{deposit}}": "$1,000",
  "{{wallet_balance}}": "$640",
  "{{points}}": "2,480",
};

export function fillMergeTags(text: string): string {
  return text.replace(/\{\{[a-z_]+\}\}/g, (tag) => MERGE_TAGS[tag] ?? tag);
}

/* --------------------------------- marketing ------------------------------- */

export type PromoType = "percent" | "flat" | "free-delivery";
export type PromoStatus = "active" | "scheduled" | "expired" | "paused";

export interface Promo {
  id: string;
  code: string;
  description: string;
  type: PromoType;
  value: number;
  appliesTo: "all" | "cars" | "homes";
  uses: number;
  maxUses: number | null;
  expiresAt: number | null;
  status: PromoStatus;
}

/* ----------------------------------- seo ---------------------------------- */

export interface SeoPage {
  path: string;
  title: string;
  description: string;
  keyword: string;
  indexed: boolean;
}

/* --------------------------------- analytics ------------------------------- */

/** Booked revenue for one month, split by what earned it. */
export interface RevenueMonth {
  /** ms epoch of the first of the month */
  month: number;
  cars: Money;
  homes: Money;
  plans: Money;
}

/* ---------------------------------- system -------------------------------- */

export type HealthState = "operational" | "degraded" | "not-connected";

export interface HealthCheck {
  id: string;
  name: string;
  state: HealthState;
  detail: string;
  /** For not-connected services: the milestone that wires them. */
  milestone: string | null;
}

export interface PlatformSettings {
  businessName: string;
  supportEmail: string;
  supportPhone: string;
  address: string;
  hours: string;
  taxRate: number;
  deliveryFee: Money;
  defaultCarDeposit: Money;
  /** Fraction of loaded credits at which the low-balance alert fires. */
  lowBalanceThreshold: number;
  pointsPerDollar: number;
  hourlyBookings: boolean;
  maintenanceMode: boolean;
}
