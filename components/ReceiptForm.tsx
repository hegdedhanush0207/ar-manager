'use client';

import { useState } from 'react';
import { recordPayment } from '@/lib/actions/receipts';
import { expectedTds, nextNumberFrom, receiptDraftSummary, suggestAllocations, type OpenInvoice } from '@/lib/ar';
import { formatDate, formatMoney, parseRupees, rupeesPlain } from '@/lib/format';
import { Field, FormMessage, SubmitButton, inputClass, useActionForm } from './form';

interface CustomerOption {
  id: number;
  code: string;
  name: string;
  tdsRatePct: number;
  isActive: boolean;
}

interface Draft {
  customerId: string;
  receiptDate: string;
  bankAmount: string;
  tdsAmount: string;
  tdsEdited: boolean;
  mode: string;
  reference: string;
  allocs: Record<number, string>;
  allocsEdited: boolean;
}

const paiseOf = (s: string) => {
  const p = parseRupees(s);
  return p !== null && p > 0 ? p : 0;
};

export function ReceiptForm({
  customers,
  openInvoices,
  receiptNumbers,
  asof,
  defaultCustomer,
  defaultDate,
}: {
  customers: CustomerOption[];
  openInvoices: (OpenInvoice & { customerId: number })[];
  receiptNumbers: string[];
  asof: string;
  defaultCustomer?: string;
  defaultDate: string;
}) {
  const { state, pending, onSubmit, formKey } = useActionForm(recordPayment);
  const [d, setD] = useState<Draft>({
    customerId: defaultCustomer ?? '',
    receiptDate: defaultDate,
    bankAmount: '',
    tdsAmount: '0.00',
    tdsEdited: false,
    mode: 'NEFT',
    reference: '',
    allocs: {},
    allocsEdited: false,
  });

  const customer = customers.find((c) => String(c.id) === d.customerId);
  const openFor = (draft: Draft) =>
    openInvoices.filter((o) => String(o.customerId) === draft.customerId && o.invoice.invoiceDate <= draft.receiptDate);
  const open = openFor(d);

  /** Apply a change, then re-work the TDS pre-fill and oldest-first suggestion unless the user has overridden them. */
  function update(change: Partial<Draft>) {
    setD((prev) => {
      const next = { ...prev, ...change };
      const nextOpen = openFor(next);
      const cust = customers.find((c) => String(c.id) === next.customerId);
      if (!next.tdsEdited) next.tdsAmount = rupeesPlain(expectedTds(nextOpen, paiseOf(next.bankAmount), cust?.tdsRatePct ?? 0));
      if (!next.allocsEdited) {
        const settlement = paiseOf(next.bankAmount) + paiseOf(next.tdsAmount);
        next.allocs = Object.fromEntries(suggestAllocations(nextOpen, settlement).map((a) => [a.invoiceId, rupeesPlain(a.amount)]));
      }
      return next;
    });
  }

  const summary = receiptDraftSummary(
    paiseOf(d.bankAmount),
    paiseOf(d.tdsAmount),
    open.map((o) => paiseOf(d.allocs[o.invoice.id] ?? '')),
  );
  const e = state.fieldErrors ?? {};

  return (
    <form key={formKey} onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="asof" value={asof} />
      <FormMessage error={state.error} />
      <div className="grid max-w-5xl gap-4 sm:grid-cols-3">
        <Field label="Customer *" error={e.customerId} className="sm:col-span-2">
          <select name="customerId" value={d.customerId} onChange={(ev) => update({ customerId: ev.target.value, allocsEdited: false, tdsEdited: false })} className={inputClass} required>
            <option value="">Choose…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
                {c.isActive ? '' : ' (inactive)'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Receipt date *" error={e.receiptDate} hint={`Number on saving: ${nextNumberFrom(receiptNumbers, 'receipt', d.receiptDate || defaultDate)}`}>
          <input type="date" name="receiptDate" value={d.receiptDate} onChange={(ev) => update({ receiptDate: ev.target.value })} className={inputClass} required />
        </Field>
        <Field label="Bank amount (₹) *" error={e.bankAmount} hint="Amount credited in the bank">
          <input name="bankAmount" inputMode="decimal" value={d.bankAmount} onChange={(ev) => update({ bankAmount: ev.target.value })} className={inputClass} required />
        </Field>
        <Field
          label="TDS deducted (₹) *"
          error={e.tdsAmount}
          hint={
            d.tdsEdited ? (
              <button type="button" className="text-blue-700 underline" onClick={() => update({ tdsEdited: false })}>
                Re-fill expected TDS ({customer?.tdsRatePct ?? 0}% of taxable value)
              </button>
            ) : (
              `Pre-filled at ${customer?.tdsRatePct ?? 0}% of the taxable value. Enter what was actually deducted.`
            )
          }
        >
          <input name="tdsAmount" inputMode="decimal" value={d.tdsAmount} onChange={(ev) => update({ tdsAmount: ev.target.value, tdsEdited: true })} className={inputClass} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mode *" error={e.mode}>
            <select name="mode" value={d.mode} onChange={(ev) => update({ mode: ev.target.value })} className={inputClass}>
              {['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque'].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Reference" error={e.reference}>
            <input name="reference" value={d.reference} onChange={(ev) => update({ reference: ev.target.value })} className={inputClass} placeholder="UTR / cheque no." />
          </Field>
        </div>
      </div>

      <div className="max-w-5xl">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Allocate to open invoices</h2>
          {d.allocsEdited && (
            <button type="button" className="text-blue-700 underline" onClick={() => update({ allocsEdited: false })}>
              Re-suggest oldest first
            </button>
          )}
        </div>
        {!customer ? (
          <p className="text-slate-500">Choose a customer to see their open invoices.</p>
        ) : open.length === 0 ? (
          <p className="text-slate-500">No open invoices dated on or before {formatDate(d.receiptDate)}. The whole amount will be kept as unapplied credit (an advance).</p>
        ) : (
          <div className="overflow-x-auto rounded border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-2 py-2 text-left font-medium">Invoice</th>
                  <th className="px-2 py-2 text-left font-medium">Invoice date</th>
                  <th className="px-2 py-2 text-left font-medium">Due date</th>
                  <th className="px-2 py-2 text-right font-medium">Total</th>
                  <th className="px-2 py-2 text-right font-medium">Left to settle</th>
                  <th className="px-2 py-2 text-right font-medium">Allocate (₹)</th>
                </tr>
              </thead>
              <tbody>
                {open.map((o) => {
                  const key = `alloc_${o.invoice.id}`;
                  const over = paiseOf(d.allocs[o.invoice.id] ?? '') > o.available;
                  return (
                    <tr key={o.invoice.id} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">
                        {o.invoice.invoiceNo}
                        {o.invoice.isDisputed && <span className="ml-1 text-xs text-amber-700">disputed</span>}
                      </td>
                      <td className="px-2 py-1.5">{formatDate(o.invoice.invoiceDate)}</td>
                      <td className="px-2 py-1.5">{formatDate(o.invoice.dueDate)}</td>
                      <td className="num px-2 py-1.5">{formatMoney(o.invoice.total)}</td>
                      <td className="num px-2 py-1.5">{formatMoney(o.available)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <input
                          name={key}
                          inputMode="decimal"
                          value={d.allocs[o.invoice.id] ?? ''}
                          onChange={(ev) => update({ allocs: { ...d.allocs, [o.invoice.id]: ev.target.value }, allocsEdited: true })}
                          className={`${inputClass} w-36 text-right ${over || e[key] ? 'border-red-500' : ''}`}
                          aria-label={`Allocate to ${o.invoice.invoiceNo}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <dl className="grid max-w-xl grid-cols-2 gap-y-1 rounded border border-slate-200 bg-white p-3">
        <dt className="text-slate-500">Settlement value (bank + TDS)</dt>
        <dd className="num">{formatMoney(summary.settlement)}</dd>
        <dt className="text-slate-500">Allocated to invoices</dt>
        <dd className="num">{formatMoney(summary.allocated)}</dd>
        <dt className="font-semibold">Remains as unapplied credit</dt>
        <dd className={`num font-semibold ${summary.unapplied < 0 ? 'text-red-700' : ''}`}>{formatMoney(summary.unapplied)}</dd>
      </dl>
      {summary.unapplied < 0 && <FormMessage error="You have allocated more than the settlement value. Reduce the allocations." />}

      <SubmitButton pending={pending} disabled={!customer || summary.settlement <= 0 || summary.unapplied < 0}>Save payment</SubmitButton>
    </form>
  );
}
