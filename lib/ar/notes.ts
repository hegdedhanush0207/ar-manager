/**
 * R16. Follow-ups and promises to pay.
 */
import type { ArData, Note, Paise } from './types';
import { settlementValue } from './positions';

export type PromiseStatus = 'Kept' | 'Broken' | 'Pending';

export interface PromiseRow {
  note: Note;
  promiseDate: string;
  promiseAmount: Paise;
  /** Settlement value received from note_date to min(promise_date, asOf). */
  receivedInWindow: Paise;
  status: PromiseStatus;
}

/** Notes that exist as at asOf (R10: note_date ≤ asOf). */
export function notesAsAt(data: ArData, asOf: string): Note[] {
  return data.notes.filter((n) => n.noteDate <= asOf);
}

/** Status of one promise to pay as at asOf. */
export function promiseStatus(data: ArData, note: Note, asOf: string): PromiseRow | null {
  if (note.promiseDate === null || note.promiseAmount === null || note.noteDate > asOf) return null;
  const windowEnd = note.promiseDate < asOf ? note.promiseDate : asOf;
  let receivedInWindow = 0;
  for (const r of data.receipts) {
    if (r.customerId === note.customerId && r.receiptDate >= note.noteDate && r.receiptDate <= windowEnd) {
      receivedInWindow += settlementValue(r);
    }
  }
  const kept = receivedInWindow >= note.promiseAmount;
  return {
    note,
    promiseDate: note.promiseDate,
    promiseAmount: note.promiseAmount,
    receivedInWindow,
    status: kept ? 'Kept' : note.promiseDate < asOf ? 'Broken' : 'Pending',
  };
}

/** Every promise to pay (from notes dated ≤ asOf) with its status. */
export function promiseStatuses(data: ArData, asOf: string): PromiseRow[] {
  const out: PromiseRow[] = [];
  for (const n of data.notes) {
    const row = promiseStatus(data, n, asOf);
    if (row) out.push(row);
  }
  return out;
}

/**
 * Open follow-ups due as at asOf: follow_up_date ≤ asOf and not done.
 * Only notes that exist as at asOf (note_date ≤ asOf, R10) are considered.
 */
export function followUpsDue(data: ArData, asOf: string): Note[] {
  return data.notes
    .filter((n) => n.noteDate <= asOf && n.followUpDate !== null && n.followUpDate <= asOf && !n.followUpDone)
    .sort((a, b) => a.followUpDate!.localeCompare(b.followUpDate!));
}
