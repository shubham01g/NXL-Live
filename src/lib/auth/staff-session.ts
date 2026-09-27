"use client";

import { useSyncExternalStore } from "react";
import type { StaffMember } from "@/lib/domain/operations";
import { DEMO_STAFF } from "@/lib/data/fixtures/operations";

/**
 * The back-office session.
 *
 * Same shape and the same caveats as the member session (session-store.ts):
 * at M2 "signed in as staff" is a record in localStorage, chosen from the
 * access floater, with no password behind it. M3 replaces this module with a
 * real staff login and server-side role checks; `useStaff()` keeps its shape.
 *
 * Kept separate from the member session on purpose — a reviewer can be
 * signed in as the demo member and step into the admin console without one
 * logging the other out, which is exactly how the prototype's floater worked.
 */

const STORAGE_KEY = "nxl.staff.v1";

export type StaffSession =
  | { status: "loading"; staff: null }
  | { status: "signed-out"; staff: null }
  | { status: "signed-in"; staff: StaffMember };

const LOADING: StaffSession = { status: "loading", staff: null };
const SIGNED_OUT: StaffSession = { status: "signed-out", staff: null };

let state: StaffSession = LOADING;
let hydrated = false;
const listeners = new Set<() => void>();

function set(next: StaffSession) {
  if (next === state) return;
  state = next;
  for (const listener of listeners) listener();
}

function readStorage(): StaffSession {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SIGNED_OUT;
    const parsed = JSON.parse(raw) as Partial<StaffMember> | null;
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.role !== "string") {
      return SIGNED_OUT;
    }
    return { status: "signed-in", staff: parsed as StaffMember };
  } catch {
    return SIGNED_OUT;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!hydrated) {
    hydrated = true;
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) set(readStorage());
    });
    set(readStorage());
  }
  return () => {
    listeners.delete(listener);
  };
}

export function useStaff(): StaffSession {
  return useSyncExternalStore(subscribe, () => state, () => LOADING);
}

/** Enter the back office as one of the demo staff accounts. */
export function enterBackOffice(role: keyof typeof DEMO_STAFF) {
  const staff = DEMO_STAFF[role];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
  } catch {
    // Storage unavailable — the session still holds for this tab.
  }
  set({ status: "signed-in", staff });
}

export function leaveBackOffice() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored to remove.
  }
  set(SIGNED_OUT);
}
