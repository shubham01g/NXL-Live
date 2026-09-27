import type { BookingStatus, DepositStatus, RateUnit } from "@/lib/domain/types";
import type {
  AuditEntry,
  BookingChannel,
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
import { SITE } from "@/lib/domain/site";
import { LISTINGS } from "./listings";

/**
 * Back-office fixtures for M2.
 *
 * Every figure is demo data shaped like the real thing, so the consoles can
 * be reviewed end to end before M3 puts a database behind them. Dates are
 * relative to now so "today's pickups" is never an empty list.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const now = Date.now();
const at = (days: number, hours = 0) => now + days * DAY + hours * HOUR;

/* ---------------------------------- drivers -------------------------------- */

export const DRIVERS: Driver[] = [
  { id: "drv-1", name: "Marcus Hale", phone: "+1 (305) 555-0141", status: "on-delivery", license: "verified", zone: "South Beach", rating: 4.98, deliveries: 312 },
  { id: "drv-2", name: "Elena Soto", phone: "+1 (305) 555-0172", status: "available", license: "verified", zone: "Brickell", rating: 4.95, deliveries: 204 },
  { id: "drv-3", name: "Jordan Pike", phone: "+1 (305) 555-0118", status: "available", license: "verified", zone: "Wynwood", rating: 4.9, deliveries: 147 },
  { id: "drv-4", name: "Andre Laurent", phone: "+1 (305) 555-0190", status: "off-duty", license: "pending", zone: "Coral Gables", rating: 4.87, deliveries: 88 },
  { id: "drv-5", name: "Priya Nair", phone: "+1 (305) 555-0163", status: "available", license: "expired", zone: "Miami Airport", rating: 4.93, deliveries: 61 },
];

/* -------------------------------- reservations ------------------------------ */

function reservation(input: {
  n: number;
  listingId: string;
  guest: string;
  email: string;
  unit: RateUnit;
  qty: number;
  startDays: number;
  startHour?: number;
  status: BookingStatus;
  channel: BookingChannel;
  partnerCode?: string;
  driverId?: string;
  delivery?: string;
}): Reservation {
  const listing = LISTINGS.find((l) => l.id === input.listingId)!;
  const rate = listing.rates[input.unit] ?? 0;
  const subtotal = rate * input.qty;
  const tax = Math.round(subtotal * 0.07);
  const unitMs = { hour: HOUR, day: DAY, week: 7 * DAY, month: 30 * DAY }[input.unit];
  // On the hour, like real bookings — `now` carries minutes and seconds.
  const start = new Date(at(input.startDays, input.startHour ?? 10)).setMinutes(0, 0, 0);

  const depositStatus: DepositStatus =
    input.status === "completed"
      ? "refunded"
      : input.status === "cancelled"
        ? "refunded"
        : "held";

  return {
    id: `res-${input.n}`,
    reference: `NXL-${24800 + input.n}`,
    listingId: listing.id,
    listingKind: listing.kind,
    listingName: listing.name,
    guestName: input.guest,
    email: input.email,
    phone: "+1 (305) 555-01" + String(10 + input.n).slice(-2),
    unit: input.unit,
    qty: input.qty,
    window: { start, end: start + unitMs * input.qty },
    lineItems: [
      { key: "base", label: `${input.qty} × ${input.unit}`, amount: subtotal, kind: "charge" },
      { key: "tax", label: "Tax (7%)", amount: tax, kind: "charge" },
    ],
    total: subtotal + tax,
    deposit: listing.deposit,
    depositStatus,
    status: input.status,
    insurance: input.n % 3 === 0 ? "own" : "nxl",
    pointsEarned: Math.round(subtotal * 0.05),
    createdAt: start - (3 + (input.n % 9)) * DAY,
    channel: input.channel,
    partnerCode: input.partnerCode ?? null,
    driverId: input.driverId ?? null,
    deliveryAddress: input.delivery ?? null,
  };
}

export const RESERVATIONS: Reservation[] = [
  reservation({ n: 17, listingId: "car-rolls-cullinan", guest: "Alex Rivera", email: "alex@example.com", unit: "hour", qty: 6, startDays: 0, startHour: 2, status: "confirmed", channel: "web", driverId: "drv-2", delivery: "Faena Hotel, 3201 Collins Ave" }),
  reservation({ n: 16, listingId: "car-range-rover-autobiography", guest: "Sofia Marchetti", email: "sofia.m@example.com", unit: "day", qty: 2, startDays: 0, startHour: 5, status: "confirmed", channel: "partner", partnerCode: "FAENA12" }),
  reservation({ n: 15, listingId: "car-cadillac-escalade-iq", guest: "Darnell Brooks", email: "dbrooks@example.com", unit: "day", qty: 1, startDays: -1, status: "checked_out", channel: "concierge", driverId: "drv-1", delivery: "1 Hotel South Beach" }),
  reservation({ n: 14, listingId: "home-villa-serena", guest: "The Whitmore Group", email: "events@whitmore.example.com", unit: "week", qty: 1, startDays: -3, status: "active", channel: "partner", partnerCode: "LUXEVT" }),
  reservation({ n: 18, listingId: "car-bentley-bentayga", guest: "Hannah Cole", email: "hcole@example.com", unit: "day", qty: 3, startDays: 1, status: "pending", channel: "web" }),
  reservation({ n: 19, listingId: "home-the-vantage", guest: "Kenji Watanabe", email: "kenji.w@example.com", unit: "day", qty: 4, startDays: 2, status: "confirmed", channel: "web" }),
  reservation({ n: 20, listingId: "car-rolls-cullinan", guest: "Isabella Duarte", email: "isa.duarte@example.com", unit: "day", qty: 1, startDays: 3, status: "pending", channel: "concierge" }),
  reservation({ n: 21, listingId: "home-mirage-house", guest: "Omar Haddad", email: "ohaddad@example.com", unit: "week", qty: 2, startDays: 6, status: "confirmed", channel: "partner", partnerCode: "SKYJET" }),
  reservation({ n: 13, listingId: "car-cadillac-escalade-iq", guest: "Chloe Bennett", email: "chloe.b@example.com", unit: "hour", qty: 4, startDays: -2, status: "completed", channel: "web", driverId: "drv-3" }),
  reservation({ n: 12, listingId: "home-still-water", guest: "Lucas Moreau", email: "lmoreau@example.com", unit: "day", qty: 3, startDays: -9, status: "completed", channel: "web" }),
  reservation({ n: 11, listingId: "car-range-rover-autobiography", guest: "Ava Thompson", email: "ava.t@example.com", unit: "week", qty: 1, startDays: -12, status: "completed", channel: "walk-in" }),
  reservation({ n: 10, listingId: "car-bentley-bentayga", guest: "Mateo Alvarez", email: "mateo.a@example.com", unit: "day", qty: 2, startDays: -5, status: "cancelled", channel: "web" }),
  reservation({ n: 9, listingId: "car-rolls-cullinan", guest: "Grace Kim", email: "grace.kim@example.com", unit: "day", qty: 2, startDays: -16, status: "completed", channel: "partner", partnerCode: "FAENA12", driverId: "drv-1" }),
];

/* --------------------------------- customers -------------------------------- */

export const CUSTOMERS: Customer[] = [
  { id: "cus-1", name: "Alex Rivera", email: "alex@example.com", phone: "+1 (305) 555-0101", tier: "Gold", points: 2480, credits: 640, rentals: 11, lifetimeSpend: 18_420, joinedAt: at(-410), enrolled: true, flagged: false },
  { id: "cus-2", name: "Sofia Marchetti", email: "sofia.m@example.com", phone: "+1 (786) 555-0144", tier: "Platinum", points: 9120, credits: 12_400, rentals: 26, lifetimeSpend: 61_300, joinedAt: at(-620), enrolled: true, flagged: false },
  { id: "cus-3", name: "Darnell Brooks", email: "dbrooks@example.com", phone: "+1 (305) 555-0188", tier: "Silver", points: 1180, credits: 0, rentals: 5, lifetimeSpend: 7_950, joinedAt: at(-190), enrolled: true, flagged: false },
  { id: "cus-4", name: "Hannah Cole", email: "hcole@example.com", phone: "+1 (954) 555-0120", tier: "Bronze", points: 240, credits: 0, rentals: 1, lifetimeSpend: 1_199, joinedAt: at(-21), enrolled: true, flagged: false },
  { id: "cus-5", name: "Kenji Watanabe", email: "kenji.w@example.com", phone: "+1 (212) 555-0199", tier: "Gold", points: 3610, credits: 2_150, rentals: 9, lifetimeSpend: 24_800, joinedAt: at(-330), enrolled: true, flagged: false },
  { id: "cus-6", name: "Isabella Duarte", email: "isa.duarte@example.com", phone: "+1 (305) 555-0133", tier: "Silver", points: 1420, credits: 380, rentals: 4, lifetimeSpend: 6_240, joinedAt: at(-150), enrolled: true, flagged: false },
  { id: "cus-7", name: "Omar Haddad", email: "ohaddad@example.com", phone: "+971 50 555 0102", tier: "Platinum", points: 11_050, credits: 18_900, rentals: 19, lifetimeSpend: 88_600, joinedAt: at(-540), enrolled: true, flagged: false },
  { id: "cus-8", name: "Chloe Bennett", email: "chloe.b@example.com", phone: "+1 (305) 555-0176", tier: "Bronze", points: 410, credits: 0, rentals: 2, lifetimeSpend: 1_590, joinedAt: at(-44), enrolled: true, flagged: false },
  { id: "cus-9", name: "Mateo Alvarez", email: "mateo.a@example.com", phone: "+1 (786) 555-0107", tier: "Bronze", points: 0, credits: 0, rentals: 0, lifetimeSpend: 0, joinedAt: at(-9), enrolled: false, flagged: true },
  { id: "cus-10", name: "Grace Kim", email: "grace.kim@example.com", phone: "+1 (415) 555-0161", tier: "Gold", points: 4020, credits: 1_100, rentals: 12, lifetimeSpend: 29_700, joinedAt: at(-470), enrolled: true, flagged: false },
  { id: "cus-11", name: "Lucas Moreau", email: "lmoreau@example.com", phone: "+33 6 55 50 01 22", tier: "Silver", points: 1960, credits: 0, rentals: 3, lifetimeSpend: 10_280, joinedAt: at(-260), enrolled: true, flagged: false },
  { id: "cus-12", name: "Ava Thompson", email: "ava.t@example.com", phone: "+1 (305) 555-0152", tier: "Silver", points: 1570, credits: 220, rentals: 6, lifetimeSpend: 9_870, joinedAt: at(-300), enrolled: true, flagged: false },
];

/* --------------------------------- partners -------------------------------- */

export const PARTNERS: Partner[] = [
  { id: "ptn-1", business: "Faena Hotel Miami Beach", contact: "Lucia Ferraro", email: "concierge@faena.example.com", phone: "+1 (305) 555-0310", type: "Luxury Resort", status: "active", code: "FAENA12", commission: 12, referrals: 48, earnings: 21_640, paidOut: 18_200, joinedAt: at(-380) },
  { id: "ptn-2", business: "SkyJet Private Aviation", contact: "Ryan Castellanos", email: "ryan@skyjet.example.com", phone: "+1 (305) 555-0322", type: "Private Aviation", status: "active", code: "SKYJET", commission: 10, referrals: 31, earnings: 14_900, paidOut: 12_400, joinedAt: at(-300) },
  { id: "ptn-3", business: "Luxe Events Co.", contact: "Monique Harper", email: "monique@luxeevents.example.com", phone: "+1 (786) 555-0345", type: "Event & Wedding Planner", status: "active", code: "LUXEVT", commission: 10, referrals: 22, earnings: 9_870, paidOut: 7_500, joinedAt: at(-240) },
  { id: "ptn-4", business: "Blue Wake Yacht Charters", contact: "Tomás Rivera", email: "tomas@bluewake.example.com", phone: "+1 (305) 555-0367", type: "Yacht Charter", status: "active", code: "BLUEWAKE", commission: 8, referrals: 14, earnings: 5_210, paidOut: 5_210, joinedAt: at(-200) },
  { id: "ptn-5", business: "LIV Nightlife Group", contact: "Dante Moss", email: "vip@livgroup.example.com", phone: "+1 (305) 555-0389", type: "Nightclub & Lounge", status: "paused", code: "LIVVIP", commission: 8, referrals: 9, earnings: 3_040, paidOut: 3_040, joinedAt: at(-170) },
  { id: "ptn-6", business: "Coral Key Realty", contact: "Nadia Brooks", email: "nadia@coralkey.example.com", phone: "+1 (786) 555-0391", type: "Real Estate Brokerage", status: "pending", code: "CORALKEY", commission: 8, referrals: 0, earnings: 0, paidOut: 0, joinedAt: at(-3) },
  { id: "ptn-7", business: "Atlas Corporate Travel", contact: "Evan Price", email: "evan@atlastravel.example.com", phone: "+1 (212) 555-0302", type: "Corporate Travel", status: "pending", code: "ATLASCT", commission: 8, referrals: 0, earnings: 0, paidOut: 0, joinedAt: at(-1) },
];

/* ---------------------------------- payouts -------------------------------- */

const month = (offset: number) => {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth() + offset, 1).getTime();
};

export const PAYOUTS: Payout[] = [
  { id: "po-1", partnerId: "ptn-1", partnerName: "Faena Hotel Miami Beach", amount: 3_440, period: { start: month(-1), end: month(0) - 1 }, status: "scheduled", scheduledFor: at(4), method: "ACH" },
  { id: "po-2", partnerId: "ptn-2", partnerName: "SkyJet Private Aviation", amount: 2_500, period: { start: month(-1), end: month(0) - 1 }, status: "scheduled", scheduledFor: at(4), method: "Wire" },
  { id: "po-3", partnerId: "ptn-3", partnerName: "Luxe Events Co.", amount: 2_370, period: { start: month(-1), end: month(0) - 1 }, status: "processing", scheduledFor: at(1), method: "ACH" },
  { id: "po-4", partnerId: "ptn-1", partnerName: "Faena Hotel Miami Beach", amount: 4_120, period: { start: month(-2), end: month(-1) - 1 }, status: "paid", scheduledFor: at(-26), method: "ACH" },
  { id: "po-5", partnerId: "ptn-4", partnerName: "Blue Wake Yacht Charters", amount: 1_180, period: { start: month(-2), end: month(-1) - 1 }, status: "paid", scheduledFor: at(-26), method: "Wallet credit" },
  { id: "po-6", partnerId: "ptn-5", partnerName: "LIV Nightlife Group", amount: 640, period: { start: month(-2), end: month(-1) - 1 }, status: "failed", scheduledFor: at(-26), method: "ACH" },
  { id: "po-7", partnerId: "ptn-2", partnerName: "SkyJet Private Aviation", amount: 3_010, period: { start: month(-2), end: month(-1) - 1 }, status: "paid", scheduledFor: at(-26), method: "Wire" },
];

/* ----------------------------------- staff --------------------------------- */

export const STAFF: StaffMember[] = [
  { id: "st-1", name: "Operations Master", email: "ops@nxlexoticrentals.com", role: "master", title: "Founder / Master Admin", active: true, addedAt: at(-365), lastActiveAt: at(0, -1) },
  { id: "st-2", name: "Dana Cruz", email: "dana@nxlexoticrentals.com", role: "admin", title: "General Manager", active: true, addedAt: at(-200), lastActiveAt: at(0, -3) },
  { id: "st-3", name: "Theo Banks", email: "theo@nxlexoticrentals.com", role: "employee", title: "Fleet Concierge", active: true, addedAt: at(-60), lastActiveAt: at(0, -0.3) },
  { id: "st-4", name: "Nina Alvarez", email: "nina@nxlexoticrentals.com", role: "employee", title: "Delivery Specialist", active: true, addedAt: at(-30), lastActiveAt: at(-1) },
  { id: "st-5", name: "Chris Oduya", email: "chris@nxlexoticrentals.com", role: "employee", title: "Detailing Lead", active: false, addedAt: at(-150), lastActiveAt: at(-40) },
];

/** Who the demo consoles sign in as. */
export const DEMO_STAFF = {
  employee: STAFF[2],
  master: STAFF[0],
} as const;

/* ------------------------------- plan purchases ----------------------------- */

export const PLAN_PURCHASES: PlanPurchase[] = [
  { id: "pp-1", customerName: "Omar Haddad", customerEmail: "ohaddad@example.com", planName: "Black Card", price: 19_500, credits: 24_000, remaining: 18_900, purchasedAt: at(-18), status: "active" },
  { id: "pp-2", customerName: "Sofia Marchetti", customerEmail: "sofia.m@example.com", planName: "Black Card", price: 19_500, credits: 24_000, remaining: 12_400, purchasedAt: at(-64), status: "active" },
  { id: "pp-3", customerName: "Kenji Watanabe", customerEmail: "kenji.w@example.com", planName: "Collector", price: 8_900, credits: 9_800, remaining: 2_150, purchasedAt: at(-80), status: "active" },
  { id: "pp-4", customerName: "Grace Kim", customerEmail: "grace.kim@example.com", planName: "Weekender", price: 3_900, credits: 4_000, remaining: 1_100, purchasedAt: at(-41), status: "active" },
  { id: "pp-5", customerName: "Alex Rivera", customerEmail: "alex@example.com", planName: "Weekender", price: 3_900, credits: 4_000, remaining: 640, purchasedAt: at(-95), status: "active" },
  { id: "pp-6", customerName: "Isabella Duarte", customerEmail: "isa.duarte@example.com", planName: "Weekender", price: 3_900, credits: 4_000, remaining: 380, purchasedAt: at(-120), status: "active" },
  { id: "pp-7", customerName: "Darnell Brooks", customerEmail: "dbrooks@example.com", planName: "Weekender", price: 3_900, credits: 4_000, remaining: 0, purchasedAt: at(-170), status: "depleted" },
  { id: "pp-8", customerName: "Lucas Moreau", customerEmail: "lmoreau@example.com", planName: "Collector", price: 8_900, credits: 9_800, remaining: 0, purchasedAt: at(-210), status: "refunded" },
];

/* --------------------------------- analytics -------------------------------- */

export const REVENUE: RevenueMonth[] = [
  { month: month(-5), cars: 38_400, homes: 51_200, plans: 12_800 },
  { month: month(-4), cars: 42_900, homes: 47_600, plans: 16_700 },
  { month: month(-3), cars: 47_300, homes: 58_900, plans: 8_900 },
  { month: month(-2), cars: 55_100, homes: 63_400, plans: 28_400 },
  { month: month(-1), cars: 61_800, homes: 70_200, plans: 23_400 },
  { month: month(0), cars: 44_600, homes: 52_900, plans: 19_500 },
];

/* ------------------------------ audit & alerts ------------------------------ */

export const AUDIT_LOG: AuditEntry[] = [
  { id: "au-1", at: at(0, -0.4), actor: "Theo Banks", action: "reservation.checked_out", entity: "NXL-24815", detail: "Escalade IQ handed over · fuel 100% · 12 photos" },
  { id: "au-2", at: at(0, -1.2), actor: "Operations Master", action: "listing.rate_changed", entity: "Rolls-Royce Cullinan Black Badge", detail: "Hourly $329 → $349" },
  { id: "au-3", at: at(0, -2.5), actor: "Dana Cruz", action: "partner.approved", entity: "Luxe Events Co.", detail: "Commission set to 10%" },
  { id: "au-4", at: at(0, -4), actor: "Nina Alvarez", action: "driver.assigned", entity: "NXL-24817", detail: "Elena Soto → Faena Hotel" },
  { id: "au-5", at: at(-1, -1), actor: "Operations Master", action: "promo.created", entity: "MIAMI200", detail: "$200 off estates over $2,000" },
  { id: "au-6", at: at(-1, -5), actor: "System", action: "payout.failed", entity: "LIV Nightlife Group", detail: "ACH returned — account closed (R02)" },
  { id: "au-7", at: at(-2), actor: "Theo Banks", action: "listing.status_changed", entity: "Bentley Bentayga", detail: "Available → In service (detailing)" },
  { id: "au-8", at: at(-2, -3), actor: "Dana Cruz", action: "staff.added", entity: "Nina Alvarez", detail: "Role: employee · Delivery Specialist" },
  { id: "au-9", at: at(-3), actor: "System", action: "wallet.low_balance", entity: "Alex Rivera", detail: "Balance under 20% of loaded credits" },
  { id: "au-10", at: at(-4), actor: "Operations Master", action: "settings.updated", entity: "Platform", detail: "Delivery fee $125 → $150" },
  { id: "au-11", at: at(-6), actor: "Operations Master", action: "template.updated", entity: "Booking confirmation", detail: "Subject line revised" },
];

export const ALERTS: OpsAlert[] = [
  { id: "al-1", at: at(0, -0.2), kind: "booking", title: "New reservation pending", body: "Hannah Cole requested the Bentley Bentayga for 3 days from tomorrow.", read: false },
  { id: "al-2", at: at(0, -1.5), kind: "fleet", title: "Pickup in 2 hours", body: "Cullinan Black Badge → Faena Hotel. Driver: Elena Soto.", read: false },
  { id: "al-3", at: at(0, -3), kind: "partner", title: "2 partner applications", body: "Coral Key Realty and Atlas Corporate Travel are waiting for review.", read: false },
  { id: "al-4", at: at(-1, -5), kind: "payment", title: "Payout failed", body: "LIV Nightlife Group — ACH returned. Update their bank details.", read: true },
  { id: "al-5", at: at(-2), kind: "fleet", title: "Driver licence expired", body: "Priya Nair's licence expired. She cannot be assigned until renewed.", read: true },
  { id: "al-6", at: at(-3), kind: "system", title: "Payments not yet connected", body: "Checkout runs in demo mode until the payment processor is wired in Milestone 5.", read: true },
];

/* --------------------------------- messaging -------------------------------- */

export const TEMPLATES: MessageTemplate[] = [
  { id: "tpl-1", name: "Booking confirmation", channel: "email", trigger: "Reservation confirmed", subject: "You're set, {{guest_name}} — {{listing_name}} is reserved", body: "Hi {{guest_name}},\n\nYour reservation {{reference}} is confirmed. We'll deliver {{listing_name}} on {{pickup_time}}.\n\nTotal charged: {{total}}\nRefundable deposit held: {{deposit}}\n\nYour concierge will text you 30 minutes before arrival.\n\n— NXL Concierge", enabled: true, updatedAt: at(-6) },
  { id: "tpl-2", name: "Pickup reminder", channel: "sms", trigger: "2 hours before pickup", subject: "", body: "NXL: {{listing_name}} arrives {{pickup_time}}. Reply HELP for your concierge. Ref {{reference}}", enabled: true, updatedAt: at(-20) },
  { id: "tpl-3", name: "Deposit released", channel: "email", trigger: "Check-in inspection passed", subject: "Your {{deposit}} deposit has been released", body: "Hi {{guest_name}},\n\nThanks for driving with us. Your inspection for {{reference}} passed and your {{deposit}} deposit has been released.\n\nYou earned {{points}} Level Rewards points on this trip.", enabled: true, updatedAt: at(-31) },
  { id: "tpl-4", name: "Low wallet balance", channel: "email", trigger: "Wallet under 20%", subject: "Your Drive Wallet is running low", body: "Hi {{guest_name}},\n\nYour Drive Wallet is down to {{wallet_balance}}. Top up now to keep priority booking.", enabled: true, updatedAt: at(-44) },
  { id: "tpl-5", name: "One-time passcode", channel: "sms", trigger: "Sign-in / 2FA", subject: "", body: "Your NXL code is 482913. It expires in 10 minutes. We will never ask for it by phone.", enabled: true, updatedAt: at(-60) },
  { id: "tpl-6", name: "Review request", channel: "email", trigger: "24h after return", subject: "How was the {{listing_name}}?", body: "Hi {{guest_name}},\n\nTell us about your trip — it takes a minute and earns you 50 bonus points.", enabled: false, updatedAt: at(-72) },
];

/* --------------------------------- marketing -------------------------------- */

export const PROMOS: Promo[] = [
  { id: "pr-1", code: "WELCOME10", description: "10% off a first booking", type: "percent", value: 10, appliesTo: "all", uses: 34, maxUses: null, expiresAt: null, status: "active" },
  { id: "pr-2", code: "MIAMI200", description: "$200 off estate stays over $2,000", type: "flat", value: 200, appliesTo: "homes", uses: 18, maxUses: 50, expiresAt: at(14), status: "active" },
  { id: "pr-3", code: "ARTBASEL", description: "15% off cars during Art Basel week", type: "percent", value: 15, appliesTo: "cars", uses: 0, maxUses: 40, expiresAt: at(70), status: "scheduled" },
  { id: "pr-4", code: "FREEDELIVER", description: "Free delivery on any booking", type: "free-delivery", value: 150, appliesTo: "cars", uses: 20, maxUses: 20, expiresAt: at(-1), status: "expired" },
];

/* ------------------------------------ seo ----------------------------------- */

export const SEO_PAGES: SeoPage[] = [
  { path: "/", title: "Exotic Car & Luxury Home Rentals in Miami | NXL", description: "Rent a Rolls-Royce by the hour or a private estate by the night. Concierge delivery across South Beach, Miami. Transparent pricing, no surge.", keyword: "exotic car rental miami", indexed: true },
  { path: "/cars", title: "Exotic Cars for Rent in Miami — Hourly, Daily & Weekly | NXL", description: "Rolls-Royce Cullinan, Bentley Bentayga, Range Rover and Escalade IQ, delivered to your door in South Beach.", keyword: "rolls royce rental miami", indexed: true },
  { path: "/homes", title: "Luxury Villa & Penthouse Rentals Miami Beach | NXL", description: "Oceanfront estates and penthouses by the day, week or month, with the same concierge service as our fleet.", keyword: "luxury villa rental miami beach", indexed: true },
  { path: "/subscriptions", title: "Drive Wallet Plans | NXL", description: "Load drive credits once, earn bonus credit and an elevated loyalty tier.", keyword: "exotic car subscription", indexed: true },
  { path: "/partners", title: "Partner Program — Earn on Every Referral | NXL", description: "Hotels, concierges and charters earn commission on every rental they refer.", keyword: "", indexed: true },
  { path: "/account", title: "Your Account | NXL", description: "", keyword: "", indexed: false },
];

/* ----------------------------------- system --------------------------------- */

export const HEALTH_CHECKS: HealthCheck[] = [
  { id: "web", name: "Website & app", state: "operational", detail: "All public pages prerendered and served from the edge", milestone: null },
  { id: "media", name: "Fleet media", state: "operational", detail: "Optimised WebP served from the CDN", milestone: null },
  { id: "db", name: "Database", state: "not-connected", detail: "Consoles read demo data. Supabase replaces it with live records.", milestone: "Milestone 3" },
  { id: "auth", name: "Staff & member auth", state: "not-connected", detail: "Demo sign-in only. Real accounts, OTP and 2FA arrive with the database.", milestone: "Milestone 3" },
  { id: "pay", name: "Payment processor", state: "not-connected", detail: "Checkout, deposits, refunds and payouts run in demo mode.", milestone: "Milestone 5" },
  { id: "email", name: "SendGrid email", state: "not-connected", detail: "Templates are editable; nothing is sent yet.", milestone: "Milestone 5" },
  { id: "sms", name: "Twilio SMS", state: "not-connected", detail: "SMS templates and OTP delivery wired at launch.", milestone: "Milestone 5" },
];

export const PLATFORM_SETTINGS: PlatformSettings = {
  businessName: SITE.name,
  supportEmail: SITE.contact.supportEmail,
  supportPhone: SITE.contact.phone,
  address: `${SITE.contact.address.street}, ${SITE.contact.address.city}, ${SITE.contact.address.state} ${SITE.contact.address.zip}`,
  hours: SITE.contact.hours,
  taxRate: 0.07,
  deliveryFee: 150,
  defaultCarDeposit: 750,
  lowBalanceThreshold: 0.2,
  pointsPerDollar: 1,
  hourlyBookings: true,
  maintenanceMode: false,
};
