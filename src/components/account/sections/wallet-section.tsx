"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { money, shortDate } from "@/lib/domain/format";
import { creditsRemaining, isLowBalance } from "@/lib/domain/account";
import type { Plan } from "@/lib/domain/types";
import { useMember } from "@/lib/auth/use-session";
import { ProgressBar, Alert, EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeader, Panel, DetailRow } from "../panel";

/**
 * Drive wallet.
 *
 * Read-only at M2 by design: loading credit is a payment, and payments are
 * M5. The ledger, the balance and the low-balance rule are all real now, so
 * when the processor lands the only new thing is the charge itself.
 */
export function WalletSection({ plans }: { plans: Plan[] }) {
  const member = useMember();
  if (!member) return null;

  const remaining = creditsRemaining(member);
  const low = isLowBalance(member);
  const plan = plans.find((p) => p.id === member.activePlanId) ?? null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Drive Wallet"
        description="Credit you have loaded, and everything it has been spent on. Nothing auto-bills — topping up is always your call."
      />

      <Panel tone="gold">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">
              Balance
            </p>
            <p className="text-metal-soft mt-2 font-mono text-display-4 tabular-nums">
              {money(member.credits)}
            </p>
          </div>
          {member.creditsLoaded > 0 ? (
            <span
              className={cn(
                "rounded-full border px-3 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em]",
                low
                  ? "border-warning/30 bg-warning/10 text-warning"
                  : "border-success/30 bg-success/10 text-success",
              )}
            >
              {low ? "Low balance" : "Active"}
            </span>
          ) : null}
        </div>

        {member.creditsLoaded > 0 ? (
          <>
            <ProgressBar
              className="mt-5"
              label="Credit remaining"
              value={remaining}
              tone={low ? "warning" : "gold"}
            />
            <p className="mt-2 text-xs text-muted">
              {Math.round(remaining * 100)}% of {money(member.creditsLoaded)} loaded
            </p>
          </>
        ) : null}

        <dl className="mt-6">
          <DetailRow label="Plan">{plan ? plan.name : "No plan yet"}</DetailRow>
          <DetailRow label="Lifetime loaded">{money(member.creditsLoaded)}</DetailRow>
          <DetailRow label="Spent">
            {money(member.creditsLoaded - member.credits)}
          </DetailRow>
        </dl>

        {low ? (
          <Alert tone="warning" className="mt-5" title="Running low">
            You are at or below the 20% threshold, which is when we email you. Add credit
            in any amount — your tier and earn rate are already earned and will not change.
          </Alert>
        ) : null}

        <ButtonLink href="/subscriptions" className="mt-5 w-full">
          {member.creditsLoaded > 0 ? "Top up credit" : "See the plans"}
          <ArrowRight aria-hidden width={16} height={16} />
        </ButtonLink>

        <p className="mt-3 text-center text-xs text-muted-dim">
          Checkout and top-ups go live with payments at the final milestone.
        </p>
      </Panel>

      <Panel title="Activity">
        {member.wallet.length === 0 ? (
          <EmptyState
            title="No wallet activity"
            description="Loads, bonuses and spends appear here the moment a wallet is opened."
            action={
              <Link
                href="/subscriptions"
                className="text-sm text-gold transition-opacity hover:opacity-80"
              >
                Compare the plans
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {[...member.wallet].reverse().map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-4 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-cream/90">{entry.label}</p>
                  <p className="text-xs text-muted-dim">{shortDate(entry.createdAt)}</p>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "font-mono text-sm tabular-nums",
                      entry.amount >= 0 ? "text-success" : "text-cream",
                    )}
                  >
                    {entry.amount >= 0 ? "+" : "−"}
                    {money(Math.abs(entry.amount))}
                  </p>
                  <p className="font-mono text-xs tabular-nums text-muted-dim">
                    {money(entry.balanceAfter)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
