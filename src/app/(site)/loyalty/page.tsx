import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import { REDEMPTION, TIERS } from "@/lib/domain/loyalty";
import { money } from "@/lib/domain/format";
import { ButtonLink } from "@/components/ui/button";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { Card, Eyebrow } from "@/components/ui/primitives";
import { Accordion } from "@/components/ui/disclosure";
import { PageHero } from "@/components/site/hero";

export const metadata: Metadata = {
  title: "Level Rewards",
  description:
    "Level Rewards is free to join. Earn 5–18% back in points on every NXL rental, climb four tiers, and redeem at 100 points per dollar.",
  alternates: { canonical: "/loyalty" },
};

const HOW_IT_WORKS = [
  {
    index: "01",
    title: "Join for free",
    body: "Create an account and opt in. There is no fee and no minimum spend to enrol.",
  },
  {
    index: "02",
    title: "Rent and earn",
    body: "Every completed booking earns points at your current tier rate — cars and estates both count.",
  },
  {
    index: "03",
    title: "Climb the tiers",
    body: "Points carry you through four tiers. Each one raises your earn rate and unlocks new perks.",
  },
  {
    index: "04",
    title: "Redeem",
    body: `Spend points against any rental total at ${REDEMPTION.pointsPerDollar} points per dollar.`,
  },
];

const FAQS = [
  {
    question: "Do my points expire?",
    answer: `Points stay valid for ${REDEMPTION.validMonths} months from the date they are earned. Any booking activity keeps your account current.`,
  },
  {
    question: "Do concierge and phone bookings earn points?",
    answer:
      "Yes. Any booking made under your member account earns at your tier rate, whether you book online or our concierge books it for you.",
  },
  {
    question: "How do I redeem?",
    answer: `Apply points at checkout. The rate is ${REDEMPTION.pointsPerDollar} points per $1, with a ${REDEMPTION.minimumPoints}-point minimum — so the smallest redemption is ${money(REDEMPTION.minimumPoints / REDEMPTION.pointsPerDollar)}.`,
  },
  {
    question: "Does the security deposit earn points?",
    answer:
      "No. Points are earned on the rental total and its fees. The refundable deposit is not a charge, so it does not accrue.",
  },
  {
    question: "What happens if I cancel?",
    answer:
      "Points earned on a cancelled booking are reversed from your balance, and any points you redeemed against it are returned.",
  },
  {
    question: "Can I transfer points to someone else?",
    answer:
      "Points are tied to your member account and cannot be transferred or sold. You can of course book on someone else's behalf.",
  },
];

export default function LoyaltyPage() {
  return (
    <>
      <PageHero
        eyebrow="Level Rewards"
        title={
          <>
            Simple loyalty.
            <span className="text-metal block">Real rewards.</span>
          </>
        }
        lede="Free to join, and it starts paying from your first rental. Four tiers, a rising earn rate, and points you can actually spend — not a points balance you can only look at."
        actions={
          <>
            <ButtonLink href="/cars" size="lg">
              Browse the fleet
              <ArrowRight aria-hidden width={16} height={16} />
            </ButtonLink>
            <ButtonLink href="/subscriptions" variant="outline" size="lg">
              See credit wallet plans
            </ButtonLink>
          </>
        }
      />

      {/* ------------------------------ how it works ------------------------------ */}
      <Section>
        <Container>
          <SectionHeading eyebrow="How it works" title="Four steps, no small print." />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step) => (
              <Card key={step.index} className="p-6">
                <span className="text-metal-soft font-mono text-sm">{step.index}</span>
                <h3 className="mt-4 font-display text-lg font-semibold text-cream">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{step.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* --------------------------------- tiers --------------------------------- */}
      <Section size="sm">
        <Container>
          <SectionHeading
            eyebrow="The tiers"
            title="Every tier raises what you earn."
            description="Your tier is set by your lifetime points balance and applies automatically to every booking."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((tier, i) => (
              <Card
                key={tier.name}
                className="flex flex-col p-6"
                // Platinum gets the emphasis treatment.
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="font-display text-xl font-semibold"
                    style={{ color: tier.color }}
                  >
                    {tier.name}
                  </span>
                  {i === TIERS.length - 1 ? (
                    <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-gold">
                      Top tier
                    </span>
                  ) : null}
                </div>

                <p className="text-metal-soft mt-4 font-mono text-3xl tabular-nums">
                  {Math.round(tier.rate * 100)}%
                </p>
                <p className="text-xs text-muted">back in points</p>

                <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
                  {tier.min.toLocaleString()}+ points
                </p>

                <ul className="mt-4 space-y-2.5">
                  {tier.perks.map((perk) => (
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
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* ------------------------------ earn & redeem ----------------------------- */}
      <Section size="sm">
        <Container>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-8">
              <Eyebrow>Earning</Eyebrow>
              <h2 className="mt-5 font-display text-2xl font-semibold text-cream">
                What each tier earns
              </h2>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">Points earned per rental by tier</caption>
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th scope="col" className="pb-3 font-mono text-2xs uppercase text-muted">
                        Tier
                      </th>
                      <th scope="col" className="pb-3 font-mono text-2xs uppercase text-muted">
                        Rate
                      </th>
                      <th scope="col" className="pb-3 text-right font-mono text-2xs uppercase text-muted">
                        {money(1000)} rental
                      </th>
                      <th scope="col" className="pb-3 text-right font-mono text-2xs uppercase text-muted">
                        {money(5000)} rental
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {TIERS.map((tier) => (
                      <tr key={tier.name}>
                        <th
                          scope="row"
                          className="py-3 text-left font-medium"
                          style={{ color: tier.color }}
                        >
                          {tier.name}
                        </th>
                        <td className="py-3 text-muted">
                          {Math.round(tier.rate * 100)}%
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums text-cream">
                          {Math.round(1000 * tier.rate).toLocaleString()} pts
                        </td>
                        <td className="py-3 text-right font-mono tabular-nums text-cream">
                          {Math.round(5000 * tier.rate).toLocaleString()} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-8">
              <Eyebrow>Redeeming</Eyebrow>
              <h2 className="mt-5 font-display text-2xl font-semibold text-cream">
                Points you can actually spend
              </h2>

              <dl className="mt-6 divide-y divide-line">
                {[
                  {
                    k: "Redemption rate",
                    v: `${REDEMPTION.pointsPerDollar} points = ${money(1)}`,
                  },
                  {
                    k: "Minimum redemption",
                    v: `${REDEMPTION.minimumPoints} points (${money(REDEMPTION.minimumPoints / REDEMPTION.pointsPerDollar)})`,
                  },
                  { k: "Maximum per booking", v: "Unlimited" },
                  { k: "Applies to", v: "Rental total and fees" },
                  { k: "Points validity", v: `${REDEMPTION.validMonths} months` },
                  { k: "Stacks with", v: "Tier perks and promo codes" },
                ].map((row) => (
                  <div key={row.k} className="flex justify-between gap-4 py-3.5 text-sm">
                    <dt className="text-muted">{row.k}</dt>
                    <dd className="text-right font-medium text-cream">{row.v}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-6 rounded-md border border-line bg-ink/40 p-4 text-sm leading-relaxed text-muted">
                Worked example: a Gold member books a {money(2500)} weekend. That earns{" "}
                <span className="text-gold">
                  {Math.round(2500 * 0.12).toLocaleString()} points
                </span>{" "}
                — worth {money(Math.round(2500 * 0.12) / REDEMPTION.pointsPerDollar)} off
                the next one.
              </p>
            </Card>
          </div>
        </Container>
      </Section>

      {/* ---------------------------------- FAQ ---------------------------------- */}
      <Section size="sm">
        <Container>
          <SectionHeading eyebrow="Questions" title="Level Rewards, answered." />
          <Accordion className="mt-10" items={FAQS} />
        </Container>
      </Section>

      <Section size="lg">
        <Container className="text-center">
          <h2 className="mx-auto max-w-2xl font-display text-display-3 text-balance text-cream">
            Your first rental earns from day one.
          </h2>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <ButtonLink href="/cars" size="lg">
              Browse the fleet
              <ArrowRight aria-hidden width={16} height={16} />
            </ButtonLink>
            <ButtonLink href="/contact" variant="outline" size="lg">
              Talk to the team
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
