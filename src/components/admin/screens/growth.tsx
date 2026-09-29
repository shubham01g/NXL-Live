"use client";

import { useState } from "react";
import { Bell, CalendarCheck, CreditCard, Handshake, Mail, MessageSquare, Plus, Send, Server, Trash2, Truck, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/account/panel";
import { Button } from "@/components/ui/button";
import { SegmentedControl, Toggle } from "@/components/ui/controls";
import { Alert, EmptyState, ProgressBar } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { StatGrid } from "@/components/ui/layout";
import { Modal } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { count, money, relativeTime, shortDate } from "@/lib/domain/format";
import { SITE } from "@/lib/domain/site";
import { tierFor } from "@/lib/domain/loyalty";
import {
  fillMergeTags,
  MERGE_TAGS,
  type AlertKind,
  type Broadcast,
  type Customer,
  type MessageLogEntry,
  type MessageTemplate,
  type OpsAlert,
  type Partner,
  type Promo,
  type PromoType,
  type SeoPage,
} from "@/lib/domain/operations";
import { C, logAudit, notify, queueMessage } from "@/lib/data/demo";
import { create, newId, patch, remove, setValue, useCollection, useDemoValue } from "@/lib/data/demo-store";
import { useClock } from "@/lib/hooks/use-clock";
import { DataTable, DemoNote, PageHeader, Primary } from "../ui";
import { Status } from "../status";
import { useActor } from "../reservation-tools";

/* --------------------------------- marketing -------------------------------- */

const PROMO_TYPE_LABEL: Record<PromoType, string> = {
  percent: "% off",
  flat: "$ off",
  "free-delivery": "Free delivery",
  "free-insurance": "Free NXL coverage",
};

const promoValue = (p: Pick<Promo, "type" | "value">) =>
  p.type === "percent" ? `${p.value}% off` : p.type === "flat" ? `${money(p.value)} off` : PROMO_TYPE_LABEL[p.type];

interface Campaign {
  id: string;
  name: string;
  channel: "email" | "sms" | "push";
  audience: string;
  promoCode: string | null;
  status: "draft" | "scheduled" | "sent";
  sendAt: number;
  sent: number;
  opens: number;
  bookings: number;
}

const DAY = 86_400_000;
const seedCampaigns = (now: number): Campaign[] => [
  { id: "cp-1", name: "Art Basel early access", channel: "email", audience: "Gold & Platinum", promoCode: "ARTBASEL", status: "scheduled", sendAt: now + 10 * DAY, sent: 0, opens: 0, bookings: 0 },
  { id: "cp-2", name: "Estate weekends — autumn", channel: "email", audience: "All members", promoCode: "MIAMI200", status: "sent", sendAt: now - 12 * DAY, sent: 1_184, opens: 612, bookings: 23 },
  { id: "cp-3", name: "Cullinan is back", channel: "push", audience: "Enrolled members", promoCode: null, status: "sent", sendAt: now - 30 * DAY, sent: 842, opens: 391, bookings: 11 },
  { id: "cp-4", name: "Welcome series", channel: "sms", audience: "New members (30 days)", promoCode: "WELCOME10", status: "sent", sendAt: now - 45 * DAY, sent: 138, opens: 121, bookings: 17 },
];

interface ReferralProgram {
  referrerCredit: number;
  refereeDiscount: number;
  minBooking: number;
  enabled: boolean;
}
const DEFAULT_PROGRAM: ReferralProgram = { referrerCredit: 250, refereeDiscount: 10, minBooking: 500, enabled: true };

type MarketingTab = "promos" | "campaigns" | "referrals";

export function MarketingScreen({ initial, partners: basePartners }: { initial: Promo[]; partners: Partner[] }) {
  const promos = useCollection<Promo>(C.promos, initial);
  const now = useClock(0);
  const [seed] = useState(() => seedCampaigns(now));
  const campaigns = useCollection<Campaign>("campaigns", seed);
  const partners = useCollection<Partner>(C.partners, basePartners);
  const program = useDemoValue<ReferralProgram>("referral-program", DEFAULT_PROGRAM);
  const actor = useActor();
  const [tab, setTab] = useState<MarketingTab>("promos");
  const [editing, setEditing] = useState<Promo | "new" | null>(null);
  const [newCampaign, setNewCampaign] = useState(false);

  const effective = (p: Promo) => (p.status === "active" && p.expiresAt !== null && p.expiresAt < now ? "expired" : p.status);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Growth"
        title="Marketing"
        description="Promo codes that apply at checkout, campaigns to members, and the member referral programme."
        actions={
          tab === "campaigns" ? (
            <Button onClick={() => setNewCampaign(true)}><Plus aria-hidden width={16} height={16} /> New campaign</Button>
          ) : tab === "promos" ? (
            <Button onClick={() => setEditing("new")}><Plus aria-hidden width={16} height={16} /> New promo code</Button>
          ) : undefined
        }
      />

      <StatGrid
        stats={[
          { label: "Live codes", value: promos.filter((p) => effective(p) === "active").length },
          { label: "Redemptions", value: promos.reduce((s, p) => s + p.uses, 0) },
          { label: "Campaigns sent", value: campaigns.filter((c) => c.status === "sent").length },
          { label: "Bookings from campaigns", value: campaigns.reduce((s, c) => s + c.bookings, 0) },
        ]}
      />

      <Tabs<MarketingTab>
        label="Marketing"
        value={tab}
        onChange={setTab}
        items={[
          { value: "promos", label: "Promo codes", count: promos.length },
          { value: "campaigns", label: "Campaigns", count: campaigns.length },
          { value: "referrals", label: "Referral programme" },
        ]}
      />

      {tab === "promos" ? (
        <DataTable
          caption="Promo codes"
          rows={promos}
          rowKey={(p) => p.id}
          onRowClick={(p) => setEditing(p)}
          columns={[
            { key: "code", header: "Code", cell: (p) => <Primary title={<span className="font-mono tracking-wider text-gold">{p.code}</span>} sub={p.description} /> },
            { key: "offer", header: "Offer", hideBelow: "sm", cell: (p) => promoValue(p) },
            { key: "scope", header: "Applies to", hideBelow: "lg", cell: (p) => `${p.appliesTo === "all" ? "Everything" : p.appliesTo === "cars" ? "Cars" : "Estates"}${p.minSpend ? ` · min ${money(p.minSpend)}` : ""}` },
            {
              key: "uses",
              header: "Used",
              hideBelow: "md",
              cell: (p) =>
                p.maxUses ? (
                  <div className="w-28">
                    <p className="mb-1 text-xs text-cream">{p.uses} / {p.maxUses}</p>
                    <ProgressBar value={p.uses / p.maxUses} label={`${p.code} usage`} />
                  </div>
                ) : (
                  `${p.uses} · no cap`
                ),
            },
            { key: "exp", header: "Expires", hideBelow: "lg", cell: (p) => (p.expiresAt ? shortDate(p.expiresAt) : "Never") },
            { key: "status", header: "Status", cell: (p) => <Status kind="promo" value={effective(p)} /> },
            {
              key: "action",
              header: "",
              align: "right",
              cell: (p) =>
                p.status === "active" || p.status === "paused" ? (
                  <button
                    type="button"
                    onClick={() => {
                      const status = p.status === "paused" ? "active" : "paused";
                      patch<Promo>(C.promos, p, { status });
                      logAudit(actor.name, `promo.${status}`, p.code, status === "active" ? "Resumed" : "Paused");
                      toast(`${p.code} ${status === "active" ? "resumed" : "paused"}.`);
                    }}
                    className="rounded-full px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
                  >
                    {p.status === "paused" ? "Resume" : "Pause"}
                  </button>
                ) : null,
            },
          ]}
        />
      ) : tab === "campaigns" ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-surface-1/50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-cream">{c.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{c.channel.toUpperCase()} · {c.audience}{c.promoCode ? ` · ${c.promoCode}` : ""}</p>
                </div>
                <Badge tone={c.status === "sent" ? "success" : c.status === "scheduled" ? "gold" : "neutral"}>{c.status}</Badge>
              </div>
              <dl className="mt-4 grid grid-cols-4 gap-2 text-sm">
                <div><dt className="text-xs text-muted">Sent</dt><dd className="text-cream">{count(c.sent)}</dd></div>
                <div><dt className="text-xs text-muted">Opened</dt><dd className="text-cream">{c.sent ? `${Math.round((c.opens / c.sent) * 100)}%` : "—"}</dd></div>
                <div><dt className="text-xs text-muted">Bookings</dt><dd className="text-cream">{c.bookings}</dd></div>
                <div><dt className="text-xs text-muted">{c.status === "sent" ? "Sent" : "Sends"}</dt><dd className="text-cream">{shortDate(c.sendAt)}</dd></div>
              </dl>
              {c.status !== "sent" ? (
                <div className="mt-4 flex gap-2 border-t border-line pt-4">
                  <Button size="sm" onClick={() => { patch<Campaign>("campaigns", c, { status: "sent", sendAt: Date.now(), sent: 0 }); logAudit(actor.name, "campaign.sent", c.name, `${c.channel} to ${c.audience}`); toast(`${c.name} queued — delivery starts when ${c.channel === "sms" ? "Twilio" : c.channel === "email" ? "SendGrid" : "push"} is connected.`, "info"); }}>
                    <Send aria-hidden width={13} height={13} /> Send now
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove("campaigns", c.id)}>Delete</Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title="Member referral programme"
            description="Members share a link; the friend gets a discount on their first booking and the member earns drive credit once it completes."
            action={<Toggle label="Programme enabled" checked={program.enabled} onChange={(enabled) => setValue("referral-program", { ...program, enabled })} />}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Referrer credit ($)" htmlFor="rp-credit"><Input id="rp-credit" type="number" value={program.referrerCredit} onChange={(e) => setValue("referral-program", { ...program, referrerCredit: Number(e.target.value) })} /></Field>
              <Field label="Friend discount (%)" htmlFor="rp-disc"><Input id="rp-disc" type="number" value={program.refereeDiscount} onChange={(e) => setValue("referral-program", { ...program, refereeDiscount: Number(e.target.value) })} /></Field>
              <Field label="Min. booking ($)" htmlFor="rp-min"><Input id="rp-min" type="number" value={program.minBooking} onChange={(e) => setValue("referral-program", { ...program, minBooking: Number(e.target.value) })} /></Field>
            </div>
            <ul className="mt-5 space-y-1.5 text-sm text-muted">
              <li>• Credit is issued after the friend&apos;s first rental completes.</li>
              <li>• One reward per new member; self-referrals are ignored.</li>
              <li>• Stacks with Level Rewards points, not with other promo codes.</li>
            </ul>
          </Panel>
          <Panel title="Top referrers" description="Partners and members bringing in the most guests.">
            <ul className="divide-y divide-line">
              {[...partners].sort((a, b) => b.referrals - a.referrals).slice(0, 6).map((p, i) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="flex items-center gap-3"><span className="w-5 font-mono text-xs text-muted">{i + 1}</span><span className="text-cream">{p.business}</span></span>
                  <span className="font-mono text-gold">{p.referrals} guests</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
      <DemoNote />

      <PromoEditor key={editing === "new" ? "new" : (editing?.id ?? "none")} promo={editing} taken={promos.map((p) => p.code)} onClose={() => setEditing(null)} actor={actor.name} />
      <CampaignModal open={newCampaign} onClose={() => setNewCampaign(false)} promos={promos} actor={actor.name} />
    </div>
  );
}

function PromoEditor({ promo, taken, onClose, actor }: { promo: Promo | "new" | null; taken: string[]; onClose: () => void; actor: string }) {
  const existing = promo && promo !== "new" ? promo : null;
  const [form, setForm] = useState({
    code: existing?.code ?? "",
    description: existing?.description ?? "",
    type: existing?.type ?? ("percent" as PromoType),
    value: String(existing?.value ?? 10),
    appliesTo: existing?.appliesTo ?? ("all" as Promo["appliesTo"]),
    maxUses: existing?.maxUses ? String(existing.maxUses) : "",
    minSpend: existing?.minSpend ? String(existing.minSpend) : "",
    expires: existing?.expiresAt ? new Date(existing.expiresAt).toISOString().slice(0, 10) : "",
    status: existing?.status === "expired" ? "active" : (existing?.status ?? ("active" as Promo["status"])),
  });
  const [error, setError] = useState<string | null>(null);
  if (!promo) return null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  function save() {
    const code = form.code.trim().toUpperCase().replace(/\s+/g, "");
    if (code.length < 3) return setError("Codes need at least 3 characters.");
    if (!existing && taken.includes(code)) return setError("That code already exists.");
    const fields = {
      code,
      description: form.description.trim() || promoValue({ type: form.type, value: Number(form.value) }),
      type: form.type,
      value: Number(form.value) || 0,
      appliesTo: form.appliesTo,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      minSpend: form.minSpend ? Number(form.minSpend) : undefined,
      expiresAt: form.expires ? new Date(`${form.expires}T23:59:59`).getTime() : null,
      status: form.status,
    };
    if (existing) {
      patch<Promo>(C.promos, existing, fields);
      logAudit(actor, "promo.updated", code, fields.description);
    } else {
      create<Promo>(C.promos, { id: newId("pr"), uses: 0, ...fields });
      logAudit(actor, "promo.created", code, fields.description);
    }
    toast(`${code} saved.`);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? `Edit ${existing.code}` : "New promo code"}
      footer={
        <>
          {existing ? (
            <Button variant="ghost" className="mr-auto text-danger hover:text-danger" onClick={() => { remove(C.promos, existing.id); logAudit(actor, "promo.deleted", existing.code, "Deleted"); toast(`${existing.code} deleted.`); onClose(); }}>
              <Trash2 aria-hidden width={14} height={14} /> Delete
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save code</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" htmlFor="pe-code" required><Input id="pe-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="font-mono uppercase" placeholder="SUMMER15" disabled={!!existing} /></Field>
        <Field label="Status" htmlFor="pe-status">
          <Select id="pe-status" value={form.status} onChange={set("status")}>
            <option value="active">Live</option>
            <option value="scheduled">Scheduled</option>
            <option value="paused">Paused</option>
          </Select>
        </Field>
        <Field label="Description" htmlFor="pe-desc" className="sm:col-span-2"><Input id="pe-desc" value={form.description} onChange={set("description")} placeholder="Shown to the guest at checkout" /></Field>
        <Field label="Type" htmlFor="pe-type">
          <Select id="pe-type" value={form.type} onChange={set("type")}>
            {(Object.keys(PROMO_TYPE_LABEL) as PromoType[]).map((t) => <option key={t} value={t}>{PROMO_TYPE_LABEL[t]}</option>)}
          </Select>
        </Field>
        <Field label={form.type === "percent" ? "Percent" : "Amount ($)"} htmlFor="pe-val"><Input id="pe-val" type="number" min={0} value={form.value} disabled={form.type === "free-delivery" || form.type === "free-insurance"} onChange={set("value")} /></Field>
        <Field label="Applies to" htmlFor="pe-to">
          <Select id="pe-to" value={form.appliesTo} onChange={set("appliesTo")}>
            <option value="all">Everything</option>
            <option value="cars">Cars only</option>
            <option value="homes">Estates only</option>
          </Select>
        </Field>
        <Field label="Minimum booking ($)" htmlFor="pe-min"><Input id="pe-min" type="number" min={0} value={form.minSpend} onChange={set("minSpend")} placeholder="None" /></Field>
        <Field label="Max uses" htmlFor="pe-max" hint="Blank for unlimited"><Input id="pe-max" type="number" min={1} value={form.maxUses} onChange={set("maxUses")} /></Field>
        <Field label="Expires" htmlFor="pe-exp" hint="Blank never expires"><Input id="pe-exp" type="date" value={form.expires} onChange={set("expires")} /></Field>
      </div>
      {error ? <Alert tone="danger" className="mt-4">{error}</Alert> : null}
    </Modal>
  );
}

function CampaignModal({ open, onClose, promos, actor }: { open: boolean; onClose: () => void; promos: Promo[]; actor: string }) {
  const [form, setForm] = useState({ name: "", channel: "email" as Campaign["channel"], audience: "All members", promoCode: "", sendAt: "" });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New campaign"
      description="Scheduled campaigns send through SendGrid, Twilio or web push once they're connected at launch."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={form.name.trim().length < 3}
            onClick={() => {
              create<Campaign>("campaigns", { id: newId("cp"), name: form.name.trim(), channel: form.channel, audience: form.audience, promoCode: form.promoCode || null, status: form.sendAt ? "scheduled" : "draft", sendAt: form.sendAt ? new Date(form.sendAt).getTime() : Date.now(), sent: 0, opens: 0, bookings: 0 });
              logAudit(actor, "campaign.created", form.name.trim(), `${form.channel} · ${form.audience}`);
              toast("Campaign saved.");
              onClose();
            }}
          >
            Save campaign
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="cm-name" className="sm:col-span-2"><Input id="cm-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Channel" htmlFor="cm-ch">
          <Select id="cm-ch" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as Campaign["channel"] })}>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="push">Push</option>
          </Select>
        </Field>
        <Field label="Audience" htmlFor="cm-aud">
          <Select id="cm-aud" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
            {["All members", "Enrolled members", "Gold & Platinum", "Walk-in customers", "New members (30 days)", "No booking in 90 days"].map((a) => <option key={a}>{a}</option>)}
          </Select>
        </Field>
        <Field label="Attach promo code" htmlFor="cm-promo">
          <Select id="cm-promo" value={form.promoCode} onChange={(e) => setForm({ ...form, promoCode: e.target.value })}>
            <option value="">None</option>
            {promos.map((p) => <option key={p.id} value={p.code}>{p.code}</option>)}
          </Select>
        </Field>
        <Field label="Send at" htmlFor="cm-at" hint="Blank saves a draft"><Input id="cm-at" type="datetime-local" value={form.sendAt} onChange={(e) => setForm({ ...form, sendAt: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

/* ------------------------------------ seo ----------------------------------- */

function Meter({ length, ideal }: { length: number; ideal: [number, number] }) {
  const [lo, hi] = ideal;
  const tone = length === 0 ? "danger" : length > hi ? "danger" : length < lo ? "warning" : "success";
  const text = length === 0 ? "Missing" : length > hi ? "Too long — will be cut off" : length < lo ? "A little short" : "Good length";
  return <p className={cn("text-xs", tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-danger")}>{length} characters · {text}</p>;
}

interface Keywords {
  primary: string[];
  longtail: string[];
  local: string[];
}
const DEFAULT_KEYWORDS: Keywords = {
  primary: ["exotic car rental miami", "luxury car rental miami", "rolls royce rental miami", "luxury villa rental miami beach"],
  longtail: ["rent a rolls royce cullinan by the hour", "exotic car delivery south beach", "bentley bentayga rental miami"],
  local: ["south beach", "miami beach", "brickell", "fisher island"],
};
interface SiteMeta {
  title: string;
  description: string;
  robots: string;
  ogImage: string;
  twitter: string;
  canonical: string;
}
const DEFAULT_META: SiteMeta = {
  title: `${SITE.name} — Exotic Cars & Luxury Estates`,
  description: SITE.description,
  robots: "index, follow",
  ogImage: "/opengraph-image.jpg",
  twitter: "@nxlexotics",
  canonical: SITE.url,
};

type SeoTab = "pages" | "keywords" | "meta" | "schema" | "sitemap";

const SCHEMA = [
  { type: "Organization", where: "Every page", live: true },
  { type: "AutoRental (LocalBusiness)", where: "Home", live: true },
  { type: "FAQPage", where: "Home", live: true },
  { type: "Product + Offer", where: "Car and estate pages", live: true },
  { type: "BreadcrumbList", where: "Listing pages", live: true },
  { type: "AggregateRating", where: "Listings with reviews", live: true },
  { type: "Event", where: "Member events", live: false },
  { type: "VacationRental", where: "Estate pages", live: false },
];

const SITEMAP = [
  ["/", "1.0", "daily"],
  ["/cars", "0.9", "daily"],
  ["/homes", "0.9", "daily"],
  ["/cars/[slug] · 21 cars", "0.8", "weekly"],
  ["/homes/[slug] · 4 estates", "0.8", "weekly"],
  ["/subscriptions", "0.8", "weekly"],
  ["/loyalty", "0.7", "weekly"],
  ["/partners", "0.7", "weekly"],
  ["/about · /who-we-are · /contact", "0.6", "monthly"],
  ["/insurance · /terms · /privacy", "0.3–0.5", "monthly"],
];

export function SeoScreen({ initial }: { initial: SeoPage[] }) {
  const pagesRaw = useCollection<SeoPage & { id: string }>(C.seo, initial.map((p) => ({ ...p, id: p.path })));
  const keywords = useDemoValue<Keywords>("seo:keywords", DEFAULT_KEYWORDS);
  const meta = useDemoValue<SiteMeta>("seo:meta", DEFAULT_META);
  const sitemap = useDemoValue("seo:sitemap", { enabled: true, indexing: true });
  const actor = useActor();
  const [tab, setTab] = useState<SeoTab>("pages");
  const [path, setPath] = useState(initial[0]?.path ?? "/");
  const [kwDraft, setKwDraft] = useState<Record<keyof Keywords, string>>({ primary: "", longtail: "", local: "" });
  const page = pagesRaw.find((p) => p.path === path) ?? pagesRaw[0];

  const edit = (change: Partial<SeoPage>) => patch<SeoPage & { id: string }>(C.seo, page, change);
  const issues = (p: SeoPage) => p.indexed && (!p.description || p.title.length > 60 || p.description.length > 160 || !p.keyword);
  const setMeta = (change: Partial<SiteMeta>) => setValue("seo:meta", { ...meta, ...change });

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Growth" title="SEO" description="How NXL appears in search: page titles and descriptions, keywords, social cards, structured data and the sitemap." />

      <StatGrid
        stats={[
          { label: "Pages indexed", value: `${pagesRaw.filter((p) => p.indexed).length} / ${pagesRaw.length}` },
          { label: "Pages to fix", value: pagesRaw.filter(issues).length },
          { label: "Tracked keywords", value: keywords.primary.length + keywords.longtail.length + keywords.local.length },
          { label: "Schema types live", value: SCHEMA.filter((s) => s.live).length },
        ]}
      />

      <Tabs<SeoTab>
        label="SEO"
        value={tab}
        onChange={setTab}
        items={[
          { value: "pages", label: "Pages", flag: pagesRaw.some(issues) },
          { value: "keywords", label: "Keywords" },
          { value: "meta", label: "Meta & social" },
          { value: "schema", label: "Schema" },
          { value: "sitemap", label: "Sitemap" },
        ]}
      />

      {tab === "pages" ? (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <ul className="flex flex-col gap-1.5" aria-label="Pages">
            {pagesRaw.map((p) => (
              <li key={p.path}>
                <button
                  type="button"
                  onClick={() => setPath(p.path)}
                  aria-current={p.path === path ? "true" : undefined}
                  className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left transition-colors", p.path === path ? "edge-gold" : "border border-line hover:border-gold/40")}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-xs text-gold">{p.path}</span>
                    <span className="block truncate text-sm text-cream/85">{p.title}</span>
                  </span>
                  {!p.indexed ? <Badge>No-index</Badge> : issues(p) ? <Badge tone="warning">Fix</Badge> : <Badge tone="success">OK</Badge>}
                </button>
              </li>
            ))}
          </ul>
          <Panel title={`Editing ${page.path}`} description="Saved as you type.">
            <div className="space-y-5">
              <Field label="Title tag" htmlFor="seo-title">
                <Input id="seo-title" value={page.title} onChange={(e) => edit({ title: e.target.value })} />
                <Meter length={page.title.length} ideal={[30, 60]} />
              </Field>
              <Field label="Meta description" htmlFor="seo-desc">
                <Textarea id="seo-desc" rows={3} value={page.description} onChange={(e) => edit({ description: e.target.value })} />
                <Meter length={page.description.length} ideal={[70, 160]} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <Field label="Focus keyword" htmlFor="seo-kw"><Input id="seo-kw" value={page.keyword} onChange={(e) => edit({ keyword: e.target.value })} /></Field>
                <span className="flex items-center gap-3 pb-3 text-sm text-cream/85">
                  <Toggle label="Allow search engines to index this page" checked={page.indexed} onChange={(indexed) => { edit({ indexed }); logAudit(actor.name, "seo.indexing", page.path, indexed ? "Indexed" : "No-index"); }} />
                  Indexed
                </span>
              </div>
              <SerpPreview url={`${SITE.domain} › ${page.path === "/" ? "" : page.path.slice(1)}`} title={page.title} description={page.description} />
            </div>
          </Panel>
        </div>
      ) : tab === "keywords" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {(["primary", "longtail", "local"] as (keyof Keywords)[]).map((group) => (
            <Panel key={group} title={group === "primary" ? "Primary" : group === "longtail" ? "Long-tail" : "Local"} description={group === "primary" ? "High-intent terms each money page targets." : group === "longtail" ? "Specific searches that convert." : "Neighbourhoods and landmarks."}>
              <ul className="flex flex-wrap gap-1.5">
                {keywords[group].map((k) => (
                  <li key={k} className="flex items-center gap-1 rounded-full border border-gold/30 px-3 py-1 text-xs text-cream">
                    {k}
                    <button type="button" aria-label={`Remove ${k}`} onClick={() => setValue("seo:keywords", { ...keywords, [group]: keywords[group].filter((x) => x !== k) })} className="text-muted hover:text-danger">
                      <X width={11} height={11} />
                    </button>
                  </li>
                ))}
              </ul>
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const k = kwDraft[group].trim().toLowerCase();
                  if (!k || keywords[group].includes(k)) return;
                  setValue("seo:keywords", { ...keywords, [group]: [...keywords[group], k] });
                  setKwDraft({ ...kwDraft, [group]: "" });
                }}
              >
                <Input aria-label={`Add ${group} keyword`} value={kwDraft[group]} onChange={(e) => setKwDraft({ ...kwDraft, [group]: e.target.value })} placeholder="Add keyword" className="h-10 py-2" />
                <Button type="submit" size="sm" variant="outline">Add</Button>
              </form>
            </Panel>
          ))}
        </div>
      ) : tab === "meta" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Site defaults" description="Used wherever a page doesn't set its own.">
            <div className="space-y-4">
              <Field label="Site title" htmlFor="sm-title"><Input id="sm-title" value={meta.title} onChange={(e) => setMeta({ title: e.target.value })} /><Meter length={meta.title.length} ideal={[30, 70]} /></Field>
              <Field label="Meta description" htmlFor="sm-desc"><Textarea id="sm-desc" rows={3} value={meta.description} onChange={(e) => setMeta({ description: e.target.value })} /><Meter length={meta.description.length} ideal={[70, 180]} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Robots" htmlFor="sm-robots">
                  <Select id="sm-robots" value={meta.robots} onChange={(e) => setMeta({ robots: e.target.value })}>
                    <option>index, follow</option>
                    <option>noindex, follow</option>
                    <option>noindex, nofollow</option>
                  </Select>
                </Field>
                <Field label="X / Twitter handle" htmlFor="sm-tw"><Input id="sm-tw" value={meta.twitter} onChange={(e) => setMeta({ twitter: e.target.value })} /></Field>
                <Field label="OG image URL" htmlFor="sm-og"><Input id="sm-og" value={meta.ogImage} onChange={(e) => setMeta({ ogImage: e.target.value })} /></Field>
                <Field label="Canonical base URL" htmlFor="sm-can"><Input id="sm-can" value={meta.canonical} onChange={(e) => setMeta({ canonical: e.target.value })} /></Field>
              </div>
            </div>
          </Panel>
          <div className="space-y-6">
            <Panel title="Google result"><SerpPreview url={meta.canonical.replace(/^https?:\/\//, "")} title={meta.title} description={meta.description} /></Panel>
            <Panel title="Social card">
              <div className="overflow-hidden rounded-lg border border-line bg-ink/60">
                {/* The site's own OG image, served from /public. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={meta.ogImage} alt="" className="aspect-[1.91] w-full object-cover" />
                <div className="p-3">
                  <p className="text-xs uppercase text-muted">{SITE.domain}</p>
                  <p className="truncate text-sm font-semibold text-cream">{meta.title}</p>
                  <p className="line-clamp-2 text-xs text-muted">{meta.description}</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      ) : tab === "schema" ? (
        <Panel title="Structured data" description="JSON-LD the site emits so search engines understand listings, the business and FAQs.">
          <ul className="divide-y divide-line">
            {SCHEMA.map((s) => (
              <li key={s.type} className="flex items-center justify-between gap-4 py-3">
                <span><span className="font-mono text-sm text-cream">{s.type}</span><span className="ml-3 text-xs text-muted">{s.where}</span></span>
                <Badge tone={s.live ? "success" : "neutral"}>{s.live ? "Live" : "Planned · M5"}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <Panel title="Pages in the sitemap" description={`${SITE.url}/sitemap.xml — regenerated on every deploy.`}>
            <DataTable
              caption="Sitemap"
              rows={SITEMAP.map(([p, pr, f]) => ({ p, pr, f }))}
              rowKey={(r) => r.p}
              columns={[
                { key: "p", header: "Path", cell: (r) => <span className="font-mono text-xs text-cream">{r.p}</span> },
                { key: "pr", header: "Priority", align: "right", cell: (r) => r.pr },
                { key: "f", header: "Changes", align: "right", cell: (r) => r.f },
              ]}
            />
          </Panel>
          <Panel title="Crawling">
            <div className="space-y-4">
              <label className="flex items-center justify-between gap-3 text-sm text-cream">Sitemap enabled<Toggle label="Sitemap enabled" checked={sitemap.enabled} onChange={(enabled) => setValue("seo:sitemap", { ...sitemap, enabled })} /></label>
              <label className="flex items-center justify-between gap-3 text-sm text-cream">Search engine indexing<Toggle label="Indexing" checked={sitemap.indexing} onChange={(indexing) => setValue("seo:sitemap", { ...sitemap, indexing })} /></label>
              <p className="text-xs text-muted-dim">Account, checkout, portal and back-office pages are always excluded.</p>
            </div>
          </Panel>
        </div>
      )}
      <DemoNote />
    </div>
  );
}

function SerpPreview({ url, title, description }: { url: string; title: string; description: string }) {
  return (
    <div>
      <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Google preview</p>
      <div className="rounded-lg bg-[#ffffff] p-4 font-sans">
        <p className="truncate text-xs text-[#4d5156]">{url}</p>
        <p className="mt-1 truncate text-lg leading-snug text-[#1a0dab]">{title || "Untitled page"}</p>
        <p className="mt-1 line-clamp-2 text-sm text-[#4d5156]">{description || "Google will pick text from the page when no description is set."}</p>
      </div>
    </div>
  );
}

/* ------------------------------ email & sms ------------------------------ */

export function TemplatesScreen({ initial }: { initial: MessageTemplate[] }) {
  const templates = useCollection<MessageTemplate>(C.templates, initial);
  const actor = useActor();
  const [id, setId] = useState(initial[0]?.id);
  const t = templates.find((x) => x.id === id) ?? templates[0];
  const original = initial.find((x) => x.id === t.id);
  const edit = (change: Partial<MessageTemplate>) => patch<MessageTemplate>(C.templates, t, { ...change, updatedAt: Date.now() });

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Growth" title="Email & SMS" description="Every message the platform sends, with merge tags. Sending goes live with SendGrid and Twilio in Milestone 5." />

      <div className="grid gap-6 xl:grid-cols-[18rem_1fr]">
        <ul className="flex flex-col gap-1.5" aria-label="Templates">
          {templates.map((x) => {
            const Icon = x.channel === "email" ? Mail : MessageSquare;
            return (
              <li key={x.id}>
                <button type="button" onClick={() => setId(x.id)} aria-current={x.id === t.id ? "true" : undefined} className={cn("flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors", x.id === t.id ? "edge-gold" : "border border-line hover:border-gold/40")}>
                  <Icon aria-hidden width={16} height={16} className="mt-0.5 shrink-0 text-gold" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-cream">{x.name}</span>
                    <span className="block truncate text-xs text-muted">{x.trigger}</span>
                  </span>
                  {!x.enabled ? <Badge>Off</Badge> : null}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title={t.name}
            description={`${t.channel === "email" ? "Email" : "SMS"} · sent when: ${t.trigger} · saved as you type`}
            action={<span className="flex items-center gap-2 text-xs text-muted">Enabled<Toggle label={`${t.name} enabled`} checked={t.enabled} onChange={(enabled) => edit({ enabled })} /></span>}
          >
            <div className="space-y-4">
              {t.channel === "email" ? <Field label="Subject" htmlFor="tpl-subject"><Input id="tpl-subject" value={t.subject} onChange={(e) => edit({ subject: e.target.value })} /></Field> : null}
              <Field label="Message" htmlFor="tpl-body" hint={t.channel === "sms" ? `${t.body.length} characters · ${Math.ceil(t.body.length / 160) || 1} SMS segment(s)` : undefined}>
                <Textarea id="tpl-body" rows={t.channel === "sms" ? 4 : 10} value={t.body} onChange={(e) => edit({ body: e.target.value })} />
              </Field>
              <div>
                <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Insert merge tag</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(MERGE_TAGS).map((tag) => (
                    <button key={tag} type="button" onClick={() => edit({ body: `${t.body}${t.body.endsWith(" ") || !t.body ? "" : " "}${tag}` })} className="rounded-full border border-gold/30 px-2.5 py-1 font-mono text-[0.6875rem] text-gold transition-colors hover:bg-gold/10">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" variant="outline" onClick={() => { queueMessage({ to: t.channel === "email" ? SITE.contact.supportEmail : SITE.contact.phone, channel: t.channel, subject: fillMergeTags(t.subject || t.name), template: t.name }); toast(`Test ${t.channel === "email" ? "email" : "SMS"} queued.`, "info"); }}>
                  <Send aria-hidden width={13} height={13} /> Send test
                </Button>
                {original && (original.body !== t.body || original.subject !== t.subject) ? (
                  <Button size="sm" variant="ghost" onClick={() => { patch<MessageTemplate>(C.templates, t, { subject: original.subject, body: original.body }); logAudit(actor.name, "template.reset", t.name, "Reset to default"); toast("Template reset."); }}>
                    Reset to default
                  </Button>
                ) : null}
                <span className="text-xs text-muted-dim">Last edited {relativeTime(t.updatedAt)}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Preview" description="With sample data filled in.">
            {t.channel === "email" ? (
              <div className="overflow-hidden rounded-lg border border-line">
                <div className="border-b border-line bg-surface-2/60 px-4 py-3 text-xs text-muted">
                  <p>From: NXL Concierge &lt;{SITE.contact.email}&gt;</p>
                  <p className="mt-1 text-sm text-cream">{fillMergeTags(t.subject)}</p>
                </div>
                <p className="whitespace-pre-line bg-ink/40 px-4 py-4 text-sm leading-relaxed text-cream/85">{fillMergeTags(t.body)}</p>
              </div>
            ) : (
              <div className="mx-auto max-w-xs rounded-2xl border border-line bg-ink/60 p-4">
                <p className="text-center text-[0.625rem] text-muted">Text message</p>
                <p className="mt-3 rounded-2xl rounded-bl-sm bg-surface-3 px-4 py-3 text-sm leading-relaxed text-cream">{fillMergeTags(t.body)}</p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- notifications ------------------------------ */

const ALERT_ICON: Record<AlertKind, typeof Bell> = { booking: CalendarCheck, payment: CreditCard, fleet: Truck, partner: Handshake, system: Server };

type NotifTab = "alerts" | "broadcast" | "log";
type Audience = "all" | "enrolled" | "platinum" | "walk-in" | "referral" | "one";

const AUDIENCES: { value: Audience; label: string; pick: (c: Customer) => boolean }[] = [
  { value: "all", label: "All members", pick: () => true },
  { value: "enrolled", label: "Level Rewards members", pick: (c) => c.enrolled },
  { value: "platinum", label: "Gold & Platinum", pick: (c) => tierFor(c.points).min >= 8_000 },
  { value: "walk-in", label: "Walk-in customers", pick: (c) => c.channel === "walk-in" },
  { value: "referral", label: "Referred by partners", pick: (c) => c.channel === "referral" || !!c.referredBy },
  { value: "one", label: "One customer", pick: () => false },
];

export function NotificationsScreen({ initial, customers: baseCustomers }: { initial: OpsAlert[]; customers: Customer[] }) {
  const alerts = useCollection<OpsAlert>(C.alerts, initial);
  const customers = useCollection<Customer>(C.customers, baseCustomers);
  const broadcasts = useCollection<Broadcast>(C.broadcasts, []);
  const messages = useCollection<MessageLogEntry>(C.messages, []);
  const actor = useActor();
  const [tab, setTab] = useState<NotifTab>("alerts");
  const [filter, setFilter] = useState<"all" | "unread" | AlertKind>("all");

  const rows = [...alerts].sort((a, b) => b.at - a.at).filter((a) => (filter === "all" ? true : filter === "unread" ? !a.read : a.kind === filter));
  const unread = alerts.filter((a) => !a.read).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Growth"
        title="Notifications"
        description="Operator alerts, broadcasts to members, and every message the platform has queued."
        actions={tab === "alerts" ? <Button variant="outline" disabled={!unread} onClick={() => alerts.filter((a) => !a.read).forEach((a) => patch<OpsAlert>(C.alerts, a, { read: true }))}>Mark all read</Button> : undefined}
      />

      <StatGrid
        stats={[
          { label: "Unread alerts", value: unread },
          { label: "Broadcasts sent", value: broadcasts.length },
          { label: "Messages queued", value: messages.length },
          { label: "Reachable members", value: customers.length },
        ]}
      />

      <Tabs<NotifTab>
        label="Notifications"
        value={tab}
        onChange={setTab}
        items={[
          { value: "alerts", label: "Operator alerts", count: unread },
          { value: "broadcast", label: "Broadcast" },
          { value: "log", label: "Message log", count: messages.length },
        ]}
      />

      {tab === "alerts" ? (
        <>
          <SegmentedControl<"all" | "unread" | AlertKind>
            label="Filter notifications"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All" },
              { value: "unread", label: `Unread (${unread})` },
              { value: "booking", label: "Bookings" },
              { value: "payment", label: "Payments" },
              { value: "fleet", label: "Fleet" },
              { value: "partner", label: "Partners" },
              { value: "system", label: "System" },
            ]}
            className="w-full sm:w-fit"
          />
          <ul className="space-y-3">
            {rows.length ? (
              rows.map((a) => {
                const Icon = ALERT_ICON[a.kind];
                return (
                  <li key={a.id} className={cn("flex items-start gap-4 rounded-xl p-4 sm:p-5", a.read ? "border border-line bg-surface-1/40" : "edge-gold")}>
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", a.read ? "bg-surface-3 text-muted" : "metal-plate")}>
                      <Icon aria-hidden width={17} height={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-cream">{a.title}{!a.read ? <span className="sr-only"> (unread)</span> : null}</p>
                      <p className="mt-1 text-sm leading-relaxed text-cream/70">{a.body}</p>
                      <p className="mt-1.5 text-xs text-muted-dim">{relativeTime(a.at)}</p>
                    </div>
                    <button type="button" onClick={() => patch<OpsAlert>(C.alerts, a, { read: !a.read })} className="shrink-0 rounded-full px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold">
                      {a.read ? "Mark unread" : "Mark read"}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="rounded-xl border border-dashed border-line py-14 text-center text-sm text-muted">You&apos;re all caught up.</li>
            )}
          </ul>
        </>
      ) : tab === "broadcast" ? (
        <BroadcastComposer customers={customers} broadcasts={broadcasts} actor={actor.name} />
      ) : messages.length ? (
        <DataTable
          caption="Message log"
          rows={[...messages].sort((a, b) => b.at - a.at).slice(0, 100)}
          rowKey={(m) => m.id}
          columns={[
            { key: "to", header: "To", cell: (m) => <Primary title={m.to} sub={m.template} /> },
            { key: "subject", header: "Subject", hideBelow: "md", cell: (m) => <span className="text-cream/85">{m.subject}</span> },
            { key: "ch", header: "Channel", cell: (m) => <Badge tone="neutral">{m.channel}</Badge> },
            { key: "status", header: "Status", cell: (m) => <Badge tone={m.status === "sent" ? "success" : m.status === "failed" ? "danger" : "warning"}>{m.status}</Badge> },
            { key: "at", header: "Queued", align: "right", hideBelow: "sm", cell: (m) => relativeTime(m.at) },
          ]}
        />
      ) : (
        <EmptyState title="Nothing queued yet" description="Receipts, OTP codes, broadcasts and test sends appear here. They're delivered once SendGrid and Twilio are connected at launch." />
      )}
      <DemoNote />
    </div>
  );
}

function BroadcastComposer({ customers, broadcasts, actor }: { customers: Customer[]; broadcasts: Broadcast[]; actor: string }) {
  const [audience, setAudience] = useState<Audience>("all");
  const [oneId, setOneId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [channels, setChannels] = useState({ push: true, email: true, sms: false });
  const recipients = audience === "one" ? customers.filter((c) => c.id === oneId) : customers.filter(AUDIENCES.find((a) => a.value === audience)!.pick);
  const mediaSrc = media ?? (mediaUrl.trim() || null);

  function send() {
    if (!title.trim() || !body.trim() || !recipients.length) return;
    const chosen = (Object.keys(channels) as (keyof typeof channels)[]).filter((k) => channels[k]);
    for (const c of recipients) {
      if (channels.push) notify({ email: c.email, kind: "promo", at: Date.now(), title: title.trim(), body: body.trim(), media: mediaSrc ? { url: mediaSrc, type: /\.(mp4|webm)$/i.test(mediaSrc) ? "video" : "image" } : null });
      if (channels.email) queueMessage({ to: c.email, channel: "email", subject: title.trim(), template: "Broadcast" });
      if (channels.sms) queueMessage({ to: c.phone, channel: "sms", subject: title.trim(), template: "Broadcast" });
    }
    create<Broadcast>(C.broadcasts, { id: newId("bc"), at: Date.now(), by: actor, audience: audience === "one" ? recipients[0].name : AUDIENCES.find((a) => a.value === audience)!.label, recipients: recipients.length, channels: chosen, title: title.trim(), body: body.trim(), media: mediaSrc ? { url: mediaSrc, type: "image" } : null });
    logAudit(actor, "broadcast.sent", title.trim(), `${recipients.length} recipients · ${chosen.join(", ")}`);
    toast(`Sent to ${recipients.length} ${recipients.length === 1 ? "member" : "members"} — in-app now, email/SMS once connected.`);
    setTitle("");
    setBody("");
    setMedia(null);
    setMediaUrl("");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <Panel title="Compose" description="In-app notifications land immediately in each member's bell and notification centre.">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Audience" htmlFor="bc-aud">
              <Select id="bc-aud" value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
                {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}{a.value !== "one" ? ` (${customers.filter(a.pick).length})` : ""}</option>)}
              </Select>
            </Field>
            {audience === "one" ? (
              <Field label="Customer" htmlFor="bc-one">
                <Select id="bc-one" value={oneId} onChange={(e) => setOneId(e.target.value)}>
                  <option value="">Choose…</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            ) : <div />}
          </div>
          <Field label="Title" htmlFor="bc-title"><Input id="bc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Art Basel week — members first" /></Field>
          <Field label="Message" htmlFor="bc-body"><Textarea id="bc-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <FileDrop label="Image (optional)" value={media} onChange={setMedia} accept="image/*" aspect="aspect-[16/9]" />
            <Field label="…or image / video URL" htmlFor="bc-url"><Input id="bc-url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://" /></Field>
          </div>
          <div className="flex flex-wrap gap-4 rounded-lg border border-line bg-ink/40 p-3 text-sm text-cream">
            {(["push", "email", "sms"] as const).map((k) => (
              <label key={k} className="flex items-center gap-2 capitalize">
                <input type="checkbox" checked={channels[k]} onChange={(e) => setChannels({ ...channels, [k]: e.target.checked })} className="accent-[#c4a068]" />
                {k === "push" ? "In-app & push" : k.toUpperCase()}
              </label>
            ))}
          </div>
          <Button onClick={send} disabled={!title.trim() || !body.trim() || !recipients.length}>
            <Send aria-hidden width={15} height={15} /> Send to {recipients.length} {recipients.length === 1 ? "member" : "members"}
          </Button>
        </div>
      </Panel>
      <div className="space-y-6">
        <Panel title="Channel status">
          <ul className="space-y-2.5 text-sm">
            <li className="flex justify-between"><span className="text-cream">In-app centre</span><Badge tone="success">Live</Badge></li>
            <li className="flex justify-between"><span className="text-cream">Browser push</span><Badge tone="warning">Opt-in · M5 server</Badge></li>
            <li className="flex justify-between"><span className="text-cream">SendGrid email</span><Badge tone="neutral">Milestone 5</Badge></li>
            <li className="flex justify-between"><span className="text-cream">Twilio SMS</span><Badge tone="neutral">Milestone 5</Badge></li>
          </ul>
        </Panel>
        <Panel title="Recent broadcasts">
          {broadcasts.length ? (
            <ul className="divide-y divide-line">
              {broadcasts.slice(0, 6).map((b) => (
                <li key={b.id} className="py-2.5 text-sm">
                  <p className="text-cream">{b.title}</p>
                  <p className="text-xs text-muted">{b.audience} · {b.recipients} · {b.channels.join(", ")} · {relativeTime(b.at)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">None yet.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

