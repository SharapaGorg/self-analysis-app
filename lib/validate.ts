const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

export function isValidDate(s: unknown): s is string {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}

export function isValidMonth(s: unknown): s is string {
  if (typeof s !== "string" || !MONTH_RE.test(s)) return false;
  const m = Number(s.slice(5, 7));
  return m >= 1 && m <= 12;
}

/** Validate a quality value: null or integer 1..10. Returns undefined if invalid. */
export function parseQuality(v: unknown): number | null | undefined {
  if (v === null) return null;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 10) {
    return undefined;
  }
  return v;
}

/** Validate pomodoros: finite number >= 0 (fractional allowed). Returns undefined if invalid. */
export function parsePomodoros(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return undefined;
  return v;
}

/** Validate free text: null or string. Returns undefined if invalid type. */
export function parseText(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  return v;
}

/** Validate a task title: non-empty string after trim. Returns undefined if invalid. */
export function parseTitle(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

/** Validate a boolean-ish flag into 0/1. Returns undefined if invalid. */
export function parseBool(v: unknown): 0 | 1 | undefined {
  if (v === true || v === 1) return 1;
  if (v === false || v === 0) return 0;
  return undefined;
}
