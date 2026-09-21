"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Media } from "@/components/ui/media";
import { StatusBadge } from "@/components/ui/primitives";
import type { ListingStatus } from "@/lib/domain/types";

/**
 * Listing gallery.
 *
 * With no photography yet, this renders the shot list the client needs to
 * supply — each placeholder is labelled with the angle it expects. When real
 * images arrive they slot into the same frames with no layout change.
 */
const CAR_SHOTS = [
  "Front three-quarter",
  "Rear three-quarter",
  "Interior · cockpit",
  "Detail · wheel",
  "Profile",
] as const;

const HOME_SHOTS = [
  "Exterior · approach",
  "Living space",
  "Primary suite",
  "Pool & terrace",
  "Garage",
] as const;

export function Gallery({
  images,
  alt,
  kind,
  status,
}: {
  images: string[];
  alt: string;
  kind: "car" | "home";
  status: ListingStatus;
}) {
  const shots = kind === "car" ? CAR_SHOTS : HOME_SHOTS;
  const slots = images.length > 0 ? images : Array.from({ length: shots.length }, () => "");
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="relative">
        <Media
          src={slots[active] || null}
          alt={`${alt} — ${shots[active] ?? "photo"}`}
          aspect="3/2"
          label={shots[active] ?? undefined}
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
        />
        <div className="pointer-events-none absolute left-4 top-4">
          <StatusBadge status={status} />
        </div>
      </div>

      <ul className="mt-3 grid grid-cols-5 gap-3">
        {slots.map((src, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View ${shots[i] ?? `photo ${i + 1}`}`}
              aria-current={i === active}
              className={cn(
                "block w-full overflow-hidden rounded-md border transition-colors",
                i === active
                  ? "border-gold"
                  : "border-line hover:border-line-strong",
              )}
            >
              <Media
                src={src || null}
                alt=""
                aspect="4/3"
                rounded={false}
                sizes="120px"
                className={cn(i !== active && "opacity-70")}
              />
            </button>
          </li>
        ))}
      </ul>

      {images.length === 0 ? (
        <p className="mt-3 text-center text-xs text-muted-dim">
          Photography pending — these frames show the shot list for this listing.
        </p>
      ) : null}
    </div>
  );
}
