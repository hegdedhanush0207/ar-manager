# AR Manager — Brightwater Advisory Pvt. Ltd.

An accounts receivable manager for a services firm: who owes the firm money, how late each payment is, and what to do about it. Every figure is calculated from the source documents and is correct to the paisa **as at any date the user picks**.

- **Live:** https://ar-manager-nine.vercel.app
- **Brief:** [docs/BRIEF.md](docs/BRIEF.md) (the business rules R1–R18 are in Part 1)
- **Manual test script:** [docs/TESTING.md](docs/TESTING.md)
- **How it is built (walkthrough):** [docs/WALKTHROUGH.md](docs/WALKTHROUGH.md)

## What it does

| Area | Screens |
|---|---|
| **Overdue at a glance** (`/`) | Total outstanding, unapplied credit, net receivable, overdue amount and share, overdue count and DSO; ageing by customer with a totals row and click-through to the invoices in each bucket; overdue invoices in red, longest first, with the disputed label; *needs attention*: over-limit customers, broken promises, follow-ups due and unapplied credit. The R14 control check result is shown at the foot of the page. |
| **Customers** (`/customers`, `/customers/new`, `/customers/[id]`, `/customers/[id]/edit`) | List with balance, overdue and % of limit used as at the date; search, active/inactive filter and sorting on every column. Add and edit with validation. Deactivate and reactivate. Customer page: profile, balance with a one-line ageing breakdown, over-limit warning, invoices, receipts with unapplied credit, notes timeline, and actions (new invoice, record payment, statement, add note, allocate unapplied credit, remove an allocation, delete a receipt with no allocations). |
| **Invoices** (`/invoices`, `/invoices/new`, `/invoices/[id]`) | List as at the date with received, credited, outstanding, status, days late and the part-paid and disputed labels; filters (customer, status including Cancelled, disputed, date range, number), sorting and a totals row; CSV export. Create with a live preview of the GST split, total, due date, next number and the credit-limit warning. Invoice page: tax breakdown, allocations, credit notes, notes, outstanding as at the date; raise a credit note, set or clear the disputed flag, cancel. |
| **Record a payment** (`/receipts/new`) | Bank amount, TDS (pre-filled from the customer's rate on the taxable value), mode and reference; open invoices with an editable oldest-first suggestion; the amount that will stay unapplied. The receipt and its allocations are saved together. |
| **Statement** (`/statement?customer=…&from=…&to=…`) | Opening balance, every invoice, credit note, payment and TDS line with a running balance, closing balance, ageing footer and unapplied credit. Clean A4 print layout and CSV export. |
| **CSV exports** | Statement (`/statement/export`), invoice list with the current filters (`/invoices/export`), ageing report (`/ageing/export`). |

An **as-at date picker** in the header (default: today in India) applies to every screen and is kept in the URL (`?asof=2026-08-31`), so any view can be bookmarked or shared.

## How it is built

```
Browser ──► Next.js on Vercel (server components + server actions) ──► Supabase (shared, fixed schema)
             • app/        screens: display only, never calculate
             • lib/ar/     every financial calculation, in whole paise (pure functions, unit-tested)
             • lib/actions server actions: validate (zod) → check rules (lib/ar) → write → refresh
             • lib/db.ts   the only Supabase client (server-only; the workspace id never reaches the browser)
```

- **One calculation module.** [lib/ar/](lib/ar/) implements R2–R17 as plain functions. The dashboard, customer page, invoice list and statement all call the same functions, so their figures cannot disagree.
- **Whole paise.** Amounts are converted from rupees to integer paise once, when they are loaded ([lib/ar/map.ts](lib/ar/map.ts)), and back only to display or save them.
- **Load everything, calculate in memory.** The data set is small, so each request loads all six tables ([lib/ar/load.ts](lib/ar/load.ts)) and calculates the position as at the chosen date. Nothing is stored as a running balance.
- **As-at rule.** A record exists on date D only if its own date is on or before D. Dates stay as `'YYYY-MM-DD'` strings, which compare correctly as text, and day counts use `Date.UTC`, so the server's time zone never matters.

## Running it

You need Node.js (current LTS or later) and the three environment variables from the brief, in a file named `.env.local` in the project root. **Never commit this file**; `.gitignore` already excludes it, and none of the names start with `NEXT_PUBLIC_`, so they stay on the server.

```dotenv
SUPABASE_URL=…
SUPABASE_ANON_KEY=…
AR_WORKSPACE_ID=…
```

```bash
npm install
npm run dev          # http://localhost:3000
```

On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution is blocked.

On Vercel, add the same three variables under *Settings → Environment Variables* and redeploy.

## Tests

```bash
npm test             # unit tests (Vitest): 65 tests, offline, about a second
npm run test:e2e     # browser tests against the running app — RESETS THE WORKSPACE (see below)
```

**Unit tests** ([tests/](tests/)) run against a fixed snapshot of the sample data, [tests/fixtures/sample.json](tests/fixtures/sample.json), so they need no network and are not affected by records added while testing:

- all ten published spot checks ([tests/spot-checks.test.ts](tests/spot-checks.test.ts));
- the R14 control check (`balanceCheck` is empty) **for every day from 2026-01-01 to 2026-10-31**, and again after adding a part-payment with TDS and a credit note;
- every statement's closing balance equals `balanceByDocuments` at its To date, for every customer and several periods;
- bucket boundaries, `gstSplit` (including halves rounding up), `dueDate`, `fyLabel`/`nextNumber` (including the 1 April restart and cancelled numbers), promises, follow-ups, DSO, the allocation rules and the expected-TDS pre-fill;
- money and date formatting, Dr/Cr, CSV quoting and BOM, `asof` parsing and the default to today in India (including the 00:00–05:30 IST case).

**Browser tests** ([tests/e2e/](tests/e2e/)) drive Microsoft Edge (or Chrome with `E2E_BROWSER=chrome`) through the main journeys: customers, invoices and credit notes, payments and allocations, notes and promises, statements, printing and CSV exports (76 checks). Start `npm run dev` first. **They reset the workspace to the sample data before each suite and at the end**, deleting anything you have added.

**Refreshing the fixture.** Reset the workspace, then save a new snapshot:

```bash
npm run reset-workspace   # deletes everything you added and reloads the sample data
npm run snapshot          # writes tests/fixtures/sample.json (without workspace_id)
```

## Assumptions

Where the brief left room for interpretation, these are the decisions made:

1. **Zero balances** are shown as `₹0.00` with no Dr/Cr suffix.
2. **DSO** shows "—" when S = 0, and also when S is negative (credit notes in the window exceeding sales), where a DSO has no meaning.
3. **Follow-ups due** as at D include only notes dated on or before D (R10), with `follow_up_date ≤ D` and not done.
4. **Promise kept** compares the customer's receipts (settlement values) dated from the note date to the earlier of the promise date and D, as R16 says; it does not look at which invoices they were allocated to. A promise is not Broken on its promise date itself, only after it.
5. **Allocation and credit limits are "all time".** When adding an allocation or credit note, what is left on an invoice or a receipt counts every existing record, whatever its date, because the database enforces R6/R7 over all records.
6. **Allocations made while recording a payment** take the receipt date as their allocation date. Allocations of unapplied credit made later have their own date (default today, never before the receipt or invoice date).
7. **Expected TDS pre-fill:** working oldest first, the bank amount is grossed up by the customer's TDS rate applied to each invoice's taxable share (taxable ÷ total). This reproduces the sample receipts (e.g. ₹81,000 bank → ₹7,500 TDS on BWA/26-27/0001). The user can always overwrite it with what was actually deducted.
8. **Credit-limit warning (R9)** compares the customer's balance (by documents) as at the later of the invoice date and today, plus the new invoice total, with the limit. It warns but never blocks.
9. **Credit notes** cannot be dated before their invoice, and use the invoice's split: IGST if the invoice charged IGST, otherwise CGST + SGST.
10. **States** are chosen from a fixed list of Indian states and union territories, so a typo cannot change the GST treatment. `Maharashtra` decides CGST + SGST.
11. **Customer codes** are stored in capitals and must be unique regardless of case.
12. **Customers are never deleted.** The database refuses it and R9 only allows deactivation. Inactive customers can still receive payments and notes, but not invoices.
13. **The invoice list** includes cancelled invoices (status Cancelled, amounts shown struck through) but leaves them out of the totals row and every other figure. "Days late" is shown only for overdue invoices.
14. **The ageing table and CSV** list customers with an outstanding balance or unapplied credit; the totals cover all customers.
15. **Limit used %** is the net balance divided by the credit limit ("—" when the limit is zero). **Overdue %** on the dashboard is overdue divided by total invoice outstanding (before unapplied credit).
16. **The statement** defaults to the start of the financial year containing the as-at date, up to the as-at date. Credit-note lines are described as "Credit note against <invoice>: <reason>".
17. **CSV files** show dates as `31-Aug-2026` (as on screen) and balances as a positive amount with a separate Dr/Cr column.
18. **After recording a payment** dated after the current as-at date, the customer page opens as at the receipt date, so the new receipt is visible.

## Known gaps

- **Editing an invoice's description** (allowed by R3) is not offered; Part 2 does not ask for it. Receipts cannot be edited either: remove the allocations, delete the receipt and record it again.
- **No pagination.** All six tables are loaded on each request, as the brief recommends for this data size. Supabase returns at most 1,000 rows per request by default, which would need paging if the data grew.
- **Concurrent saves.** If two tabs take the same document number at the same moment, the save works the number out again and retries once (brief section 4.8). It is not a full transaction.
- **Dev-only dependency advisories.** `npm audit` reports advisories in Vitest 3 and its helpers. They affect only the local test runner, not the deployed app; the fix is a major upgrade to Vitest 5.
- **Browser tests** are not part of `npm test`, because they need a running app and reset the workspace.

## What I would do next

- Add an "edit description" action on the invoice page, and a simple receipt edit (delete-and-re-record in one step).
- Add Vitest tests for the server actions with a mocked database client, and run the browser tests in CI against a preview deployment.
- Upgrade Vitest to clear the dev-only advisories.
- Add a customer-level promise and follow-up report, and email-ready statement PDFs (out of scope here).

## Project structure

```
app/                       screens (server components) and CSV route handlers
  page.tsx                 Overdue at a glance
  customers/ invoices/ receipts/new/ statement/
  */export/route.ts        CSV downloads
components/                display pieces and client-side forms
lib/
  ar/                      the calculation module (types, loader, R2–R17)
  actions/                 server actions: customers, invoices, receipts, notes
  db.ts                    the Supabase client (server only)
  asof.ts, format.ts       as-at date; money, dates, Dr/Cr, CSV
  exports.ts               CSV layouts
scripts/                   snapshot.ts (fixture), reset-workspace.mjs
tests/                     unit tests, fixtures/sample.json, e2e/ browser tests
docs/                      BRIEF.md, TESTING.md, WALKTHROUGH.md
ai-logs/                   AI assistant conversation logs
```
