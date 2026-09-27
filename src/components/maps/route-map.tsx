"use client";

import { useEffect } from "react";
import { BASE, routeBetween, type GeoPoint } from "@/lib/domain/geo";
import type { Reservation } from "@/lib/domain/operations";
import { destinationFor } from "@/lib/domain/telemetry";
import { basePin, dotPin, LegendDot, MapFrame, MapOverlay, personPin, popupHtml, useLayer, useLeafletMap } from "./leaflet";

/**
 * The driver's job map: depot, the driver, and where the car is going.
 * The prototype's version dropped three pins with nothing joining them; this
 * one draws the route so the driver can see the shape of the run at a glance.
 */
export function RouteMap({
  job,
  driver,
  height = 280,
}: {
  job: Reservation;
  driver: { point: GeoPoint | null; initials: string; color: string };
  height?: number;
}) {
  const { ref, ctx } = useLeafletMap({ zoom: 12 });
  const dest = destinationFor(job);

  useEffect(() => {
    if (!ctx) return;
    const pts: GeoPoint[] = [BASE, dest, ...(driver.point ? [driver.point] : [])];
    ctx.map.fitBounds(ctx.L.latLngBounds(pts.map((p) => [p.lat, p.lng])).pad(0.3), { maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, job.id]);

  useLayer(
    ctx,
    (L, group) => {
      L.marker([BASE.lat, BASE.lng], { icon: basePin(L) }).bindPopup(popupHtml("NXL depot", [["Pick up the car", "1200 Ocean Drive"]])).addTo(group);
      const route = routeBetween(BASE, dest, `${job.id}:drv`).map((p) => [p.lat, p.lng] as [number, number]);
      L.polyline(route, { color: "#3f7fd0", weight: 3.5, opacity: 0.85 }).addTo(group);
      L.marker([dest.lat, dest.lng], { icon: dotPin(L, "#3f7fd0", "Guest") })
        .bindPopup(popupHtml("Deliver to", [["Guest", job.guestName], ["Address", job.deliveryAddress ?? "Depot"]]))
        .addTo(group);
      if (driver.point) {
        L.marker([driver.point.lat, driver.point.lng], { icon: personPin(L, driver.color, driver.initials, true), zIndexOffset: 1000 })
          .bindPopup(popupHtml("You", [["Position", `${driver.point.lat.toFixed(4)}, ${driver.point.lng.toFixed(4)}`]]))
          .addTo(group);
      }
    },
    [job.id, dest.lat, dest.lng, driver.point?.lat, driver.point?.lng],
  );

  return (
    <MapFrame mapRef={ref} height={height} loading={!ctx}>
      <MapOverlay position="bottom-left" className="flex flex-wrap gap-x-3 gap-y-1">
        <LegendDot color="#c4a068" label="Depot" />
        <LegendDot color="#3f7fd0" label="Route" />
        {driver.point ? <LegendDot color={driver.color} label="You" /> : null}
      </MapOverlay>
    </MapFrame>
  );
}
