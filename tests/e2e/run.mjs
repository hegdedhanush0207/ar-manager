/**
 * Runs every browser test suite, resetting the workspace to the sample data
 * before each one (the suites expect the sample data and add test records).
 *
 * WARNING: this deletes anything you have added to your workspace.
 * Start the app first (npm run dev), then:  npm run test:e2e
 */
import { spawnSync } from 'node:child_process';

const SUITES = ['customers', 'invoices', 'payments', 'notes', 'statement'];
let failed = 0;
for (const suite of SUITES) {
  const reset = spawnSync(process.execPath, ['scripts/reset-workspace.mjs'], { stdio: 'inherit', env: process.env });
  if (reset.status !== 0) process.exit(1);
  console.log(`\n=== ${suite} ===`);
  const run = spawnSync(process.execPath, [`tests/e2e/${suite}.mjs`], { stdio: 'inherit', env: process.env });
  if (run.status !== 0) failed++;
}
spawnSync(process.execPath, ['scripts/reset-workspace.mjs'], { stdio: 'inherit', env: process.env });
console.log(failed ? `\n${failed} suite(s) had failures.` : '\nAll browser suites passed. The workspace has been reset to the sample data.');
process.exit(failed ? 1 : 0);
