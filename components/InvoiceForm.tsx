'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { createInvoice, previewInvoice, type InvoicePreview } from '@/lib/actions/invoices';
import type { ActionState } from '@/lib/actions/shared';
import { formatDate, formatMoney } from '@/lib/format';
import { Field, FormMessage, SubmitButton, inputClass } from './form';

interface CustomerOption {
  id: number;
  code: string;
  name: string;
  state: string;
  creditDays: number;
}

export function InvoiceForm({ customers, asof, defaultCustomer, defaultDate }: { customers: CustomerOption[]; asof: string; defaultCustomer?: string; defaultDate: string }) {
  const [state, action] = useActionState<ActionState, FormData>(createInvoice, {});
  const [values, setValues] = useState<Record<string, string>>({
    customerId: defaultCustomer ?? '',
    invoiceDate: defaultDate,
    description: '',
    taxableValue: '',
    gstRatePct: '18',
  });
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [, startTransition] = useTransition();

  // Ask the server for a preview whenever the inputs change (debounced).
  useEffect(() => {
    if (!values.customerId || !values.taxableValue) return;
    const t = setTimeout(() => {
      startTransition(async () => setPreview(await previewInvoice(values)));
    }, 300);
    return () => clearTimeout(t);
  }, [values]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const e = { ...(preview?.fieldErrors ?? {}), ...(state.fieldErrors ?? {}) };
  const customer = customers.find((c) => String(c.id) === values.customerId);
  const showPreview = preview?.ok && values.customerId && values.taxableValue;

  return (
    <form action={action} className="grid max-w-5xl gap-6 lg:grid-cols-2">
      <input type="hidden" name="asof" value={asof} />
      <div className="space-y-4">
        <FormMessage error={state.error ?? (preview && !preview.ok ? preview.error : undefined)} />
        <Field label="Customer *" error={e.customerId} hint={customer ? `${customer.state} · ${customer.creditDays} credit days` : 'Only active customers are listed (R9)'}>
          <select name="customerId" value={values.customerId} onChange={set('customerId')} className={inputClass} required>
            <option value="">Choose…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Invoice date *" error={e.invoiceDate}>
          <input type="date" name="invoiceDate" value={values.invoiceDate} onChange={set('invoiceDate')} className={inputClass} required />
        </Field>
        <Field label="Description *" error={e.description}>
          <input name="description" value={values.description} onChange={set('description')} className={inputClass} required maxLength={300} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Taxable value (₹) *" error={e.taxableValue}>
            <input name="taxableValue" inputMode="decimal" value={values.taxableValue} onChange={set('taxableValue')} className={inputClass} required />
          </Field>
          <Field label="GST rate (%) *" error={e.gstRatePct}>
            <input name="gstRatePct" type="number" min={0} max={100} step="0.01" value={values.gstRatePct} onChange={set('gstRatePct')} className={inputClass} required />
          </Field>
        </div>
        <SubmitButton disabled={!preview?.ok}>Save invoice</SubmitButton>
      </div>

      <div className="rounded border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Preview before saving</h2>
        {!showPreview ? (
          <p className="text-slate-500">Choose a customer and enter the taxable value to see the tax split, total, due date and number.</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-y-1.5">
              <dt className="text-slate-500">Invoice number</dt>
              <dd className="font-medium">{preview.invoiceNo}</dd>
              <dt className="text-slate-500">Due date</dt>
              <dd>{formatDate(preview.dueDate)}</dd>
              {preview.igst! > 0 ? (
                <>
                  <dt className="text-slate-500">IGST @ {values.gstRatePct}%</dt>
                  <dd className="num text-left">{formatMoney(preview.igst!)}</dd>
                </>
              ) : (
                <>
                  <dt className="text-slate-500">CGST @ {Number(values.gstRatePct) / 2}%</dt>
                  <dd className="num text-left">{formatMoney(preview.cgst!)}</dd>
                  <dt className="text-slate-500">SGST @ {Number(values.gstRatePct) / 2}%</dt>
                  <dd className="num text-left">{formatMoney(preview.sgst!)}</dd>
                </>
              )}
              <dt className="font-semibold">Invoice total</dt>
              <dd className="num text-left font-semibold">{formatMoney(preview.total!)}</dd>
            </dl>
            {preview.warning && <div className="mt-3"><FormMessage warning={preview.warning} /></div>}
          </>
        )}
      </div>
    </form>
  );
}
