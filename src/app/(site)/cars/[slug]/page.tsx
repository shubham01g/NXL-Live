import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { SITE } from "@/lib/domain/site";
import { isCar } from "@/lib/domain/types";
import { ListingDetail } from "@/components/site/listing-detail";
import { JsonLd } from "@/components/site/json-ld";

export async function generateStaticParams() {
  const cars = await repo.listCars();
  return cars.map((car) => ({ slug: car.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/cars/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const listing = await repo.getListing("car", slug);
  if (!listing) return {};

  return {
    title: listing.name,
    description: `Rent the ${listing.name} in ${SITE.serviceArea}. ${listing.description.slice(0, 120)}…`,
    alternates: { canonical: `/cars/${listing.slug}` },
    openGraph: {
      title: `${listing.name} · ${SITE.shortName}`,
      description: listing.description.slice(0, 200),
      url: `/cars/${listing.slug}`,
    },
  };
}

export default async function CarDetailPage({ params }: PageProps<"/cars/[slug]">) {
  const { slug } = await params;
  const listing = await repo.getListing("car", slug);
  if (!listing || !isCar(listing)) notFound();

  const reviews = await repo.listReviews(listing.id);
  const hourly = listing.rates.hour ?? listing.rates.day ?? 0;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: listing.name,
          brand: { "@type": "Brand", name: listing.make },
          description: listing.description,
          category: listing.category,
          url: `${SITE.url}/cars/${listing.slug}`,
          offers: {
            "@type": "Offer",
            price: hourly,
            priceCurrency: "USD",
            availability:
              listing.status === "available"
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            seller: { "@type": "Organization", name: SITE.name },
          },
          aggregateRating:
            reviews.length > 0
              ? {
                  "@type": "AggregateRating",
                  ratingValue: listing.rating,
                  // The score is drawn from every completed trip; only a
                  // subset of renters leave a written review.
                  ratingCount: listing.trips,
                  reviewCount: reviews.length,
                }
              : undefined,
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
            {
              "@type": "ListItem",
              position: 2,
              name: "Exotic Cars",
              item: `${SITE.url}/cars`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: listing.name,
              item: `${SITE.url}/cars/${listing.slug}`,
            },
          ],
        }}
      />
      <ListingDetail listing={listing} reviews={reviews} />
    </>
  );
}
