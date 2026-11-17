# Session summary: 17-Nov-2026 (Claude Code)

Steps 1–2 (skeleton, connection) were done in an earlier session. This session covered steps 3–12 of Part 5, one step per commit.

## How the work was run

- The assistant read the whole brief first and reviewed the existing data layer before changing anything.
- Each step was built, then checked with unit tests, a production build, and browser tests that click through the real app (Microsoft Edge, driven by Playwright).
- The workspace was reset to the sample data before every browser test run, so the spot checks could be compared exactly. Resetting was explicitly authorised by the user.
- Secrets were never printed: scripts read `.env.local` through `node --env-file` and mask the workspace id in any error.

## Step by step

| Step | What was built | Checks |
|---|---|---|
| 3 Data layer | Reviewed types and loader against brief §3.3 (all six tables mapped correctly). Added `scripts/snapshot.ts` (strips `workspace_id`, sorts by id), `tests/fixtures/sample.json`, and `lib/ar/map.ts` so the loader and tests share one rupee→paise conversion. | Row counts 8/29/1/17/18/7 match the brief; spot checks 1–2 in the fixture. |
| 4 Calculations | `lib/ar`: positions, buckets, customer positions, R14 check, statement, promises, follow-ups, DSO, GST, due dates, numbering, allocation rules. | All 10 spot checks; `balanceCheck` empty for every day 2026-01-01…10-31. |
| 5 Layout | Header, navigation keeping `?asof=`, date picker defaulting to today in India; money/date/CSV helpers. | Formatting and as-at tests, including 00:00–05:30 IST. |
| 6 Customers | List, page, add, edit, deactivate; zod validation. | Browser: validation, duplicate code, deactivate/reactivate, search, sort. |
| 7 Invoices | List with filters and totals, invoice page, create with live preview, credit note, cancel, disputed. | Browser: preview matches R2–R4, credit-limit warning, credit-note limits, cancel rules. |
| 8 Dashboard | Summary figures, ageing by customer, overdue list, needs attention. | DSO 111 days and totals checked by hand. |
| 9 Payments | Record payment with TDS pre-fill and oldest-first suggestion; allocate unapplied credit; remove allocation; delete receipt. | Browser: TDS 7,500 on 81,000; unapplied credit; corrections; R14 still clean. |
| 10 Notes | Add notes with follow-ups and promises; mark follow-ups done. | Browser: Pending → Broken; both-or-neither rule. |
| 11 Statements | Statement on screen, A4 print, CSV; invoice and ageing CSV. | Spot check 8 on screen and in CSV; printed PDF inspected. |
| 12 Finish | README, TESTING.md, WALKTHROUGH.md, browser tests kept in `tests/e2e`. | Secret scan of browser bundles and repository. |

## Problems found and fixed during the session

- **Next.js 16 Cache Components.** Pages that read "today" must call `connection()` first and declare `instant = false`; found from the dev-server warnings and the bundled Next.js docs.
- **Success messages vanished** when the form that showed them disappeared (e.g. after cancelling an invoice). Actions now return to the page with a confirmation banner (`?done=`).
- **Dropdowns were cleared after a validation error** (React resets forms after an action). Forms now submit through `useActionForm`, which keeps what the user typed.
- **Test expectations corrected, not the code,** where the assistant's own test was wrong: BWA/26-27/0017 is part-paid (₹18,000 left) on 05-Sep, not Paid; BWA/26-27/0010 is outside the 31-Aug DSO window.
- **OneDrive file locks** occasionally blocked `next build` (EPERM on `.next`); deleting the stale build output and rebuilding resolved it.
