/**
 * R17. Days sales outstanding as at a date, over a 90-day window.
 */
import type { ArData } from './types';
import { addDays } from './dates';
import { invoicePositions } from './positions';

export interface DsoResult {
  dso: number | null; // null when there are no net sales in the window: show "—"
  outstanding: number; // Σ invoice outstanding (before unapplied credit), paise
  sales: number; // S, paise
  windowFrom: string;
  windowTo: string;
}

export function dsoDetail(data: ArData, asOf: string): DsoResult {
  const windowFrom = addDays(asOf, -89);
  const inWindow = (d: string) => d >= windowFrom && d <= asOf;

  let outstanding = 0;
  for (const p of invoicePositions(data, asOf)) outstanding += p.outstanding;

  let sales = 0;
  for (const i of data.invoices) if (!i.isCancelled && inWindow(i.invoiceDate)) sales += i.total;
  for (const c of data.creditNotes) if (inWindow(c.creditNoteDate)) sales -= c.total;

  // S = 0 is the brief's "—" case. A negative S (credit notes exceeding sales) has no meaning, so it is shown as "—" too.
  const dso = sales > 0 ? Math.round((outstanding * 90) / sales) : null;
  return { dso, outstanding, sales, windowFrom, windowTo: asOf };
}

/** DSO in whole days, or null when S ≤ 0. */
export function dso(data: ArData, asOf: string): number | null {
  return dsoDetail(data, asOf).dso;
}
