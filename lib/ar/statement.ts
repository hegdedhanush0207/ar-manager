/**
 * R15. Statement of account for a customer from `from` to `to`.
 */
import type { ArData, Paise } from './types';
import { addDays } from './dates';
import { balanceByDocuments, customerPosition, emptyBuckets, type Bucket } from './positions';

export type StatementLineKind = 'Invoice' | 'Credit note' | 'Receipt' | 'TDS';

const KIND_ORDER: Record<StatementLineKind, number> = { Invoice: 0, 'Credit note': 1, Receipt: 2, TDS: 3 };

export interface StatementLine {
  date: string;
  kind: StatementLineKind;
  documentNo: string;
  description: string;
  debit: Paise;
  credit: Paise;
  balance: Paise; // running balance after this line; positive = Dr
}

export interface Statement {
  customerId: number;
  from: string;
  to: string;
  opening: Paise;
  lines: StatementLine[];
  totalDebit: Paise;
  totalCredit: Paise;
  closing: Paise;
  /** Footer: closing position by ageing bucket, and unapplied credit, as at `to`. */
  buckets: Record<Bucket, Paise>;
  unapplied: Paise;
}

export function statement(data: ArData, customerId: number, from: string, to: string): Statement {
  const opening = balanceByDocuments(data, customerId, addDays(from, -1));
  const inPeriod = (d: string) => d >= from && d <= to;

  const invoices = data.invoices.filter((i) => i.customerId === customerId);
  const invoiceNo = new Map(invoices.map((i) => [i.id, i.invoiceNo]));
  const raw: Omit<StatementLine, 'balance'>[] = [];

  for (const i of invoices) {
    if (i.isCancelled || !inPeriod(i.invoiceDate)) continue;
    raw.push({ date: i.invoiceDate, kind: 'Invoice', documentNo: i.invoiceNo, description: i.description, debit: i.total, credit: 0 });
  }
  for (const c of data.creditNotes) {
    if (!invoiceNo.has(c.invoiceId) || !inPeriod(c.creditNoteDate)) continue;
    raw.push({
      date: c.creditNoteDate,
      kind: 'Credit note',
      documentNo: c.creditNoteNo,
      description: `Credit note against ${invoiceNo.get(c.invoiceId)}: ${c.reason}`,
      debit: 0,
      credit: c.total,
    });
  }
  for (const r of data.receipts) {
    if (r.customerId !== customerId || !inPeriod(r.receiptDate)) continue;
    raw.push({
      date: r.receiptDate,
      kind: 'Receipt',
      documentNo: r.receiptNo,
      description: `Payment received (${r.mode}${r.reference ? `, ${r.reference}` : ''})`,
      debit: 0,
      credit: r.bankAmount,
    });
    if (r.tdsAmount > 0) {
      raw.push({ date: r.receiptDate, kind: 'TDS', documentNo: r.receiptNo, description: 'TDS deducted by you', debit: 0, credit: r.tdsAmount });
    }
  }

  raw.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      a.documentNo.localeCompare(b.documentNo),
  );

  let balance = opening;
  let totalDebit = 0;
  let totalCredit = 0;
  const lines = raw.map((l) => {
    balance += l.debit - l.credit;
    totalDebit += l.debit;
    totalCredit += l.credit;
    return { ...l, balance };
  });

  const pos = customerPosition(data, customerId, to);
  return {
    customerId,
    from,
    to,
    opening,
    lines,
    totalDebit,
    totalCredit,
    closing: balance,
    buckets: pos?.buckets ?? emptyBuckets(),
    unapplied: pos?.unapplied ?? 0,
  };
}
