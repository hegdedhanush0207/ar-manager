/**
 * The ten published spot checks (brief Part 1), run against the sample fixture.
 */
import { describe, expect, it } from 'vitest';
import {
  balanceCheck,
  customerPosition,
  dueDate,
  gstSplit,
  invoicePositions,
  promiseStatuses,
  statement,
  totalWithGst,
} from '../lib/ar';
import { byCode, byNo, rupees, sampleData } from './helpers';

const data = sampleData();
const position = (no: string, asOf: string) => invoicePositions(data, asOf).find((p) => p.invoice.invoiceNo === no)!;

describe('spot checks', () => {
  it('1. BWA/26-27/0001 (C001, Maharashtra): CGST 6,750 + SGST 6,750, total 88,500, due 05-May-2026', () => {
    const inv = byNo(data, 'BWA/26-27/0001');
    const c = byCode(data, 'C001');
    const gst = gstSplit(c.state, inv.taxableValue, inv.gstRatePct);
    expect(gst).toEqual({ cgst: rupees(6750), sgst: rupees(6750), igst: 0 });
    expect(totalWithGst(inv.taxableValue, gst)).toBe(rupees(88500));
    expect(dueDate(inv.invoiceDate, c.creditDays)).toBe('2026-05-05');
    // and the stored values agree
    expect([inv.cgst, inv.sgst, inv.total, inv.dueDate]).toEqual([rupees(6750), rupees(6750), rupees(88500), '2026-05-05']);
  });

  it('2. BWA/26-27/0002 (C007, Telangana): IGST 63,000, total 4,13,000', () => {
    const inv = byNo(data, 'BWA/26-27/0002');
    const gst = gstSplit(byCode(data, 'C007').state, inv.taxableValue, inv.gstRatePct);
    expect(gst).toEqual({ cgst: 0, sgst: 0, igst: rupees(63000) });
    expect(totalWithGst(inv.taxableValue, gst)).toBe(rupees(413000));
  });

  it('3. BWA/26-27/0003 as at 31-Aug-2026: 69,600 outstanding, Overdue · part-paid, 90 days, 61–90', () => {
    const p = position('BWA/26-27/0003', '2026-08-31');
    expect(p.outstanding).toBe(rupees(69600));
    expect(p.status).toBe('Overdue');
    expect(p.isPartPaid).toBe(true);
    expect(p.daysPastDue).toBe(90);
    expect(p.bucket).toBe('61-90');
  });

  it('4. BWA/26-27/0021 as at 31-Aug / 06-Sep / 15-Sep-2026: Due / Overdue 2 days / Paid', () => {
    const a = position('BWA/26-27/0021', '2026-08-31');
    expect([a.status, a.outstanding]).toEqual(['Due', rupees(88500)]);
    const b = position('BWA/26-27/0021', '2026-09-06');
    expect([b.status, b.daysPastDue, b.outstanding]).toEqual(['Overdue', 2, rupees(88500)]);
    const c = position('BWA/26-27/0021', '2026-09-15');
    expect([c.status, c.outstanding]).toEqual(['Paid', 0]);
  });

  it('4a. on its due date an invoice is still Due', () => {
    expect(position('BWA/26-27/0021', '2026-09-04').status).toBe('Due');
    expect(position('BWA/26-27/0021', '2026-09-05').status).toBe('Overdue');
  });

  it('5. C005 as at 31-Aug-2026: outstanding 1,88,800, unapplied 1,00,000, net 88,800 Dr', () => {
    const p = customerPosition(data, byCode(data, 'C005').id, '2026-08-31')!;
    expect(p.outstanding).toBe(rupees(188800));
    expect(p.unapplied).toBe(rupees(100000));
    expect(p.netBalance).toBe(rupees(88800));
  });

  it('6. C005 as at 12-Jul-2026: net 1,00,000 Cr (advance, invoice not yet raised)', () => {
    const p = customerPosition(data, byCode(data, 'C005').id, '2026-07-12')!;
    expect(p.netBalance).toBe(-rupees(100000));
    expect(p.outstanding).toBe(0);
  });

  it('7. BWA/26-27/0007 as at 31-Aug-2026: outstanding 3,000 (credit note 29,500; receipt 2,40,000 + 22,500 TDS)', () => {
    const p = position('BWA/26-27/0007', '2026-08-31');
    expect(p.credited).toBe(rupees(29500));
    expect(p.received).toBe(rupees(262500));
    expect(p.outstanding).toBe(rupees(3000));
  });

  it('8. statement C002, 01-Apr-2026 to 31-Aug-2026: opening 70,800 Dr, closing 2,23,000 Dr, 7 lines', () => {
    const s = statement(data, byCode(data, 'C002').id, '2026-04-01', '2026-08-31');
    expect(s.opening).toBe(rupees(70800));
    expect(s.closing).toBe(rupees(223000));
    expect(s.lines).toHaveLength(7);
    expect(s.lines.map((l) => l.kind)).toEqual(['Invoice', 'Receipt', 'TDS', 'Invoice', 'Receipt', 'TDS', 'Invoice']);
  });

  it('9. promise noted by C002 on 20-Jul-2026, as at 31-Aug-2026: Broken', () => {
    const c002 = byCode(data, 'C002').id;
    const p = promiseStatuses(data, '2026-08-31').find((r) => r.note.customerId === c002 && r.note.noteDate === '2026-07-20')!;
    expect(p.status).toBe('Broken');
  });

  it('10. control check (R14): no differences on the spot-check dates', () => {
    for (const d of ['2026-07-12', '2026-08-31', '2026-09-06', '2026-09-15']) expect(balanceCheck(data, d)).toEqual([]);
  });
});
