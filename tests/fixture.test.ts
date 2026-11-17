import { describe, expect, it } from 'vitest';
import sample from './fixtures/sample.json';
import { paise, toArData, type RawArData } from '../lib/ar/map';

const data = toArData(sample as RawArData);
const invoice = (no: string) => data.invoices.find((i) => i.invoiceNo === no)!;

describe('paise conversion', () => {
  it('converts rupees to whole paise exactly', () => {
    expect(paise(88500)).toBe(8_850_000);
    expect(paise(69600.5)).toBe(6_960_050);
    expect(paise(0.1 + 0.2)).toBe(30); // floating-point noise is rounded away
  });
});

describe('sample fixture (brief Part 3)', () => {
  it('has the expected number of rows in every table', () => {
    expect(data.customers).toHaveLength(8);
    expect(data.invoices).toHaveLength(29);
    expect(data.creditNotes).toHaveLength(1);
    expect(data.receipts).toHaveLength(17);
    expect(data.allocations).toHaveLength(18);
    expect(data.notes).toHaveLength(7);
  });

  it('does not contain workspace_id or created_at', () => {
    const text = JSON.stringify(sample);
    expect(text).not.toContain('workspace_id');
    expect(text).not.toContain('created_at');
  });

  it('spot check 1: BWA/26-27/0001 (Maharashtra, CGST + SGST)', () => {
    const i = invoice('BWA/26-27/0001');
    expect(i.cgst).toBe(675_000);
    expect(i.sgst).toBe(675_000);
    expect(i.igst).toBe(0);
    expect(i.total).toBe(8_850_000);
    expect(i.dueDate).toBe('2026-05-05');
  });

  it('spot check 2: BWA/26-27/0002 (Telangana, IGST)', () => {
    const i = invoice('BWA/26-27/0002');
    expect(i.igst).toBe(6_300_000);
    expect(i.total).toBe(41_300_000);
  });

  it('every invoice and credit note total equals taxable value + GST', () => {
    for (const d of [...data.invoices, ...data.creditNotes]) {
      expect(d.total).toBe(d.taxableValue + d.cgst + d.sgst + d.igst);
    }
  });

  it('maps flags and optional fields', () => {
    expect(invoice('BWA/26-27/0014').isCancelled).toBe(true);
    expect(invoice('BWA/26-27/0010').isDisputed).toBe(true);
    expect(data.customers.find((c) => c.code === 'C008')!.isActive).toBe(false);
    expect(data.creditNotes[0].total).toBe(2_950_000);
    const promise = data.notes.find((n) => n.promiseDate === '2026-08-01')!;
    expect(promise.promiseAmount).toBe(6_960_000);
    expect(data.notes.find((n) => n.promiseDate === null)!.promiseAmount).toBeNull();
  });
});
