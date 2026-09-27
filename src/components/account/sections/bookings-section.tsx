"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { money } from "@/lib/domain/format";
import { unitLabel } from "@/lib/domain/pricing";
import type { Reservation } from "@/lib/domain/operations";
import { useMember } from "@/lib/auth/use-session";
import { listingFor, useMemberBookings } from "@/lib/data/member-bookings";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Media } from "@/components/ui/media";
import { Tabs } from "@/components/ui/tabs";
import { Status } from "@/components/admin/status";
import { SectionHeader } from "../panel";

/** Every booking on the account — upcoming and live first, then history. */

type View = "upcoming" | "past" | "all";
const LIVE = new Set(["pending", "confirmed", "checked_out", "active"]);

export const fmtWindow = (r: Reservation) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric" }).format(new Date(r.window.start));

export function BookingsSection() {
  const member = useMember();
  const bookings = useMemberBookings(member);
  const [view, setView] = useState<View>("upcoming");
  if (!member) return null;

  const upcoming = bookings.filter((b) => LIVE.has(b.status));
  const past = bookings.filter((b) => !LIVE.has(b.status));
  const shown = view === "upcoming" ? upcoming : view === "past" ? past : bookings;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Bookings"
        description="Track deliveries live, see receipts and manage upcoming trips."
        action={
          <ButtonLink href="/cars" size="sm" variant="outline">
            New booking
          </ButtonLink>
        }
      />
      <Tabs<View>
        label="Bookings"
        value={view}
        onChange={setView}
        items={[
          { value: "upcoming", label: "Upcoming", count: upcoming.length },
          { value: "past", label: "Past", count: past.length },
          { value: "all", label: "All", count: bookings.length },
        ]}
      />
      {shown.length === 0 ? (
        <EmptyState
          title={view === "upcoming" ? "Nothing booked yet" : "No bookings here"}
          description="Reserve a car by the hour or an estate by the night — it will appear here with live delivery tracking."
          action={<ButtonLink href="/cars">Browse the fleet</ButtonLink>}
        />
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id}>
              <BookingCard r={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BookingCard({ r }: { r: Reservation }) {
  const listing = listingFor(r.listingId);
  return (
    <Link
      href={`/account/bookings/${r.id}`}
      className="group flex flex-col gap-4 rounded-xl border border-line bg-surface-1/50 p-3 transition-colors hover:border-gold/40 sm:flex-row sm:items-center"
    >
      <Media src={listing?.photo} alt={r.listingName} aspect="4/3" className="w-full shrink-0 sm:w-36" sizes="160px" />
      <div className="min-w-0 flex-1 sm:py-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-display text-lg font-semibold text-cream">{r.listingName}</p>
          <Status kind="booking" value={r.status} />
        </div>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <CalendarDays aria-hidden width={14} height={14} />
          {fmtWindow(r)} · {unitLabel(r.unit, r.qty)}
        </p>
        {r.deliveryAddress ? (
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-dim">
            <MapPin aria-hidden width={13} height={13} />
            {r.deliveryAddress}
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:pr-2">
        <div className="sm:text-right">
          <p className="font-mono text-base tabular-nums text-cream">{money(r.total)}</p>
          <p className="font-mono text-xs text-muted-dim">{r.reference}</p>
        </div>
        <ArrowRight aria-hidden width={16} height={16} className="text-gold transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
