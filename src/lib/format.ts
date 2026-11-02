/** Display formatting. Tastable's demo market is New York, so dates render in America/New_York. */
export const TIME_ZONE = "America/New_York";
const LOCALE = "en-US";

export function formatPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency }).format(cents / 100);
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(date: Date, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, ...opts }).format(date);
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(date);
}

export function formatCompact(n: number) {
  return new Intl.NumberFormat(LOCALE, { notation: "compact" }).format(n);
}

export function formatPercent(ratio: number, digits = 0) {
  return new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: digits }).format(ratio);
}

/** YYYY-MM-DD for a date in New York time. */
export function isoDateNY(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return parts;
}
