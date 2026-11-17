/**
 * The invoice list as at a date: live invoices with their R11 position, plus
 * cancelled invoices with the status "Cancelled" (R8: listed, but excluded
 * from every total).
 */
import type { ArData, Customer, Invoice, Paise } from './types';
import { invoicePositions, type Bucket } from './positions';

export type InvoiceListStatus = 'Paid' | 'Due' | 'Overdue' | 'Cancelled';

export interface InvoiceRow {
  invoice: Invoice;
  customer: Customer | undefined;
  received: Paise;
  credited: Paise;
  outstanding: Paise;
  daysPastDue: number;
  /** Days late (days past due when Overdue, else 0). */
  daysLate: number;
  status: InvoiceListStatus;
  isPartPaid: boolean;
  bucket: Bucket | null;
}

export function invoiceRows(data: ArData, asOf: string): InvoiceRow[] {
  const customers = new Map(data.customers.map((c) => [c.id, c]));
  const live = new Map(invoicePositions(data, asOf).map((p) => [p.invoice.id, p]));
  const rows: InvoiceRow[] = [];
  for (const i of data.invoices) {
    if (i.invoiceDate > asOf) continue;
    const p = live.get(i.id);
    if (p) {
      rows.push({
        invoice: i,
        customer: customers.get(i.customerId),
        received: p.received,
        credited: p.credited,
        outstanding: p.outstanding,
        daysPastDue: p.daysPastDue,
        daysLate: p.status === 'Overdue' ? p.daysPastDue : 0,
        status: p.status,
        isPartPaid: p.isPartPaid,
        bucket: p.bucket,
      });
    } else {
      rows.push({
        invoice: i,
        customer: customers.get(i.customerId),
        received: 0,
        credited: 0,
        outstanding: 0,
        daysPastDue: 0,
        daysLate: 0,
        status: 'Cancelled',
        isPartPaid: false,
        bucket: null,
      });
    }
  }
  return rows;
}

export interface InvoiceTotals {
  count: number;
  total: Paise;
  received: Paise;
  credited: Paise;
  outstanding: Paise;
}

/** Totals row for a (filtered) invoice list. Cancelled invoices are left out (R8). */
export function invoiceTotals(rows: InvoiceRow[]): InvoiceTotals {
  const t: InvoiceTotals = { count: 0, total: 0, received: 0, credited: 0, outstanding: 0 };
  for (const r of rows) {
    if (r.status === 'Cancelled') continue;
    t.count += 1;
    t.total += r.invoice.total;
    t.received += r.received;
    t.credited += r.credited;
    t.outstanding += r.outstanding;
  }
  return t;
}
