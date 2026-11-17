'use client';

import { useState } from 'react';
import { allocateCredit } from '@/lib/actions/receipts';
import type { OpenInvoice } from '@/lib/ar';
import { formatDate, formatMoney, rupeesPlain } from '@/lib/format';
import { Field, FormMessage, SubmitButton, inputClass, useActionForm } from './form';
import { ReturnTo } from './ReturnTo';

export interface CreditReceipt {
  id: number;
  receiptNo: string;
  receiptDate: string;
  available: number;
}

/** R6. Allocate a receipt's unapplied credit to an open invoice, with its own allocation date. */
export function AllocateCreditForm({ receipts, invoices, today }: { receipts: CreditReceipt[]; invoices: OpenInvoice[]; today: string }) {
  const { state, pending, onSubmit, formKey } = useActionForm(allocateCredit);
  const [receiptId, setReceiptId] = useState(String(receipts[0]?.id ?? ''));
  const [invoiceId, setInvoiceId] = useState(String(invoices[0]?.invoice.id ?? ''));
  const r = receipts.find((x) => String(x.id) === receiptId);
  const inv = invoices.find((x) => String(x.invoice.id) === invoiceId);
  // Suggested amount: the smaller of what the receipt has left and what the invoice has left.
  const suggested = r && inv ? Math.min(r.available, inv.available) : 0;
  // Earliest allowed date is the later of the receipt and invoice dates; default to today if later still.
  const earliest = [r?.receiptDate ?? '', inv?.invoice.invoiceDate ?? ''].sort().at(-1) ?? today;
  const defaultDate = earliest > today ? earliest : today;
  const e = state.fieldErrors ?? {};

  return (
    <form key={`${formKey}-${receiptId}-${invoiceId}`} onSubmit={onSubmit} className="space-y-3 rounded border border-slate-200 bg-white p-3">
      <ReturnTo />
      <FormMessage error={state.error} />
      <Field label="From receipt" error={e.receiptId}>
        <select name="receiptId" value={receiptId} onChange={(ev) => setReceiptId(ev.target.value)} className={inputClass}>
          {receipts.map((x) => (
            <option key={x.id} value={x.id}>
              {x.receiptNo} ({formatDate(x.receiptDate)}) · {formatMoney(x.available)} unapplied
            </option>
          ))}
        </select>
      </Field>
      <Field label="To invoice" error={e.invoiceId}>
        <select name="invoiceId" value={invoiceId} onChange={(ev) => setInvoiceId(ev.target.value)} className={inputClass}>
          {invoices.map((o) => (
            <option key={o.invoice.id} value={o.invoice.id}>
              {o.invoice.invoiceNo} (due {formatDate(o.invoice.dueDate)}) · {formatMoney(o.available)} left
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₹)" error={e.amount}>
          <input name="amount" inputMode="decimal" defaultValue={suggested ? rupeesPlain(suggested) : ''} className={inputClass} required />
        </Field>
        <Field label="Allocation date" error={e.allocationDate} hint={`Not before ${formatDate(earliest)}`}>
          <input type="date" name="allocationDate" defaultValue={defaultDate} min={earliest} className={inputClass} required />
        </Field>
      </div>
      <SubmitButton pending={pending}>Allocate</SubmitButton>
    </form>
  );
}
