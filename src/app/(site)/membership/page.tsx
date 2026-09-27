import type { Metadata } from "next";
import { Check, Star } from "lucide-react";
import { repo } from "@/lib/data";
import { count } from "@/lib/domain/format";
import { DEMO_EMAIL } from "@/lib/data/fixtures/member";
import { Container, Section } from "@/components/ui/layout";
import { Eyebrow } from "@/components/ui/primitives";
import { AuthPanel } from "@/components/account/auth-panel";

export const metadata: Metadata = {
  title: "Join NXL",
  description:
    "One account for the entire NXL fleet. Free to join — book any car or estate by the hour, day or month, with no subscription required.",
  alternates: { canonical: "/membership" },
};

const FREE = [
  "Book by the hour, day, or month",
  "Manage your rentals in one place",
  "Earn Level Rewards on every trip",
  "Save payment card & insurance",
];

const UPGRADE = [
  "Drive credits loaded to your wallet",
  "Elevated loyalty tier (Gold or Platinum)",
  "Higher earn rate on every rental",
  "Priority booking & concierge access",
];

export default async function MembershipPage({ searchParams }: PageProps<"/membership">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const initialMode = params.mode === "signup" ? "signup" : "signin";
  const stats = await repo.getStats();

  return (
    <Section className="pt-28 sm:pt-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-16">
          {/* ------------------------------ the pitch ------------------------------ */}
          <div>
            <Eyebrow>Create your account</Eyebrow>

            <h1 className="mt-6 font-display text-display-2 text-balance text-cream max-sm:text-[2.75rem]">
              One account.
              <span className="text-metal block">The entire NXL fleet.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Free to join. Book any car or estate by the{" "}
              <strong className="font-semibold text-cream">hour, day, or month</strong> —
              no subscription required. Upgrade to a drive credit plan anytime for
              elevated tier benefits and a loaded credit wallet.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-surface-1/60 p-6">
                <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">
                  Free account · <span className="text-success">Included</span>
                </p>
                <ul className="mt-5 space-y-3">
                  {FREE.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-cream/85">
                      <Check
                        aria-hidden
                        width={15}
                        height={15}
                        className="mt-0.5 shrink-0 text-success"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="edge-gold rounded-lg p-6">
                <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">
                  Subscription upgrade · <span className="text-gold">Optional</span>
                </p>
                <ul className="mt-5 space-y-3">
                  {UPGRADE.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-cream/85">
                      <Star
                        aria-hidden
                        width={15}
                        height={15}
                        className="mt-0.5 shrink-0 fill-gold text-gold"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs text-muted-dim">
                  Add from your account dashboard after joining.
                </p>
              </div>
            </div>

            <p className="mt-8 inline-flex items-center gap-3 rounded-full border border-line bg-surface-1/60 px-4 py-2 text-sm text-muted">
              <span aria-hidden className="h-1.5 w-1.5 animate-live rounded-full bg-success" />
              <span className="text-metal-soft font-mono tabular-nums">
                {count(stats.memberCount)}
              </span>
              members driving with NXL
            </p>
          </div>

          {/* ------------------------------ the panel ------------------------------ */}
          <div className="lg:sticky lg:top-24">
            <AuthPanel demoEmail={DEMO_EMAIL} next={next} initialMode={initialMode} />
          </div>
        </div>
      </Container>
    </Section>
  );
}
