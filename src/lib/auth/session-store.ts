import type { MemberAccount } from "@/lib/domain/types";

/**
 * The member session.
 *
 * M2 is UI-only, so "signed in" means a member record in localStorage — there
 * is no server, no password and no token, and this file is the only place that
 * is true. M3 replaces the read and write below with a real session cookie and
 * an API call; `useSession()` and every component above it keep their shape.
 *
 * Deliberately an external store rather than React state:
 *  - `useSyncExternalStore` gives a server snapshot, so the markup React
 *    hydrates matches what the server rendered instead of tearing.
 *  - The store survives navigation between route segments.
 *  - Reading localStorage in an effect would mean setState-during-effect,
 *    which cascades a second render on every mount.
 *
 * Nothing here is a security boundary. Anyone can edit localStorage and call
 * themselves Alex Rivera; that is fine at M2, where these screens exist to be
 * reviewed, and is exactly what M3's auth work replaces.
 */

const STORAGE_KEY = "nxl.session.v1";

export type SessionState =
  | { status: "loading"; member: null }
  | { status: "signed-out"; member: null }
  | { status: "signed-in"; member: MemberAccount };

const LOADING: SessionState = { status: "loading", member: null };
const SIGNED_OUT: SessionState = { status: "signed-out", member: null };

/**
 * Until the first subscription runs we genuinely do not know — the server
 * cannot see localStorage. Guards wait for `loading` to clear rather than
 * bouncing a signed-in member to the sign-in page on first paint.
 */
let state: SessionState = LOADING;
let hydrated = false;

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function set(next: SessionState) {
  if (next === state) return;
  state = next;
  emit();
}

function readStorage(): SessionState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SIGNED_OUT;
    const parsed: unknown = JSON.parse(raw);
    // A stored shape from an older build is not worth migrating at M2 —
    // treat anything unrecognisable as signed out rather than crashing.
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as MemberAccount).email !== "string" ||
      typeof (parsed as MemberAccount).id !== "string"
    ) {
      return SIGNED_OUT;
    }
    return { status: "signed-in", member: parsed as MemberAccount };
  } catch {
    // Private browsing, disabled storage, or malformed JSON.
    return SIGNED_OUT;
  }
}

function writeStorage(member: MemberAccount | null) {
  try {
    if (member) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(member));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable. The session still works for this tab, in memory.
  }
}

let storageBound = false;

function bindCrossTab() {
  if (storageBound) return;
  storageBound = true;
  window.addEventListener("storage", (event) => {
    // Signing out in one tab signs out the others.
    if (event.key === STORAGE_KEY) set(readStorage());
  });
}

export function subscribe(listener: () => void) {
  listeners.add(listener);

  // The first subscription happens in an effect, i.e. after hydration — the
  // earliest point at which reading localStorage cannot cause a mismatch.
  if (!hydrated) {
    hydrated = true;
    bindCrossTab();
    set(readStorage());
  }

  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): SessionState {
  return state;
}

export function getServerSnapshot(): SessionState {
  return LOADING;
}

/* -------------------------------- mutators ------------------------------- */

export function startSession(member: MemberAccount) {
  writeStorage(member);
  set({ status: "signed-in", member });
}

export function endSession() {
  writeStorage(null);
  set(SIGNED_OUT);
}

/**
 * Apply a change to the signed-in member and persist it.
 *
 * A no-op when signed out, so a stray save from a panel that is unmounting
 * cannot resurrect a session.
 */
export function updateMember(
  change: (current: MemberAccount) => MemberAccount,
): MemberAccount | null {
  if (state.status !== "signed-in") return null;
  const next = change(state.member);
  writeStorage(next);
  set({ status: "signed-in", member: next });
  return next;
}
