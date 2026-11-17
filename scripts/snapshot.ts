/**
 * Saves the six AR tables from the Supabase workspace to tests/fixtures/sample.json.
 *
 * Run (after resetting the workspace, brief section 3.2):
 *   node --env-file=.env.local scripts/snapshot.ts
 *
 * The rows are saved exactly as the database returns them (rupees, snake_case),
 * so the tests also exercise the rupee-to-paise conversion in lib/ar/map.ts.
 *
 * This script does not import lib/db.ts: that file is marked 'server-only' and
 * uses the '@/' path alias, and neither works outside Next.js.
 */
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';

const TABLES = [
  'customers',
  'invoices',
  'credit_notes',
  'receipts',
  'allocations',
  'notes',
] as const;

// Columns that are not business data. workspace_id is private and must never be committed.
const DROPPED_COLUMNS = ['workspace_id', 'created_at'];

const OUTPUT = 'tests/fixtures/sample.json';

async function main() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, AR_WORKSPACE_ID } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !AR_WORKSPACE_ID) {
    throw new Error(
      'SUPABASE_URL, SUPABASE_ANON_KEY and AR_WORKSPACE_ID must be set. ' +
        'Run with: node --env-file=.env.local scripts/snapshot.ts',
    );
  }

  const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { 'x-workspace': AR_WORKSPACE_ID } },
  });

  const snapshot: Record<string, Record<string, unknown>[]> = {};

  for (const table of TABLES) {
    const { data, error } = await db.from(table).select('*').order('id');
    if (error) throw new Error(`Could not read ${table}: ${error.message}`);

    snapshot[table] = data.map((row: Record<string, unknown>) => {
      const clean = { ...row };
      for (const column of DROPPED_COLUMNS) delete clean[column];
      return clean;
    });
  }

  const json = JSON.stringify(snapshot, null, 2) + '\n';
  if (json.includes(AR_WORKSPACE_ID)) {
    throw new Error('Safety check failed: the workspace id appears in the snapshot. Nothing was written.');
  }

  mkdirSync('tests/fixtures', { recursive: true });
  writeFileSync(OUTPUT, json);

  console.log(`Wrote ${OUTPUT}`);
  for (const table of TABLES) console.log(`  ${table.padEnd(13)} ${snapshot[table].length} rows`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
