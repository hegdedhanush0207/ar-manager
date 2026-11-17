import { describe, expect, it } from 'vitest';
import { customerPositions, invoiceRows, statement, totalPositions } from '../lib/ar';
import { ageingCsv, invoiceListCsv, statementCsv } from '../lib/exports';
import { byCode, sampleData } from './helpers';

const data = sampleData();

function parse(csv: string): string[][] {
  // Simple CSV parser for the tests: handles quoted fields with commas.
  return csv
    .replace(/^﻿/, '')
    .trim()
    .split('\r\n')
    .map((line) => [...line.matchAll(/("([^"]|"")*"|[^,]*)(,|$)/g)].map((m) => m[1].replace(/^"|"$/g, '').replace(/""/g, '"')).slice(0, -1));
}

describe('statement CSV', () => {
  const c002 = byCode(data, 'C002');
  const csv = statementCsv(c002, statement(data, c002.id, '2026-04-01', '2026-08-31'));
  const rows = parse(csv);

  it('starts with a BOM and has opening, 7 lines and closing (spot check 8)', () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const opening = rows.find((r) => r[1] === 'Opening balance')!;
    const closing = rows.find((r) => r[1] === 'Closing balance')!;
    expect(opening.slice(6)).toEqual(['70800.00', 'Dr']);
    expect(closing.slice(6)).toEqual(['223000.00', 'Dr']);
    const lines = rows.slice(rows.indexOf(opening) + 1, rows.indexOf(closing));
    expect(lines).toHaveLength(7);
    expect(lines[0]).toEqual(['18-Apr-2026', 'Invoice', 'BWA/26-27/0003', 'Transfer pricing documentation', '141600.00', '', '212400.00', 'Dr']);
    expect(lines[2]).toEqual(['20-May-2026', 'TDS', 'RCT/26-27/0005', 'TDS deducted by you', '', '6000.00', '141600.00', 'Dr']);
  });

  it('quotes descriptions with commas and writes plain amounts', () => {
    const c003 = byCode(data, 'C003');
    const out = statementCsv(c003, statement(data, c003.id, '2026-01-01', '2026-03-31'));
    expect(out).toContain('"Cost audit support, Q3"');
    expect(out).not.toContain('₹');
    expect(out).toContain('177000.00');
  });
});

describe('invoice list and ageing CSV', () => {
  it('invoice list: one row per invoice, totals exclude cancelled', () => {
    const rows = parse(invoiceListCsv(invoiceRows(data, '2026-08-31'), '2026-08-31'));
    expect(rows.filter((r) => /^BWA\//.test(r[0]))).toHaveLength(28); // 0024 is dated 05-Sep
    const cancelled = rows.find((r) => r[0] === 'BWA/26-27/0014')!;
    expect(cancelled[10]).toBe('Cancelled');
    expect(rows.at(-1)![0]).toMatch(/Totals/);
  });

  it('ageing: totals row matches the positions', () => {
    const pos = customerPositions(data, '2026-08-31');
    const rows = parse(ageingCsv(pos, totalPositions(pos), '2026-08-31'));
    const total = rows.at(-1)!;
    expect(total[0]).toBe('Total');
    expect(total[8]).toBe('2118100.00'); // total outstanding
    expect(total[9]).toBe('100000.00'); // unapplied
    expect(total.slice(10, 12)).toEqual(['2018100.00', 'Dr']);
  });
});
