"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/* ---------------------------- segmented control --------------------------- */

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/**
 * Pill segmented control — used for rate units, kind switches and filters.
 * Wraps instead of overflowing, which fixes the prototype's four car rate
 * tabs being forced into a three-column grid.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex flex-wrap gap-1 rounded-full border border-line bg-ink/60 p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-full font-medium transition-all duration-300 ease-editorial",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              "disabled:cursor-not-allowed disabled:opacity-40",
              active
                ? "metal-plate shadow-glow-gold"
                : "text-cream/70 hover:bg-surface-2 hover:text-cream",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------- toggle --------------------------------- */

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-300",
        "disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "border-gold metal-plate" : "border-line bg-surface-3",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 block h-4 w-4 -translate-y-1/2 rounded-full transition-all duration-300 ease-editorial",
          checked ? "left-[calc(100%-1.25rem)] bg-ink" : "left-1 bg-muted",
        )}
      />
    </button>
  );
}

/* --------------------------------- stepper -------------------------------- */

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 90,
  label,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label: string;
  className?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border border-line bg-ink/60 px-2 py-1.5",
        className,
      )}
    >
      <StepButton
        label={`Decrease ${label}`}
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
      >
        <Minus width={15} height={15} />
      </StepButton>

      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const next = Number.parseInt(e.target.value, 10);
          if (!Number.isNaN(next)) onChange(clamp(next));
        }}
        className="w-16 bg-transparent text-center font-mono text-base tabular-nums text-cream outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />

      <StepButton
        label={`Increase ${label}`}
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
      >
        <Plus width={15} height={15} />
      </StepButton>
    </div>
  );
}

function StepButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-full border border-line text-cream transition-colors hover:border-gold/50 hover:text-gold disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
