'use client';

import { useState } from 'react';
import { addNote } from '@/lib/actions/notes';
import { Field, FormMessage, SubmitButton, inputClass, useActionForm } from './form';
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
  const { state, pending, onSubmit, formKey } = useActionForm(addNote);
  const v = (k: string, d = '') => state.values?.[k] ?? d;
  const e = state.fieldErrors ?? {};
  // Dropdowns are controlled so they keep their value when the form shows an error.
  const [noteType, setNoteType] = useState('Call');
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId ? String(defaultInvoiceId) : '');
  return (
    <form key={formKey} onSubmit={onSubmit} className="space-y-3 rounded border border-slate-200 bg-white p-3">
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="asof" value={asof} />
      <ReturnTo />
      <FormMessage error={state.error} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date *" error={e.noteDate}>
          <input type="date" name="noteDate" defaultValue={v('noteDate', defaultDate)} className={inputClass} required />
        </Field>
        <Field label="Type *" error={e.noteType}>
          <select name="noteType" value={noteType} onChange={(ev) => setNoteType(ev.target.value)} className={inputClass}>
            {['Call', 'Email', 'Meeting', 'Note'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Invoice (optional)" error={e.invoiceId}>
        <select name="invoiceId" value={invoiceId} onChange={(ev) => setInvoiceId(ev.target.value)} className={inputClass}>
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
      <SubmitButton pending={pending}>Add note</SubmitButton>
    </form>
  );
}
