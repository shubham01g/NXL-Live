import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { repo } from "@/lib/data";
import { ratingText } from "@/lib/domain/format";
import { ButtonLink } from "@/components/ui/button";
import { Container, Section, SectionHeading, StatGrid } from "@/components/ui/layout";
import { Card, Eyebrow } from "@/components/ui/primitives";
import { Media } from "@/components/ui/media";

export const metadata: Metadata = {
  title: "Who We Are",
  description:
    "NXL rents the cars we grew up dreaming about. Certified inventory, fixed pricing and flexible windows, run out of South Beach, Miami.",
  alternates: { canonical: "/who-we-are" },
};

const VALUES = [
  {
    title: "Certified, not compromised",
    body: "Every car is inspected before and after every single rental — tyres, fluids, lights, panels, interior. The word certified is in our name because it is the part we refuse to cut.",
  },
  {
    title: "Transparent, fixed pricing",
    body: "No surge multipliers, no demand pricing, no fee that appears at the last step. The rate on the listing is the rate you pay, and every extra is itemised before you commit.",
  },
  {
    title: "Flexible by design",
    body: "An hour, a day, a week, a season. Most of this industry forces a 24-hour minimum on you. We think you should pay for exactly as long as you want the keys.",
  },
];

export default async function WhoWeArePage() {
  const stats = await repo.getStats();

  return (
    <>
      <Section className="pt-28 sm:pt-32">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
            <div>
              <Eyebrow>Who we are</Eyebrow>
              <h1 className="mt-6 font-display text-display-2 text-balance text-cream max-sm:text-[2.75rem]">
                We rent the cars
                <span className="text-metal block">we grew up dreaming about.</span>
              </h1>
              <div className="mt-7 space-y-5 text-lg leading-relaxed text-muted">
                <p>
                  NXL started with a simple frustration: getting behind the wheel of
                  something extraordinary in Miami meant a full-day minimum, a deposit
                  nobody would explain, and a price that moved depending on who was asking.
                </p>
                <p>
                  So we built the opposite. A certified fleet you can book by the hour, a
                  rate card that does not move, and a concierge who brings the car to you
                  and walks you through it before handing over the keys.
                </p>
                <p>
                  Today that runs out of South Beach — {stats.carCount} cars,{" "}
                  {stats.homeCount} private estates, and a membership that earns on every
                  booking.
                </p>
              </div>
              <div className="mt-9 flex flex-wrap gap-4">
                <ButtonLink href="/cars" size="lg">
                  See the fleet
                  <ArrowRight aria-hidden width={16} height={16} />
                </ButtonLink>
                <ButtonLink href="/partners" variant="outline" size="lg">
                  Partner with us
                </ButtonLink>
              </div>
            </div>

            <Media
              src="/fleet/range-rover-autobiography/05.webp"
              alt="Range Rover Autobiography with its doors open, ready for handover"
              aspect="4/5"
              label="Concierge handover"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          </div>
        </Container>
      </Section>

      <Section size="sm">
        <Container>
          <StatGrid
            stats={[
              {
                label: "Cars & estates",
                value: stats.carCount + stats.homeCount,
                hint: "all certified",
              },
              { label: "Based in", value: "South Beach", hint: "Miami, FL" },
              {
                label: "Average rating",
                value: `${ratingText(stats.averageRating)}★`,
                hint: "across the fleet",
              },
              { label: "Concierge", value: "24 / 7", hint: "a real team" },
            ]}
          />
        </Container>
      </Section>

      <Section size="sm">
        <Container>
          <SectionHeading eyebrow="What we stand for" title="Three things we will not trade." />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {VALUES.map((value, i) => (
              <Card key={value.title} className="p-7">
                <span className="text-metal-soft font-mono text-sm">0{i + 1}</span>
                <h2 className="mt-4 font-display text-xl font-semibold text-cream">
                  {value.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">{value.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
