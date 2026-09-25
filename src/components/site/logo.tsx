import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { SITE } from "@/lib/domain/site";

/**
 * The NXL Certified Exotic Rentals badge.
 *
 * Source: the client's supplied JPEG (brand-src/nxl-logo-original.jpg), which
 * shipped with a transparency checkerboard painted into its pixels. The
 * checkerboard was flood-filled out from the edges and the badge trimmed —
 * brand-src/nxl-logo-cut.png is that master, and every size below and every
 * icon in src/app is generated from it.
 *
 * Size it by height; width follows the badge's ~1.07:1 aspect.
 */
export function Logo({
  className,
  priority,
  decorative,
}: {
  className?: string;
  priority?: boolean;
  /** Set when a parent (e.g. the home link) already names it. */
  decorative?: boolean;
}) {
  return (
    <Image
      src="/brand/nxl-logo.png"
      alt={decorative ? "" : `${SITE.name} logo`}
      width={514}
      height={480}
      priority={priority}
      sizes="200px"
      className={cn("h-12 w-auto select-none", className)}
    />
  );
}
