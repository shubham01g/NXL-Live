import { BASE_COORDS } from "./site";

/**
 * Geography for delivery pricing and the live maps.
 *
 * The prototype geocoded addresses through Nominatim on every keystroke-ish
 * click. That is a third-party call with a strict usage policy, so M2 resolves
 * addresses against a list of the places our guests actually ask for, and
 * falls back to a stable point inside the service area for anything else.
 * M4 swaps `geocode` for a real provider; every caller keeps its shape.
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Place extends GeoPoint {
  id: string;
  name: string;
  address: string;
  area: string;
}

export const BASE: GeoPoint = BASE_COORDS;

export const PLACES: Place[] = [
  { id: "faena", name: "Faena Hotel", address: "3201 Collins Ave, Miami Beach", area: "Mid-Beach", lat: 25.8138, lng: -80.1224 },
  { id: "1hotel", name: "1 Hotel South Beach", address: "2341 Collins Ave, Miami Beach", area: "South Beach", lat: 25.799, lng: -80.127 },
  { id: "fontainebleau", name: "Fontainebleau", address: "4441 Collins Ave, Miami Beach", area: "Mid-Beach", lat: 25.8187, lng: -80.1225 },
  { id: "setai", name: "The Setai", address: "2001 Collins Ave, Miami Beach", area: "South Beach", lat: 25.7957, lng: -80.1279 },
  { id: "ocean-drive", name: "Ocean Drive", address: "1200 Ocean Drive, Miami Beach", area: "South Beach", lat: 25.7825, lng: -80.1307 },
  { id: "venetian", name: "Venetian Islands", address: "Venetian Way, Miami Beach", area: "Venetian Islands", lat: 25.792, lng: -80.156 },
  { id: "north-bay", name: "North Bay Road", address: "North Bay Rd, Miami Beach", area: "Mid-Beach", lat: 25.82, lng: -80.14 },
  { id: "fisher", name: "Fisher Island Club", address: "1 Fisher Island Dr", area: "Fisher Island", lat: 25.761, lng: -80.142 },
  { id: "brickell", name: "Brickell City Centre", address: "701 S Miami Ave, Miami", area: "Brickell", lat: 25.767, lng: -80.1932 },
  { id: "design-district", name: "Design District", address: "140 NE 39th St, Miami", area: "Design District", lat: 25.813, lng: -80.193 },
  { id: "wynwood", name: "Wynwood Walls", address: "2516 NW 2nd Ave, Miami", area: "Wynwood", lat: 25.801, lng: -80.1994 },
  { id: "bal-harbour", name: "Bal Harbour Shops", address: "9700 Collins Ave, Bal Harbour", area: "Bal Harbour", lat: 25.8883, lng: -80.125 },
  { id: "key-biscayne", name: "Key Biscayne", address: "Crandon Blvd, Key Biscayne", area: "Key Biscayne", lat: 25.6937, lng: -80.1628 },
  { id: "coconut-grove", name: "Coconut Grove", address: "3015 Grand Ave, Miami", area: "Coconut Grove", lat: 25.728, lng: -80.241 },
  { id: "coral-gables", name: "The Biltmore", address: "1200 Anastasia Ave, Coral Gables", area: "Coral Gables", lat: 25.7215, lng: -80.2793 },
  { id: "mia", name: "Miami International Airport", address: "2100 NW 42nd Ave, Miami", area: "Airport", lat: 25.7959, lng: -80.287 },
  { id: "opf", name: "Opa-locka Executive Airport", address: "14201 NW 42nd Ave, Opa-locka", area: "Private aviation", lat: 25.907, lng: -80.278 },
  { id: "aventura", name: "Aventura Mall", address: "19501 Biscayne Blvd, Aventura", area: "Aventura", lat: 25.9565, lng: -80.1429 },
];

/** Great-circle distance in miles. */
export function milesBetween(a: GeoPoint, b: GeoPoint): number {
  const R = 3958.8;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Road miles from the depot. Straight-line × 1.25 is a fair Miami road factor. */
export function roadMilesFromBase(point: GeoPoint): number {
  return Math.round(milesBetween(BASE, point) * 1.25 * 10) / 10;
}

/** Small deterministic hash so the same string always lands on the same point. */
export function seed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Murmur3 finaliser: FNV alone barely moves the high bits for strings that
  // differ only in their last character ("CODE#g1", "CODE#g2").
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Resolve an address to a point. Known places match by name or street; any
 * other address lands on a stable point 2–9 miles from the depot, so the
 * quote a guest sees never changes between visits.
 */
export function geocode(address: string): { point: GeoPoint; place: Place | null } {
  const q = address.trim().toLowerCase();
  if (!q) return { point: BASE, place: null };
  const place =
    PLACES.find(
      (p) =>
        q.includes(p.name.toLowerCase()) ||
        p.name.toLowerCase().includes(q) ||
        q.includes(p.address.toLowerCase().split(",")[0]),
    ) ?? null;
  if (place) return { point: { lat: place.lat, lng: place.lng }, place };

  const angle = seed(q) * Math.PI * 2;
  const miles = 2 + seed(`${q}#r`) * 7;
  // ~69 miles per degree of latitude; longitude shrinks with cos(lat).
  return {
    point: {
      lat: BASE.lat + (Math.sin(angle) * miles) / 69,
      lng: BASE.lng + (Math.cos(angle) * miles) / (69 * Math.cos((BASE.lat * Math.PI) / 180)),
    },
    place: null,
  };
}

/* --------------------------------- routes --------------------------------- */

/**
 * A plausible road-shaped path between two points: a gentle bow with a few
 * jittered waypoints. Not turn-by-turn — that is M4's routing provider — but
 * it reads as a drive rather than a ruler line.
 */
export function routeBetween(from: GeoPoint, to: GeoPoint, key: string, steps = 8): GeoPoint[] {
  const pts: GeoPoint[] = [];
  const bow = (seed(key) - 0.5) * 0.22;
  const dx = to.lng - from.lng;
  const dy = to.lat - from.lat;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const arc = Math.sin(Math.PI * t) * bow;
    const jitter = i === 0 || i === steps ? 0 : (seed(`${key}:${i}`) - 0.5) * 0.0012;
    pts.push({
      lat: from.lat + dy * t - dx * arc + jitter,
      lng: from.lng + dx * t + dy * arc + jitter,
    });
  }
  return pts;
}

/** The point a fraction `t` (0–1) of the way along a polyline. */
export function pointAlong(route: GeoPoint[], t: number): GeoPoint {
  if (route.length === 0) return BASE;
  if (route.length === 1 || t <= 0) return route[0];
  if (t >= 1) return route[route.length - 1];

  const segs: number[] = [];
  let total = 0;
  for (let i = 1; i < route.length; i++) {
    const d = milesBetween(route[i - 1], route[i]);
    segs.push(d);
    total += d;
  }
  let target = t * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i]) {
      const f = segs[i] === 0 ? 0 : target / segs[i];
      const a = route[i];
      const b = route[i + 1];
      return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
    }
    target -= segs[i];
  }
  return route[route.length - 1];
}

/** Everything up to fraction `t` — the "travelled" part of a route. */
export function routeUpTo(route: GeoPoint[], t: number): GeoPoint[] {
  if (route.length < 2) return route;
  const out: GeoPoint[] = [route[0]];
  const end = pointAlong(route, t);
  const n = route.length - 1;
  const idx = Math.min(n, Math.floor(t * n));
  for (let i = 1; i <= idx; i++) out.push(route[i]);
  out.push(end);
  return out;
}

/** A South Beach loop for cars that are out but have no set destination. */
export function cruiseLoop(key: string): GeoPoint[] {
  const stops = PLACES.filter((p) => ["ocean-drive", "setai", "1hotel", "faena", "fontainebleau", "north-bay", "venetian"].includes(p.id));
  const start = Math.floor(seed(key) * stops.length);
  const loop = [...stops.slice(start), ...stops.slice(0, start)];
  return [...loop, loop[0]].map(({ lat, lng }) => ({ lat, lng }));
}
