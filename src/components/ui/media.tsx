import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * Media slot with a branded placeholder.
 *
 * The client is supplying real fleet and estate photography, so every listing
 * currently carries `photo: null`. Rather than render a broken frame, we draw
 * an intentional NXL plate at the exact aspect ratio the real image will use —
 * so when the photos land there is no layout shift and no code change.
 */

export type MediaAspect = "16/9" | "4/3" | "3/2" | "1/1" | "4/5" | "21/9";

const ASPECT: Record<MediaAspect, string> = {
  "16/9": "aspect-[16/9]",
  "4/3": "aspect-[4/3]",
  "3/2": "aspect-[3/2]",
  "1/1": "aspect-square",
  "4/5": "aspect-[4/5]",
  "21/9": "aspect-[21/9]",
};

interface MediaProps {
  src?: string | null;
  alt: string;
  aspect?: MediaAspect;
  className?: string;
  /** Caption shown inside the placeholder, e.g. "Exterior · front three-quarter". */
  label?: string;
  priority?: boolean;
  sizes?: string;
  /** Fills its parent instead of enforcing an aspect ratio. */
  fill?: boolean;
  rounded?: boolean;
}

export function Media({
  src,
  alt,
  aspect = "4/3",
  className,
  label,
  priority,
  sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
  fill,
  rounded = true,
}: MediaProps) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-surface-2",
        rounded && "rounded-lg",
        fill ? "h-full w-full" : ASPECT[aspect],
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <MediaPlaceholder label={label} alt={alt} />
      )}
    </div>
  );
}

function MediaPlaceholder({ label, alt }: { label?: string; alt: string }) {
  return (
    <div
      role="img"
      aria-label={`${alt} — photography coming soon`}
      className="absolute inset-0 grid place-items-center bg-gradient-to-br from-surface-2 via-surface-1 to-ink"
    >
      {/* Diagonal sheen so the plate reads as designed rather than empty. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(115deg,transparent_38%,rgba(200,161,94,0.07)_50%,transparent_62%)]"
      />
      <div aria-hidden className="grain absolute inset-0 opacity-50" />

      <div className="relative flex flex-col items-center gap-2 px-4 text-center">
        <span className="text-metal font-display text-2xl font-semibold tracking-tight opacity-50">
          NXL
        </span>
        <span aria-hidden className="metal-track h-px w-8 opacity-40" />
        {label ? (
          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.22em] text-muted-dim">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
