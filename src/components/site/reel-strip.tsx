import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Reel } from "@/lib/data/films";
import { LoopVideo } from "@/components/ui/loop-video";

/**
 * A row of the client's vertical reels, swipeable on phones. Each tile loops
 * muted while on screen and links to the car it shows; the listing page plays
 * the same reel with sound.
 *
 * Load: tiles show their poster and fetch nothing until scrolled to, and only
 * tiles that are mostly on screen play — a half-visible tile at the edge of the
 * row stays a still image.
 */
export function ReelStrip({ reels, className }: { reels: Reel[]; className?: string }) {
  return (
    <ul
      className={cn(
        "-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:scroll-px-6 [scrollbar-width:thin] sm:-mx-6 sm:gap-4 sm:px-6 lg:mx-0 lg:px-0",
        className,
      )}
    >
      {reels.map((r) => (
        <li key={r.video.src} className="relative aspect-[9/16] w-[46vw] shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-surface-2 sm:w-56">
          <LoopVideo
            src={r.loop}
            poster={r.video.poster ?? ""}
            label={r.video.label}
            controlClassName="bottom-auto top-2 right-2 h-8 w-8"
            preload="none"
            threshold={0.6}
          />
          {/* A sibling rather than LoopVideo's `overlay` prop: JSX built inside this
              server-side map and handed to a client component trips React's key check. */}
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/90 to-transparent" />
          <Link href={`/cars/${r.slug}`} className="group absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
            <span className="text-sm font-medium leading-snug text-cream group-hover:text-gold">{r.title}</span>
            <ArrowUpRight aria-hidden width={16} height={16} className="shrink-0 text-gold" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
