"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type * as Leaflet from "leaflet";
import { cn } from "@/lib/utils/cn";
import { BASE, type GeoPoint } from "@/lib/domain/geo";

/**
 * Leaflet, loaded on demand.
 *
 * Leaflet touches `window` at import time, so it is imported inside an effect
 * and never during server rendering. Tiles are CARTO's dark basemap: no API
 * key, no account (the milestone plan keeps third-party accounts out until
 * M3+), and it sits in the carbon-and-gold palette instead of fighting it.
 */

export type L = typeof Leaflet;

const TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export interface MapContext {
  L: L;
  map: Leaflet.Map;
}

export function useLeafletMap({
  center = BASE,
  zoom = 12,
  scrollWheelZoom = false,
}: { center?: GeoPoint; zoom?: number; scrollWheelZoom?: boolean } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ctx, setCtx] = useState<MapContext | null>(null);
  // Initial view only — later centre changes are the caller's job (fitBounds).
  const initial = useRef({ center, zoom, scrollWheelZoom });

  useEffect(() => {
    let map: Leaflet.Map | null = null;
    let cancelled = false;
    void import("leaflet").then((mod) => {
      const L = ((mod as unknown as { default?: L }).default ?? mod) as L;
      if (cancelled || !ref.current) return;
      const { center, zoom, scrollWheelZoom } = initial.current;
      map = L.map(ref.current, {
        zoomControl: false,
        scrollWheelZoom,
        attributionControl: true,
      }).setView([center.lat, center.lng], zoom);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer(TILES, { attribution: ATTRIBUTION, subdomains: "abcd", maxZoom: 19 }).addTo(map);
      setCtx({ L, map });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return { ref, ctx };
}

/** A layer group that is cleared and redrawn whenever `deps` change. */
export function useLayer(
  ctx: MapContext | null,
  draw: (L: L, group: Leaflet.LayerGroup, map: Leaflet.Map) => void,
  deps: unknown[],
) {
  const drawRef = useRef(draw);
  useEffect(() => {
    drawRef.current = draw;
  });
  useEffect(() => {
    if (!ctx) return;
    const group = ctx.L.layerGroup().addTo(ctx.map);
    drawRef.current(ctx.L, group, ctx.map);
    return () => {
      group.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, ...deps]);
}

/** Re-render on an interval — drives the live markers. */
export function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

/* ---------------------------------- pins ---------------------------------- */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function basePin(L: L) {
  return L.divIcon({
    className: "nxl-pin",
    html: `<span class="nxl-pin-base">NXL</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export function carPin(L: L, color: string, opts: { pulse?: boolean; label?: string } = {}) {
  return L.divIcon({
    className: "nxl-pin",
    html: `<span class="nxl-pin-car" style="--pin:${color}">${opts.pulse ? '<span class="nxl-pin-halo"></span>' : ""}<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v6a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zm2.2 0h9.6l-1.1-3.4a.6.6 0 0 0-.6-.4H8.9a.6.6 0 0 0-.6.4zM7.5 14.5a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4m9 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4"/></svg>${opts.label ? `<span class="nxl-pin-label">${esc(opts.label)}</span>` : ""}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

export function dotPin(L: L, color: string, label?: string) {
  return L.divIcon({
    className: "nxl-pin",
    html: `<span class="nxl-pin-dot" style="--pin:${color}"></span>${label ? `<span class="nxl-pin-label">${esc(label)}</span>` : ""}`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export function personPin(L: L, color: string, initials: string, moving: boolean) {
  return L.divIcon({
    className: "nxl-pin",
    html: `<span class="nxl-pin-person" style="--pin:${color}">${moving ? '<span class="nxl-pin-halo"></span>' : ""}${esc(initials)}${moving ? '<span class="nxl-pin-live"></span>' : ""}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

/** Popup markup — plain HTML strings, escaped. */
export function popupHtml(title: string, rows: [string, string][]) {
  return `<div class="nxl-popup"><p class="nxl-popup-title">${esc(title)}</p>${rows
    .map(([k, v]) => `<p><span>${esc(k)}</span><b>${esc(v)}</b></p>`)
    .join("")}</div>`;
}

/* ---------------------------------- frame --------------------------------- */

export const PIN_COLORS = ["#c4a068", "#3f7fd0", "#c0508a", "#46d98a", "#ff9f43", "#7aa9e0", "#e6cc9a", "#ff5566"];

export function MapFrame({
  mapRef,
  height,
  className,
  children,
  loading,
}: {
  mapRef: React.RefObject<HTMLDivElement | null>;
  height: number | string;
  className?: string;
  children?: ReactNode;
  loading?: boolean;
}) {
  return (
    <div
      className={cn("nxl-map relative isolate overflow-hidden rounded-xl border border-line bg-surface-2", className)}
      style={{ height }}
    >
      <div ref={mapRef} className="absolute inset-0" />
      {loading ? (
        <div aria-hidden className="skeleton pointer-events-none absolute inset-0" />
      ) : null}
      {children}
    </div>
  );
}

/** Small floating panel inside a map. */
export function MapOverlay({
  children,
  position = "top-left",
  className,
}: {
  children: ReactNode;
  position?: "top-left" | "top-right" | "bottom-left";
  className?: string;
}) {
  const pos = {
    "top-left": "left-3 top-3",
    "top-right": "right-3 top-3",
    "bottom-left": "bottom-3 left-3",
  }[position];
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-[500] max-w-[calc(100%-1.5rem)] rounded-lg border border-line-strong bg-ink/85 px-3 py-2 text-xs text-cream shadow-elev-2 backdrop-blur",
        pos,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn("inline-block", dashed ? "h-0 w-4 border-t-2 border-dashed" : "h-2 w-2 rounded-full")}
        style={dashed ? { borderColor: color } : { background: color }}
      />
      {label}
    </span>
  );
}
