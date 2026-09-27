"use client";

import { useSyncExternalStore } from "react";

/**
 * The M2 demo store.
 *
 * Every write the UI makes before the database exists — a booking placed at
 * checkout, a driver marking a delivery done, an admin approving a partner —
 * lands here, in this browser's localStorage. That is what lets a reviewer
 * book a car as a member, dispatch it from the back office, deliver it from
 * the driver portal and watch the status move on the member's booking page.
 *
 * It stores an *overlay*, never a copy of the fixtures: per collection, the
 * records that were created or changed and the ids that were removed. Pages
 * pass their fixture rows as the base and get the merged view back. Two
 * consequences worth keeping:
 *  - The server snapshot is an empty overlay, so server HTML and the first
 *    client render always agree — no hydration mismatch.
 *  - Fixture updates in code still show through for every untouched row.
 *
 * M3 deletes this module. Each `save`/`remove` call site becomes an API call
 * against the same Repository shapes; nothing above it changes.
 */

const STORAGE_KEY = "nxl.demo.v1";

type Row = { id: string };

interface Overlay {
  upserts: Record<string, Row>;
  removed: string[];
  /** Ids created here (not in the base), newest first. */
  created: string[];
}

interface DemoState {
  collections: Record<string, Overlay>;
  values: Record<string, unknown>;
}

const EMPTY: DemoState = { collections: {}, values: {} };

let state: DemoState = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/**
 * Always a fresh object — never the EMPTY constant — so the first client
 * snapshot differs from the server's and subscribers re-render once hydrated.
 */
function read(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<DemoState> | null) : null;
    if (!parsed || typeof parsed !== "object") return { collections: {}, values: {} };
    return { collections: parsed.collections ?? {}, values: parsed.values ?? {} };
  } catch {
    return { collections: {}, values: {} };
  }
}

function write(next: DemoState) {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota exceeded (usually a large photo) or storage disabled. The change
    // still holds for this tab; say so in the console rather than failing.
    console.warn("[nxl] Demo data could not be saved to this browser.");
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!hydrated) {
    hydrated = true;
    state = read();
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        state = read();
        emit();
      }
    });
    // Defer so the subscribing component finishes mounting first.
    queueMicrotask(emit);
  }
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => EMPTY;

function ensureHydrated() {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    state = read();
  }
}

/* ------------------------------- collections ------------------------------ */

const EMPTY_OVERLAY: Overlay = { upserts: {}, removed: [], created: [] };

const mergeCache = new WeakMap<Overlay, WeakMap<Row[], Row[]>>();

function merge<T extends Row>(overlay: Overlay | undefined, base: T[]): T[] {
  if (!overlay) return base;
  let byBase = mergeCache.get(overlay);
  const hit = byBase?.get(base);
  if (hit) return hit as T[];

  const removed = new Set(overlay.removed);
  const inBase = new Set(base.map((b) => b.id));
  const created = overlay.created
    .filter((id) => !inBase.has(id) && !removed.has(id))
    .map((id) => overlay.upserts[id] as T)
    .filter(Boolean);
  const merged = [
    ...created,
    ...base.filter((b) => !removed.has(b.id)).map((b) => (overlay.upserts[b.id] as T) ?? b),
  ];

  if (!byBase) {
    byBase = new WeakMap();
    mergeCache.set(overlay, byBase);
  }
  byBase.set(base, merged);
  return merged;
}

/** The merged rows of a collection. Re-renders when anything in the store changes. */
export function useCollection<T extends Row>(name: string, base: T[]): T[] {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return merge(snap.collections[name], base);
}

/** Same as useCollection, for event handlers and non-React code. */
export function readCollection<T extends Row>(name: string, base: T[]): T[] {
  ensureHydrated();
  return merge(state.collections[name], base);
}

/** Create or replace a record. New ids go to the top of the list. */
export function save<T extends Row>(name: string, row: T) {
  ensureHydrated();
  const prev = state.collections[name] ?? EMPTY_OVERLAY;
  const isNew = !(row.id in prev.upserts) && !prev.created.includes(row.id);
  write({
    ...state,
    collections: {
      ...state.collections,
      [name]: {
        upserts: { ...prev.upserts, [row.id]: row },
        removed: prev.removed.filter((id) => id !== row.id),
        // A record edited from the base is not "created" — only brand-new ids
        // are, and the caller marks those by passing `created`.
        created: prev.created,
      },
    },
  });
  return isNew;
}

/** Create a brand-new record at the top of the collection. */
export function create<T extends Row>(name: string, row: T) {
  ensureHydrated();
  const prev = state.collections[name] ?? EMPTY_OVERLAY;
  write({
    ...state,
    collections: {
      ...state.collections,
      [name]: {
        upserts: { ...prev.upserts, [row.id]: row },
        removed: prev.removed.filter((id) => id !== row.id),
        created: [row.id, ...prev.created.filter((id) => id !== row.id)],
      },
    },
  });
}

/** Merge a partial change into a record, given its current version. */
export function patch<T extends Row>(name: string, current: T, change: Partial<T>): T {
  const next = { ...current, ...change };
  save(name, next);
  return next;
}

export function remove(name: string, id: string) {
  ensureHydrated();
  const prev = state.collections[name] ?? EMPTY_OVERLAY;
  write({
    ...state,
    collections: {
      ...state.collections,
      [name]: { ...prev, removed: [...prev.removed.filter((x) => x !== id), id] },
    },
  });
}

/* --------------------------------- values --------------------------------- */

export function useDemoValue<T>(key: string, initial: T): T {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return key in snap.values ? (snap.values[key] as T) : initial;
}

export function readValue<T>(key: string, initial: T): T {
  ensureHydrated();
  return key in state.values ? (state.values[key] as T) : initial;
}

export function setValue<T>(key: string, value: T) {
  ensureHydrated();
  write({ ...state, values: { ...state.values, [key]: value } });
}

/** True once the store has read this browser's data — for guards and skeletons. */
export function useDemoReady(): boolean {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return snap !== EMPTY;
}

/** Wipe every demo edit and return the app to its seeded state. */
export function resetDemo() {
  write({ collections: {}, values: {} });
}

/* ---------------------------------- ids ----------------------------------- */

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
