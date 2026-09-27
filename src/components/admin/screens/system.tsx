"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, AlertTriangle } from "lucide-react";
import { Panel, SavedNote } from "@/components/account/panel";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/field";
import { StatGrid } from "@/components/ui/layout";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils/cn";
import { relativeTime } from "@/lib/domain/format";
import type { AuditEntry, HealthCheck, PlatformSettings } from "@/lib/domain/operations";
import { DataTable, DemoNote, InlineSelect, PageHeader, Primary, SearchInput, Toolbar } from "../ui";
import { Status } from "../status";

/* ---------------------------------- audit ---------------------------------- */

export function AuditScreen({ entries }: { entries: AuditEntry[] }) {
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("all");
  const actors = useMemo(() => Array.from(new Set(entries.map((e) => e.actor))), [entries]);

  const rows = entries.filter(
    (e) =>
      (actor === "all" || e.actor === actor) &&
      `${e.action} ${e.entity} ${e.detail}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="System"
        title="Audit log"
        description="Every change to rates, bookings, people and settings — who made it and when. Entries can't be edited or deleted."
      />
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} label="Search the audit log" placeholder="Action, record or detail…" />
        <InlineSelect
          label="Filter by person"
          value={actor}
          onChange={setActor}
          options={[{ value: "all", label: "Everyone" }, ...actors.map((a) => ({ value: a, label: a }))]}
          className="h-10 px-4 text-sm"
        />
      </Toolbar>
      <DataTable
        caption="Audit log"
        rows={rows}
        rowKey={(e) => e.id}
        empty="No entries match."
        columns={[
          {
            key: "when",
            header: "When",
            cell: (e) => (
              <Primary
                title={relativeTime(e.at)}
                sub={new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(e.at))}
              />
            ),
          },
          { key: "who", header: "Who", cell: (e) => e.actor },
          {
            key: "what",
            header: "Action",
            hideBelow: "sm",
            cell: (e) => <span className="font-mono text-xs text-gold">{e.action}</span>,
          },
          { key: "record", header: "Record", hideBelow: "md", cell: (e) => <Primary title={e.entity} sub={e.detail} /> },
        ]}
      />
    </div>
  );
}

/* ------------------------------- system health ------------------------------ */

export function SystemScreen({ checks }: { checks: HealthCheck[] }) {
  const ok = checks.filter((c) => c.state === "operational").length;
  const pending = checks.filter((c) => c.state === "not-connected");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="System"
        title="System health"
        description="What's running, and which services are still to be connected on the build plan."
      />

      <StatGrid
        columns={3}
        stats={[
          { label: "Operational", value: `${ok} / ${checks.length}` },
          { label: "Degraded", value: checks.filter((c) => c.state === "degraded").length },
          { label: "Still to connect", value: pending.length, hint: "on the milestone plan" },
        ]}
      />

      <ul className="grid gap-4 md:grid-cols-2">
        {checks.map((c) => {
          const Icon = c.state === "operational" ? CheckCircle2 : c.state === "degraded" ? AlertTriangle : CircleDashed;
          return (
            <li
              key={c.id}
              className={cn(
                "flex items-start gap-4 rounded-xl p-5",
                c.state === "operational" ? "edge-gold" : "border border-line bg-surface-1/40",
              )}
            >
              <Icon
                aria-hidden
                width={20}
                height={20}
                className={cn(
                  "mt-0.5 shrink-0",
                  c.state === "operational" ? "text-success" : c.state === "degraded" ? "text-warning" : "text-muted",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-cream">{c.name}</p>
                  <Status kind="health" value={c.state} />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-cream/70">{c.detail}</p>
                {c.milestone ? (
                  <Badge tone="gold" className="mt-3">
                    {c.milestone}
                  </Badge>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* --------------------------------- settings -------------------------------- */

export function SettingsScreen({ initial }: { initial: PlatformSettings }) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setS((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };
  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Business details and the rules the booking engine uses."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
        className="space-y-6"
      >
        <Panel title="Business" description="Shown in the footer, emails and receipts.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" htmlFor="s-name">
              <Input id="s-name" value={s.businessName} onChange={(e) => set("businessName", e.target.value)} />
            </Field>
            <Field label="Opening hours" htmlFor="s-hours">
              <Input id="s-hours" value={s.hours} onChange={(e) => set("hours", e.target.value)} />
            </Field>
            <Field label="Support email" htmlFor="s-email">
              <Input id="s-email" type="email" value={s.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
            </Field>
            <Field label="Support phone" htmlFor="s-phone">
              <Input id="s-phone" type="tel" value={s.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} />
            </Field>
            <Field label="Address" htmlFor="s-addr" className="sm:col-span-2">
              <Input id="s-addr" value={s.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
          </div>
        </Panel>

        <Panel title="Booking rules" description="Applied to every new quote.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Sales tax (%)" htmlFor="s-tax">
              <Input id="s-tax" type="number" step="0.1" min={0} value={Math.round(s.taxRate * 1000) / 10} onChange={(e) => set("taxRate", num(e.target.value) / 100)} />
            </Field>
            <Field label="Delivery fee ($)" htmlFor="s-deliv">
              <Input id="s-deliv" type="number" min={0} value={s.deliveryFee} onChange={(e) => set("deliveryFee", num(e.target.value))} />
            </Field>
            <Field label="Default car deposit ($)" htmlFor="s-dep">
              <Input id="s-dep" type="number" min={0} value={s.defaultCarDeposit} onChange={(e) => set("defaultCarDeposit", num(e.target.value))} />
            </Field>
            <Field label="Low-balance alert (%)" htmlFor="s-low" hint="Of credits loaded">
              <Input id="s-low" type="number" min={0} max={100} value={Math.round(s.lowBalanceThreshold * 100)} onChange={(e) => set("lowBalanceThreshold", num(e.target.value) / 100)} />
            </Field>
            <Field label="Points per $1 spent" htmlFor="s-pts">
              <Input id="s-pts" type="number" min={0} step="0.5" value={s.pointsPerDollar} onChange={(e) => set("pointsPerDollar", num(e.target.value))} />
            </Field>
          </div>
        </Panel>

        <Panel title="Availability">
          <ul className="divide-y divide-line">
            <li className="flex items-center justify-between gap-6 py-3">
              <div>
                <p className="text-sm font-medium text-cream">Hourly car bookings</p>
                <p className="text-xs text-muted">Let guests book cars by the hour, not just the day.</p>
              </div>
              <Toggle label="Hourly car bookings" checked={s.hourlyBookings} onChange={(v) => set("hourlyBookings", v)} />
            </li>
            <li className="flex items-center justify-between gap-6 py-3">
              <div>
                <p className="text-sm font-medium text-cream">Maintenance mode</p>
                <p className="text-xs text-muted">Pause new bookings site-wide. Existing reservations are unaffected.</p>
              </div>
              <Toggle label="Maintenance mode" checked={s.maintenanceMode} onChange={(v) => set("maintenanceMode", v)} />
            </li>
          </ul>
        </Panel>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit">Save settings</Button>
          {saved ? <SavedNote>Settings saved.</SavedNote> : null}
        </div>
      </form>
      <DemoNote />
    </div>
  );
}
