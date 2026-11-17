/**
 * Helpers shared by the server actions (brief section 4.8).
 * Not a 'use server' file itself: it only exports plain helpers.
 */
import type { z } from 'zod';

/** What every form action returns to its form. */
export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  warning?: string;
  message?: string;
  /** The submitted values, so the form keeps what the user typed when there is an error. */
  values?: Record<string, string>;
}

export function formValues(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string') out[k] = v;
  return out;
}

/** zod issues → one plain-language message per field. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Turns a database error into plain language (brief section 4.6). Messages the
 * database writes for people (e.g. "Invoice BWA/26-27/0007 has only 3000.00
 * outstanding.") are shown as they are; constraint names are translated.
 */
export function friendlyDbError(message: string | undefined): string {
  const m = message ?? 'Unknown error';
  const known: [RegExp, string][] = [
    [/total_equals_taxable_plus_gst/i, 'The total does not equal the taxable value plus GST. Nothing was saved.'],
    [/duplicate key|already exists|unique/i, 'That number or code is already in use. Please try again.'],
    [/permission denied/i, 'The database does not allow this change (customers, invoices and credit notes cannot be deleted; deactivate or cancel instead).'],
    [/violates foreign key/i, 'This record is linked to other records, so the change is not allowed.'],
    [/violates check constraint "([^"]+)"/i, 'The database rejected a value that breaks one of its rules ($1).'],
    [/Missing x-workspace header|Unknown workspace/i, 'The app is not connected to its workspace. Check AR_WORKSPACE_ID.'],
    [/fetch failed|network/i, 'Could not reach the database. Please try again in a moment.'],
  ];
  for (const [re, text] of known) {
    const match = m.match(re);
    if (match) return text.replace('$1', match[1] ?? '');
  }
  return m;
}

export function isDuplicateKey(message: string | undefined): boolean {
  return /duplicate key|already exists|unique/i.test(message ?? '');
}

/**
 * Where to go after a successful action: back to the page the form was on
 * (sent in a hidden "returnTo" field), with a confirmation message in ?done=.
 * Only paths inside this app are accepted.
 */
export function doneUrl(returnTo: string | undefined, message: string, fallback = '/'): string {
  const path = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : fallback;
  const url = new URL(path, 'http://app.local');
  url.searchParams.set('done', message);
  return url.pathname + url.search;
}
