"use client";

import Link from "next/link";
import { ArrowRight, Car, Home } from "lucide-react";
import { count, money, shortDate } from "@/lib/domain/format";
import { REDEMPTION } from "@/lib/domain/loyalty";
import { creditsRemaining, standingFor } from "@/lib/domain/account";
import { useMember } from "@/lib/auth/use-session";
import { ProgressBar, EmptyState } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeader, Panel } from "../panel";
import { useMemberBookings } from "@/lib/data/member-bookings";
import { BookingCard } from "./bookings-section";

export function OverviewSection() {
  const member = useMember();
  if (!member) return null;

  return <Overview member={member} />;
}

function Overview({ member }: { member: NonNullable<ReturnType<typeof useMember>> }) {
  const bookings = useMemberBookings(member);
  const next = bookings.find((b) => ["pending", "confirmed", "checked_out", "active"].includes(b.status));
  const standing = standingFor(member);
  const remaining = creditsRemaining(member);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Overview"
        description="Where your points stand, what is left in the wallet, and everything you have driven."
      />

      {next ? (
        <Panel
          title={next.status === "checked_out" || next.status === "active" ? "On your trip now" : "Your next trip"}
          action={
            <Link href="/account/bookings" className="text-sm text-gold hover:opacity-80">
              All bookings
            </Link>
          }
        >
          <BookingCard r={next} />
        </Panel>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        {/* ------------------------------- standing ------------------------------ */}
        <Panel tone="gold" title="Level Rewards">
          {member.enrolled ? (
            <>
              <p className="text-metal-soft font-mono text-3xl tabular-nums">
                {count(member.points)}
              </p>
              <p className="mt-1 text-xs text-muted">
                worth {money(standing.redeemable)} at checkout ·{" "}
                {REDEMPTION.pointsPerDollar} pts per $1
              </p>

              <div className="mt-5">
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span style={{ color: standing.tier.color }}>{standing.tier.name}</span>
                  {standing.next ? (
                    <span className="text-muted">
                      {count(standing.pointsToNext)} pts to {standing.next.name}
                    </span>
                  ) : (
                    <span className="text-muted">Top tier</span>
                  )}
                </div>
                <ProgressBar
                  className="mt-2"
                  label={`Progress to ${standing.next?.name ?? "top tier"}`}
                  value={standing.progress}
                />
              </div>

              <p className="mt-4 text-sm text-muted">
                Earning {Math.round(standing.tier.rate * 100)}% back on every rental.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                You are not enrolled in Level Rewards. It is free, and it earns from your
                next rental.
              </p>
              <ButtonLink href="/account/rewards" variant="outline" size="sm" className="mt-4">
                Join Level Rewards
              </ButtonLink>
            </>
          )}
        </Panel>

        {/* -------------------------------- wallet ------------------------------- */}
        <Panel title="Drive wallet">
          <p className="text-metal-soft font-mono text-3xl tabular-nums">
            {money(member.credits)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {member.creditsLoaded > 0
              ? `of ${money(member.creditsLoaded)} loaded`
              : "no wallet yet"}
          </p>

          {member.creditsLoaded > 0 ? (
            <ProgressBar
              className="mt-5"
              label="Credit remaining"
              value={remaining}
              tone={remaining <= 0.2 ? "warning" : "gold"}
            />
          ) : null}

          <p className="mt-4 text-sm leading-relaxed text-muted">
            {member.creditsLoaded > 0
              ? "Credit is drawn down automatically at checkout. Nothing auto-bills."
              : "Load credit once and spend it across the entire fleet."}
          </p>

          <Link
            href="/account/wallet"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gold transition-opacity hover:opacity-80"
          >
            {member.creditsLoaded > 0 ? "Wallet activity" : "See the plans"}
            <ArrowRight aria-hidden width={14} height={14} />
          </Link>
        </Panel>
      </div>

      {/* ------------------------------- rentals -------------------------------- */}
      <Panel
        title="Recent rentals"
        description={
          member.lifetimeRentals > member.rentals.length
            ? `Showing the ${member.rentals.length} most recent of ${count(member.lifetimeRentals)}.`
            : undefined
        }
      >
        {member.rentals.length === 0 ? (
          <EmptyState
            title="Nothing booked yet"
            description="Your rentals appear here with receipts, points earned and deposit status."
            action={
              <ButtonLink href="/cars" size="sm">
                Browse the fleet
                <ArrowRight aria-hidden width={14} height={14} />
              </ButtonLink>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {member.rentals.map((rental) => {
              const Icon = rental.listingKind === "car" ? Car : Home;
              const href = `/account/bookings/${rental.id}`;
              return (
                <li key={rental.id} className="flex flex-wrap items-center gap-4 py-4">
                  <Icon
                    aria-hidden
                    width={18}
                    height={18}
                    className="shrink-0 text-gold"
                  />

                  <div className="min-w-0 flex-1">
                    <Link
                      href={href}
                      className="gold-underline text-sm font-medium text-cream"
                    >
                      {rental.listingName}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-dim">
                      {rental.reference} · {shortDate(rental.window.start)} ·{" "}
                      {rental.qty} {rental.unit}
                      {rental.qty === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm tabular-nums text-cream">
                      {money(rental.total)}
                    </p>
                    <p className="text-xs text-success">
                      +{count(rental.pointsEarned)} pts
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
