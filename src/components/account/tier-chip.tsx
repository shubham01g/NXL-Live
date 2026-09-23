import { cn } from "@/lib/utils/cn";
import { count } from "@/lib/domain/format";
import type { LoyaltyTier } from "@/lib/domain/types";

/**
 * The tier badge, used in the header and on the profile card.
 *
 * Colour comes from the tier itself (loyalty.ts) rather than a local map, so
 * Silver reads cool and only Gold reads gold. The dot carries the colour and
 * the label stays cream — a whole chip in Platinum white-blue would compete
 * with the brand metal sitting next to it in the header.
 */
export function TierChip({
  tier,
  points,
  className,
}: {
  tier: LoyaltyTier;
  /** Omit to show the tier name alone. */
  points?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line bg-surface-2/70 px-3 py-1.5",
        "font-mono text-[0.625rem] uppercase tracking-[0.16em] text-cream/85",
        className,
      )}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: tier.color }}
      />
      {tier.name}
      {points != null ? (
        <span className="tabular-nums text-metal-soft">{count(points)}</span>
      ) : null}
    </span>
  );
}
