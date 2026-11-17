/**
 * Filtering and sorting of the invoice list, shared by the screen and the CSV
 * export so both always show the same rows.
 */
import type { ArData } from './ar/types';
import { invoiceRows, type InvoiceRow } from './ar/invoices';
import { sortRows, type Dir } from './table';

export const INVOICE_SORT: Record<string, (r: InvoiceRow) => string | number | null> = {
  number: (r) => r.invoice.invoiceNo,
  customer: (r) => r.customer?.name ?? '',
  date: (r) => r.invoice.invoiceDate,
  due: (r) => r.invoice.dueDate,
  total: (r) => r.invoice.total,
  received: (r) => r.received,
  credited: (r) => r.credited,
  outstanding: (r) => r.outstanding,
  status: (r) => r.status,
  late: (r) => r.daysLate,
};

export function filteredInvoiceRows(data: ArData, asof: string, p: Record<string, string>): InvoiceRow[] {
  const q = (p.q ?? '').trim().toLowerCase();
  const customer = p.customer ? Number(p.customer) : null;
  const rows = invoiceRows(data, asof).filter((r) => {
    if (customer && r.invoice.customerId !== customer) return false;
    if (q && !r.invoice.invoiceNo.toLowerCase().includes(q)) return false;
    if (p.status === 'Open' && r.status !== 'Due' && r.status !== 'Overdue') return false;
    if (p.status && p.status !== 'Open' && p.status !== 'All' && r.status !== p.status) return false;
    if (p.disputed === 'yes' && !r.invoice.isDisputed) return false;
    if (p.disputed === 'no' && r.invoice.isDisputed) return false;
    if (p.from && r.invoice.invoiceDate < p.from) return false;
    if (p.to && r.invoice.invoiceDate > p.to) return false;
    if (p.bucket && r.bucket !== p.bucket) return false;
    return true;
  });
  return sortRows(rows, INVOICE_SORT, p.sort ?? 'date', (p.dir as Dir) ?? (p.sort ? 'asc' : 'desc'));
}
