# AR Manager — User Guide

**Brightwater Advisory Pvt. Ltd. · Accounts receivable**

This guide is for the **finance team** who use AR Manager every day to track what customers owe, and for **managers** who review receivables, cash collection and customer risk.

- **Analysts:** read sections 1–3, then use section 4 (step-by-step tasks) as a reference.
- **Managers:** section 1 (the five-minute review) and section 5 (Insights) cover what you need; section 7 explains every figure.

Examples in this guide use the sample data as at **31-Aug-2026** unless stated otherwise. Your figures will differ as transactions are recorded.

---

## Contents

1. [The five-minute review (for managers)](#1-the-five-minute-review-for-managers)
2. [Key ideas](#2-key-ideas)
3. [The screens](#3-the-screens)
4. [Step-by-step tasks](#4-step-by-step-tasks)
5. [Insights: collection behaviour and AR trend](#5-insights-collection-behaviour-and-ar-trend)
6. [Rules the system enforces](#6-rules-the-system-enforces)
7. [How every figure is calculated](#7-how-every-figure-is-calculated)
8. [Questions and troubleshooting](#8-questions-and-troubleshooting)

---

## 1. The five-minute review (for managers)

Open **Overdue at a glance** (the home screen). It answers four questions.

| Question | Where to look | What good looks like |
|---|---|---|
| How much are we owed? | **Total outstanding** and **Net receivable** (top row) | In line with recent billing |
| How much of it is late? | **Overdue** (with its % of outstanding) and **Overdue invoices** | A low and falling % |
| How quickly do we collect? | **DSO** (days sales outstanding) | Close to the customers' credit terms (typically 30–60 days) |
| Who needs action? | **Needs attention** panel | Empty, or with a named owner for each item |

Then:

1. **Ageing by customer** — scan the right-hand buckets (61–90, 91–180, Over 180). Amounts there are the collection risk. Click any amount to see the invoices behind it.
2. **Overdue invoices** — the list is in red, longest overdue first. An amber **Disputed** label means the customer has raised a query; chasing payment alone will not resolve it.
3. **Insights** (top menu) — the **Historical AR trend** shows whether receivables are building up or coming down month by month; the customer table shows who pays slowly and how regularly each customer is billed and pays.

> **Example (31-Aug-2026):** Total outstanding ₹21,18,100.00, of which ₹12,86,200.00 (60.7%) is overdue across 11 invoices; DSO 111 days. Kundalika Castings (C003) is over its credit limit with ₹1,77,000.00 more than 180 days late, and Varandha Freight (C002) broke a promise to pay ₹69,600.00 by 01-Aug-2026.

**Want to see an earlier position?** Change the **As at** date in the top-right corner — for example to the last day of the previous month — and every figure on every screen is recalculated as it stood on that date (see 2.1).

---

## 2. Key ideas

### 2.1 The "As at" date

Every screen shows the position **as at** the date in the top-right corner. It starts at **today (India time)**.

- Change it to any date to see the ledger exactly as it stood at the end of that day. Only documents dated on or before that date count: invoices by invoice date, payments by receipt date, credit notes by their date, allocations of payments to invoices by allocation date, and notes by note date.
- The date stays as you move between screens, and it is part of the page address, so a bookmarked or shared link opens at the same date.
- Click **Today** (next to the date) to return to today.

Use it for month-end figures (set the last day of the month), to answer "what did this customer owe on …?", or to see whether an invoice was overdue on a given day.

### 2.2 Outstanding, unapplied credit and net balance

| Term | Meaning |
|---|---|
| **Outstanding** | What is still unpaid on invoices: invoice total − payments matched to it − credit notes against it. |
| **Unapplied credit** | Money received from the customer that has not yet been matched to an invoice (for example, an advance). |
| **Net balance** | Outstanding − unapplied credit. This is what the customer owes overall. A negative net balance is a **credit balance**, shown with **Cr**. |

Unapplied credit is always shown in **its own column**; it is never deducted from the oldest ageing bucket, because it has not been matched to any invoice yet.

> **Example:** Sabarmati Retail (C005) on 31-Aug-2026: invoices outstanding ₹1,88,800.00; an advance of ₹1,00,000.00 received on 10-Jul-2026 is not yet matched to an invoice; **net balance ₹88,800.00 Dr**. On 12-Jul-2026 (before any invoice) the same customer showed **₹1,00,000.00 Cr**.

### 2.3 TDS counts as payment

Customers deduct TDS (tax deducted at source) before paying and deposit it with the government on Brightwater's behalf. **Bank amount + TDS = the settlement value**, and the full settlement value settles invoices.

> **Example:** C001 paid ₹81,000.00 into the bank and deducted ₹7,500.00 TDS; together ₹88,500.00 fully settles invoice BWA/26-27/0001 (₹88,500.00).

### 2.4 Invoice status and labels

| Status | Meaning |
|---|---|
| **Due** | Something is still unpaid, but the due date has not passed. An invoice is still Due **on** its due date. |
| **Overdue** | Something is still unpaid and the due date has passed (from the day after the due date). |
| **Paid** | Nothing left to pay (payments and credit notes cover the total). |
| **Cancelled** | Raised in error and cancelled. It keeps its number but is excluded from every total, balance, ageing figure, statement and DSO. |

Labels shown alongside the status:

- **Part-paid** — something has been paid or credited, but a balance remains.
- **Disputed** — the customer has raised a query. The label changes no amounts.
- **Over limit** (customers) — net balance is above the customer's credit limit.

### 2.5 Ageing buckets

Unpaid amounts are grouped by **days past the due date** (not the invoice date):

| Bucket | Days past due |
|---|---|
| Not due | 0 or fewer (including the due date itself) |
| 1–30 | 1 to 30 |
| 31–60 | 31 to 60 |
| 61–90 | 61 to 90 |
| 91–180 | 91 to 180 |
| Over 180 | 181 or more |

Days are counted from the day after the due date. An invoice exactly 90 days past due is in **61–90**; at 91 days it moves to **91–180**.

### 2.6 How amounts and dates are shown

- Amounts in Indian format: **₹1,23,456.00**. Balances carry **Dr** (customer owes us) or **Cr** (credit balance); a zero balance has no suffix.
- Dates: **31-Aug-2026**. (Date-entry boxes use your browser's own format, often dd-mm-yyyy.)
- On the Insights chart, amounts are in **₹ lakh** (1 lakh = ₹1,00,000).
- Document numbers follow the financial year (April–March) and restart on 1 April: invoices **BWA/26-27/0025**, credit notes **BWA/CN/26-27/002**, receipts **RCT/26-27/0018**. Numbers are never reused, including those of cancelled invoices.

---

## 3. The screens

The menu at the top links to six areas: **Overdue at a glance**, **Customers**, **Invoices**, **Record payment**, **Statement** and **Insights**. After you save, change or delete something, a green banner confirms what happened.

### 3.1 Overdue at a glance (home)

**Top row**

| Figure | Meaning |
|---|---|
| Total outstanding | Unpaid amount on all invoices |
| Unapplied credit | Money received but not yet matched to invoices |
| Net receivable | Total outstanding − unapplied credit |
| Overdue | Unpaid amount past its due date, and its % of total outstanding |
| Overdue invoices | Number of overdue invoices |
| DSO | Days sales outstanding (see 7.6); the note shows the 90-day sales window used |

**Ageing by customer** — one row per customer with a balance: the six ageing buckets, outstanding, unapplied credit and net balance, with a totals row. Overdue buckets are shown in red. Click a **customer** to open the customer; click a **bucket amount** to open exactly those invoices; click an **outstanding** amount to see that customer's open invoices. **Export ageing CSV** downloads this table.

**Overdue invoices** — every overdue invoice in red, longest overdue first, with days late, amount outstanding and the Part-paid/Disputed labels.

**Needs attention**

- **Over credit limit** — customers whose net balance exceeds their limit, with the % used.
- **Broken promises** — promises to pay that were not kept by the promised date (see 7.7).
- **Follow-ups due** — notes whose follow-up date has arrived and are not marked done. Use **Mark follow-up done** once actioned.
- **Unapplied credit to allocate** — receipts with money not yet matched to invoices.

At the foot of the page, the **control check** confirms that every customer's balance agrees with the underlying documents (see 7.8). If it ever reports a difference, stop and report it.

### 3.2 Customers

**Customer list** — code, name, city and state, contact, credit days, credit limit, **balance** (net, Dr/Cr), **overdue**, **limit used** (%), and status (Active/Inactive, Over limit).

- Search by code, name, contact or email; **Show** all, active only or inactive only; then **Apply**.
- Click any column heading to sort; click again to reverse.
- **Add customer** opens a blank form.

**Customer page**

- **Buttons:** New invoice (active customers only), Record payment, Statement, Edit, Deactivate / Reactivate.
- **Figures:** net balance, invoices outstanding, unapplied credit, overdue (with the number of invoices), credit limit and % used, and a one-line **ageing** breakdown. A red banner appears when the customer is over the credit limit.
- **Profile:** contact details, GSTIN, credit days, TDS rate, and whether GST is charged as CGST + SGST (Maharashtra) or IGST (other states).
- **Invoices:** every invoice dated on or before the as-at date with status and days late. **Open in invoice list** shows them with full filters.
- **Receipts:** each payment with bank amount, TDS, settlement value, the invoices it was matched to, and any unapplied amount. Corrections: **remove** an allocation; **delete receipt** (only shown for a receipt with no allocations).
- **Allocate unapplied credit:** match money already received to an open invoice (see 4.5).
- **Add a note** and the **Notes timeline:** calls, emails, meetings and notes, newest first, with follow-up dates (**mark done**) and promise status (**Kept**, **Broken** or **Pending**).

### 3.3 Invoices

**Invoice list** — number, customer, invoice date, due date, total, received, credited, outstanding, status (with Part-paid/Disputed) and days late. Overdue rows are red; cancelled invoices are struck through.

- Filters: **Invoice number**, **Customer**, **Status** (All; Open = due or overdue; Overdue; Due; Paid; Cancelled), **Disputed**, and **Invoice date from / to**, then **Apply**. **Clear filters** resets them.
- The **Totals** row adds up the invoices shown (cancelled invoices are listed but not counted).
- **Export CSV** downloads the list exactly as filtered and sorted.
- **New invoice** opens the invoice form (see 4.2).

**Invoice page** — total, received, credited, outstanding at the as-at date, days past due and ageing bucket; the tax breakdown (CGST + SGST or IGST); **Payments allocated** (with **remove**); **Credit notes**; **Notes on this invoice**. Items dated after the as-at date are greyed out and do not count.

Actions (right-hand side): **Mark as disputed** / **Clear disputed flag**, **Raise a credit note**, **Add a note**, **Cancel invoice…** (only possible while nothing has been paid or credited).

### 3.4 Record payment

Records money received, with its TDS, and matches it to invoices in one step (see 4.3).

### 3.5 Statement

A statement of account for one customer over a period, ready to print or send.

- Choose the **Customer**, **From** and **To** dates and click **Show statement**. From the customer page, **Statement** opens it for the current financial year to date.
- **Opening balance** (the balance at the end of the day before From), then every invoice (debit), credit note (credit), payment (credit, "Payment received", with mode and reference) and TDS (credit, "TDS deducted by customer") in date order, with a **running balance**, then the **closing balance**.
- Footer: the closing balance by **ageing bucket**, and any **unapplied credit**.
- Cancelled invoices, the matching of payments to invoices, and notes are not shown.
- **Print** produces a clean A4 page with Brightwater's name and address. **Export CSV** downloads the same statement.

### 3.6 Insights

Customer payment behaviour and the historical AR trend — see section 5.

---

## 4. Step-by-step tasks

### 4.1 Add or change a customer

1. **Customers → Add customer** (or **Edit** on the customer page).
2. Fill in code, name, city, **state** (choose from the list — it decides the GST treatment), contact person, email, optional phone and 15-character GSTIN, **credit days**, **credit limit** and **TDS rate** (%).
3. **Add customer** / **Save changes**. Problems are explained next to each field and what you typed is kept.

Changing credit days or state affects **new** invoices only; existing invoices keep their due dates and GST.

### 4.2 Raise an invoice

1. **Invoices → New invoice** (or **New invoice** on the customer page).
2. Choose the **customer** (only active customers are listed), the **invoice date**, a **description**, the **taxable value** and the **GST rate** (18% is filled in).
3. Check the **preview** on the right: invoice number, due date, CGST + SGST (Maharashtra customers) or IGST (other states), and the invoice total.
4. If a yellow **credit-limit warning** appears, the invoice would take the customer above their limit. You can still save; consider whether approval is needed first.
5. **Save invoice.** The invoice page opens.

### 4.3 Record a payment (including TDS and part-payments)

1. **Record payment** (or **Record payment** on the customer page).
2. Choose the **customer** and the **receipt date**, and enter the **bank amount** (the amount credited to the bank).
3. **TDS deducted** fills in automatically from the customer's TDS rate, applied to the taxable value of the invoices being paid. **Overwrite it with what the customer actually deducted** (from the payment advice or Form 26AS).
4. Choose the **mode** (NEFT, RTGS, IMPS, UPI or Cheque) and enter the **reference** (UTR or cheque number).
5. The customer's **open invoices** are listed oldest due date first, with the settlement value (bank + TDS) already spread across them in that order. Change the amounts to match the customer's remittance advice if they paid specific invoices. After you change an amount, a **Re-suggest oldest first** link appears to restore the suggestion.
6. Check the summary: **Settlement value**, **Allocated to invoices**, and what **Remains as unapplied credit**. You cannot allocate more than the settlement value.
7. **Save payment.** The receipt and its allocations are saved together; if anything is rejected, nothing is saved and the reason is shown.

### 4.4 Record an advance (money received before the invoice)

Record the payment as in 4.3 but leave all invoice amounts blank. The whole amount is kept as **unapplied credit**, and the customer's net balance shows **Cr** until an invoice is raised.

### 4.5 Allocate unapplied credit later

1. Open the customer. Under **Allocate unapplied credit**, choose the receipt (**From receipt**) and the invoice (**To invoice**).
2. The **amount** fills in with the smaller of what is left on the receipt and on the invoice; change it if needed.
3. Set the **allocation date** (today by default; it cannot be before the receipt or invoice date).
4. **Allocate.** The banner confirms how much of the receipt remains unapplied.

### 4.6 Raise a credit note

1. Open the invoice. Under **Raise a credit note**, enter the **date** (not before the invoice date), the **taxable value** to credit and the **reason**.
2. The GST and credit-note total are previewed using the invoice's own rate and split. The note shows how much can still be credited.
3. **Raise credit note.** The invoice's outstanding amount falls from the credit note's date onwards.

### 4.7 Mark or clear a dispute

On the invoice page, **Mark as disputed** (or **Clear disputed flag**). The amber **Disputed** label then appears on the invoice list, the home screen's overdue list, and the customer and invoice pages. No amounts change, and the invoice still ages normally.

### 4.8 Cancel an invoice raised in error

On the invoice page, **Cancel invoice…** then **Yes, cancel it**. Only possible while no payment is allocated and no credit note raised. The number is kept and never reused. If money has been received or a credit note issued, raise a credit note instead (or remove the allocations first, if they were made by mistake).

### 4.9 Correct a payment entered by mistake

1. On the customer page (Receipts) or the invoice page (Payments allocated), click **remove** next to each allocation and confirm. The amount goes back to the receipt's unapplied credit.
2. Once a receipt has no allocations, **delete receipt** appears; confirm to delete it.
3. Record the payment again correctly.

### 4.10 Log a collection call, a follow-up or a promise to pay

1. On the customer page (or invoice page), **Add a note**: date, **type** (Call, Email, Meeting or Note), optionally the **invoice** it concerns, and the note text.
2. Optional **Follow up on** date — it will appear under **Follow-ups due** on the home screen from that date.
3. Optional **promise to pay** — enter **both** the promised date and amount (or neither).
4. **Add note.** When a follow-up is done, click **mark done** (customer page) or **Mark follow-up done** (home screen).

### 4.11 Send a statement

**Statement** (or **Statement** on the customer page) → choose the period → **Show statement** → **Print** (choose "Save as PDF" in the print dialog to email it) or **Export CSV**.

### 4.12 Export reports for Excel

- **Ageing report:** home screen → **Export ageing CSV**.
- **Invoice list:** Invoices → set filters and sort → **Export CSV**.
- **Statement:** Statement → **Export CSV**.

Files open directly in Excel. Amounts are plain numbers (e.g. 70800.00) so they can be totalled; balances carry Dr/Cr in a separate column.

### 4.13 Month-end review (suggested routine)

1. Set **As at** to the last day of the month.
2. Home screen: note total outstanding, overdue %, DSO; export the ageing CSV for the file.
3. Check **Needs attention**: allocate unapplied credit, chase broken promises, action follow-ups, review over-limit customers.
4. **Insights → Historical AR trend**: compare the month-end balance with previous months (the % change is shown).
5. Confirm the control check at the foot of the home screen agrees.

---

## 5. Insights: collection behaviour and AR trend

Open **Insights** from the top menu. Everything on this tab follows the **As at** date (by default today, so all history to date).

### 5.1 Customer metrics

One row per customer, sorted by **Outstanding AR**, highest first. Click any column heading to sort by it (the first click on a number column puts the highest first; click again for lowest first). Customers without enough data (**N/A**) always sort to the bottom. Hover over a figure to see how many dates or invoices it is based on.

| Column | What it tells you | How it is worked out |
|---|---|---|
| **Outstanding AR** | How much the customer owes on invoices | Each invoice's total less payments matched to it (bank + TDS) and credit notes; cancelled invoices excluded. Advances not yet matched to an invoice are **not** deducted (see the home screen for unapplied credit). |
| **Payment frequency** | How regularly the customer pays | Average number of days between successive payment dates. Two receipts on the same day count as one payment date. N/A with fewer than two payment dates. |
| **Invoice frequency** | How regularly we bill the customer | Average number of days between successive invoice dates (cancelled invoices excluded). N/A with fewer than two invoices. |
| **Average collection period** | How long the customer takes to settle an invoice in full | For each invoice **fully settled**, the days from invoice date to the date it was fully settled (the last payment or credit note that cleared it); averaged. Part-paid invoices count only once fully settled. Invoices cleared only by a credit note are left out (nothing was collected). N/A if no invoice is fully settled. |

All averages are shown to one decimal place, in days. A **Total** row adds up Outstanding AR.

> **Example (as at 18-Nov-2026, sample data):** Tamhini Foods (C001) paid on 03-May, 02-Jun, 08-Jul, 20-Aug and 10-Sep — gaps of 30, 36, 43 and 21 days — so **payment frequency 32.5 days**. It was invoiced monthly (**30.6 days**), and its five fully settled invoices took 28, 28, 33, 46 and 36 days to clear: **average collection period 34.2 days**, close to its 30-day terms. By contrast, Varandha Freight (C002) takes **90.5 days** on average against 45-day terms.

**Reading the metrics together**

- An **average collection period** well above the customer's credit days signals a slow payer.
- A **payment frequency** much longer than the **invoice frequency** means invoices are accumulating faster than they are being paid.
- **N/A** is not zero: it means there is not yet enough history to judge.

### 5.2 Historical AR trend

A line chart of **month-end** (or week-end) outstanding AR, showing whether receivables are rising or falling.

**What each point means:** the total of unpaid invoice balances at the end of that month (the last calendar day) or week (Sunday) — invoices raised, less payments (including TDS) and credit notes, each up to that date. It is the actual receivable, not the value invoiced. The last point is the current month or week **to date** (marked * and drawn hollow).

**Axes:** months (or weeks) run left to right, labelled like **Dec '25** (weekly: **7 Dec '25**); amounts run up the side in **₹ lakh**, in steps of **2 lakh** — or **1 lakh** when only customer lines are shown (consolidated unticked), so smaller customer balances are easier to read. The line above the chart states the step in use.

**Controls** (all take effect immediately — there is no Apply button):

- **Show:** Monthly (default) or Weekly.
- **Period:** Last 12 months (default), Last 6 months, Last 3 months, or **Custom date range**. "Last 12 months" means the current month and the 11 before it. For a custom range, change the **From** and **To** dates; the chart updates once both dates are complete. The range cannot go past the As at date.
- **Customers** (inside the chart box): tick **All customers (consolidated)** and/or any individual customers. Each ticked item is drawn as its own line, so you can compare customers against each other or against the total. Up to **7 customers** at once, plus the consolidated line; at least one line is always shown. The chart redraws instantly and keeps your choice when you change the period. The choice is also part of the page address, so a bookmarked or shared link shows the same lines. **De-select all**, at the top of the list, clears all customers and returns to the consolidated trend.

**Reading the chart**

- **Hover** over the chart (or click it and use the **left/right arrow keys**) to see, for that month or week, each line's balance and its **% change from the previous month or week**.
- With two or more lines, a **legend** above the chart names each colour, and (for two to four lines) each line is labelled at its right-hand end. Each customer keeps its colour while shown; the consolidated line is always blue.
- **Top right of the chart box:** the latest **consolidated** balance and its % change from the previous month (or week). A rise is shown in red (receivables building up), a fall in green.
- **Show the trend figures as a table** lists every point for every line shown: period, date, balance (₹ and lakh), previous balance, % change and unapplied credit (for information; not deducted).
- % change shows **N/A** when the previous balance was nil.

> **Example of the % change:** if consolidated AR was ₹14,51,700.00 at 31-Oct-2026 and ₹16,87,700.00 at 18-Nov-2026, the chart shows **+16.3%** for November: (16,87,700 − 14,51,700) ÷ 14,51,700 × 100 = 16.26%, shown to one decimal place.

**Using it as a manager:** a line that climbs month after month while billing is steady means collections are slowing; compare it with the customer's average collection period in the table above. A sharp month-end drop usually reflects large receipts or credit notes in that month.

---

## 6. Rules the system enforces

The system checks these before saving and explains any problem in plain language.

| Area | Rule |
|---|---|
| Customers | Codes must be unique. A customer with any records cannot be deleted — **deactivate** instead. Inactive customers cannot be invoiced, but can still pay and have notes. |
| Credit limit | Exceeding it gives a **warning** when raising an invoice; it does not block the invoice. |
| Invoices | Once saved, an invoice cannot be edited (except the disputed flag). Due date = invoice date + the customer's credit days at the time. GST: CGST + SGST for Maharashtra customers, IGST otherwise, each rounded to the paisa. |
| Cancelling | Only while nothing has been paid or credited. The number is never reused. |
| Payments | Allocations go only to the same customer's open, non-cancelled invoices; never more than the payment's settlement value or the invoice's remaining balance; never dated before the receipt or the invoice. A receipt can be deleted only once it has no allocations. |
| Credit notes | Not more than what is left to settle on the invoice; not dated before the invoice. GST follows the invoice's rate and split. |
| Notes | A promise to pay needs both a date and an amount. Follow-up and promise dates cannot be before the note date. |

---

## 7. How every figure is calculated

All figures are worked out from the documents each time a page opens — nothing is stored as a running balance — so they are correct for any As at date (D).

**7.1 Invoice outstanding** = invoice total − payments allocated to it dated on or before D − credit notes against it dated on or before D.

**7.2 Days past due** = D − due date. **Overdue** when something is outstanding and days past due is 1 or more.

**7.3 Customer figures**
- Outstanding = sum of the customer's invoice outstanding amounts.
- Unapplied credit = settlement values (bank + TDS) of the customer's receipts dated on or before D, less the allocations made from them on or before D.
- Net balance = outstanding − unapplied credit.
- Overdue = outstanding − the "Not due" bucket.
- Limit used = net balance ÷ credit limit. Over limit when net balance is above the limit.

**7.4 Statement** — opening balance = all invoices − credit notes − receipts (bank + TDS) up to the day before From; closing balance = the same up to To. The closing balance always equals the customer's net balance at To.

**7.5 GST** — each component rounded to the nearest paisa, halves rounded up. Invoice total = taxable value + GST.

**7.6 DSO (days sales outstanding)** = total invoice outstanding at D (before unapplied credit) ÷ net sales of the last 90 days × 90, rounded to whole days. Net sales = invoices (not cancelled) dated D−89 to D, less credit notes dated in the same window. Shown as "—" when there were no net sales in the window.

> **Example (31-Aug-2026):** outstanding ₹21,18,100.00; net sales 03-Jun to 31-Aug ₹17,16,900.00; DSO = 21,18,100 × 90 ÷ 17,16,900 = 111 days.

**7.7 Promise to pay** (as at D, for notes dated on or before D)
- **Kept** — the customer's receipts (bank + TDS) from the note date to the promised date (or to D, if earlier) add up to at least the promised amount.
- **Broken** — not kept, and the promised date has passed.
- **Pending** — otherwise (including on the promised date itself).

**7.8 Control check** — every customer's net balance is recalculated a second, independent way (invoices − credit notes − receipts, all dated on or before D). The two must agree to the paisa; the home screen confirms they do.

**7.9 Insights** — see section 5 for the definitions of outstanding AR, payment frequency, invoice frequency, average collection period, month-end AR and % change. % change = (this period's balance − previous period's balance) ÷ previous period's balance × 100, to one decimal place.

---

## 8. Questions and troubleshooting

**Why does a customer show a balance with "Cr"?**
They have paid more than they currently owe on invoices — usually an advance not yet matched to an invoice. Allocate it once the invoice is raised (4.5).

**The customer paid, but the invoice still shows outstanding.**
The payment may have been recorded without being matched to that invoice (it then sits as unapplied credit), or matched with a later allocation date. Check **Receipts** on the customer page and allocate it (4.5).

**The customer short-paid an invoice (e.g. bank charges).**
Record what was received; the invoice stays **Part-paid** with the shortfall outstanding. Add a note and either chase the difference or, if agreed, raise a credit note for it.

**Why can't I edit an invoice?**
Issued invoices are fixed for audit and GST purposes. Use a credit note to reduce it, or cancel it (if nothing has been paid or credited) and raise a new one.

**Why can't I delete a customer?**
Customers with any records can only be deactivated, so their history remains intact.

**Why is an invoice still "Due" on its due date?**
It becomes overdue from the day after the due date.

**The TDS filled in on the payment form is different from what the customer deducted.**
The pre-filled amount is only an estimate from the customer's TDS rate. Always enter the actual TDS deducted; balances use what you save.

**What does "N/A" mean on Insights?**
Not enough history yet: fewer than two payment dates, fewer than two invoices, or no fully settled invoice. It is not the same as zero.

**Why is Outstanding AR on Insights different from the customer's net balance?**
Insights shows invoice balances only. The net balance also deducts unapplied credit (money received but not yet matched to invoices).

**Can I see the position at a past date?**
Yes — change the **As at** date (2.1). Every screen, statement, export and the Insights tab follow it.

**Something says "Something went wrong".**
Click **Try again**. If it persists, note what you were doing and the time, and contact the system administrator.
