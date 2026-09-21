import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import { SITE } from "@/lib/domain/site";
import { isHome } from "@/lib/domain/types";
import { ListingDetail } from "@/components/site/listing-detail";
import { JsonLd } from "@/components/site/json-ld";

export async function generateStaticParams() {
  const homes = await repo.listHomes();
  return homes.map((home) => ({ slug: home.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/homes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const listing = await repo.getListing("home", slug);
  if (!listing) return {};

  return {
    title: listing.name,
    description: `Stay at ${listing.name} in ${listing.location}. ${listing.description.slice(0, 120)}…`,
    alternates: { canonical: `/homes/${listing.slug}` },
    openGraph: {
      title: `${listing.name} · ${SITE.shortName}`,
      description: listing.description.slice(0, 200),
      url: `/homes/${listing.slug}`,
    },
  };
}

export default async function HomeDetailPage({ params }: PageProps<"/homes/[slug]">) {
  const { slug } = await params;
  const listing = await repo.getListing("home", slug);
  if (!listing || !isHome(listing)) notFound();

  const reviews = await repo.listReviews(listing.id);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Accommodation",
          name: listing.name,
          description: listing.description,
          url: `${SITE.url}/homes/${listing.slug}`,
          numberOfBedrooms: listing.specs.beds,
          numberOfBathroomsTotal: listing.specs.baths,
          occupancy: { "@type": "QuantitativeValue", maxValue: listing.specs.sleeps },
          amenityFeature: listing.amenities.map((name) => ({
            "@type": "LocationFeatureSpecification",
            name,
            value: true,
          })),
          address: {
            "@type": "PostalAddress",
            addressLocality: SITE.contact.address.city,
            addressRegion: SITE.contact.address.state,
            addressCountry: SITE.contact.address.country,
          },
          aggregateRating:
            reviews.length > 0
              ? {
                  "@type": "AggregateRating",
                  ratingValue: listing.rating,
                  // The score is drawn from every completed stay; only a
                  // subset of guests leave a written review.
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
              name: "Luxury Homes",
              item: `${SITE.url}/homes`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: listing.name,
              item: `${SITE.url}/homes/${listing.slug}`,
            },
          ],
        }}
      />
      <ListingDetail listing={listing} reviews={reviews} />
    </>
  );
}
