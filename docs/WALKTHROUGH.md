# Walkthrough: how the AR Manager is built

A guide for explaining the tool and changing it live. Read it alongside the code; every file named here is a link.

## 1. The big picture

```
 Browser ──► Next.js (on Vercel) ───────────────────────────────► Supabase (shared database)
             app/        the screens (they only display)            six tables, your workspace only
             lib/ar/     every calculation (plain functions, paise)  rejects data that would corrupt it
             lib/actions saving: validate → check rules → write      calculates nothing
             lib/db.ts   the one database connection (server only)
```

Three ideas carry the whole design:

1. **Figures are never stored; they are worked out.** The database holds documents (customers, invoices, credit notes, receipts, allocations, notes). Every balance, status and ageing figure is calculated from them each time a page loads. That is what makes the as-at date possible: the same documents give the position on any date.
2. **All the accounting lives in one place:** [lib/ar/](../lib/ar/). Screens call these functions and display the result. If two screens show the same figure, they got it from the same function.
3. **Money is whole paise.** ₹88,500.00 is held as `8850000`. Whole numbers add exactly; rupee decimals do not (`0.1 + 0.2` is `0.30000000000000004` in JavaScript).

## 2. What happens when a page loads

Take the customer page, [app/customers/[id]/page.tsx](../app/customers/[id]/page.tsx):

1. **Read the as-at date** from the URL (`?asof=2026-08-31`), or use today in India: [lib/page.ts](../lib/page.ts) → [lib/asof.ts](../lib/asof.ts).
2. **Load all six tables**: [lib/ar/load.ts](../lib/ar/load.ts). The rows arrive with rupee amounts and database names (`taxable_value`); [lib/ar/map.ts](../lib/ar/map.ts) turns them into app records (`taxableValue`) in paise. This conversion happens once, here.
3. **Calculate** with `lib/ar`: `customerPosition(data, id, asof)`, `invoiceRows(data, asof)` and so on.
4. **Display** the results with formatting from [lib/format.ts](../lib/format.ts) (`₹1,23,456.00`, `31-Aug-2026`, Dr/Cr).

This all happens **on the server**. The browser receives finished HTML; it never talks to the database, so the workspace id never leaves the server ([lib/db.ts](../lib/db.ts) starts with `import 'server-only'`, which makes the build fail if browser code ever imports it).

## 3. The as-at date (R10)

Every record has a date, and on date D a record "exists" only if its date is on or before D:

```ts
if (a.allocationDate <= asOf) …   // dates are 'YYYY-MM-DD' strings, which sort correctly as text
```

So as at 31-Aug-2026, BWA/26-27/0017 is unpaid, even though the receipt (RCT/26-27/0011) is dated 10-Jul: the *allocation* to the invoice is dated 05-Sep. Until then the ₹1,00,000 sits as **unapplied credit** on C005 (spot check 5).

Day counts use `Date.UTC` ([lib/ar/dates.ts](../lib/ar/dates.ts)), never local time, so the server's time zone (Vercel runs in UTC) cannot shift a date. "Today" is worked out for Asia/Kolkata.

## 4. Where each rule lives

| Rule | Function | File |
|---|---|---|
| R2 due date | `dueDate` | [lib/ar/tax.ts](../lib/ar/tax.ts) |
| R3 GST split, halves up | `gstSplit`, `divideRoundHalfUp` | [lib/ar/tax.ts](../lib/ar/tax.ts) |
| R4 numbering | `fyLabel`, `nextNumber` | [lib/ar/numbering.ts](../lib/ar/numbering.ts) |
| R5 TDS counts as payment | `settlementValue`, `expectedTds` | [lib/ar/positions.ts](../lib/ar/positions.ts), [lib/ar/rules.ts](../lib/ar/rules.ts) |
| R6 allocation rules, oldest-first | `allocationProblems`, `openInvoicesFor`, `suggestAllocations` | [lib/ar/rules.ts](../lib/ar/rules.ts) |
| R7 credit-note GST | `creditNoteGst` | [lib/ar/tax.ts](../lib/ar/tax.ts) |
| R8 cancellation | `cancelProblem`; cancelled invoices skipped in `invoicePositions` | [lib/ar/rules.ts](../lib/ar/rules.ts), [lib/ar/positions.ts](../lib/ar/positions.ts) |
| R9 inactive / credit limit | `creditLimitWarning`; inactive customers filtered out of the invoice form | [lib/ar/rules.ts](../lib/ar/rules.ts) |
| R11 invoice position, R12 buckets | `invoicePositions`, `bucketFor` | [lib/ar/positions.ts](../lib/ar/positions.ts) |
| R13 customer position | `customerPositions` | [lib/ar/positions.ts](../lib/ar/positions.ts) |
| R14 control check | `balanceByDocuments`, `balanceCheck` | [lib/ar/positions.ts](../lib/ar/positions.ts) |
| R15 statement | `statement` | [lib/ar/statement.ts](../lib/ar/statement.ts) |
| R16 follow-ups, promises | `followUpsDue`, `promiseStatuses` | [lib/ar/notes.ts](../lib/ar/notes.ts) |
| R17 DSO | `dso`, `dsoDetail` | [lib/ar/dso.ts](../lib/ar/dso.ts) |
| R18 formats | `formatMoney`, `formatBalance`, `formatDate` | [lib/format.ts](../lib/format.ts) |

### The core calculation, in accounting terms

`invoicePositions` (R11):

```
received    = allocations to this invoice dated ≤ D
credited    = credit notes against it dated ≤ D
outstanding = total − received − credited
days past due = D − due date            (Overdue from day 1; still "Due" on the due date)
```

`customerPositions` (R13) adds those up per customer and puts each outstanding amount into its ageing bucket. **Unapplied credit** is receipts (bank + TDS) dated ≤ D, less the allocations from them dated ≤ D. **Net balance** = outstanding − unapplied credit. Unapplied credit is shown in its own column, never netted off against the oldest bucket.

### The control check (R14), the tool's own reconciliation

`balanceByDocuments` works the balance out a second, independent way, straight from the documents:

```
Σ invoices (not cancelled) − Σ credit notes − Σ receipts (bank + TDS), all dated ≤ D
```

`balanceCheck` compares the two for every customer. The tests run it for **every day from 1-Jan to 31-Oct-2026**; the dashboard runs it on every load. If allocations, credit notes or dates were ever mishandled, the two methods would disagree.

## 5. What happens when the user saves

Every form posts to a **server action** in [lib/actions/](../lib/actions/), which follows four steps (brief section 4.8). Recording a payment, [lib/actions/receipts.ts](../lib/actions/receipts.ts) `recordPayment`:

1. **Validate the input** with zod: a real date, amounts in rupees with up to 2 decimals (converted to paise here), a known mode.
2. **Check the business rules** with `lib/ar` *before* touching the database: `allocationProblems` refuses allocations to another customer's or a cancelled invoice, more than the invoice has left, more than the receipt's settlement value, or dated before the receipt or invoice.
3. **Write**: insert the receipt and get its id back, then insert all its allocations in one go. If the allocations are rejected, the receipt is deleted again, so nothing half-saved remains (the database has no transactions across requests).
4. **Refresh** the pages (`revalidatePath`) and go back with a confirmation message.

The database also checks most of these rules. It is the safety net, not the validation: the tool catches problems first and explains them in plain language ([lib/actions/shared.ts](../lib/actions/shared.ts) `friendlyDbError` translates any database message that gets through).

## 6. Tests

- [tests/fixtures/sample.json](../tests/fixtures/sample.json) is a frozen copy of the sample data, made by [scripts/snapshot.ts](../scripts/snapshot.ts). Tests use it, so they run offline and do not change when you add test records.
- [tests/spot-checks.test.ts](../tests/spot-checks.test.ts): the brief's ten spot checks, one test each.
- [tests/calculations.test.ts](../tests/calculations.test.ts): the R14 check for every day, statement closings, bucket boundaries, GST rounding, numbering, promises, DSO, allocation rules.
- [tests/e2e/](../tests/e2e/): browser tests that click through the real app.

## 7. Making a live change: worked examples

**Run the tests after any change:** `npm.cmd test`. Run `npm.cmd run build` before pushing.

### a) Change an ageing bucket (e.g. split "91–180" into "91–120" and "121–180")

1. In [lib/ar/positions.ts](../lib/ar/positions.ts), edit the `Bucket` type, the `BUCKETS` list, `emptyBuckets()` and `bucketFor()`.
2. Every screen and CSV loops over `BUCKETS`, so the dashboard, customer page, statement footer and exports pick it up automatically.
3. Update the bucket-boundary test in [tests/calculations.test.ts](../tests/calculations.test.ts) and run `npm.cmd test`.

### b) Change the DSO window from 90 to 60 days

In [lib/ar/dso.ts](../lib/ar/dso.ts), change `addDays(asOf, -89)` to `-59` and `* 90` to `* 60`. Update the DSO test's expected window. The dashboard shows the window it used.

### c) Add a column to the customer list (e.g. TDS rate)

In [app/customers/page.tsx](../app/customers/page.tsx): add `tds: (p) => p.customer.tdsRatePct` to `SORT`, a `<SortTh label="TDS %" col="tds" …/>` header, and a `<Td numeric>{p.customer.tdsRatePct}%</Td>` cell. No calculation is needed; it is a stored field.

### d) Show a new figure, e.g. "amount due in the next 7 days"

Calculations belong in `lib/ar`, not in the screen:

1. Add a function to [lib/ar/positions.ts](../lib/ar/positions.ts), for example one that sums `outstanding` for invoices with `0 ≥ daysPastDue > −7`.
2. Add a test for it with a known answer from the sample data.
3. Display it with a `<Stat>` on [app/page.tsx](../app/page.tsx).

### e) Change a validation rule, e.g. require a phone number

In [lib/actions/customers.ts](../lib/actions/customers.ts), change `phone: optionalText(30)` to `phone: requiredText('Phone', 30)`, and add `*` to the label in [components/CustomerForm.tsx](../components/CustomerForm.tsx).

## 8. Questions you may be asked

- **Why not store an "amount paid" on the invoice?** It could only be right for one date. With the as-at rule the same invoice can be Due on 31-Aug, Overdue on 6-Sep and Paid on 15-Sep (spot check 4). Calculating from the documents gives the right answer for every date, and the R14 check proves it.
- **Why paise?** Integer arithmetic is exact. The conversion happens once in the loader and once when saving (`toRupees`).
- **Why is TDS part of the settlement?** The customer has paid the TDS to the government on Brightwater's behalf; it settles the invoice just like cash (R5). On the statement it is a separate credit line, "TDS deducted by customer" (the brief suggests "TDS deducted by you"; see README, Assumptions).
- **Why is unapplied credit not netted against the oldest bucket?** It has not been matched to any invoice yet; netting it would misstate the ageing. It is shown separately and reduces the net balance.
- **How does the tool stop over-allocation?** Three layers: the payment form shows the running total and disables Save; the server action checks with `allocationProblems`; and the database refuses it as a last resort.
- **Where would a bug in a figure show up?** In the tests first: the spot checks pin known answers, and the every-day R14 loop catches any disagreement between the two ways of computing a balance.
