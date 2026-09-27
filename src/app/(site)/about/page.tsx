import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { repo } from "@/lib/data";
import { count, ratingText } from "@/lib/domain/format";
import { ButtonLink } from "@/components/ui/button";
import { Container, Section, SectionHeading, StatGrid } from "@/components/ui/layout";
import { Card, Eyebrow } from "@/components/ui/primitives";
import { Media } from "@/components/ui/media";
import { PageHero } from "@/components/site/hero";

export const metadata: Metadata = {
  title: "About",
  description:
    "NXL is the modern marketplace for exotic cars and private estates in South Beach, Miami — hourly bookings, concierge delivery, and one flat rate card.",
  alternates: { canonical: "/about" },
};

const OFFERS = [
  {
    href: "/cars",
    title: "Exotic Cars",
    body: "Rolls-Royce, Bentley, Range Rover and Cadillac by the hour, day, week or month.",
  },
  {
    href: "/homes",
    title: "Luxury Homes",
    body: "Oceanfront villas and penthouses by the day, week or month.",
  },
  {
    href: "/subscriptions",
    title: "Drive Credit Wallet",
    body: "Buy credit once and spend it across the whole fleet.",
  },
  {
    href: "/loyalty",
    title: "Level Rewards",
    body: "Earn 5–18% back in points on every booking, free to join.",
  },
  {
    href: "/partners",
    title: "Partnership Program",
    body: "Refer guests and earn up to 12% of every rental, Net-15.",
  },
  {
    href: "/contact",
    title: "Concierge",
    body: "A real team on the phone, seven days a week.",
  },
];

export default async function AboutPage() {
  const stats = await repo.getStats();

  return (
    <>
      <PageHero
        eyebrow="About NXL"
        title={
          <>
            The modern marketplace for
            <span className="text-metal block">exotic cars and private estates.</span>
          </>
        }
        lede="We built NXL because renting something extraordinary should not feel like a negotiation. Transparent rates, hourly windows, certified inventory, and a concierge who picks up the phone."
      />

      <Section size="sm">
        <Container>
          <Media
            src={null}
            alt="The NXL fleet at the South Beach depot"
            aspect="21/9"
            label="Fleet lineup · South Beach depot"
            sizes="100vw"
          />

          <StatGrid
            className="mt-8"
            stats={[
              { label: "Cars in fleet", value: stats.carCount },
              { label: "Private estates", value: stats.homeCount },
              { label: "Members", value: count(stats.memberCount) },
              { label: "Average rating", value: `${ratingText(stats.averageRating)}★` },
            ]}
          />
        </Container>
      </Section>

      <Section size="sm">
        <Container>
          <SectionHeading
            eyebrow="What we offer"
            title="Everything under one account."
            description="One profile covers the fleet, the estates, your wallet, your points and your partnership."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {OFFERS.map((offer) => (
              <Card
                key={offer.href}
                as="article"
                className="group relative p-6 transition-all duration-300 ease-editorial hover:border-gold/40 hover:bg-surface-2/60"
              >
                <h3 className="font-display text-xl font-semibold text-cream">
                  <Link href={offer.href} className="after:absolute after:inset-0">
                    {offer.title}
                  </Link>
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{offer.body}</p>
                <span
                  aria-hidden
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-gold opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Explore
                  <ArrowRight width={14} height={14} />
                </span>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section size="sm">
        <Container>
          <div className="overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-surface-2 via-surface-1 to-ink p-8 md:p-14">
            <div className="max-w-2xl">
              <Eyebrow>Partnership program</Eyebrow>
              <h2 className="mt-5 font-display text-display-3 text-balance text-cream">
                Refer your guests. Earn on every rental.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-cream/75">
                {count(stats.partnerCount)} hotels, concierges and charter companies
                already send us guests. It is free to join and pays up to 12% per booking.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <ButtonLink href="/partners" size="lg">
                  Become a partner
                  <ArrowRight aria-hidden width={16} height={16} />
                </ButtonLink>
                <ButtonLink href="/who-we-are" variant="outline" size="lg">
                  Who we are
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
