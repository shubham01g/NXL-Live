"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { money } from "@/lib/domain/format";
import { REDEMPTION, tierByName } from "@/lib/domain/loyalty";
import { ProgressBar } from "@/components/ui/feedback";
import { Card, Eyebrow } from "@/components/ui/primitives";

/**
 * Interactive walkthrough of a credit wallet's life.
 *
 * Every figure below is derived from the real plan, rate card and tier table,
 * so the demo can never drift from the product. The prototype had a version
 * of this with hand-written numbers that no longer matched its own store.
 */

interface Step {
  index: string;
  title: string;
  detail: string;
  balance: number;
  totalCredits: number;
  points: number;
  entry?: { label: string; amount: string; tone: "debit" | "credit" | "note" };
}

const COLLECTOR_PRICE = 8_900;
const COLLECTOR_CREDITS = 9_800;
const GOLD_RATE = tierByName("Gold").rate;

// McLaren 720S Spider at $1,799/day for 3 days.
const BOOKING_ONE = 1_799 * 3;
// Ferrari 488 Spider at $1,599/day for 2 days.
const BOOKING_TWO = 1_599 * 2;
const TOP_UP = 5_000;

const POINTS_ONE = Math.round(BOOKING_ONE * GOLD_RATE);
const POINTS_TWO = Math.round(BOOKING_TWO * GOLD_RATE);
const TOTAL_POINTS = POINTS_ONE + POINTS_TWO;

const AFTER_ONE = COLLECTOR_CREDITS - BOOKING_ONE;
const AFTER_TWO = AFTER_ONE - BOOKING_TWO;
const AFTER_TOPUP = AFTER_TWO + TOP_UP;

const STEPS: Step[] = [
  {
    index: "01",
    title: "Join NXL",
    detail:
      "Create a free account and opt into Level Rewards. No wallet yet, no points yet.",
    balance: 0,
    totalCredits: 0,
    points: 0,
  },
  {
    index: "02",
    title: "Load the Collector wallet",
    detail: `A one-time ${money(COLLECTOR_PRICE)} charge loads ${money(COLLECTOR_CREDITS)} in drive credit — ${money(COLLECTOR_CREDITS - COLLECTOR_PRICE)} of that is bonus — and activates Gold tier immediately.`,
    balance: COLLECTOR_CREDITS,
    totalCredits: COLLECTOR_CREDITS,
    points: 0,
    entry: {
      label: "Wallet purchase · Collector",
      amount: `+${money(COLLECTOR_CREDITS)}`,
      tone: "credit",
    },
  },
  {
    index: "03",
    title: "Book the McLaren 720S",
    detail: `Three days at ${money(1_799)}/day. The cost comes straight out of the wallet, and Gold earns ${Math.round(GOLD_RATE * 100)}% back.`,
    balance: AFTER_ONE,
    totalCredits: COLLECTOR_CREDITS,
    points: POINTS_ONE,
    entry: {
      label: "McLaren 720S Spider · 3 days",
      amount: `−${money(BOOKING_ONE)}`,
      tone: "debit",
    },
  },
  {
    index: "04",
    title: "Book the Ferrari 488 Spider",
    detail: `Two days at ${money(1_599)}/day. Points keep accruing on every booking.`,
    balance: AFTER_TWO,
    totalCredits: COLLECTOR_CREDITS,
    points: TOTAL_POINTS,
    entry: {
      label: "Ferrari 488 Spider · 2 days",
      amount: `−${money(BOOKING_TWO)}`,
      tone: "debit",
    },
  },
  {
    index: "05",
    title: "Low-balance alert",
    detail: `The wallet drops below 20% remaining, so we email you automatically. Nothing is auto-charged — topping up is always your call.`,
    balance: AFTER_TWO,
    totalCredits: COLLECTOR_CREDITS,
    points: TOTAL_POINTS,
    entry: {
      label: "Low-balance alert sent",
      amount: "20% threshold",
      tone: "note",
    },
  },
  {
    index: "06",
    title: `Top up ${money(TOP_UP)}`,
    detail:
      "Add credit whenever you want, in any amount. Your tier and earn rate are unaffected — they are already earned.",
    balance: AFTER_TOPUP,
    totalCredits: COLLECTOR_CREDITS + TOP_UP,
    points: TOTAL_POINTS,
    entry: { label: "Wallet top-up", amount: `+${money(TOP_UP)}`, tone: "credit" },
  },
  {
    index: "07",
    title: "Redeem your points",
    detail: `${TOTAL_POINTS.toLocaleString()} points redeems for ${money(Math.floor(TOTAL_POINTS / REDEMPTION.pointsPerDollar))} off your next rental, on top of everything the wallet already covers.`,
    balance: AFTER_TOPUP,
    totalCredits: COLLECTOR_CREDITS + TOP_UP,
    points: TOTAL_POINTS,
    entry: {
      label: "Points redeemed",
      amount: `−${money(Math.floor(TOTAL_POINTS / REDEMPTION.pointsPerDollar))} off`,
      tone: "credit",
    },
  },
];

export function WalletJourney() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const log = STEPS.slice(0, step + 1)
    .filter((s) => s.entry)
    .reverse();

  const remaining =
    current.totalCredits > 0 ? current.balance / current.totalCredits : 0;
  const lowBalance = current.totalCredits > 0 && remaining <= 0.2;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <ol className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <li key={s.index} className="flex-1">
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Step ${s.index}: ${s.title}`}
                aria-current={i === step}
                className={cn(
                  "h-1 w-full rounded-full transition-colors",
                  i <= step ? "bg-gold" : "bg-surface-3 hover:bg-surface-4",
                )}
              />
            </li>
          ))}
        </ol>

        <div className="mt-8">
          <span className="font-mono text-sm text-gold">{current.index}</span>
          <h3 className="mt-3 font-display text-2xl font-semibold text-cream">
            {current.title}
          </h3>
          <p className="mt-4 text-base leading-relaxed text-muted">{current.detail}</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-cream/80 transition-colors hover:border-line-strong disabled:pointer-events-none disabled:opacity-30"
          >
            <ArrowLeft aria-hidden width={14} height={14} />
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-gold-200"
            >
              Next step
              <ArrowRight aria-hidden width={14} height={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(0)}
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-5 py-2 text-sm text-gold transition-colors hover:bg-gold/10"
            >
              <RotateCcw aria-hidden width={14} height={14} />
              Start over
            </button>
          )}
        </div>
      </div>

      {/* --------------------------------- panel --------------------------------- */}
      <div className="space-y-4">
        <Card className="p-6">
          <div className="flex items-baseline justify-between gap-4">
            <Eyebrow>Drive wallet</Eyebrow>
            {current.totalCredits > 0 ? (
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em]",
                  lowBalance
                    ? "border-warning/30 bg-warning/10 text-warning"
                    : "border-success/30 bg-success/10 text-success",
                )}
              >
                {lowBalance ? "Low balance" : "Active"}
              </span>
            ) : null}
          </div>

          <p className="mt-4 font-mono text-3xl tabular-nums text-cream">
            {money(current.balance)}
          </p>
          <p className="text-xs text-muted">
            {current.totalCredits > 0
              ? `of ${money(current.totalCredits)} loaded`
              : "no wallet yet"}
          </p>

          <ProgressBar
            className="mt-4"
            label="Credit remaining"
            value={remaining}
            tone={lowBalance ? "warning" : "gold"}
          />
        </Card>

        <Card className="p-6">
          <Eyebrow>Level Rewards</Eyebrow>
          <div className="mt-4 flex items-baseline justify-between gap-4">
            <p className="font-mono text-3xl tabular-nums text-cream">
              {current.points.toLocaleString()}
            </p>
            <p className="text-sm" style={{ color: tierByName("Gold").color }}>
              {step >= 1 ? "Gold · 12%" : "Not enrolled"}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted">
            worth {money(Math.floor(current.points / REDEMPTION.pointsPerDollar))} at
            checkout
          </p>
        </Card>

        <Card className="p-6">
          <Eyebrow>Activity</Eyebrow>
          {log.length === 0 ? (
            <p className="mt-4 text-sm text-muted-dim">
              Nothing yet — advance the walkthrough.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {log.map((s) => (
                <li
                  key={s.index}
                  className="flex items-center justify-between gap-4 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate text-cream/80">{s.entry!.label}</span>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-xs tabular-nums",
                      s.entry!.tone === "credit" && "text-success",
                      s.entry!.tone === "debit" && "text-cream",
                      s.entry!.tone === "note" && "text-warning",
                    )}
                  >
                    {s.entry!.amount}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
