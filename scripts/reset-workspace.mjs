/**
 * Resets the Supabase workspace to the original sample data (brief section 3.2).
 * WARNING: deletes every record you have added to the workspace.
 *
 *   node --env-file=.env.local scripts/reset-workspace.mjs
 *
 * The workspace id is read from the environment and never printed.
 */
const { SUPABASE_URL, SUPABASE_ANON_KEY, AR_WORKSPACE_ID } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !AR_WORKSPACE_ID) {
  console.error('Run with: node --env-file=.env.local scripts/reset-workspace.mjs');
  process.exit(1);
}
const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reset_workspace`, {
  method: 'POST',
  headers: { apikey: SUPABASE_ANON_KEY, 'x-workspace': AR_WORKSPACE_ID, 'Content-Type': 'application/json' },
  body: '{}',
});
if (!res.ok) {
  console.error(`Reset failed (HTTP ${res.status}): ${(await res.text()).replaceAll(AR_WORKSPACE_ID, '[workspace]')}`);
  process.exit(1);
}
console.log('Workspace reset to the sample data.');
