"use client";

import { useEffect, useMemo, useRef } from "react";
import { Radio } from "lucide-react";
import { BASE } from "@/lib/domain/geo";
import type { Reservation } from "@/lib/domain/operations";
import { carPosition, isLive, rentalProgress, travelledPath } from "@/lib/domain/telemetry";
import { ProgressBar } from "@/components/ui/feedback";
import {
  basePin,
  carPin,
  LegendDot,
  MapFrame,
  MapOverlay,
  PIN_COLORS,
  popupHtml,
  useLayer,
  useLeafletMap,
  useNow,
} from "./leaflet";

/**
 * Every car currently out, on one map.
 *
 * Ported from the prototype's CheckedOutFleetMap: a pulsing marker per car,
 * the path it has driven, and a popup with the guest and time left. Refreshes
 * every three seconds. Real GPS from the driver or renter wins when fresh;
 * otherwise the position is simulated from the rental window.
 */

const SOURCE_LABEL = { driver: "Driver GPS", renter: "Renter GPS", simulated: "Simulated", depot: "At depot" } as const;

function timeLeft(r: Reservation, now: number) {
  const ms = r.window.end - now;
  if (ms <= 0) return "Overdue";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h ${m}m left`;
}

export function FleetMap({
  reservations,
  compact = false,
  height,
  onSelect,
}: {
  reservations: Reservation[];
  compact?: boolean;
  height?: number;
  onSelect?: (r: Reservation) => void;
}) {
  const now = useNow(3000);
  const { ref, ctx } = useLeafletMap({ zoom: compact ? 11 : 12 });
  const live = useMemo(
    () => reservations.filter((r) => r.listingKind === "car" && isLive(r)),
    [reservations],
  );
  const colors = useMemo(() => new Map(live.map((r, i) => [r.id, PIN_COLORS[i % PIN_COLORS.length]])), [live]);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // Frame the fleet once when the map (or the set of cars) changes.
  const liveKey = live.map((r) => r.id).join(",");
  useEffect(() => {
    if (!ctx) return;
    const pts = [BASE, ...live.map((r) => carPosition(r, Date.now()))];
    if (pts.length > 1) ctx.map.fitBounds(ctx.L.latLngBounds(pts.map((p) => [p.lat, p.lng])).pad(0.3), { maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, liveKey]);

  useLayer(
    ctx,
    (L, group) => {
      L.marker([BASE.lat, BASE.lng], { icon: basePin(L), zIndexOffset: 1000 })
        .bindPopup(popupHtml("NXL depot", [["Address", "1200 Ocean Drive"], ["Cars out", String(live.length)]]))
        .addTo(group);
      for (const r of live) {
        const color = colors.get(r.id)!;
        const trail = travelledPath(r, now);
        if (trail.length > 1) {
          L.polyline(trail.map((p) => [p.lat, p.lng] as [number, number]), { color, weight: 3, opacity: 0.75 }).addTo(group);
        }
        const pos = carPosition(r, now);
        const marker = L.marker([pos.lat, pos.lng], {
          icon: carPin(L, color, { pulse: true, label: compact ? undefined : r.listingName.split(" ").slice(0, 2).join(" ") }),
        })
          .bindPopup(
            popupHtml(r.listingName, [
              ["Guest", r.guestName],
              ["Reference", r.reference],
              ["Progress", `${Math.round(rentalProgress(r, now) * 100)}%`],
              ["Time", timeLeft(r, now)],
              ["Position", `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`],
              ["Source", SOURCE_LABEL[pos.source]],
            ]),
          )
          .addTo(group);
        marker.on("click", () => onSelectRef.current?.(r));
      }
    },
    [now, live, colors, compact],
  );

  return (
    <div className="space-y-4">
      <MapFrame mapRef={ref} height={height ?? (compact ? 260 : 520)} loading={!ctx}>
        <MapOverlay>
          <p className="flex items-center gap-2 font-medium">
            <Radio aria-hidden width={13} height={13} className="animate-live text-success" />
            Live · {live.length} {live.length === 1 ? "car" : "cars"} out
          </p>
          {!compact ? <p className="mt-0.5 text-muted">Updates every 3 seconds</p> : null}
        </MapOverlay>
        {!compact ? (
          <MapOverlay position="bottom-left" className="flex flex-wrap gap-x-3 gap-y-1">
            <LegendDot color="#c4a068" label="Depot" />
            <LegendDot color="#3f7fd0" label="Car on trip" />
            <LegendDot color="#c4a068" label="Driven path" dashed />
          </MapOverlay>
        ) : null}
        {live.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 z-[400] grid place-items-center">
            <p className="rounded-lg border border-line bg-ink/85 px-4 py-2 text-sm text-muted">No cars are out right now.</p>
          </div>
        ) : null}
      </MapFrame>

      {!compact && live.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {live.map((r) => {
            const pos = carPosition(r, now);
            const progress = rentalProgress(r, now);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    ctx?.map.flyTo([pos.lat, pos.lng], 15, { duration: 0.8 });
                    onSelect?.(r);
                  }}
                  className="w-full rounded-xl border border-line bg-surface-1/60 p-4 text-left transition-colors hover:border-gold/40"
                >
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors.get(r.id) }} />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-cream">{r.listingName}</p>
                    <span className="text-xs text-muted">{r.reference}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {r.guestName} · {SOURCE_LABEL[pos.source]}
                  </p>
                  <ProgressBar className="mt-3" value={progress} label={`${r.listingName} trip progress`} />
                  <p className="mt-2 flex justify-between text-xs text-muted-dim">
                    <span>{Math.round(progress * 100)}% of rental</span>
                    <span>{timeLeft(r, now)}</span>
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
