import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { money } from "@/lib/domain/format";
import { PageHero } from "@/components/site/hero";
import { ListingBrowser } from "@/components/site/listing-browser";
import { ReelStrip } from "@/components/site/reel-strip";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { CAR_REELS } from "@/lib/data/films";

export const metadata: Metadata = {
  title: "Exotic Cars",
  description:
    "Browse the NXL fleet — Rolls-Royce Cullinan and Wraith, Lamborghini Urus, McLaren GT, Mercedes-Maybach, Corvette C8 and more, available by the hour or the day with concierge delivery across South Beach, Miami.",
  alternates: { canonical: "/cars" },
};

export default async function CarsPage() {
  const cars = await repo.listCars();
  const available = cars.filter((c) => c.status === "available").length;
  const entryRate = Math.min(...cars.map((c) => c.rates.hour ?? Infinity));

  return (
    <>
      <PageHero
        eyebrow="The fleet"
        title={<span className="text-metal block">Exotic Cars</span>}
        lede={`Book by the hour — your dream car, no full-day commitment. Daily rates when you want more road, and weekly rates on select cars. Rates start at ${money(entryRate)} an hour, and the price you see is the price you pay.`}
        aside={
          <p className="flex items-center gap-2.5 text-sm text-muted lg:justify-end">
            <span aria-hidden className="h-2 w-2 animate-live rounded-full bg-success" />
            {available} available now · {cars.length} in fleet
          </p>
        }
        className="pb-10"
      />
      <ListingBrowser listings={cars} />
      <Section size="sm">
        <Container>
          <SectionHeading eyebrow="Reels" title="See them move." description="The team's own walk-arounds of the fleet. Tap a reel to open the car." />
          <ReelStrip reels={CAR_REELS} className="mt-8" />
        </Container>
      </Section>
    </>
  );
}
