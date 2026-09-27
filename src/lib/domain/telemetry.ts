import type { Driver, Reservation } from "./operations";
import { BASE, cruiseLoop, geocode, pointAlong, routeBetween, routeUpTo, seed, type GeoPoint } from "./geo";

/**
 * Where things are, right now.
 *
 * Real positions come from the driver portal and the renter's phone
 * (`watchPosition`) and win whenever they are fresh. Everything else is
 * simulated deterministically from the booking itself — same booking, same
 * moment, same point — so two operators looking at the fleet map see the same
 * car in the same place. M4 replaces the simulation with the live tracking
 * feed; the maps only ever call these functions.
 */

/** A GPS fix older than this is treated as stale and the simulation resumes. */
export const FRESH_MS = 90_000;

export type PositionSource = "driver" | "renter" | "simulated" | "depot";

export interface LivePosition extends GeoPoint {
  source: PositionSource;
  at: number;
}

export const isLive = (r: Reservation) => r.status === "checked_out" || r.status === "active";

/** Where the guest is — the delivery address, or the depot for a walk-in pickup. */
export function destinationFor(r: Reservation): GeoPoint {
  if (r.deliveryPoint) return r.deliveryPoint;
  if (r.deliveryAddress) return geocode(r.deliveryAddress).point;
  return BASE;
}

/** 0 before the window, 1 after it. */
export function rentalProgress(r: Reservation, now: number): number {
  const span = r.window.end - r.window.start;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (now - r.window.start) / span));
}

const routeCache = new Map<string, GeoPoint[]>();

/**
 * The whole trip as one polyline: depot → guest → a cruise loop around the
 * beach → back to the depot. Progress through the rental window maps onto it.
 */
export function rentalRoute(r: Reservation): GeoPoint[] {
  const key = `${r.id}:${r.deliveryAddress ?? ""}`;
  const cached = routeCache.get(key);
  if (cached) return cached;
  const dest = destinationFor(r);
  const loop = cruiseLoop(r.id);
  const route = [
    ...routeBetween(BASE, dest, `${r.id}:out`),
    ...routeBetween(dest, loop[0], `${r.id}:to-loop`).slice(1),
    ...loop.slice(1),
    ...routeBetween(loop[loop.length - 1], BASE, `${r.id}:home`).slice(1),
  ];
  routeCache.set(key, route);
  return route;
}

/** The car's current position for a booking. */
export function carPosition(r: Reservation, now: number): LivePosition {
  if (r.carPosition && now - r.carPosition.at < FRESH_MS) {
    return { lat: r.carPosition.lat, lng: r.carPosition.lng, source: r.carPosition.source, at: r.carPosition.at };
  }
  if (!isLive(r)) return { ...BASE, source: "depot", at: now };
  return { ...pointAlong(rentalRoute(r), rentalProgress(r, now)), source: "simulated", at: now };
}

/** The part of the trip already driven. */
export function travelledPath(r: Reservation, now: number): GeoPoint[] {
  return routeUpTo(rentalRoute(r), rentalProgress(r, now));
}

/* -------------------------------- drivers -------------------------------- */

/** The job a driver is working on right now, if any. */
export function activeJobFor(driverId: string, reservations: Reservation[]): Reservation | null {
  return (
    reservations
      .filter(
        (r) =>
          r.driverId === driverId &&
          r.driverJob !== "delivered" &&
          r.status !== "cancelled" &&
          r.status !== "completed",
      )
      .sort((a, b) => a.window.start - b.window.start)[0] ?? null
  );
}

/** Driver legs repeat every eight minutes in the simulation — a visible, calm pace. */
const LEG_MS = 8 * 60_000;

export interface DriverFix extends LivePosition {
  job: Reservation | null;
  route: GeoPoint[] | null;
  /** 0–1 along the current route. */
  progress: number;
}

export function driverPosition(driver: Driver, reservations: Reservation[], now: number): DriverFix {
  const job = activeJobFor(driver.id, reservations);
  const route = job ? routeBetween(BASE, destinationFor(job), `${job.id}:drv`) : null;

  if (driver.position && now - driver.position.at < FRESH_MS) {
    return { lat: driver.position.lat, lng: driver.position.lng, source: "driver", at: driver.position.at, job, route, progress: 0 };
  }

  if (driver.status === "off-duty") {
    return { ...BASE, source: "depot", at: now, job: null, route: null, progress: 0 };
  }

  const phase = ((now / LEG_MS + seed(driver.id)) % 1 + 1) % 1;

  if (job && route && (job.driverJob === "en_route" || job.driverJob === "picked_up")) {
    return { ...pointAlong(route, phase), source: "simulated", at: now, job, route, progress: phase };
  }

  // Assigned but not moving yet, or free: patrol the beach.
  const loop = cruiseLoop(driver.id);
  return { ...pointAlong(loop, phase), source: "simulated", at: now, job, route, progress: 0 };
}
