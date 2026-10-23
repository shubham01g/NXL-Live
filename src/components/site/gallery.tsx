"use client";

import { useState } from "react";
import Image from "next/image";
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
 * mix portrait and landscape. A listing's own reels, when it has them, lead
 * the strip and play on the stage with controls.
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
  videos = [],
}: {
  images: string[];
  alt: string;
  kind: "car" | "home";
  status: ListingStatus;
  videos?: MediaVideo[];
}) {
  const shots = kind === "car" ? CAR_SHOTS : HOME_SHOTS;
  const photos = images.length > 0 ? images : Array.from({ length: shots.length }, () => "");
  const lead = videos.length;
  const [active, setActive] = useState(0);
  // Reels are shot upright, so the stage grows tall for them; a landscape
  // clip drops back to the photo frame once its metadata says so.
  const [wide, setWide] = useState<Record<string, boolean>>({});
  const measure = (src: string, el: HTMLVideoElement) => {
    const isWide = el.videoWidth > el.videoHeight;
    setWide((prev) => (prev[src] === isWide ? prev : { ...prev, [src]: isWide }));
  };
  const hasPhotos = images.length > 0;
  const video = active < lead ? videos[active] : null;
  const photoAt = active - lead;
  const shotName = (i: number) =>
    hasPhotos ? `photo ${i + 1} of ${images.length}` : (shots[i] ?? `photo ${i + 1}`);

  return (
    <div>
      <div className="relative">
        {video ? (
          <div
            className={cn(
              "relative isolate overflow-hidden rounded-lg bg-ink",
              wide[video.src]
                ? "aspect-[3/2]"
                : "aspect-[4/5] max-h-[min(82svh,820px)] w-full lg:aspect-auto lg:h-[min(82svh,820px)]",
            )}
          >
            {video.poster ? (
              <Image
                src={video.poster}
                alt=""
                fill
                sizes="60vw"
                className="-z-10 scale-110 object-cover opacity-40 blur-2xl"
              />
            ) : null}
            <video
              key={video.src}
              src={video.src}
              poster={video.poster ?? undefined}
              controls
              playsInline
              preload="metadata"
              aria-label={`${alt} — ${video.label}`}
              // The server-rendered element can load its metadata before
              // hydration, so the event may already have fired: read the
              // size on mount as well.
              ref={(el) => {
                if (el && el.readyState >= 1) measure(video.src, el);
              }}
              onLoadedMetadata={(e) => measure(video.src, e.currentTarget)}
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
        {videos.map((v, i) => (
          <li key={v.src}>
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Play video: ${v.label}`}
              aria-current={active === i}
              className={cn(
                "relative block w-full overflow-hidden rounded-md border transition-colors",
                active === i ? "border-gold" : "border-line hover:border-line-strong",
              )}
            >
              <Media src={v.poster} alt="" aspect="4/3" rounded={false} sizes="120px" />
              <span aria-hidden className="absolute inset-0 grid place-items-center bg-ink/35">
                <Play width={18} height={18} className="text-cream" />
              </span>
            </button>
          </li>
        ))}
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
