import type { Metadata } from "next";
import { repo } from "@/lib/data";
import { money } from "@/lib/domain/format";
import { PageHero } from "@/components/site/hero";
import { ListingBrowser } from "@/components/site/listing-browser";

export const metadata: Metadata = {
  title: "Luxury Homes",
  description:
    "Private estates in Miami Beach — oceanfront villas, Ocean Drive penthouses and bayfront moderns, available by the day, week or month with garages built for a collection.",
  alternates: { canonical: "/homes" },
};

export default async function HomesPage() {
  const homes = await repo.listHomes();
  const available = homes.filter((h) => h.status === "available").length;
  const entryRate = Math.min(...homes.map((h) => h.rates.day ?? Infinity));

  return (
    <>
      <PageHero
        eyebrow="Private estates"
        title={<span className="text-metal block">Luxury Homes</span>}
        lede={`Book by the day, week or month. Oceanfront villas and Ocean Drive penthouses with room for every key — from ${money(entryRate)} a night. Bring the fleet home.`}
        aside={
          <p className="flex items-center gap-2.5 text-sm text-muted lg:justify-end">
            <span aria-hidden className="h-2 w-2 animate-live rounded-full bg-success" />
            {available} available now · {homes.length} estates
          </p>
        }
        className="pb-10"
      />
      <ListingBrowser listings={homes} />
    </>
  );
}
