/**
 * Sorting and URL helpers for list screens. Sorting and filtering happen on the
 * server from URL parameters (?sort=outstanding&dir=desc), so every view can be
 * bookmarked and no client-side state library is needed.
 */
import type { SearchParams } from './asof';
import { first } from './asof';

export type Dir = 'asc' | 'desc';
export type SortValue = string | number | boolean | null | undefined;

export function sortRows<T>(rows: T[], accessors: Record<string, (row: T) => SortValue>, sort: string | undefined, dir: Dir): T[] {
  const get = sort ? accessors[sort] : undefined;
  if (!get) return rows;
  const sign = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    if (x === y) return 0;
    if (x === null || x === undefined) return 1; // blanks last
    if (y === null || y === undefined) return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * sign;
    return String(x).localeCompare(String(y), 'en-IN', { numeric: true }) * sign;
  });
}

/** The current URL parameters as a plain object of strings. */
export function flatParams(sp: SearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    const f = first(v);
    if (f !== undefined && f !== '') out[k] = f;
  }
  return out;
}

/** A link to `path` with the current parameters plus some changes (undefined removes one). */
export function withParams(path: string, current: Record<string, string>, changes: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...changes })) if (v !== undefined && v !== '') q.set(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}
