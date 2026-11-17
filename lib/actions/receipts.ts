'use server';

/**
 * Payments: record a receipt with its allocations (R5, R6), allocate unapplied
 * credit later, remove an allocation, and delete a receipt with no allocations.
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { loadArData } from '@/lib/ar/load';
import { allocationProblems, nextNumber, receiptAvailable } from '@/lib/ar';
import { formatMoney, parseRupees, toRupees } from '@/lib/format';
import { amount, id, isoDate, optionalText } from './fields';
import { doneUrl, fieldErrorsFrom, formValues, friendlyDbError, isDuplicateKey, type ActionState } from './shared';

const MODES = ['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque'] as const;

const receiptSchema = z.object({
  customerId: z.coerce.number('Choose a customer.').int().positive('Choose a customer.'),
  receiptDate: isoDate('Receipt date'),
  bankAmount: amount('Bank amount'),
  tdsAmount: amount('TDS'),
  mode: z.enum(MODES, 'Choose the payment mode.'),
  reference: optionalText(100),
});

/** Allocation fields arrive as alloc_<invoiceId> = rupees. Blank or zero means "not allocated". */
function readAllocations(values: Record<string, string>): { allocations: { invoiceId: number; amount: number }[]; errors: Record<string, string> } {
  const allocations: { invoiceId: number; amount: number }[] = [];
  const errors: Record<string, string> = {};
  for (const [k, v] of Object.entries(values)) {
    if (!k.startsWith('alloc_') || v.trim() === '') continue;
    const p = parseRupees(v);
    if (p === null || p < 0) errors[k] = 'Enter an amount in rupees.';
    else if (p > 0) allocations.push({ invoiceId: Number(k.slice(6)), amount: p });
  }
  return { allocations, errors };
}

export async function recordPayment(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  const parsed = receiptSchema.safeParse(values);
  const alloc = readAllocations(values);
  if (!parsed.success || Object.keys(alloc.errors).length) {
    return { error: 'Please correct the highlighted fields.', fieldErrors: { ...(parsed.success ? {} : fieldErrorsFrom(parsed.error)), ...alloc.errors }, values };
  }
  const r = parsed.data;
  const settlement = r.bankAmount + r.tdsAmount;
  if (settlement <= 0) return { error: 'Enter the bank amount and/or TDS: the settlement value must be more than zero.', values };

  for (let attempt = 0; attempt < 2; attempt++) {
    const data = await loadArData();
    const customer = data.customers.find((c) => c.id === r.customerId);
    if (!customer) return { error: 'Customer not found.', values };

    // 2. Business rules (R6), before touching the database
    const problems = allocationProblems(
      data,
      { id: 0, customerId: r.customerId, receiptDate: r.receiptDate, receiptNo: '', settlement },
      alloc.allocations.map((a) => ({ ...a, allocationDate: r.receiptDate })),
    );
    if (problems.length) return { error: problems.join(' '), values };

    // 3. Write the receipt and get its id back
    const receiptNo = nextNumber('receipt', data, r.receiptDate);
    const { data: saved, error } = await db
      .from('receipts')
      .insert({
        receipt_no: receiptNo,
        customer_id: r.customerId,
        receipt_date: r.receiptDate,
        bank_amount: toRupees(r.bankAmount),
        tds_amount: toRupees(r.tdsAmount),
        mode: r.mode,
        reference: r.reference ?? '',
      })
      .select('id')
      .single();
    if (error) {
      if (isDuplicateKey(error.message) && attempt === 0) continue;
      return { error: friendlyDbError(error.message), values };
    }

    // ...then all its allocations in one insert. If they fail, remove the receipt so nothing half-saved remains.
    if (alloc.allocations.length) {
      const { error: allocError } = await db.from('allocations').insert(
        alloc.allocations.map((a) => ({ receipt_id: saved.id, invoice_id: a.invoiceId, allocation_date: r.receiptDate, amount: toRupees(a.amount) })),
      );
      if (allocError) {
        await db.from('receipts').delete().eq('id', saved.id);
        return { error: `The payment was not saved because its allocations were rejected: ${friendlyDbError(allocError.message)}`, values };
      }
    }

    revalidatePath('/', 'layout');
    // Show the customer as at the receipt date or later, so the new receipt is visible.
    const asof = values.asof && values.asof >= r.receiptDate ? values.asof : r.receiptDate;
    redirect(doneUrl(`/customers/${r.customerId}?asof=${asof}`, `Payment ${receiptNo} saved.`));
  }
  return { error: 'Could not get a free receipt number. Please try again.', values };
}

const allocateSchema = z.object({
  receiptId: z.coerce.number('Choose a receipt.').int().positive('Choose a receipt.'),
  invoiceId: z.coerce.number('Choose an invoice.').int().positive('Choose an invoice.'),
  allocationDate: isoDate('Allocation date'),
  amount: amount('Amount', { allowZero: false }),
});

/** Allocate a receipt's unapplied credit to an invoice (R6), with its own allocation date. */
export async function allocateCredit(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  const parsed = allocateSchema.safeParse(values);
  if (!parsed.success) return { error: 'Please correct the highlighted fields.', fieldErrors: fieldErrorsFrom(parsed.error), values };
  const a = parsed.data;
  const data = await loadArData();
  const receipt = data.receipts.find((x) => x.id === a.receiptId);
  if (!receipt) return { error: 'Receipt not found.', values };
  const problems = allocationProblems(
    data,
    { ...receipt, settlement: receipt.bankAmount + receipt.tdsAmount },
    [{ invoiceId: a.invoiceId, allocationDate: a.allocationDate, amount: a.amount }],
  );
  if (problems.length) return { error: problems.join(' '), values };

  const { error } = await db.from('allocations').insert({ receipt_id: a.receiptId, invoice_id: a.invoiceId, allocation_date: a.allocationDate, amount: toRupees(a.amount) });
  if (error) return { error: friendlyDbError(error.message), values };
  revalidatePath('/', 'layout');
  const left = receiptAvailable(data, a.receiptId) - a.amount;
  redirect(doneUrl(values.returnTo, `Allocated ${formatMoney(a.amount)} from ${receipt.receiptNo}. ${formatMoney(left)} of it remains unapplied.`));
}

/** Correction: remove an allocation. The amount goes back to the receipt's unapplied credit. */
export async function removeAllocation(fd: FormData): Promise<void> {
  const values = formValues(fd);
  const p = z.object({ id }).parse(values);
  const { error } = await db.from('allocations').delete().eq('id', p.id);
  if (error) throw new Error(friendlyDbError(error.message));
  revalidatePath('/', 'layout');
  redirect(doneUrl(values.returnTo, "Allocation removed. The amount is back in the receipt's unapplied credit."));
}

/** Correction: delete a receipt that has no allocations (R6). */
export async function deleteReceipt(fd: FormData): Promise<void> {
  const values = formValues(fd);
  const p = z.object({ id }).parse(values);
  const data = await loadArData();
  const receipt = data.receipts.find((r) => r.id === p.id);
  if (!receipt) throw new Error('Receipt not found.');
  if (data.allocations.some((a) => a.receiptId === p.id)) {
    throw new Error(`${receipt.receiptNo} still has allocations. Remove them first, then delete the receipt.`);
  }
  const { error } = await db.from('receipts').delete().eq('id', p.id);
  if (error) throw new Error(friendlyDbError(error.message));
  revalidatePath('/', 'layout');
  redirect(doneUrl(values.returnTo, `Receipt ${receipt.receiptNo} deleted.`));
}
