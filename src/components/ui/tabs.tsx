"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Underline tabs — for switching sub-views inside a panel or drawer, where a
 * pill SegmentedControl would compete with the page's primary actions.
 * Scrolls horizontally on phones instead of wrapping into two rows.
 */
export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
  /** Red dot for "needs attention". */
  flag?: boolean;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("-mx-1 overflow-x-auto border-b border-line", className)}>
      <div role="tablist" aria-label={label} className="flex w-max gap-1 px-1">
        {items.map((item) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.value)}
              className={cn(
                "relative flex items-center gap-2 whitespace-nowrap px-3.5 pb-3 pt-2 text-sm transition-colors",
                active ? "font-medium text-cream" : "text-muted hover:text-cream",
              )}
            >
              {item.label}
              {item.count !== undefined ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 font-mono text-[0.625rem] tabular-nums",
                    active ? "bg-gold/15 text-gold" : "bg-surface-3 text-muted",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
              {item.flag ? <span aria-label="Needs attention" role="img" className="h-1.5 w-1.5 rounded-full bg-danger" /> : null}
              {active ? <span aria-hidden className="metal-track absolute inset-x-2 -bottom-px h-0.5 rounded-full" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Numbered progress for multi-step flows — checkout, onboarding, the driver
 * inspection. Completed steps are clickable so a guest can go back and fix
 * something without losing what they typed later.
 */
export function StepIndicator({
  steps,
  current,
  onSelect,
  className,
}: {
  steps: string[];
  current: number;
  onSelect?: (index: number) => void;
  className?: string;
}) {
  return (
    <ol className={cn("flex items-center gap-2", className)} aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              disabled={!done || !onSelect}
              onClick={() => onSelect?.(i)}
              aria-current={active ? "step" : undefined}
              className="flex min-w-0 items-center gap-2 disabled:cursor-default"
            >
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold",
                  active ? "metal-plate" : done ? "border border-gold/60 text-gold" : "border border-line text-muted",
                )}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={cn(
                  "hidden truncate text-xs sm:block",
                  active ? "font-medium text-cream" : done ? "text-cream/75" : "text-muted",
                )}
              >
                {step}
              </span>
            </button>
            {i < steps.length - 1 ? (
              <span aria-hidden className={cn("h-px flex-1", done ? "metal-track" : "bg-line")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
