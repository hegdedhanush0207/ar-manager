# Manual test script

The clicks to make before every release. Work through it on the live site (or `npm run dev`) after resetting the workspace, so the figures match the brief.

**Before you start:** `npm run reset-workspace` (or the `curl` command in the brief, section 3.2). This deletes anything added while testing.

Tick each line. Expected figures come from the brief's spot checks (Part 1) and the sample data (Part 3).

## 0. Automated checks

- [ ] `npm test` → all unit tests pass (includes all 10 spot checks and the R14 control check for every day of 2026-01-01 … 2026-10-31).
- [ ] `npm run build` → succeeds with no TypeScript or ESLint errors.
- [ ] Optional: `npm run dev`, then `npm run test:e2e` → all browser suites pass (this resets the workspace).

## 1. As-at date and navigation

- [ ] Open `/` with no `?asof=`: the date picker shows **today in India**.
- [ ] Pick **31-Aug-2026**: the URL shows `?asof=2026-08-31`, and every navigation link keeps it.
- [ ] Reload the page: the date is kept. Click **Today**: it returns to today.

## 2. Overdue at a glance (as at 31-Aug-2026)

- [ ] Total outstanding **₹21,18,100.00**, unapplied credit **₹1,00,000.00**, net receivable **₹20,18,100.00 Dr**, overdue invoices **11**, DSO **111 days**.
- [ ] Ageing row C005: Not due ₹70,800.00, 1–30 ₹1,18,000.00, unapplied ₹1,00,000.00 **in its own column**, net ₹88,800.00 Dr (spot check 5).
- [ ] Overdue invoices are red and sorted longest first: BWA/25-26/0141 (193 days) at the top; BWA/26-27/0010 shows **Disputed**.
- [ ] Needs attention: C003 over limit; C002 promise of ₹69,600.00 **Broken** (spot check 9); C005 ₹1,00,000.00 unapplied.
- [ ] Click a bucket amount: the invoice list opens filtered to that customer and bucket.
- [ ] Footer says the control check agrees for every customer.

## 3. Invoices

- [ ] `/invoices?asof=2026-08-31`, search `0003`: outstanding **₹69,600.00**, Overdue · Part-paid, **90** days late (spot check 3).
- [ ] BWA/26-27/0021 at 31-Aug: **Due** ₹88,500.00; at 06-Sep: **Overdue 2 days**; at 15-Sep: **Paid** (spot check 4).
- [ ] BWA/26-27/0007 at 31-Aug: credited ₹29,500.00, received ₹2,62,500.00, outstanding **₹3,000.00** (spot check 7).
- [ ] Status filter **Cancelled** shows BWA/26-27/0014; the totals row says it is not counted.
- [ ] Sort by any column; click again to reverse. Export CSV opens in Excel with ₹-free amounts.
- [ ] Open BWA/26-27/0001: CGST ₹6,750.00 + SGST ₹6,750.00, total ₹88,500.00, due 05-May-2026 (spot check 1). BWA/26-27/0002: IGST ₹63,000.00, total ₹4,13,000.00 (spot check 2).

## 4. Create an invoice, credit note, dispute, cancel

- [ ] **New invoice** → C008 is not offered (inactive).
- [ ] Choose C006, date 18-Sep-2026, taxable 60,000: preview shows **BWA/26-27/0025**, CGST/SGST ₹5,400.00 each, total ₹70,800.00, due 03-Oct-2026, and a **credit-limit warning** (not a block). Save.
- [ ] On the new invoice: raise a credit note of taxable 1,000 → total ₹1,180.00, number **BWA/CN/26-27/002**. Try a credit note larger than what is left → a plain-language error, nothing saved.
- [ ] **Cancel** is now refused (credit note exists). **Mark as disputed** → amber label; amounts unchanged.
- [ ] Create another small invoice and **cancel** it → status Cancelled, number kept, left out of totals.

## 5. Record a part-payment with TDS, then check everything agrees

- [ ] **Record payment** for C004, date today, bank **1,00,000**. TDS is pre-filled from 10% of the taxable value; set it to **9,000**. The suggestion fills BWA/26-27/0007 (₹3,000), then 0010, then 0019, oldest due date first; the form shows the settlement value ₹1,09,000.00 and what remains unapplied. Save.
- [ ] The customer page shows the receipt, its allocations and unapplied credit (if any).
- [ ] The **invoice** pages show the new received amounts and part-paid labels.
- [ ] The **customer** balance fell by exactly ₹1,09,000.00 (bank + TDS).
- [ ] The **dashboard** totals moved by the same amount, and the control check still agrees.
- [ ] The **statement** for C004 shows a "Payment received" line for ₹1,00,000.00 and a separate "TDS deducted by you" line for ₹9,000.00, and its closing balance equals the customer's net balance.

## 6. Unapplied credit and corrections

- [ ] Record a payment for C006 of ₹50,000 with nothing to allocate beyond ₹35,400 → ₹14,600.00 stays as unapplied credit; net balance shows **Cr**.
- [ ] On the customer page, **remove** an allocation (confirm) → the amount returns to unapplied credit.
- [ ] **Allocate unapplied credit** to an open invoice with a date → the banner confirms what remains unapplied.
- [ ] A receipt with no allocations shows **delete receipt**; deleting it removes it from the customer and the statement.
- [ ] C005 as at 12-Jul-2026: net balance **₹1,00,000.00 Cr** (spot check 6).

## 7. Notes, follow-ups and promises

- [ ] Add a note with a promise date but no amount → refused ("both or neither").
- [ ] Add a note for C002 dated 31-Aug-2026 promising ₹50,000 by 05-Sep-2026 → **Pending** as at 31-Aug, **Broken** as at 10-Sep.
- [ ] Dashboard as at 10-Sep-2026 lists the follow-ups due; **Mark follow-up done** removes one.
- [ ] A note dated after the as-at date does not appear until that date.

## 8. Customers

- [ ] Add a customer with a duplicate code, a bad email, a 5-character GSTIN, or TDS over 100 → each is refused with a clear message, and the form keeps what was typed.
- [ ] Add C009 correctly; edit its credit days; deactivate (no **New invoice** button) and reactivate.
- [ ] Search by code, name, contact or email; filter active/inactive; sort by balance and overdue.

## 9. Statement, print and CSV

- [ ] Statement C002, 01-Apr-2026 to 31-Aug-2026: opening **₹70,800.00 Dr**, **7 lines**, closing **₹2,23,000.00 Dr** (spot check 8). TDS lines follow their receipts on the same date.
- [ ] **Print** → one clean A4 page: Brightwater's name and address, the customer, the period, the table and the ageing footer; no navigation or buttons.
- [ ] **Export CSV** → `Statement_C002_2026-04-01_to_2026-08-31.csv`; opens in Excel with plain amounts (70800.00) and Dr/Cr in its own column.
- [ ] Dashboard **Export ageing CSV** → totals match the dashboard.

## 10. After testing

- [ ] Reset the workspace again so the evaluators' figures match the sample data.
- [ ] Check the live site loads and shows the same spot-check figures.
