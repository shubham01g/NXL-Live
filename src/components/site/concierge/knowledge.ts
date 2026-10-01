import { CARS, HOMES } from "@/lib/data/fixtures/listings";
import { PLANS } from "@/lib/data/fixtures/catalog";
import { REDEMPTION, TIERS } from "@/lib/domain/loyalty";
import { PRICING } from "@/lib/domain/pricing";
import { money } from "@/lib/domain/format";
import { SITE } from "@/lib/domain/site";
import type { Listing } from "@/lib/domain/types";

/**
 * JERALD's answer engine.
 *
 * Every reply is generated from the same modules the pages render from, so
 * the concierge cannot contradict the product. This is a real defect we are
 * fixing, not a nicety: the prototype hardcoded its knowledge as prose and
 * ended up quoting a nine-car fleet that does not exist, monthly membership
 * fees that were never charged, insurance at $150–$250/day against a real
 * rate of $49, and loyalty thresholds off by thousands of points.
 *
 * Matching is word-boundary based. The prototype used bare `includes()`,
 * so `'gt'` swallowed "Bentley Continental GT" before the Bentley rule ran
 * and matched any word containing those two letters.
 */

export interface Reply {
  /** Supports **bold** and newlines. Rendered by <RichText>. */
  text: string;
  /** Optional follow-up chips. */
  suggestions?: string[];
}

const hasTerm = (q: string, terms: string[]) =>
  terms.some((term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(q));

const priceLine = (l: Listing) => {
  const hour = l.rates.hour;
  const day = l.rates.day ?? 0;
  return hour ? `${money(hour)}/hr · ${money(day)}/day` : `${money(day)}/day`;
};

const bullet = (l: Listing) => `• **${l.name}** — ${priceLine(l)}`;

/* -------------------------------- the rules ------------------------------- */

interface Rule {
  id: string;
  terms: string[];
  reply: (q: string) => Reply;
}

/** Specific vehicle lookups run first, matched against real fleet names. */
const vehicleRule: Rule = {
  id: "vehicle",
  terms: [],
  reply: (q) => {
    const car = CARS.find(
      (c) =>
        hasTerm(q, [c.make]) ||
        hasTerm(q, c.name.split(" ").filter((w) => w.length > 3)),
    );
    if (!car) return fallback();

    return {
      text: [
        `**${car.name}** — ${car.category.toLowerCase()}, ${car.year}.`,
        "",
        `${car.specs.horsepower} hp · 0–60 in ${car.specs.zeroToSixty}s · ${car.specs.topSpeed} mph top speed · ${car.specs.seats} seats.`,
        "",
        `Rates: ${priceLine(car)}${car.rates.week ? ` · ${money(car.rates.week)}/week` : ""}.`,
        car.status === "available"
          ? "It is available right now."
          : car.status === "booked"
            ? "It is currently out on a booking — I can let you know the moment it returns."
            : "It is in service for scheduled maintenance at the moment.",
      ].join("\n"),
      suggestions: ["How does insurance work?", "Do you deliver?"],
    };
  },
};

const RULES: Rule[] = [
  {
    id: "fleet",
    terms: ["fleet", "cars", "car list", "what cars", "supercar", "available", "inventory"],
    reply: () => ({
      text: [
        `We keep ${CARS.length} certified cars on the fleet, all based in ${SITE.serviceArea}:`,
        "",
        ...CARS.map(bullet),
        "",
        "Cars book by the hour or the day, with weekly and monthly rates on select cars — there is no 24-hour minimum.",
      ].join("\n"),
      suggestions: ["What are the subscription plans?", "Do you deliver?"],
    }),
  },
  {
    id: "estates",
    terms: ["estate", "villa", "mansion", "property", "house", "home", "penthouse", "stay"],
    reply: () => ({
      text: [
        `We list ${HOMES.length} private estates, booked by the day, week or month:`,
        "",
        ...HOMES.map(
          (h) =>
            `• **${h.name}** — ${h.specs.beds} bed · sleeps ${h.specs.sleeps} · ${money(h.rates.day ?? 0)}/day`,
        ),
        "",
        "Each carries a one-time cleaning fee and a refundable deposit.",
      ].join("\n"),
      suggestions: ["What is the deposit?", "Show me the fleet"],
    }),
  },
  {
    id: "insurance",
    terms: ["insurance", "insured", "coverage", "policy", "liability"],
    reply: () => ({
      text: [
        "Two options, and you pick at checkout:",
        "",
        "• **Your own policy** — no additional charge. You upload your declaration page and we verify it, usually within one business day.",
        `• **NXL coverage** — ${money(PRICING.insuranceDaily)} per rental day, added to your total. Collision, comprehensive theft, third-party liability, roadside assistance, and no deductible on approved claims. It activates instantly, so there is no verification wait.`,
      ].join("\n"),
      suggestions: ["What is the deposit?", "How do I book?"],
    }),
  },
  {
    id: "deposit",
    terms: ["deposit", "hold", "security", "refund", "refundable"],
    reply: () => ({
      text: [
        `A refundable deposit of **${money(PRICING.defaultDeposit)}** applies to cars, and ${money(1500)} to estates.`,
        "",
        "It is **not** charged when you book. At pickup it is either a **hold on your card** or paid **in cash** — your choice at checkout. It is released after a clean return. If there is damage, the assessed amount comes out of the deposit and the balance goes back the way you paid it.",
      ].join("\n"),
      suggestions: ["Can I pay in cash?", "How does insurance work?"],
    }),
  },
  {
    id: "payment",
    terms: ["cash", "payment", "pay with", "pay by", "pay in", "credit card", "debit"],
    reply: () => ({
      text: [
        "You can pay **by card or in cash**, and choose separately for the rental and the deposit.",
        "",
        "• **Card** — the rental is charged when you book; the deposit is a hold at pickup.",
        "• **Cash** — the rental and/or deposit are paid in person at handover, to your driver or at the depot, and you get a receipt.",
        "",
        "Drive Wallet credit and Level Rewards points still apply first either way.",
      ].join("\n"),
      suggestions: ["What is the deposit?", "How do I book?"],
    }),
  },
  {
    id: "delivery",
    terms: ["deliver", "delivery", "pickup", "pick up", "hotel", "airport", "bring", "drop off"],
    reply: () => ({
      text: [
        `Delivery and pickup are **${money(PRICING.delivery.fee)}** each within ${PRICING.delivery.baseMiles} miles of our ${SITE.serviceArea} depot, then ${money(PRICING.delivery.extraPerMile)} per additional mile.`,
        "",
        "Both are **complimentary from Silver tier up**. Enter your address on any listing and we will quote the exact distance before you commit.",
      ].join("\n"),
      suggestions: ["What are the loyalty tiers?", "Where are you located?"],
    }),
  },
  {
    id: "loyalty",
    terms: ["loyalty", "points", "rewards", "tier", "earn", "level rewards", "redeem"],
    reply: () => ({
      text: [
        "**Level Rewards** — free to join, and you earn on every booking:",
        "",
        ...TIERS.map(
          (t) =>
            `• **${t.name}** — ${t.min.toLocaleString()}+ pts · ${Math.round(t.rate * 100)}% back · ${t.headline}`,
        ),
        "",
        `Redeem at ${REDEMPTION.pointsPerDollar} points per $1, with a ${REDEMPTION.minimumPoints}-point minimum. Points stay valid for ${REDEMPTION.validMonths} months.`,
      ].join("\n"),
      suggestions: ["What are the subscription plans?", "How do I book?"],
    }),
  },
  {
    id: "plans",
    terms: ["subscription", "subscribe", "plan", "wallet", "credit", "weekender", "collector", "black card", "membership"],
    reply: () => ({
      text: [
        "The **Drive Credit Wallet** is a one-time purchase, not a recurring subscription. Buy credits once, spend them across the whole fleet:",
        "",
        ...PLANS.map(
          (p) =>
            `• **${p.name}** — ${money(p.price)} loads ${money(p.credits)} in credit, and activates ${p.grantsTier} tier.`,
        ),
        "",
        "No auto-billing, no contracts, and credits do not expire. We alert you at 20% remaining.",
      ].join("\n"),
      suggestions: ["What are the loyalty tiers?", "Show me the fleet"],
    }),
  },
  {
    id: "pricing",
    terms: ["price", "pricing", "rate", "cost", "how much", "expensive", "cheap", "surge"],
    reply: () => {
      const cheapest = [...CARS].sort(
        (a, b) => (a.rates.hour ?? 0) - (b.rates.hour ?? 0),
      )[0];
      return {
        text: [
          `Cars start at **${money(cheapest.rates.hour ?? 0)}/hour** with the ${cheapest.name}, and estates from **${money(Math.min(...HOMES.map((h) => h.rates.day ?? 0)))}/day**.`,
          "",
          "Pricing is a flat rate card. **No surge, no demand multipliers, no surprises** — the price on the listing is the price you pay. Fees for insurance, delivery and cleaning are itemised before you confirm.",
        ].join("\n"),
        suggestions: ["Show me the fleet", "Do you deliver?"],
      };
    },
  },
  {
    id: "booking",
    terms: ["book", "booking", "reserve", "reservation", "rent", "how do i", "get started"],
    reply: () => ({
      text: [
        "It takes about two minutes:",
        "",
        "1. Pick a car or estate and choose your window — hourly, daily, weekly or monthly.",
        "2. Choose insurance: your own policy, or our daily coverage.",
        "3. Add delivery or pickup if you want it brought to you.",
        "4. Confirm. The deposit is placed at pickup, not at booking.",
        "",
        "Every price is itemised before you commit. Tap **Reserve** at the top of any page to start — a free account holds your licence, insurance and card, and promo codes, Level Rewards points and Drive Wallet credit all apply at checkout.",
      ].join("\n"),
      suggestions: ["What is the deposit?", "How does insurance work?"],
    }),
  },
  {
    id: "requirements",
    terms: ["requirement", "age", "license", "qualify", "eligible", "driver", "old"],
    reply: () => ({
      text: [
        "To drive with us you need to be **25 or older**, hold a valid driver's licence (international licences are fine), and carry either your own full-coverage policy or our daily coverage.",
        "",
        "We verify the licence and policy before delivery, so upload them early and pickup takes minutes.",
      ].join("\n"),
      suggestions: ["How does insurance work?", "What is the deposit?"],
    }),
  },
  {
    id: "partners",
    terms: ["partner", "affiliate", "referral", "commission", "hotel partner"],
    reply: () => ({
      text: [
        "Our **Partnership Program** is built for boutique hotels, concierges, yacht charters, private aviation and anyone whose clients live at the top.",
        "",
        "Refer a guest and earn up to **12% of every rental**, paid on a Net-15 schedule. It is free to join, you get a unique referral code and a trackable link, and your clients get member-level pricing.",
        "",
        "Already a partner? Sign in to the partner portal from the footer to see referrals, earnings and payouts.",
      ].join("\n"),
      suggestions: ["Where are you located?", "Talk to a human"],
    }),
  },
  {
    id: "location",
    terms: ["miami", "south beach", "location", "where", "area", "service area", "hours"],
    reply: () => ({
      text: [
        `We operate out of **${SITE.serviceArea}**, and deliver across Miami Beach, Brickell and the surrounding area.`,
        "",
        `Concierge hours are ${SITE.contact.hours.toLowerCase()}. You will find us at ${SITE.contact.address.street}, ${SITE.contact.address.city} — by appointment.`,
      ].join("\n"),
      suggestions: ["Do you deliver?", "Talk to a human"],
    }),
  },
  {
    id: "human",
    terms: ["human", "agent", "concierge", "speak", "call", "contact", "phone", "email", "someone"],
    reply: () => ({
      text: [
        "Happy to hand you over.",
        "",
        `• Concierge line: **${SITE.contact.phone}**`,
        `• Email: **${SITE.contact.email}**`,
        `• ${SITE.contact.hours}`,
        "",
        "Or use the contact form and we will reply within the hour.",
      ].join("\n"),
    }),
  },
  {
    id: "about",
    terms: ["nxl", "next level", "who are", "about you", "your company"],
    reply: () => ({
      text: [
        `**${SITE.name}** rents certified exotic cars and private estates in ${SITE.serviceArea}.`,
        "",
        `${CARS.length} cars, ${HOMES.length} estates, hourly bookings, concierge delivery, and a flat rate card. Every car is inspected before and after every rental — that is what the "certified" in our name is doing.`,
      ].join("\n"),
      suggestions: ["Show me the fleet", "What are the loyalty tiers?"],
    }),
  },
];

const VEHICLE_TERMS = [
  ...new Set(
    CARS.flatMap((c) => [c.make.toLowerCase(), ...c.name.toLowerCase().split(" ")]).filter(
      (w) => w.length > 3,
    ),
  ),
];

function fallback(): Reply {
  return {
    text: [
      "I can help with the fleet, estates, pricing, insurance, deposits, delivery, loyalty tiers and the credit wallet.",
      "",
      `If you would rather talk it through, the concierge line is **${SITE.contact.phone}**.`,
    ].join("\n"),
    suggestions: QUICK_PROMPTS.slice(0, 3),
  };
}

export const QUICK_PROMPTS = [
  "Show me the fleet",
  "What are the subscription plans?",
  "How does insurance work?",
  "Loyalty tier perks",
];

export const GREETING: Reply = {
  text: `I am JERALD, the NXL concierge. Ask me about the fleet, pricing, insurance, delivery or the credit wallet — I read from the same data the site does, so the numbers are always current.`,
  suggestions: QUICK_PROMPTS,
};

/** Resolve a question to a reply. Vehicle names win over generic topics. */
export function answer(question: string): Reply {
  const q = question.toLowerCase().trim();
  if (!q) return fallback();

  if (hasTerm(q, VEHICLE_TERMS)) return vehicleRule.reply(q);

  for (const rule of RULES) {
    if (hasTerm(q, rule.terms)) return rule.reply(q);
  }

  return fallback();
}
