import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { money, ratingText } from "@/lib/domain/format";
import type { ListingStatus } from "@/lib/domain/types";

/* --------------------------------- eyebrow -------------------------------- */

/**
 * The signature section label: a gold hairline followed by wide-tracked mono
 * caps. Carried over from the prototype deliberately — it is the strongest
 * piece of brand vocabulary the design has.
 */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 font-mono text-2xs uppercase text-gold",
        className,
      )}
    >
      <span
        aria-hidden
        className="h-px w-6 bg-gradient-to-r from-gold-700 via-gold to-gold-200"
      />
      {children}
    </span>
  );
}

/* ---------------------------------- badge --------------------------------- */

type BadgeTone = "neutral" | "gold" | "success" | "warning" | "danger";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface-2/80 text-cream/80",
  gold: "border-gold/30 bg-gold/10 text-gold",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1",
        "font-mono text-[0.625rem] uppercase tracking-[0.16em]",
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------- status badge ------------------------------ */

const STATUS_META: Record<
  ListingStatus,
  { label: string; tone: BadgeTone; dot: string; live: boolean }
> = {
  available: {
    label: "Available now",
    tone: "success",
    dot: "bg-success",
    live: true,
  },
  booked: { label: "Currently booked", tone: "danger", dot: "bg-danger", live: false },
  maintenance: {
    label: "In service",
    tone: "warning",
    dot: "bg-warning",
    live: false,
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ListingStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} className={cn("backdrop-blur-md", className)}>
      <span
        aria-hidden
        className={cn("h-1.5 w-1.5 rounded-full", meta.dot, meta.live && "animate-live")}
      />
      {meta.label}
    </Badge>
  );
}

/* ---------------------------------- card ---------------------------------- */

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section" | "li";
}) {
  return (
    <Tag
      className={cn(
        "rounded-xl border border-line bg-surface-1/70 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/* ---------------------------------- price --------------------------------- */

export function Price({
  amount,
  suffix,
  size = "md",
  className,
}: {
  amount: number;
  suffix?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl",
    xl: "text-display-4",
  } as const;

  // Headline figures are struck in metal; small ones stay flat so they
  // remain crisp at size.
  const isHeadline = size === "lg" || size === "xl";

  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span
        className={cn(
          "font-mono font-medium tabular-nums",
          sizes[size],
          isHeadline ? "text-metal-soft" : "text-cream",
        )}
      >
        {money(amount)}
      </span>
      {suffix ? <span className="text-xs text-muted">{suffix}</span> : null}
    </span>
  );
}

/* ---------------------------------- stars --------------------------------- */

export function Stars({
  value,
  size = 14,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${ratingText(value)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          width={size}
          height={size}
          className={
            i <= Math.round(value) ? "fill-gold text-gold" : "fill-transparent text-line-strong"
          }
        />
      ))}
    </span>
  );
}

/** Compact inline rating: star, number, trip count. */
export function RatingInline({
  value,
  trips,
  className,
}: {
  value: number;
  trips?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-cream/90", className)}>
      <Star aria-hidden width={14} height={14} className="fill-gold text-gold" />
      <span className="font-mono tabular-nums">{ratingText(value)}</span>
      {trips != null ? <span className="text-muted">· {trips} trips</span> : null}
    </span>
  );
}
