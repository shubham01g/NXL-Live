/** Display formatting. Currency is whole-dollar USD throughout. */

export function money(amount: number, opts?: { cents?: boolean }): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts?.cents ? 2 : 0,
    maximumFractionDigits: opts?.cents ? 2 : 0,
  }).format(amount);
}

/** Compact form for charts and dense stats. */
export function moneyCompact(amount: number): string {
  if (Math.abs(amount) < 1000) return money(amount);
  return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`;
}

export function count(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function shortDate(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}

export function monthYear(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(ms));
}

/** Relative age of a timestamp, coarsening as it gets older. */
export function relativeTime(ms: number, now = Date.now()): string {
  const mins = Math.round((now - ms) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(ms);
}

export function ratingText(value: number): string {
  return value.toFixed(2);
}
