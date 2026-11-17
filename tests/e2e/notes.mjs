import { BASE, check, go, open, text } from './lib.mjs';

const { browser, page, errors } = await open();

await go(page, `${BASE}/customers?asof=2026-08-31&q=C002`);
const id = (await page.locator('a:has-text("C002")').first().getAttribute('href')).match(/customers\/(\d+)/)[1];
const url = (d) => `${BASE}/customers/${id}?asof=${d}`;

// Promise with a date but no amount is rejected (both or neither)
await go(page, url('2026-08-31'));
await page.fill('input[name=noteDate]', '2026-08-31');
await page.fill('textarea[name=body]', 'E2E: promised part payment');
await page.fill('input[name=promiseDate]', '2026-09-05');
await page.click('button:has-text("Add note")');
await page.waitForFunction(() => document.body.innerText.includes('Enter the promised amount'), null, { timeout: 30000 });
check('promise date without amount rejected', true);

// Add it properly, with a follow-up
await page.fill('input[name=promiseAmount]', '50000');
await page.fill('input[name=followUpDate]', '2026-09-06');
await page.fill('textarea[name=body]', 'E2E: promised part payment');
await page.click('button:has-text("Add note")');
await page.waitForFunction(() => document.body.innerText.includes('Note added'), null, { timeout: 30000 });
let t = await text(page);
check('note shows on the timeline', t.includes('E2E: promised part payment'));
check('promise Pending as at 31-Aug', /Promise: ₹50,000\.00 by 05-Sep-2026 Pending/.test(t));

await go(page, url('2026-09-10'));
t = await text(page);
check('promise Broken as at 10-Sep (payment came 09-Sep, after the promised date)', /Promise: ₹50,000\.00 by 05-Sep-2026 Broken/.test(t));
check('older C002 promise (20-Jul) Broken; 02-Sep promise Kept', t.includes('₹69,600.00 by 01-Aug-2026 Broken') && t.includes('₹94,400.00 by 10-Sep-2026 Kept'));

// Notes dated after the as-at date are hidden
await go(page, url('2026-08-30'));
check('note dated 31-Aug hidden as at 30-Aug', !(await text(page)).includes('E2E: promised part payment'));

// Follow-ups due on the dashboard, and mark one done
await go(page, `${BASE}/?asof=2026-09-10`);
t = await text(page);
const due = Number(t.match(/Follow-ups due \((\d+)\)/)?.[1]);
check('dashboard follow-ups due as at 10-Sep = 4 (3 sample + E2E)', due === 4, String(due));
check('dashboard broken promises include the E2E one', /Broken promises \(2\)/.test(t), t.match(/Broken promises \(\d+\)/)?.[0]);
await page.locator('button:has-text("Mark follow-up done")').first().click();
await page.waitForFunction(() => document.body.innerText.includes('Follow-up marked as done'), null, { timeout: 30000 });
t = await text(page);
check('follow-ups due drops to 3', /Follow-ups due \(3\)/.test(t), t.match(/Follow-ups due \(\d+\)/)?.[0]);

check('no browser errors', errors.length === 0, errors.join(' | ').slice(0, 600));
await browser.close();
