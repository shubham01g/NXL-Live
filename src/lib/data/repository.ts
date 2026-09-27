import type {
  CarListing,
  HomeListing,
  Listing,
  ListingKind,
  MemberAccount,
  NewMemberInput,
  Plan,
  Review,
} from "@/lib/domain/types";
import type {
  AuditEntry,
  Customer,
  Driver,
  HealthCheck,
  MessageTemplate,
  OpsAlert,
  Partner,
  Payout,
  PlanPurchase,
  PlatformSettings,
  Promo,
  Reservation,
  RevenueMonth,
  SeoPage,
  StaffMember,
} from "@/lib/domain/operations";

/**
 * The data contract.
 *
 * Every page reads through this interface. M1/M2 back it with in-memory
 * fixtures; M3 swaps in a Supabase implementation and nothing in the UI
 * changes. That is the whole reason this layer exists — strict milestone
 * order means the UI ships before the database, and we refuse to pay for
 * that twice.
 *
 * Deliberately async even though the fixtures are synchronous, so the
 * call sites are already shaped for real I/O.
 */
export interface Repository {
  listCars(): Promise<CarListing[]>;
  listHomes(): Promise<HomeListing[]>;
  listListings(): Promise<Listing[]>;

  /** Slugs are unique within a kind, so both are required. */
  getListing(kind: ListingKind, slug: string): Promise<Listing | null>;

  listReviews(listingId: string): Promise<Review[]>;
  listPlans(): Promise<Plan[]>;
  getStats(): Promise<SiteStats>;

  /* ------------------------------- members ------------------------------- */

  /**
   * Look up an account by email. `null` means no such member.
   *
   * There is no password parameter and that is deliberate: real credentials,
   * OTP and 2FA are M3. M2 proves the screens and the navigation, so the
   * lookup is by email alone and the session lives in the browser. When M3
   * lands, this signature grows a credential argument and the session moves
   * to an httpOnly cookie — the components above it do not change.
   */
  getMemberByEmail(email: string): Promise<MemberAccount | null>;

  /** Create an account. Rejects an email that already has one. */
  createMember(input: NewMemberInput): Promise<MemberAccount>;

  /* ----------------------------- back office ----------------------------- */

  /**
   * Operator reads for the Employee and Master Admin consoles. Newest first
   * wherever order matters. At M3 each becomes a role-checked query; staff
   * writes (status changes, payouts, templates) arrive with them — M2's
   * consoles hold edits in page state only.
   */
  listReservations(): Promise<Reservation[]>;
  listDrivers(): Promise<Driver[]>;
  listCustomers(): Promise<Customer[]>;
  listPartners(): Promise<Partner[]>;
  listPayouts(): Promise<Payout[]>;
  listStaff(): Promise<StaffMember[]>;
  listPlanPurchases(): Promise<PlanPurchase[]>;
  listAuditLog(): Promise<AuditEntry[]>;
  listAlerts(): Promise<OpsAlert[]>;
  listTemplates(): Promise<MessageTemplate[]>;
  listPromos(): Promise<Promo[]>;
  listSeoPages(): Promise<SeoPage[]>;
  listHealthChecks(): Promise<HealthCheck[]>;
  getRevenue(): Promise<RevenueMonth[]>;
  getPlatformSettings(): Promise<PlatformSettings>;
}

/** Headline figures shown on the home, about and partner pages. */
export interface SiteStats {
  carCount: number;
  homeCount: number;
  availableCount: number;
  memberCount: number;
  partnerCount: number;
  guestsReferred: number;
  averageRating: number;
}
