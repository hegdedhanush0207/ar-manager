/**
 * Date helpers. Dates are always 'YYYY-MM-DD' strings and never JavaScript
 * Date objects in local time (brief section 4.11), so results never depend on
 * the time zone of the machine the code runs on.
 */

const DAY_MS = 86_400_000;

function toUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Whole days from one date to another (to − from). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** The date `days` calendar days after `date` (negative goes back). */
export function addDays(date: string, days: number): string {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** True for a well-formed, real calendar date such as '2026-08-31'. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return fromUtc(toUtc(value)) === value; // rejects 2026-02-30 and similar
}

/** Today's date in India (Asia/Kolkata), whatever the server's time zone. */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

/** 1 April of the Indian financial year containing `date`. */
export function fyStart(date: string): string {
  const [y, m] = date.split('-').map(Number);
  return `${m >= 4 ? y : y - 1}-04-01`;
}
