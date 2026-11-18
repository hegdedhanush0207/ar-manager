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

## After the build (17–18 Nov 2026)

The session continued with reviews, corrections and Phase 2.

| Request | Outcome |
|---|---|
| Investigate why RCT/26-27/0002 was allocated to BWA/25-26/0156 rather than the older 0141 | Not a breach of R6: oldest-first is only the suggested default, which the user can change. The ₹9,000 TDS is exactly 10% of 0156's taxable value, so the customer paid 0156. The app's suggestion and override were confirmed by simulation. No change made. |
| Does the app calculate TDS? | The actual TDS is stored on each receipt; the app only pre-fills an estimate on the payment form (`expectedTds`). |
| Statement TDS wording | Changed from the brief's "TDS deducted by you" to **"TDS deducted by customer"** at the user's request; recorded under README Assumptions. |
| Ageing at exactly 90 days; when counting starts | Explained: 90 days is in 61–90; days are counted from the day after the due date (an invoice is still Due on its due date). |
| Basis of the TDS pre-fill (₹9,259.26 on ₹1,00,000) | Explained the gross-up: TDS = bank × 10 ÷ 108 for 18% GST and 10% TDS. |
| Customer form hint "these days" | Changed to "Due date = invoice date + credit days". |
| Editable GST rate | Explained the tension between R3 (18%) and Part 2 (enter the rate); left unchanged at the user's request. |
| Full arithmetic recheck of Phase 1 | An independent re-implementation (own calendar and rounding) agreed with the app on every figure for every day, Oct-2025 to Jun-2027, and with the live site's CSV exports (930 checks); planted bugs were all caught. |
| **Phase 2: Insights tab** | New `/insights` page with its own module (`lib/insights`): customer metrics (outstanding AR, payment frequency, invoice frequency, average collection period, N/A rules, sortable) and the Historical AR trend chart (month/week-end balances, period filters, % change). Phase 1 untouched except one navigation entry. Documented in `docs/PHASE2.md` with the decisions taken. |
| Chart axis correction | Time on the X axis, amount in ₹ lakh (2-lakh steps) on the Y axis. |
| Chart improvements | Customer picker inside the chart box with instant redraw (no Apply), several customers plus consolidated as separate lines (validated colour palette, legend, up to 7 customers), labels like "Dec '25", chart box sized to the chart with headline figures kept top right. |
| Phase 2 arithmetic recheck | 1,228,593 comparisons against an independent calculation (sample data, live data and 200 random datasets with edge cases), plus 4,236 figures on the live page: 0 differences; six planted bugs all caught. |
| User guide | `docs/USER_GUIDE.md` for analysts and managers, covering every screen including Insights. |
| Report for the user | A short plain-English explanation of how the tool was built and verified (given in the conversation). |

### Problems found and fixed in this part

- Tooltip positioning on the chart (too far from its point, then covering it, then clipped at the edge); finally kept inside the chart and beside the hovered points, tested at every month.
- A chart box width that could leave empty space after changing the number of lines; the chart now sizes its own box.
- Test-script slips (escaping, selectors, timing) were fixed in the tests, not by changing correct app behaviour; each was confirmed against the independent figures first.
