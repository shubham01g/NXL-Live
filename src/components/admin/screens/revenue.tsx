"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { Panel, SavedNote } from "@/components/account/panel";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/controls";
import { StatGrid } from "@/components/ui/layout";
import { ProgressBar } from "@/components/ui/feedback";
import { money, shortDate } from "@/lib/domain/format";
import type { Plan } from "@/lib/domain/types";
import type {
  AuditEntry,
  BookingChannel,
  Customer,
  Partner,
  Payout,
  PayoutStatus,
  PlanPurchase,
  Reservation,
  RevenueMonth,
} from "@/lib/domain/operations";
import { DataTable, DemoNote, PageHeader, Primary, SearchInput, Toolbar } from "../ui";
import { Status } from "../status";
import { RankedBars, StackedBars } from "../charts";

const monthLabel = (ms: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(ms));

/* ------------------------------- subscriptions ------------------------------ */

/**
 * "Subscriptions" in the prototype's language — at NXL these are one-time
 * Drive Wallet plans, not renewals, so the screen tracks sales and how much
 * of each loaded balance is still unspent.
 */
export function SubscriptionsScreen({ purchases, plans }: { purchases: PlanPurchase[]; plans: Plan[] }) {
  const [query, setQuery] = useState("");
  const rows = purchases.filter((p) =>
    `${p.customerName} ${p.customerEmail} ${p.planName}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const sold = purchases.filter((p) => p.status !== "refunded");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Revenue"
        title="Subscriptions"
        description="Drive Wallet plan sales — what each member bought and how much credit they still hold."
      />

      <StatGrid
        stats={[
          { label: "Plans sold", value: sold.length },
          { label: "Plan revenue", value: money(sold.reduce((s, p) => s + p.price, 0)) },
          { label: "Bonus credit issued", value: money(sold.reduce((s, p) => s + p.credits - p.price, 0)) },
          { label: "Unspent balance", value: money(sold.reduce((s, p) => s + p.remaining, 0)) },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const ofPlan = sold.filter((p) => p.planName === plan.name);
          return (
            <Panel key={plan.id} tone={plan.featured ? "gold" : "default"}>
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">{plan.name}</p>
              <p className="text-metal-soft mt-2 font-display text-3xl font-semibold">{ofPlan.length}</p>
              <p className="mt-1 text-sm text-muted">
                sold · {money(plan.price)} for {money(plan.credits)} credit
              </p>
            </Panel>
          );
        })}
      </div>

      <SearchInput value={query} onChange={setQuery} label="Search plan sales" placeholder="Member or plan…" />

      <DataTable
        caption="Plan sales"
        rows={rows}
        rowKey={(p) => p.id}
        columns={[
          { key: "member", header: "Member", cell: (p) => <Primary title={p.customerName} sub={p.customerEmail} /> },
          { key: "plan", header: "Plan", cell: (p) => p.planName },
          { key: "price", header: "Paid", align: "right", hideBelow: "sm", cell: (p) => money(p.price) },
          {
            key: "balance",
            header: "Credit remaining",
            hideBelow: "md",
            cell: (p) => (
              <div className="w-40">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-cream">{money(p.remaining)}</span>
                  <span className="text-muted">of {money(p.credits)}</span>
                </div>
                <ProgressBar
                  value={p.remaining / p.credits}
                  label={`${p.customerName} credit remaining`}
                  tone={p.remaining / p.credits < 0.2 ? "warning" : "gold"}
                />
              </div>
            ),
          },
          { key: "date", header: "Purchased", hideBelow: "lg", cell: (p) => shortDate(p.purchasedAt) },
          { key: "status", header: "Status", cell: (p) => <Status kind="plan" value={p.status} /> },
        ]}
      />
    </div>
  );
}

/* ---------------------------------- payouts --------------------------------- */

export function PayoutsScreen({ initial }: { initial: Payout[] }) {
  const [payouts, setPayouts] = useState(initial);
  const [filter, setFilter] = useState<"all" | PayoutStatus>("all");
  const [note, setNote] = useState<string | null>(null);

  const rows = payouts.filter((p) => filter === "all" || p.status === filter);
  const sum = (s: PayoutStatus[]) =>
    payouts.filter((p) => s.includes(p.status)).reduce((t, p) => t + p.amount, 0);

  const set = (p: Payout, status: PayoutStatus, message: string) => {
    setPayouts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status } : x)));
    setNote(message);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Revenue"
        title="Payouts"
        description="Partner commission, paid monthly. Approve what's scheduled and chase anything that bounced."
        actions={
          <Button
            onClick={() => {
              setPayouts((prev) => prev.map((p) => (p.status === "scheduled" ? { ...p, status: "processing" } : p)));
              setNote("All scheduled payouts released for processing.");
            }}
            disabled={!payouts.some((p) => p.status === "scheduled")}
          >
            Release scheduled
          </Button>
        }
      />

      <StatGrid
        stats={[
          { label: "Scheduled", value: money(sum(["scheduled"])) },
          { label: "Processing", value: money(sum(["processing"])) },
          { label: "Paid to date", value: money(sum(["paid"])) },
          { label: "Failed", value: money(sum(["failed"])) },
        ]}
      />

      <Toolbar>
        <SegmentedControl<"all" | PayoutStatus>
          label="Filter payouts"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "scheduled", label: "Scheduled" },
            { value: "processing", label: "Processing" },
            { value: "paid", label: "Paid" },
            { value: "failed", label: "Failed" },
          ]}
          className="w-full sm:w-auto"
        />
      </Toolbar>
      {note ? <SavedNote>{note}</SavedNote> : null}

      <DataTable
        caption="Partner payouts"
        rows={rows}
        rowKey={(p) => p.id}
        empty="No payouts in this state."
        columns={[
          { key: "partner", header: "Partner", cell: (p) => <Primary title={p.partnerName} sub={p.method} /> },
          {
            key: "period",
            header: "Period",
            hideBelow: "md",
            cell: (p) => `${shortDate(p.period.start)} – ${shortDate(p.period.end)}`,
          },
          { key: "date", header: "Pay date", hideBelow: "sm", cell: (p) => shortDate(p.scheduledFor) },
          { key: "amount", header: "Amount", align: "right", cell: (p) => money(p.amount) },
          { key: "status", header: "Status", cell: (p) => <Status kind="payout" value={p.status} /> },
          {
            key: "action",
            header: "",
            align: "right",
            cell: (p) =>
              p.status === "scheduled" || p.status === "processing" ? (
                <button
                  type="button"
                  onClick={() => set(p, "paid", `${money(p.amount)} to ${p.partnerName} marked paid.`)}
                  className="whitespace-nowrap rounded-full border border-gold/40 px-3.5 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold/10"
                >
                  Mark paid
                </button>
              ) : p.status === "failed" ? (
                <button
                  type="button"
                  onClick={() => set(p, "scheduled", `${p.partnerName} payout rescheduled.`)}
                  className="whitespace-nowrap rounded-full border border-line px-3.5 py-1.5 text-xs text-cream/80 transition-colors hover:border-gold/40"
                >
                  Retry
                </button>
              ) : null,
          },
        ]}
      />
      <DemoNote className="!mt-4" />
      <p className="text-xs text-muted-dim">
        Money moves for real once the payment processor is connected in Milestone 5.
      </p>
    </div>
  );
}

/* --------------------------------- analytics -------------------------------- */

const CHANNEL_LABEL: Record<BookingChannel, string> = {
  web: "Website",
  concierge: "Concierge",
  partner: "Partner referrals",
  "walk-in": "Walk-in",
};

export function AnalyticsScreen({
  revenue,
  reservations,
  partners,
}: {
  revenue: RevenueMonth[];
  reservations: Reservation[];
  partners: Partner[];
}) {
  const total = revenue.reduce((s, m) => s + m.cars + m.homes + m.plans, 0);
  const prev = revenue[revenue.length - 2];
  const last = revenue[revenue.length - 3];
  const growth =
    prev && last
      ? ((prev.cars + prev.homes + prev.plans) / (last.cars + last.homes + last.plans) - 1) * 100
      : 0;

  const booked = reservations.filter((r) => r.status !== "cancelled");
  const byChannel = (Object.keys(CHANNEL_LABEL) as BookingChannel[])
    .map((c) => ({
      label: CHANNEL_LABEL[c],
      value: booked.filter((r) => r.channel === c).reduce((s, r) => s + r.total, 0),
      sub: `${booked.filter((r) => r.channel === c).length} bookings`,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

  const byListing = Object.values(
    booked.reduce<Record<string, { label: string; value: number }>>((acc, r) => {
      acc[r.listingId] ??= { label: r.listingName, value: 0 };
      acc[r.listingId].value += r.total;
      return acc;
    }, {}),
  ).sort((a, b) => b.value - a.value);

  const topPartners = [...partners]
    .filter((p) => p.referrals > 0)
    .sort((a, b) => b.referrals - a.referrals)
    .slice(0, 5)
    .map((p) => ({ label: p.business, value: p.referrals }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Revenue"
        title="Analytics"
        description="Where revenue comes from, which channels bring it, and which listings earn it."
      />

      <StatGrid
        stats={[
          { label: "Revenue, 6 months", value: money(total) },
          { label: "Last month vs prior", value: `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%` },
          { label: "Avg. booking value", value: money(Math.round(booked.reduce((s, r) => s + r.total, 0) / (booked.length || 1))) },
          {
            label: "Partner-referred share",
            value: `${Math.round((booked.filter((r) => r.channel === "partner").length / (booked.length || 1)) * 100)}%`,
          },
        ]}
      />

      <Panel title="Booked revenue by month" description="Cars, estates and Drive Wallet plan sales.">
        <StackedBars
          title="Booked revenue by month, split by cars, estates and plans"
          series={["Cars", "Estates", "Plans"]}
          data={revenue.map((m) => ({ label: monthLabel(m.month), values: [m.cars, m.homes, m.plans] }))}
        />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Revenue by channel" description="Current reservations, excluding cancellations.">
          <RankedBars rows={byChannel} />
        </Panel>
        <Panel title="Revenue by listing" description="Current reservations, excluding cancellations.">
          <RankedBars rows={byListing} />
        </Panel>
      </div>

      <Panel title="Top partners by referrals">
        <RankedBars rows={topPartners} format={(v) => `${v} guests`} />
      </Panel>
    </div>
  );
}

/* ---------------------------------- reports --------------------------------- */

type Cell = string | number;

function toCsv(header: string[], rows: Cell[][]) {
  const esc = (v: Cell) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

function download(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function ReportsScreen({
  reservations,
  customers,
  payouts,
  purchases,
  audit,
}: {
  reservations: Reservation[];
  customers: Customer[];
  payouts: Payout[];
  purchases: PlanPurchase[];
  audit: AuditEntry[];
}) {
  const [note, setNote] = useState<string | null>(null);

  const reports = useMemo(
    () => [
      {
        id: "reservations",
        name: "Reservations",
        description: "Every booking with guest, listing, window, channel, total and deposit state.",
        rows: reservations.length,
        build: () =>
          toCsv(
            ["Reference", "Guest", "Email", "Listing", "Start", "End", "Channel", "Partner code", "Total", "Deposit", "Deposit status", "Status"],
            reservations.map((r) => [r.reference, r.guestName, r.email, r.listingName, iso(r.window.start), iso(r.window.end), r.channel, r.partnerCode ?? "", r.total, r.deposit, r.depositStatus, r.status]),
          ),
      },
      {
        id: "customers",
        name: "Customers",
        description: "Members with tier, points, wallet balance, rentals and lifetime spend.",
        rows: customers.length,
        build: () =>
          toCsv(
            ["Name", "Email", "Phone", "Tier", "Points", "Wallet", "Rentals", "Lifetime spend", "Joined"],
            customers.map((c) => [c.name, c.email, c.phone, c.tier, c.points, c.credits, c.rentals, c.lifetimeSpend, iso(c.joinedAt)]),
          ),
      },
      {
        id: "payouts",
        name: "Partner payouts",
        description: "Commission payouts by partner, period, method and status.",
        rows: payouts.length,
        build: () =>
          toCsv(
            ["Partner", "Period start", "Period end", "Pay date", "Method", "Amount", "Status"],
            payouts.map((p) => [p.partnerName, iso(p.period.start), iso(p.period.end), iso(p.scheduledFor), p.method, p.amount, p.status]),
          ),
      },
      {
        id: "plans",
        name: "Drive Wallet sales",
        description: "Plan purchases, credit loaded and credit remaining.",
        rows: purchases.length,
        build: () =>
          toCsv(
            ["Member", "Email", "Plan", "Paid", "Credits", "Remaining", "Purchased", "Status"],
            purchases.map((p) => [p.customerName, p.customerEmail, p.planName, p.price, p.credits, p.remaining, iso(p.purchasedAt), p.status]),
          ),
      },
      {
        id: "audit",
        name: "Audit log",
        description: "Every recorded change: when, who, what and to which record.",
        rows: audit.length,
        build: () =>
          toCsv(
            ["Time", "Actor", "Action", "Record", "Detail"],
            audit.map((a) => [new Date(a.at).toISOString(), a.actor, a.action, a.entity, a.detail]),
          ),
      },
    ],
    [reservations, customers, payouts, purchases, audit],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Revenue"
        title="Reports"
        description="Download any register as a CSV for your accountant, spreadsheet or BI tool."
      />
      {note ? <SavedNote>{note}</SavedNote> : null}
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => (
          <li key={r.id} className="flex flex-col gap-4 rounded-xl border border-line bg-surface-1/50 p-5">
            <span className="metal-plate grid h-10 w-10 place-items-center rounded-full">
              <FileSpreadsheet aria-hidden width={18} height={18} />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-cream">{r.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{r.description}</p>
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
              <span className="text-xs text-muted">{r.rows} rows</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  download(`nxl-${r.id}-${iso(Date.now())}.csv`, r.build());
                  setNote(`${r.name} exported.`);
                }}
              >
                <Download aria-hidden width={14} height={14} />
                Download CSV
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
