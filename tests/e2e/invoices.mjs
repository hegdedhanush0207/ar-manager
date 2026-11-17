import { BASE, check, go, open, text } from './lib.mjs';

const { browser, page, errors } = await open();
const asof = '2026-11-17';

// --- Create invoice with live preview and credit-limit warning (C006: limit 1,00,000; balance 35,400)
await go(page, `${BASE}/invoices/new?asof=${asof}`);
await page.selectOption('select[name=customerId]', { label: 'C006 · Mulshi Agro Producers' });
await page.fill('input[name=invoiceDate]', '2026-09-18');
await page.fill('input[name=description]', 'E2E test: bookkeeping, Aug');
await page.fill('input[name=taxableValue]', '60000');
await page.waitForFunction(() => document.body.innerText.includes('Invoice number'), null, { timeout: 30000 });
let t = await text(page);
check('preview number BWA/26-27/0025', t.includes('BWA/26-27/0025'));
check('preview CGST 5,400 + SGST 5,400', (t.match(/₹5,400\.00/g) ?? []).length >= 2);
check('preview total 70,800', t.includes('₹70,800.00'));
check('preview due 03-Oct-2026 (15 days)', t.includes('03-Oct-2026'));
check('credit-limit warning shown', /above its credit limit/.test(t), t.match(/This invoice takes[^.]*\./)?.[0]);

await page.click('button:has-text("Save invoice")');
await page.waitForURL(/\/invoices\/\d+\?asof=/, { timeout: 30000 });
t = await text(page);
check('saved and redirected to invoice page', t.includes('BWA/26-27/0025') && t.includes('Mulshi'));
check('status Overdue as at 17-Nov (due 03-Oct)', t.includes('Overdue'));
const invoiceUrl = page.url();

// --- Credit note: taxable 1,000 → total 1,180
await page.fill('input[name=taxableValue]', '1000');
await page.fill('input[name=reason]', 'E2E test credit');
t = await text(page);
check('credit note preview total 1,180', t.includes('₹1,180.00'));
await page.click('button:has-text("Raise credit note")');
await page.waitForFunction(() => document.body.innerText.includes('₹1,180.00 saved'), null, { timeout: 30000 });
t = await text(page);
check('credit note saved with number BWA/CN/26-27/002', t.includes('BWA/CN/26-27/002'));
check('credited 1,180 and outstanding 69,620', t.includes('₹69,620.00'));

// --- Credit note too large is caught before the database
await page.fill('input[name=taxableValue]', '60000');
await page.fill('input[name=reason]', 'too big');
await page.click('button:has-text("Raise credit note")');
await page.waitForFunction(() => document.body.innerText.includes('left after payments'), null, { timeout: 30000 });
check('oversized credit note rejected in plain language', true);

// --- Cancel is blocked because a credit note exists
await go(page, invoiceUrl);
t = await text(page);
check('cancel blocked after credit note', t.includes('Cannot cancel') && t.includes('credit note'));

// --- Disputed flag
await page.click('button:has-text("Mark as disputed")');
await page.waitForFunction(() => document.body.innerText.includes('Clear disputed flag'), null, { timeout: 30000 });
check('disputed flag set', (await text(page)).includes('Disputed'));

// --- Create a second invoice and cancel it
await go(page, `${BASE}/invoices/new?asof=${asof}`);
await page.selectOption('select[name=customerId]', { label: 'C006 · Mulshi Agro Producers' });
await page.fill('input[name=invoiceDate]', '2026-09-19');
await page.fill('input[name=description]', 'E2E test: raised in error');
await page.fill('input[name=taxableValue]', '100');
await page.waitForFunction(() => document.body.innerText.includes('BWA/26-27/0026'), null, { timeout: 30000 });
await page.click('button:has-text("Save invoice")');
await page.waitForURL(/\/invoices\/\d+\?asof=/, { timeout: 30000 });
await page.click('button:has-text("Cancel invoice")');
await page.click('button:has-text("Yes, cancel it")');
await page.waitForFunction(() => document.body.innerText.includes('keeps its number'), null, { timeout: 30000 });
await page.reload();
await page.waitForFunction(() => !document.body.innerText.includes('Loading figures'));
t = await text(page);
check('cancelled invoice shows Cancelled', t.includes('Cancelled'));

// --- Inactive customer is not offered
await go(page, `${BASE}/invoices/new?asof=${asof}`);
const options = await page.locator('select[name=customerId] option').allInnerTexts();
check('inactive C008 not offered for new invoices', !options.some((o) => o.startsWith('C008')));

// --- Invoice list filters and totals
await go(page, `${BASE}/invoices?asof=2026-08-31&status=Overdue&sort=late&dir=desc`);
t = await text(page);
check('overdue filter sorted by days late: first is BWA/25-26/0141', /Days late.*?BWA\/25-26\/0141/.test(t));
await go(page, `${BASE}/invoices?asof=${asof}&status=Cancelled`);
t = await text(page);
check('Cancelled filter lists 0014 and 0026', t.includes('BWA/26-27/0014') && t.includes('BWA/26-27/0026'));
check('cancelled not in totals', t.includes('0 invoice(s)'));

check('no browser errors', errors.length === 0, errors.join(' | '));
await browser.close();
