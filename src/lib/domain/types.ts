/**
 * Domain types.
 *
 * Ported from the Figma Make prototype's store.tsx with corrections:
 *  - One Listing base with a kind discriminator and a rates map keyed by unit,
 *    rather than car-only `rates.hour` and home-only `cleaningFee` forcing
 *    asymmetric branching at every call site.
 *  - Availability is modelled as date ranges. `status` means operational
 *    state only (a car in the shop), never "is it free next Tuesday".
 *  - Money totals carry line items instead of one opaque `total`.
 *
 * This is the shape the Supabase schema will implement at M3.
 */

/* ---------------------------------- core --------------------------------- */

export type ListingKind = "car" | "home";
export type RateUnit = "hour" | "day" | "week" | "month";

/** Operational state. NOT availability — see BookedRange. */
export type ListingStatus = "available" | "booked" | "maintenance";

/** USD, whole dollars. */
export type Money = number;

export type RateMap = Partial<Record<RateUnit, Money>>;

export interface DateRange {
  /** ms epoch */
  start: number;
  /** ms epoch */
  end: number;
}

export interface MediaVideo {
  src: string;
  poster: string | null;
  label: string;
}

interface ListingBase {
  id: string;
  /** URL segment, e.g. "lamborghini-huracan-evo" */
  slug: string;
  name: string;
  category: string;
  location: string;
  status: ListingStatus;
  /** 0–5, one decimal of precision in practice */
  rating: number;
  trips: number;
  description: string;
  rates: RateMap;
  /** Refundable security deposit held at pickup. */
  deposit: Money;
  /**
   * Hero image. `null` renders the branded placeholder — the client is
   * supplying real photography, so every listing ships null for now.
   */
  photo: string | null;
  gallery: string[];
  video: MediaVideo | null;
  featured: boolean;
  /** Ranges already reserved. Drives real availability at M3. */
  bookedRanges: DateRange[];
}

export interface CarSpecs {
  horsepower: number;
  topSpeed: number;
  zeroToSixty: number;
  seats: number;
  transmission: string;
  drivetrain: string;
}

export interface CarListing extends ListingBase {
  kind: "car";
  make: string;
  year: number;
  specs: CarSpecs;
}

export interface HomeSpecs {
  beds: number;
  baths: number;
  sleeps: number;
}

export interface HomeListing extends ListingBase {
  kind: "home";
  specs: HomeSpecs;
  amenities: string[];
  /** Non-refundable, charged per stay. */
  cleaningFee: Money;
}

export type Listing = CarListing | HomeListing;

export const isCar = (l: Listing): l is CarListing => l.kind === "car";
export const isHome = (l: Listing): l is HomeListing => l.kind === "home";

/* -------------------------------- reviews -------------------------------- */

export interface Review {
  id: string;
  listingId: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: number;
}

/* -------------------------------- loyalty -------------------------------- */

export type TierName = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface LoyaltyTier {
  name: TierName;
  /** Points required to reach this tier. */
  min: number;
  /** Fraction of spend returned as points, e.g. 0.05 = 5%. */
  rate: number;
  color: string;
  headline: string;
  perks: string[];
}

/* ------------------------------ credit wallet ----------------------------- */

export interface Plan {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  /** One-time purchase price. Not a subscription — there is no renewal. */
  price: Money;
  /** Credits loaded on purchase. Always >= price; the delta is the bonus. */
  credits: Money;
  /** Tier this plan grants on purchase. */
  grantsTier: TierName;
  perks: string[];
  featured: boolean;
}

/* -------------------------------- pricing -------------------------------- */

export type InsuranceChoice = "own" | "nxl";

export interface QuoteLineItem {
  key: string;
  label: string;
  amount: Money;
  /** Informational rows (e.g. "Own policy — no fee") render without a figure. */
  note?: string;
  kind: "charge" | "credit" | "info";
}

export interface Quote {
  lineItems: QuoteLineItem[];
  /** Charged at booking. */
  dueNow: Money;
  /** Held at pickup, refundable. Never part of dueNow. */
  depositDue: Money;
  pointsEarned: number;
}

/* --------------------------------- people -------------------------------- */

export interface Member {
  id: string;
  name: string;
  email: string;
  phone?: string;
  points: number;
  enrolled: boolean;
  joinedAt: number;
  rentals: number;
  activePlanId: string | null;
}

export type PartnerStatus = "pending" | "active" | "paused";

export interface Partner {
  id: string;
  business: string;
  contact: string;
  email: string;
  phone: string;
  type: string;
  status: PartnerStatus;
  code: string;
  /** Percent of each referred rental. */
  commission: number;
  referrals: number;
  earnings: Money;
  paidOut: Money;
  joinedAt: number;
}

/* -------------------------------- bookings ------------------------------- */

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "checked_out"
  | "active"
  | "completed"
  | "cancelled";

export type DepositStatus = "held" | "charged" | "refunded" | "forfeited";

export interface Booking {
  id: string;
  reference: string;
  listingId: string;
  listingKind: ListingKind;
  /** Historical snapshot — intentionally denormalized. */
  listingName: string;
  guestName: string;
  email: string;
  phone: string;
  unit: RateUnit;
  qty: number;
  window: DateRange;
  lineItems: QuoteLineItem[];
  total: Money;
  deposit: Money;
  depositStatus: DepositStatus;
  status: BookingStatus;
  insurance: InsuranceChoice | null;
  pointsEarned: number;
  createdAt: number;
}
