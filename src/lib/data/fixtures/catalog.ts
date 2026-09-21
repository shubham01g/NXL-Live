import type { Plan, Review } from "@/lib/domain/types";

const DAY = 86_400_000;
const daysAgo = (n: number) => Date.now() - n * DAY;

/**
 * Drive Credit Wallet plans.
 *
 * These are one-time purchases, not subscriptions — there is no renewal date
 * or billing cycle anywhere in the product. The prototype's Membership page
 * divided these by 100 and labelled them "/mo", contradicting every other
 * surface; the one-time framing below is the correct one.
 */
export const PLANS: Plan[] = [
  {
    id: "plan-weekender",
    slug: "weekender",
    name: "Weekender",
    tagline: "For the occasional escape.",
    price: 3_900,
    credits: 4_000,
    grantsTier: "Bronze",
    perks: [
      "$4,000 in drive credit",
      "Complimentary local delivery",
      "Bronze tier status on activation",
      "Swap between cars anytime",
    ],
    featured: false,
  },
  {
    id: "plan-collector",
    slug: "collector",
    name: "Collector",
    tagline: "A rotating garage, on your terms.",
    price: 8_900,
    credits: 9_800,
    grantsTier: "Gold",
    perks: [
      "$9,800 in drive credit",
      "Priority booking window",
      "Gold tier status on activation",
      "Two estate nights each month",
      "South Beach delivery & pickup included",
    ],
    featured: true,
  },
  {
    id: "plan-blackcard",
    slug: "black-card",
    name: "Black Card",
    tagline: "The whole fleet, no blackout dates.",
    price: 19_500,
    credits: 24_000,
    grantsTier: "Platinum",
    perks: [
      "$24,000 in drive credit",
      "Dedicated concierge, 24/7",
      "Platinum tier status on activation",
      "Unlimited estate nights",
      "Private track day invitations",
      "Zero blackout dates",
    ],
    featured: false,
  },
];

/** Business categories accepted into the partner programme. */
export const PARTNER_TYPES = [
  "Boutique Hotel",
  "Luxury Resort",
  "Nightclub & Lounge",
  "Concierge Service",
  "Travel Agency",
  "Yacht Charter",
  "Private Aviation",
  "Casino & Gaming",
  "Fine Dining & Restaurants",
  "Golf & Country Club",
  "Spa & Wellness Retreat",
  "Event & Wedding Planner",
  "Sports & Talent Agency",
  "Influencer & Media",
  "Real Estate Brokerage",
  "Corporate Travel",
  "Other",
] as const;

export const REVIEWS: Review[] = [
  {
    id: "rev-1",
    listingId: "car-huracan-evo",
    authorName: "Alex Rivera",
    rating: 5,
    comment:
      "Delivered to the hotel exactly on time, spotless, full tank. The concierge walked me through every control before handing over the keys. Booked it for three hours and immediately wished I had taken the day.",
    createdAt: daysAgo(6),
  },
  {
    id: "rev-2",
    listingId: "car-huracan-evo",
    authorName: "Priya Nair",
    rating: 5,
    comment:
      "Third time renting this exact car. Consistent every single time — that is the part nobody else gets right.",
    createdAt: daysAgo(24),
  },
  {
    id: "rev-3",
    listingId: "car-huracan-evo",
    authorName: "Marcus Lee",
    rating: 4,
    comment:
      "Incredible car and a genuinely easy process. Only note is that pickup ran about twenty minutes late, though they called ahead to tell me.",
    createdAt: daysAgo(41),
  },
  {
    id: "rev-4",
    listingId: "car-ferrari-488",
    authorName: "Jordan Blake",
    rating: 5,
    comment:
      "Took it down Ocean Drive with the top down at sunset. Worth every dollar. The pricing was exactly what the site quoted, no surprises at checkout.",
    createdAt: daysAgo(11),
  },
  {
    id: "rev-5",
    listingId: "car-ferrari-488",
    authorName: "Sofia Marín",
    rating: 5,
    comment:
      "Flawless. They handled the insurance question in about two minutes because I already had my policy uploaded.",
    createdAt: daysAgo(33),
  },
  {
    id: "rev-6",
    listingId: "car-mclaren-720s",
    authorName: "Daniel Okafor",
    rating: 5,
    comment:
      "The 720S is a different category of car and NXL treated it that way. Detailed walkthrough, no pressure, deposit returned two days after I handed it back.",
    createdAt: daysAgo(8),
  },
  {
    id: "rev-7",
    listingId: "car-porsche-911-turbo-s",
    authorName: "Hannah Weiss",
    rating: 5,
    comment:
      "My first exotic rental and they made it painless. Rented it for a full week — the weekly rate is a serious discount over daily.",
    createdAt: daysAgo(17),
  },
  {
    id: "rev-8",
    listingId: "car-porsche-911-turbo-s",
    authorName: "Tom Bradley",
    rating: 5,
    comment:
      "Booked by the hour on a whim, which is apparently the whole point. Nobody else in Miami will do that.",
    createdAt: daysAgo(29),
  },
  {
    id: "rev-9",
    listingId: "car-aventador-lp780",
    authorName: "Priya Nair",
    rating: 5,
    comment:
      "The V12 is the entire reason to book this. Loud, dramatic, and the delivery driver was as excited about it as I was.",
    createdAt: daysAgo(14),
  },
  {
    id: "rev-10",
    listingId: "car-rolls-ghost",
    authorName: "Evelyn Carter",
    rating: 5,
    comment:
      "Booked for a wedding. Arrived immaculate and the starlight headliner got more photographs than the venue did.",
    createdAt: daysAgo(21),
  },
  {
    id: "rev-11",
    listingId: "home-villa-serena",
    authorName: "Jordan Blake",
    rating: 5,
    comment:
      "We had eight people and four cars and the property absorbed all of it without feeling crowded. The motor court is not an exaggeration.",
    createdAt: daysAgo(19),
  },
  {
    id: "rev-12",
    listingId: "home-the-vantage",
    authorName: "Alex Rivera",
    rating: 5,
    comment:
      "The terrace view is the listing. Woke up to the ocean on one side and the skyline on the other. Cleaning fee is fair for the size.",
    createdAt: daysAgo(27),
  },
];
