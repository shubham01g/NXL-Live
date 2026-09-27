"use client";

import Link from "next/link";
import { ArrowRight, BellRing, Car, Home } from "lucide-react";
import { Panel } from "@/components/account/panel";
import { StatGrid } from "@/components/ui/layout";
import { money, relativeTime } from "@/lib/domain/format";
import type { Listing } from "@/lib/domain/types";
import type { Driver, OpsAlert, Payout, Reservation, RevenueMonth } from "@/lib/domain/operations";
import { useStaff } from "@/lib/auth/staff-session";
import { C } from "@/lib/data/demo";
import { useCollection } from "@/lib/data/demo-store";
import { FleetMap } from "@/components/maps/fleet-map";
import { PageHeader } from "../ui";
import { Status } from "../status";

const DAY = 86_400_000;

const time = (ms: number) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(ms));

export function OverviewScreen({
  reservations: baseReservations,
  listings,
  drivers: baseDrivers,
  alerts: baseAlerts,
  revenue,
  payouts,
}: {
  reservations: Reservation[];
  listings: Listing[];
  drivers: Driver[];
  alerts: OpsAlert[];
  revenue: RevenueMonth[];
  payouts: Payout[];
}) {
  const reservations = useCollection<Reservation>(C.reservations, baseReservations);
  const drivers = useCollection<Driver>(C.drivers, baseDrivers);
  const alerts = useCollection<OpsAlert>(C.alerts, baseAlerts);
  const session = useStaff();
  const staff = session.status === "signed-in" ? session.staff : null;
  const isMaster = staff?.role === "master";

  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const endOfDay = startOfDay + DAY;
  const inToday = (ms: number) => ms >= startOfDay && ms < endOfDay;

  const pickups = reservations.filter(
    (r) => inToday(r.window.start) && r.status !== "cancelled",
  );
  const returns = reservations.filter(
    (r) => inToday(r.window.end) && (r.status === "checked_out" || r.status === "active"),
  );
  const schedule = [
    ...pickups.map((r) => ({ r, at: r.window.start, kind: "Pickup" as const })),
    ...returns.map((r) => ({ r, at: r.window.end, kind: "Return" as const })),
  ].sort((a, b) => a.at - b.at);

  const onRoad = reservations.filter((r) => r.status === "checked_out" || r.status === "active");
  const pending = reservations.filter((r) => r.status === "pending");
  const available = listings.filter((l) => l.status === "available").length;
  const freeDrivers = drivers.filter((d) => d.status === "available" && d.license === "verified");

  const thisMonth = revenue[revenue.length - 1];
  const monthTotal = thisMonth ? thisMonth.cars + thisMonth.homes + thisMonth.plans : 0;
  const due = payouts
    .filter((p) => p.status === "scheduled" || p.status === "processing")
    .reduce((sum, p) => sum + p.amount, 0);

  const firstName = staff?.name.split(" ")[0] ?? "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={today}
        title={`${greeting}${firstName && firstName !== "Operations" ? `, ${firstName}` : ""}.`}
        description={
          isMaster
            ? "The whole operation on one screen — today's movements, the fleet, and where the money is."
            : "Today's pickups and returns, what's on the road, and what needs you next."
        }
      />

      <StatGrid
        stats={[
          { label: "Today's movements", value: schedule.length, hint: `${pickups.length} out · ${returns.length} back` },
          { label: "On the road / in stay", value: onRoad.length },
          { label: "Awaiting confirmation", value: pending.length },
          { label: "Available now", value: `${available} / ${listings.length}`, hint: "cars and estates" },
        ]}
      />

      {isMaster ? (
        <StatGrid
          columns={3}
          stats={[
            { label: "Booked this month", value: money(monthTotal), hint: "cars, estates and plans" },
            { label: "Partner payouts due", value: money(due) },
            {
              label: "Revenue last 6 months",
              value: money(revenue.reduce((s, m) => s + m.cars + m.homes + m.plans, 0)),
            },
          ]}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Today's schedule"
          description="Every hand-over and return, in order."
          action={
            <Link href="/admin/reservations" className="inline-flex items-center gap-1.5 text-sm text-gold hover:underline">
              All reservations <ArrowRight aria-hidden width={14} height={14} />
            </Link>
          }
        >
          {schedule.length ? (
            <ol className="divide-y divide-line">
              {schedule.map(({ r, at, kind }) => {
                const driver = drivers.find((d) => d.id === r.driverId);
                return (
                  <li key={`${r.id}-${kind}`} className="flex items-center gap-4 py-3.5">
                    <div className="w-20 shrink-0 whitespace-nowrap">
                      <p className="font-display text-lg font-semibold tabular-nums text-cream">{time(at)}</p>
                      <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-gold">{kind}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-cream">{r.listingName}</p>
                      <p className="truncate text-xs text-muted">
                        {r.guestName} · {r.reference}
                        {r.deliveryAddress ? ` · ${r.deliveryAddress}` : ""}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <Status kind="booking" value={r.status} />
                      <p className="mt-1 text-xs text-muted">
                        {driver ? `Driver: ${driver.name}` : r.deliveryAddress ? "Driver needed" : "Depot pickup"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="py-8 text-center text-sm text-muted">No pickups or returns today.</p>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Needs attention">
            <ul className="space-y-3">
              {pending.map((r) => (
                <li key={r.id} className="flex items-start gap-3 rounded-lg border border-warning/25 bg-warning-dim/40 p-3">
                  <BellRing aria-hidden width={16} height={16} className="mt-0.5 shrink-0 text-warning" />
                  <p className="text-sm text-cream/85">
                    <span className="font-medium text-cream">{r.guestName}</span> is waiting on{" "}
                    {r.listingName} ({r.reference}).{" "}
                    <Link href="/admin/reservations" className="text-gold hover:underline">
                      Review
                    </Link>
                  </p>
                </li>
              ))}
              {alerts
                .filter((a) => !a.read && a.kind !== "booking")
                .map((a) => (
                  <li key={a.id} className="flex items-start gap-3 rounded-lg border border-line bg-surface-2/50 p-3">
                    <BellRing aria-hidden width={16} height={16} className="mt-0.5 shrink-0 text-gold" />
                    <div className="min-w-0 text-sm">
                      <p className="font-medium text-cream">{a.title}</p>
                      <p className="text-cream/70">{a.body}</p>
                      <p className="mt-1 text-xs text-muted-dim">{relativeTime(a.at)}</p>
                    </div>
                  </li>
                ))}
            </ul>
          </Panel>

          <Panel title="Drivers free now" description={`${freeDrivers.length} of ${drivers.length} ready to dispatch`}>
            <ul className="flex flex-wrap gap-2">
              {freeDrivers.map((d) => (
                <li key={d.id} className="rounded-full border border-line px-3 py-1.5 text-xs text-cream/85">
                  {d.name} · {d.zone}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel
        title="Live fleet"
        description="Cars on the road right now."
        action={
          <Link href="/admin/reservations" className="inline-flex items-center gap-1.5 text-sm text-gold hover:opacity-80">
            Reservations <ArrowRight aria-hidden width={14} height={14} />
          </Link>
        }
      >
        <FleetMap reservations={reservations} compact height={300} />
      </Panel>

      <Panel title="Fleet & estates" description="Operational state of every listing.">
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {listings.map((l) => {
            const Icon = l.kind === "car" ? Car : Home;
            return (
              <li key={l.id}>
                <Link
                  href={l.kind === "car" ? "/admin/cars" : "/admin/homes"}
                  className="flex h-full flex-col gap-3 rounded-lg border border-line bg-ink/40 p-4 transition-colors hover:border-gold/40"
                >
                  <span className="flex items-center gap-2 text-xs text-muted">
                    <Icon aria-hidden width={14} height={14} className="text-gold" />
                    {l.category}
                  </span>
                  <span className="font-medium leading-snug text-cream">{l.name}</span>
                  <span className="mt-auto">
                    <Status kind="listing" value={l.status} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
