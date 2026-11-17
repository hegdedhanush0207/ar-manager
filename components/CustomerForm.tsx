'use client';

import { useActionState } from 'react';
import { saveCustomer } from '@/lib/actions/customers';
import type { ActionState } from '@/lib/actions/shared';
import { INDIAN_STATES } from '@/lib/states';
import { Field, FormMessage, SubmitButton, inputClass } from './form';

export interface CustomerFormValues {
  id?: string;
  code: string;
  name: string;
  city: string;
  state: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  creditDays: string;
  creditLimit: string;
  tdsRatePct: string;
}

export function CustomerForm({ initial, asof }: { initial: CustomerFormValues; asof: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveCustomer, {});
  const v = (k: keyof CustomerFormValues) => state.values?.[k] ?? initial[k] ?? '';
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="max-w-3xl space-y-4">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="asof" value={asof} />
      <FormMessage error={state.error} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Code *" error={e.code} hint="For example C009">
          <input name="code" defaultValue={v('code')} className={inputClass} required maxLength={20} />
        </Field>
        <Field label="Name *" error={e.name} className="sm:col-span-2">
          <input name="name" defaultValue={v('name')} className={inputClass} required />
        </Field>
        <Field label="City *" error={e.city}>
          <input name="city" defaultValue={v('city')} className={inputClass} required />
        </Field>
        <Field label="State *" error={e.state} hint="Maharashtra → CGST + SGST; other states → IGST">
          <select name="state" defaultValue={v('state')} className={inputClass} required>
            <option value="">Choose…</option>
            {INDIAN_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="GSTIN" error={e.gstin} hint="Optional, 15 characters">
          <input name="gstin" defaultValue={v('gstin')} className={inputClass} maxLength={15} />
        </Field>
        <Field label="Contact person *" error={e.contactPerson}>
          <input name="contactPerson" defaultValue={v('contactPerson')} className={inputClass} required />
        </Field>
        <Field label="Email *" error={e.email}>
          <input name="email" type="email" defaultValue={v('email')} className={inputClass} required />
        </Field>
        <Field label="Phone" error={e.phone}>
          <input name="phone" defaultValue={v('phone')} className={inputClass} />
        </Field>
        <Field label="Credit days *" error={e.creditDays} hint="Due date = invoice date + these days">
          <input name="creditDays" type="number" min={0} step={1} defaultValue={v('creditDays')} className={inputClass} required />
        </Field>
        <Field label="Credit limit (₹) *" error={e.creditLimit}>
          <input name="creditLimit" inputMode="decimal" defaultValue={v('creditLimit')} className={inputClass} required />
        </Field>
        <Field label="TDS rate (%) *" error={e.tdsRatePct} hint="Applied to the taxable value, to pre-fill expected TDS">
          <input name="tdsRatePct" type="number" min={0} max={100} step="0.01" defaultValue={v('tdsRatePct')} className={inputClass} required />
        </Field>
      </div>
      <SubmitButton>{initial.id ? 'Save changes' : 'Add customer'}</SubmitButton>
    </form>
  );
}
