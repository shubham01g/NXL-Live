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

/** Beyond three series the validated trio is extended with three more that hold contrast on #111114. */
export const WIDE_COLORS = [...SERIES_COLORS, "#3fa877", "#d9803a", "#8b7fd6"] as const;

/* --------------------------------- lines ---------------------------------- */

const LW = 720;
const LH = 260;
const LPAD = { top: 16, right: 20, bottom: 32, left: 56 };

/**
 * Line / area chart for trends over time. One to three series; `area` fills
 * the first series with a fading gradient (weekly revenue). Hover a column to
 * read every series at that point.
 */
export function LineChart({
  labels,
  series,
  title,
  area = false,
  format = moneyCompact,
}: {
  labels: string[];
  series: { name: string; values: number[]; dashed?: boolean }[];
  title: string;
  area?: boolean;
  format?: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const plotW = LW - LPAD.left - LPAD.right;
  const plotH = LH - LPAD.top - LPAD.bottom;
  const step = plotW / Math.max(1, labels.length - 1);
  const x = (i: number) => LPAD.left + (labels.length <= 1 ? plotW / 2 : i * step);
  const y = (v: number) => LPAD.top + plotH - (v / max) * plotH;
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
  const gradId = `grad-${title.replace(/\W+/g, "")}`;

  return (
    <figure className="space-y-3">
      {series.length > 1 ? (
        <ul className="flex flex-wrap gap-4" aria-label="Legend">
          {series.map((s, i) => (
            <li key={s.name} className="flex items-center gap-2 text-xs text-cream/80">
              <span
                aria-hidden
                className={cn("w-4", s.dashed ? "border-t-2 border-dashed" : "h-0.5")}
                style={s.dashed ? { borderColor: SERIES_COLORS[i] } : { background: SERIES_COLORS[i] }}
              />
              {s.name}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="relative">
        <svg viewBox={`0 0 ${LW} ${LH}`} role="img" aria-label={title} className="h-auto w-full">
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLORS[0]} stopOpacity={0.45} />
              <stop offset="100%" stopColor={SERIES_COLORS[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={LPAD.left} x2={LW - LPAD.right} y1={y(t * max)} y2={y(t * max)} stroke="rgba(196,160,104,0.12)" />
              <text x={LPAD.left - 10} y={y(t * max)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px]">
                {format(t * max)}
              </text>
            </g>
          ))}
          {labels.map((l, i) => (
            <text key={`${l}-${i}`} x={x(i)} y={LH - 10} textAnchor="middle" className="fill-muted text-[11px]">
              {l}
            </text>
          ))}
          {area && series[0] ? (
            <path
              d={`${path(series[0].values)} L${x(series[0].values.length - 1)},${y(0)} L${x(0)},${y(0)} Z`}
              fill={`url(#${gradId})`}
            />
          ) : null}
          {series.map((s, si) => (
            <path
              key={s.name}
              d={path(s.values)}
              fill="none"
              stroke={SERIES_COLORS[si]}
              strokeWidth={2.5}
              strokeDasharray={s.dashed ? "6 6" : undefined}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {hover !== null ? (
            <line x1={x(hover)} x2={x(hover)} y1={LPAD.top} y2={LPAD.top + plotH} stroke="rgba(245,241,232,0.25)" />
          ) : null}
          {hover !== null
            ? series.map((s, si) => (
                <circle key={s.name} cx={x(hover)} cy={y(s.values[hover])} r={4.5} fill={SERIES_COLORS[si]} stroke="#111114" strokeWidth={2} />
              ))
            : null}
          {labels.map((l, i) => (
            <rect
              key={`hit-${l}-${i}`}
              x={x(i) - step / 2}
              y={LPAD.top}
              width={step}
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
            className="pointer-events-none absolute top-2 z-10 w-44 -translate-x-1/2 rounded-lg border border-line-strong bg-surface-2/95 p-3 text-xs shadow-elev-3 backdrop-blur"
            style={{ left: `${Math.min(86, Math.max(14, (x(hover) / LW) * 100))}%` }}
          >
            <p className="mb-1.5 font-medium text-cream">{labels[hover]}</p>
            {series.map((s, si) => (
              <p key={s.name} className="flex justify-between gap-3 py-0.5">
                <span className="flex items-center gap-2 text-cream/75">
                  <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: SERIES_COLORS[si] }} />
                  {s.name}
                </span>
                <span className="tabular-nums text-cream">{format(s.values[hover])}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </figure>
  );
}

/* --------------------------------- donut ---------------------------------- */

/**
 * Part-to-whole for up to six slices. The legend carries the numbers, so the
 * donut is a shape to glance at, not something to measure.
 */
export function DonutChart({
  slices,
  title,
  format = (v: number) => String(v),
  centerLabel,
}: {
  slices: { label: string; value: number }[];
  title: string;
  format?: (v: number) => string;
  centerLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const R = 70;
  const r = 46;
  const C = 90;

  const arcs: { d: string; color: string; i: number }[] = [];
  let angle = -Math.PI / 2;
  slices.forEach((s, i) => {
    const sweep = total ? (s.value / total) * Math.PI * 2 : 0;
    if (sweep <= 0) return;
    const color = WIDE_COLORS[i % WIDE_COLORS.length];
    if (sweep >= Math.PI * 2 - 0.001) {
      arcs.push({
        d: `M${C - R},${C} a${R},${R} 0 1,0 ${R * 2},0 a${R},${R} 0 1,0 -${R * 2},0 M${C - r},${C} a${r},${r} 0 1,1 ${r * 2},0 a${r},${r} 0 1,1 -${r * 2},0`,
        color,
        i,
      });
      return;
    }
    const a0 = angle;
    const a1 = angle + Math.max(0.001, sweep - 0.02);
    angle += sweep;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad: number, a: number) => `${C + rad * Math.cos(a)},${C + rad * Math.sin(a)}`;
    arcs.push({
      d: `M${p(R, a0)} A${R},${R} 0 ${large} 1 ${p(R, a1)} L${p(r, a1)} A${r},${r} 0 ${large} 0 ${p(r, a0)} Z`,
      color,
      i,
    });
  });

  const focus = hover !== null ? slices[hover] : null;

  return (
    <figure className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <svg viewBox="0 0 180 180" role="img" aria-label={title} className="h-40 w-40 shrink-0">
        {total === 0 ? (
          <circle cx={C} cy={C} r={(R + r) / 2} fill="none" stroke="rgba(196,160,104,0.15)" strokeWidth={R - r} />
        ) : null}
        {arcs.map((a) => (
          <path
            key={a.i}
            d={a.d}
            fill={a.color}
            fillRule="evenodd"
            opacity={hover === null || hover === a.i ? 1 : 0.35}
            onMouseEnter={() => setHover(a.i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <text x={C} y={C - 2} textAnchor="middle" className="fill-cream text-[18px] font-semibold">
          {focus ? format(focus.value) : format(total)}
        </text>
        <text x={C} y={C + 15} textAnchor="middle" className="fill-muted text-[9px] uppercase tracking-widest">
          {focus ? focus.label.slice(0, 16) : (centerLabel ?? "Total")}
        </text>
      </svg>
      <ul className="w-full min-w-0 space-y-2">
        {slices.map((s, i) => (
          <li
            key={s.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="flex items-center gap-2.5 text-sm"
          >
            <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: WIDE_COLORS[i % WIDE_COLORS.length] }} />
            <span className="min-w-0 flex-1 truncate text-cream/85">{s.label}</span>
            <span className="tabular-nums text-cream">{format(s.value)}</span>
            <span className="w-10 text-right text-xs tabular-nums text-muted">
              {total ? Math.round((s.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Stacked 100% bar — utilisation (available / booked / in service). */
export function SplitBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-3">
        {parts.map((p) => (
          <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
            {p.label} · {p.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
