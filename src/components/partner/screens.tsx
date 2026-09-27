"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, Landmark } from "lucide-react";
import { Panel } from "@/components/account/panel";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/controls";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { StatGrid } from "@/components/ui/layout";
import { Badge } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";
import { DataTable, PageHeader, Primary } from "@/components/admin/ui";
import { LineChart } from "@/components/admin/charts";
import { Status } from "@/components/admin/status";
import { money, moneyCompact, shortDate } from "@/lib/domain/format";
import { SITE } from "@/lib/domain/site";
import type { Partner } from "@/lib/domain/types";
import type { PartnerReferral, Payout, Reservation } from "@/lib/domain/operations";
import { LISTINGS } from "@/lib/data/fixtures/listings";
import { PAYOUTS, RESERVATIONS } from "@/lib/data/fixtures/operations";
import { C, logAudit } from "@/lib/data/demo";
import { patch, setValue, useCollection, useDemoValue } from "@/lib/data/demo-store";
import { balanceOf, partnerLedger, requestPayout } from "@/lib/data/partners";
import { useClock } from "@/lib/hooks/use-clock";
import { usePartner } from "./partner-shell";

/**
 * Partner portal screens. Everything reads the same ledger and payout rows
 * the back office's Partners and Payouts consoles do.
 */

function useLedger(partner: Partner | null) {
  const reservations = useCollection<Reservation>(C.reservations, RESERVATIONS);
  return partner ? partnerLedger(partner, reservations) : [];
}

const STATUS_TONE = { pending: "warning", cleared: "gold", paid: "success" } as const;
const STATUS_LABEL = { pending: "Clearing", cleared: "Ready to pay", paid: "Paid" } as const;

export const referralLink = (code: string, path = "/") => `${SITE.url}${path}${path.includes("?") ? "&" : "?"}ref=${code}`;

/* -------------------------------- overview -------------------------------- */

export function PartnerOverview() {
  const partner = usePartner();
  const ledger = useLedger(partner);
  const now = useClock(0);
  if (!partner) return null;

  const clearing = ledger.filter((r) => r.status === "pending").reduce((s, r) => s + r.commission, 0);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now);
    return new Date(d.getFullYear(), d.getMonth() - (5 - i), 1).getTime();
  });
  const monthly = months.map((m, i) => {
    const end = months[i + 1] ?? now + 1;
    return ledger.filter((r) => r.at >= m && r.at < end).reduce((s, r) => s + r.commission, 0);
  });

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={partner.type} title={`Welcome back, ${partner.contact.split(" ")[0]}.`} description={`${partner.business} · earning ${partner.commission}% on every booking your guests make.`} />
      <StatGrid
        stats={[
          { label: "Guests referred", value: partner.referrals },
          { label: "Ready to pay", value: money(balanceOf(partner)) },
          { label: "Clearing", value: money(clearing), hint: "Pays once the rental completes" },
          { label: "Lifetime paid", value: money(partner.paidOut) },
        ]}
      />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Commission by month" description="Last six months, by booking date.">
          <LineChart title="Commission by month" labels={months.map((m) => new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(m)))} series={[{ name: "Commission", values: monthly }]} area format={moneyCompact} />
        </Panel>
        <Panel title="Your link" description="Share it anywhere — every booking made within 30 days is credited to you.">
          <CopyField value={referralLink(partner.code)} />
          <p className="mt-4 text-xs text-muted">Or give guests your code <span className="font-mono text-gold">{partner.code}</span> — the concierge applies it to phone bookings.</p>
          <div className="mt-5 rounded-lg border border-line bg-ink/40 p-4 text-sm">
            <p className="text-muted">Next payout</p>
            <p className="mt-1 font-mono text-lg text-cream">{money(balanceOf(partner))}</p>
            <p className="text-xs text-muted-dim">Paid Net-15 by ACH, or request it now from Payouts.</p>
          </div>
        </Panel>
      </div>
      <Panel title="Recent referrals">
        <LedgerTable rows={ledger.slice(0, 6)} />
      </Panel>
    </div>
  );
}

function LedgerTable({ rows }: { rows: PartnerReferral[] }) {
  return (
    <DataTable
      caption="Referrals"
      rows={rows}
      rowKey={(r) => r.id}
      empty="No referrals yet — share your link to get started."
      columns={[
        { key: "guest", header: "Guest", cell: (r) => <Primary title={r.guest} sub={shortDate(r.at)} /> },
        { key: "booking", header: "Booking", hideBelow: "sm", cell: (r) => <Primary title={r.listingName} sub={r.reference} /> },
        { key: "amount", header: "Rental value", align: "right", hideBelow: "md", cell: (r) => money(r.amount) },
        { key: "commission", header: "Your commission", align: "right", cell: (r) => <span className="font-mono text-gold">{money(r.commission)}</span> },
        { key: "status", header: "Status", align: "right", cell: (r) => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
      ]}
    />
  );
}

/* -------------------------------- referrals ------------------------------- */

export function PartnerReferrals() {
  const partner = usePartner();
  const ledger = useLedger(partner);
  const [filter, setFilter] = useState<"all" | PartnerReferral["status"]>("all");
  if (!partner) return null;
  const rows = ledger.filter((r) => filter === "all" || r.status === filter);
  const total = (s: PartnerReferral["status"]) => ledger.filter((r) => r.status === s).reduce((t, r) => t + r.commission, 0);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Referrals" title="Every guest you've sent" description="Commission clears when the rental completes, then pays out on your schedule." />
      <StatGrid
        stats={[
          { label: "Clearing", value: money(total("pending")) },
          { label: "Ready to pay", value: money(total("cleared")) },
          { label: "Paid", value: money(total("paid")) },
          { label: "Avg. booking", value: money(Math.round(ledger.reduce((s, r) => s + r.amount, 0) / (ledger.length || 1))) },
        ]}
      />
      <SegmentedControl<"all" | PartnerReferral["status"]>
        label="Filter referrals"
        size="sm"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: `All (${ledger.length})` },
          { value: "pending", label: "Clearing" },
          { value: "cleared", label: "Ready to pay" },
          { value: "paid", label: "Paid" },
        ]}
        className="w-full sm:w-fit"
      />
      <LedgerTable rows={rows} />
    </div>
  );
}

/* ---------------------------------- links --------------------------------- */

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <Input readOnly value={value} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
          toast("Link copied.");
          window.setTimeout(() => setCopied(false), 1800);
        }}
      >
        {copied ? <Check aria-hidden width={14} height={14} /> : <Copy aria-hidden width={14} height={14} />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function Qr({ value, label }: { value: string; label: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void QRCode.toString(value, { type: "svg", margin: 1, color: { dark: "#08080a", light: "#f5f1e8" } }).then((s) => live && setSvg(s));
    return () => {
      live = false;
    };
  }, [value]);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-44 overflow-hidden rounded-lg bg-cream p-2" role="img" aria-label={`QR code for ${label}`} dangerouslySetInnerHTML={svg ? { __html: svg } : undefined} />
      <Button
        size="sm"
        variant="ghost"
        disabled={!svg}
        onClick={() => {
          const url = URL.createObjectURL(new Blob([svg ?? ""], { type: "image/svg+xml" }));
          const a = document.createElement("a");
          a.href = url;
          a.download = `nxl-${label.toLowerCase().replace(/\W+/g, "-")}-qr.svg`;
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        <Download aria-hidden width={13} height={13} /> Download SVG
      </Button>
    </div>
  );
}

export function PartnerLinks() {
  const partner = usePartner();
  const [target, setTarget] = useState("/");
  if (!partner) return null;
  const options = [
    { value: "/", label: "Home page" },
    { value: "/cars", label: "Exotic cars" },
    { value: "/homes", label: "Luxury estates" },
    ...LISTINGS.map((l) => ({ value: `/${l.kind === "car" ? "cars" : "homes"}/${l.slug}`, label: l.name })),
  ];
  const link = referralLink(partner.code, target);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Links & QR" title="Share NXL your way" description="Every link carries your code. Point guests at the home page, or straight at the car or estate they'll love." />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel title="Build a link">
          <div className="space-y-4">
            <Field label="Send guests to" htmlFor="pl-target">
              <Select id="pl-target" value={target} onChange={(e) => setTarget(e.target.value)}>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <CopyField value={link} />
            <Alert tone="info">Guests who arrive through your link are credited to you for 30 days, even if they book later from another device after signing in.</Alert>
          </div>
        </Panel>
        <Panel title="QR code" description="For the concierge desk, room cards or the yacht galley.">
          <Qr value={link} label={partner.code} />
        </Panel>
      </div>
      <Panel title="Ready-made copy">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            `Our guests get the NXL fleet delivered to the door — Rolls-Royce, Bentley, Range Rover. Book here: ${referralLink(partner.code)}`,
            `Planning a stay in Miami? Private estates and exotic cars from NXL, with concierge delivery: ${referralLink(partner.code, "/homes")}`,
          ].map((t) => (
            <div key={t} className="rounded-lg border border-line bg-ink/40 p-4 text-sm text-cream/85">
              <p>{t}</p>
              <button type="button" onClick={() => { void navigator.clipboard?.writeText(t); toast("Copied."); }} className="mt-3 text-xs text-gold hover:underline">Copy text</button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- payouts -------------------------------- */

interface PayoutMethod {
  kind: "ACH" | "Wire";
  bank: string;
  last4: string;
}

export function PartnerPayouts() {
  const partner = usePartner();
  const payouts = useCollection<Payout>(C.payouts, PAYOUTS);
  const method = useDemoValue<PayoutMethod>(`payout-method:${partner?.id ?? "-"}`, { kind: "ACH", bank: "Chase", last4: "6721" });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(method);
  if (!partner) return null;
  const mine = payouts.filter((p) => p.partnerId === partner.id).sort((a, b) => b.scheduledFor - a.scheduledFor);
  const requested = mine.some((p) => p.status === "scheduled" || p.status === "processing");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Payouts" title="Getting paid" description="Commission is paid Net-15 after each rental completes. Request your cleared balance any time." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel tone="gold" title="Available now">
          <p className="text-metal-soft font-mono text-display-4">{money(balanceOf(partner))}</p>
          <p className="mt-1 text-xs text-muted">Lifetime paid {money(partner.paidOut)}</p>
          <Button
            className="mt-5"
            disabled={balanceOf(partner) <= 0 || requested}
            onClick={() => {
              const po = requestPayout(partner);
              if (po) toast(`${money(po.amount)} requested — it arrives by ${shortDate(po.scheduledFor)}.`);
            }}
          >
            {requested ? "Payout already on its way" : "Request payout"}
          </Button>
        </Panel>
        <Panel title="Payout method" action={!editing ? <Button size="sm" variant="ghost" onClick={() => { setDraft(method); setEditing(true); }}>Change</Button> : undefined}>
          {editing ? (
            <div className="space-y-4">
              <SegmentedControl<PayoutMethod["kind"]> label="Method" size="sm" value={draft.kind} onChange={(kind) => setDraft({ ...draft, kind })} options={[{ value: "ACH", label: "ACH" }, { value: "Wire", label: "Wire" }]} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Bank" htmlFor="pm-bank"><Input id="pm-bank" value={draft.bank} onChange={(e) => setDraft({ ...draft, bank: e.target.value })} /></Field>
                <Field label="Account number" htmlFor="pm-acct" hint="Only the last four are kept"><Input id="pm-acct" inputMode="numeric" placeholder={`•••• ${draft.last4}`} onChange={(e) => setDraft({ ...draft, last4: e.target.value.replace(/\D/g, "").slice(-4) || draft.last4 })} /></Field>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { setValue(`payout-method:${partner.id}`, draft); logAudit(partner.contact, "partner.payout_method", partner.business, `${draft.kind} · ${draft.bank} ····${draft.last4}`); setEditing(false); toast("Payout method saved."); }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-lg border border-gold/40 text-gold"><Landmark aria-hidden width={18} height={18} /></span>
              <div>
                <p className="text-sm text-cream">{method.kind} · {method.bank} ···· {method.last4}</p>
                <p className="text-xs text-muted">Payouts go live with the payment processor at launch.</p>
              </div>
            </div>
          )}
        </Panel>
      </div>
      <Panel title="History">
        {mine.length ? (
          <DataTable
            caption="Payout history"
            rows={mine}
            rowKey={(p) => p.id}
            columns={[
              { key: "period", header: "Period", cell: (p) => `${shortDate(p.period.start)} – ${shortDate(p.period.end)}` },
              { key: "date", header: "Pay date", hideBelow: "sm", cell: (p) => shortDate(p.scheduledFor) },
              { key: "method", header: "Method", hideBelow: "md", cell: (p) => p.method },
              { key: "amount", header: "Amount", align: "right", cell: (p) => money(p.amount) },
              { key: "status", header: "Status", align: "right", cell: (p) => <Status kind="payout" value={p.status} /> },
            ]}
          />
        ) : (
          <EmptyState title="No payouts yet" description="Your first payout is scheduled once a referred rental completes." />
        )}
      </Panel>
    </div>
  );
}

/* --------------------------------- profile -------------------------------- */

export function PartnerProfile() {
  const partner = usePartner();
  const [form, setForm] = useState(() => ({ contact: partner?.contact ?? "", email: partner?.email ?? "", phone: partner?.phone ?? "" }));
  if (!partner) return null;
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Profile" title={partner.business} description="Your contact details for payouts, statements and guest hand-offs." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Contact">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              patch<Partner>(C.partners, partner, { contact: form.contact.trim(), email: form.email.trim(), phone: form.phone.trim() });
              logAudit(form.contact, "partner.profile_updated", partner.business, "Contact details edited");
              toast("Profile saved.");
            }}
          >
            <Field label="Contact name" htmlFor="pp-name"><Input id="pp-name" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
            <Field label="Email" htmlFor="pp-email"><Input id="pp-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone" htmlFor="pp-phone"><Input id="pp-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Button type="submit">Save</Button>
          </form>
        </Panel>
        <Panel title="Programme terms">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Referral code</dt><dd className="font-mono text-gold">{partner.code}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Commission</dt><dd className="text-cream">{partner.commission}% of rental value</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Attribution window</dt><dd className="text-cream">30 days</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Payout schedule</dt><dd className="text-cream">Net-15</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Partner since</dt><dd className="text-cream">{shortDate(partner.joinedAt)}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-muted-dim">Commission is on the rental total, excluding deposits, damage charges and refunds.</p>
        </Panel>
      </div>
    </div>
  );
}
