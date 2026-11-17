/**
 * Positions as at a date: R10 to R14.
 *
 * The as-at rule (R10): a record "exists" on date D only if its own date is on
 * or before D. 'YYYY-MM-DD' strings compare correctly as text, so
 * `x.someDate <= asOf` is the whole rule.
 */
import type { ArData, Customer, Invoice, Paise, Receipt } from './types';
import { daysBetween } from './dates';

export type Bucket = 'Not due' | '1-30' | '31-60' | '61-90' | '91-180' | 'Over 180';
export const BUCKETS: Bucket[] = ['Not due', '1-30', '31-60', '61-90', '91-180', 'Over 180'];

export type InvoiceStatus = 'Paid' | 'Due' | 'Overdue';

export interface InvoicePosition {
  invoice: Invoice;
  received: Paise;
  credited: Paise;
  outstanding: Paise;
  daysPastDue: number;
  status: InvoiceStatus;
  isPartPaid: boolean;
  bucket: Bucket | null;
}

/** R12. */
export function bucketFor(daysPastDue: number): Bucket {
  if (daysPastDue <= 0) return 'Not due';
  if (daysPastDue <= 30) return '1-30';
  if (daysPastDue <= 60) return '31-60';
  if (daysPastDue <= 90) return '61-90';
  if (daysPastDue <= 180) return '91-180';
  return 'Over 180';
}

export function emptyBuckets(): Record<Bucket, Paise> {
  return { 'Not due': 0, '1-30': 0, '31-60': 0, '61-90': 0, '91-180': 0, 'Over 180': 0 };
}

/** R11 + R12: the position of every live (not cancelled) invoice dated on or before asOf. */
export function invoicePositions(data: ArData, asOf: string): InvoicePosition[] {
  const received = new Map<number, Paise>();
  for (const a of data.allocations) {
    if (a.allocationDate <= asOf) received.set(a.invoiceId, (received.get(a.invoiceId) ?? 0) + a.amount);
  }
  const credited = new Map<number, Paise>();
  for (const c of data.creditNotes) {
    if (c.creditNoteDate <= asOf) credited.set(c.invoiceId, (credited.get(c.invoiceId) ?? 0) + c.total);
  }
  return data.invoices
    .filter((i) => !i.isCancelled && i.invoiceDate <= asOf)
    .map((i) => {
      const rec = received.get(i.id) ?? 0;
      const cred = credited.get(i.id) ?? 0;
      const outstanding = i.total - rec - cred;
      const daysPastDue = daysBetween(i.dueDate, asOf);
      return {
        invoice: i,
        received: rec,
        credited: cred,
        outstanding,
        daysPastDue,
        status: outstanding === 0 ? 'Paid' : daysPastDue >= 1 ? 'Overdue' : 'Due',
        isPartPaid: outstanding > 0 && rec + cred > 0,
        bucket: outstanding === 0 ? null : bucketFor(daysPastDue),
      };
    });
}

export interface ReceiptPosition {
  receipt: Receipt;
  settlement: Paise; // R5: bank + TDS
  allocated: Paise;
  unapplied: Paise;
}

/** R5 + R13: every receipt dated on or before asOf, with what is allocated and unapplied as at asOf. */
export function receiptPositions(data: ArData, asOf: string): ReceiptPosition[] {
  const allocated = new Map<number, Paise>();
  for (const a of data.allocations) {
    if (a.allocationDate <= asOf) allocated.set(a.receiptId, (allocated.get(a.receiptId) ?? 0) + a.amount);
  }
  return data.receipts
    .filter((r) => r.receiptDate <= asOf)
    .map((r) => {
      const settlement = settlementValue(r);
      const alloc = allocated.get(r.id) ?? 0;
      return { receipt: r, settlement, allocated: alloc, unapplied: settlement - alloc };
    });
}

/** R5. TDS counts as payment. */
export function settlementValue(r: Receipt): Paise {
  return r.bankAmount + r.tdsAmount;
}

export interface CustomerPosition {
  customer: Customer;
  buckets: Record<Bucket, Paise>;
  outstanding: Paise; // Σ invoice outstanding
  unapplied: Paise;
  netBalance: Paise; // outstanding − unapplied; negative = credit balance (Cr)
  overdue: Paise; // outstanding − Not due bucket
  overdueCount: number;
  overLimit: boolean;
  /** Net balance as a percentage of the credit limit, or null when the limit is zero. */
  limitUsedPct: number | null;
}

/** R13: one entry per customer. */
export function customerPositions(data: ArData, asOf: string): CustomerPosition[] {
  const invs = invoicePositions(data, asOf);
  const rcts = receiptPositions(data, asOf);
  return data.customers.map((customer) => {
    const buckets = emptyBuckets();
    let outstanding = 0;
    let overdueCount = 0;
    for (const p of invs) {
      if (p.invoice.customerId !== customer.id || p.bucket === null) continue;
      buckets[p.bucket] += p.outstanding;
      outstanding += p.outstanding;
      if (p.status === 'Overdue') overdueCount += 1;
    }
    let unapplied = 0;
    for (const r of rcts) if (r.receipt.customerId === customer.id) unapplied += r.unapplied;
    const netBalance = outstanding - unapplied;
    return {
      customer,
      buckets,
      outstanding,
      unapplied,
      netBalance,
      overdue: outstanding - buckets['Not due'],
      overdueCount,
      overLimit: netBalance > customer.creditLimit,
      limitUsedPct: customer.creditLimit > 0 ? (netBalance / customer.creditLimit) * 100 : null,
    };
  });
}

export function customerPosition(data: ArData, customerId: number, asOf: string): CustomerPosition | undefined {
  return customerPositions(data, asOf).find((p) => p.customer.id === customerId);
}

/**
 * R14: the balance worked out from the documents alone:
 *   Σ non-cancelled invoice totals − Σ credit-note totals − Σ receipt settlement values, all dated ≤ asOf.
 */
export function balanceByDocuments(data: ArData, customerId: number, asOf: string): Paise {
  const invoiceIds = new Set<number>();
  let balance = 0;
  for (const i of data.invoices) {
    if (i.customerId !== customerId) continue;
    invoiceIds.add(i.id);
    if (!i.isCancelled && i.invoiceDate <= asOf) balance += i.total;
  }
  for (const c of data.creditNotes) {
    if (invoiceIds.has(c.invoiceId) && c.creditNoteDate <= asOf) balance -= c.total;
  }
  for (const r of data.receipts) {
    if (r.customerId === customerId && r.receiptDate <= asOf) balance -= settlementValue(r);
  }
  return balance;
}

export interface BalanceDifference {
  customerId: number;
  code: string;
  netBalance: Paise;
  byDocuments: Paise;
  difference: Paise;
}

/** R14 control check: the customers whose net balance disagrees with the documents. Must always be empty. */
export function balanceCheck(data: ArData, asOf: string): BalanceDifference[] {
  const out: BalanceDifference[] = [];
  for (const p of customerPositions(data, asOf)) {
    const byDocuments = balanceByDocuments(data, p.customer.id, asOf);
    if (byDocuments !== p.netBalance) {
      out.push({
        customerId: p.customer.id,
        code: p.customer.code,
        netBalance: p.netBalance,
        byDocuments,
        difference: p.netBalance - byDocuments,
      });
    }
  }
  return out;
}

export interface PositionTotals {
  buckets: Record<Bucket, Paise>;
  outstanding: Paise;
  unapplied: Paise;
  netBalance: Paise;
  overdue: Paise;
  overdueCount: number;
}

/** Totals row for a list of customer positions (dashboard ageing table, ageing CSV). */
export function totalPositions(rows: CustomerPosition[]): PositionTotals {
  const t: PositionTotals = { buckets: emptyBuckets(), outstanding: 0, unapplied: 0, netBalance: 0, overdue: 0, overdueCount: 0 };
  for (const r of rows) {
    for (const b of BUCKETS) t.buckets[b] += r.buckets[b];
    t.outstanding += r.outstanding;
    t.unapplied += r.unapplied;
    t.netBalance += r.netBalance;
    t.overdue += r.overdue;
    t.overdueCount += r.overdueCount;
  }
  return t;
}
