/**
 * Business-rule checks used before writing to the database (brief section 4.8),
 * and the oldest-first allocation suggestion (R6).
 *
 * Limits here are "all time", not as at a date: an invoice can never have more
 * allocated and credited than its total, whatever the dates (R6, R7).
 */
import type { ArData, Customer, Invoice, Paise, Receipt } from './types';
import { settlementValue } from './positions';
import { formatMoney } from '../format';

/** What can still be allocated or credited to an invoice: total − all allocations − all credit notes. */
export function invoiceAvailable(data: ArData, invoiceId: number): Paise {
  const inv = data.invoices.find((i) => i.id === invoiceId);
  if (!inv || inv.isCancelled) return 0;
  let used = 0;
  for (const a of data.allocations) if (a.invoiceId === invoiceId) used += a.amount;
  for (const c of data.creditNotes) if (c.invoiceId === invoiceId) used += c.total;
  return inv.total - used;
}

/** What is still unallocated on a receipt, all time: settlement − all its allocations. */
export function receiptAvailable(data: ArData, receiptId: number): Paise {
  const r = data.receipts.find((x) => x.id === receiptId);
  if (!r) return 0;
  let used = 0;
  for (const a of data.allocations) if (a.receiptId === receiptId) used += a.amount;
  return settlementValue(r) - used;
}

export interface OpenInvoice {
  invoice: Invoice;
  available: Paise;
}

/**
 * A customer's invoices that can take an allocation on `date`: not cancelled,
 * dated on or before `date`, with something left to settle.
 * Sorted oldest first: by due date, then invoice number (R6).
 */
export function openInvoicesFor(data: ArData, customerId: number, date?: string): OpenInvoice[] {
  return data.invoices
    .filter((i) => i.customerId === customerId && !i.isCancelled && (!date || i.invoiceDate <= date))
    .map((invoice) => ({ invoice, available: invoiceAvailable(data, invoice.id) }))
    .filter((o) => o.available > 0)
    .sort((a, b) => a.invoice.dueDate.localeCompare(b.invoice.dueDate) || a.invoice.invoiceNo.localeCompare(b.invoice.invoiceNo));
}

export interface SuggestedAllocation {
  invoiceId: number;
  amount: Paise;
}

/** R6. Allocate `amount` to the open invoices oldest first. Whatever is left stays unapplied. */
export function suggestAllocations(open: OpenInvoice[], amount: Paise): SuggestedAllocation[] {
  const out: SuggestedAllocation[] = [];
  let left = amount;
  for (const o of open) {
    if (left <= 0) break;
    const a = Math.min(left, o.available);
    out.push({ invoiceId: o.invoice.id, amount: a });
    left -= a;
  }
  return out;
}

/**
 * R5. The expected TDS for a bank amount, pre-filled on the payment form.
 * TDS is the customer's rate on the taxable value (not the total). Working
 * oldest first, each invoice's outstanding amount is split pro rata into its
 * taxable part, and the bank amount is "grossed up" by the TDS the customer
 * would have deducted on that part. The user always enters what was actually deducted.
 */
export function expectedTds(open: OpenInvoice[], bankAmount: Paise, tdsRatePct: number): Paise {
  if (tdsRatePct <= 0 || bankAmount <= 0) return 0;
  let bankLeft = bankAmount;
  let tds = 0;
  for (const o of open) {
    if (bankLeft <= 0) break;
    const taxableShare = o.invoice.total > 0 ? o.invoice.taxableValue / o.invoice.total : 0;
    const tdsFraction = (tdsRatePct / 100) * taxableShare; // TDS per rupee settled
    const fullTds = Math.round(o.available * tdsFraction);
    const bankForFull = o.available - fullTds;
    if (bankLeft >= bankForFull) {
      tds += fullTds;
      bankLeft -= bankForFull;
    } else {
      const settled = Math.round(bankLeft / (1 - tdsFraction));
      tds += settled - bankLeft;
      bankLeft = 0;
    }
  }
  return tds;
}

export interface AllocationInput {
  receiptId: number;
  invoiceId: number;
  allocationDate: string;
  amount: Paise;
}

/**
 * R6. Checks one or more new allocations against the rules, in plain language.
 * `receipt` may be a receipt that is about to be created (with id 0 and no allocations yet).
 */
export function allocationProblems(
  data: ArData,
  receipt: Pick<Receipt, 'id' | 'customerId' | 'receiptDate' | 'receiptNo'> & { settlement: Paise },
  allocations: Omit<AllocationInput, 'receiptId'>[],
): string[] {
  const problems: string[] = [];
  const alreadyAllocated = receipt.id === 0 ? 0 : data.allocations.filter((a) => a.receiptId === receipt.id).reduce((s, a) => s + a.amount, 0);
  const receiptLeft = receipt.settlement - alreadyAllocated;
  const newTotal = allocations.reduce((s, a) => s + a.amount, 0);
  if (newTotal > receiptLeft) {
    problems.push(`The allocations add up to more than the ${receipt.id === 0 ? 'settlement value (bank + TDS)' : 'unapplied credit'} available on ${receipt.receiptNo || 'this receipt'} (${formatMoney(receiptLeft)}).`);
  }
  const perInvoice = new Map<number, Paise>();
  for (const a of allocations) {
    if (a.amount <= 0) {
      problems.push('Each allocation must be more than zero.');
      continue;
    }
    const inv = data.invoices.find((i) => i.id === a.invoiceId);
    if (!inv) {
      problems.push('An allocation refers to an invoice that does not exist.');
      continue;
    }
    if (inv.customerId !== receipt.customerId) problems.push(`${inv.invoiceNo} belongs to a different customer.`);
    if (inv.isCancelled) problems.push(`${inv.invoiceNo} is cancelled, so nothing can be allocated to it.`);
    if (a.allocationDate < receipt.receiptDate) problems.push(`The allocation date for ${inv.invoiceNo} is before the receipt date.`);
    if (a.allocationDate < inv.invoiceDate) problems.push(`The allocation date for ${inv.invoiceNo} is before the invoice date (${inv.invoiceDate}).`);
    perInvoice.set(inv.id, (perInvoice.get(inv.id) ?? 0) + a.amount);
  }
  for (const [invoiceId, amount] of perInvoice) {
    const available = invoiceAvailable(data, invoiceId);
    const inv = data.invoices.find((i) => i.id === invoiceId)!;
    if (amount > available && !inv.isCancelled) {
      problems.push(`${inv.invoiceNo} has only ${formatMoney(available)} left to settle; you tried to allocate ${formatMoney(amount)}.`);
    }
  }
  return problems;
}

/** R8. An invoice can be cancelled only if nothing has been allocated or credited against it. */
export function cancelProblem(data: ArData, invoiceId: number): string | null {
  const inv = data.invoices.find((i) => i.id === invoiceId);
  if (!inv) return 'Invoice not found.';
  if (inv.isCancelled) return `${inv.invoiceNo} is already cancelled.`;
  if (data.allocations.some((a) => a.invoiceId === invoiceId)) return `${inv.invoiceNo} has payments allocated to it. Remove the allocations first.`;
  if (data.creditNotes.some((c) => c.invoiceId === invoiceId)) return `${inv.invoiceNo} has a credit note against it, so it cannot be cancelled.`;
  return null;
}

/** R9. A customer with any records cannot be deleted. */
export function customerHasRecords(data: ArData, customerId: number): boolean {
  return (
    data.invoices.some((i) => i.customerId === customerId) ||
    data.receipts.some((r) => r.customerId === customerId) ||
    data.notes.some((n) => n.customerId === customerId)
  );
}

/** R9. Would a new invoice of `total` take the customer's net balance above its credit limit? */
export function creditLimitWarning(customer: Customer, netBalanceBefore: Paise, total: Paise): string | null {
  const after = netBalanceBefore + total;
  if (after <= customer.creditLimit) return null;
  return `This invoice takes ${customer.name}'s net balance to ${formatMoney(after)}, above its credit limit of ${formatMoney(customer.creditLimit)}. You can still save it.`;
}
