import type { MemberAccount, NewMemberInput } from "@/lib/domain/types";

/**
 * The demo member.
 *
 * Figures are the ones the client's prototype showed for this account —
 * 6,250 points, 14 rentals, a spent-down Weekender wallet — so the dashboard
 * they signed off on renders identically. Everything is derived from here:
 * the tier is computed from the points, never stored, so the badge and the
 * earn rate cannot disagree.
 *
 * Card and insurance are deliberately null. That is what drives the
 * "action required" banner, and it is the state a real member is in right
 * after they join.
 */

const DAY = 86_400_000;

/** Fixed so the seeded dates do not drift between server and client render. */
const SEED_NOW = Date.UTC(2026, 8, 1);

export const DEMO_EMAIL = "alex@example.com";

export const DEMO_MEMBER: MemberAccount = {
  id: "member-alex-rivera",
  name: "Alex Rivera",
  email: DEMO_EMAIL,
  phone: "(305) 555-0142",
  // Photography is client-supplied throughout; the avatar falls back to
  // initials struck on a metal plate until someone uploads one.
  photo: null,
  joinedAt: SEED_NOW - 420 * DAY,
  enrolled: true,
  points: 6_250,
  credits: 0,
  creditsLoaded: 4_000,
  activePlanId: "plan-weekender",
  lifetimeRentals: 14,
  card: null,
  insurance: null,
  address: null,
  security: {
    mfaEnabled: false,
    otpPhoneLast4: "0142",
    passwordUpdatedAt: SEED_NOW - 96 * DAY,
    recoveryCodesRemaining: 0,
  },

  rentals: [
    {
      id: "rental-1",
      reference: "NXL-8241",
      listingId: "car-cadillac-escalade-iq",
      listingSlug: "cadillac-escalade-iq",
      listingName: "Cadillac Escalade IQ",
      listingKind: "car",
      unit: "day",
      qty: 3,
      window: { start: SEED_NOW - 24 * DAY, end: SEED_NOW - 21 * DAY },
      total: 3_597,
      pointsEarned: 288,
      status: "completed",
    },
    {
      id: "rental-2",
      reference: "NXL-8102",
      listingId: "home-the-vantage",
      listingSlug: "the-vantage-ocean-drive-penthouse",
      listingName: "The Vantage",
      listingKind: "home",
      unit: "day",
      qty: 3,
      window: { start: SEED_NOW - 61 * DAY, end: SEED_NOW - 58 * DAY },
      total: 5_400,
      pointsEarned: 432,
      status: "completed",
    },
    {
      id: "rental-3",
      reference: "NXL-7977",
      listingId: "car-rolls-cullinan",
      listingSlug: "rolls-royce-cullinan-black-badge",
      listingName: "Rolls-Royce Cullinan Black Badge",
      listingKind: "car",
      unit: "hour",
      qty: 3,
      window: { start: SEED_NOW - 88 * DAY, end: SEED_NOW - 88 * DAY },
      total: 1_047,
      pointsEarned: 84,
      status: "completed",
    },
    {
      id: "rental-4",
      reference: "NXL-7715",
      listingId: "car-bentley-bentayga",
      listingSlug: "bentley-bentayga",
      listingName: "Bentley Bentayga",
      listingKind: "car",
      unit: "day",
      qty: 1,
      window: { start: SEED_NOW - 132 * DAY, end: SEED_NOW - 131 * DAY },
      total: 1_099,
      pointsEarned: 88,
      status: "completed",
    },
  ],

  wallet: [
    {
      id: "w-1",
      kind: "load",
      label: "Wallet purchase · Weekender",
      amount: 3_900,
      balanceAfter: 3_900,
      createdAt: SEED_NOW - 210 * DAY,
    },
    {
      id: "w-2",
      kind: "bonus",
      label: "Bonus credit included",
      amount: 100,
      balanceAfter: 4_000,
      createdAt: SEED_NOW - 210 * DAY,
    },
    {
      id: "w-3",
      kind: "spend",
      label: "Bentley Bentayga · 1 day",
      amount: -1_099,
      balanceAfter: 2_901,
      createdAt: SEED_NOW - 132 * DAY,
    },
    {
      id: "w-4",
      kind: "spend",
      label: "Rolls-Royce Cullinan · 3 hours",
      amount: -1_047,
      balanceAfter: 1_854,
      createdAt: SEED_NOW - 88 * DAY,
    },
    {
      id: "w-5",
      kind: "spend",
      label: "The Vantage · 3 days",
      amount: -1_854,
      balanceAfter: 0,
      createdAt: SEED_NOW - 61 * DAY,
    },
  ],
};


/** A brand-new account. Everything that drives setup prompts starts null. */
export function blankMember(input: NewMemberInput, now = Date.now()): MemberAccount {
  return {
    id: `member-${now.toString(36)}`,
    name: input.name,
    email: input.email,
    phone: input.phone,
    photo: null,
    joinedAt: now,
    enrolled: input.enrolled,
    points: 0,
    credits: 0,
    creditsLoaded: 0,
    activePlanId: null,
    lifetimeRentals: 0,
    card: null,
    insurance: null,
    address: null,
    security: {
      mfaEnabled: false,
      otpPhoneLast4: null,
      passwordUpdatedAt: null,
      recoveryCodesRemaining: 0,
    },
    rentals: [],
    wallet: [],
  };
}

/**
 * A few notifications already in the demo member's feed, so the bell and the
 * notification centre are reviewable before anyone books. Relative to now so
 * they always read as recent.
 */
export function demoNotices(now = Date.now()): import("@/lib/domain/operations").MemberNotice[] {
  const h = 3_600_000;
  return [
    {
      id: "nt-seed-1",
      email: DEMO_EMAIL,
      kind: "promo",
      title: "Art Basel week is coming",
      body: "Members get first pick of the fleet for Basel. Reserve early — the Cullinan always goes first.",
      at: now - 5 * h,
      read: false,
      href: "/cars/rolls-royce-cullinan-black-badge",
      media: { url: "/fleet/rolls-royce-cullinan-black-badge/cover.webp", type: "image" },
    },
    {
      id: "nt-seed-2",
      email: DEMO_EMAIL,
      kind: "update",
      title: "Your Drive Wallet is empty",
      body: "Top up any time to keep booking from credit — nothing auto-bills.",
      at: now - 26 * h,
      read: false,
      href: "/account/wallet",
    },
    {
      id: "nt-seed-3",
      email: DEMO_EMAIL,
      kind: "system",
      title: "Welcome to Level Rewards",
      body: "You're earning on every rental. Silver unlocks complimentary delivery and pickup.",
      at: now - 9 * 24 * h,
      read: true,
      href: "/account/rewards",
    },
  ];
}
