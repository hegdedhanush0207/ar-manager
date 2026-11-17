'use server';

/**
 * R16. Notes: add a note (with an optional follow-up and an optional promise
 * to pay), and mark a follow-up as done.
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { loadArData } from '@/lib/ar/load';
import { formatDate, toRupees } from '@/lib/format';
import { id, isoDate, optionalAmount, optionalIsoDate, requiredText } from './fields';
import { doneUrl, fieldErrorsFrom, formValues, friendlyDbError, type ActionState } from './shared';

const noteSchema = z
  .object({
    customerId: id,
    invoiceId: z.string().transform((s) => (s ? Number(s) : null)),
    noteDate: isoDate('Date'),
    noteType: z.enum(['Call', 'Email', 'Meeting', 'Note'], 'Choose a type.'),
    body: requiredText('Note', 2000),
    followUpDate: optionalIsoDate('Follow-up date'),
    promiseDate: optionalIsoDate('Promise date'),
    promiseAmount: optionalAmount('Promise amount'),
  })
  .superRefine((n, ctx) => {
    // A promise to pay has a date and an amount: both or neither.
    if (n.promiseDate && n.promiseAmount === null) ctx.addIssue({ code: 'custom', path: ['promiseAmount'], message: 'Enter the promised amount, or clear the promise date.' });
    if (!n.promiseDate && n.promiseAmount !== null) ctx.addIssue({ code: 'custom', path: ['promiseDate'], message: 'Enter the promised date, or clear the amount.' });
    if (n.promiseDate && n.promiseDate < n.noteDate) ctx.addIssue({ code: 'custom', path: ['promiseDate'], message: 'The promise date cannot be before the note date.' });
    if (n.followUpDate && n.followUpDate < n.noteDate) ctx.addIssue({ code: 'custom', path: ['followUpDate'], message: 'The follow-up date cannot be before the note date.' });
  });

export async function addNote(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  const parsed = noteSchema.safeParse(values);
  if (!parsed.success) return { error: 'Please correct the highlighted fields.', fieldErrors: fieldErrorsFrom(parsed.error), values };
  const n = parsed.data;

  const data = await loadArData();
  if (!data.customers.some((c) => c.id === n.customerId)) return { error: 'Customer not found.', values };
  if (n.invoiceId !== null) {
    const inv = data.invoices.find((i) => i.id === n.invoiceId);
    if (!inv || inv.customerId !== n.customerId) return { error: 'That invoice belongs to another customer.', values };
  }

  const { error } = await db.from('notes').insert({
    customer_id: n.customerId,
    invoice_id: n.invoiceId,
    note_date: n.noteDate,
    note_type: n.noteType,
    body: n.body,
    follow_up_date: n.followUpDate,
    follow_up_done: false,
    promise_date: n.promiseDate,
    promise_amount: n.promiseAmount === null ? null : toRupees(n.promiseAmount),
  });
  if (error) return { error: friendlyDbError(error.message), values };
  revalidatePath('/', 'layout');
  const extra = n.noteDate > (values.asof ?? '') ? ` It is dated ${formatDate(n.noteDate)}, after the as-at date, so it shows from that date.` : '';
  redirect(doneUrl(values.returnTo, `Note added.${extra}`));
}

export async function markFollowUpDone(fd: FormData): Promise<void> {
  const values = formValues(fd);
  const p = z.object({ id }).parse(values);
  const { error } = await db.from('notes').update({ follow_up_done: true }).eq('id', p.id);
  if (error) throw new Error(friendlyDbError(error.message));
  revalidatePath('/', 'layout');
  redirect(doneUrl(values.returnTo, 'Follow-up marked as done.'));
}
