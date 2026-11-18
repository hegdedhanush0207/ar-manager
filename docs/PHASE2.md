# Phase 2: Insights

The **Insights** tab (`/insights`, next to Statement) adds customer-wise collection metrics and a Historical AR trend chart. Phase 2 is self-contained: its calculations live in [lib/insights/](../lib/insights/) and do not call or change the Phase 1 calculation module ([lib/ar/](../lib/ar/)). The only change to existing code is the one navigation entry in [components/Nav.tsx](../components/Nav.tsx).

| File | Purpose |
|---|---|
| [lib/insights/metrics.ts](../lib/insights/metrics.ts) | Section 1: outstanding AR, payment frequency, invoice frequency, average collection period |
| [lib/insights/trend.ts](../lib/insights/trend.ts) | Section 2: closing AR at a date, month-end/week-end series, period windows, % change, lakh axis |
| [lib/insights/round.ts](../lib/insights/round.ts) | Exact rounding of displayed ratios (no floating-point half errors) |
| [app/insights/page.tsx](../app/insights/page.tsx) | The page: metrics table, filters, chart, figures table |
| [lib/insights/selection.ts](../lib/insights/selection.ts) | Which lines the chart shows (from ?cust=) and their colours |
| [components/insights/TrendChart.tsx](../components/insights/TrendChart.tsx) | The chart box: customer picker, legend, interactive SVG line chart (no chart library), figures table |
| [components/insights/TrendFilters.tsx](../components/insights/TrendFilters.tsx) | Monthly/weekly and period controls, applied as soon as they change |
| [tests/insights.test.ts](../tests/insights.test.ts) | 31 tests: hand-calculated figures, edge cases, and cross-checks against Phase 1 |

## Section 1: customer metrics

All figures are customer-wise and use all history up to the as-at date in the header (by default today, so all history).

| Column | Calculation |
|---|---|
| **Outstanding AR** | Σ over the customer's invoices (cancelled excluded) of: invoice total − payments allocated to it − credit notes against it. Payments are settlement values (bank + TDS). Unallocated advances are not deducted. |
| **Payment frequency** | Average days between successive **distinct** receipt dates: (Σ gaps) ÷ (number of dates − 1). Fewer than two payment dates → N/A. |
| **Invoice frequency** | Average days between successive invoice dates of non-cancelled invoices: (Σ gaps) ÷ (number of invoices − 1). Fewer than two invoices → N/A. |
| **Average collection period** | For each invoice fully settled by the as-at date: days from invoice date to the **final settlement date** (the date of the last payment allocation or credit note that brought the balance to zero). Average over those invoices. None → N/A. |

Shown to one decimal place, rounded exactly (half up). Default sort: Outstanding AR, highest first. Every column sorts on click; N/A rows always sort last. A totals row adds up Outstanding AR.

**Worked example (C001, as at 18-Nov-2026):** payments on 03-May, 02-Jun, 08-Jul, 20-Aug and 10-Sep → gaps 30, 36, 43, 21 → 130 ÷ 4 = **32.5 days**. Invoices 05-Apr … 05-Sep (6) → 153 ÷ 5 = **30.6 days**. Fully settled invoices took 28, 28, 33, 46 and 36 days → 171 ÷ 5 = **34.2 days**.

## Section 2: Historical AR trend

**Closing AR at date D** = Σ outstanding invoice balances at the end of D, where for each non-cancelled invoice raised on or before D:

```
outstanding = total − payments (bank + TDS) allocated on or before D − credit notes issued on or before D
```

So the line reflects invoices raised, payments received and allocated, credit notes and TDS, all up to each reporting date: the actual receivable, not the invoice value.

- **Monthly (default):** one point per month, the balance on the **last calendar day** of the month.
- **Weekly:** one point per week, the balance on the **Sunday** that ends each Monday–Sunday week.
- **Period still in progress:** the last point is the balance **to the end of the window** (the as-at date), labelled e.g. "Nov 2026 (to 18-Nov-2026)" and drawn hollow.
- **Period filter** (above the chart; applies as soon as it changes, no Apply button): last 12 / 6 / 3 months = the current month and the 11 / 5 / 2 before it, ending at the as-at date. **Custom range:** any From and To, with To no later than the as-at date (later records do not exist yet at that date). Choosing *Custom* starts from the window shown; a date applies once both dates are complete and From is not after To.
- **Customer filter** (inside the chart box): tick any combination of *All customers (consolidated)* and individual customers; each ticked item is its own line, and the chart redraws instantly (every line is calculated on the server in advance). Consolidated is shown by default. The choice is kept in the URL (`?cust=all,868`), so a bookmarked or shared link opens with the same lines, and it is kept when the period changes. At least one line is always shown; up to 7 customers at once plus the consolidated line. **De-select all** (at the top of the picker) clears every customer and returns to the consolidated trend only.
- **Colours and legend:** a validated 8-colour palette (checked for colour-blind separation on line charts). The consolidated line is always blue; each customer takes the next free colour and keeps it while shown, so adding or removing a line never repaints the others. With two or more lines a legend appears, and with two to four lines each line is also labelled at its end (when the labels do not collide).
- **% change** from the previous month/week: (closing − previous) ÷ previous × 100, where *previous* is the balance at the end of the period before (also for the first point in the window). Shown with one decimal; "N/A" when the previous balance is nil. The latest figure and its change are shown at the top of the chart.
- **Axes:** **X axis = time**, monthly by default or weekly as selected, earliest on the left, labelled *Dec '25* (monthly) or *7 Dec '25* (weekly). **Y axis = amount** in ₹ lakh from 0 up to the first step at or above the largest balance shown: **2-lakh steps** whenever the consolidated line is shown, **1-lakh steps** when only customer lines are shown. The caption above the chart states the step in use.
- **Interaction:** hover (or focus the chart and use the left/right arrow keys) to see the period, the balance and the % change of every line shown. The tooltip stays inside the chart and beside the hovered points. A table of every point, grouped by line, is available under the chart.
- **Size:** the chart box is exactly as wide as the chart, so there is no empty space on its right; the title is on the left and the headline figures (consolidated closing AR and its % change) stay at the top right.

## Verification

- 31 unit tests in [tests/insights.test.ts](../tests/insights.test.ts): figures worked out by hand from the sample data for all 8 customers; the as-at rule; same-day payments; deleted receipts; part-paid invoices that settle later; invoices cleared only by credit notes; calendar edges (leap years, year ends, Sundays); presets and custom ranges; exact rounding.
- Cross-checks against Phase 1: Outstanding AR equals the Phase 1 invoice outstanding for every customer on every day of 2026, and closing AR equals the Phase 1 total for every day, consolidated and per customer.
- An independent re-implementation (different formulas: span ÷ gaps, settlement by walking events in date order, weekdays from day numbers) agreed on 46,986 comparisons over the sample data and live data, and the live page's tables and chart figures matched it for every filter combination tested.

## Decisions taken

1. Outstanding AR and the trend line use **invoice balances** (as the Phase 2 formula "Σ outstanding invoice balances" states). Unallocated advances are not deducted; the figures table shows them separately.
2. Payments count **when allocated to an invoice** (allocation date), consistent with Phase 1 R10/R11.
3. **Reversed payments:** the data model has no reversal flag; a reversed receipt is deleted (with its allocations), so it no longer appears in any calculation.
4. Payment frequency counts **distinct payment dates**; invoice frequency counts **invoices** (two on one day give a gap of 0), following the wording of each rule.
5. Average collection period counts only invoices where money was collected; an invoice cleared **entirely by credit notes** is excluded.
6. The as-at date in the header applies to Insights too, so all figures agree with the rest of the app.
7. Weeks run Monday–Sunday; month and week points in progress are shown "to date".
8. Axes follow the corrected specification: time on X (monthly by default), amount on Y in ₹ lakh with 2-lakh steps; at the user's request, customer-only views use 1-lakh steps. When the consolidated line is shown the 2-lakh step is kept, because 1-lakh steps up to the consolidated total (about ₹22 lakh) would crowd the axis. If a customer-only scale ever needed more than 16 steps, gridlines stay at every lakh and every second one is labelled.
9. The headline figures at the top right always show the **consolidated** total, whatever lines are ticked, so they stay fixed; each line's own figures are in the tooltip and the table.
10. Up to **7 customer lines** plus the consolidated line: the most a validated palette can keep distinguishable. Further customers are disabled in the picker until one is unticked.
11. The period controls also apply without an Apply button, for consistency with the customer picker.
