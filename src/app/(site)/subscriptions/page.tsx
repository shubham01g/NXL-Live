import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import { repo } from "@/lib/data";
import { money } from "@/lib/domain/format";
import { tierByName, TIERS } from "@/lib/domain/loyalty";
import { PRICING } from "@/lib/domain/pricing";
import { cn } from "@/lib/utils/cn";
import { ButtonLink } from "@/components/ui/button";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { Alert } from "@/components/ui/feedback";
import { Card, Eyebrow } from "@/components/ui/primitives";
import { Accordion } from "@/components/ui/disclosure";
import { PageHero } from "@/components/site/hero";
import { WalletJourney } from "@/components/site/wallet-journey";

export const metadata: Metadata = {
  title: "Drive Credit Wallet",
  description:
    "Buy drive credit once and spend it across the whole NXL fleet. Three wallet plans from $3,900, each activating a loyalty tier. No recurring billing, no contracts, no surge.",
  alternates: { canonical: "/subscriptions" },
};

const FAQS = [
  {
    question: "Is this a subscription?",
    answer:
      "No — and we are careful about the word. You buy credit once. There is no renewal date, no recurring charge and no contract. When the balance runs low you decide whether to top it up.",
  },
  {
    question: "Do credits expire?",
    answer:
      "No. Your balance stays on your account until you spend it. We alert you by email at 20% remaining so it never surprises you.",
  },
  {
    question: "Can I use credit on estates as well as cars?",
    answer:
      "Yes. One balance covers the entire fleet — supercars, estates, hourly bookings and monthly stays alike.",
  },
  {
    question: "What happens to my tier if the wallet runs out?",
    answer:
      "Nothing. The tier your plan activates is yours, and any points you have earned stay earned. A depleted wallet only means there is no credit left to spend.",
  },
  {
    question: "Are credits refundable?",
    answer:
      "Credit purchases and top-ups are non-refundable. That is what funds the bonus credit on every plan, and it is why we would rather you talk to the concierge before buying if you are unsure.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Yes. Upgrading carries your remaining balance across and adds the new plan's credit on top. Your tier moves up immediately.",
  },
  {
    question: "Does the deposit come out of my wallet?",
    answer: `It can. The refundable deposit (${money(PRICING.defaultDeposit)} on cars) may be held against your wallet or your card. On a clean return it goes back to wherever it came from.`,
  },
];

export default async function SubscriptionsPage() {
  const plans = await repo.listPlans();

  return (
    <>
      <PageHero
        eyebrow="Drive Credit Wallet"
        title="A rotating garage. A growing membership."
        lede="Buy credit once, spend it across the entire fleet, and activate a loyalty tier the moment it lands. One-time purchase — credits load instantly, and nothing auto-bills."
      />

      {/* --------------------------------- plans --------------------------------- */}
      <Section>
        <Container>
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => {
              const tier = tierByName(plan.grantsTier);
              const bonus = plan.credits - plan.price;

              return (
                <Card
                  key={plan.id}
                  as="article"
                  className={cn(
                    "relative flex flex-col p-8",
                    plan.featured && "edge-gold border-0 shadow-glow-gold-lg",
                  )}
                >
                  {plan.featured ? (
                    <span className="absolute -top-3 left-8 rounded-full bg-gold px-3 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-ink">
                      Most popular
                    </span>
                  ) : null}

                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display text-2xl font-semibold text-cream">
                      {plan.name}
                    </h2>
                    <span
                      className="rounded-full border px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em]"
                      style={{ color: tier.color, borderColor: `${tier.color}55` }}
                    >
                      {tier.name} tier
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-muted">{plan.tagline}</p>

                  <div className="mt-7">
                    <p className="font-mono text-display-4 tabular-nums text-cream">
                      {money(plan.price)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      one-time · loads{" "}
                      <span className="text-gold">{money(plan.credits)}</span> in credit
                    </p>
                    {bonus > 0 ? (
                      <p className="mt-1 text-xs text-success">
                        {money(bonus)} bonus credit included
                      </p>
                    ) : null}
                  </div>

                  <ul className="mt-7 flex-1 space-y-3 border-t border-line pt-6">
                    {plan.perks.map((perk) => (
                      <li key={perk} className="flex gap-2.5 text-sm text-cream/80">
                        <Check
                          aria-hidden
                          width={14}
                          height={14}
                          className="mt-0.5 shrink-0 text-gold"
                        />
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <ButtonLink
                    href="/contact"
                    variant={plan.featured ? "primary" : "outline"}
                    className="mt-8 w-full"
                  >
                    Load {money(plan.credits)} in credit
                  </ButtonLink>
                </Card>
              );
            })}
          </div>

          <Alert tone="warning" className="mt-8" title="Credits are non-refundable">
            Wallet purchases and top-ups cannot be refunded — that is what funds the bonus
            credit on every plan. If you are weighing it up, talk to the concierge first.
          </Alert>
        </Container>
      </Section>

      {/* ------------------------------- tier mapping ----------------------------- */}
      <Section size="sm">
        <Container>
          <SectionHeading
            eyebrow="Tier included"
            title="Every wallet activates a tier."
            description="The tier arrives with the plan — you do not have to earn your way to it first. Points then accrue on top at that tier's rate."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((tier) => {
              const plan = plans.find((p) => p.grantsTier === tier.name);
              return (
                <Card key={tier.name} className="p-6">
                  <p
                    className="font-display text-xl font-semibold"
                    style={{ color: tier.color }}
                  >
                    {tier.name}
                  </p>
                  <p className="mt-3 font-mono text-2xl tabular-nums text-cream">
                    {Math.round(tier.rate * 100)}%
                  </p>
                  <p className="text-xs text-muted">back in points</p>
                  <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
                    {plan ? (
                      <>
                        Included with{" "}
                        <span className="text-gold">{plan.name}</span>
                      </>
                    ) : (
                      <>Earned at {tier.min.toLocaleString()} points</>
                    )}
                  </p>
                </Card>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* ------------------------------ demo journey ------------------------------ */}
      <Section size="sm">
        <Container>
          <SectionHeading
            eyebrow="See it work"
            title="One wallet, seven steps."
            description="Step through a Collector wallet from purchase to redemption. Every figure is pulled from the live rate card."
          />
          <div className="mt-12">
            <WalletJourney />
          </div>
        </Container>
      </Section>

      {/* ------------------------------- how it works ----------------------------- */}
      <Section size="sm">
        <Container>
          <SectionHeading eyebrow="How it works" title="Four steps, then you drive." />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                index: "01",
                title: "Load credit",
                body: "Pick a plan and pay once. Credits and your tier land immediately.",
              },
              {
                index: "02",
                title: "Book anything",
                body: "The rental total deducts straight from your balance — cars or estates.",
              },
              {
                index: "03",
                title: "Earn on every booking",
                body: "Points accrue at your tier rate, on top of the credit you already bought.",
              },
              {
                index: "04",
                title: "Top up when you like",
                body: "We alert you at 20% remaining. Topping up is always your decision.",
              },
            ].map((step) => (
              <Card key={step.index} className="p-6">
                <span className="font-mono text-sm text-gold">{step.index}</span>
                <h3 className="mt-4 font-display text-lg font-semibold text-cream">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{step.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ------------------------------ deposits + FAQ ---------------------------- */}
      <Section size="sm">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <Eyebrow>Deposits</Eyebrow>
              <h2 className="mt-5 font-display text-2xl font-semibold text-cream">
                How the deposit works with a wallet
              </h2>
              <dl className="mt-6 divide-y divide-line">
                {[
                  {
                    q: "Is a deposit still required?",
                    a: `Yes — ${money(PRICING.defaultDeposit)} on cars, held at pickup. A wallet does not remove it.`,
                  },
                  {
                    q: "Can it come from my wallet?",
                    a: "Yes. You can hold the deposit against your wallet balance instead of a card.",
                  },
                  {
                    q: "What happens on a clean return?",
                    a: "The full amount goes back to wherever it came from — card or wallet — after inspection.",
                  },
                  {
                    q: "And if there is damage?",
                    a: "We assess it, deduct the amount from the deposit, and return the balance with a written breakdown.",
                  },
                ].map((row) => (
                  <div key={row.q} className="py-4">
                    <dt className="text-sm font-medium text-cream">{row.q}</dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-muted">{row.a}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <Eyebrow>Questions</Eyebrow>
              <h2 className="mt-5 font-display text-2xl font-semibold text-cream">
                The credit wallet, answered
              </h2>
              <Accordion className="mt-6" items={FAQS} />
            </div>
          </div>
        </Container>
      </Section>

      <Section size="lg">
        <Container className="text-center">
          <h2 className="mx-auto max-w-3xl font-display text-display-3 text-balance text-cream">
            Load your wallet. Drive anything. Earn everything.
          </h2>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <ButtonLink href="/cars" size="lg">
              Browse the fleet
              <ArrowRight aria-hidden width={16} height={16} />
            </ButtonLink>
            <ButtonLink href="/contact" variant="outline" size="lg">
              Talk to the concierge
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
