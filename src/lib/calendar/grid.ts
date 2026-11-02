/** Calendar grid helpers working on ISO dates (YYYY-MM-DD) in New York time. */
function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export function isoFromUtc(y: number, m0: number, d: number) {
  return new Date(Date.UTC(y, m0, d)).toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, n: number) {
  const { y, m, d } = parts(iso);
  return isoFromUtc(y, m - 1, d + n);
}

export function addMonthsIso(iso: string, n: number) {
  const { y, m } = parts(iso);
  return isoFromUtc(y, m - 1 + n, 1);
}

export function weekdayIso(iso: string) {
  const { y, m, d } = parts(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Six (or five) rows of seven ISO dates covering the month, weeks starting Sunday. */
export function monthGrid(iso: string): string[][] {
  const { y, m } = parts(iso);
  const first = isoFromUtc(y, m - 1, 1);
  const start = addDaysIso(first, -weekdayIso(first));
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = isoFromUtc(y, m - 1, lastDay);
  const end = addDaysIso(last, 6 - weekdayIso(last));
  const weeks: string[][] = [];
  for (let cur = start; cur <= end; ) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cur);
      cur = addDaysIso(cur, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function weekDays(iso: string): string[] {
  const start = addDaysIso(iso, -weekdayIso(iso));
  return Array.from({ length: 7 }, (_, i) => addDaysIso(start, i));
}

export function sameMonth(a: string, b: string) {
  return a.slice(0, 7) === b.slice(0, 7);
}
