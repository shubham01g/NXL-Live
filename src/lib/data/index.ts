import type { Repository, SiteStats } from "./repository";
import type { ListingKind, MemberAccount, NewMemberInput } from "@/lib/domain/types";
import { CARS, HOMES, LISTINGS } from "./fixtures/listings";
import { PLANS, REVIEWS } from "./fixtures/catalog";
import { blankMember, DEMO_MEMBER } from "./fixtures/member";

/**
 * In-memory implementation of Repository, used for M1 and M2.
 *
 * Replace this module's export at M3 with a Supabase-backed implementation.
 * Nothing else in the app should need to change.
 */

/** Demo figures that will come from real tables at M3. */
const DEMO_COUNTS = {
  members: 1_284,
  partners: 27,
  guestsReferred: 612,
} as const;

const fixtureRepository: Repository = {
  async listCars() {
    return CARS;
  },

  async listHomes() {
    return HOMES;
  },

  async listListings() {
    return LISTINGS;
  },

  async getListing(kind: ListingKind, slug: string) {
    return LISTINGS.find((l) => l.kind === kind && l.slug === slug) ?? null;
  },

  async listReviews(listingId: string) {
    return REVIEWS.filter((r) => r.listingId === listingId).sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  },

  async listPlans() {
    return PLANS;
  },

  async getMemberByEmail(email: string): Promise<MemberAccount | null> {
    const normalized = email.trim().toLowerCase();
    return normalized === DEMO_MEMBER.email ? structuredClone(DEMO_MEMBER) : null;
  },

  async createMember(input: NewMemberInput): Promise<MemberAccount> {
    const normalized = input.email.trim().toLowerCase();
    if (normalized === DEMO_MEMBER.email) {
      throw new Error("An account already exists for that email.");
    }
    return blankMember({ ...input, email: normalized });
  },

  async getStats(): Promise<SiteStats> {
    const rated = LISTINGS.filter((l) => l.rating > 0);
    const averageRating =
      rated.reduce((sum, l) => sum + l.rating, 0) / (rated.length || 1);

    return {
      carCount: CARS.length,
      homeCount: HOMES.length,
      availableCount: LISTINGS.filter((l) => l.status === "available").length,
      memberCount: DEMO_COUNTS.members,
      partnerCount: DEMO_COUNTS.partners,
      guestsReferred: DEMO_COUNTS.guestsReferred,
      averageRating: Math.round(averageRating * 100) / 100,
    };
  },
};

export const repo: Repository = fixtureRepository;

export type { Repository, SiteStats } from "./repository";
