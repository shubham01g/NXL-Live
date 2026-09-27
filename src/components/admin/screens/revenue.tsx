"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Panel } from "@/components/account/panel";
import { CardFields } from "@/components/checkout/card-fields";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/controls";
import { Alert, EmptyState, ProgressBar } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { StatGrid } from "@/components/ui/layout";
import { Drawer, Modal } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/primitives";
import { StepIndicator, Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { count, money, moneyCompact, shortDate } from "@/lib/domain/format";
import { EMPTY_CARD, parseCard, type CardInput } from "@/lib/domain/account";
import { TIERS, tierByName, tierFor } from "@/lib/domain/loyalty";
import type { Listing, MemberAccount, Plan } from "@/lib/domain/types";
import type {
  AuditEntry,
  BookingChannel,
  Customer,
  MessageLogEntry,
  Partner,
  Payout,
  PayoutStatus,
  PlanPurchase,
  Reservation,
  RevenueMonth,
} from "@/lib/domain/operations";
import { AUDIT_LOG, C, logAudit, notify } from "@/lib/data/demo";
import { create, newId, patch, readCollection, useCollection } from "@/lib/data/demo-store";
import { balanceOf, payPartner } from "@/lib/data/partners";
import { timestamp, useClock } from "@/lib/hooks/use-clock";
import { DataTable, DemoNote, PageHeader, Primary, SearchInput, Toolbar } from "../ui";
import { Status } from "../status";
import { DonutChart, LineChart, RankedBars, SplitBar, StackedBars } from "../charts";
import { useActor } from "../reservation-tools";

const monthLabel = (ms: number) => new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(ms));

function syncMember(email: string, change: (m: MemberAccount) => MemberAccount) {
  const m = readCollection<MemberAccount>(C.members, []).find((x) => x.email === email);
  if (m) patch<MemberAccount>(C.members, m, change(m));
}

/* ------------------------------- subscriptions ------------------------------ */

/**
 * "Subscriptions" in the prototype's language — at NXL these are one-time
 * Drive Wallet plans, not renewals. Master Admin sets package pricing here,
 * onboards walk-in subscribers, tops up balances and closes wallets.
 */
export function SubscriptionsScreen({
  purchases: basePurchases,
  plans: basePlans,
  customers: baseCustomers,
}: {
  purchases: PlanPurchase[];
  plans: Plan[];
  customers: Customer[];
}) {
  const purchases = useCollection<PlanPurchase>(C.purchases, basePurchases);
  const plans = useCollection<Plan>(C.plans, basePlans);
  const customers = useCollection<Customer>(C.customers, baseCustomers);
  const actor = useActor();
  const [query, setQuery] = useState("");
  const [editingPrices, setEditingPrices] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [topUp, setTopUp] = useState<PlanPurchase | null>(null);
  const [onboarding, setOnboarding] = useState(false);

  const rows = purchases.filter((p) => `${p.customerName} ${p.customerEmail} ${p.planName} ${p.status}`.toLowerCase().includes(query.trim().toLowerCase()));
  const sold = purchases.filter((p) => p.status !== "refunded");
  const low = sold.filter((p) => p.status === "active" && p.remaining / p.credits <= 0.2);
  const open = purchases.find((p) => p.id === openId) ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Revenue"
        title="Subscriptions"
        description="Drive Wallet plan sales — what each member bought and how much credit they still hold."
        actions={
          <Button onClick={() => setOnboarding(true)}>
            <Plus aria-hidden width={16} height={16} /> Onboard subscriber
          </Button>
        }
      />

      <StatGrid
        stats={[
          { label: "Active wallets", value: sold.filter((p) => p.status === "active").length },
          { label: "Plan revenue", value: money(sold.reduce((s, p) => s + p.price, 0)) },
          { label: "Unspent balance", value: money(sold.reduce((s, p) => s + p.remaining, 0)) },
          { label: "Low / depleted", value: `${low.length} / ${purchases.filter((p) => p.status === "depleted").length}` },
        ]}
      />

      <Panel
        title="Package pricing"
        description="What each plan costs and how much credit it loads. Changes apply to new purchases."
        action={
          actor.isMaster ? (
            <Button size="sm" variant={editingPrices ? "primary" : "outline"} onClick={() => { if (editingPrices) toast("Plan pricing saved."); setEditingPrices((v) => !v); }}>
              {editingPrices ? "Done" : <><Pencil aria-hidden width={14} height={14} /> Edit prices</>}
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const ofPlan = sold.filter((p) => p.planName === plan.name);
            return (
              <div key={plan.id} className={cn("rounded-xl p-5", plan.featured ? "edge-gold" : "border border-line bg-ink/40")}>
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg font-semibold text-cream">{plan.name}</p>
                  <Badge tone="neutral">{ofPlan.length} sold</Badge>
                </div>
                {editingPrices ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Field label="Price ($)" htmlFor={`pp-${plan.id}`}>
                      <Input id={`pp-${plan.id}`} type="number" defaultValue={plan.price} onBlur={(e) => { const price = Number(e.target.value); if (price > 0 && price !== plan.price) { patch<Plan>(C.plans, plan, { price }); logAudit(actor.name, "plan.price_changed", plan.name, `Price ${money(plan.price)} → ${money(price)}`); } }} />
                    </Field>
                    <Field label="Credits ($)" htmlFor={`pc-${plan.id}`}>
                      <Input id={`pc-${plan.id}`} type="number" defaultValue={plan.credits} onBlur={(e) => { const credits = Number(e.target.value); if (credits > 0 && credits !== plan.credits) { patch<Plan>(C.plans, plan, { credits }); logAudit(actor.name, "plan.credits_changed", plan.name, `Credits ${money(plan.credits)} → ${money(credits)}`); } }} />
                    </Field>
                  </div>
                ) : (
                  <dl className="mt-4 space-y-1 text-sm">
                    <div className="flex justify-between"><dt className="text-muted">Purchase price</dt><dd className="font-mono text-cream">{money(plan.price)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Credit loaded</dt><dd className="font-mono text-cream">{money(plan.credits)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Bonus value</dt><dd className="font-mono text-success">+{money(plan.credits - plan.price)}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Tier granted</dt><dd className="text-cream">{plan.grantsTier}</dd></div>
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      <SearchInput value={query} onChange={setQuery} label="Search plan sales" placeholder="Member, plan or status…" />

      <DataTable
        caption="Plan sales"
        rows={rows}
        rowKey={(p) => p.id}
        onRowClick={(p) => setOpenId(p.id)}
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
                <ProgressBar value={p.remaining / p.credits} label={`${p.customerName} credit remaining`} tone={p.remaining / p.credits < 0.2 ? "warning" : "gold"} />
              </div>
            ),
          },
          { key: "date", header: "Purchased", hideBelow: "lg", cell: (p) => shortDate(p.purchasedAt) },
          { key: "status", header: "Status", cell: (p) => <Status kind="plan" value={p.status} /> },
          {
            key: "action",
            header: "",
            align: "right",
            cell: (p) =>
              p.status !== "refunded" ? (
                <button type="button" onClick={() => setTopUp(p)} className="whitespace-nowrap rounded-full border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/10">
                  + Credits
                </button>
              ) : null,
          },
        ]}
      />
      <DemoNote />

      {open ? (
        <Drawer
          open
          onClose={() => setOpenId(null)}
          eyebrow={`${open.planName} · since ${shortDate(open.purchasedAt)}`}
          title={open.customerName}
          description={open.customerEmail}
          footer={
            <>
              {open.status !== "refunded" && actor.isMaster ? (
                <Button
                  variant="ghost"
                  className="mr-auto text-danger hover:text-danger"
                  onClick={() => {
                    patch<PlanPurchase>(C.purchases, open, { status: "refunded", remaining: 0 });
                    logAudit(actor.name, "wallet.closed", open.customerEmail, `${open.planName} wallet closed`);
                    toast("Wallet closed.", "warning");
                  }}
                >
                  Close wallet
                </Button>
              ) : null}
              {open.status !== "refunded" ? <Button onClick={() => setTopUp(open)}>+ Add credits</Button> : null}
            </>
          }
        >
          <div className="space-y-5">
            {open.remaining / open.credits <= 0.2 && open.status === "active" ? <Alert tone="warning" title="Low balance">At or below 20% — the member was emailed automatically.</Alert> : null}
            <div className="rounded-xl edge-gold p-5">
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">Balance</p>
              <p className="text-metal-soft mt-1 font-mono text-3xl">{money(open.remaining)}</p>
              <ProgressBar className="mt-3" value={open.remaining / open.credits} label="Remaining" />
              <p className="mt-2 text-xs text-muted">{Math.round((open.remaining / open.credits) * 100)}% of {money(open.credits)} · spent {money(open.credits - open.remaining)}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-line bg-ink/40 px-4 py-3"><dt className="text-xs text-muted">Paid</dt><dd className="font-mono text-cream">{money(open.price)}</dd></div>
              <div className="rounded-lg border border-line bg-ink/40 px-4 py-3"><dt className="text-xs text-muted">Status</dt><dd><Status kind="plan" value={open.status} /></dd></div>
            </dl>
            <p className="text-xs text-muted-dim">Credits are non-refundable. Closing a wallet forfeits the unspent balance and is recorded in the audit log.</p>
          </div>
        </Drawer>
      ) : null}

      <TopUpModal key={topUp?.id ?? "none"} purchase={topUp} onClose={() => setTopUp(null)} actor={actor.name} />
      <OnboardModal open={onboarding} onClose={() => setOnboarding(false)} plans={plans} customers={customers} actor={actor.name} />
    </div>
  );
}

function TopUpModal({ purchase, onClose, actor }: { purchase: PlanPurchase | null; onClose: () => void; actor: string }) {
  const [amount, setAmount] = useState(1_000);
  if (!purchase) return null;
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`Add credits for ${purchase.customerName}`}
      description={`Current balance ${money(purchase.remaining)}. Charged to the card on file.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              patch<PlanPurchase>(C.purchases, purchase, { remaining: purchase.remaining + amount, credits: purchase.credits + amount, status: "active" });
              syncMember(purchase.customerEmail, (m) => ({ ...m, credits: m.credits + amount, creditsLoaded: m.creditsLoaded + amount, wallet: [...m.wallet, { id: newId("w"), kind: "load", label: "Top-up by the NXL team", amount, balanceAfter: m.credits + amount, createdAt: timestamp() }] }));
              notify({ email: purchase.customerEmail, kind: "update", at: timestamp(), title: `${money(amount)} added to your Drive Wallet`, body: "Loaded by the concierge team.", href: "/account/wallet" });
              logAudit(actor, "wallet.topped_up", purchase.customerEmail, `${money(amount)} by staff`);
              toast(`${money(amount)} added.`);
              onClose();
            }}
          >
            Charge & load {money(amount)}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {[1_000, 2_500, 5_000, 10_000].map((v) => (
          <button key={v} type="button" onClick={() => setAmount(v)} className={cn("rounded-lg border py-3 font-mono text-sm", amount === v ? "border-gold bg-gold/10 text-gold" : "border-line text-cream/80")}>{money(v)}</button>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-dim">Non-refundable. Demo: no card is charged.</p>
    </Modal>
  );
}

function OnboardModal({ open, onClose, plans, customers, actor }: { open: boolean; onClose: () => void; plans: Plan[]; customers: Customer[]; actor: string }) {
  const [step, setStep] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [walkIn, setWalkIn] = useState({ name: "", email: "", phone: "" });
  const [planId, setPlanId] = useState(plans.find((p) => p.featured)?.id ?? plans[0]?.id);
  const [card, setCard] = useState<CardInput>(EMPTY_CARD);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = plans.find((p) => p.id === planId)!;
  const existing = customers.find((c) => c.id === customerId) ?? null;
  const who = existing ?? { name: walkIn.name, email: walkIn.email, phone: walkIn.phone };

  function next() {
    setError(null);
    if (step === 0 && !existing && (walkIn.name.trim().length < 2 || !/\S+@\S+\.\S+/.test(walkIn.email))) return setError("Pick a member or enter the walk-in's name and email.");
    if (step === 2) {
      const res = parseCard(card);
      if (!res.ok) return setError(res.error);
    }
    setStep((s) => s + 1);
  }

  function charge() {
    if (!terms) return setError("Confirm the member accepted the non-refundable terms.");
    create<PlanPurchase>(C.purchases, { id: newId("pp"), customerName: who.name, customerEmail: who.email.toLowerCase(), planName: plan.name, price: plan.price, credits: plan.credits, remaining: plan.credits, purchasedAt: timestamp(), status: "active" });
    const tierMin = tierByName(plan.grantsTier).min;
    if (existing) {
      patch<Customer>(C.customers, existing, { credits: existing.credits + plan.credits, points: Math.max(existing.points, tierMin), tier: tierFor(Math.max(existing.points, tierMin)).name, enrolled: true });
    } else {
      create<Customer>(C.customers, { id: newId("cus"), name: who.name, email: who.email.toLowerCase(), phone: who.phone || "—", tier: plan.grantsTier, points: tierMin, credits: plan.credits, rentals: 0, lifetimeSpend: 0, joinedAt: timestamp(), enrolled: true, flagged: false, channel: "walk-in" });
    }
    syncMember(who.email, (m) => ({ ...m, activePlanId: plan.id, points: Math.max(m.points, tierMin), credits: m.credits + plan.credits, creditsLoaded: m.creditsLoaded + plan.credits }));
    logAudit(actor, "wallet.plan_purchased", who.email, `${plan.name} · ${money(plan.price)} (staff)`);
    toast(`${who.name} is on ${plan.name} — ${money(plan.credits)} loaded.`);
    setStep(0);
    setTerms(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      eyebrow="Onboard subscriber"
      title={["Who's subscribing?", "Choose a plan", "Card", "Review & charge"][step]}
      footer={
        <>
          {step > 0 ? <Button variant="ghost" className="mr-auto" onClick={() => setStep((s) => s - 1)}>Back</Button> : null}
          {step < 3 ? <Button onClick={next}>Continue</Button> : <Button onClick={charge}>Charge {money(plan.price)}</Button>}
        </>
      }
    >
      <StepIndicator steps={["Member", "Plan", "Card", "Review"]} current={step} className="mb-6" />
      {step === 0 ? (
        <div className="space-y-4">
          <Field label="Existing member" htmlFor="ob-member">
            <Select id="ob-member" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">New walk-in customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.email}</option>)}
            </Select>
          </Field>
          {!existing ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Name" htmlFor="ob-name"><Input id="ob-name" value={walkIn.name} onChange={(e) => setWalkIn({ ...walkIn, name: e.target.value })} /></Field>
              <Field label="Email" htmlFor="ob-email"><Input id="ob-email" type="email" value={walkIn.email} onChange={(e) => setWalkIn({ ...walkIn, email: e.target.value })} /></Field>
              <Field label="Phone" htmlFor="ob-phone"><Input id="ob-phone" value={walkIn.phone} onChange={(e) => setWalkIn({ ...walkIn, phone: e.target.value })} /></Field>
            </div>
          ) : null}
        </div>
      ) : step === 1 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((p) => (
            <button key={p.id} type="button" onClick={() => setPlanId(p.id)} className={cn("rounded-xl p-4 text-left", planId === p.id ? "edge-gold" : "border border-line bg-ink/40")}>
              <p className="flex items-center justify-between font-display text-lg font-semibold text-cream">{p.name}{p.featured ? <Badge tone="gold">Popular</Badge> : null}</p>
              <p className="mt-2 font-mono text-xl text-cream">{money(p.price)}</p>
              <p className="text-xs text-success">{money(p.credits)} credit · {p.grantsTier}</p>
            </button>
          ))}
        </div>
      ) : step === 2 ? (
        <CardFields value={card} onChange={setCard} />
      ) : (
        <div className="space-y-4">
          <dl className="grid gap-2 rounded-lg border border-line bg-ink/40 p-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Member</dt><dd className="text-cream">{who.name} · {who.email}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Plan</dt><dd className="text-cream">{plan.name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Charge</dt><dd className="font-mono text-cream">{money(plan.price)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Credit loaded</dt><dd className="font-mono text-success">{money(plan.credits)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Low-balance alert</dt><dd className="text-cream">at {money(plan.credits * 0.2)}</dd></div>
          </dl>
          <label className="flex items-start gap-3 text-sm text-cream/85">
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 accent-[#c4a068]" />
            The member accepts that Drive Wallet credit is non-refundable and does not expire while the account is open.
          </label>
        </div>
      )}
      {error ? <Alert tone="danger" className="mt-4">{error}</Alert> : null}
    </Modal>
  );
}

/* ---------------------------------- payouts --------------------------------- */

type PayoutView = "due" | "history";

export function PayoutsScreen({ initial, partners: basePartners }: { initial: Payout[]; partners: Partner[] }) {
  const payouts = useCollection<Payout>(C.payouts, initial);
  const partners = useCollection<Partner>(C.partners, basePartners);
  const actor = useActor();
  const [view, setView] = useState<PayoutView>("due");
  const [filter, setFilter] = useState<"all" | PayoutStatus>("all");
  const [confirmAll, setConfirmAll] = useState(false);

  const due = partners.filter((p) => balanceOf(p) > 0 && p.status !== "pending");
  const totalDue = due.reduce((s, p) => s + balanceOf(p), 0);
  const rows = [...payouts].sort((a, b) => b.scheduledFor - a.scheduledFor).filter((p) => filter === "all" || p.status === filter);
  const sum = (s: PayoutStatus[]) => payouts.filter((p) => s.includes(p.status)).reduce((t, p) => t + p.amount, 0);
  const set = (p: Payout, status: PayoutStatus, message: string) => {
    patch<Payout>(C.payouts, p, { status });
    logAudit(actor.name, `payout.${status}`, p.partnerName, message);
    toast(message);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Revenue"
        title="Payouts"
        description="Partner commission. Pay what's owed, release what's scheduled, and chase anything that bounced."
        actions={
          <Button onClick={() => setConfirmAll(true)} disabled={!due.length}>
            Pay all {money(totalDue)}
          </Button>
        }
      />

      <StatGrid
        stats={[
          { label: "Owed now", value: money(totalDue), hint: `${due.length} partners` },
          { label: "Scheduled", value: money(sum(["scheduled", "processing"])) },
          { label: "Paid to date", value: money(sum(["paid"])) },
          { label: "Failed", value: money(sum(["failed"])) },
        ]}
      />

      <Tabs<PayoutView>
        label="Payouts"
        value={view}
        onChange={setView}
        items={[
          { value: "due", label: "Due", count: due.length },
          { value: "history", label: "Payout history", count: payouts.length },
        ]}
      />

      {view === "due" ? (
        due.length ? (
          <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {due.map((p) => (
              <li key={p.id} className="flex flex-col gap-4 rounded-xl border border-line bg-surface-1/50 p-5">
                <div>
                  <p className="font-medium text-cream">{p.business}</p>
                  <p className="text-xs text-muted">{p.type} · {p.code} · {p.commission}%</p>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-xs text-muted">Referrals</dt><dd className="text-cream">{p.referrals}</dd></div>
                  <div><dt className="text-xs text-muted">Earned</dt><dd className="text-cream">{moneyCompact(p.earnings)}</dd></div>
                  <div><dt className="text-xs text-muted">Paid</dt><dd className="text-cream">{moneyCompact(p.paidOut)}</dd></div>
                </dl>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
                  <span className="font-mono text-lg text-gold">{money(balanceOf(p))}</span>
                  <Button size="sm" onClick={() => { const po = payPartner(p, actor.name); if (po) toast(`${money(po.amount)} paid to ${p.business}.`); }}>Pay now</Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nobody is owed" description="Commission accrues as referred bookings complete." />
        )
      ) : (
        <>
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
            <Button size="sm" variant="outline" disabled={!payouts.some((p) => p.status === "scheduled")} onClick={() => payouts.filter((p) => p.status === "scheduled").forEach((p) => set(p, "processing", `${p.partnerName} released for processing.`))}>
              Release scheduled
            </Button>
          </Toolbar>
          <DataTable
            caption="Partner payouts"
            rows={rows}
            rowKey={(p) => p.id}
            empty="No payouts in this state."
            columns={[
              { key: "partner", header: "Partner", cell: (p) => <Primary title={p.partnerName} sub={p.method} /> },
              { key: "period", header: "Period", hideBelow: "md", cell: (p) => `${shortDate(p.period.start)} – ${shortDate(p.period.end)}` },
              { key: "date", header: "Pay date", hideBelow: "sm", cell: (p) => shortDate(p.scheduledFor) },
              { key: "amount", header: "Amount", align: "right", cell: (p) => money(p.amount) },
              { key: "status", header: "Status", cell: (p) => <Status kind="payout" value={p.status} /> },
              {
                key: "action",
                header: "",
                align: "right",
                cell: (p) =>
                  p.status === "scheduled" || p.status === "processing" ? (
                    <button type="button" onClick={() => set(p, "paid", `${money(p.amount)} to ${p.partnerName} marked paid.`)} className="whitespace-nowrap rounded-full border border-gold/40 px-3.5 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold/10">
                      Mark paid
                    </button>
                  ) : p.status === "failed" ? (
                    <button type="button" onClick={() => set(p, "scheduled", `${p.partnerName} payout rescheduled.`)} className="whitespace-nowrap rounded-full border border-line px-3.5 py-1.5 text-xs text-cream/80 transition-colors hover:border-gold/40">
                      Retry
                    </button>
                  ) : null,
              },
            ]}
          />
        </>
      )}
      <DemoNote />
      <p className="text-xs text-muted-dim">Money moves for real once the payment processor is connected in Milestone 5.</p>

      <Modal
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        size="sm"
        title={`Pay ${money(totalDue)} to ${due.length} partners?`}
        description="Each partner's full unpaid balance is paid by ACH and recorded as a payout."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAll(false)}>Cancel</Button>
            <Button onClick={() => { due.forEach((p) => payPartner(p, actor.name)); toast(`${money(totalDue)} paid to ${due.length} partners.`); setConfirmAll(false); }}>Pay all</Button>
          </>
        }
      >
        <ul className="space-y-1.5 text-sm">
          {due.map((p) => (
            <li key={p.id} className="flex justify-between"><span className="text-cream/85">{p.business}</span><span className="font-mono text-cream">{money(balanceOf(p))}</span></li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}

/* --------------------------------- analytics -------------------------------- */

const CHANNEL_LABEL: Record<BookingChannel, string> = { web: "Website", concierge: "Concierge", partner: "Partner referrals", "walk-in": "Walk-in" };

export function AnalyticsScreen({
  revenue,
  reservations: baseReservations,
  partners: basePartners,
  customers: baseCustomers,
  listings,
  purchases: basePurchases,
}: {
  revenue: RevenueMonth[];
  reservations: Reservation[];
  partners: Partner[];
  customers: Customer[];
  listings: Listing[];
  purchases: PlanPurchase[];
}) {
  const reservations = useCollection<Reservation>(C.reservations, baseReservations);
  const partners = useCollection<Partner>(C.partners, basePartners);
  const customers = useCollection<Customer>(C.customers, baseCustomers);
  const purchases = useCollection<PlanPurchase>(C.purchases, basePurchases);
  const now = useClock(0);

  const total = revenue.reduce((s, m) => s + m.cars + m.homes + m.plans, 0);
  const prev = revenue[revenue.length - 2];
  const last = revenue[revenue.length - 3];
  const growth = prev && last ? ((prev.cars + prev.homes + prev.plans) / (last.cars + last.homes + last.plans) - 1) * 100 : 0;
  const booked = reservations.filter((r) => r.status !== "cancelled");
  const cancelled = reservations.filter((r) => r.status === "cancelled");

  // Weekly buckets across the last 8 weeks, from booking creation dates.
  const WEEK = 7 * 86_400_000;
  const weeks = Array.from({ length: 8 }, (_, i) => now - (7 - i) * WEEK);
  const inWeek = (ms: number, w: number) => ms >= w - WEEK && ms < w;
  const weekLabel = (ms: number) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(ms - WEEK));
  // Fixture history is sparse, so each week carries a baseline from the monthly revenue.
  const baseline = revenue.length ? (revenue[revenue.length - 2].cars + revenue[revenue.length - 2].homes) / 4.3 : 0;
  const weekly = weeks.map((w, i) => Math.round(baseline * (0.78 + ((i * 37) % 17) / 40) + booked.filter((r) => inWeek(r.createdAt, w)).reduce((s, r) => s + r.total, 0)));

  const byChannel = (Object.keys(CHANNEL_LABEL) as BookingChannel[])
    .map((c) => ({ label: CHANNEL_LABEL[c], value: booked.filter((r) => r.channel === c).length }))
    .filter((r) => r.value > 0);
  const byListing = Object.values(
    booked.reduce<Record<string, { label: string; value: number; sub: string; n: number }>>((acc, r) => {
      acc[r.listingId] ??= { label: r.listingName, value: 0, sub: "", n: 0 };
      acc[r.listingId].value += r.total;
      acc[r.listingId].n += 1;
      acc[r.listingId].sub = `${acc[r.listingId].n} bookings`;
      return acc;
    }, {}),
  ).sort((a, b) => b.value - a.value);
  const deposits = (["held", "charged", "refunded", "forfeited"] as const).map((s) => ({ label: s[0].toUpperCase() + s.slice(1), value: reservations.filter((r) => r.depositStatus === s).length }));
  const tiers = TIERS.map((t) => ({ label: t.name, value: customers.filter((c) => tierFor(c.points).name === t.name).length }));
  const byType = Object.values(
    partners.reduce<Record<string, { label: string; value: number }>>((acc, p) => {
      acc[p.type] ??= { label: p.type, value: 0 };
      acc[p.type].value += p.earnings;
      return acc;
    }, {}),
  )
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Member growth: cumulative joins, sampled monthly.
  const months = revenue.map((m) => m.month);
  const growthSeries = months.map((m) => customers.filter((c) => c.joinedAt <= m + 31 * 86_400_000).length);
  const enrolledSeries = months.map((m) => customers.filter((c) => c.enrolled && c.joinedAt <= m + 31 * 86_400_000).length);
  const kind = (k: "car" | "home") => listings.filter((l) => l.kind === k);
  const util = (k: "car" | "home") => [
    { label: "Available", value: kind(k).filter((l) => l.status === "available").length, color: "#46d98a" },
    { label: "Booked", value: kind(k).filter((l) => l.status === "booked").length, color: "#c4a068" },
    { label: "In service", value: kind(k).filter((l) => l.status === "maintenance").length, color: "#ff9f43" },
  ];
  const planCounts = Array.from(new Set(purchases.map((p) => p.planName))).map((name) => ({ label: name, value: purchases.filter((p) => p.planName === name && p.status !== "refunded").length }));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Revenue" title="Analytics" description="Where revenue comes from, which channels bring it, which listings earn it, and how the membership grows." />

      <StatGrid
        stats={[
          { label: "Revenue, 6 months", value: money(total) },
          { label: "Last month vs prior", value: `${growth >= 0 ? "+" : ""}${growth.toFixed(1)}%` },
          { label: "Avg. booking value", value: money(Math.round(booked.reduce((s, r) => s + r.total, 0) / (booked.length || 1))) },
          { label: "Cancellation rate", value: `${Math.round((cancelled.length / (reservations.length || 1)) * 100)}%` },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Weekly booked revenue" description="Last eight weeks, cars and estates.">
          <LineChart title="Weekly booked revenue" labels={weeks.map(weekLabel)} series={[{ name: "Revenue", values: weekly }]} area />
        </Panel>
        <Panel title="Revenue split" description="Six months, by what earned it.">
          <DonutChart
            title="Revenue split by cars, estates and plans"
            format={moneyCompact}
            slices={[
              { label: "Cars", value: revenue.reduce((s, m) => s + m.cars, 0) },
              { label: "Estates", value: revenue.reduce((s, m) => s + m.homes, 0) },
              { label: "Wallet plans", value: revenue.reduce((s, m) => s + m.plans, 0) },
            ]}
          />
        </Panel>
      </div>

      <Panel title="Booked revenue by month" description="Cars, estates and Drive Wallet plan sales.">
        <StackedBars title="Booked revenue by month, split by cars, estates and plans" series={["Cars", "Estates", "Plans"]} data={revenue.map((m) => ({ label: monthLabel(m.month), values: [m.cars, m.homes, m.plans] }))} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Booking channel"><DonutChart title="Bookings by channel" slices={byChannel} centerLabel="Bookings" /></Panel>
        <Panel title="Deposit status"><DonutChart title="Deposits by status" slices={deposits} centerLabel="Deposits" /></Panel>
        <Panel title="Loyalty tiers"><DonutChart title="Members by tier" slices={tiers} centerLabel="Members" /></Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Member growth" description="Total members vs Level Rewards enrolled.">
          <LineChart title="Member growth" labels={months.map(monthLabel)} format={(v) => count(Math.round(v))} series={[{ name: "Members", values: growthSeries }, { name: "Enrolled", values: enrolledSeries, dashed: true }]} />
        </Panel>
        <Panel title="Partner earnings by business type"><RankedBars rows={byType} /></Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Top listings by revenue"><RankedBars rows={byListing} /></Panel>
        <Panel title="Utilisation & plans">
          <div className="space-y-6">
            <div><p className="mb-2 text-sm text-cream">Fleet</p><SplitBar parts={util("car")} /></div>
            <div><p className="mb-2 text-sm text-cream">Estates</p><SplitBar parts={util("home")} /></div>
            <div><p className="mb-2 text-sm text-cream">Active wallets by plan</p><RankedBars rows={planCounts} format={(v) => `${v}`} /></div>
          </div>
        </Panel>
      </div>

      <Panel title="Search & discoverability" description="Estimated from the SEO manager until Search Console is connected at launch.">
        <DataTable
          caption="Page traffic estimates"
          rows={[
            { page: "/", visits: 4200, bounce: 38, status: "Indexed" },
            { page: "/cars", visits: 2900, bounce: 31, status: "Indexed" },
            { page: "/cars/rolls-royce-cullinan-black-badge", visits: 1650, bounce: 27, status: "Indexed" },
            { page: "/homes", visits: 1300, bounce: 35, status: "Indexed" },
            { page: "/subscriptions", visits: 640, bounce: 44, status: "Indexed" },
            { page: "/partners", visits: 410, bounce: 49, status: "Needs keyword" },
          ]}
          rowKey={(r) => r.page}
          columns={[
            { key: "page", header: "Page", cell: (r) => <span className="font-mono text-xs text-cream">{r.page}</span> },
            { key: "visits", header: "Est. monthly visits", align: "right", cell: (r) => count(r.visits) },
            { key: "bounce", header: "Bounce", align: "right", hideBelow: "sm", cell: (r) => `${r.bounce}%` },
            { key: "status", header: "SEO status", align: "right", cell: (r) => <Badge tone={r.status === "Indexed" ? "success" : "warning"}>{r.status}</Badge> },
          ]}
        />
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
  reservations: baseReservations,
  customers: baseCustomers,
  payouts: basePayouts,
  purchases: basePurchases,
  audit: baseAudit,
  partners: basePartners,
  listings: baseListings,
}: {
  reservations: Reservation[];
  customers: Customer[];
  payouts: Payout[];
  purchases: PlanPurchase[];
  audit: AuditEntry[];
  partners: Partner[];
  listings: Listing[];
}) {
  const reservations = useCollection<Reservation>(C.reservations, baseReservations);
  const customers = useCollection<Customer>(C.customers, baseCustomers);
  const payouts = useCollection<Payout>(C.payouts, basePayouts);
  const purchases = useCollection<PlanPurchase>(C.purchases, basePurchases);
  const audit = useCollection<AuditEntry>(C.audit, baseAudit.length ? baseAudit : AUDIT_LOG);
  const partners = useCollection<Partner>(C.partners, basePartners);
  const listings = useCollection<Listing>(C.listings, baseListings);
  const messages = useCollection<MessageLogEntry>(C.messages, []);

  const reports = useMemo(
    () => [
      { id: "reservations", name: "Reservations", description: "Every booking with guest, listing, window, channel, total and deposit state.", rows: reservations.length, build: () => toCsv(["Reference", "Guest", "Email", "Listing", "Start", "End", "Channel", "Partner code", "Total", "Deposit", "Deposit status", "Status"], reservations.map((r) => [r.reference, r.guestName, r.email, r.listingName, iso(r.window.start), iso(r.window.end), r.channel, r.partnerCode ?? "", r.total, r.deposit, r.depositStatus, r.status])) },
      { id: "revenue-by-listing", name: "Revenue by listing", description: "Bookings and booked revenue per car and estate.", rows: listings.length, build: () => toCsv(["Listing", "Type", "Bookings", "Revenue"], listings.map((l) => { const rs = reservations.filter((r) => r.listingId === l.id && r.status !== "cancelled"); return [l.name, l.kind, rs.length, rs.reduce((s, r) => s + r.total, 0)]; })) },
      { id: "customers", name: "Customers", description: "Members with tier, points, wallet balance, rentals and lifetime spend.", rows: customers.length, build: () => toCsv(["Name", "Email", "Phone", "Tier", "Points", "Wallet", "Rentals", "Lifetime spend", "Joined"], customers.map((c) => [c.name, c.email, c.phone, c.tier, c.points, c.credits, c.rentals, c.lifetimeSpend, iso(c.joinedAt)])) },
      { id: "partners", name: "Partner commission", description: "Every partner with code, rate, referrals, earned, paid and balance.", rows: partners.length, build: () => toCsv(["Business", "Type", "Contact", "Email", "Code", "Commission %", "Referrals", "Earned", "Paid", "Balance", "Status", "Joined"], partners.map((p) => [p.business, p.type, p.contact, p.email, p.code, p.commission, p.referrals, p.earnings, p.paidOut, balanceOf(p), p.status, iso(p.joinedAt)])) },
      { id: "payouts", name: "Partner payouts", description: "Commission payouts by partner, period, method and status.", rows: payouts.length, build: () => toCsv(["Partner", "Period start", "Period end", "Pay date", "Method", "Amount", "Status"], payouts.map((p) => [p.partnerName, iso(p.period.start), iso(p.period.end), iso(p.scheduledFor), p.method, p.amount, p.status])) },
      { id: "plans", name: "Drive Wallet sales", description: "Plan purchases, credit loaded and credit remaining.", rows: purchases.length, build: () => toCsv(["Member", "Email", "Plan", "Paid", "Credits", "Remaining", "Purchased", "Status"], purchases.map((p) => [p.customerName, p.customerEmail, p.planName, p.price, p.credits, p.remaining, iso(p.purchasedAt), p.status])) },
      { id: "inventory", name: "Fleet & estate inventory", description: "Every listing with category, status, rates, deposit and rating.", rows: listings.length, build: () => toCsv(["Type", "Name", "Category", "Location", "Status", "Hour", "Day", "Week", "Month", "Deposit", "Trips", "Rating"], listings.map((l) => [l.kind, l.name, l.category, l.location, l.status, l.rates.hour ?? "", l.rates.day ?? "", l.rates.week ?? "", l.rates.month ?? "", l.deposit, l.trips, l.rating])) },
      { id: "messages", name: "Message log", description: "Emails, SMS and push notifications queued by the platform.", rows: messages.length, build: () => toCsv(["Time", "To", "Channel", "Subject", "Template", "Status"], messages.map((m) => [new Date(m.at).toISOString(), m.to, m.channel, m.subject, m.template, m.status])) },
      { id: "audit", name: "Audit log", description: "Every recorded change: when, who, what and to which record.", rows: audit.length, build: () => toCsv(["Time", "Actor", "Action", "Record", "Detail"], audit.map((a) => [new Date(a.at).toISOString(), a.actor, a.action, a.entity, a.detail])) },
    ],
    [reservations, customers, payouts, purchases, audit, partners, listings, messages],
  );

  const booked = reservations.filter((r) => r.status !== "cancelled");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Revenue" title="Reports" description="Download any register as a CSV for your accountant, spreadsheet or BI tool." />
      <StatGrid
        stats={[
          { label: "Booked revenue", value: money(booked.reduce((s, r) => s + r.total, 0)) },
          { label: "Bookings", value: booked.length },
          { label: "Cancel rate", value: `${Math.round(((reservations.length - booked.length) / (reservations.length || 1)) * 100)}%` },
          { label: "Members", value: customers.length },
        ]}
      />
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
                  download(`nxl-${r.id}-${iso(timestamp())}.csv`, r.build());
                  toast(`${r.name} exported.`);
                }}
              >
                <Download aria-hidden width={14} height={14} /> Download CSV
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-dim">UTF-8 CSV with a header row. Opens in Excel, Numbers and Google Sheets.</p>
    </div>
  );
}
