"use client";

import type { ReactNode } from "react";
import { Info, Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Eyebrow } from "@/components/ui/primitives";

/**
 * Console furniture.
 *
 * Every back-office screen is a header, an optional stat strip, a toolbar and
 * one or more tables or panels. Defining the pieces once is what makes
 * eighteen screens read as one app instead of eighteen pages.
 */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="mt-3 font-display text-3xl font-semibold text-cream sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <label className={cn("relative block w-full sm:max-w-xs", className)}>
      <span className="sr-only">{label}</span>
      <Search
        aria-hidden
        width={16}
        height={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border border-line bg-ink/60 pl-10 pr-4 text-sm text-cream outline-none transition-colors placeholder:text-muted-dim hover:border-line-strong focus:border-gold/60"
      />
    </label>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      {children}
    </div>
  );
}

/* ---------------------------------- table --------------------------------- */

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  /** Hide below this breakpoint to keep phones readable. */
  hideBelow?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const HIDE = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty = "Nothing matches.",
  caption,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: string;
  caption: string;
  /** Opens a detail view. Clicks on buttons, links and selects inside the row are ignored. */
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-1/50">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line bg-surface-2/60">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "whitespace-nowrap px-3.5 py-3 font-mono text-[0.625rem] font-normal uppercase tracking-[0.18em] text-muted",
                    c.align === "right" ? "text-right" : "text-left",
                    c.hideBelow && HIDE[c.hideBelow],
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={
                    onRowClick
                      ? (e) => {
                          if ((e.target as HTMLElement).closest("button,a,select,input,label")) return;
                          onRowClick(row);
                        }
                      : undefined
                  }
                  className={cn(
                    "border-b border-line transition-colors last:border-0 hover:bg-surface-2/40",
                    onRowClick && "cursor-pointer",
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={cn(
                        "px-3.5 py-3.5 align-middle text-cream/90",
                        c.align === "right" ? "text-right tabular-nums" : "text-left",
                        c.hideBelow && HIDE[c.hideBelow],
                        c.className,
                      )}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center text-sm text-muted">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Name over a muted second line — the standard first cell. */
export function Primary({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-cream">{title}</p>
      {sub ? <p className="truncate text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

/**
 * The honest line under any screen that edits data. At M2 there is no
 * database: changes persist in this browser (the demo store) so a reviewer
 * can follow a booking across every portal, and nowhere else.
 */
export function DemoNote({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center gap-2 text-xs text-muted-dim", className)}>
      <Info aria-hidden width={14} height={14} className="shrink-0" />
      Demo data. Edits are saved in this browser only — they save for real, for every
      user, once the database is connected in Milestone 3.
    </p>
  );
}

/** A compact select styled like the rest of the console. */
export function InlineSelect<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        "h-8 cursor-pointer rounded-full border border-line bg-surface-2 px-3 text-xs text-cream outline-none transition-colors hover:border-line-strong focus:border-gold/60",
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
