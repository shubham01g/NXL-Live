"use client";

import { useMemo, useState } from "react";
import { List, Map as MapIcon, MapPinned, Plus } from "lucide-react";
import { StatGrid } from "@/components/ui/layout";
import { SegmentedControl } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/domain/format";
import type { Listing } from "@/lib/domain/types";
import type { BookingChannel, Driver, Reservation } from "@/lib/domain/operations";
import { C } from "@/lib/data/demo";
import { useCollection } from "@/lib/data/demo-store";
import { FleetMap } from "@/components/maps/fleet-map";
import { DeliveryMap } from "@/components/maps/delivery-map";
import { toast } from "@/components/ui/toast";
import { DataTable, DemoNote, InlineSelect, PageHeader, Primary, SearchInput, Toolbar } from "../ui";
import { Status } from "../status";
import {
  assignDriver,
  cancelReservation,
  checkOut,
  confirmReservation,
  DepositModal,
  NewReservationModal,
  ReservationDrawer,
  ReturnModal,
  useActor,
} from "../reservation-tools";

/**
 * Reservations — the booking lifecycle an employee actually runs:
 * confirm → hand over (check-out) → take back (check-in with inspection and
 * deposit settlement). One primary action per row, named for the next
 * real-world step; the row opens a drawer with everything else, including the
 * live map. The Map view is the prototype's fleet map; Deliveries plots the
 * upcoming drop-offs against the base delivery zone.
 */

type Filter = "all" | "pending" | "confirmed" | "live" | "completed" | "cancelled";
type View = "list" | "map" | "deliveries";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "live", label: "Live" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const CHANNEL_LABEL: Record<BookingChannel, string> = {
  web: "Website",
  concierge: "Concierge",
  partner: "Partner",
  "walk-in": "Walk-in",
};

const when = (ms: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric" }).format(new Date(ms));

export function ReservationsScreen({
  initial,
  drivers: baseDrivers,
  listings,
}: {
  initial: Reservation[];
  drivers: Driver[];
  listings: Listing[];
}) {
  const rows = useCollection<Reservation>(C.reservations, initial);
  const drivers = useCollection<Driver>(C.drivers, baseDrivers);
  const actor = useActor();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("list");
  const [openId, setOpenId] = useState<string | null>(null);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [returnId, setReturnId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const sorted = useMemo(() => [...rows].sort((a, b) => b.window.start - a.window.start), [rows]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((r) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "live" ? r.status === "checked_out" || r.status === "active" : r.status === filter);
      const matchesQuery =
        !q ||
        `${r.reference} ${r.guestName} ${r.email} ${r.listingName} ${r.partnerCode ?? ""}`.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [sorted, query, filter]);

  const find = (id: string | null) => rows.find((r) => r.id === id) ?? null;
  const dispatchable = drivers.filter((d) => d.license === "verified");
  const live = rows.filter((r) => r.status === "checked_out" || r.status === "active");
  const booked = rows.filter((r) => r.status !== "cancelled").reduce((s, r) => s + r.total, 0);
  const held = rows.filter((r) => r.depositStatus === "held" && r.status !== "cancelled" && r.status !== "completed").reduce((s, r) => s + r.deposit, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Reservations"
        description="Confirm requests, hand over keys, take them back, and settle deposits."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden width={16} height={16} /> New reservation
          </Button>
        }
      />

      <StatGrid
        stats={[
          { label: "Awaiting confirmation", value: rows.filter((r) => r.status === "pending").length },
          { label: "Live now", value: live.length },
          { label: "Booked value", value: money(booked) },
          { label: "Deposits on hold", value: money(held) },
        ]}
      />

      <Toolbar>
        {view === "list" ? (
          <SearchInput value={query} onChange={setQuery} label="Search reservations" placeholder="Reference, guest, listing or partner code…" />
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {view === "list" ? (
            <SegmentedControl<Filter> label="Filter by status" size="sm" value={filter} onChange={setFilter} options={FILTERS} className="w-full sm:w-auto" />
          ) : null}
          <div className="flex rounded-full border border-line p-1" role="tablist" aria-label="View">
            {([
              ["list", "List", List],
              ["map", "Live map", MapIcon],
              ["deliveries", "Deliveries", MapPinned],
            ] as const).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={
                  view === v
                    ? "metal-plate flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                    : "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-cream/70 hover:text-cream"
                }
              >
                <Icon aria-hidden width={13} height={13} /> {label}
              </button>
            ))}
          </div>
        </div>
      </Toolbar>

      {view === "map" ? (
        <FleetMap reservations={rows} onSelect={(r) => setOpenId(r.id)} />
      ) : view === "deliveries" ? (
        <DeliveryMap reservations={rows} />
      ) : (
        <>
          {live.some((r) => r.listingKind === "car") ? (
            <section className="rounded-xl border border-line bg-surface-1/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-display text-lg font-semibold text-cream">Live fleet</p>
                <button type="button" onClick={() => setView("map")} className="text-xs text-gold hover:underline">
                  Full map →
                </button>
              </div>
              <FleetMap reservations={rows} compact onSelect={(r) => setOpenId(r.id)} />
            </section>
          ) : null}

          <DataTable
            caption="Reservations"
            rows={visible}
            rowKey={(r) => r.id}
            empty="No reservations match."
            onRowClick={(r) => setOpenId(r.id)}
            columns={[
              { key: "ref", header: "Guest", cell: (r) => <Primary title={r.guestName} sub={r.reference} /> },
              {
                key: "listing",
                header: "Listing & window",
                hideBelow: "md",
                cell: (r) => (
                  <Primary title={r.listingName} sub={`${when(r.window.start)} → ${when(r.window.end)} · ${r.qty} ${r.unit}${r.qty > 1 ? "s" : ""}`} />
                ),
              },
              {
                key: "channel",
                header: "Channel",
                hideBelow: "2xl",
                cell: (r) => <Primary title={CHANNEL_LABEL[r.channel]} sub={r.partnerCode ? `Code ${r.partnerCode}` : undefined} />,
              },
              {
                key: "total",
                header: "Total",
                align: "right",
                hideBelow: "sm",
                className: "whitespace-nowrap",
                cell: (r) => (
                  <div>
                    <p className="text-cream">{money(r.total)}</p>
                    <p className="text-xs text-muted">{money(r.deposit)} {r.depositStatus}</p>
                  </div>
                ),
              },
              {
                key: "driver",
                header: "Driver",
                hideBelow: "lg",
                cell: (r) =>
                  r.listingKind === "car" && r.status !== "completed" && r.status !== "cancelled" ? (
                    <InlineSelect
                      label={`Driver for ${r.reference}`}
                      value={r.driverId ?? ""}
                      options={[
                        { value: "", label: r.deliveryAddress ? "Unassigned" : "Depot pickup" },
                        ...dispatchable.map((d) => ({ value: d.id, label: d.name })),
                      ]}
                      onChange={(id) => {
                        const d = drivers.find((x) => x.id === id) ?? null;
                        assignDriver(r, d, actor.name);
                        toast(d ? `${d.name} assigned to ${r.reference}.` : `Driver removed from ${r.reference}.`);
                      }}
                    />
                  ) : (
                    <span className="text-xs text-muted">{drivers.find((d) => d.id === r.driverId)?.name ?? "—"}</span>
                  ),
              },
              {
                key: "status",
                header: "Status",
                align: "right",
                cell: (r) => (
                  <div className="flex flex-col items-end gap-2">
                    <Status kind="booking" value={r.status} />
                    <RowAction r={r} actor={actor.name} onReturn={() => setReturnId(r.id)} />
                  </div>
                ),
              },
            ]}
          />
        </>
      )}

      <DemoNote />

      <ReservationDrawer
        r={find(openId)}
        drivers={drivers}
        onClose={() => setOpenId(null)}
        onDeposit={(r) => setDepositId(r.id)}
        onReturn={(r) => setReturnId(r.id)}
      />
      <DepositModal key={`dep-${depositId}`} r={find(depositId)} onClose={() => setDepositId(null)} />
      <ReturnModal key={`ret-${returnId}`} r={find(returnId)} onClose={() => setReturnId(null)} />
      <NewReservationModal open={adding} onClose={() => setAdding(false)} listings={listings} drivers={drivers} />
    </div>
  );
}

function RowAction({ r, actor, onReturn }: { r: Reservation; actor: string; onReturn: () => void }) {
  const primary =
    r.status === "pending"
      ? { label: "Confirm", run: () => confirmReservation(r, actor) }
      : r.status === "confirmed"
        ? { label: r.listingKind === "car" ? "Check out" : "Check in guest", run: () => checkOut(r, actor) }
        : r.status === "checked_out" || r.status === "active"
          ? { label: r.listingKind === "car" ? "Check in return" : "Check out guest", run: onReturn }
          : null;
  const cancellable = r.status === "pending" || r.status === "confirmed";
  if (!primary && !cancellable) return null;
  return (
    <div className="flex justify-end gap-1">
      {cancellable ? (
        <button
          type="button"
          onClick={() => {
            cancelReservation(r, actor);
            toast(`${r.reference} cancelled — hold released.`);
          }}
          className="rounded-full px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-danger"
        >
          Cancel
        </button>
      ) : null}
      {primary ? (
        <button
          type="button"
          onClick={() => {
            primary.run();
            if (primary.run !== onReturn) toast(`${r.reference}: ${primary.label.toLowerCase()} done.`);
          }}
          className="whitespace-nowrap rounded-full border border-gold/40 px-3.5 py-1.5 text-xs font-semibold text-gold transition-colors hover:border-gold hover:bg-gold/10"
        >
          {primary.label}
        </button>
      ) : null}
    </div>
  );
}
