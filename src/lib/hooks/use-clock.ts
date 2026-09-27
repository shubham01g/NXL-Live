"use client";

import { useEffect, useState } from "react";

/**
 * "Now", as render-safe state.
 *
 * Reading Date.now() during render makes a component impure — two renders of
 * the same props disagree. This captures the time once on mount and, if asked,
 * ticks it forward, so every time-relative label ("2h ago", "due tomorrow")
 * re-renders from state instead.
 */
export function useClock(tickMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!tickMs) return;
    const t = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(t);
  }, [tickMs]);
  return now;
}
