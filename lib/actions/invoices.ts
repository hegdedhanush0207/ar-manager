'use server';

/**
 * Invoice actions: preview and create (R2, R3, R4, R9), credit notes (R7),
 * cancel (R8) and the disputed flag. Each follows brief section 4.8:
 * validate → check business rules with lib/ar → write → refresh.
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { loadArData } from '@/lib/ar/load';
import {
  balanceByDocuments,
  cancelProblem,
  creditLimitWarning,
  creditNoteGst,
  dueDate,
  gstSplit,
  invoiceAvailable,
  nextNumber,
  todayInIndia,
  totalWithGst,
  type ArData,
} from '@/lib/ar';
import { formatDate, formatMoney, toRupees } from '@/lib/format';
import { amount, id, isoDate, requiredText } from './fields';
import { doneUrl, fieldErrorsFrom, formValues, friendlyDbError, isDuplicateKey, type ActionState } from './shared';

const invoiceSchema = z.object({
  customerId: z.coerce.number('Choose a customer.').int().positive('Choose a customer.'),
  invoiceDate: isoDate('Invoice date'),
  description: requiredText('Description', 300),
  taxableValue: amount('Taxable value', { allowZero: false }),
  gstRatePct: z.coerce.number('GST rate must be a number.').min(0, 'GST rate cannot be negative.').max(100, 'GST rate must be at most 100.'),
});

export interface InvoicePreview {
  ok: boolean;
  fieldErrors?: Record<string, string>;
  error?: string;
  invoiceNo?: string;
  dueDate?: string;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total?: number;
  warning?: string | null;
}

function buildInvoice(data: ArData, input: z.infer<typeof invoiceSchema>) {
  const customer = data.customers.find((c) => c.id === input.customerId);
  if (!customer) return { error: 'Customer not found.' } as const;
  if (!customer.isActive) return { error: `${customer.name} is inactive. Reactivate the customer before raising an invoice (R9).` } as const;
  const gst = gstSplit(customer.state, input.taxableValue, input.gstRatePct);
  const total = totalWithGst(input.taxableValue, gst);
  // R9 warning: the customer's net balance (by documents) as at the later of the invoice date and today, plus this invoice
  const today = todayInIndia();
  const basis = input.invoiceDate > today ? input.invoiceDate : today;
  const warning = creditLimitWarning(customer, balanceByDocuments(data, customer.id, basis), total);
  return {
    customer,
    gst,
    total,
    warning,
    dueDate: dueDate(input.invoiceDate, customer.creditDays),
    invoiceNo: nextNumber('invoice', data, input.invoiceDate),
  } as const;
}

/** Live preview for the create form: tax split, total, due date, next number and the credit-limit warning. */
export async function previewInvoice(values: Record<string, string>): Promise<InvoicePreview> {
  const parsed = invoiceSchema.safeParse({ ...values, description: values.description || '-' });
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  const built = buildInvoice(await loadArData(), parsed.data);
  if ('error' in built) return { ok: false, error: built.error };
  return { ok: true, invoiceNo: built.invoiceNo, dueDate: built.dueDate, ...built.gst, total: built.total, warning: built.warning };
}

export async function createInvoice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  const parsed = invoiceSchema.safeParse(values);
  if (!parsed.success) return { error: 'Please correct the highlighted fields.', fieldErrors: fieldErrorsFrom(parsed.error), values };

  let newId: number | null = null;
  for (let attempt = 0; attempt < 2 && newId === null; attempt++) {
    const data = await loadArData();
    const built = buildInvoice(data, parsed.data);
    if ('error' in built) return { error: built.error, values };
    const { data: row, error } = await db
      .from('invoices')
      .insert({
        invoice_no: built.invoiceNo,
        customer_id: built.customer.id,
        invoice_date: parsed.data.invoiceDate,
        due_date: built.dueDate,
        description: parsed.data.description,
        taxable_value: toRupees(parsed.data.taxableValue),
        gst_rate_pct: parsed.data.gstRatePct,
        cgst: toRupees(built.gst.cgst),
        sgst: toRupees(built.gst.sgst),
        igst: toRupees(built.gst.igst),
        total: toRupees(built.total),
        is_cancelled: false,
        is_disputed: false,
      })
      .select('id')
      .single();
    if (error) {
      // Two tabs may have taken the same number: work it out again and retry once (brief section 4.8)
      if (isDuplicateKey(error.message) && attempt === 0) continue;
      return { error: friendlyDbError(error.message), values };
    }
    newId = row.id;
  }

  revalidatePath('/', 'layout');
  redirect(`/invoices/${newId}?asof=${encodeURIComponent(values.asof ?? '')}`);
}

/** Set or clear the disputed flag (a label only; it changes no amount). */
export async function setDisputed(fd: FormData): Promise<void> {
  const values = formValues(fd);
  const p = z.object({ id, disputed: z.enum(['true', 'false']) }).parse(values);
  const { error } = await db.from('invoices').update({ is_disputed: p.disputed === 'true' }).eq('id', p.id);
  if (error) throw new Error(friendlyDbError(error.message));
  revalidatePath('/', 'layout');
  redirect(doneUrl(values.returnTo, p.disputed === 'true' ? 'Marked as disputed.' : 'Disputed flag cleared.'));
}

/** R8. Cancel an invoice that has nothing allocated or credited against it. */
export async function cancelInvoice(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  const p = z.object({ id }).safeParse(values);
  if (!p.success) return { error: 'Invalid request.' };
  const problem = cancelProblem(await loadArData(), p.data.id);
  if (problem) return { error: problem };
  const { error } = await db.from('invoices').update({ is_cancelled: true }).eq('id', p.data.id);
  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath('/', 'layout');
  redirect(doneUrl(values.returnTo, 'Invoice cancelled. It keeps its number and is left out of every total.'));
}

const creditNoteSchema = z.object({
  invoiceId: id,
  creditNoteDate: isoDate('Credit note date'),
  taxableValue: amount('Taxable value', { allowZero: false }),
  reason: requiredText('Reason', 300),
});

/** R7. Raise a credit note against an invoice, with GST at the invoice's rate and split. */
export async function createCreditNote(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  const parsed = creditNoteSchema.safeParse(values);
  if (!parsed.success) return { error: 'Please correct the highlighted fields.', fieldErrors: fieldErrorsFrom(parsed.error), values };
  const cn = parsed.data;

  for (let attempt = 0; attempt < 2; attempt++) {
    const data = await loadArData();
    const invoice = data.invoices.find((i) => i.id === cn.invoiceId);
    if (!invoice) return { error: 'Invoice not found.', values };
    if (invoice.isCancelled) return { error: `${invoice.invoiceNo} is cancelled, so it cannot be credited.`, values };
    if (cn.creditNoteDate < invoice.invoiceDate) {
      return { error: 'Please correct the highlighted fields.', fieldErrors: { creditNoteDate: `A credit note cannot be dated before the invoice (${formatDate(invoice.invoiceDate)}).` }, values };
    }
    const gst = creditNoteGst(invoice, cn.taxableValue);
    const total = totalWithGst(cn.taxableValue, gst);
    const available = invoiceAvailable(data, invoice.id);
    if (total > available) {
      return {
        error: 'Please correct the highlighted fields.',
        fieldErrors: { taxableValue: `The credit note total would be ${formatMoney(total)}, but ${invoice.invoiceNo} has only ${formatMoney(available)} left after payments and earlier credit notes.` },
        values,
      };
    }
    const creditNoteNo = nextNumber('creditNote', data, cn.creditNoteDate);
    const { error } = await db.from('credit_notes').insert({
      credit_note_no: creditNoteNo,
      invoice_id: invoice.id,
      credit_note_date: cn.creditNoteDate,
      taxable_value: toRupees(cn.taxableValue),
      cgst: toRupees(gst.cgst),
      sgst: toRupees(gst.sgst),
      igst: toRupees(gst.igst),
      total: toRupees(total),
      reason: cn.reason,
    });
    if (error) {
      if (isDuplicateKey(error.message) && attempt === 0) continue;
      return { error: friendlyDbError(error.message), values };
    }
    revalidatePath('/', 'layout');
    redirect(doneUrl(values.returnTo, `Credit note ${creditNoteNo} for ${formatMoney(total)} saved.`));
  }
  return { error: 'Could not get a free credit note number. Please try again.', values };
}
