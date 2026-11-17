'use server';

/**
 * Customer Master actions: create, edit, deactivate and reactivate (R9).
 * Customers are never deleted: the database refuses it, and R9 allows only deactivation.
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { loadArData } from '@/lib/ar/load';
import { toRupees } from '@/lib/format';
import { INDIAN_STATES } from '@/lib/states';
import { amount, id, optionalText, requiredText } from './fields';
import { fieldErrorsFrom, formValues, friendlyDbError, type ActionState } from './shared';

const customerSchema = z.object({
  code: requiredText('Code', 20).transform((s) => s.toUpperCase()),
  name: requiredText('Name'),
  city: requiredText('City', 100),
  state: z.enum(INDIAN_STATES, 'Choose a state from the list.'),
  contactPerson: requiredText('Contact person', 100),
  email: z.string().trim().pipe(z.email('Enter a valid email address.')),
  phone: optionalText(30),
  gstin: z
    .string()
    .trim()
    .transform((s) => s.toUpperCase())
    .refine((s) => s === '' || /^[0-9A-Z]{15}$/.test(s), 'A GSTIN has exactly 15 letters and digits.')
    .transform((s) => (s === '' ? null : s)),
  creditDays: z.coerce.number('Credit days must be a whole number.').int('Credit days must be a whole number.').min(0, 'Credit days cannot be negative.').max(3650, 'Credit days looks too large.'),
  creditLimit: amount('Credit limit'),
  tdsRatePct: z.coerce.number('TDS rate must be a number.').min(0, 'TDS rate must be from 0 to 100.').max(100, 'TDS rate must be from 0 to 100.'),
});

export async function saveCustomer(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const values = formValues(fd);
  const editingId = values.id ? Number(values.id) : null;
  const asof = values.asof ?? '';

  // 1. Validate the input
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) return { error: 'Please correct the highlighted fields.', fieldErrors: fieldErrorsFrom(parsed.error), values };
  const c = parsed.data;

  // 2. Business rules: the code must be unique
  const data = await loadArData();
  const clash = data.customers.find((x) => x.code.toUpperCase() === c.code && x.id !== editingId);
  if (clash) return { error: 'Please correct the highlighted fields.', fieldErrors: { code: `Code ${c.code} is already used by ${clash.name}.` }, values };

  const row = {
    code: c.code,
    name: c.name,
    city: c.city,
    state: c.state,
    contact_person: c.contactPerson,
    email: c.email,
    phone: c.phone,
    gstin: c.gstin,
    credit_days: c.creditDays,
    credit_limit: toRupees(c.creditLimit),
    tds_rate_pct: c.tdsRatePct,
  };

  // 3. Write
  let savedId = editingId;
  if (editingId) {
    const { error } = await db.from('customers').update(row).eq('id', editingId);
    if (error) return { error: friendlyDbError(error.message), values };
  } else {
    const { data: inserted, error } = await db.from('customers').insert({ ...row, is_active: true }).select('id').single();
    if (error) return { error: friendlyDbError(error.message), values };
    savedId = inserted.id;
  }

  // 4. Refresh
  revalidatePath('/', 'layout');
  redirect(`/customers/${savedId}?asof=${encodeURIComponent(asof)}`);
}

/** R9: deactivate or reactivate. Inactive customers cannot be given new invoices. */
export async function setCustomerActive(fd: FormData): Promise<void> {
  const parsed = z.object({ id, active: z.enum(['true', 'false']) }).safeParse(formValues(fd));
  if (!parsed.success) throw new Error('Invalid request.');
  const { error } = await db.from('customers').update({ is_active: parsed.data.active === 'true' }).eq('id', parsed.data.id);
  if (error) throw new Error(friendlyDbError(error.message));
  revalidatePath('/', 'layout');
}
