'use client';

import { useActionState } from 'react';
import { addNote } from '@/lib/actions/notes';
import type { ActionState } from '@/lib/actions/shared';
import { Field, FormMessage, SubmitButton, inputClass } from './form';
import { ReturnTo } from './ReturnTo';

/** R16. Add a note: type, text, optional invoice, optional follow-up, optional promise to pay (date and amount, both or neither). */
export function NoteForm({
  customerId,
  invoices,
  defaultInvoiceId,
  defaultDate,
  asof,
}: {
  customerId: number;
  invoices: { id: number; invoiceNo: string }[];
  defaultInvoiceId?: number;
  defaultDate: string;
  asof: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(addNote, {});
  const v = (k: string, d = '') => state.values?.[k] ?? d;
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3 rounded border border-slate-200 bg-white p-3">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="asof" value={asof} />
      <ReturnTo />
      <FormMessage error={state.error} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date *" error={e.noteDate}>
          <input type="date" name="noteDate" defaultValue={v('noteDate', defaultDate)} className={inputClass} required />
        </Field>
        <Field label="Type *" error={e.noteType}>
          <select name="noteType" defaultValue={v('noteType', 'Call')} className={inputClass}>
            {['Call', 'Email', 'Meeting', 'Note'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Invoice (optional)" error={e.invoiceId}>
        <select name="invoiceId" defaultValue={v('invoiceId', defaultInvoiceId ? String(defaultInvoiceId) : '')} className={inputClass}>
          <option value="">— Whole account —</option>
          {invoices.map((i) => (
            <option key={i.id} value={i.id}>
              {i.invoiceNo}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Note *" error={e.body}>
        <textarea name="body" rows={3} defaultValue={v('body')} className={inputClass} required maxLength={2000} />
      </Field>
      <Field label="Follow up on (optional)" error={e.followUpDate}>
        <input type="date" name="followUpDate" defaultValue={v('followUpDate')} className={inputClass} />
      </Field>
      <fieldset className="rounded border border-dashed border-slate-300 p-2">
        <legend className="px-1 text-xs text-slate-500">Promise to pay (optional: date and amount together)</legend>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Promised by" error={e.promiseDate}>
            <input type="date" name="promiseDate" defaultValue={v('promiseDate')} className={inputClass} />
          </Field>
          <Field label="Amount (₹)" error={e.promiseAmount}>
            <input name="promiseAmount" inputMode="decimal" defaultValue={v('promiseAmount')} className={inputClass} />
          </Field>
        </div>
      </fieldset>
      <SubmitButton>Add note</SubmitButton>
    </form>
  );
}
