"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { count, money } from "@/lib/domain/format";
import { tierFor } from "@/lib/domain/loyalty";
import type { MemberAccount, Plan } from "@/lib/domain/types";
import { Eyebrow } from "@/components/ui/primitives";
import { signOut } from "@/lib/auth/use-session";
import { Avatar } from "./avatar";

/**
 * The profile header.
 *
 * Every figure is derived: the tier comes from the points balance, the plan
 * badge from `activePlanId` against the real plan list. Nothing here is a
 * stored duplicate that could fall out of step with the wallet or the ledger.
 */
export function ProfileCard({
  member,
  plans,
}: {
  member: MemberAccount;
  plans: Plan[];
}) {
  const router = useRouter();
  const tier = tierFor(member.points);
  const plan = plans.find((p) => p.id === member.activePlanId) ?? null;

  const stats: { label: string; value: string; color?: string }[] = [
    { label: "Points", value: count(member.points) },
    { label: "Rentals", value: count(member.lifetimeRentals) },
    { label: "Drive credits", value: money(member.credits) },
    // The tier carries its own colour. Struck in metal it would read gold
    // whatever the tier actually is, contradicting the badge above it.
    { label: "Tier", value: tier.name, color: tier.color },
  ];

  return (
    <section className="edge-gold overflow-hidden rounded-xl">
      <div className="relative flex flex-wrap items-start justify-between gap-6 p-6 sm:p-8">
        {/* Soft key light behind the name, echoing the hero backdrop. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_120%_at_88%_0%,rgba(233,191,69,0.12),transparent_62%)]"
        />

        <div className="flex min-w-0 items-center gap-5">
          <Avatar name={member.name} photo={member.photo} size="lg" />

          <div className="min-w-0">
            <Eyebrow>Subscriber profile</Eyebrow>
            <h1 className="mt-3 font-display text-display-4 text-cream">{member.name}</h1>
            <p className="mt-1 truncate text-sm text-muted">{member.email}</p>

            <ul className="mt-3 flex flex-wrap gap-2">
              <li>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em]"
                  style={{ color: tier.color, borderColor: `${tier.color}55` }}
                >
                  {tier.name} member
                </span>
              </li>
              {plan ? (
                <li>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-gold">
                    {plan.name} active
                  </span>
                </li>
              ) : null}
              {member.enrolled ? (
                <li>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-success">
                    Level Rewards
                  </span>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            href="/account/security"
            className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-cream/85 transition-colors hover:border-gold/50 hover:text-gold"
          >
            <Settings aria-hidden width={14} height={14} />
            Settings
          </Link>
          <button
            type="button"
            onClick={() => {
              signOut();
              router.push("/membership");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-cream/85 transition-colors hover:border-danger/50 hover:text-danger"
          >
            <LogOut aria-hidden width={14} height={14} />
            Sign out
          </button>
        </div>
      </div>

      <dl className="hairline-grid grid grid-cols-2 border-t border-line lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-ink/70 px-5 py-5 text-center">
            <dd
              className={cn(
                "font-mono text-2xl tabular-nums",
                stat.color ? undefined : "text-metal-soft",
              )}
              style={stat.color ? { color: stat.color } : undefined}
            >
              {stat.value}
            </dd>
            <dt className="mt-1 font-mono text-[0.5625rem] uppercase tracking-[0.2em] text-muted">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
