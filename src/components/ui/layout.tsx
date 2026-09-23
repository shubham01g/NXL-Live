import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Eyebrow } from "./primitives";

/* -------------------------------- container ------------------------------- */

export function Container({
  children,
  className,
  wide,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        wide ? "max-w-[1600px]" : "max-w-[1320px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------------- section -------------------------------- */

/** Vertical rhythm for page sections. One scale, used everywhere. */
export function Section({
  children,
  className,
  size = "md",
  id,
}: {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  id?: string;
}) {
  const sizes = {
    sm: "py-12 sm:py-16",
    md: "py-16 sm:py-24",
    lg: "py-24 sm:py-32",
  } as const;

  return (
    <section id={id} className={cn(sizes[size], className)}>
      {children}
    </section>
  );
}

/* ----------------------------- section heading ---------------------------- */

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  const centered = align === "center";

  return (
    <div
      className={cn(
        "flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between",
        centered && "sm:flex-col sm:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centered && "text-center")}>
        {eyebrow ? (
          <Eyebrow className={centered ? "justify-center" : undefined}>{eyebrow}</Eyebrow>
        ) : null}
        <Tag
          className={cn(
            "font-display text-display-3 text-balance text-cream",
            eyebrow && "mt-5",
          )}
        >
          {title}
        </Tag>
        {description ? (
          <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* -------------------------------- stat grid ------------------------------- */

export interface Stat {
  label: string;
  value: ReactNode;
  hint?: string;
}

/**
 * The 1px-gutter stat strip. A brand motif from the prototype, now a real
 * component instead of the same seven classes repeated on four pages.
 */
export function StatGrid({
  stats,
  className,
  columns = 4,
}: {
  stats: Stat[];
  className?: string;
  columns?: 2 | 3 | 4;
}) {
  const cols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  } as const;

  return (
    <dl
      className={cn(
        "hairline-grid grid overflow-hidden rounded-lg border border-line",
        cols[columns],
        className,
      )}
    >
      {stats.map((stat) => (
        <div key={stat.label} className="bg-ink/85 px-5 py-6 backdrop-blur">
          <dt className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted">
            {stat.label}
          </dt>
          {/* Stat figures are the page's headline numbers, so they are struck
              in metal on the same rule as <Price>. */}
          <dd className="text-metal-soft mt-2 font-display text-2xl font-semibold">
            {stat.value}
          </dd>
          {stat.hint ? (
            <p className="mt-1 text-xs text-muted-dim">{stat.hint}</p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

/* -------------------------------- divider --------------------------------- */

export function Divider({
  className,
  tone = "line",
}: {
  className?: string;
  /** "gold" draws the metal rule that fades out at both ends. */
  tone?: "line" | "gold";
}) {
  return tone === "gold" ? (
    <hr className={cn("rule-gold", className)} />
  ) : (
    <hr className={cn("border-0 border-t border-line", className)} />
  );
}
