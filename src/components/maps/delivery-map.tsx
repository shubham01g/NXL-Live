"use client";

import { useMemo, useState } from "react";
import { BASE, geocode, roadMilesFromBase, type GeoPoint } from "@/lib/domain/geo";
import { PRICING } from "@/lib/domain/pricing";
import type { Reservation } from "@/lib/domain/operations";
import { SegmentedControl } from "@/components/ui/controls";
import { Badge } from "@/components/ui/primitives";
import { basePin, dotPin, LegendDot, MapFrame, MapOverlay, popupHtml, useLayer, useLeafletMap } from "./leaflet";

/**
 * Where the upcoming deliveries and collections are, against the base
 * delivery radius. The prototype built this map and never rendered it; it
 * earns its place on the dispatch screen, where "which jobs are outside the
 * zone" is the question an operator actually asks.
 */

type Kind = "all" | "delivery" | "pickup";

interface Stop {
  id: string;
  kind: "delivery" | "pickup";
  r: Reservation;
  address: string;
  point: GeoPoint;
  miles: number;
}

export function DeliveryMap({ reservations, height = 420 }: { reservations: Reservation[]; height?: number }) {
  const [kind, setKind] = useState<Kind>("all");
  const { ref, ctx } = useLeafletMap({ zoom: 11 });

  const stops = useMemo(() => {
    const out: Stop[] = [];
    for (const r of reservations) {
      if (r.status === "cancelled" || r.status === "completed") continue;
      if (r.deliveryAddress) {
        const point = r.deliveryPoint ?? geocode(r.deliveryAddress).point;
        out.push({ id: `${r.id}-d`, kind: "delivery", r, address: r.deliveryAddress, point, miles: roadMilesFromBase(point) });
      }
      if (r.pickupAddress) {
        const point = r.pickupPoint ?? geocode(r.pickupAddress).point;
        out.push({ id: `${r.id}-p`, kind: "pickup", r, address: r.pickupAddress, point, miles: roadMilesFromBase(point) });
      }
    }
    return out;
  }, [reservations]);

  const shown = stops.filter((s) => kind === "all" || s.kind === kind);

  useLayer(
    ctx,
    (L, group) => {
      L.circle([BASE.lat, BASE.lng], {
        radius: PRICING.delivery.baseMiles * 1609.34,
        color: "#c4a068",
        weight: 1.5,
        opacity: 0.6,
        fillOpacity: 0.05,
        dashArray: "4 6",
      }).addTo(group);
      L.marker([BASE.lat, BASE.lng], { icon: basePin(L), zIndexOffset: 1000 }).addTo(group);
      for (const s of shown) {
        L.marker([s.point.lat, s.point.lng], { icon: dotPin(L, s.kind === "delivery" ? "#46d98a" : "#3f7fd0") })
          .bindPopup(
            popupHtml(s.kind === "delivery" ? "Delivery" : "Collection", [
              ["Guest", s.r.guestName],
              ["Listing", s.r.listingName],
              ["Address", s.address],
              ["Distance", `${s.miles} mi`],
            ]),
          )
          .addTo(group);
      }
    },
    [shown],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<Kind>
          label="Show"
          size="sm"
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: `All (${stops.length})` },
            { value: "delivery", label: "Deliveries" },
            { value: "pickup", label: "Collections" },
          ]}
        />
        <p className="text-xs text-muted">
          Base zone {PRICING.delivery.baseMiles} mi · ${PRICING.delivery.extraPerMile}/mi beyond
        </p>
      </div>
      <MapFrame mapRef={ref} height={height} loading={!ctx}>
        <MapOverlay position="bottom-left" className="flex flex-wrap gap-x-3 gap-y-1">
          <LegendDot color="#c4a068" label="Base zone" dashed />
          <LegendDot color="#46d98a" label="Delivery" />
          <LegendDot color="#3f7fd0" label="Collection" />
        </MapOverlay>
      </MapFrame>
      <ul className="grid gap-2 sm:grid-cols-2">
        {shown.map((s) => {
          const extra = s.miles > PRICING.delivery.baseMiles;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => ctx?.map.flyTo([s.point.lat, s.point.lng], 14, { duration: 0.8 })}
                className="flex w-full items-center gap-3 rounded-lg border border-line bg-surface-1/50 px-3.5 py-3 text-left transition-colors hover:border-gold/40"
              >
                <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.kind === "delivery" ? "#46d98a" : "#3f7fd0" }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-cream">{s.address}</span>
                  <span className="block truncate text-xs text-muted">
                    {s.r.reference} · {s.r.guestName} · {s.miles} mi
                  </span>
                </span>
                {extra ? <Badge tone="warning">Extra mileage</Badge> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
