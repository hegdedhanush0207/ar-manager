/**
 * The as-at date (R10). Every page reads ?asof=YYYY-MM-DD from the URL; when it
 * is missing or invalid, the date is today in India (Asia/Kolkata), never the
 * server's own date (Vercel runs in UTC).
 */
import { isIsoDate, todayInIndia } from './ar/dates';

export type SearchParams = Record<string, string | string[] | undefined>;

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** A valid ?asof= value, or today in India. */
export function parseAsOf(value: string | string[] | undefined, now: Date = new Date()): string {
  const v = first(value)?.trim();
  return v && isIsoDate(v) ? v : todayInIndia(now);
}

/** Adds ?asof= (and any other parameters) to an app link so the date is kept when navigating. */
export function href(path: string, asof: string, params: Record<string, string | number | undefined | null> = {}): string {
  const q = new URLSearchParams();
  q.set('asof', asof);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  return `${path}?${q.toString()}`;
}
