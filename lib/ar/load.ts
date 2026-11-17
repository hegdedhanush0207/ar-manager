import 'server-only';
import { db } from '@/lib/db';
import type { ArData } from './types';
import { toArData } from './map';

/**
 * Loads all six tables on every request (brief section 4.5) and converts them
 * to paise with toArData. Rows are ordered by id so lists are stable.
 */
export async function loadArData(): Promise<ArData> {
  const [customers, invoices, creditNotes, receipts, allocations, notes] =
    await Promise.all([
      db.from('customers').select('*').order('id'),
      db.from('invoices').select('*').order('id'),
      db.from('credit_notes').select('*').order('id'),
      db.from('receipts').select('*').order('id'),
      db.from('allocations').select('*').order('id'),
      db.from('notes').select('*').order('id'),
    ]);

  for (const result of [customers, invoices, creditNotes, receipts, allocations, notes]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  return toArData({
    customers: customers.data!,
    invoices: invoices.data!,
    credit_notes: creditNotes.data!,
    receipts: receipts.data!,
    allocations: allocations.data!,
    notes: notes.data!,
  });
}
