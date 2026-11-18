/**
 * Phase 2 (Insights) tests. Expected figures were worked out by hand from the
 * sample data in docs/BRIEF.md Part 3, and the AR figures are cross-checked
 * against the independent Phase 1 module (lib/ar) for every day.
 */
import { describe, expect, it } from 'vitest';
import { addDays, customerPositions, invoicePositions } from '../lib/ar';
import { averageGap, customerInsights, invoiceSettlements, totalOutstanding } from '../lib/insights/metrics';
import { ratioText } from '../lib/insights/round';
import {
  closingAr,
  lakh,
  lakhAxis,
  monthEnd,
  monthsBefore,
  pointLabel,
  previousPeriodEnd,
  reportingDates,
  trendSeries,
  trendWindow,
  unappliedCredit,
  weekday,
  weekEnd,
} from '../lib/insights/trend';
import { byCode, byNo, rupees, sampleData } from './helpers';

const data = sampleData();
const AS_OF = '2026-11-18';
const insight = (code: string, asOf = AS_OF) => customerInsights(data, asOf).find((r) => r.customer.code === code)!;

describe('section 1: customer metrics, hand-calculated (as at 18-Nov-2026, all history)', () => {
  it('C001: payments 32.5, invoices 30.6, collection 34.2 days, outstanding 88,500', () => {
    const r = insight('C001');
    // payments 03-May, 02-Jun, 08-Jul, 20-Aug, 10-Sep: gaps 30 + 36 + 43 + 21 = 130 over 4
    expect(r.paymentFrequency).toBe(32.5);
    // invoices 05-Apr … 05-Sep (6 invoices): 153 days over 5 gaps
    expect(r.invoiceFrequency).toBe(30.6);
    // settled: 0001 28d, 0006 28d, 0011 33d, 0016 46d, 0021 36d = 171 / 5
    expect(r.avgCollectionPeriod).toBe(34.2);
    expect(r.outstanding).toBe(rupees(88500)); // 0024
    expect(r.text).toEqual({ paymentFrequency: '32.5 days', invoiceFrequency: '30.6 days', avgCollectionPeriod: '34.2 days' });
  });

  it('C002: 56.0 / 44.0 / 90.5 days, outstanding 1,28,600', () => {
    const r = insight('C002');
    expect(r.paymentFrequency).toBe(56); // 20-May, 15-Jun, 09-Sep: 112 / 2
    expect(r.invoiceFrequency).toBe(44); // 10-Mar … 20-Jul: 132 / 3
    expect(r.avgCollectionPeriod).toBe(90.5); // 0162 71d, 0009 110d (0003 still part-paid)
    expect(r.outstanding).toBe(rupees(69600 + 59000));
  });

  it('C003: one payment date → N/A; invoices 53.0; nothing fully settled → N/A', () => {
    const r = insight('C003');
    expect(r.paymentFrequency).toBeNull();
    expect(r.paymentDateCount).toBe(1);
    expect(r.invoiceFrequency).toBe(53); // 20-Jan … 28-Jun: 159 / 3
    expect(r.avgCollectionPeriod).toBeNull(); // 0156 is part-paid only
    expect(r.text.paymentFrequency).toBe('N/A');
    expect(r.text.avgCollectionPeriod).toBe('N/A');
    expect(r.outstanding).toBe(rupees(177000 + 57200 + 129800 + 82600));
  });

  it('C004: 55.0 / 41.3 / 84.0 days, outstanding 4,04,200', () => {
    const r = insight('C004');
    expect(r.paymentFrequency).toBe(55); // 20-Jun → 14-Aug
    expect(r.invoiceFrequency).toBeCloseTo(124 / 3, 12); // 28-Mar … 30-Jul
    expect(r.text.invoiceFrequency).toBe('41.3 days');
    expect(r.avgCollectionPeriod).toBe(84); // only 0170 (28-Mar → 20-Jun); 0007 has 3,000 left
    expect(r.outstanding).toBe(rupees(3000 + 47200 + 354000));
  });

  it('C005: one payment date → N/A; invoices 36.0; 0017 still 18,000 short → N/A', () => {
    const r = insight('C005');
    expect(r.paymentFrequency).toBeNull();
    expect(r.invoiceFrequency).toBe(36); // 15-Jul → 20-Aug
    expect(r.avgCollectionPeriod).toBeNull();
    expect(r.outstanding).toBe(rupees(18000 + 70800)); // invoice balances, advance not deducted
  });

  it('C006: 71.0 / 47.5 / 23.5 days, outstanding 35,400', () => {
    const r = insight('C006');
    expect(r.paymentFrequency).toBe(71); // 10-May → 20-Jul
    expect(r.invoiceFrequency).toBe(47.5); // 28-Apr … 01-Aug: 95 / 2
    expect(r.avgCollectionPeriod).toBe(23.5); // 0005 12d, 0012 35d
    expect(r.outstanding).toBe(rupees(35400));
  });

  it('C007: cancelled 0014 excluded; 75.0 / 45.7 / 61.7 days, outstanding 2,59,600', () => {
    const r = insight('C007');
    expect(r.invoiceCount).toBe(4); // 0002, 0008, 0015, 0023 (0014 cancelled)
    expect(r.paymentFrequency).toBe(75); // 25-Jun → 08-Sep
    expect(r.text.invoiceFrequency).toBe('45.7 days'); // 137 / 3
    expect(r.text.avgCollectionPeriod).toBe('61.7 days'); // 76 + 41 + 68 = 185 / 3
    expect(r.outstanding).toBe(rupees(259600));
  });

  it('C008 (inactive): one invoice, one payment → N/A, N/A; collection 26.0; nothing outstanding', () => {
    const r = insight('C008');
    expect(r.invoiceFrequency).toBeNull();
    expect(r.paymentFrequency).toBeNull();
    expect(r.avgCollectionPeriod).toBe(26); // 30-Mar → 25-Apr
    expect(r.outstanding).toBe(0);
    expect(r.text.invoiceFrequency).toBe('N/A');
  });

  it('total outstanding as at 18-Nov-2026 is 14,51,700', () => {
    expect(totalOutstanding(customerInsights(data, AS_OF))).toBe(rupees(1451700));
  });

  it('the as-at date limits history (R10): as at 31-Aug-2026', () => {
    const c001 = insight('C001', '2026-08-31');
    expect(c001.paymentDateCount).toBe(4); // 10-Sep receipt not yet received
    expect(c001.paymentFrequency).toBe(109 / 3); // 03-May → 20-Aug
    expect(c001.avgCollectionPeriod).toBe((28 + 28 + 33 + 46) / 4); // 0021 not yet settled
    expect(insight('C005', '2026-08-31').outstanding).toBe(rupees(118000 + 70800)); // advance not allocated yet
  });
});

describe('section 1: rules and edge cases', () => {
  it('outstanding equals Phase 1 invoice outstanding for every customer, every day of 2026', () => {
    for (let d = '2026-01-01'; d <= '2026-12-31'; d = addDays(d, 1)) {
      const p1 = new Map(customerPositions(data, d).map((p) => [p.customer.id, p.outstanding]));
      for (const r of customerInsights(data, d)) expect(r.outstanding, `${r.customer.code} ${d}`).toBe(p1.get(r.customer.id));
    }
  });

  it('averageGap: worked examples from the Phase 2 brief', () => {
    expect(averageGap(['2026-01-01', '2026-01-31', '2026-03-02'])!.value).toBe(30); // payments example
    expect(averageGap(['2026-01-01', '2026-01-15', '2026-01-31'])!.value).toBe(15); // invoices example
    expect(averageGap(['2026-01-01'])).toBeNull();
    expect(averageGap([])).toBeNull();
  });

  it('two receipts on the same day are one payment date', () => {
    const d = sampleData();
    const c006 = byCode(d, 'C006');
    d.receipts.push({ id: 9001, receiptNo: 'X', customerId: c006.id, receiptDate: '2026-07-20', bankAmount: 100, tdsAmount: 0, mode: 'UPI', reference: '' });
    const r = customerInsights(d, AS_OF).find((x) => x.customer.id === c006.id)!;
    expect(r.paymentDateCount).toBe(2);
    expect(r.paymentFrequency).toBe(71);
  });

  it('a deleted (reversed) receipt simply no longer counts', () => {
    const d = sampleData();
    const c002 = byCode(d, 'C002');
    const rct16 = d.receipts.find((r) => r.receiptNo === 'RCT/26-27/0016')!;
    d.receipts = d.receipts.filter((r) => r.id !== rct16.id);
    d.allocations = d.allocations.filter((a) => a.receiptId !== rct16.id);
    const r = customerInsights(d, AS_OF).find((x) => x.customer.id === c002.id)!;
    expect(r.paymentDateCount).toBe(2);
    expect(r.paymentFrequency).toBe(26); // 20-May → 15-Jun
  });

  it('a part-paid invoice counts only once fully settled, from its final settlement date', () => {
    const d = sampleData();
    const inv3 = byNo(d, 'BWA/26-27/0003'); // 18-Apr; 72,000 paid 15-Jun; 69,600 left
    d.receipts.push({ id: 9002, receiptNo: 'Y', customerId: inv3.customerId, receiptDate: '2026-10-01', bankAmount: rupees(69600), tdsAmount: 0, mode: 'NEFT', reference: '' });
    d.allocations.push({ id: 9003, receiptId: 9002, invoiceId: inv3.id, allocationDate: '2026-10-05', amount: rupees(69600) });
    const s = invoiceSettlements(d, AS_OF).find((x) => x.invoice.id === inv3.id)!;
    expect(s.settledOn).toBe('2026-10-05');
    const r = customerInsights(d, AS_OF).find((x) => x.customer.id === inv3.customerId)!;
    // 0162 71d, 0009 110d, 0003 18-Apr → 05-Oct = 170d
    expect(r.avgCollectionPeriod).toBe((71 + 110 + 170) / 3);
    // before the final allocation it is not counted
    expect(customerInsights(d, '2026-10-04').find((x) => x.customer.id === inv3.customerId)!.avgCollectionPeriod).toBe(90.5);
  });

  it('an invoice settled entirely by a credit note is not a collection', () => {
    const d = sampleData();
    const inv24 = byNo(d, 'BWA/26-27/0024');
    d.creditNotes.push({ id: 9004, creditNoteNo: 'Z', invoiceId: inv24.id, creditNoteDate: '2026-10-01', taxableValue: rupees(75000), cgst: rupees(6750), sgst: rupees(6750), igst: 0, total: rupees(88500), reason: 'test' });
    const r = customerInsights(d, AS_OF).find((x) => x.customer.id === inv24.customerId)!;
    expect(r.outstanding).toBe(0);
    expect(r.avgCollectionPeriod).toBe(34.2); // unchanged: 0024 was not collected
  });

  it('a credit note dated after the last payment sets the settlement date', () => {
    const d = sampleData();
    const inv7 = byNo(d, 'BWA/26-27/0007'); // 12-May; 3,000 left after 14-Aug payment
    d.creditNotes.push({ id: 9005, creditNoteNo: 'W', invoiceId: inv7.id, creditNoteDate: '2026-09-01', taxableValue: rupees(3000 / 1.18), cgst: 0, sgst: 0, igst: 0, total: rupees(3000), reason: 'write-back' });
    const s = invoiceSettlements(d, AS_OF).find((x) => x.invoice.id === inv7.id)!;
    expect(s.outstanding).toBe(0);
    expect(s.settledOn).toBe('2026-09-01');
  });
});

describe('section 2: Historical AR trend', () => {
  it('closing AR equals Phase 1 Σ invoice outstanding on every day of 2026, consolidated and per customer', () => {
    for (let d = '2026-01-01'; d <= '2026-12-31'; d = addDays(d, 1)) {
      const p1 = invoicePositions(data, d);
      expect(closingAr(data, d), d).toBe(p1.reduce((s, p) => s + p.outstanding, 0));
      for (const c of data.customers) {
        expect(closingAr(data, d, c.id)).toBe(p1.filter((p) => p.invoice.customerId === c.id).reduce((s, p) => s + p.outstanding, 0));
      }
      expect(unappliedCredit(data, d)).toBe(customerPositions(data, d).reduce((s, p) => s + p.unapplied, 0));
    }
  });

  it('known month-end balances (consolidated)', () => {
    expect(closingAr(data, '2026-08-31')).toBe(rupees(2118100)); // matches the dashboard
    expect(closingAr(data, '2026-03-31')).toBe(rupees(177000 + 106200 + 70800 + 236000 + 53100));
    expect(closingAr(data, '2025-12-31')).toBe(0);
  });

  it('TDS counts: an 81,000 bank + 7,500 TDS receipt clears an 88,500 invoice', () => {
    const c001 = byCode(data, 'C001');
    expect(closingAr(data, '2026-05-02', c001.id)).toBe(rupees(88500)); // 0001 open
    expect(closingAr(data, '2026-05-03', c001.id)).toBe(0); // RCT 0003 allocated
  });

  it('credit notes count from their own date', () => {
    const c004 = byCode(data, 'C004');
    expect(closingAr(data, '2026-07-25', c004.id) - closingAr(data, '2026-07-24', c004.id)).toBe(-rupees(29500));
  });

  it('calendar helpers', () => {
    expect(monthEnd('2026-02-10')).toBe('2026-02-28');
    expect(monthEnd('2028-02-01')).toBe('2028-02-29');
    expect(monthEnd('2026-12-05')).toBe('2026-12-31');
    expect(monthsBefore('2026-11-18', 11)).toBe('2025-12-01');
    expect(monthsBefore('2026-03-31', 5)).toBe('2025-10-01');
    expect(monthsBefore('2026-01-15', 0)).toBe('2026-01-01');
    expect(weekday('2026-11-18')).toBe(3); // Wednesday
    expect(weekEnd('2026-11-18')).toBe('2026-11-22');
    expect(weekEnd('2026-11-22')).toBe('2026-11-22'); // a Sunday ends its own week
    expect(previousPeriodEnd('2026-11-18', 'month')).toBe('2026-10-31');
    expect(previousPeriodEnd('2026-03-31', 'month')).toBe('2026-02-28');
    expect(previousPeriodEnd('2026-11-18', 'week')).toBe('2026-11-15');
    expect(previousPeriodEnd('2026-11-22', 'week')).toBe('2026-11-15');
  });

  it('presets: last 12 / 6 / 3 months end at the as-at date and include the current month', () => {
    expect(trendWindow(AS_OF, undefined)).toMatchObject({ from: '2025-12-01', to: AS_OF, preset: '12m' });
    expect(trendWindow(AS_OF, '6m')).toMatchObject({ from: '2026-06-01', to: AS_OF });
    expect(trendWindow(AS_OF, '3m')).toMatchObject({ from: '2026-09-01', to: AS_OF });
    const pts = reportingDates('2025-12-01', AS_OF, 'month');
    expect(pts).toHaveLength(12);
    expect(pts[0]).toEqual({ date: '2025-12-31', partial: false });
    expect(pts[10]).toEqual({ date: '2026-10-31', partial: false });
    expect(pts[11]).toEqual({ date: AS_OF, partial: true });
    // on a month-end as-at date the last month is complete
    expect(reportingDates('2026-06-01', '2026-08-31', 'month').map((p) => p.partial)).toEqual([false, false, false]);
  });

  it('custom range: validated, and capped at the as-at date', () => {
    expect(trendWindow(AS_OF, 'custom', '2026-04-15', '2026-07-10')).toMatchObject({ from: '2026-04-15', to: '2026-07-10' });
    expect(reportingDates('2026-04-15', '2026-07-10', 'month').map((p) => p.date)).toEqual(['2026-04-30', '2026-05-31', '2026-06-30', '2026-07-10']);
    expect(trendWindow(AS_OF, 'custom', '2026-04-01', '2027-03-31')).toMatchObject({ to: AS_OF });
    expect(trendWindow(AS_OF, 'custom', '2026-04-01', '2027-03-31').note).toMatch(/as-at date/);
    expect(trendWindow(AS_OF, 'custom', '2026-09-01', '2026-08-01').error).toMatch(/From date/);
    expect(trendWindow(AS_OF, 'custom', '', '').error).toMatch(/both dates/);
  });

  it('weekly: Sundays inside the window, then the window end', () => {
    const pts = reportingDates('2026-11-01', AS_OF, 'week');
    expect(pts.map((p) => p.date)).toEqual(['2026-11-01', '2026-11-08', '2026-11-15', AS_OF]);
    expect(pts.at(-1)!.partial).toBe(true);
    for (const p of reportingDates('2025-12-01', AS_OF, 'week').slice(0, -1)) expect(weekday(p.date)).toBe(0);
  });

  it('series: % change from the previous month and week, computed from exact figures', () => {
    const s = trendSeries(data, { from: '2026-06-01', to: '2026-08-31' }, 'month');
    expect(s.map((p) => p.label)).toEqual(['Jun 2026', 'Jul 2026', 'Aug 2026']);
    for (const p of s) {
      expect(p.previous).toBe(closingAr(data, previousPeriodEnd(p.date, 'month')));
      expect(p.changePct).toBeCloseTo(((p.closing - p.previous) / p.previous) * 100, 10);
    }
    expect(s[0].previousDate).toBe('2026-05-31');
    expect(s[1].previous).toBe(s[0].closing);
    const w = trendSeries(data, { from: '2026-08-01', to: '2026-08-31' }, 'week');
    expect(w[1].previous).toBe(w[0].closing);
    expect(w[0].label).toBe('Week ending 02-Aug-2026');
    expect(w.at(-1)!.label).toBe('Week to 31-Aug-2026');
  });

  it('% change is N/A when the previous balance is nil', () => {
    const s = trendSeries(data, { from: '2026-01-01', to: '2026-01-31' }, 'month');
    expect(s[0].previous).toBe(0); // nothing outstanding at 31-Dec-2025
    expect(s[0].changePct).toBeNull();
    expect(s[0].changeText).toBeNull();
  });

  it('customer filter: the consolidated series is the sum of the customer series', () => {
    const w = { from: '2025-12-01', to: AS_OF };
    const all = trendSeries(data, w, 'month');
    const per = data.customers.map((c) => trendSeries(data, w, 'month', c.id));
    all.forEach((p, i) => expect(per.reduce((s, cs) => s + cs[i].closing, 0)).toBe(p.closing));
  });

  it('labels', () => {
    expect(pointLabel('2026-08-31', 'month', false)).toBe('Aug 2026');
    expect(pointLabel(AS_OF, 'month', true)).toBe('Nov 2026 (to 18-Nov-2026)');
  });

  it('lakh axis: 2-lakh steps from 0 covering the largest balance', () => {
    expect(lakhAxis(rupees(2118100))).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]);
    expect(lakhAxis(rupees(400000))).toEqual([0, 2, 4]);
    expect(lakhAxis(rupees(35400))).toEqual([0, 2]);
    expect(lakhAxis(0)).toEqual([0, 2]);
    expect(lakh(rupees(2118100))).toBe('21.18');
    expect(lakh(rupees(35400))).toBe('0.35');
  });
});

describe('exact rounding for display', () => {
  it('rounds true halves up, not the floating-point way', () => {
    expect(ratioText(1005, 1000, 2)).toBe('1.01'); // (1.005).toFixed(2) gives "1.00"
    expect(ratioText(124, 3, 1)).toBe('41.3');
    expect(ratioText(185, 3, 1)).toBe('61.7');
    expect(ratioText(-5, 100, 1)).toBe('-0.1'); // -0.05 → away from zero
    expect(ratioText(-4, 100, 1)).toBe('0.0');
    expect(ratioText(30, 1, 1)).toBe('30.0');
    expect(ratioText(2118100_00, 10_000_000, 2)).toBe('21.18');
    expect(ratioText(125_000, 10_000_000, 2)).toBe('0.01'); // 0.0125 lakh → 0.01
    expect(ratioText(15_000, 1_000_000, 2)).toBe('0.02'); // 0.015 exactly → 0.02
  });
});
