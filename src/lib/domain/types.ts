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
  /** URL segment, e.g. "rolls-royce-cullinan-black-badge" */
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
   * Hero image, cropped 4:3 for listing cards. `null` renders the branded
   * placeholder for listings still waiting on client photography.
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

export type CardBrand = "visa" | "mastercard" | "amex" | "discover";

export interface PaymentCard {
  id: string;
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  holder: string;
  /** Charged for the rental. The deposit is held at pickup, never here. */
  isDefault: boolean;
}

export interface InsurancePolicy {
  kind: InsuranceChoice;
  /** Carrier for an own policy; null for the NXL daily package. */
  carrier: string | null;
  policyNumber: string | null;
  /** ms epoch. null for the NXL package, which never lapses. */
  expiresAt: number | null;
  /** Own policies are checked by the team before delivery. */
  verified: boolean;
  /** Declarations page, uploaded by the member (data URL at M2). */
  document?: string | null;
}

/** The member's driver's licence, reviewed by staff before a first delivery. */
export interface DriverLicence {
  number: string;
  state: string;
  /** ms epoch */
  expiresAt: number;
  front: string | null;
  back: string | null;
  status: "pending" | "verified" | "rejected";
  note?: string | null;
  submittedAt: number;
}

export interface BillingAddress {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface SecuritySettings {
  mfaEnabled: boolean;
  /** Last 4 of the number OTP codes go to. */
  otpPhoneLast4: string | null;
  passwordUpdatedAt: number | null;
  recoveryCodesRemaining: number;
}

export type WalletEntryKind = "load" | "bonus" | "spend" | "refund";

export interface WalletEntry {
  id: string;
  kind: WalletEntryKind;
  label: string;
  /** Signed: loads and refunds positive, spends negative. */
  amount: Money;
  balanceAfter: Money;
  createdAt: number;
}

/** A member's view of their own booking. */
export interface MemberRental {
  id: string;
  reference: string;
  listingId: string;
  listingSlug: string;
  listingName: string;
  listingKind: ListingKind;
  unit: RateUnit;
  qty: number;
  window: DateRange;
  total: Money;
  pointsEarned: number;
  status: BookingStatus;
}

/**
 * A member account.
 *
 * The prototype's member record was five loose fields on a localStorage blob;
 * the dashboard needs the payment, insurance, address and security state to
 * be modelled, because the whole "action required" flow keys off whether they
 * are null. M3 implements this as the `members` table plus its relations.
 */
export interface MemberAccount {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** null renders initials on a metal plate — most members never upload one. */
  photo: string | null;
  joinedAt: number;
  /** Level Rewards opt-in. Points only accrue when true. */
  enrolled: boolean;
  points: number;
  /** Drive credit wallet balance. */
  credits: Money;
  /** Lifetime credits loaded, so "X of Y remaining" can be shown. */
  creditsLoaded: Money;
  activePlanId: string | null;
  /**
   * Lifetime completed rentals. Deliberately separate from `rentals.length`:
   * that array holds only the most recent page, and M3 takes this figure from
   * a count query rather than shipping every booking to the client.
   */
  lifetimeRentals: number;
  card: PaymentCard | null;
  insurance: InsurancePolicy | null;
  address: BillingAddress | null;
  security: SecuritySettings;
  /** Optional so accounts created before licence upload existed still load. */
  licence?: DriverLicence | null;
  rentals: MemberRental[];
  wallet: WalletEntry[];
}

/** What sign-up collects. Everything else starts empty. */
export interface NewMemberInput {
  name: string;
  email: string;
  phone: string | null;
  enrolled: boolean;
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
