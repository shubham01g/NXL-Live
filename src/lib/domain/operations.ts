import type {
  BillingAddress,
  Booking,
  DateRange,
  InsurancePolicy,
  Money,
  Partner,
  PaymentCard,
  TierName,
} from "./types";
import type { GeoPoint } from "./geo";

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

/** Where a delivery job stands, from the driver's side. */
export type DriverJobStatus = "assigned" | "en_route" | "picked_up" | "delivered";

export const DRIVER_JOB_STEPS: DriverJobStatus[] = ["assigned", "en_route", "picked_up", "delivered"];

export type FuelLevel = "E" | "1/4" | "1/2" | "3/4" | "F";
export type Condition = "clean" | "minor" | "major";

/** A walk-around, captured by the driver at pickup and delivery, or staff at return. */
export interface Inspection {
  id: string;
  stage: "pickup" | "delivery" | "return";
  at: number;
  by: string;
  mileage: number | null;
  fuel: FuelLevel | null;
  exterior: Condition;
  interior: Condition;
  damage: string | null;
  checklist: Record<string, boolean>;
  /** Data URLs at M2 (downscaled); storage URLs at M3. */
  photos: string[];
  notes: string | null;
}

export interface CarPosition extends GeoPoint {
  at: number;
  source: "driver" | "renter";
}

/** Deposit settlement recorded when a booking is closed out. */
export interface Closeout {
  at: number;
  by: string;
  damageCharge: Money;
  cleaningFee: Money;
  notes: string | null;
  refunded: Money;
}

/** What a guest can pay with — for the rental and, separately, the deposit. */
export type PayMethod = "card" | "cash";

export interface ReservationPayment {
  /** "split" is Drive Wallet + card; wallet + cash is "cash" with `walletApplied`. */
  method: "card" | "wallet" | "cash" | "split";
  last4: string | null;
  /** Cash bookings are paid in person; set when staff or the driver take it. */
  cashReceivedAt?: number | null;
}

/** Cash still to collect in person: the unpaid rental and a cash deposit. */
export function cashToCollect(r: Pick<Reservation, "total" | "walletApplied" | "payment" | "deposit" | "depositMethod" | "depositStatus">) {
  const rental = r.payment?.method === "cash" && !r.payment.cashReceivedAt ? r.total - (r.walletApplied ?? 0) : 0;
  const deposit = r.depositMethod === "cash" && r.depositStatus === "held" ? r.deposit : 0;
  return { rental, deposit, total: rental + deposit };
}

/** "Card ···· 4242", "Drive Wallet + cash at pickup", … */
export function paidWith(r: Pick<Reservation, "payment" | "walletApplied">): string {
  const p = r.payment;
  const parts: string[] = [];
  if (r.walletApplied || p?.method === "wallet" || p?.method === "split") parts.push("Drive Wallet");
  if (p?.method === "cash") parts.push(p.cashReceivedAt ? "cash (received)" : "cash at pickup");
  else if (p?.last4) parts.push(`card ···· ${p.last4}`);
  const label = parts.join(" + ") || "card";
  return label[0].toUpperCase() + label.slice(1);
}

/** How the deposit is taken, for receipts. */
export function depositTerms(r: Pick<Reservation, "depositMethod">): string {
  return r.depositMethod === "cash" ? "cash at pickup" : "card hold at pickup";
}

/** A booking as the back office sees it: who brought it and who delivers it. */
export interface Reservation extends Booking {
  channel: BookingChannel;
  partnerCode: string | null;
  driverId: string | null;
  deliveryAddress: string | null;
  /* The fields below arrive with checkout and dispatch at M2; older fixture
     rows simply do not carry them. */
  deliveryPoint?: GeoPoint | null;
  pickupAddress?: string | null;
  pickupPoint?: GeoPoint | null;
  driverJob?: DriverJobStatus | null;
  inspections?: Inspection[];
  carPosition?: CarPosition | null;
  payment?: ReservationPayment | null;
  /** How the security deposit is taken at pickup. Absent on older rows = card hold. */
  depositMethod?: PayMethod;
  walletApplied?: Money;
  pointsRedeemed?: number;
  promoCode?: string | null;
  notes?: string | null;
  closeout?: Closeout | null;
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
  /* Portal and dispatch fields. Optional so a roster row can be added with
     just a name and phone, as the admin form does. */
  username?: string;
  /** Demo only — M3 moves driver credentials to real auth. */
  password?: string;
  vehicle?: string;
  /** Map pin colour. */
  color?: string;
  licenseFront?: string | null;
  licenseBack?: string | null;
  licenseExpiry?: number | null;
  licenseNote?: string | null;
  position?: (GeoPoint & { at: number }) | null;
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
  /* Detail-drawer fields. Optional: the list only needs the ones above. */
  channel?: "web" | "walk-in" | "referral" | "concierge";
  referredBy?: string | null;
  notes?: string | null;
  mfaEnabled?: boolean;
  card?: PaymentCard | null;
  insurance?: InsurancePolicy | null;
  address?: BillingAddress | null;
  /** Images are set when staff scan the licence at the desk. */
  license?: { number: string; state: string; expiresAt: number; verified: boolean; front?: string | null; back?: string | null } | null;
  suspended?: boolean;
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

export type PromoType = "percent" | "flat" | "free-delivery" | "free-insurance";
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
  /** Smallest booking the code applies to. */
  minSpend?: Money;
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

/* -------------------------------- partners -------------------------------- */

export type ReferralStatus = "pending" | "cleared" | "paid";

/** One referred booking in a partner's ledger. */
export interface PartnerReferral {
  id: string;
  partnerCode: string;
  guest: string;
  reference: string;
  listingName: string;
  at: number;
  amount: Money;
  commission: Money;
  status: ReferralStatus;
}

/* ------------------------------ notifications ------------------------------ */

export type NotificationKind = "confirmation" | "reminder" | "pickup" | "return" | "update" | "system" | "promo";

/**
 * A member-facing notification. `at` may be in the future — reminders are
 * written when the booking is made and surface once their time arrives, which
 * is exactly how the M5 scheduler will send them.
 */
export interface MemberNotice {
  id: string;
  email: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: number;
  read: boolean;
  href?: string;
  media?: { url: string; type: "image" | "video" } | null;
}

/** A broadcast sent from the Notifications console. */
export interface Broadcast {
  id: string;
  at: number;
  by: string;
  audience: string;
  recipients: number;
  channels: ("push" | "email" | "sms")[];
  title: string;
  body: string;
  media?: { url: string; type: "image" | "video" } | null;
}

/** Outbound message log. Nothing is sent until M5 — rows are marked "queued". */
export interface MessageLogEntry {
  id: string;
  at: number;
  to: string;
  channel: "email" | "sms" | "push";
  subject: string;
  template: string;
  status: "queued" | "sent" | "failed";
}
