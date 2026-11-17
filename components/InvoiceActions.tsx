'use client';

import { useActionState, useState } from 'react';
import { cancelInvoice, createCreditNote } from '@/lib/actions/invoices';
import type { ActionState } from '@/lib/actions/shared';
import { creditNoteGst, totalWithGst } from '@/lib/ar/tax';
import type { Invoice } from '@/lib/ar/types';
import { formatMoney, parseRupees } from '@/lib/format';
import { Field, FormMessage, SubmitButton, inputClass } from './form';

/** R7. Raise a credit note, with a preview of its GST (the invoice's rate and split) and total. */
export function CreditNoteForm({ invoice, available, defaultDate, nextNo }: { invoice: Invoice; available: number; defaultDate: string; nextNo: string }) {
  const [state, action] = useActionState<ActionState, FormData>(createCreditNote, {});
  const [taxable, setTaxable] = useState('');
  const p = parseRupees(taxable);
  const gst = p && p > 0 ? creditNoteGst(invoice, p) : null;
  const total = gst && p ? totalWithGst(p, gst) : null;
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-3 rounded border border-slate-200 bg-white p-3" key={state.ok ? state.message : 'form'}>
      <input type="hidden" name="invoiceId" value={invoice.id} />
      <FormMessage error={state.error} message={state.message} />
      <p className="text-xs text-slate-500">
        Next number {nextNo}. Up to {formatMoney(available)} can still be credited (total including GST).
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date *" error={e.creditNoteDate}>
          <input type="date" name="creditNoteDate" defaultValue={state.values?.creditNoteDate ?? defaultDate} min={invoice.invoiceDate} className={inputClass} required />
        </Field>
        <Field label="Taxable value (₹) *" error={e.taxableValue}>
          <input name="taxableValue" inputMode="decimal" value={taxable} onChange={(ev) => setTaxable(ev.target.value)} className={inputClass} required />
        </Field>
      </div>
      <Field label="Reason *" error={e.reason}>
        <input name="reason" defaultValue={state.values?.reason ?? ''} className={inputClass} required maxLength={300} />
      </Field>
      {gst && total !== null && (
        <p className={`text-sm ${total > available ? 'text-red-700' : 'text-slate-700'}`}>
          GST {gst.igst > 0 ? `IGST ${formatMoney(gst.igst)}` : `CGST ${formatMoney(gst.cgst)} + SGST ${formatMoney(gst.sgst)}`} · Credit note total <b>{formatMoney(total)}</b>
          {total > available && ' — more than can be credited'}
        </p>
      )}
      <SubmitButton>Raise credit note</SubmitButton>
    </form>
  );
}

/** R8. Cancel, with a confirmation step. */
export function CancelInvoiceButton({ invoiceId, invoiceNo, blockedReason }: { invoiceId: number; invoiceNo: string; blockedReason: string | null }) {
  const [state, action] = useActionState<ActionState, FormData>(cancelInvoice, {});
  const [confirming, setConfirming] = useState(false);
  if (blockedReason) return <p className="text-xs text-slate-500">Cannot cancel: {blockedReason}</p>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="id" value={invoiceId} />
      <FormMessage error={state.error} message={state.message} />
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)} className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50">
          Cancel invoice…
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span>Cancel {invoiceNo}? This cannot be undone; the number is not reused.</span>
          <SubmitButton danger pendingText="Cancelling…">Yes, cancel it</SubmitButton>
          <button type="button" onClick={() => setConfirming(false)} className="text-blue-700 underline">
            No
          </button>
        </div>
      )}
    </form>
  );
}
