/**
 * Read-only check of the ten published spot checks on a running site.
 * It only reads pages and CSVs; it writes nothing. Reset the workspace first.
 *
 *   BASE=https://ar-manager-nine.vercel.app node tests/e2e/spot-checks-live.mjs
 */
import { BASE, check, go, open, text } from './lib.mjs';

const { browser, page, errors } = await open();
const at = (path, asof) => `${BASE}${path}${path.includes('?') ? '&' : '?'}asof=${asof}`;

async function invoiceRow(no, asof) {
  await go(page, at(`/invoices?q=${encodeURIComponent(no)}`, asof));
  return (await page.locator('tbody tr').first().innerText()).replace(/\s+/g, ' ');
}
async function invoicePage(no, asof) {
  await go(page, at(`/invoices?q=${encodeURIComponent(no)}`, asof));
  await page.locator(`a:has-text("${no}")`).first().click();
  await page.waitForURL(/\/invoices\/\d+/);
  await page.waitForFunction(() => !document.body.innerText.includes('Loading figures'));
  return text(page);
}
async function customerId(code) {
  await go(page, at(`/customers?q=${code}`, '2026-08-31'));
  return (await page.locator(`a:has-text("${code}")`).first().getAttribute('href')).match(/customers\/(\d+)/)[1];
}

let t = await invoicePage('BWA/26-27/0001', '2026-08-31');
check('1. 0001: CGST 6,750 + SGST 6,750, total 88,500, due 05-May-2026', t.includes('CGST @ 9% ₹6,750.00') && t.includes('SGST @ 9% ₹6,750.00') && t.includes('Invoice total ₹88,500.00') && t.includes('05-May-2026'));
t = await invoicePage('BWA/26-27/0002', '2026-08-31');
check('2. 0002: IGST 63,000, total 4,13,000', t.includes('IGST @ 18% ₹63,000.00') && t.includes('Invoice total ₹4,13,000.00'));
let r = await invoiceRow('BWA/26-27/0003', '2026-08-31');
check('3. 0003 @31-Aug: 69,600, Overdue · Part-paid, 90 days', r.includes('₹69,600.00') && r.includes('Overdue') && r.includes('Part-paid') && /\b90$/.test(r.trim()), r);
t = await invoicePage('BWA/26-27/0003', '2026-08-31');
check('3. 0003 bucket 61-90', t.includes('Bucket 61-90'));
r = await invoiceRow('BWA/26-27/0021', '2026-08-31');
check('4a. 0021 @31-Aug: Due 88,500', r.includes('Due') && r.includes('₹88,500.00') && !r.includes('Overdue'), r);
r = await invoiceRow('BWA/26-27/0021', '2026-09-06');
check('4b. 0021 @06-Sep: Overdue 2 days, 88,500', r.includes('Overdue') && /₹88,500\.00 Overdue 2$/.test(r.trim()), r);
r = await invoiceRow('BWA/26-27/0021', '2026-09-15');
check('4c. 0021 @15-Sep: Paid', r.includes('Paid'), r);

const c005 = await customerId('C005');
await go(page, at(`/customers/${c005}`, '2026-08-31'));
t = await text(page);
check('5. C005 @31-Aug: outstanding 1,88,800, unapplied 1,00,000, net 88,800 Dr', /Invoices outstanding ₹1,88,800\.00/i.test(t) && /Unapplied credit ₹1,00,000\.00/i.test(t) && /Net balance ₹88,800\.00 Dr/i.test(t));
await go(page, at(`/customers/${c005}`, '2026-07-12'));
check('6. C005 @12-Jul: net 1,00,000 Cr', /Net balance ₹1,00,000\.00 Cr/i.test(await text(page)));
r = await invoiceRow('BWA/26-27/0007', '2026-08-31');
check('7. 0007 @31-Aug: received 2,62,500, credited 29,500, outstanding 3,000', r.includes('₹2,62,500.00 ₹29,500.00 ₹3,000.00'), r);

const c002 = await customerId('C002');
await go(page, at(`/statement?customer=${c002}&from=2026-04-01&to=2026-08-31`, '2026-08-31'));
t = await text(page);
const lines = (await page.locator('article tbody').first().locator('tr').count()) - 1;
check('8. Statement C002: opening 70,800 Dr, closing 2,23,000 Dr, 7 lines', t.includes('Opening balance ₹70,800.00 Dr') && /Closing balance .*₹2,23,000\.00 Dr/.test(t) && lines === 7, `${lines} lines`);
await go(page, at(`/customers/${c002}`, '2026-08-31'));
check('9. C002 promise of 20-Jul @31-Aug: Broken', (await text(page)).includes('Promise: ₹69,600.00 by 01-Aug-2026 Broken'));

for (const d of ['2026-01-31', '2026-04-30', '2026-07-12', '2026-08-31', '2026-09-30', '2026-10-31']) {
  await go(page, at('/', d));
  check(`10. control check clean @${d}`, (await text(page)).includes('every customer balance agrees'));
}
await go(page, at('/', '2026-08-31'));
t = await text(page);
check('dashboard @31-Aug: outstanding 21,18,100, DSO 111 days, 11 overdue', /Total outstanding ₹21,18,100\.00/i.test(t) && /DSO 111 days/i.test(t) && /Overdue invoices 11/i.test(t));
check('no browser errors', errors.length === 0, errors.join(' | ').slice(0, 600));
await browser.close();
