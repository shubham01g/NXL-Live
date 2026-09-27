"use client";

import { useEffect } from "react";
import { MapPin, Radio } from "lucide-react";
import { BASE, routeBetween } from "@/lib/domain/geo";
import type { Reservation } from "@/lib/domain/operations";
import {
  carPosition,
  destinationFor,
  isLive,
  rentalProgress,
  rentalRoute,
  travelledPath,
} from "@/lib/domain/telemetry";
import { ProgressBar } from "@/components/ui/feedback";
import { basePin, carPin, dotPin, LegendDot, MapFrame, MapOverlay, popupHtml, useLayer, useLeafletMap, useNow } from "./leaflet";

/**
 * One booking's trip — the prototype's LiveRentalMap. Shown on the member's
 * booking page and in the back office's reservation and customer drawers.
 * Before pickup it shows the planned delivery route; once the car is out,
 * the travelled path and a live marker.
 */
export function LiveRentalMap({ reservation: r, height = 280 }: { reservation: Reservation; height?: number }) {
  const now = useNow(4000);
  const { ref, ctx } = useLeafletMap({ zoom: 12 });
  const live = isLive(r);
  const dest = destinationFor(r);
  const progress = rentalProgress(r, now);

  // Before handover the only route that matters is depot → guest.
  const plannedRoute = () => (live ? rentalRoute(r) : routeBetween(BASE, dest, `${r.id}:out`));

  useEffect(() => {
    if (!ctx) return;
    const pts = plannedRoute();
    ctx.map.fitBounds(ctx.L.latLngBounds(pts.map((p) => [p.lat, p.lng])).pad(0.2), { maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, r, live]);

  useLayer(
    ctx,
    (L, group) => {
      L.marker([BASE.lat, BASE.lng], { icon: basePin(L) }).bindPopup(popupHtml("NXL depot", [["Address", "1200 Ocean Drive"]])).addTo(group);
      const planned = plannedRoute().map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(planned, { color: "#c4a068", weight: 2, opacity: 0.55, dashArray: "6 8" }).addTo(group);
      if (r.deliveryAddress) {
        L.marker([dest.lat, dest.lng], { icon: dotPin(L, "#3f7fd0") })
          .bindPopup(popupHtml("Delivery", [["Address", r.deliveryAddress]]))
          .addTo(group);
      }
      if (live) {
        const trail = travelledPath(r, now).map((p) => [p.lat, p.lng] as [number, number]);
        if (trail.length > 1) L.polyline(trail, { color: "#46d98a", weight: 3.5, opacity: 0.9 }).addTo(group);
        const pos = carPosition(r, now);
        L.marker([pos.lat, pos.lng], { icon: carPin(L, "#46d98a", { pulse: true }), zIndexOffset: 1000 })
          .bindPopup(popupHtml(r.listingName, [["Guest", r.guestName], ["Position", `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`]]))
          .addTo(group);
      }
    },
    [now, r, live],
  );

  const remaining = r.window.end - now;
  const remainingLabel =
    remaining <= 0
      ? "Due back now"
      : remaining > 86_400_000
        ? `${Math.floor(remaining / 86_400_000)}d ${Math.floor((remaining % 86_400_000) / 3_600_000)}h left`
        : `${Math.floor(remaining / 3_600_000)}h ${Math.floor((remaining % 3_600_000) / 60_000)}m left`;

  return (
    <div>
      <MapFrame mapRef={ref} height={height} loading={!ctx}>
        <MapOverlay>
          {live ? (
            <>
              <p className="flex items-center gap-2 font-medium">
                <Radio aria-hidden width={13} height={13} className="animate-live text-success" />
                Live tracking
              </p>
              <p className="mt-0.5 text-muted">{remainingLabel}</p>
            </>
          ) : (
            <p className="flex items-center gap-2 font-medium">
              <MapPin aria-hidden width={13} height={13} className="text-gold" />
              {r.deliveryAddress ? `Delivery to ${r.deliveryAddress}` : "Pickup at the South Beach depot"}
            </p>
          )}
        </MapOverlay>
        <MapOverlay position="bottom-left" className="flex flex-wrap gap-x-3 gap-y-1">
          <LegendDot color="#c4a068" label="Planned" dashed />
          {live ? <LegendDot color="#46d98a" label="Driven" /> : null}
          {r.deliveryAddress ? <LegendDot color="#3f7fd0" label="Delivery" /> : null}
        </MapOverlay>
      </MapFrame>
      {live ? (
        <div className="mt-3">
          <ProgressBar value={progress} tone="success" label="Rental progress" />
          <p className="mt-1.5 flex justify-between text-xs text-muted-dim">
            <span>{Math.round(progress * 100)}% of the rental window</span>
            <span>{remainingLabel}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
