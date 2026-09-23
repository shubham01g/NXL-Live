import { cn } from "@/lib/utils/cn";

/**
 * Typographic wordmark.
 *
 * The client's supplied logo (public/logo.png in the prototype) is a navy
 * raster wordmark on a transparent background — invisible against the ink
 * page, and it ships as a 153KB JPEG in the PWA manifest. This lockup
 * reproduces the same hierarchy in live type: it scales cleanly, inherits
 * colour, costs nothing to load, and works on dark.
 *
 * Swap it for the client's SVG the moment an inverted vector arrives.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("flex items-center gap-2.5 leading-none", className)}
      aria-hidden
    >
      <span className="font-display text-[1.6em] font-bold tracking-[-0.04em] text-cream">
        N<span className="text-metal">X</span>L
      </span>

      <span className="h-[2.1em] w-px shrink-0 bg-line-strong" />

      <span className="flex flex-col gap-[0.2em] pt-[0.1em]">
        <span className="font-mono text-[0.5em] font-semibold uppercase tracking-[0.2em] text-cream/85">
          Certified Exotic
        </span>
        <span className="font-mono text-[0.5em] font-semibold uppercase tracking-[0.42em] text-gold">
          Rentals
        </span>
      </span>
    </span>
  );
}
