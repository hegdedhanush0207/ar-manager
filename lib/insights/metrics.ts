/**
 * Phase 2, section 1: customer-wise insight metrics.
 *
 * Self-contained: these calculations do not call or change the Phase 1
 * calculation module (lib/ar). They read the same loaded data (ArData, whole
 * paise) and use the same date helper, so the as-at rule is identical: a record
 * counts only if its own date is on or before the as-at date.
 *
 * Rules (Phase 2 brief):
 *  - customer-wise; all available history up to the as-at date
 *  - cancelled invoices excluded; reversed (deleted) payments no longer exist in the data
 *  - payment frequency needs at least two payment dates, invoice frequency at least two invoices
 *  - "not enough data" is null (shown as N/A), never zero
 */
import type { ArData, Customer, Invoice, Paise } from '../ar/types';
import { daysBetween } from '../ar/dates';
import { ratioText } from './round';

export interface CustomerInsight {
  customer: Customer;
  /** Σ outstanding balances of the customer's invoices: total − payments allocated − credit notes. */
  outstanding: Paise;
  /** Average days between successive (distinct) payment dates, or null with fewer than two. */
  paymentFrequency: number | null;
  paymentDateCount: number;
  /** Average days between successive invoice dates, or null with fewer than two invoices. */
  invoiceFrequency: number | null;
  invoiceCount: number;
  /** Average days from invoice date to final settlement date, fully settled invoices only; null if none. */
  avgCollectionPeriod: number | null;
  settledInvoiceCount: number;
  /** The three averages as display text, rounded exactly to one decimal ("N/A" when null). */
  text: { paymentFrequency: string; invoiceFrequency: string; avgCollectionPeriod: string };
}

/** An average kept as whole-number total ÷ count, so it can be shown exactly. */
export interface Average {
  value: number;
  totalDays: number;
  count: number;
}

const show = (a: Average | null) => (a ? `${ratioText(a.totalDays, a.count, 1)} days` : 'N/A');

/** Average gap between successive dates (sorted). With n dates there are n − 1 gaps; their sum is last − first. */
export function averageGap(sortedDates: string[]): Average | null {
  if (sortedDates.length < 2) return null;
  let total = 0;
  for (let i = 1; i < sortedDates.length; i++) total += daysBetween(sortedDates[i - 1], sortedDates[i]);
  return { value: total / (sortedDates.length - 1), totalDays: total, count: sortedDates.length - 1 };
}

export interface InvoiceSettlement {
  invoice: Invoice;
  received: Paise; // payments (bank + TDS, via allocations) dated ≤ as-at
  credited: Paise; // credit notes dated ≤ as-at
  outstanding: Paise;
  /** Date the balance reached zero (the last allocation or credit note), or null if not fully settled. */
  settledOn: string | null;
}

/** Each live invoice dated on or before asOf, with what was received and credited by asOf. */
export function invoiceSettlements(data: ArData, asOf: string, customerId?: number): InvoiceSettlement[] {
  const out: InvoiceSettlement[] = [];
  for (const invoice of data.invoices) {
    if (invoice.isCancelled || invoice.invoiceDate > asOf) continue;
    if (customerId !== undefined && invoice.customerId !== customerId) continue;
    let received = 0;
    let credited = 0;
    let lastEvent = '';
    for (const a of data.allocations) {
      if (a.invoiceId !== invoice.id || a.allocationDate > asOf) continue;
      received += a.amount;
      if (a.allocationDate > lastEvent) lastEvent = a.allocationDate;
    }
    for (const c of data.creditNotes) {
      if (c.invoiceId !== invoice.id || c.creditNoteDate > asOf) continue;
      credited += c.total;
      if (c.creditNoteDate > lastEvent) lastEvent = c.creditNoteDate;
    }
    const outstanding = invoice.total - received - credited;
    out.push({ invoice, received, credited, outstanding, settledOn: outstanding === 0 && lastEvent ? lastEvent : null });
  }
  return out;
}

export function customerInsights(data: ArData, asOf: string): CustomerInsight[] {
  return data.customers.map((customer) => {
    const settlements = invoiceSettlements(data, asOf, customer.id);

    const outstanding = settlements.reduce((s, x) => s + x.outstanding, 0);

    // Payment frequency: distinct receipt dates (one day with two receipts is one payment date).
    const paymentDates = [...new Set(data.receipts.filter((r) => r.customerId === customer.id && r.receiptDate <= asOf).map((r) => r.receiptDate))].sort();

    // Invoice frequency: every live invoice counts (two on the same day give a gap of 0).
    const invoiceDates = settlements.map((s) => s.invoice.invoiceDate).sort();

    // Collection period: only invoices fully settled by asOf, and only those where money was
    // actually collected (an invoice wiped out entirely by credit notes involved no collection).
    const collected = settlements.filter((s) => s.settledOn !== null && s.received > 0);
    const collectionDays = collected.reduce((sum, s) => sum + daysBetween(s.invoice.invoiceDate, s.settledOn!), 0);
    const acp: Average | null = collected.length ? { value: collectionDays / collected.length, totalDays: collectionDays, count: collected.length } : null;
    const pay = averageGap(paymentDates);
    const inv = averageGap(invoiceDates);

    return {
      customer,
      outstanding,
      paymentFrequency: pay?.value ?? null,
      paymentDateCount: paymentDates.length,
      invoiceFrequency: inv?.value ?? null,
      invoiceCount: invoiceDates.length,
      avgCollectionPeriod: acp?.value ?? null,
      settledInvoiceCount: collected.length,
      text: { paymentFrequency: show(pay), invoiceFrequency: show(inv), avgCollectionPeriod: show(acp) },
    };
  });
}

/** Total outstanding AR across the rows shown (the table's totals row). */
export function totalOutstanding(rows: CustomerInsight[]): Paise {
  return rows.reduce((s, r) => s + r.outstanding, 0);
}
