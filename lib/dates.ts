// Pure date utilities. All dates are handled as local calendar dates in
// `YYYY-MM-DD` form; weeks are ISO (start Monday, end Sunday); months are
// `YYYY-MM`. No timezone conversion — we build Dates at local midnight.

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Format a Date as a local `YYYY-MM-DD` string. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Parse `YYYY-MM-DD` into a Date at local midnight. */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Add (or subtract) whole days to a `YYYY-MM-DD` string. */
export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Monday of the ISO week containing `s`. */
export function mondayOf(s: string): string {
  const d = parseISODate(s);
  const offset = (d.getDay() + 6) % 7; // days since Monday (Mon=0 .. Sun=6)
  return addDays(s, -offset);
}

/** Sunday of the ISO week containing `s`. */
export function sundayOf(s: string): string {
  return addDays(mondayOf(s), 6);
}

/** Monday of the week before the one containing `s`. */
export function previousWeekStart(weekStart: string): string {
  return addDays(weekStart, -7);
}

/** `YYYY-MM` of the given date. */
export function monthOf(s: string): string {
  return s.slice(0, 7);
}

/** First day (`YYYY-MM-DD`) of a `YYYY-MM` month. */
export function firstOfMonth(month: string): string {
  return `${month}-01`;
}

/** Last day (`YYYY-MM-DD`) of a `YYYY-MM` month. */
export function lastOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 0); // day 0 of next month = last day of this month
  return toISODate(d);
}

/** Previous `YYYY-MM` month. */
export function previousMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** Inclusive list of `YYYY-MM-DD` strings from `from` to `to`. */
export function daysInRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  // Guard against reversed ranges.
  if (parseISODate(from) > parseISODate(to)) return out;
  while (parseISODate(cur) <= parseISODate(to)) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function isSunday(s: string): boolean {
  return parseISODate(s).getDay() === 0;
}

export function isFirstOfMonth(s: string): boolean {
  return parseISODate(s).getDate() === 1;
}
