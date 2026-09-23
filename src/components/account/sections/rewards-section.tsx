"use client";

import { cn } from "@/lib/utils/cn";
import { count, money } from "@/lib/domain/format";
import { REDEMPTION, TIERS } from "@/lib/domain/loyalty";
import { standingFor } from "@/lib/domain/account";
import { useMember, updateMember } from "@/lib/auth/use-session";
import { ProgressBar, Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/controls";
import { SectionHeader, Panel, DetailRow } from "../panel";

/**
 * Level Rewards standing.
 *
 * The ladder is rendered from the real TIERS table, and the member's position
 * in it is computed from their points — so this page and the public loyalty
 * page can never quote different thresholds or earn rates.
 */
export function RewardsSection() {
  const member = useMember();
  if (!member) return null;

  const standing = standingFor(member);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Level Rewards"
        description="Free to join, and it earns on every rental — cars and estates both count."
      />

      <Panel tone="gold">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">
              Points balance
            </p>
            <p className="text-metal-soft mt-2 font-mono text-display-4 tabular-nums">
              {count(member.points)}
            </p>
            <p className="mt-1 text-sm text-muted">
              worth {money(standing.redeemable)} at checkout
            </p>
          </div>

          <span
            className="rounded-full border px-3 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.16em]"
            style={{ color: standing.tier.color, borderColor: `${standing.tier.color}55` }}
          >
            {standing.tier.name}
          </span>
        </div>

        <div className="mt-6">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-muted">
              Earning {Math.round(standing.tier.rate * 100)}% back
            </span>
            {standing.next ? (
              <span className="text-muted">
                {count(standing.pointsToNext)} pts to {standing.next.name}
              </span>
            ) : (
              <span className="text-gold">Top tier reached</span>
            )}
          </div>
          <ProgressBar
            className="mt-2"
            label={`Progress to ${standing.next?.name ?? "top tier"}`}
            value={standing.progress}
          />
        </div>

        <dl className="mt-6">
          <DetailRow label="Redemption rate">
            {REDEMPTION.pointsPerDollar} points per $1
          </DetailRow>
          <DetailRow label="Minimum redemption">
            {count(REDEMPTION.minimumPoints)} points
          </DetailRow>
          <DetailRow label="Points expire">
            {REDEMPTION.validMonths} months after they are earned
          </DetailRow>
        </dl>

        {standing.redeemable > 0 ? (
          <Alert tone="success" className="mt-5">
            You can take {money(standing.redeemable)} off your next rental. Points are
            applied at checkout, which goes live with payments at the final milestone.
          </Alert>
        ) : (
          <Alert tone="info" className="mt-5">
            Redemption starts at {count(REDEMPTION.minimumPoints)} points — that is{" "}
            {money(REDEMPTION.minimumPoints / REDEMPTION.pointsPerDollar)} off a rental.
          </Alert>
        )}
      </Panel>

      {/* -------------------------------- ladder ------------------------------- */}
      <Panel title="The four tiers" description="Your tier follows your points balance automatically.">
        <ul className="space-y-3">
          {TIERS.map((tier) => {
            const current = tier.name === standing.tier.name;
            const reached = member.points >= tier.min;

            return (
              <li
                key={tier.name}
                className={cn(
                  "rounded-lg p-4 transition-colors",
                  current ? "edge-gold" : "border border-line bg-ink/30",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span
                    className="font-display text-base font-semibold"
                    style={{ color: tier.color }}
                  >
                    {tier.name}
                  </span>

                  <span className="flex items-center gap-3">
                    <span className="text-metal-soft font-mono text-sm tabular-nums">
                      {Math.round(tier.rate * 100)}%
                    </span>
                    <span className="font-mono text-xs tabular-nums text-muted">
                      {count(tier.min)}+ pts
                    </span>
                  </span>
                </div>

                <p className="mt-1 text-sm text-muted">{tier.headline}</p>

                {current ? (
                  <p className="mt-2 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-gold">
                    Your tier
                  </p>
                ) : reached ? (
                  <p className="mt-2 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-success">
                    Passed
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* ------------------------------ enrolment ------------------------------ */}
      <Panel title="Enrolment">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-cream">
              {member.enrolled ? "You are enrolled" : "You are not enrolled"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {member.enrolled
                ? "Points accrue on every completed rental at your current tier rate."
                : "Opting in is free. Points start accruing from your next rental — past ones do not backfill."}
            </p>
          </div>
          <Toggle
            label="Level Rewards enrolment"
            checked={member.enrolled}
            onChange={(next) =>
              updateMember((current) => ({ ...current, enrolled: next }))
            }
          />
        </div>

        {!member.enrolled ? (
          <Button
            className="mt-5 w-full"
            onClick={() => updateMember((current) => ({ ...current, enrolled: true }))}
          >
            Join Level Rewards
          </Button>
        ) : null}
      </Panel>
    </div>
  );
}
