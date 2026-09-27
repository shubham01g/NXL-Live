"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { money, moneyCompact } from "@/lib/domain/format";

/**
 * Console charts. Plain SVG — two chart types don't justify a charting
 * library in the bundle.
 *
 * Series colours are validated for this dark surface (#111114): inside the
 * lightness band, above the chroma floor, and separable under the three
 * common colour-vision deficiencies. Gold leads so the brand colour carries
 * the biggest business line. Identity is never colour alone — every chart
 * has a legend, direct labels, a hover readout and a table view.
 */
export const SERIES_COLORS = ["#b88a3e", "#3f7fd0", "#c0508a"] as const;

export interface StackedDatum {
  label: string;
  values: number[];
}

const W = 720;
const H = 280;
const PAD = { top: 16, right: 84, bottom: 32, left: 56 };
const GAP = 2;

function niceMax(value: number) {
  const step = 10 ** Math.floor(Math.log10(value || 1));
  return Math.ceil(value / step) * step;
}

export function StackedBars({
  data,
  series,
  title,
}: {
  data: StackedDatum[];
  series: string[];
  title: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  const totals = data.map((d) => d.values.reduce((a, b) => a + b, 0));
  const max = niceMax(Math.max(...totals));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / data.length;
  const barW = Math.min(56, slot * 0.56);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  return (
    <figure className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4" aria-label="Legend">
          {series.map((name, i) => (
            <li key={name} className="flex items-center gap-2 text-xs text-cream/80">
              <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES_COLORS[i] }} />
              {name}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          className="text-xs text-gold hover:underline"
          aria-pressed={asTable}
        >
          {asTable ? "Show chart" : "View as table"}
        </button>
      </div>

      {asTable ? (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-line bg-surface-2/60 text-left">
                <th scope="col" className="px-4 py-2.5 font-mono text-[0.625rem] font-normal uppercase tracking-[0.18em] text-muted">
                  Month
                </th>
                {series.map((s) => (
                  <th key={s} scope="col" className="px-4 py-2.5 text-right font-mono text-[0.625rem] font-normal uppercase tracking-[0.18em] text-muted">
                    {s}
                  </th>
                ))}
                <th scope="col" className="px-4 py-2.5 text-right font-mono text-[0.625rem] font-normal uppercase tracking-[0.18em] text-muted">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={d.label} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-2.5 text-left font-normal text-cream">
                    {d.label}
                  </th>
                  {d.values.map((v, j) => (
                    <td key={j} className="px-4 py-2.5 text-right tabular-nums text-cream/85">
                      {money(v)}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right tabular-nums text-cream">{money(totals[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} className="h-auto w-full">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="rgba(196,160,104,0.12)" strokeWidth={1} />
                <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px]">
                  {moneyCompact(t)}
                </text>
              </g>
            ))}

            {data.map((d, i) => {
              const x = PAD.left + slot * i + (slot - barW) / 2;
              let base = 0;
              const last = d.values.length - 1;
              return (
                <g key={d.label} opacity={hover === null || hover === i ? 1 : 0.45}>
                  {d.values.map((v, j) => {
                    const top = y(base + v);
                    const bottom = y(base);
                    base += v;
                    // Leave a 2px surface gap between stacked segments.
                    const h = Math.max(0, bottom - top - (j > 0 ? GAP : 0));
                    const isTop = j === last;
                    const r = isTop ? Math.min(4, h) : 0;
                    return (
                      <path
                        key={j}
                        fill={SERIES_COLORS[j]}
                        d={
                          r
                            ? `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z`
                            : `M${x},${top} H${x + barW} V${top + h} H${x} Z`
                        }
                      />
                    );
                  })}
                  <text x={x + barW / 2} y={H - 10} textAnchor="middle" className="fill-muted text-[11px]">
                    {d.label}
                  </text>
                </g>
              );
            })}

            {/* Direct labels on the latest column. */}
            {(() => {
              const i = data.length - 1;
              const x = PAD.left + slot * i + (slot + barW) / 2 + 8;
              let base = 0;
              return data[i].values.map((v, j) => {
                const mid = y(base + v / 2);
                base += v;
                return (
                  <text key={j} x={x} y={mid} dy="0.32em" className="fill-cream/75 text-[11px]">
                    {series[j]}
                  </text>
                );
              });
            })()}

            {/* Hit targets: the whole column, wider than the bar. */}
            {data.map((d, i) => (
              <rect
                key={d.label}
                x={PAD.left + slot * i}
                y={PAD.top}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </svg>

          {hover !== null ? (
            <div
              role="status"
              className="pointer-events-none absolute top-2 z-10 w-48 -translate-x-1/2 rounded-lg border border-line-strong bg-surface-2/95 p-3 text-xs shadow-elev-3 backdrop-blur"
              style={{
                left: `${((PAD.left + slot * hover + slot / 2) / W) * 100}%`,
              }}
            >
              <p className="mb-2 font-medium text-cream">{data[hover].label}</p>
              {series.map((s, j) => (
                <p key={s} className="flex items-center justify-between gap-3 py-0.5">
                  <span className="flex items-center gap-2 text-cream/75">
                    <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: SERIES_COLORS[j] }} />
                    {s}
                  </span>
                  <span className="tabular-nums text-cream">{money(data[hover].values[j])}</span>
                </p>
              ))}
              <p className="mt-2 flex justify-between border-t border-line pt-2 text-cream">
                <span>Total</span>
                <span className="tabular-nums">{money(totals[hover])}</span>
              </p>
            </div>
          ) : null}
        </div>
      )}
    </figure>
  );
}

/**
 * Ranked horizontal bars for a single measure. One series, so no legend —
 * the panel title names it — and every bar carries its value.
 */
export function RankedBars({
  rows,
  format = money,
  className,
}: {
  rows: { label: string; value: number; sub?: string }[];
  format?: (v: number) => string;
  className?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className={cn("space-y-3.5", className)}>
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-cream/85">
              {r.label}
              {r.sub ? <span className="ml-2 text-xs text-muted">{r.sub}</span> : null}
            </span>
            <span className="shrink-0 tabular-nums text-cream">{format(r.value)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full"
              style={{ width: `${(r.value / max) * 100}%`, background: SERIES_COLORS[0] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
