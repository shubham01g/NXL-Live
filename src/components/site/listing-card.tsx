import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { money } from "@/lib/domain/format";
import { leadUnit, rateFor, unitSuffix } from "@/lib/domain/pricing";
import type { Listing } from "@/lib/domain/types";
import { Media } from "@/components/ui/media";
import { Price, RatingInline, StatusBadge } from "@/components/ui/primitives";

export function listingHref(listing: Listing) {
  return `/${listing.kind === "car" ? "cars" : "homes"}/${listing.slug}`;
}

export function ListingCard({
  listing,
  priority,
  className,
}: {
  listing: Listing;
  priority?: boolean;
  className?: string;
}) {
  const unit = leadUnit(listing);
  const rate = rateFor(listing, unit);
  const dailyRate = listing.rates.day;
  const showDailyAside = unit !== "day" && typeof dailyRate === "number";
  const unavailable = listing.status !== "available";

  return (
    <article className={cn("group relative", className)}>
      <div className="overflow-hidden rounded-lg">
        <Media
          src={listing.photo}
          alt={listing.name}
          aspect="4/3"
          label={listing.kind === "car" ? "Exterior" : "Exterior"}
          priority={priority}
          rounded={false}
          className={cn(
            "transition-transform duration-700 ease-editorial group-hover:scale-[1.04]",
            unavailable && "opacity-70 grayscale-[0.35]",
          )}
        />
      </div>

      <div className="pointer-events-none absolute left-3 top-3 flex items-start justify-between gap-2 pr-3 [width:calc(100%-0.75rem)]">
        <StatusBadge status={listing.status} />
        <span className="rounded-full border border-line bg-ink/70 px-3 py-1 font-mono text-[0.625rem] uppercase tracking-[0.16em] text-gold backdrop-blur">
          {listing.category}
        </span>
      </div>

      <div className="mt-5">
        <h3 className="font-display text-xl font-semibold text-cream transition-colors group-hover:text-gold">
          {/* Stretched link keeps the whole card clickable without nesting
              interactive elements — the prototype wrapped everything in a
              <button>, which is not navigable or crawlable. */}
          <Link href={listingHref(listing)} className="after:absolute after:inset-0">
            {listing.name}
          </Link>
        </h3>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm text-muted">{listing.location}</p>
          <RatingInline value={listing.rating} trips={listing.trips} />
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-line pt-4">
          <div>
            <Price amount={rate} suffix={unitSuffix(unit)} />
            {showDailyAside ? (
              <p className="mt-0.5 text-xs text-muted-dim">
                or {money(dailyRate)}/day
              </p>
            ) : null}
          </div>

          <span
            aria-hidden
            className="flex items-center gap-1.5 text-sm font-medium text-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          >
            View
            <ArrowRight width={14} height={14} />
          </span>
        </div>
      </div>
    </article>
  );
}
