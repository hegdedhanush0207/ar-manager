import { describe, expect, it } from 'vitest';
import { csvField, formatBalance, formatDate, formatMoney, parseRupees, rupeesPlain, toCsv, toRupees } from '../lib/format';
import { href, parseAsOf } from '../lib/asof';
import { isIsoDate, todayInIndia } from '../lib/ar/dates';
import { sortRows, withParams } from '../lib/table';

describe('money (R18)', () => {
  it('uses Indian digit grouping', () => {
    expect(formatMoney(12345600)).toBe('₹1,23,456.00');
    expect(formatMoney(8850000)).toBe('₹88,500.00');
    expect(formatMoney(41300000)).toBe('₹4,13,000.00');
    expect(formatMoney(1234567890)).toBe('₹1,23,45,678.90');
    expect(formatMoney(5)).toBe('₹0.05');
    expect(formatMoney(0)).toBe('₹0.00');
  });

  it('balances carry Dr or Cr', () => {
    expect(formatBalance(8880000)).toBe('₹88,800.00 Dr');
    expect(formatBalance(-10000000)).toBe('₹1,00,000.00 Cr');
    expect(formatBalance(0)).toBe('₹0.00');
  });

  it('plain rupees for CSV and saving are exact', () => {
    expect(rupeesPlain(7080000)).toBe('70800.00');
    expect(rupeesPlain(5)).toBe('0.05');
    expect(rupeesPlain(-150)).toBe('-1.50');
    expect(toRupees(1)).toBe(0.01);
    expect(toRupees(8850000)).toBe(88500);
  });

  it('parses typed amounts into paise', () => {
    expect(parseRupees('1,23,456.5')).toBe(12345650);
    expect(parseRupees('₹ 88,500.00')).toBe(8850000);
    expect(parseRupees('0.1')).toBe(10);
    expect(parseRupees('12.345')).toBeNull();
    expect(parseRupees('abc')).toBeNull();
    expect(parseRupees('')).toBeNull();
  });
});

describe('dates (R18)', () => {
  it('formats as 31-Aug-2026 without shifting a day', () => {
    expect(formatDate('2026-08-31')).toBe('31-Aug-2026');
    expect(formatDate('2026-01-01')).toBe('01-Jan-2026');
    expect(formatDate(null)).toBe('');
  });

  it('validates real dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-8-31')).toBe(false);
    expect(isIsoDate('31-08-2026')).toBe(false);
  });
});

describe('as-at date', () => {
  it('reads ?asof= when valid', () => {
    expect(parseAsOf('2026-08-31')).toBe('2026-08-31');
    expect(parseAsOf(['2026-09-06', '2026-01-01'])).toBe('2026-09-06');
  });

  it('defaults to today in India, not UTC', () => {
    // 20:00 UTC on 31 Aug is 01:30 IST on 1 Sep
    const now = new Date('2026-08-31T20:00:00Z');
    expect(todayInIndia(now)).toBe('2026-09-01');
    expect(parseAsOf(undefined, now)).toBe('2026-09-01');
    expect(parseAsOf('not-a-date', now)).toBe('2026-09-01');
    expect(parseAsOf('2026-02-30', now)).toBe('2026-09-01');
    // 18:00 UTC on 31 Aug is 23:30 IST, still 31 Aug
    expect(parseAsOf('', new Date('2026-08-31T18:00:00Z'))).toBe('2026-08-31');
  });

  it('links keep the date', () => {
    expect(href('/invoices', '2026-08-31', { customer: 5, status: undefined })).toBe('/invoices?asof=2026-08-31&customer=5');
    expect(withParams('/x', { asof: '2026-08-31', sort: 'a' }, { sort: undefined, q: 'b' })).toBe('/x?asof=2026-08-31&q=b');
  });
});

describe('CSV', () => {
  it('quotes fields with commas, quotes or line breaks', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField('Cost audit support, Q3')).toBe('"Cost audit support, Q3"');
    expect(csvField('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvField('a\nb')).toBe('"a\nb"');
    expect(csvField(null)).toBe('');
    expect(csvField(70800)).toBe('70800');
  });

  it('starts with a UTF-8 BOM and uses CRLF', () => {
    const csv = toCsv([['a', 'b,c'], ['1', '2']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('a,"b,c"\r\n1,2\r\n');
  });
});

describe('sorting', () => {
  it('sorts numbers and text, blanks last', () => {
    const rows = [{ n: 2, s: 'b' }, { n: 10, s: 'a' }, { n: null, s: 'c' }];
    expect(sortRows(rows, { n: (r) => r.n }, 'n', 'asc').map((r) => r.n)).toEqual([2, 10, null]);
    expect(sortRows(rows, { n: (r) => r.n }, 'n', 'desc').map((r) => r.n)).toEqual([10, 2, null]);
    expect(sortRows(rows, { s: (r) => r.s }, 's', 'asc').map((r) => r.s)).toEqual(['a', 'b', 'c']);
    expect(sortRows(rows, {}, 'missing', 'asc')).toBe(rows);
  });
});
