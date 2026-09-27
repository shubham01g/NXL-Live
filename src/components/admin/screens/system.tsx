"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, AlertTriangle } from "lucide-react";
import { Panel } from "@/components/account/panel";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/controls";
import { Field, Input } from "@/components/ui/field";
import { StatGrid } from "@/components/ui/layout";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils/cn";
import { relativeTime } from "@/lib/domain/format";
import type { AuditEntry, HealthCheck, PlatformSettings } from "@/lib/domain/operations";
import { C, logAudit } from "@/lib/data/demo";
import { resetDemo, setValue, useCollection, useDemoValue } from "@/lib/data/demo-store";
import { toast } from "@/components/ui/toast";
import { Select } from "@/components/ui/field";
import { DataTable, DemoNote, InlineSelect, PageHeader, Primary, SearchInput, Toolbar } from "../ui";
import { Status } from "../status";

/* ---------------------------------- audit ---------------------------------- */

export function AuditScreen({ entries: base }: { entries: AuditEntry[] }) {
  const merged = useCollection<AuditEntry>(C.audit, base);
  const entries = useMemo(() => [...merged].sort((a, b) => b.at - a.at), [merged]);
  const [query, setQuery] = useState("");
  const [actor, setActor] = useState("all");
  const [area, setArea] = useState("all");
  const actors = useMemo(() => Array.from(new Set(entries.map((e) => e.actor))), [entries]);
  const areas = useMemo(() => Array.from(new Set(entries.map((e) => e.action.split(".")[0]))).sort(), [entries]);

  const rows = entries.filter(
    (e) =>
      (actor === "all" || e.actor === actor) &&
      (area === "all" || e.action.startsWith(`${area}.`)) &&
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
        <InlineSelect
          label="Filter by area"
          value={area}
          onChange={setArea}
          options={[{ value: "all", label: "All areas" }, ...areas.map((a) => ({ value: a, label: a[0].toUpperCase() + a.slice(1) }))]}
          className="h-10 px-4 text-sm"
        />
        <span className="text-xs text-muted">{rows.length} of {entries.length} entries</span>
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

      <BrowserData />
    </div>
  );
}

/** The M2 demo store — what this browser holds, and a way to start clean. */
function BrowserData() {
  const [confirm, setConfirm] = useState(false);
  const [info] = useState(() => {
    if (typeof window === "undefined") return { kb: 0, push: "unknown", geo: false };
    let bytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) ?? "";
        bytes += k.length + (localStorage.getItem(k)?.length ?? 0);
      }
    } catch {
      // Storage blocked — report zero.
    }
    return {
      kb: Math.round((bytes * 2) / 1024),
      push: typeof Notification === "undefined" ? "unsupported" : Notification.permission,
      geo: "geolocation" in navigator,
    };
  });
  return (
    <Panel title="This browser" description="Until the database lands at M3, every demo booking and edit is saved here.">
      <dl className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-ink/40 px-4 py-3"><dt className="text-xs text-muted">Demo data stored</dt><dd className="font-mono text-cream">{info.kb} KB of ~5,000</dd></div>
        <div className="rounded-lg border border-line bg-ink/40 px-4 py-3"><dt className="text-xs text-muted">Push permission</dt><dd className="capitalize text-cream">{info.push}</dd></div>
        <div className="rounded-lg border border-line bg-ink/40 px-4 py-3"><dt className="text-xs text-muted">GPS available</dt><dd className="text-cream">{info.geo ? "Yes" : "No"}</dd></div>
      </dl>
      {confirm ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-warning">Erase every demo booking and edit in this browser?</span>
          <Button size="sm" variant="outline" className="border-danger/50 text-danger hover:border-danger hover:bg-danger/10" onClick={() => { resetDemo(); toast("Demo data reset.", "warning"); setConfirm(false); }}>Yes, reset</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Keep it</Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="mt-4" onClick={() => setConfirm(true)}>Reset demo data</Button>
      )}
    </Panel>
  );
}

/* --------------------------------- settings -------------------------------- */

export function SettingsScreen({ initial }: { initial: PlatformSettings }) {
  const stored = useDemoValue<PlatformSettings>("settings:platform", initial);
  const integrations = useDemoValue<Integrations>("settings:integrations", DEFAULT_INTEGRATIONS);
  const [s, setS] = useState(stored);
  const [x, setX] = useState(integrations);
  const [catDraft, setCatDraft] = useState({ car: "", home: "" });
  const set = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => setS((prev) => ({ ...prev, [key]: value }));
  const setI = <K extends keyof Integrations>(key: K, value: Integrations[K]) => setX((prev) => ({ ...prev, [key]: value }));
  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="System" title="Settings" description="Business details, booking rules, delivery pricing, categories and the integrations that go live at launch." />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setValue("settings:platform", s);
          setValue("settings:integrations", x);
          logAudit("Master Admin", "settings.updated", "Platform", "Settings saved");
          toast("Settings saved.");
        }}
        className="space-y-6"
      >
        <Panel title="Business" description="Shown in the footer, emails and receipts.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" htmlFor="s-name"><Input id="s-name" value={s.businessName} onChange={(e) => set("businessName", e.target.value)} /></Field>
            <Field label="Opening hours" htmlFor="s-hours"><Input id="s-hours" value={s.hours} onChange={(e) => set("hours", e.target.value)} /></Field>
            <Field label="Support email" htmlFor="s-email"><Input id="s-email" type="email" value={s.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} /></Field>
            <Field label="Support phone" htmlFor="s-phone"><Input id="s-phone" type="tel" value={s.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} /></Field>
            <Field label="Address" htmlFor="s-addr" className="sm:col-span-2"><Input id="s-addr" value={s.address} onChange={(e) => set("address", e.target.value)} /></Field>
          </div>
        </Panel>

        <Panel title="Booking rules" description="Applied to every new quote.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Sales tax (%)" htmlFor="s-tax"><Input id="s-tax" type="number" step="0.1" min={0} value={Math.round(s.taxRate * 1000) / 10} onChange={(e) => set("taxRate", num(e.target.value) / 100)} /></Field>
            <Field label="Default car deposit ($)" htmlFor="s-dep"><Input id="s-dep" type="number" min={0} value={s.defaultCarDeposit} onChange={(e) => set("defaultCarDeposit", num(e.target.value))} /></Field>
            <Field label="Low-balance alert (%)" htmlFor="s-low" hint="Of credits loaded"><Input id="s-low" type="number" min={0} max={100} value={Math.round(s.lowBalanceThreshold * 100)} onChange={(e) => set("lowBalanceThreshold", num(e.target.value) / 100)} /></Field>
            <Field label="Default partner commission (%)" htmlFor="s-comm"><Input id="s-comm" type="number" min={0} max={30} value={x.partnerCommission} onChange={(e) => setI("partnerCommission", num(e.target.value))} /></Field>
            <Field label="Partner payout schedule" htmlFor="s-sched">
              <Select id="s-sched" value={x.payoutSchedule} onChange={(e) => setI("payoutSchedule", e.target.value)}>
                {["Net-15", "Net-30", "Weekly", "Monthly"].map((o) => <option key={o}>{o}</option>)}
              </Select>
            </Field>
          </div>
        </Panel>

        <Panel title="Delivery & pickup fees" description="The base zone around the South Beach depot, and what each extra mile costs.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Base radius (mi)" htmlFor="s-radius"><Input id="s-radius" type="number" min={0} value={x.baseMiles} onChange={(e) => setI("baseMiles", num(e.target.value))} /></Field>
            <Field label="Delivery fee ($)" htmlFor="s-deliv"><Input id="s-deliv" type="number" min={0} value={s.deliveryFee} onChange={(e) => set("deliveryFee", num(e.target.value))} /></Field>
            <Field label="Pickup fee ($)" htmlFor="s-pick"><Input id="s-pick" type="number" min={0} value={x.pickupFee} onChange={(e) => setI("pickupFee", num(e.target.value))} /></Field>
            <Field label="Delivery $/mi beyond" htmlFor="s-dmi"><Input id="s-dmi" type="number" min={0} value={x.deliveryPerMile} onChange={(e) => setI("deliveryPerMile", num(e.target.value))} /></Field>
            <Field label="Pickup $/mi beyond" htmlFor="s-pmi"><Input id="s-pmi" type="number" min={0} value={x.pickupPerMile} onChange={(e) => setI("pickupPerMile", num(e.target.value))} /></Field>
          </div>
          <p className="mt-3 text-xs text-muted-dim">Silver tier and above get delivery and pickup free, whatever the distance inside the service area.</p>
        </Panel>

        <Panel title="Categories" description="What the fleet and estates can be filed under.">
          <div className="grid gap-6 lg:grid-cols-2">
            {(["car", "home"] as const).map((k) => (
              <div key={k}>
                <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">{k === "car" ? "Car categories" : "Estate categories"}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {x.categories[k].map((c) => (
                    <li key={c} className="flex items-center gap-1 rounded-full border border-gold/30 px-3 py-1 text-xs text-cream">
                      {c}
                      <button type="button" aria-label={`Remove ${c}`} onClick={() => setI("categories", { ...x.categories, [k]: x.categories[k].filter((y) => y !== c) })} className="text-muted hover:text-danger">×</button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Input aria-label={`New ${k} category`} value={catDraft[k]} onChange={(e) => setCatDraft({ ...catDraft, [k]: e.target.value })} placeholder="Add category" className="h-10 py-2" />
                  <Button type="button" size="sm" variant="outline" onClick={() => { const v = catDraft[k].trim(); if (!v || x.categories[k].includes(v)) return; setI("categories", { ...x.categories, [k]: [...x.categories[k], v] }); setCatDraft({ ...catDraft, [k]: "" }); }}>Add</Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Payment processor" description="Checkout, deposits, top-ups, refunds and payouts. Wired end-to-end at Milestone 5." action={<Toggle label="Processor enabled" checked={x.processor.enabled} onChange={(v) => setI("processor", { ...x.processor, enabled: v })} />}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Processor" htmlFor="s-proc"><Input id="s-proc" value={x.processor.name} onChange={(e) => setI("processor", { ...x.processor, name: e.target.value })} placeholder="Chosen at M5" /></Field>
            <Field label="Environment" htmlFor="s-env">
              <Select id="s-env" value={x.processor.env} onChange={(e) => setI("processor", { ...x.processor, env: e.target.value as "sandbox" | "live" })}>
                <option value="sandbox">Sandbox</option>
                <option value="live">Live</option>
              </Select>
            </Field>
            <Field label="Publishable key" htmlFor="s-pk"><Input id="s-pk" value={x.processor.publicKey} onChange={(e) => setI("processor", { ...x.processor, publicKey: e.target.value })} className="font-mono" /></Field>
            <Field label="Secret key" htmlFor="s-sk" hint="Stored server-side only at M5 — never in the browser."><Input id="s-sk" type="password" value={x.processor.secretKey} onChange={(e) => setI("processor", { ...x.processor, secretKey: e.target.value })} className="font-mono" /></Field>
          </div>
          <p className="mt-4 text-xs text-muted">Webhook: <span className="font-mono text-cream">POST /api/webhooks/processor</span> — payment.captured, payment.failed, refund.processed, payout.paid, chargeback.opened</p>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="SendGrid email" description="Receipts, reminders and campaigns." action={<Toggle label="SendGrid enabled" checked={x.sendgrid.enabled} onChange={(v) => setI("sendgrid", { ...x.sendgrid, enabled: v })} />}>
            <div className="space-y-4">
              <Field label="API key" htmlFor="s-sg"><Input id="s-sg" type="password" value={x.sendgrid.apiKey} onChange={(e) => setI("sendgrid", { ...x.sendgrid, apiKey: e.target.value })} className="font-mono" /></Field>
              <Field label="From email" htmlFor="s-sgfrom"><Input id="s-sgfrom" value={x.sendgrid.fromEmail} onChange={(e) => setI("sendgrid", { ...x.sendgrid, fromEmail: e.target.value })} /></Field>
              <Field label="From name" htmlFor="s-sgname"><Input id="s-sgname" value={x.sendgrid.fromName} onChange={(e) => setI("sendgrid", { ...x.sendgrid, fromName: e.target.value })} /></Field>
            </div>
          </Panel>
          <Panel title="Twilio SMS & Verify" description="Driver updates, OTP and two-factor codes." action={<Toggle label="Twilio enabled" checked={x.twilio.enabled} onChange={(v) => setI("twilio", { ...x.twilio, enabled: v })} />}>
            <div className="space-y-4">
              <Field label="Account SID" htmlFor="s-tw"><Input id="s-tw" value={x.twilio.sid} onChange={(e) => setI("twilio", { ...x.twilio, sid: e.target.value })} className="font-mono" /></Field>
              <Field label="Auth token" htmlFor="s-twt"><Input id="s-twt" type="password" value={x.twilio.token} onChange={(e) => setI("twilio", { ...x.twilio, token: e.target.value })} className="font-mono" /></Field>
              <Field label="From number" htmlFor="s-twn"><Input id="s-twn" value={x.twilio.from} onChange={(e) => setI("twilio", { ...x.twilio, from: e.target.value })} /></Field>
              <label className="flex items-center justify-between gap-3 text-sm text-cream">Require 2FA for staff sign-in<Toggle label="Require 2FA" checked={x.twilio.require2fa} onChange={(v) => setI("twilio", { ...x.twilio, require2fa: v })} /></label>
            </div>
          </Panel>
        </div>

        <Panel title="Availability">
          <ul className="divide-y divide-line">
            <li className="flex items-center justify-between gap-6 py-3">
              <div><p className="text-sm font-medium text-cream">Hourly car bookings</p><p className="text-xs text-muted">Let guests book cars by the hour, not just the day.</p></div>
              <Toggle label="Hourly car bookings" checked={s.hourlyBookings} onChange={(v) => set("hourlyBookings", v)} />
            </li>
            <li className="flex items-center justify-between gap-6 py-3">
              <div><p className="text-sm font-medium text-cream">Maintenance mode</p><p className="text-xs text-muted">Pause new bookings site-wide. Existing reservations are unaffected.</p></div>
              <Toggle label="Maintenance mode" checked={s.maintenanceMode} onChange={(v) => set("maintenanceMode", v)} />
            </li>
          </ul>
        </Panel>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit">Save settings</Button>
          <span className="text-xs text-muted-dim">Integration credentials are placeholders until each service is connected on the milestone plan.</span>
        </div>
      </form>
      <DemoNote />
    </div>
  );
}

interface Integrations {
  partnerCommission: number;
  payoutSchedule: string;
  baseMiles: number;
  pickupFee: number;
  deliveryPerMile: number;
  pickupPerMile: number;
  categories: { car: string[]; home: string[] };
  processor: { enabled: boolean; name: string; env: "sandbox" | "live"; publicKey: string; secretKey: string };
  sendgrid: { enabled: boolean; apiKey: string; fromEmail: string; fromName: string };
  twilio: { enabled: boolean; sid: string; token: string; from: string; require2fa: boolean };
}

const DEFAULT_INTEGRATIONS: Integrations = {
  partnerCommission: 10,
  payoutSchedule: "Net-15",
  baseMiles: 10,
  pickupFee: 150,
  deliveryPerMile: 3,
  pickupPerMile: 3,
  categories: {
    car: ["Luxury SUV", "Electric SUV", "Supercar", "Grand tourer"],
    home: ["Oceanfront Estate", "Penthouse", "Waterfront Retreat", "Bayfront Modern"],
  },
  processor: { enabled: false, name: "", env: "sandbox", publicKey: "", secretKey: "" },
  sendgrid: { enabled: false, apiKey: "", fromEmail: "drive@nxlexoticrentals.com", fromName: "NXL Concierge" },
  twilio: { enabled: false, sid: "", token: "", from: "", require2fa: true },
};
