"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { leadUnit, rateFor } from "@/lib/domain/pricing";
import type { Listing } from "@/lib/domain/types";
import { Container } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { ListingCard } from "./listing-card";

type SortMode = "featured" | "price-asc" | "price-desc" | "rating";

const SORTS: { value: SortMode; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top rated" },
];

/**
 * Grid, filters and sort for both /cars and /homes.
 *
 * The four sort modes and the availability toggle match the contracted M1
 * scope. Search is new — the prototype's README advertised "instant search
 * by name, category and location" but Browse.tsx had no search input at all.
 */
export function ListingBrowser({ listings }: { listings: Listing[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<SortMode>("featured");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(listings.map((l) => l.category)))],
    [listings],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = listings.filter((l) => {
      if (category !== "All" && l.category !== category) return false;
      if (availableOnly && l.status !== "available") return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q)
      );
    });

    const priceOf = (l: Listing) => rateFor(l, leadUnit(l));

    switch (sort) {
      case "price-asc":
        return [...filtered].sort((a, b) => priceOf(a) - priceOf(b));
      case "price-desc":
        return [...filtered].sort((a, b) => priceOf(b) - priceOf(a));
      case "rating":
        return [...filtered].sort((a, b) => b.rating - a.rating);
      default:
        return filtered;
    }
  }, [listings, query, category, availableOnly, sort]);

  const filtersActive =
    query.trim() !== "" || category !== "All" || availableOnly || sort !== "featured";

  const reset = () => {
    setQuery("");
    setCategory("All");
    setAvailableOnly(false);
    setSort("featured");
  };

  return (
    <>
      <div className="sticky top-16 sm:top-20 z-[var(--z-sticky)] border-y border-line bg-ink/85 backdrop-blur-xl">
        <Container className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative lg:max-w-xs lg:flex-1">
              <Search
                aria-hidden
                width={15}
                height={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <label htmlFor="listing-search" className="sr-only">
                Search by name, category or location
              </label>
              <input
                id="listing-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, category or location"
                className="w-full rounded-full border border-line bg-surface-1/70 py-2.5 pl-10 pr-9 text-sm text-cream outline-none transition-colors focus:border-gold/60 placeholder:text-muted-dim"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-cream"
                >
                  <X width={14} height={14} />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 lg:ml-auto">
              <button
                type="button"
                onClick={() => setAvailableOnly((v) => !v)}
                aria-pressed={availableOnly}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
                  availableOnly
                    ? "border-success/50 bg-success/10 text-success"
                    : "border-line text-cream/75 hover:border-line-strong hover:text-cream",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    availableOnly ? "bg-success" : "bg-muted",
                  )}
                />
                Available only
              </button>

              <div className="relative">
                <SlidersHorizontal
                  aria-hidden
                  width={14}
                  height={14}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <label htmlFor="listing-sort" className="sr-only">
                  Sort results
                </label>
                <select
                  id="listing-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortMode)}
                  className="cursor-pointer appearance-none rounded-full border border-line bg-surface-2 py-2 pl-9 pr-8 text-sm text-cream outline-none transition-colors focus:border-gold/60"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm transition-colors",
                  category === c
                    ? "metal-plate font-medium"
                    : "border border-line text-cream/75 hover:border-line-strong hover:text-cream",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </Container>
      </div>

      <Container className="py-10">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted" role="status" aria-live="polite">
            {results.length} {results.length === 1 ? "result" : "results"}
          </p>
          {filtersActive ? (
            <button
              type="button"
              onClick={reset}
              className="text-sm text-gold transition-opacity hover:opacity-80"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        {results.length === 0 ? (
          <EmptyState
            className="mt-10"
            title="Nothing matches those filters"
            description="Try widening your search, clearing a category, or turning off the availability toggle."
            action={<Button onClick={reset}>Clear filters</Button>}
          />
        ) : (
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} priority={i < 3} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
