import { BASE, check, go, open, text } from './lib.mjs';

const { browser, page, errors } = await open();
page.on('dialog', (d) => d.accept()); // accept "Are you sure?" confirmations
const asof = '2026-11-17';

async function customerId(code) {
  await go(page, `${BASE}/customers?asof=${asof}&q=${code}`);
  const href = await page.locator(`a:has-text("${code}")`).first().getAttribute('href');
  return href.match(/customers\/(\d+)/)[1];
}

// --- C001 pays 81,000 for BWA/26-27/0024 (88,500; taxable 75,000; TDS 10%) → TDS pre-filled 7,500
const c001 = await customerId('C001');
await go(page, `${BASE}/receipts/new?asof=${asof}&customer=${c001}`);
await page.fill('input[name=receiptDate]', '2026-11-10');
await page.fill('input[name=bankAmount]', '81000');
check('TDS pre-filled 7,500.00', (await page.inputValue('input[name=tdsAmount]')) === '7500.00');
let t = await text(page);
check('suggested allocation fills 0024 with 88,500', (await page.locator('input[aria-label="Allocate to BWA/26-27/0024"]').inputValue()) === '88500.00');
check('nothing left unapplied', /Remains as unapplied credit ₹0\.00/.test(t));
check('next receipt number shown', t.includes('RCT/26-27/0018'));
await page.fill('input[name=reference]', 'UTR E2E-1');
await page.click('button:has-text("Save payment")');
await page.waitForURL(/done=/, { timeout: 30000 });
await page.waitForFunction(() => !document.body.innerText.includes('Loading figures'));
t = await text(page);
check('saved banner RCT/26-27/0018', t.includes('Payment RCT/26-27/0018 saved'));
check('C001 net balance now 0 (Paid)', /Net balance ₹0\.00/i.test(t));

// --- C006 pays 50,000 with no TDS: 35,400 to 0020, 14,600 unapplied
const c006 = await customerId('C006');
await go(page, `${BASE}/receipts/new?asof=${asof}&customer=${c006}`);
await page.fill('input[name=receiptDate]', '2026-11-11');
await page.fill('input[name=bankAmount]', '50000');
check('C006 TDS pre-filled 0 (rate 0%)', (await page.inputValue('input[name=tdsAmount]')) === '0.00');
t = await text(page);
check('unapplied 14,600 previewed', t.includes('Remains as unapplied credit ₹14,600.00'));
// Over-allocating is blocked in the form
await page.fill('input[aria-label="Allocate to BWA/26-27/0020"]', '60000');
check('over-allocation disables save', await page.locator('button:has-text("Save payment")').isDisabled());
await page.click('button:has-text("Re-suggest oldest first")');
check('re-suggest restores 35,400', (await page.locator('input[aria-label="Allocate to BWA/26-27/0020"]').inputValue()) === '35400.00');
await page.click('button:has-text("Save payment")');
await page.waitForURL(/done=/, { timeout: 30000 });
await page.waitForFunction(() => !document.body.innerText.includes('Loading figures'));
t = await text(page);
check('C006 unapplied 14,600 and net 14,600 Cr', t.includes('Unapplied credit ₹14,600.00') && t.includes('₹14,600.00 Cr'));

// --- Remove the allocation: 50,000 unapplied, invoice back to outstanding
await page.locator('form:has(input[name=id]) button:has-text("remove")').first().click();
await page.waitForFunction(() => document.body.innerText.includes('delete receipt'), null, { timeout: 30000 });
t = await text(page);
check('after removal: unapplied 50,000', t.includes('Unapplied credit ₹50,000.00'));

// --- Allocate unapplied credit from the customer page
await page.fill('form:has(select[name=receiptId]) input[name=amount]', '35400');
await page.fill('form:has(select[name=receiptId]) input[name=allocationDate]', '2026-11-12');
await page.click('button:has-text("Allocate")');
await page.waitForFunction(() => document.body.innerText.includes('remains unapplied'), null, { timeout: 30000 });
t = await text(page);
check('allocated 35,400, 14,600 remains', t.includes('Allocated ₹35,400.00') && t.includes('₹14,600.00 of it remains unapplied'));

// --- A receipt with no allocations can be deleted: record an advance, then delete it
await go(page, `${BASE}/receipts/new?asof=${asof}&customer=${c006}`);
await page.fill('input[name=receiptDate]', '2026-11-13');
await page.fill('input[name=bankAmount]', '1000');
await page.click('button:has-text("Re-suggest oldest first")').catch(() => {});
// clear any suggested allocation so it is a pure advance
for (const input of await page.locator('input[aria-label^="Allocate to"]').all()) await input.fill('');
await page.click('button:has-text("Save payment")');
await page.waitForURL(/done=Payment/, { timeout: 30000 });
await page.waitForFunction(() => !document.body.innerText.includes('Loading figures'));
const before = (await text(page)).match(/RCT\/26-27\/\d{4}/g)?.length ?? 0;
await page.locator('button:has-text("delete receipt")').first().click();
await page.waitForFunction((n) => (document.body.innerText.match(/RCT\/26-27\/\d{4}/g)?.length ?? 0) < n, before, { timeout: 30000 });
check('receipt without allocations deleted', true);

// --- Control check still clean on the dashboard
await go(page, `${BASE}/?asof=${asof}`);
check('dashboard control check clean', (await text(page)).includes('every customer balance agrees'));
check('no browser errors', errors.length === 0, errors.join(' | ').slice(0, 600));
await browser.close();
