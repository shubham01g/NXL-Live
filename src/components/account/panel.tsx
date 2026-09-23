import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Section furniture.
 *
 * Every account section is a titled page with one or more cards under it.
 * Defining that once keeps the seven sections visually identical, which is
 * what makes the sidebar feel like one app rather than seven pages.
 */

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-display text-2xl font-semibold text-cream">{title}</h2>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
  tone = "default",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** "gold" marks the panel that is the point of the page. */
  tone?: "default" | "gold";
}) {
  return (
    <section
      className={cn(
        "rounded-xl p-6",
        tone === "gold" ? "edge-gold" : "border border-line bg-surface-1/50",
        className,
      )}
    >
      {title ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold text-cream">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** A label/value row, used by every "on file" summary. */
export function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-3 last:border-0">
      <dt className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted">
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-cream">{children}</dd>
    </div>
  );
}

/** Confirmation line shown after a panel saves. */
export function SavedNote({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="mt-3 text-xs text-success">
      {children}
    </p>
  );
}
