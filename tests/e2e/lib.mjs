/**
 * Shared helpers for the browser (end-to-end) tests. They drive a real browser
 * (Microsoft Edge by default; set E2E_BROWSER=chrome to use Chrome) against the
 * running app at BASE (default http://localhost:3000).
 */
import { chromium } from 'playwright-core';

export const BASE = process.env.BASE ?? 'http://localhost:3000';

export async function open() {
  const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? 'msedge', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  return { browser, page, errors };
}

export const text = async (page) => (await page.locator('main').innerText()).replace(/\s+/g, ' ');

export function check(label, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}

/** Go to a URL and wait until the page's figures have loaded. */
export async function go(page, url) {
  await page.goto(url);
  await page.waitForFunction(() => !document.body.innerText.includes('Loading figures'), null, { timeout: 60000 });
}
