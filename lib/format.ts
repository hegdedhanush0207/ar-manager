/**
 * R18. Display formats. Amounts arrive in whole paise; dates as 'YYYY-MM-DD'.
 */
import type { Paise } from './ar/types';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 12345600 → '₹1,23,456.00'. Negative amounts show a minus sign. */
export function formatMoney(paise: Paise): string {
  return inr.format(paise / 100);
}

/** Balance with Dr/Cr: positive is owed to us (Dr), negative is a credit balance (Cr). Zero has no suffix. */
export function formatBalance(paise: Paise): string {
  if (paise === 0) return formatMoney(0);
  return `${formatMoney(Math.abs(paise))} ${paise > 0 ? 'Dr' : 'Cr'}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-08-31' → '31-Aug-2026'. Splits the string; never builds a Date. */
export function formatDate(date: string | null | undefined): string {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  return `${d}-${MONTHS[Number(m) - 1]}-${y}`;
}

/** Paise → plain rupees for CSV and for saving: 7080000 → '70800.00', −5 → '-0.05'. Exact (no floating point). */
export function rupeesPlain(paise: Paise): string {
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Paise → rupees as a number, only for sending to the database (brief section 4.8). */
export function toRupees(paise: Paise): number {
  return Number(rupeesPlain(paise));
}

/** A user-typed rupee amount ('1,23,456.5', '₹ 500') → whole paise, or null if it is not a valid amount. */
export function parseRupees(input: string): Paise | null {
  const s = input.replace(/[₹,\s]/g, '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  const negative = s.startsWith('-');
  const [whole, frac = ''] = s.replace('-', '').split('.');
  const p = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return negative ? -p : p;
}

/** One CSV field: quoted when it contains a comma, quote or line break; quotes doubled. */
export function csvField(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** A whole CSV file, starting with a UTF-8 BOM so Excel reads ₹ and names correctly. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return '﻿' + rows.map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n';
}

export function formatPct(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`;
}
