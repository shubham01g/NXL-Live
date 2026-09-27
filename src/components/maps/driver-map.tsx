"use client";

import { Radio } from "lucide-react";
import { BASE } from "@/lib/domain/geo";
import { initials } from "@/lib/domain/account";
import type { Driver, Reservation } from "@/lib/domain/operations";
import { destinationFor, driverPosition } from "@/lib/domain/telemetry";
import { routeUpTo } from "@/lib/domain/geo";
import { ProgressBar } from "@/components/ui/feedback";
import {
  basePin,
  dotPin,
  LegendDot,
  MapFrame,
  MapOverlay,
  PIN_COLORS,
  personPin,
  popupHtml,
  useLayer,
  useLeafletMap,
  useNow,
} from "./leaflet";

/**
 * Dispatch map — every on-duty driver, where they are and where they are
 * headed. The prototype's DriverTrackingMap: drivers on a job travel the
 * route to the guest (dashed ahead, solid behind); free drivers patrol the
 * beach. A driver signed into the portal with location on shows their real
 * GPS position instead.
 */
export function DriverMap({
  drivers,
  reservations,
  height = 480,
}: {
  drivers: Driver[];
  reservations: Reservation[];
  height?: number;
}) {
  const now = useNow(2000);
  const { ref, ctx } = useLeafletMap({ zoom: 12 });
  const onDuty = drivers.filter((d) => d.status !== "off-duty");
  const colorOf = (d: Driver, i: number) => d.color ?? PIN_COLORS[i % PIN_COLORS.length];
  const fixes = onDuty.map((d) => driverPosition(d, reservations, now));

  useLayer(
    ctx,
    (L, group) => {
      L.marker([BASE.lat, BASE.lng], { icon: basePin(L), zIndexOffset: 1000 }).addTo(group);
      onDuty.forEach((d, i) => {
        const fix = fixes[i];
        const color = colorOf(d, i);
        const moving = !!fix.job && (fix.job.driverJob === "en_route" || fix.job.driverJob === "picked_up");
        if (fix.job && fix.route) {
          const full = fix.route.map((p) => [p.lat, p.lng] as [number, number]);
          L.polyline(full, { color, weight: 2, opacity: 0.5, dashArray: "5 7" }).addTo(group);
          if (moving) {
            L.polyline(routeUpTo(fix.route, fix.progress).map((p) => [p.lat, p.lng] as [number, number]), { color, weight: 3.5, opacity: 0.9 }).addTo(group);
          }
          const dest = destinationFor(fix.job);
          L.marker([dest.lat, dest.lng], { icon: dotPin(L, color) })
            .bindPopup(popupHtml(fix.job.deliveryAddress ?? "Destination", [["Booking", fix.job.reference], ["Guest", fix.job.guestName]]))
            .addTo(group);
        }
        L.marker([fix.lat, fix.lng], { icon: personPin(L, color, initials(d.name), moving), zIndexOffset: 500 })
          .bindPopup(
            popupHtml(d.name, [
              ["Vehicle", d.vehicle ?? "—"],
              ["Status", fix.job ? `On ${fix.job.reference}` : "Free · patrolling"],
              ["Source", fix.source === "driver" ? "Driver GPS" : "Simulated"],
              ["Position", `${fix.lat.toFixed(4)}, ${fix.lng.toFixed(4)}`],
            ]),
          )
          .addTo(group);
      });
    },
    [now, drivers, reservations],
  );

  return (
    <div className="space-y-4">
      <MapFrame mapRef={ref} height={height} loading={!ctx}>
        <MapOverlay>
          <p className="flex items-center gap-2 font-medium">
            <Radio aria-hidden width={13} height={13} className="animate-live text-success" />
            Live · {onDuty.length} drivers on duty
          </p>
          <p className="mt-0.5 text-muted">
            {fixes.filter((f) => f.job).length} active jobs · updates every 2 seconds
          </p>
        </MapOverlay>
        <MapOverlay position="bottom-left" className="flex flex-wrap gap-x-3 gap-y-1">
          <LegendDot color="#c4a068" label="Depot" />
          <LegendDot color="#3f7fd0" label="Route ahead" dashed />
          <LegendDot color="#46d98a" label="Moving" />
        </MapOverlay>
      </MapFrame>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {onDuty.map((d, i) => {
          const fix = fixes[i];
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => ctx?.map.flyTo([fix.lat, fix.lng], 14, { duration: 0.8 })}
                className="w-full rounded-xl border border-line bg-surface-1/60 p-4 text-left transition-colors hover:border-gold/40"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold text-ink"
                    style={{ background: colorOf(d, i) }}
                  >
                    {initials(d.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-cream">{d.name}</p>
                    <p className="truncate text-xs text-muted">
                      {fix.job ? `${fix.job.reference} → ${fix.job.deliveryAddress ?? "depot"}` : "Free · patrolling"}
                    </p>
                  </div>
                </div>
                {fix.job ? (
                  <ProgressBar className="mt-3" value={fix.progress} label={`${d.name} route progress`} />
                ) : null}
                <p className="mt-2 font-mono text-[0.625rem] text-muted-dim">
                  {fix.lat.toFixed(4)}, {fix.lng.toFixed(4)} · {fix.source === "driver" ? "GPS" : "simulated"}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
