"use client";

import { useState } from "react";
import { Bell, CalendarCheck, CreditCard, Handshake, Mail, MessageSquare, Plus, Server, Truck } from "lucide-react";
import { Panel, SavedNote } from "@/components/account/panel";
import { Button } from "@/components/ui/button";
import { SegmentedControl, Toggle } from "@/components/ui/controls";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatGrid } from "@/components/ui/layout";
import { ProgressBar } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils/cn";
import { money, relativeTime, shortDate } from "@/lib/domain/format";
import { SITE } from "@/lib/domain/site";
import {
  fillMergeTags,
  MERGE_TAGS,
  type AlertKind,
  type MessageTemplate,
  type OpsAlert,
  type Promo,
  type PromoType,
  type SeoPage,
} from "@/lib/domain/operations";
import { DataTable, DemoNote, PageHeader, Primary } from "../ui";
import { Status } from "../status";

/* --------------------------------- marketing -------------------------------- */

const PROMO_TYPE_LABEL: Record<PromoType, string> = {
  percent: "% off",
  flat: "$ off",
  "free-delivery": "Free delivery",
  "free-insurance": "Free NXL coverage",
};

const promoValue = (p: Promo) =>
  p.type === "percent" ? `${p.value}% off` : p.type === "flat" ? `${money(p.value)} off` : "Free delivery";

export function MarketingScreen({ initial }: { initial: Promo[] }) {
  const [promos, setPromos] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "percent" as PromoType,
    value: "10",
    appliesTo: "all" as Promo["appliesTo"],
    maxUses: "",
  });

  function create() {
    const code = form.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) return;
    setPromos((prev) => [
      {
        id: `pr-new-${Date.now()}`,
        code,
        description: form.description.trim() || promoValue({ type: form.type, value: Number(form.value) } as Promo),
        type: form.type,
        value: Number(form.value) || 0,
        appliesTo: form.appliesTo,
        uses: 0,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: null,
        status: "active",
      },
      ...prev,
    ]);
    setNote(`${code} is live.`);
    setAdding(false);
    setForm({ ...form, code: "", description: "" });
  }

  const toggle = (p: Promo) => {
    const status = p.status === "paused" ? "active" : "paused";
    setPromos((prev) => prev.map((x) => (x.id === p.id ? { ...x, status } : x)));
    setNote(`${p.code} ${status === "active" ? "resumed" : "paused"}.`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Growth"
        title="Marketing"
        description="Promo codes and campaigns. Codes apply at checkout once payments are live."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden width={16} height={16} />
            New promo code
          </Button>
        }
      />

      <StatGrid
        stats={[
          { label: "Live codes", value: promos.filter((p) => p.status === "active").length },
          { label: "Scheduled", value: promos.filter((p) => p.status === "scheduled").length },
          { label: "Redemptions", value: promos.reduce((s, p) => s + p.uses, 0) },
          { label: "Expired", value: promos.filter((p) => p.status === "expired").length },
        ]}
      />

      {adding ? (
        <Panel tone="gold" title="New promo code">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"
          >
            <Field label="Code" htmlFor="pr-code" required>
              <Input id="pr-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="SUMMER15" className="uppercase" required />
            </Field>
            <Field label="Description" htmlFor="pr-desc" className="lg:col-span-2">
              <Input id="pr-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Field label="Type" htmlFor="pr-type">
              <Select id="pr-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PromoType })}>
                {(Object.keys(PROMO_TYPE_LABEL) as PromoType[]).map((t) => (
                  <option key={t} value={t}>
                    {PROMO_TYPE_LABEL[t]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={form.type === "percent" ? "Percent" : "Amount ($)"} htmlFor="pr-val">
              <Input id="pr-val" type="number" min={0} value={form.value} disabled={form.type === "free-delivery"} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </Field>
            <Field label="Applies to" htmlFor="pr-to">
              <Select id="pr-to" value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value as Promo["appliesTo"] })}>
                <option value="all">Everything</option>
                <option value="cars">Cars only</option>
                <option value="homes">Estates only</option>
              </Select>
            </Field>
            <Field label="Max uses" htmlFor="pr-max" hint="Blank for unlimited">
              <Input id="pr-max" type="number" min={1} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
            </Field>
            <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-5">
              <Button type="submit">Create code</Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      ) : null}
      {note ? <SavedNote>{note}</SavedNote> : null}

      <DataTable
        caption="Promo codes"
        rows={promos}
        rowKey={(p) => p.id}
        columns={[
          {
            key: "code",
            header: "Code",
            cell: (p) => (
              <Primary title={<span className="font-mono tracking-wider text-gold">{p.code}</span>} sub={p.description} />
            ),
          },
          { key: "offer", header: "Offer", hideBelow: "sm", cell: (p) => promoValue(p) },
          {
            key: "scope",
            header: "Applies to",
            hideBelow: "lg",
            cell: (p) => (p.appliesTo === "all" ? "Everything" : p.appliesTo === "cars" ? "Cars" : "Estates"),
          },
          {
            key: "uses",
            header: "Used",
            hideBelow: "md",
            cell: (p) =>
              p.maxUses ? (
                <div className="w-28">
                  <p className="mb-1 text-xs text-cream">
                    {p.uses} / {p.maxUses}
                  </p>
                  <ProgressBar value={p.uses / p.maxUses} label={`${p.code} usage`} />
                </div>
              ) : (
                `${p.uses} · no cap`
              ),
          },
          { key: "exp", header: "Expires", hideBelow: "lg", cell: (p) => (p.expiresAt ? shortDate(p.expiresAt) : "Never") },
          { key: "status", header: "Status", cell: (p) => <Status kind="promo" value={p.status} /> },
          {
            key: "action",
            header: "",
            align: "right",
            cell: (p) =>
              p.status === "active" || p.status === "paused" ? (
                <button type="button" onClick={() => toggle(p)} className="rounded-full px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold">
                  {p.status === "paused" ? "Resume" : "Pause"}
                </button>
              ) : null,
          },
        ]}
      />
      <DemoNote />
    </div>
  );
}

/* ------------------------------------ seo ----------------------------------- */

function Meter({ length, ideal }: { length: number; ideal: [number, number] }) {
  const [lo, hi] = ideal;
  const tone = length === 0 ? "danger" : length > hi ? "danger" : length < lo ? "warning" : "success";
  const text = length === 0 ? "Missing" : length > hi ? "Too long — will be cut off" : length < lo ? "A little short" : "Good length";
  return (
    <p className={cn("text-xs", tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-danger")}>
      {length} characters · {text}
    </p>
  );
}

export function SeoScreen({ initial }: { initial: SeoPage[] }) {
  const [pages, setPages] = useState(initial);
  const [path, setPath] = useState(initial[0]?.path ?? "/");
  const [note, setNote] = useState<string | null>(null);
  const page = pages.find((p) => p.path === path)!;

  const edit = (change: Partial<SeoPage>) => {
    setPages((prev) => prev.map((p) => (p.path === path ? { ...p, ...change } : p)));
    setNote(null);
  };

  const issues = (p: SeoPage) =>
    p.indexed && (!p.description || p.title.length > 60 || p.description.length > 160 || !p.keyword);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Growth"
        title="SEO"
        description="How each page appears in Google: title, description, focus keyword and whether it's indexed."
      />

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <ul className="flex flex-col gap-1.5" aria-label="Pages">
          {pages.map((p) => (
            <li key={p.path}>
              <button
                type="button"
                onClick={() => setPath(p.path)}
                aria-current={p.path === path ? "true" : undefined}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left transition-colors",
                  p.path === path ? "edge-gold" : "border border-line hover:border-gold/40",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-mono text-xs text-gold">{p.path}</span>
                  <span className="block truncate text-sm text-cream/85">{p.title}</span>
                </span>
                {!p.indexed ? (
                  <Badge>No-index</Badge>
                ) : issues(p) ? (
                  <Badge tone="warning">Fix</Badge>
                ) : (
                  <Badge tone="success">OK</Badge>
                )}
              </button>
            </li>
          ))}
        </ul>

        <Panel title={`Editing ${page.path}`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setNote(`${page.path} saved.`);
            }}
            className="space-y-5"
          >
            <Field label="Title tag" htmlFor="seo-title">
              <Input id="seo-title" value={page.title} onChange={(e) => edit({ title: e.target.value })} />
              <Meter length={page.title.length} ideal={[30, 60]} />
            </Field>
            <Field label="Meta description" htmlFor="seo-desc">
              <Textarea id="seo-desc" rows={3} value={page.description} onChange={(e) => edit({ description: e.target.value })} />
              <Meter length={page.description.length} ideal={[70, 160]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Focus keyword" htmlFor="seo-kw">
                <Input id="seo-kw" value={page.keyword} onChange={(e) => edit({ keyword: e.target.value })} />
              </Field>
              <span className="flex items-center gap-3 pb-3 text-sm text-cream/85">
                <Toggle label="Allow search engines to index this page" checked={page.indexed} onChange={(indexed) => edit({ indexed })} />
                Indexed
              </span>
            </div>

            <div>
              <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Google preview</p>
              <div className="rounded-lg bg-[#ffffff] p-4 font-sans">
                <p className="truncate text-xs text-[#4d5156]">
                  {SITE.domain} › {page.path === "/" ? "" : page.path.slice(1)}
                </p>
                <p className="mt-1 truncate text-lg leading-snug text-[#1a0dab]">{page.title || "Untitled page"}</p>
                <p className="mt-1 line-clamp-2 text-sm text-[#4d5156]">
                  {page.description || "Google will pick text from the page when no description is set."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit">Save page</Button>
              {note ? <SavedNote>{note}</SavedNote> : null}
            </div>
          </form>
        </Panel>
      </div>
      <DemoNote />
    </div>
  );
}

/* ------------------------------ email & sms ------------------------------ */

export function TemplatesScreen({ initial }: { initial: MessageTemplate[] }) {
  const [templates, setTemplates] = useState(initial);
  const [id, setId] = useState(initial[0]?.id);
  const [note, setNote] = useState<string | null>(null);
  const t = templates.find((x) => x.id === id)!;

  const edit = (change: Partial<MessageTemplate>) => {
    setTemplates((prev) => prev.map((x) => (x.id === id ? { ...x, ...change } : x)));
    setNote(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Growth"
        title="Email & SMS"
        description="Every message the platform sends, with merge tags. Sending goes live with SendGrid and Twilio in Milestone 5."
      />

      <div className="grid gap-6 xl:grid-cols-[18rem_1fr]">
        <ul className="flex flex-col gap-1.5" aria-label="Templates">
          {templates.map((x) => {
            const Icon = x.channel === "email" ? Mail : MessageSquare;
            return (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => setId(x.id)}
                  aria-current={x.id === id ? "true" : undefined}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors",
                    x.id === id ? "edge-gold" : "border border-line hover:border-gold/40",
                  )}
                >
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
            description={`${t.channel === "email" ? "Email" : "SMS"} · sent when: ${t.trigger}`}
            action={
              <span className="flex items-center gap-2 text-xs text-muted">
                Enabled
                <Toggle label={`${t.name} enabled`} checked={t.enabled} onChange={(enabled) => edit({ enabled })} />
              </span>
            }
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                edit({ updatedAt: Date.now() });
                setNote(`${t.name} saved.`);
              }}
              className="space-y-4"
            >
              {t.channel === "email" ? (
                <Field label="Subject" htmlFor="tpl-subject">
                  <Input id="tpl-subject" value={t.subject} onChange={(e) => edit({ subject: e.target.value })} />
                </Field>
              ) : null}
              <Field
                label="Message"
                htmlFor="tpl-body"
                hint={t.channel === "sms" ? `${t.body.length} characters · ${Math.ceil(t.body.length / 160) || 1} SMS segment(s)` : undefined}
              >
                <Textarea id="tpl-body" rows={t.channel === "sms" ? 4 : 10} value={t.body} onChange={(e) => edit({ body: e.target.value })} />
              </Field>
              <div>
                <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Insert merge tag</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(MERGE_TAGS).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => edit({ body: `${t.body}${t.body.endsWith(" ") || !t.body ? "" : " "}${tag}` })}
                      className="rounded-full border border-gold/30 px-2.5 py-1 font-mono text-[0.6875rem] text-gold transition-colors hover:bg-gold/10"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Button type="submit">Save template</Button>
                <span className="text-xs text-muted-dim">Last edited {relativeTime(t.updatedAt)}</span>
              </div>
              {note ? <SavedNote>{note}</SavedNote> : null}
            </form>
          </Panel>

          <Panel title="Preview" description="With sample data filled in.">
            {t.channel === "email" ? (
              <div className="overflow-hidden rounded-lg border border-line">
                <div className="border-b border-line bg-surface-2/60 px-4 py-3 text-xs text-muted">
                  <p>From: NXL Concierge &lt;{SITE.contact.email}&gt;</p>
                  <p className="mt-1 text-sm text-cream">{fillMergeTags(t.subject)}</p>
                </div>
                <p className="whitespace-pre-line bg-ink/40 px-4 py-4 text-sm leading-relaxed text-cream/85">
                  {fillMergeTags(t.body)}
                </p>
              </div>
            ) : (
              <div className="mx-auto max-w-xs rounded-2xl border border-line bg-ink/60 p-4">
                <p className="text-center text-[0.625rem] text-muted">Text message</p>
                <p className="mt-3 rounded-2xl rounded-bl-sm bg-surface-3 px-4 py-3 text-sm leading-relaxed text-cream">
                  {fillMergeTags(t.body)}
                </p>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- notifications ------------------------------ */

const ALERT_ICON: Record<AlertKind, typeof Bell> = {
  booking: CalendarCheck,
  payment: CreditCard,
  fleet: Truck,
  partner: Handshake,
  system: Server,
};

export function NotificationsScreen({ initial }: { initial: OpsAlert[] }) {
  const [alerts, setAlerts] = useState(initial);
  const [filter, setFilter] = useState<"all" | "unread" | AlertKind>("all");

  const rows = alerts.filter((a) => (filter === "all" ? true : filter === "unread" ? !a.read : a.kind === filter));
  const unread = alerts.filter((a) => !a.read).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Growth"
        title="Notifications"
        description="Alerts for the operations team — new bookings, payment problems, fleet and partner events."
        actions={
          <Button variant="outline" disabled={!unread} onClick={() => setAlerts((prev) => prev.map((a) => ({ ...a, read: true })))}>
            Mark all read
          </Button>
        }
      />

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
              <li
                key={a.id}
                className={cn(
                  "flex items-start gap-4 rounded-xl p-4 sm:p-5",
                  a.read ? "border border-line bg-surface-1/40" : "edge-gold",
                )}
              >
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", a.read ? "bg-surface-3 text-muted" : "metal-plate")}>
                  <Icon aria-hidden width={17} height={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-cream">
                    {a.title}
                    {!a.read ? <span className="sr-only">(unread)</span> : null}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-cream/70">{a.body}</p>
                  <p className="mt-1.5 text-xs text-muted-dim">{relativeTime(a.at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAlerts((prev) => prev.map((x) => (x.id === a.id ? { ...x, read: !x.read } : x)))}
                  className="shrink-0 rounded-full px-3 py-1.5 text-xs text-muted transition-colors hover:text-gold"
                >
                  {a.read ? "Mark unread" : "Mark read"}
                </button>
              </li>
            );
          })
        ) : (
          <li className="rounded-xl border border-dashed border-line py-14 text-center text-sm text-muted">
            You&apos;re all caught up.
          </li>
        )}
      </ul>
    </div>
  );
}
