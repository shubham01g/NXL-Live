"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { money } from "@/lib/domain/format";
import { leadUnit, rateFor, unitSuffix } from "@/lib/domain/pricing";
import { isCar, type Listing, type ListingKind } from "@/lib/domain/types";
import { Modal } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/controls";
import { Media } from "@/components/ui/media";
import { RatingInline, StatusBadge } from "@/components/ui/primitives";

/**
 * Quick reserve — the prototype's QuickReserveModal, opened from the header's
 * Reserve button on every page. Pick → preview → straight into checkout,
 * without a detour through the listing grid.
 */
type Kind = "all" | ListingKind;

export function QuickReserve({
  listings,
  open,
  onClose,
}: {
  listings: Listing[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [preview, setPreview] = useState<Listing | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter(
      (l) =>
        l.status !== "maintenance" &&
        (kind === "all" || l.kind === kind) &&
        (!q || `${l.name} ${l.category} ${l.location}`.toLowerCase().includes(q)),
    );
  }, [listings, query, kind]);

  const close = () => {
    setPreview(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      eyebrow="Quick reserve"
      title={preview ? preview.name : "What would you like to reserve?"}
      footer={
        preview ? (
          <>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              <ArrowLeft aria-hidden width={15} height={15} /> All listings
            </Button>
            <Button
              onClick={() => {
                router.push(`/checkout?listing=${preview.slug}&unit=${leadUnit(preview)}`);
                close();
              }}
            >
              Reserve {preview.kind === "car" ? "this car" : "this estate"}
              <ArrowRight aria-hidden width={15} height={15} />
            </Button>
          </>
        ) : undefined
      }
    >
      {preview ? (
        <div className="space-y-5">
          <div className="relative">
            <Media src={preview.photo} alt={preview.name} aspect="16/9" sizes="720px" />
            <StatusBadge status={preview.status} className="absolute left-3 top-3" />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-gold">{preview.category}</p>
              <p className="mt-1 text-sm text-muted">{preview.location}</p>
            </div>
            <RatingInline value={preview.rating} trips={preview.trips} />
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(isCar(preview)
              ? [
                  ["Horsepower", preview.specs.horsepower],
                  ["0–60", `${preview.specs.zeroToSixty}s`],
                  ["Top speed", `${preview.specs.topSpeed} mph`],
                  ["Seats", preview.specs.seats],
                ]
              : [
                  ["Bedrooms", preview.specs.beds],
                  ["Baths", preview.specs.baths],
                  ["Sleeps", preview.specs.sleeps],
                  ["Cleaning", money(preview.cleaningFee)],
                ]
            ).map(([k, v]) => (
              <div key={String(k)} className="rounded-lg border border-line bg-ink/40 px-3 py-2.5">
                <dt className="font-mono text-[0.5625rem] uppercase tracking-[0.18em] text-muted">{k}</dt>
                <dd className="mt-1 text-sm text-cream">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm leading-relaxed text-cream/80">{preview.description}</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(preview.rates).map(([u, r]) => (
              <span key={u} className="rounded-full border border-line px-3 py-1 font-mono text-xs text-cream/85">
                {money(r ?? 0)}
                {unitSuffix(u as keyof typeof preview.rates)}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block flex-1">
              <span className="sr-only">Search listings</span>
              <Search aria-hidden width={16} height={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, type or area…"
                className="h-11 w-full rounded-full border border-line bg-ink/60 pl-10 pr-10 text-sm text-cream outline-none placeholder:text-muted-dim focus:border-gold/60"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-cream">
                  <X width={15} height={15} />
                </button>
              ) : null}
            </label>
            <SegmentedControl<Kind>
              label="Kind"
              size="sm"
              value={kind}
              onChange={setKind}
              options={[
                { value: "all", label: "All" },
                { value: "car", label: "Cars" },
                { value: "home", label: "Estates" },
              ]}
            />
          </div>

          {results.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Nothing matches — try clearing the search.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {results.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setPreview(l)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2/40 p-2.5 text-left transition-colors hover:border-gold/40",
                    )}
                  >
                    <Media src={l.photo} alt="" aspect="4/3" className="w-24 shrink-0" sizes="96px" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-cream">{l.name}</span>
                      <span className="block truncate text-xs text-muted">{l.category}</span>
                      <span className="mt-1.5 block font-mono text-sm text-gold">
                        {money(rateFor(l, leadUnit(l)))}
                        <span className="text-xs text-muted">{unitSuffix(leadUnit(l))}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
