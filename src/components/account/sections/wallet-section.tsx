"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownUp, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { money, shortDate } from "@/lib/domain/format";
import { cardLabel, creditsRemaining, EMPTY_CARD, isLowBalance, parseCard, type CardInput } from "@/lib/domain/account";
import { tierByName, tierFor } from "@/lib/domain/loyalty";
import type { MemberAccount, Plan, WalletEntry } from "@/lib/domain/types";
import type { PlanPurchase } from "@/lib/domain/operations";
import { updateMember, useMember } from "@/lib/auth/use-session";
import { C, logAudit, notify, queueMessage, raiseAlert } from "@/lib/data/demo";
import { create, newId } from "@/lib/data/demo-store";
import { CardFields } from "@/components/checkout/card-fields";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, ProgressBar } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/overlay";
import { Badge } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { timestamp } from "@/lib/hooks/use-clock";
import { DetailRow, Panel, SectionHeader } from "../panel";

/**
 * Drive Wallet.
 *
 * Top-ups and plan changes are complete flows at M2 — amount, card, new
 * balance, receipt — with the charge itself simulated until the processor
 * lands at M5. Credits are non-refundable, and the modal says so before the
 * member confirms, as the prototype's wallet FAQ promised.
 */

const PRESETS = [500, 1_000, 2_500, 5_000, 10_000];

type Tab = "activity" | "receipts";

export function WalletSection({ plans, initialPlan = null }: { plans: Plan[]; initialPlan?: string | null }) {
  const member = useMember();
  const [tab, setTab] = useState<Tab>("activity");
  const [topUp, setTopUp] = useState(false);
  const [changePlan, setChangePlan] = useState(!!initialPlan);
  if (!member) return null;

  const remaining = creditsRemaining(member);
  const low = isLowBalance(member);
  const plan = plans.find((p) => p.id === member.activePlanId) ?? null;
  const receipts = member.wallet.filter((e) => e.kind === "load");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Drive Wallet"
        description="Credit you have loaded, and everything it has been spent on. Nothing auto-bills — topping up is always your call."
      />

      <Panel tone="gold">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">Balance</p>
            <p className="text-metal-soft mt-2 font-mono text-display-4 tabular-nums">{money(member.credits)}</p>
          </div>
          {member.creditsLoaded > 0 ? (
            <Badge tone={member.credits <= 0 ? "danger" : low ? "warning" : "success"}>
              {member.credits <= 0 ? "Depleted" : low ? "Low balance" : "Active"}
            </Badge>
          ) : null}
        </div>

        {member.creditsLoaded > 0 ? (
          <>
            <ProgressBar className="mt-5" label="Credit remaining" value={remaining} tone={remaining <= 0.2 ? "danger" : remaining <= 0.4 ? "warning" : "gold"} />
            <p className="mt-2 text-xs text-muted">
              {Math.round(remaining * 100)}% of {money(member.creditsLoaded)} loaded
            </p>
          </>
        ) : null}

        <dl className="mt-6">
          <DetailRow label="Plan">{plan ? `${plan.name} · ${plan.grantsTier} tier` : "No plan yet"}</DetailRow>
          <DetailRow label="Lifetime loaded">{money(member.creditsLoaded)}</DetailRow>
          <DetailRow label="Spent">{money(Math.max(0, member.creditsLoaded - member.credits))}</DetailRow>
          <DetailRow label="Earn rate">{Math.round(tierFor(member.points).rate * 100)}% back in points</DetailRow>
        </dl>

        {low ? (
          <Alert tone="warning" className="mt-5" title="Running low">
            You are at or below the 20% threshold, which is when we email you. Add credit in any amount — your tier and earn rate are already earned and will not change.
          </Alert>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button onClick={() => (plan ? setTopUp(true) : setChangePlan(true))}>
            <Plus aria-hidden width={16} height={16} />
            {plan ? "Add credits" : "Choose a plan"}
          </Button>
          <Button variant="outline" onClick={() => setChangePlan(true)}>
            <ArrowDownUp aria-hidden width={16} height={16} />
            {plan ? "Change plan" : "Compare plans"}
          </Button>
        </div>
      </Panel>

      <Panel>
        <Tabs<Tab>
          label="Wallet history"
          value={tab}
          onChange={setTab}
          items={[
            { value: "activity", label: "Credit activity", count: member.wallet.length },
            { value: "receipts", label: "Payments & receipts", count: receipts.length },
          ]}
        />
        {tab === "activity" ? (
          member.wallet.length === 0 ? (
            <EmptyState
              className="mt-6"
              title="No wallet activity"
              description="Loads, bonuses and spends appear here the moment a wallet is opened."
              action={
                <Link href="/subscriptions" className="text-sm text-gold transition-opacity hover:opacity-80">
                  Compare the plans
                </Link>
              }
            />
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {[...member.wallet].reverse().map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-cream/90">{entry.label}</p>
                    <p className="text-xs capitalize text-muted-dim">
                      {entry.kind} · {shortDate(entry.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("font-mono text-sm tabular-nums", entry.amount >= 0 ? "text-success" : "text-cream")}>
                      {entry.amount >= 0 ? "+" : "−"}
                      {money(Math.abs(entry.amount))}
                    </p>
                    <p className="font-mono text-xs tabular-nums text-muted-dim">{money(entry.balanceAfter)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : receipts.length === 0 ? (
          <EmptyState className="mt-6" title="No payments yet" description="Plan purchases and top-ups are listed here with their receipt numbers." />
        ) : (
          <>
            <ul className="mt-2 divide-y divide-line">
              {[...receipts].reverse().map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-cream/90">{e.label}</p>
                    <p className="font-mono text-xs text-muted-dim">
                      INV-{e.id.replace(/\W/g, "").slice(-6).toUpperCase()} · {shortDate(e.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm tabular-nums text-cream">{money(e.amount)}</span>
                    <Badge tone="success">Paid</Badge>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-dim">Drive credit is non-refundable once loaded. Unused credit never expires while your account is open.</p>
          </>
        )}
      </Panel>

      <TopUpModal open={topUp} onClose={() => setTopUp(false)} member={member} />
      <PlanModal open={changePlan} onClose={() => setChangePlan(false)} member={member} plans={plans} initialPick={initialPlan} />
    </div>
  );
}

/* --------------------------------- payment --------------------------------- */

function usePayment(member: MemberAccount) {
  const [useSaved, setUseSaved] = useState(!!member.card);
  const [card, setCard] = useState<CardInput>({ ...EMPTY_CARD, holder: member.name });
  const last4 = (): { ok: true; last4: string } | { ok: false; error: string } => {
    if (useSaved && member.card) return { ok: true, last4: member.card.last4 };
    const res = parseCard(card);
    return res.ok ? { ok: true, last4: res.card.last4 } : res;
  };
  const ui = (
    <div className="space-y-4">
      {member.card ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setUseSaved(true)}
            className={cn("rounded-full border px-4 py-2 text-sm", useSaved ? "border-gold bg-gold/10 text-gold" : "border-line text-cream/80")}
          >
            {cardLabel(member.card)}
          </button>
          <button
            type="button"
            onClick={() => setUseSaved(false)}
            className={cn("rounded-full border px-4 py-2 text-sm", !useSaved ? "border-gold bg-gold/10 text-gold" : "border-line text-cream/80")}
          >
            New card
          </button>
        </div>
      ) : null}
      {!useSaved || !member.card ? <CardFields compact value={card} onChange={setCard} /> : null}
    </div>
  );
  return { ui, last4 };
}

function entry(kind: WalletEntry["kind"], label: string, amount: number, balanceAfter: number): WalletEntry {
  return { id: newId("w"), kind, label, amount, balanceAfter, createdAt: timestamp() };
}

function TopUpModal({ open, onClose, member }: { open: boolean; onClose: () => void; member: MemberAccount }) {
  const [amount, setAmount] = useState(1_000);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pay = usePayment(member);
  const value = custom ? Number(custom) : amount;

  async function submit() {
    if (!Number.isFinite(value) || value < 100) return setError("The minimum top-up is $100.");
    const card = pay.last4();
    if (!card.ok) return setError(card.error);
    setError(null);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1000));
    const next = member.credits + value;
    updateMember((m) => ({
      ...m,
      credits: m.credits + value,
      creditsLoaded: m.creditsLoaded + value,
      wallet: [...m.wallet, entry("load", `Top-up · card ···· ${card.last4}`, value, m.credits + value)],
    }));
    notify({ email: member.email, kind: "update", at: timestamp(), title: `${money(value)} added to your Drive Wallet`, body: `New balance ${money(next)}.`, href: "/account/wallet" });
    queueMessage({ to: member.email, channel: "email", subject: "Your Drive Wallet receipt", template: "Wallet top-up" });
    logAudit(member.name, "wallet.topped_up", member.email, `${money(value)} · card ···· ${card.last4}`);
    setBusy(false);
    toast(`${money(value)} added — balance ${money(next)}.`);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add drive credit"
      description={`Current balance ${money(member.credits)}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Processing…" : `Load ${money(value || 0)}`}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setAmount(p);
                setCustom("");
              }}
              className={cn(
                "rounded-lg border py-3 font-mono text-sm tabular-nums transition-colors",
                !custom && amount === p ? "border-gold bg-gold/10 text-gold" : "border-line text-cream/85 hover:border-line-strong",
              )}
            >
              {money(p)}
            </button>
          ))}
        </div>
        <Input aria-label="Custom amount" inputMode="numeric" placeholder="Custom amount (min $100)" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))} />
        {pay.ui}
        <div className="flex items-center justify-between rounded-lg border border-line bg-ink/40 px-4 py-3 text-sm">
          <span className="text-muted">New balance</span>
          <span className="font-mono tabular-nums text-cream">{money(member.credits + (value || 0))}</span>
        </div>
        <p className="text-xs text-muted-dim">Credit is non-refundable once loaded. Demo: no card is charged.</p>
        {error ? <Alert tone="danger">{error}</Alert> : null}
      </div>
    </Modal>
  );
}

function PlanModal({
  open,
  onClose,
  member,
  plans,
  initialPick = null,
}: {
  open: boolean;
  onClose: () => void;
  member: MemberAccount;
  plans: Plan[];
  initialPick?: string | null;
}) {
  const current = plans.find((p) => p.id === member.activePlanId) ?? null;
  const [pick, setPick] = useState<string | null>(initialPick);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pay = usePayment(member);
  const chosen = plans.find((p) => p.id === pick) ?? null;

  async function submit() {
    if (!chosen) return setError("Choose a plan.");
    const card = pay.last4();
    if (!card.ok) return setError(card.error);
    setError(null);
    setBusy(true);
    await new Promise((r) => setTimeout(r, 1000));
    const bonus = chosen.credits - chosen.price;
    const tierMin = tierByName(chosen.grantsTier).min;
    updateMember((m) => {
      const afterLoad = m.credits + chosen.price;
      return {
        ...m,
        activePlanId: chosen.id,
        enrolled: true,
        // A plan grants its tier on purchase — the balance is lifted to the tier floor.
        points: Math.max(m.points, tierMin),
        credits: m.credits + chosen.credits,
        creditsLoaded: m.creditsLoaded + chosen.credits,
        wallet: [
          ...m.wallet,
          entry("load", `Wallet purchase · ${chosen.name}`, chosen.price, afterLoad),
          ...(bonus > 0 ? [entry("bonus", "Bonus credit included", bonus, afterLoad + bonus)] : []),
        ],
      };
    });
    create<PlanPurchase>(C.purchases, {
      id: newId("pp"),
      customerName: member.name,
      customerEmail: member.email,
      planName: chosen.name,
      price: chosen.price,
      credits: chosen.credits,
      remaining: member.credits + chosen.credits,
      purchasedAt: timestamp(),
      status: "active",
    });
    notify({ email: member.email, kind: "update", at: timestamp(), title: `Welcome to ${chosen.name}`, body: `${money(chosen.credits)} loaded and ${chosen.grantsTier} tier unlocked.`, href: "/account/wallet" });
    raiseAlert("payment", "Wallet plan sold", `${member.name} bought ${chosen.name} (${money(chosen.price)}).`);
    logAudit(member.name, "wallet.plan_purchased", member.email, `${chosen.name} · ${money(chosen.price)}`);
    setBusy(false);
    toast(`${chosen.name} activated — ${money(chosen.credits)} loaded.`);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={current ? "Change your plan" : "Choose a Drive Wallet plan"}
      description="Your existing balance carries over. The new plan's credit is added on top."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !chosen}>
            {busy ? "Processing…" : chosen ? `Pay ${money(chosen.price)} · load ${money(chosen.credits)}` : "Choose a plan"}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = p.id === current?.id;
          const direction = current ? (p.price > current.price ? "Upgrade" : p.price < current.price ? "Downgrade" : null) : null;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPick(p.id)}
              className={cn(
                "rounded-xl p-4 text-left transition-colors",
                pick === p.id ? "edge-gold" : "border border-line bg-ink/40 hover:border-line-strong",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-lg font-semibold text-cream">{p.name}</span>
                {isCurrent ? <Badge tone="gold">Current</Badge> : direction ? <Badge tone={direction === "Upgrade" ? "success" : "neutral"}>{direction}</Badge> : null}
              </span>
              <span className="mt-2 block font-mono text-xl tabular-nums text-cream">{money(p.price)}</span>
              <span className="block text-xs text-success">{money(p.credits)} credit · {p.grantsTier} tier</span>
              <ul className="mt-3 space-y-1">
                {p.perks.slice(0, 3).map((perk) => (
                  <li key={perk} className="flex gap-1.5 text-xs text-muted">
                    <Check aria-hidden width={12} height={12} className="mt-0.5 shrink-0 text-gold" />
                    {perk}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      {chosen ? (
        <div className="mt-6 space-y-4">
          <dl className="grid gap-2 rounded-lg border border-line bg-ink/40 p-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Balance carried over</dt><dd className="font-mono text-cream">{money(member.credits)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">New credit</dt><dd className="font-mono text-success">+{money(chosen.credits)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2"><dt className="text-cream">New balance</dt><dd className="font-mono text-cream">{money(member.credits + chosen.credits)}</dd></div>
          </dl>
          {pay.ui}
        </div>
      ) : null}
      {error ? <Alert tone="danger" className="mt-4">{error}</Alert> : null}
      <p className="mt-4 text-xs text-muted-dim">One-time purchase, not a subscription — nothing renews. Demo: no card is charged.</p>
    </Modal>
  );
}
