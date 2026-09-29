"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Media } from "@/components/ui/media";
import { StatusBadge } from "@/components/ui/primitives";
import type { ListingStatus, MediaVideo } from "@/lib/domain/types";

/**
 * Listing gallery.
 *
 * Without photography it renders the shot list the client needs to supply —
 * each placeholder is labelled with the angle it expects. Real photos slot
 * into the same frames; the stage letterboxes them because the client's shots
 * mix portrait and landscape. A listing's own video, when it has one, leads
 * the strip and plays on the stage with controls.
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
  video,
}: {
  images: string[];
  alt: string;
  kind: "car" | "home";
  status: ListingStatus;
  video?: MediaVideo | null;
}) {
  const shots = kind === "car" ? CAR_SHOTS : HOME_SHOTS;
  const photos = images.length > 0 ? images : Array.from({ length: shots.length }, () => "");
  const lead = video ? 1 : 0;
  const [active, setActive] = useState(0);
  const hasPhotos = images.length > 0;
  const showingVideo = !!video && active === 0;
  const photoAt = active - lead;
  const shotName = (i: number) =>
    hasPhotos ? `photo ${i + 1} of ${images.length}` : (shots[i] ?? `photo ${i + 1}`);

  return (
    <div>
      <div className="relative">
        {showingVideo ? (
          <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-ink">
            <video
              key={video.src}
              src={video.src}
              poster={video.poster ?? undefined}
              controls
              playsInline
              preload="metadata"
              aria-label={`${alt} — ${video.label}`}
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <Media
            src={photos[photoAt] || null}
            alt={`${alt} — ${shotName(photoAt)}`}
            aspect="3/2"
            fit={hasPhotos ? "contain" : "cover"}
            label={shots[photoAt] ?? undefined}
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
        )}
        <div className="pointer-events-none absolute left-4 top-4">
          <StatusBadge status={status} />
        </div>
      </div>

      <ul className="mt-3 grid grid-cols-5 gap-3">
        {video ? (
          <li>
            <button
              type="button"
              onClick={() => setActive(0)}
              aria-label={`Play video: ${video.label}`}
              aria-current={showingVideo}
              className={cn(
                "relative block w-full overflow-hidden rounded-md border transition-colors",
                showingVideo ? "border-gold" : "border-line hover:border-line-strong",
              )}
            >
              <Media src={video.poster} alt="" aspect="4/3" rounded={false} sizes="120px" />
              <span aria-hidden className="absolute inset-0 grid place-items-center bg-ink/35">
                <Play width={18} height={18} className="text-cream" />
              </span>
            </button>
          </li>
        ) : null}
        {photos.map((src, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setActive(i + lead)}
              aria-label={`View ${shotName(i)}`}
              aria-current={i === photoAt}
              className={cn(
                "block w-full overflow-hidden rounded-md border transition-colors",
                i === photoAt
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
                className={cn(i !== photoAt && "opacity-70")}
              />
            </button>
          </li>
        ))}
      </ul>

      {!hasPhotos ? (
        <p className="mt-3 text-center text-xs text-muted-dim">
          Photography pending — these frames show the shot list for this listing.
        </p>
      ) : null}
    </div>
  );
}
