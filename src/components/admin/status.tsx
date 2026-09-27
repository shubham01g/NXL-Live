import { Badge } from "@/components/ui/primitives";
import type { BookingStatus, ListingStatus, PartnerStatus } from "@/lib/domain/types";
import type {
  DriverStatus,
  HealthState,
  LicenseStatus,
  PayoutStatus,
  PlanPurchaseStatus,
  PromoStatus,
} from "@/lib/domain/operations";

/**
 * Status vocabulary for the consoles. One label and one tone per state, so a
 * "pending" reads the same on reservations, partners and payouts. Every badge
 * carries a word, never colour alone.
 */

type Tone = "neutral" | "gold" | "success" | "warning" | "danger";
type Meta = { label: string; tone: Tone };

export const BOOKING_META: Record<BookingStatus, Meta> = {
  pending: { label: "Pending", tone: "warning" },
  confirmed: { label: "Confirmed", tone: "gold" },
  checked_out: { label: "On the road", tone: "success" },
  active: { label: "In stay", tone: "success" },
  completed: { label: "Completed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const LISTING_META: Record<ListingStatus, Meta> = {
  available: { label: "Available", tone: "success" },
  booked: { label: "Booked", tone: "gold" },
  maintenance: { label: "In service", tone: "warning" },
};

const DRIVER_META: Record<DriverStatus, Meta> = {
  available: { label: "Available", tone: "success" },
  "on-delivery": { label: "On delivery", tone: "gold" },
  "off-duty": { label: "Off duty", tone: "neutral" },
};

const LICENSE_META: Record<LicenseStatus, Meta> = {
  verified: { label: "Licence verified", tone: "success" },
  pending: { label: "Licence in review", tone: "warning" },
  expired: { label: "Licence expired", tone: "danger" },
};

const PARTNER_META: Record<PartnerStatus, Meta> = {
  active: { label: "Active", tone: "success" },
  pending: { label: "Awaiting review", tone: "warning" },
  paused: { label: "Paused", tone: "neutral" },
};

const PAYOUT_META: Record<PayoutStatus, Meta> = {
  scheduled: { label: "Scheduled", tone: "gold" },
  processing: { label: "Processing", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

const PLAN_META: Record<PlanPurchaseStatus, Meta> = {
  active: { label: "Active", tone: "success" },
  depleted: { label: "Depleted", tone: "neutral" },
  refunded: { label: "Refunded", tone: "danger" },
};

const PROMO_META: Record<PromoStatus, Meta> = {
  active: { label: "Live", tone: "success" },
  scheduled: { label: "Scheduled", tone: "gold" },
  expired: { label: "Expired", tone: "neutral" },
  paused: { label: "Paused", tone: "warning" },
};

const HEALTH_META: Record<HealthState, Meta> = {
  operational: { label: "Operational", tone: "success" },
  degraded: { label: "Degraded", tone: "warning" },
  "not-connected": { label: "Not connected yet", tone: "neutral" },
};

const KINDS = {
  booking: BOOKING_META,
  listing: LISTING_META,
  driver: DRIVER_META,
  license: LICENSE_META,
  partner: PARTNER_META,
  payout: PAYOUT_META,
  plan: PLAN_META,
  promo: PROMO_META,
  health: HEALTH_META,
} as const;

type Kinds = typeof KINDS;

export function Status<K extends keyof Kinds>({
  kind,
  value,
}: {
  kind: K;
  value: keyof Kinds[K];
}) {
  const meta = (KINDS[kind] as Record<string, Meta>)[value as string];
  return (
    <Badge tone={meta.tone} className="whitespace-nowrap">
      {meta.label}
    </Badge>
  );
}
