"use client";

import { useMemo, useState } from "react";
import { StatGrid } from "@/components/ui/layout";
import { SegmentedControl } from "@/components/ui/controls";
import { SavedNote } from "@/components/account/panel";
import { money } from "@/lib/domain/format";
import type { BookingStatus } from "@/lib/domain/types";
import type { BookingChannel, Driver, Reservation } from "@/lib/domain/operations";
import { DataTable, DemoNote, InlineSelect, PageHeader, Primary, SearchInput, Toolbar } from "../ui";
import { BOOKING_META, Status } from "../status";

/**
 * Reservations — the booking lifecycle an employee actually runs:
 * confirm → hand over (check-out) → take back (check-in) → complete.
 * One primary action per row, named for the next real-world step, so the
 * table reads as a to-do list rather than a status editor.
 */

type Filter = "all" | "pending" | "confirmed" | "live" | "completed" | "cancelled";

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

function nextStep(r: Reservation): { label: string; to: BookingStatus } | null {
  switch (r.status) {
    case "pending":
      return { label: "Confirm", to: "confirmed" };
    case "confirmed":
      return r.listingKind === "car"
        ? { label: "Check out", to: "checked_out" }
        : { label: "Check in guest", to: "active" };
    case "checked_out":
      return { label: "Check in return", to: "completed" };
    case "active":
      return { label: "Check out guest", to: "completed" };
    default:
      return null;
  }
}

const when = (ms: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric" }).format(new Date(ms));

export function ReservationsScreen({ initial, drivers }: { initial: Reservation[]; drivers: Driver[] }) {
  const [rows, setRows] = useState(initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [note, setNote] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "live" ? r.status === "checked_out" || r.status === "active" : r.status === filter);
      const matchesQuery =
        !q ||
        `${r.reference} ${r.guestName} ${r.email} ${r.listingName} ${r.partnerCode ?? ""}`
          .toLowerCase()
          .includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [rows, query, filter]);

  const update = (id: string, patch: Partial<Reservation>, message: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        // A completed or cancelled booking releases its deposit.
        if (patch.status === "completed" || patch.status === "cancelled") next.depositStatus = "refunded";
        return next;
      }),
    );
    setNote(message);
  };

  const dispatchable = drivers.filter((d) => d.license === "verified");
  const booked = rows.filter((r) => r.status !== "cancelled").reduce((s, r) => s + r.total, 0);
  const held = rows.filter((r) => r.depositStatus === "held").reduce((s, r) => s + r.deposit, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Reservations"
        description="Confirm requests, hand over keys, take them back, and release deposits."
      />

      <StatGrid
        stats={[
          { label: "Awaiting confirmation", value: rows.filter((r) => r.status === "pending").length },
          {
            label: "Live now",
            value: rows.filter((r) => r.status === "checked_out" || r.status === "active").length,
          },
          { label: "Booked value", value: money(booked) },
          { label: "Deposits held", value: money(held) },
        ]}
      />

      <Toolbar>
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Search reservations"
          placeholder="Reference, guest, listing or partner code…"
        />
        <SegmentedControl<Filter>
          label="Filter by status"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={FILTERS}
          className="w-full sm:w-auto"
        />
      </Toolbar>

      {note ? <SavedNote>{note}</SavedNote> : null}

      <DataTable
        caption="Reservations"
        rows={visible}
        rowKey={(r) => r.id}
        empty="No reservations match."
        columns={[
          {
            key: "ref",
            header: "Guest",
            cell: (r) => (
              <Primary title={r.guestName} sub={r.reference} />
            ),
          },
          {
            key: "listing",
            header: "Listing & window",
            hideBelow: "md",
            cell: (r) => (
              <Primary
                title={r.listingName}
                sub={`${when(r.window.start)} → ${when(r.window.end)} · ${r.qty} ${r.unit}${r.qty > 1 ? "s" : ""}`}
              />
            ),
          },
          {
            key: "channel",
            header: "Channel",
            hideBelow: "2xl",
            cell: (r) => (
              <Primary
                title={CHANNEL_LABEL[r.channel]}
                sub={r.partnerCode ? `Code ${r.partnerCode}` : undefined}
              />
            ),
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
                <p className="text-xs text-muted">
                  {money(r.deposit)} {r.depositStatus}
                </p>
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
                  onChange={(id) =>
                    update(
                      r.id,
                      { driverId: id || null },
                      id
                        ? `${drivers.find((d) => d.id === id)?.name} assigned to ${r.reference}.`
                        : `Driver removed from ${r.reference}.`,
                    )
                  }
                />
              ) : (
                <span className="text-xs text-muted">
                  {drivers.find((d) => d.id === r.driverId)?.name ?? "—"}
                </span>
              ),
          },
          {
            // Status and the next step share a column: the badge says where
            // the booking is, the button right under it moves it along.
            key: "status",
            header: "Status",
            align: "right",
            cell: (r) => {
              const step = nextStep(r);
              const cancellable = r.status === "pending" || r.status === "confirmed";
              return (
                <div className="flex flex-col items-end gap-2">
                  <Status kind="booking" value={r.status} />
                  {step || cancellable ? (
                    <div className="flex justify-end gap-1">
                      {cancellable ? (
                        <button
                          type="button"
                          onClick={() =>
                            update(
                              r.id,
                              { status: "cancelled" },
                              `${r.reference} cancelled — deposit released.`,
                            )
                          }
                          className="rounded-full px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-danger"
                        >
                          Cancel
                        </button>
                      ) : null}
                      {step ? (
                        <button
                          type="button"
                          onClick={() =>
                            update(
                              r.id,
                              { status: step.to },
                              `${r.reference}: ${BOOKING_META[step.to].label.toLowerCase()}.`,
                            )
                          }
                          className="whitespace-nowrap rounded-full border border-gold/40 px-3.5 py-1.5 text-xs font-semibold text-gold transition-colors hover:border-gold hover:bg-gold/10"
                        >
                          {step.label}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            },
          },
        ]}
      />

      <DemoNote />
    </div>
  );
}
