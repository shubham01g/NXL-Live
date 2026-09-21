import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { count } from "@/lib/domain/format";
import { PARTNER_TYPES } from "@/lib/data/fixtures/catalog";
import { Container, Section, SectionHeading, StatGrid } from "@/components/ui/layout";
import { Card } from "@/components/ui/primitives";
import { PageHero } from "@/components/site/hero";
import { PartnerForm } from "@/components/site/partner-form";

export const metadata: Metadata = {
  title: "Partnership Program",
  description:
    "Refer guests to NXL and earn up to 12% of every rental, paid Net-15. Built for boutique hotels, concierges, yacht charters and private aviation in Miami.",
  alternates: { canonical: "/partners" },
};

const STEPS = [
  {
    index: "01",
    title: "Apply in minutes",
    body: "Tell us about your business. We review every application by hand, usually within a day.",
  },
  {
    index: "02",
    title: "Get your referral code",
    body: "You receive a unique code and a trackable link to share with guests however you like.",
  },
  {
    index: "03",
    title: "Your guests book",
    body: "They get member-level pricing. Every booking under your code is attributed automatically.",
  },
  {
    index: "04",
    title: "You get paid",
    body: "Commission accrues as bookings complete and is paid out on a Net-15 schedule.",
  },
];

export default async function PartnersPage() {
  const stats = await repo.getStats();

  return (
    <>
      <PageHero
        eyebrow="Partnership program"
        title="Send us your guests. Earn on every rental."
        lede="We work with boutique hotels, resorts, concierges, yacht charters, private aviation and anyone whose clients live at the top. Free to join, and you earn every time they drive or stay with us."
      />

      <Section size="sm">
        <Container>
          <StatGrid
            stats={[
              { label: "Commission", value: "Up to 12%", hint: "per completed rental" },
              { label: "Active partners", value: count(stats.partnerCount) },
              { label: "Guests referred", value: count(stats.guestsReferred) },
              { label: "Payout terms", value: "Net-15" },
            ]}
          />
        </Container>
      </Section>

      <Section size="sm">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <SectionHeading eyebrow="How it works" title="Four steps to your first payout." />

              <ol className="mt-10 space-y-6">
                {STEPS.map((step) => (
                  <li key={step.index} className="flex gap-5">
                    <span className="mt-1 shrink-0 font-mono text-sm text-gold">
                      {step.index}
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-cream">
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-12">
                <h3 className="font-mono text-2xs uppercase text-gold">
                  Who partners with us
                </h3>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {PARTNER_TYPES.filter((t) => t !== "Other").map((type) => (
                    <li
                      key={type}
                      className="rounded-full border border-line bg-surface-1/60 px-3.5 py-1.5 text-sm text-cream/75"
                    >
                      {type}
                    </li>
                  ))}
                </ul>
              </div>

              <Card className="mt-12 border-gold/25 bg-gradient-to-br from-surface-2 to-ink p-7">
                <p className="font-mono text-2xs uppercase text-muted">Partner earnings</p>
                <p className="mt-2.5 font-display text-3xl font-semibold text-cream">
                  Up to 12% per rental
                </p>
                <p className="mt-1.5 text-sm text-muted">
                  No caps, no minimums, no exclusivity. Paid Net-15.
                </p>
              </Card>
            </div>

            <div className="lg:sticky lg:top-24 lg:self-start">
              <PartnerForm />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
