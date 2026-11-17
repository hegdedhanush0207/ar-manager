/**
 * CSV exports (brief section 4.12): the statement, the invoice list and the
 * ageing report. Amounts are plain numbers (70800.00), dates are 31-Aug-2026,
 * fields with commas are quoted, and the file starts with a UTF-8 BOM.
 */
import type { Customer } from './ar/types';
import type { InvoiceRow } from './ar/invoices';
import { invoiceTotals } from './ar/invoices';
import { BUCKETS, type CustomerPosition, type PositionTotals } from './ar/positions';
import type { Statement } from './ar/statement';
import { formatDate, rupeesPlain, toCsv } from './format';
import { SELLER } from './seller';

const drCr = (p: number) => (p > 0 ? 'Dr' : p < 0 ? 'Cr' : '');
const abs = (p: number) => rupeesPlain(Math.abs(p));

export function statementCsv(customer: Customer, s: Statement): string {
  const rows: (string | number)[][] = [
    [SELLER.name, SELLER.addressLine],
    ['Statement of account', `${customer.code} ${customer.name}`],
    ['Period', `${formatDate(s.from)} to ${formatDate(s.to)}`],
    [],
    ['Date', 'Type', 'Document', 'Description', 'Debit', 'Credit', 'Balance', 'Dr/Cr'],
    [formatDate(s.from), 'Opening balance', '', '', '', '', abs(s.opening), drCr(s.opening)],
    ...s.lines.map((l) => [
      formatDate(l.date),
      l.kind,
      l.documentNo,
      l.description,
      l.debit ? rupeesPlain(l.debit) : '',
      l.credit ? rupeesPlain(l.credit) : '',
      abs(l.balance),
      drCr(l.balance),
    ]),
    [formatDate(s.to), 'Closing balance', '', '', rupeesPlain(s.totalDebit), rupeesPlain(s.totalCredit), abs(s.closing), drCr(s.closing)],
    [],
    [`Ageing of the closing balance as at ${formatDate(s.to)}`],
    [...BUCKETS, 'Unapplied credit'],
    [...BUCKETS.map((b) => rupeesPlain(s.buckets[b])), rupeesPlain(s.unapplied)],
  ];
  return toCsv(rows);
}

export function invoiceListCsv(rows: InvoiceRow[], asof: string): string {
  const t = invoiceTotals(rows);
  return toCsv([
    [`Invoices as at ${formatDate(asof)}`],
    ['Number', 'Customer code', 'Customer', 'Invoice date', 'Due date', 'Description', 'Total', 'Received', 'Credited', 'Outstanding', 'Status', 'Part-paid', 'Disputed', 'Days late'],
    ...rows.map((r) => {
      const cancelled = r.status === 'Cancelled';
      return [
        r.invoice.invoiceNo,
        r.customer?.code ?? '',
        r.customer?.name ?? '',
        formatDate(r.invoice.invoiceDate),
        formatDate(r.invoice.dueDate),
        r.invoice.description,
        rupeesPlain(r.invoice.total),
        cancelled ? '' : rupeesPlain(r.received),
        cancelled ? '' : rupeesPlain(r.credited),
        cancelled ? '' : rupeesPlain(r.outstanding),
        r.status,
        r.isPartPaid ? 'Yes' : '',
        r.invoice.isDisputed ? 'Yes' : '',
        r.daysLate || '',
      ];
    }),
    ['Totals (excluding cancelled)', '', `${t.count} invoices`, '', '', '', rupeesPlain(t.total), rupeesPlain(t.received), rupeesPlain(t.credited), rupeesPlain(t.outstanding)],
  ]);
}

export function ageingCsv(rows: CustomerPosition[], totals: PositionTotals, asof: string): string {
  return toCsv([
    [`Ageing by customer as at ${formatDate(asof)} (days past due date)`],
    ['Code', 'Customer', ...BUCKETS, 'Outstanding', 'Unapplied credit', 'Net balance', 'Dr/Cr', 'Credit limit', 'Over limit'],
    ...rows.map((r) => [
      r.customer.code,
      r.customer.name,
      ...BUCKETS.map((b) => rupeesPlain(r.buckets[b])),
      rupeesPlain(r.outstanding),
      rupeesPlain(r.unapplied),
      abs(r.netBalance),
      drCr(r.netBalance),
      rupeesPlain(r.customer.creditLimit),
      r.overLimit ? 'Yes' : '',
    ]),
    ['Total', '', ...BUCKETS.map((b) => rupeesPlain(totals.buckets[b])), rupeesPlain(totals.outstanding), rupeesPlain(totals.unapplied), abs(totals.netBalance), drCr(totals.netBalance)],
  ]);
}

/** Response headers for a CSV download. */
export function csvHeaders(filename: string): HeadersInit {
  return {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename.replace(/[^\w.\-]/g, '_')}"`,
    'Cache-Control': 'no-store',
  };
}
