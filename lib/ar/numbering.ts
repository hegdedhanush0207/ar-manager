/**
 * R4. Document numbering per Indian financial year (April–March).
 */
import type { ArData } from './types';

export type Series = 'invoice' | 'creditNote' | 'receipt';

/** '2026-04-05' → '26-27'; '2026-03-10' → '25-26'. */
export function fyLabel(date: string): string {
  const [y, m] = date.split('-').map(Number);
  const startYear = m >= 4 ? y : y - 1;
  const two = (n: number) => String(n % 100).padStart(2, '0');
  return `${two(startYear)}-${two(startYear + 1)}`;
}

const FORMAT: Record<Series, { prefix: (fy: string) => string; digits: number }> = {
  invoice: { prefix: (fy) => `BWA/${fy}/`, digits: 4 },
  creditNote: { prefix: (fy) => `BWA/CN/${fy}/`, digits: 3 },
  receipt: { prefix: (fy) => `RCT/${fy}/`, digits: 4 },
};

/** The existing numbers of a series, including cancelled invoices (never reused). */
export function existingNumbers(data: Pick<ArData, 'invoices' | 'creditNotes' | 'receipts'>, series: Series): string[] {
  if (series === 'invoice') return data.invoices.map((i) => i.invoiceNo);
  if (series === 'creditNote') return data.creditNotes.map((c) => c.creditNoteNo);
  return data.receipts.map((r) => r.receiptNo);
}

/** Next number from a list of existing numbers: one more than the highest in that FY. */
export function nextNumberFrom(existing: string[], series: Series, date: string): string {
  const { prefix, digits } = FORMAT[series];
  const p = prefix(fyLabel(date));
  let highest = 0;
  for (const no of existing) {
    if (!no.startsWith(p)) continue;
    const n = Number(no.slice(p.length));
    if (Number.isInteger(n) && n > highest) highest = n;
  }
  return p + String(highest + 1).padStart(digits, '0');
}

/** R4. The next number in a series for a document dated `date`. */
export function nextNumber(series: Series, data: Pick<ArData, 'invoices' | 'creditNotes' | 'receipts'>, date: string): string {
  return nextNumberFrom(existingNumbers(data, series), series, date);
}
