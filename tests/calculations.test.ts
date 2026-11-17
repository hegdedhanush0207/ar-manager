/**
 * Unit tests for lib/ar beyond the spot checks (brief section 4.14).
 */
import { describe, expect, it } from 'vitest';
import {
  addDays,
  allocationProblems,
  balanceByDocuments,
  balanceCheck,
  bucketFor,
  cancelProblem,
  creditNoteGst,
  customerPositions,
  daysBetween,
  divideRoundHalfUp,
  dsoDetail,
  dueDate,
  expectedTds,
  followUpsDue,
  fyLabel,
  gstSplit,
  invoiceAvailable,
  invoicePositions,
  invoiceRows,
  invoiceTotals,
  nextNumber,
  openInvoicesFor,
  promiseStatuses,
  receiptAvailable,
  receiptPositions,
  statement,
  suggestAllocations,
  totalPositions,
} from '../lib/ar';
import { byCode, byNo, rupees, sampleData } from './helpers';

const data = sampleData();

/** Every date from `from` to `to` inclusive. */
function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
const YEAR = eachDay('2026-01-01', '2026-10-31');

describe('R14 control check', () => {
  it('balanceCheck is empty for every day from 2026-01-01 to 2026-10-31', () => {
    expect(YEAR).toHaveLength(304);
    for (const d of YEAR) expect(balanceCheck(data, d), d).toEqual([]);
  });

  it('every statement closing balance equals balanceByDocuments at its To date', () => {
    const periods: [string, string][] = [
      ['2026-01-01', '2026-03-31'],
      ['2026-04-01', '2026-08-31'],
      ['2026-04-01', '2026-10-31'],
      ['2026-07-01', '2026-07-31'],
      ['2026-09-01', '2026-09-30'],
    ];
    for (const c of data.customers) {
      for (const [f, t] of periods) {
        const s = statement(data, c.id, f, t);
        expect(s.closing, `${c.code} ${f}..${t}`).toBe(balanceByDocuments(data, c.id, t));
        expect(s.opening).toBe(balanceByDocuments(data, c.id, addDays(f, -1)));
      }
      // and on every month-end the statement from the very start agrees too
      for (const t of YEAR.filter((d) => addDays(d, 1).endsWith('-01'))) {
        expect(statement(data, c.id, '2026-01-01', t).closing).toBe(balanceByDocuments(data, c.id, t));
      }
    }
  });

  it('statement footer buckets plus unapplied reconcile to the closing balance', () => {
    for (const c of data.customers) {
      const s = statement(data, c.id, '2026-04-01', '2026-08-31');
      const buckets = Object.values(s.buckets).reduce((a, b) => a + b, 0);
      expect(buckets - s.unapplied).toBe(s.closing);
    }
  });
});

describe('dates', () => {
  it('daysBetween and addDays are time-zone safe and handle month/year ends', () => {
    expect(daysBetween('2026-06-02', '2026-08-31')).toBe(90);
    expect(daysBetween('2026-08-31', '2026-06-02')).toBe(-90);
    expect(addDays('2026-01-31', 30)).toBe('2026-03-02');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // leap year
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-04-01', -1)).toBe('2026-03-31');
  });

  it('R2 dueDate counts calendar days', () => {
    expect(dueDate('2026-04-05', 30)).toBe('2026-05-05');
    expect(dueDate('2026-04-18', 45)).toBe('2026-06-02');
    expect(dueDate('2026-03-28', 60)).toBe('2026-05-27');
    expect(dueDate('2026-08-01', 0)).toBe('2026-08-01');
    // every stored sample due date matches the customer's terms
    for (const i of data.invoices) {
      const c = data.customers.find((x) => x.id === i.customerId)!;
      expect(dueDate(i.invoiceDate, c.creditDays), i.invoiceNo).toBe(i.dueDate);
    }
  });
});

describe('R3 / R7 GST', () => {
  it('splits by state and rounds each component halves up', () => {
    expect(gstSplit('Maharashtra', rupees(75000), 18)).toEqual({ cgst: rupees(6750), sgst: rupees(6750), igst: 0 });
    expect(gstSplit('Karnataka', rupees(150000), 18)).toEqual({ cgst: 0, sgst: 0, igst: rupees(27000) });
    // ₹0.25 taxable at 18%: CGST = 2.25 paise → 2; ₹0.75: 6.75 → 7
    expect(gstSplit('Maharashtra', 25, 18).cgst).toBe(2);
    expect(gstSplit('Maharashtra', 75, 18).cgst).toBe(7);
    // exact half: ₹100.50 taxable × 9% = 904.5 paise → 905 (half up)
    expect(gstSplit('Maharashtra', 10050, 18).cgst).toBe(905);
    expect(gstSplit('Gujarat', 25, 18).igst).toBe(5); // 4.5 paise → 5
  });

  it('divideRoundHalfUp', () => {
    expect(divideRoundHalfUp(5, 2)).toBe(3);
    expect(divideRoundHalfUp(4, 2)).toBe(2);
    expect(divideRoundHalfUp(149, 100)).toBe(1);
    expect(divideRoundHalfUp(150, 100)).toBe(2);
  });

  it('every stored invoice and credit note matches the GST rule', () => {
    for (const i of data.invoices) {
      const c = data.customers.find((x) => x.id === i.customerId)!;
      const g = gstSplit(c.state, i.taxableValue, i.gstRatePct);
      expect([i.cgst, i.sgst, i.igst], i.invoiceNo).toEqual([g.cgst, g.sgst, g.igst]);
    }
    const cn = data.creditNotes[0];
    const inv = data.invoices.find((i) => i.id === cn.invoiceId)!;
    expect(creditNoteGst(inv, cn.taxableValue)).toEqual({ cgst: cn.cgst, sgst: cn.sgst, igst: cn.igst });
  });

  it('a credit note on an IGST invoice uses IGST', () => {
    const inv = byNo(data, 'BWA/26-27/0002');
    expect(creditNoteGst(inv, rupees(10000))).toEqual({ cgst: 0, sgst: 0, igst: rupees(1800) });
  });
});

describe('R4 numbering', () => {
  it('fyLabel', () => {
    expect(fyLabel('2026-04-01')).toBe('26-27');
    expect(fyLabel('2026-03-31')).toBe('25-26');
    expect(fyLabel('2099-12-31')).toBe('99-00');
  });

  it('next numbers after the sample data match the brief', () => {
    expect(nextNumber('invoice', data, '2026-09-18')).toBe('BWA/26-27/0025');
    expect(nextNumber('creditNote', data, '2026-09-18')).toBe('BWA/CN/26-27/002');
    expect(nextNumber('receipt', data, '2026-09-18')).toBe('RCT/26-27/0018');
  });

  it('restarts each 1 April, and never reuses cancelled numbers', () => {
    expect(nextNumber('invoice', data, '2027-04-01')).toBe('BWA/27-28/0001');
    expect(nextNumber('creditNote', data, '2027-04-01')).toBe('BWA/CN/27-28/001');
    expect(nextNumber('invoice', data, '2026-03-31')).toBe('BWA/25-26/0172');
    expect(byNo(data, 'BWA/26-27/0014').isCancelled).toBe(true); // 0014 is cancelled but still counted
    expect(nextNumber('invoice', data, '2026-09-18').length).toBeLessThanOrEqual(16);
  });
});

describe('R11 / R12 positions and buckets', () => {
  it('bucket boundaries', () => {
    const cases: [number, string][] = [
      [-5, 'Not due'], [0, 'Not due'], [1, '1-30'], [30, '1-30'], [31, '31-60'], [60, '31-60'],
      [61, '61-90'], [90, '61-90'], [91, '91-180'], [180, '91-180'], [181, 'Over 180'], [999, 'Over 180'],
    ];
    for (const [d, b] of cases) expect(bucketFor(d), String(d)).toBe(b);
  });

  it('only records dated on or before the as-at date count (R10)', () => {
    // BWA/26-27/0017: receipt dated 10-Jul but allocated 05-Sep: not part-paid on 31-Aug
    const p = (d: string) => invoicePositions(data, d).find((x) => x.invoice.invoiceNo === 'BWA/26-27/0017')!;
    expect(p('2026-08-31').isPartPaid).toBe(false);
    expect(p('2026-08-31').outstanding).toBe(rupees(118000));
    // from 05-Sep the 1,00,000 advance is allocated: 18,000 left, part-paid
    expect(p('2026-09-05').outstanding).toBe(rupees(18000));
    expect(p('2026-09-05').isPartPaid).toBe(true);
    expect(invoicePositions(data, '2026-04-04').some((x) => x.invoice.invoiceNo === 'BWA/26-27/0001')).toBe(false);
    // credit note counts from its own date
    const q = (d: string) => invoicePositions(data, d).find((x) => x.invoice.invoiceNo === 'BWA/26-27/0007')!;
    expect(q('2026-07-24').credited).toBe(0);
    expect(q('2026-07-25').credited).toBe(rupees(29500));
  });

  it('cancelled invoices are left out of positions and totals, but listed as Cancelled', () => {
    expect(invoicePositions(data, '2026-10-31').some((p) => p.invoice.invoiceNo === 'BWA/26-27/0014')).toBe(false);
    const rows = invoiceRows(data, '2026-10-31');
    const cancelled = rows.find((r) => r.invoice.invoiceNo === 'BWA/26-27/0014')!;
    expect(cancelled.status).toBe('Cancelled');
    expect(invoiceTotals([cancelled]).total).toBe(0);
    expect(rows).toHaveLength(29);
  });

  it('the disputed flag changes no amount', () => {
    const p = invoicePositions(data, '2026-08-31').find((x) => x.invoice.invoiceNo === 'BWA/26-27/0010')!;
    expect(p.invoice.isDisputed).toBe(true);
    expect(p.outstanding).toBe(p.invoice.total);
  });
});

describe('R13 customer positions', () => {
  it('overdue = outstanding − Not due; buckets add up to outstanding', () => {
    for (const d of ['2026-06-30', '2026-08-31', '2026-10-31']) {
      for (const p of customerPositions(data, d)) {
        const sum = Object.values(p.buckets).reduce((a, b) => a + b, 0);
        expect(sum).toBe(p.outstanding);
        expect(p.overdue).toBe(p.outstanding - p.buckets['Not due']);
        expect(p.netBalance).toBe(p.outstanding - p.unapplied);
        expect(p.overLimit).toBe(p.netBalance > p.customer.creditLimit);
      }
    }
  });

  it('unapplied credit equals the receipt positions, and totals add up', () => {
    const d = '2026-08-31';
    const rows = customerPositions(data, d);
    const t = totalPositions(rows);
    const unapplied = receiptPositions(data, d).reduce((s, r) => s + r.unapplied, 0);
    expect(t.unapplied).toBe(unapplied);
    expect(t.unapplied).toBe(rupees(100000)); // only C005's advance
    expect(t.netBalance).toBe(t.outstanding - t.unapplied);
  });

  it('receipt settlement = bank + TDS (R5)', () => {
    const r = receiptPositions(data, '2026-08-31').find((x) => x.receipt.receiptNo === 'RCT/26-27/0013')!;
    expect(r.settlement).toBe(rupees(262500));
    expect(r.unapplied).toBe(0);
  });
});

describe('R16 notes', () => {
  it('follow-ups due as at a date', () => {
    expect(followUpsDue(data, '2026-08-31')).toHaveLength(0);
    const due = followUpsDue(data, '2026-09-10').map((n) => n.followUpDate);
    expect(due).toEqual(['2026-09-01', '2026-09-05', '2026-09-10']);
    expect(followUpsDue(data, '2026-09-15')).toHaveLength(4);
  });

  it('promise statuses', () => {
    const at = (d: string) => Object.fromEntries(promiseStatuses(data, d).map((p) => [p.note.noteDate, p.status]));
    // C002 promise 20-Jul for 01-Aug: Pending until it passes, then Broken
    expect(at('2026-07-25')['2026-07-20']).toBe('Pending');
    expect(at('2026-08-01')['2026-07-20']).toBe('Pending'); // promise date itself: not yet broken
    expect(at('2026-08-02')['2026-07-20']).toBe('Broken');
    // C002 promise 02-Sep for 94,400 by 10-Sep: RCT/26-27/0016 on 09-Sep settles 94,400 → Kept
    expect(at('2026-09-08')['2026-09-02']).toBe('Pending');
    expect(at('2026-09-09')['2026-09-02']).toBe('Kept');
    // C003 promise 10-Aug for 2,34,200 by 30-Sep: nothing received → Broken after 30-Sep
    expect(at('2026-09-30')['2026-08-10']).toBe('Pending');
    expect(at('2026-10-01')['2026-08-10']).toBe('Broken');
    // notes dated after the as-at date do not exist yet
    expect(at('2026-08-31')['2026-09-02']).toBeUndefined();
  });
});

describe('R17 DSO', () => {
  it('is null when there are no sales in the window', () => {
    expect(dsoDetail(data, '2025-06-30').dso).toBeNull();
  });

  it('as at 31-Aug-2026', () => {
    const r = dsoDetail(data, '2026-08-31');
    expect(r.windowFrom).toBe('2026-06-03');
    // Invoices dated 03-Jun..31-Aug (0011 to 0023, less cancelled 0014; 0010 is dated 01-Jun, outside) less CN 001 (25-Jul)
    expect(r.sales).toBe(rupees(88500 +29500 + 82600 + 472000 + 88500 + 118000 + 59000 + 354000 + 35400 + 88500 + 70800 + 259600 - 29500));
    expect(r.dso).toBe(Math.round((r.outstanding * 90) / r.sales));
    const outstanding = invoicePositions(data, '2026-08-31').reduce((s, p) => s + p.outstanding, 0);
    expect(r.outstanding).toBe(outstanding);
  });
});

describe('R6 allocation rules', () => {
  const c005 = byCode(data, 'C005');

  it('open invoices are oldest first by due date then number, and the suggestion fills them in order', () => {
    const open = openInvoicesFor(data, byCode(data, 'C003').id);
    expect(open.map((o) => o.invoice.invoiceNo)).toEqual(['BWA/25-26/0141', 'BWA/25-26/0156', 'BWA/26-27/0004', 'BWA/26-27/0013']);
    expect(open[1].available).toBe(rupees(106200 - 49000));
    const s = suggestAllocations(open, rupees(200000));
    expect(s.map((a) => a.amount)).toEqual([rupees(177000), rupees(23000)]);
  });

  it('available amounts are all-time', () => {
    expect(invoiceAvailable(data, byNo(data, 'BWA/26-27/0007').id)).toBe(rupees(3000));
    expect(invoiceAvailable(data, byNo(data, 'BWA/26-27/0014').id)).toBe(0); // cancelled
    const r11 = data.receipts.find((r) => r.receiptNo === 'RCT/26-27/0011')!;
    expect(receiptAvailable(data, r11.id)).toBe(0);
  });

  it('expected TDS reproduces the sample receipts', () => {
    const c001 = byCode(data, 'C001');
    // C001 paying BWA/26-27/0024 (88,500; taxable 75,000) with 81,000 → TDS 7,500
    const open = openInvoicesFor(data, c001.id);
    expect(expectedTds(open, rupees(81000), c001.tdsRatePct)).toBe(rupees(7500));
    expect(expectedTds(open, rupees(81000), 0)).toBe(0);
  });

  it('rejects allocations that break the rules', () => {
    const inv22 = byNo(data, 'BWA/26-27/0022');
    const receipt = { id: 0, customerId: c005.id, receiptDate: '2026-09-01', receiptNo: '', settlement: rupees(50000) };
    expect(allocationProblems(data, receipt, [{ invoiceId: inv22.id, allocationDate: '2026-09-01', amount: rupees(50000) }])).toEqual([]);
    // more than the receipt
    expect(allocationProblems(data, receipt, [{ invoiceId: inv22.id, allocationDate: '2026-09-01', amount: rupees(60000) }]).length).toBeGreaterThan(0);
    // another customer's invoice
    expect(allocationProblems(data, receipt, [{ invoiceId: byNo(data, 'BWA/26-27/0021').id, allocationDate: '2026-09-01', amount: 100 }]).join()).toMatch(/different customer/);
    // before the receipt date
    expect(allocationProblems(data, receipt, [{ invoiceId: inv22.id, allocationDate: '2026-08-31', amount: 100 }]).join()).toMatch(/before the receipt date/);
    // more than the invoice has left
    const big = { ...receipt, settlement: rupees(500000) };
    expect(allocationProblems(data, big, [{ invoiceId: inv22.id, allocationDate: '2026-09-01', amount: rupees(70801) }]).join()).toMatch(/left to settle/);
  });

  it('R8 cancellation needs no allocations or credit notes', () => {
    expect(cancelProblem(data, byNo(data, 'BWA/26-27/0024').id)).toBeNull();
    expect(cancelProblem(data, byNo(data, 'BWA/26-27/0001').id)).toMatch(/allocated/);
    expect(cancelProblem(data, byNo(data, 'BWA/26-27/0014').id)).toMatch(/already cancelled/);
  });
});

describe('R14 holds after new records are added', () => {
  it('a new part-payment with TDS and a credit note keep the control check clean', () => {
    const d = sampleData();
    const c004 = byCode(d, 'C004');
    const inv19 = byNo(d, 'BWA/26-27/0019');
    d.receipts.push({ id: 9001, receiptNo: 'RCT/26-27/0018', customerId: c004.id, receiptDate: '2026-09-20', bankAmount: rupees(100000), tdsAmount: rupees(10000), mode: 'NEFT', reference: 'T' });
    d.allocations.push({ id: 9002, receiptId: 9001, invoiceId: inv19.id, allocationDate: '2026-09-25', amount: rupees(80000) });
    d.creditNotes.push({ id: 9003, creditNoteNo: 'BWA/CN/26-27/002', invoiceId: inv19.id, creditNoteDate: '2026-09-22', taxableValue: rupees(10000), cgst: rupees(900), sgst: rupees(900), igst: 0, total: rupees(11800), reason: 'T' });
    for (const day of eachDay('2026-09-15', '2026-10-31')) expect(balanceCheck(d, day), day).toEqual([]);
    const p = invoicePositions(d, '2026-09-30').find((x) => x.invoice.id === inv19.id)!;
    expect(p.outstanding).toBe(rupees(354000 - 80000 - 11800));
    expect(customerPositions(d, '2026-09-21').find((x) => x.customer.id === c004.id)!.unapplied).toBe(rupees(110000));
  });
});

describe('dashboard summary', () => {
  it('as at 31-Aug-2026 agrees with the positions', async () => {
    const { dashboardSummary } = await import('../lib/ar');
    const s = dashboardSummary(data, '2026-08-31');
    const outstanding = invoicePositions(data, '2026-08-31').reduce((a, p) => a + p.outstanding, 0);
    expect(s.outstanding).toBe(outstanding);
    expect(s.unapplied).toBe(rupees(100000));
    expect(s.netReceivable).toBe(outstanding - rupees(100000));
    expect(s.overdueCount).toBe(invoicePositions(data, '2026-08-31').filter((p) => p.status === 'Overdue').length);
    expect(s.overduePct).toBeCloseTo((s.overdue / s.outstanding) * 100, 10);
  });
});
