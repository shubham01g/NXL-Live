import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { shortDate, ratingText } from "@/lib/domain/format";
import { isCar, type Listing, type Review } from "@/lib/domain/types";
import { Container, Section, StatGrid } from "@/components/ui/layout";
import { Card, Eyebrow, RatingInline, Stars } from "@/components/ui/primitives";
import { EmptyState, ProgressBar } from "@/components/ui/feedback";
import { Gallery } from "./gallery";
import { BookingPanel } from "./booking-panel";
import { MemberReviews } from "./member-reviews";

export function ListingDetail({
  listing,
  reviews,
}: {
  listing: Listing;
  reviews: Review[];
}) {
  const backHref = listing.kind === "car" ? "/cars" : "/homes";
  const backLabel = listing.kind === "car" ? "All exotic cars" : "All luxury homes";

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : listing.rating;

  const specs = isCar(listing)
    ? [
        { label: "Horsepower", value: `${listing.specs.horsepower}` },
        { label: "0–60 mph", value: `${listing.specs.zeroToSixty}s` },
        { label: "Top speed", value: `${listing.specs.topSpeed} mph` },
        { label: "Seats", value: `${listing.specs.seats}` },
      ]
    : [
        { label: "Bedrooms", value: `${listing.specs.beds}` },
        { label: "Bathrooms", value: `${listing.specs.baths}` },
        { label: "Sleeps", value: `${listing.specs.sleeps}` },
        { label: "Rating", value: ratingText(listing.rating) },
      ];

  return (
    <Container className="pb-24 pt-28">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-gold"
      >
        <ArrowLeft aria-hidden width={14} height={14} />
        {backLabel}
      </Link>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
        {/* ------------------------------- left column ------------------------------ */}
        <div className="min-w-0">
          <Gallery
            images={listing.gallery}
            alt={listing.name}
            kind={listing.kind}
            status={listing.status}
            video={listing.video}
          />

          <div className="mt-10">
            <Eyebrow>{listing.category}</Eyebrow>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <h1 className="font-display text-display-3 text-balance text-cream">
                {listing.name}
              </h1>
              <RatingInline value={listing.rating} trips={listing.trips} />
            </div>
            <p className="mt-2 text-muted">{listing.location}</p>
          </div>

          <StatGrid className="mt-8" stats={specs} />

          {isCar(listing) ? (
            <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted">Transmission</dt>
                <dd className="text-cream">{listing.specs.transmission}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">Drivetrain</dt>
                <dd className="text-cream">{listing.specs.drivetrain}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">Year</dt>
                <dd className="text-cream">{listing.year}</dd>
              </div>
            </dl>
          ) : null}

          <p className="mt-8 text-lg leading-relaxed text-cream/80">
            {listing.description}
          </p>

          {!isCar(listing) && listing.amenities.length > 0 ? (
            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold text-cream">Amenities</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {listing.amenities.map((a) => (
                  <li
                    key={a}
                    className="rounded-full border border-line bg-surface-1/60 px-4 py-1.5 text-sm text-cream/80"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <Reviews reviews={reviews} average={average} listingId={listing.id} />
        </div>

        {/* ------------------------------ right column ------------------------------ */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <BookingPanel listing={listing} />
        </div>
      </div>
    </Container>
  );
}

function Reviews({ reviews, average, listingId }: { reviews: Review[]; average: number; listingId: string }) {
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  return (
    <Section size="sm" className="mt-4 border-t border-line">
      <h2 className="font-display text-2xl font-semibold text-cream">
        Ratings & reviews
      </h2>

      {reviews.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No reviews yet"
          description="Be the first to rate this one after your rental."
        />
      ) : (
        <>
          <div className="mt-6 grid gap-8 sm:grid-cols-[auto_1fr] sm:items-center">
            <div>
              <p className="text-metal-soft font-display text-display-4">
                {ratingText(average)}
              </p>
              <Stars value={average} className="mt-2" />
              <p className="mt-1.5 text-sm text-muted">
                {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </p>
            </div>

            <dl className="space-y-1.5 sm:max-w-sm">
              {distribution.map((row) => (
                <div key={row.star} className="flex items-center gap-3">
                  <dt className="w-8 shrink-0 font-mono text-xs tabular-nums text-muted">
                    {row.star}★
                  </dt>
                  <dd className="flex-1">
                    <ProgressBar
                      label={`${row.count} ${row.star}-star reviews`}
                      value={reviews.length ? row.count / reviews.length : 0}
                    />
                  </dd>
                  <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-muted-dim">
                    {row.count}
                  </span>
                </div>
              ))}
            </dl>
          </div>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2">
            {reviews.map((review) => (
              <Card key={review.id} as="li" className="p-6">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="metal-plate grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-sm font-semibold"
                  >
                    {review.authorName.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-cream">
                      {review.authorName}
                    </p>
                    <p className="text-xs text-muted-dim">
                      {shortDate(review.createdAt)}
                    </p>
                  </div>
                  <Stars value={review.rating} size={12} className="ml-auto shrink-0" />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-cream/75">
                  {review.comment}
                </p>
              </Card>
            ))}
          </ul>

        </>
      )}
      <MemberReviews listingId={listingId} />
    </Section>
  );
}
