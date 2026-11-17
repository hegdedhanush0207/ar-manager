import { BASE, check, go, open, text } from './lib.mjs';

const { browser, page, errors } = await open();
const asof = '2026-08-31';

// Validation: duplicate code, bad email, bad GSTIN, TDS over 100
await go(page, `${BASE}/customers/new?asof=${asof}`);
await page.fill('input[name=code]', 'c001');
await page.fill('input[name=name]', 'E2E Test Traders');
await page.fill('input[name=city]', 'Nashik');
await page.selectOption('select[name=state]', 'Maharashtra');
await page.fill('input[name=contactPerson]', 'Asha Test');
await page.fill('input[name=email]', 'asha@example.com');
await page.fill('input[name=gstin]', '27ABC');
await page.fill('input[name=creditLimit]', '1,50,000');
await page.fill('input[name=tdsRatePct]', '10');
await page.click('button:has-text("Add customer")');
await page.waitForFunction(() => document.body.innerText.includes('Please correct'), null, { timeout: 30000 });
await page.waitForTimeout(800);
let t = await text(page);
check('GSTIN length rejected', t.includes('exactly 15 letters and digits'));
check('form keeps typed values after an error', (await page.inputValue('input[name=name]')) === 'E2E Test Traders');

await page.fill('input[name=gstin]', '27ABCDE1234F1Z5');
await page.click('button:has-text("Add customer")');
await page.waitForFunction(() => document.body.innerText.includes('already used by'), null, { timeout: 30000 });
await page.waitForTimeout(800);
check('duplicate code rejected (case-insensitive)', (await text(page)).includes('Code C001 is already used by Tamhini Foods'));

await page.fill('input[name=code]', 'C009');
await page.click('button:has-text("Add customer")');
await page.waitForURL(/\/customers\/\d+\?asof=/, { timeout: 30000 });
await page.waitForFunction(() => !document.body.innerText.includes('Loading figures'));
t = await text(page);
check('customer created and shown', t.includes('C009 · E2E Test Traders') && t.includes('Active'));
check('GST shown as CGST + SGST for Maharashtra', t.includes('CGST + SGST'));
const custUrl = page.url();

// Edit: change credit days
await page.click('a:has-text("Edit")');
await page.waitForURL(/edit/);
await page.waitForFunction(() => !document.body.innerText.includes('Loading figures'));
check('edit form pre-filled with credit limit 150000.00', (await page.inputValue('input[name=creditLimit]')) === '150000.00');
await page.fill('input[name=creditDays]', '-3');
check('negative credit days blocked by the form', await page.locator('input[name=creditDays]:visible').evaluate((el) => !el.checkValidity()));
await page.fill('input[name=creditDays]', '21');
await page.click('button:has-text("Save changes")');
await page.waitForURL(/\/customers\/\d+\?asof=[^&]*$/, { timeout: 30000 });
await page.waitForFunction(() => !document.body.innerText.includes('Loading figures'));
check('credit days saved', /Credit days 21/.test(await text(page)));

// Deactivate → not offered for new invoices → reactivate
await page.click('button:has-text("Deactivate")');
await page.waitForFunction(() => document.body.innerText.includes('Customer deactivated'), null, { timeout: 30000 });
check('deactivated, New invoice button hidden', !(await page.locator('a:has-text("New invoice")').count()));
await go(page, `${BASE}/customers?asof=${asof}&show=inactive`);
t = await text(page);
check('inactive filter shows C008 and C009 only', t.includes('C008') && t.includes('C009') && !t.includes('C001'));
await go(page, custUrl);
await page.click('button:has-text("Reactivate")');
await page.waitForFunction(() => document.body.innerText.includes('Customer reactivated'), null, { timeout: 30000 });
check('reactivated', (await page.locator('a:has-text("New invoice")').count()) === 1);

// Search and sort
await go(page, `${BASE}/customers?asof=${asof}&q=payables@`);
t = await text(page);
check('search by email finds C002 only', t.includes('C002') && !t.includes('C001 '));
await go(page, `${BASE}/customers?asof=${asof}&sort=overdue&dir=desc`);
const first = (await page.locator('tbody tr').first().innerText()).slice(0, 4);
check('sort by overdue desc puts C007 first (4,72,000)', first === 'C007', first);

check('no browser errors', errors.length === 0, errors.join(' | ').slice(0, 600));
await browser.close();
