/**
 * Phase 2, section 2: the Historical AR trend.
 *
 * Closing AR at a reporting date D = Σ outstanding balances of invoices, where for
 * each invoice raised on or before D (cancelled invoices excluded):
 *   outstanding = total − payments allocated to it on or before D − credit notes on or before D.
 * Payments are settlement values (bank + TDS) as allocated, so TDS deducted by the
 * customer reduces the balance exactly like cash.
 */
import type { ArData, Paise } from '../ar/types';
import { addDays, isIsoDate } from '../ar/dates';
import { invoiceSettlements } from './metrics';
import { ratioText } from './round';

export type Granularity = 'month' | 'week';
export type RangePreset = '12m' | '6m' | '3m' | 'custom';

/** Σ outstanding invoice balances at the end of `date`, for one customer or all. */
export function closingAr(data: ArData, date: string, customerId?: number): Paise {
  return invoiceSettlements(data, date, customerId).reduce((s, x) => s + x.outstanding, 0);
}

/** Receipts not yet allocated to any invoice at the end of `date` (shown alongside, not deducted). */
export function unappliedCredit(data: ArData, date: string, customerId?: number): Paise {
  let total = 0;
  for (const r of data.receipts) {
    if (r.receiptDate > date || (customerId !== undefined && r.customerId !== customerId)) continue;
    total += r.bankAmount + r.tdsAmount;
    for (const a of data.allocations) if (a.receiptId === r.id && a.allocationDate <= date) total -= a.amount;
  }
  return total;
}

// ---------- calendar helpers ----------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthEnd(date: string): string {
  const [y, m] = date.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return addDays(next, -1);
}

export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** First day of the month `n` months before the month containing `date`. */
export function monthsBefore(date: string, n: number): string {
  const [y, m] = date.split('-').map(Number);
  const idx = y * 12 + (m - 1) - n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}-01`;
}

/** Day of week, 0 = Sunday … 6 = Saturday, from the date string alone. */
export function weekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** The Sunday ending the Monday–Sunday week that contains `date`. */
export function weekEnd(date: string): string {
  return addDays(date, (7 - weekday(date)) % 7);
}

/** End of the period before the one containing `date`. */
export function previousPeriodEnd(date: string, g: Granularity): string {
  return g === 'month' ? addDays(monthStart(date), -1) : addDays(weekEnd(date), -7);
}

// ---------- the reporting window ----------

export interface TrendWindow {
  from: string;
  to: string;
  preset: RangePreset;
  /** A note when the request was adjusted (e.g. custom To after the as-at date). */
  note?: string;
  error?: string;
}

/**
 * Last 12 / 6 / 3 months: the current month (up to the as-at date) and the months before it.
 * Custom: the user's From and To, with To no later than the as-at date (later records do not exist yet).
 */
export function trendWindow(asOf: string, preset: string | undefined, from?: string, to?: string): TrendWindow {
  const months = preset === '6m' ? 6 : preset === '3m' ? 3 : 12;
  if (preset !== 'custom') return { from: monthsBefore(asOf, months - 1), to: asOf, preset: (preset as RangePreset) ?? '12m' };
  if (!from || !to || !isIsoDate(from) || !isIsoDate(to)) {
    return { from: monthsBefore(asOf, 11), to: asOf, preset: 'custom', error: 'Enter both dates of the custom range. Showing the last 12 months.' };
  }
  let note: string | undefined;
  let end = to;
  if (end > asOf) {
    end = asOf;
    note = `The range ends at the as-at date (${asOf}); later records do not exist yet at that date.`;
  }
  if (from > end) return { from: monthsBefore(asOf, 11), to: asOf, preset: 'custom', error: 'The From date must be on or before the To date. Showing the last 12 months.' };
  return { from, to: end, preset: 'custom', note };
}

// ---------- the series ----------

export interface TrendPoint {
  /** The reporting date: the last day of the month/week, or the window end for a period still in progress. */
  date: string;
  label: string;
  /** True when the period is not yet over at the window end (balance is "to date"). */
  partial: boolean;
  closing: Paise;
  previous: Paise;
  previousDate: string;
  /** % change from the previous month/week; null when the previous balance is zero. */
  changePct: number | null;
  /** The change as text, exactly rounded to one decimal with a sign ("+12.3%", "-4.0%", "0.0%"), or null. */
  changeText: string | null;
  unapplied: Paise;
}

const fmtShort = (d: string) => {
  const [y, m, dd] = d.split('-');
  return `${dd}-${MONTHS[Number(m) - 1]}-${y}`;
};

/** Reporting dates: every month-end (or Sunday) inside the window, plus the window end if a period is still running. */
export function reportingDates(from: string, to: string, g: Granularity): { date: string; partial: boolean }[] {
  const out: { date: string; partial: boolean }[] = [];
  let end = g === 'month' ? monthEnd(from) : weekEnd(from);
  while (end <= to) {
    out.push({ date: end, partial: false });
    end = g === 'month' ? monthEnd(addDays(end, 1)) : addDays(end, 7);
  }
  if (!out.length || out[out.length - 1].date !== to) out.push({ date: to, partial: true });
  return out;
}

export function pointLabel(date: string, g: Granularity, partial: boolean): string {
  if (g === 'month') {
    const [y, m] = date.split('-');
    const base = `${MONTHS[Number(m) - 1]} ${y}`;
    return partial ? `${base} (to ${fmtShort(date)})` : base;
  }
  return partial ? `Week to ${fmtShort(date)}` : `Week ending ${fmtShort(date)}`;
}

export function trendSeries(data: ArData, window: { from: string; to: string }, g: Granularity, customerId?: number): TrendPoint[] {
  return reportingDates(window.from, window.to, g).map(({ date, partial }) => {
    const closing = closingAr(data, date, customerId);
    const previousDate = previousPeriodEnd(date, g);
    const previous = closingAr(data, previousDate, customerId);
    return {
      date,
      label: pointLabel(date, g, partial),
      partial,
      closing,
      previous,
      previousDate,
      changePct: previous === 0 ? null : ((closing - previous) / previous) * 100,
      changeText: previous === 0 ? null : signed(ratioText((closing - previous) * 100, previous, 1)) + '%',
      unapplied: unappliedCredit(data, date, customerId),
    };
  });
}

/**
 * The amount axis in lakhs (₹1,00,000 = 1 lakh): ticks from 0 in steps of `step` lakh
 * (2 by default; 1 for customer-only views), up to the first step at or above the
 * largest balance. Worked in whole paise so the top tick is exact.
 */
export function lakhAxis(maxPaise: Paise, step: 1 | 2 = 2): number[] {
  const unit = step * 10_000_000; // one step, in paise
  const steps = Math.max(1, Math.floor((Math.max(0, maxPaise) + unit - 1) / unit)); // ceiling, at least one step
  const ticks: number[] = [];
  for (let k = 0; k <= steps; k++) ticks.push(k * step);
  return ticks;
}

/** ₹ in lakhs with two decimals, rounded exactly: ₹21,18,100.00 → "21.18". */
export function lakh(paise: Paise): string {
  return ratioText(paise, 10_000_000, 2);
}

function signed(text: string): string {
  return text.startsWith('-') || /^0(.0+)?$/.test(text) ? text : `+${text}`;
}

/** X-axis label: "Dec '25" (monthly) or "7 Dec '25" (weekly); "*" marks a period still in progress. */
export function axisLabel(date: string, g: Granularity, partial: boolean): string {
  const [y, m, d] = date.split('-');
  const month = `${MONTHS[Number(m) - 1]} '${y.slice(2)}`;
  return (g === 'month' ? month : `${Number(d)} ${month}`) + (partial ? '*' : '');
}
