/**
 * Which lines the Historical AR trend shows, and their colours.
 *
 * A line is either the consolidated total ("all") or one customer (its id).
 * Colours come from a fixed, validated categorical palette (8 slots, checked for
 * colour-blind separation on line charts). The consolidated line always takes
 * slot 1; customers take the lowest free slot of 2–8 when added and keep it while
 * shown, so adding or removing a line never repaints the others. That allows up
 * to 7 customer lines at once.
 */

export const CONSOLIDATED = 'all';

/** Light-mode categorical palette, in its validated order. */
export const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'] as const;

export const MAX_CUSTOMER_LINES = PALETTE.length - 1;

/** ?cust= value → selected keys, in order, deduplicated and limited to known keys. Default: consolidated only. */
export function parseSelection(param: string | undefined, knownKeys: string[]): string[] {
  const known = new Set(knownKeys);
  const out: string[] = [];
  for (const k of (param ?? '').split(',').map((s) => s.trim())) {
    if (!k || !known.has(k) || out.includes(k)) continue;
    if (k !== CONSOLIDATED && out.filter((x) => x !== CONSOLIDATED).length >= MAX_CUSTOMER_LINES) continue;
    out.push(k);
  }
  return out.length ? out : [CONSOLIDATED];
}

/** Selected keys → ?cust= value ('' for the default, consolidated only). */
export function selectionParam(keys: string[]): string {
  return keys.length === 1 && keys[0] === CONSOLIDATED ? '' : keys.join(',');
}

/**
 * Colours for the selected lines. `previous` holds the colours already given out;
 * lines still selected keep theirs, new customer lines take the lowest free slot.
 */
export function assignColors(selected: string[], previous: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  const taken = new Set<string>();
  for (const k of selected) {
    if (k === CONSOLIDATED) { out[k] = PALETTE[0]; continue; }
    if (previous[k] && previous[k] !== PALETTE[0]) { out[k] = previous[k]; taken.add(previous[k]); }
  }
  for (const k of selected) {
    if (out[k]) continue;
    const free = PALETTE.slice(1).find((c) => !taken.has(c));
    if (!free) continue; // cannot happen while selections are capped at MAX_CUSTOMER_LINES
    out[k] = free;
    taken.add(free);
  }
  return out;
}
