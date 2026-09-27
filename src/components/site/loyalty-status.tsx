"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { count, money, shortDate } from "@/lib/domain/format";
import { standingFor } from "@/lib/domain/account";
import { useMember } from "@/lib/auth/use-session";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/feedback";
import { Container } from "@/components/ui/layout";

/**
 * The Loyalty page, personalised. The prototype linked "My rewards &
 * history" here and showed a static page; a signed-in member now sees their
 * own standing and recent earnings above the programme explainer.
 */
export function LoyaltyStatus() {
  const member = useMember();
  if (!member) return null;
  const s = standingFor(member);
  const recent = member.rentals.filter((r) => r.pointsEarned > 0).slice(0, 4);

  return (
    <Container className="-mt-4 mb-8">
      <div className="edge-gold grid gap-8 rounded-xl p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">Your standing</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-metal-soft font-mono text-display-4 tabular-nums">{count(member.points)}</span>
            <span className="text-sm text-muted">points · worth {money(s.redeemable)} at checkout</span>
          </div>
          <div className="mt-5 flex justify-between text-xs">
            <span style={{ color: s.tier.color }}>{s.tier.name} · {Math.round(s.tier.rate * 100)}% back</span>
            <span className="text-muted">{s.next ? `${count(s.pointsToNext)} pts to ${s.next.name}` : "Top tier"}</span>
          </div>
          <ProgressBar className="mt-2" value={s.progress} label="Tier progress" />
          {!member.enrolled ? (
            <p className="mt-4 text-sm text-warning">You aren&apos;t enrolled yet — join free from your rewards page to start earning.</p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/account/rewards" size="sm">
              My rewards <ArrowRight aria-hidden width={14} height={14} />
            </ButtonLink>
            <ButtonLink href="/account/bookings" size="sm" variant="outline">
              Booking history
            </ButtonLink>
          </div>
        </div>
        <div>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">Recent earnings</p>
          {recent.length ? (
            <ul className="mt-3 divide-y divide-line">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <Link href={`/account/bookings/${r.id}`} className="min-w-0 truncate text-cream/85 hover:text-gold">
                    {r.listingName}
                    <span className="ml-2 text-xs text-muted-dim">{shortDate(r.window.start)}</span>
                  </Link>
                  <span className="shrink-0 font-mono text-success">+{count(r.pointsEarned)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">Points from your rentals will appear here.</p>
          )}
        </div>
      </div>
    </Container>
  );
}
