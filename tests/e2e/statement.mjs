import { BASE, check, go, open, text } from './lib.mjs';

const { browser, page, errors } = await open();
await go(page, `${BASE}/customers?asof=2026-08-31&q=C002`);
const id = (await page.locator('a:has-text("C002")').first().getAttribute('href')).match(/customers\/(\d+)/)[1];

// On screen (spot check 8)
await go(page, `${BASE}/statement?asof=2026-08-31&customer=${id}&from=2026-04-01&to=2026-08-31`);
let t = await text(page);
check('opening 70,800.00 Dr', t.includes('Opening balance ₹70,800.00 Dr'));
check('closing 2,23,000.00 Dr', /Closing balance ₹[\d,.]+ ₹[\d,.]+ ₹2,23,000\.00 Dr/.test(t));
const lines = await page.locator('article tbody').first().locator('tr').count();
check('7 lines plus opening row', lines === 8, String(lines));
check('TDS line wording', t.includes('TDS deducted by customer'));
check('ageing footer present', t.includes('Ageing of the closing balance as at 31-Aug-2026'));

// Print layout: header/nav/buttons hidden, seller shown
await page.emulateMedia({ media: 'print' });
check('nav hidden when printing', !(await page.locator('header nav').isVisible()));
check('Print button hidden when printing', !(await page.locator('button:has-text("Print")').isVisible()));
check('seller name printed', await page.locator('article >> text=Brightwater Advisory Pvt. Ltd.').isVisible());
// (page.pdf can save the print layout for a visual check)
await page.emulateMedia({ media: 'screen' });

// Statement CSV
let res = await page.request.get(`${BASE}/statement/export?asof=2026-08-31&customer=${id}&from=2026-04-01&to=2026-08-31`);
let body = await res.text();
check('statement CSV is text/csv', res.headers()['content-type']?.startsWith('text/csv'));
check('statement CSV filename', res.headers()['content-disposition'] === 'attachment; filename="Statement_C002_2026-04-01_to_2026-08-31.csv"', res.headers()['content-disposition']);
check('statement CSV BOM', body.charCodeAt(0) === 0xfeff);
check('statement CSV closing 223000.00', body.includes('Closing balance') && body.includes('223000.00,Dr'));

// Invoice list CSV keeps the filters
res = await page.request.get(`${BASE}/invoices/export?asof=2026-08-31&status=Overdue`);
body = await res.text();
check('invoice CSV filename', res.headers()['content-disposition']?.includes('Invoices_as_at_2026-08-31.csv'));
check('invoice CSV has 11 overdue rows', body.split('\r\n').filter((l) => l.startsWith('BWA/')).length === 11);

// Ageing CSV
res = await page.request.get(`${BASE}/ageing/export?asof=2026-08-31`);
body = await res.text();
check('ageing CSV total row', /Total,,.*2118100\.00,100000\.00,2018100\.00,Dr/.test(body));

// Links from the dashboard and invoice list point at the exports
await go(page, `${BASE}/?asof=2026-08-31`);
check('dashboard ageing export link', (await page.locator('a:has-text("Export ageing CSV")').getAttribute('href')) === '/ageing/export?asof=2026-08-31');

check('no browser errors', errors.length === 0, errors.join(' | ').slice(0, 600));
await browser.close();
