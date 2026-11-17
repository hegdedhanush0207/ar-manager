/**
 * Converts raw database rows (snake_case, amounts in rupees) into the app's
 * records (camelCase, amounts in whole paise).
 *
 * This file has no database access and no 'server-only' guard, so the app's
 * loader (lib/ar/load.ts) and the offline tests (tests/fixtures/sample.json)
 * both use exactly the same conversion.
 */
import type { ArData, Paise } from './types';

/** Rupees with 2 decimals → whole paise. ₹88,500.00 → 8850000. Converted once, here. */
export const paise = (rupees: number): Paise => Math.round(rupees * 100);

// ── Raw rows, as the database returns them (brief section 3.3) ──────────────

export interface CustomerRow {
  id: number; code: string; name: string; city: string; state: string;
  contact_person: string; email: string; phone: string | null; gstin: string | null;
  credit_days: number; credit_limit: number; tds_rate_pct: number; is_active: boolean;
}

export interface InvoiceRow {
  id: number; invoice_no: string; customer_id: number;
  invoice_date: string; due_date: string; description: string;
  taxable_value: number; gst_rate_pct: number;
  cgst: number; sgst: number; igst: number; total: number;
  is_cancelled: boolean; is_disputed: boolean;
}

export interface CreditNoteRow {
  id: number; credit_note_no: string; invoice_id: number; credit_note_date: string;
  taxable_value: number; cgst: number; sgst: number; igst: number; total: number;
  reason: string;
}

export interface ReceiptRow {
  id: number; receipt_no: string; customer_id: number; receipt_date: string;
  bank_amount: number; tds_amount: number;
  mode: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'Cheque'; reference: string;
}

export interface AllocationRow {
  id: number; receipt_id: number; invoice_id: number; allocation_date: string; amount: number;
}

export interface NoteRow {
  id: number; customer_id: number; invoice_id: number | null; note_date: string;
  note_type: 'Call' | 'Email' | 'Meeting' | 'Note'; body: string;
  follow_up_date: string | null; follow_up_done: boolean;
  promise_date: string | null; promise_amount: number | null;
}

/** The six tables, raw. This is also the shape of tests/fixtures/sample.json. */
export interface RawArData {
  customers: CustomerRow[];
  invoices: InvoiceRow[];
  credit_notes: CreditNoteRow[];
  receipts: ReceiptRow[];
  allocations: AllocationRow[];
  notes: NoteRow[];
}

// ── Conversion ───────────────────────────────────────────────────────────────

export function toArData(raw: RawArData): ArData {
  return {
    customers: raw.customers.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      city: r.city,
      state: r.state,
      contactPerson: r.contact_person,
      email: r.email,
      phone: r.phone,
      gstin: r.gstin,
      creditDays: r.credit_days,
      creditLimit: paise(r.credit_limit),
      tdsRatePct: r.tds_rate_pct,
      isActive: r.is_active,
    })),

    invoices: raw.invoices.map((r) => ({
      id: r.id,
      invoiceNo: r.invoice_no,
      customerId: r.customer_id,
      invoiceDate: r.invoice_date,
      dueDate: r.due_date,
      description: r.description,
      taxableValue: paise(r.taxable_value),
      gstRatePct: r.gst_rate_pct,
      cgst: paise(r.cgst),
      sgst: paise(r.sgst),
      igst: paise(r.igst),
      total: paise(r.total),
      isCancelled: r.is_cancelled,
      isDisputed: r.is_disputed,
    })),

    creditNotes: raw.credit_notes.map((r) => ({
      id: r.id,
      creditNoteNo: r.credit_note_no,
      invoiceId: r.invoice_id,
      creditNoteDate: r.credit_note_date,
      taxableValue: paise(r.taxable_value),
      cgst: paise(r.cgst),
      sgst: paise(r.sgst),
      igst: paise(r.igst),
      total: paise(r.total),
      reason: r.reason,
    })),

    receipts: raw.receipts.map((r) => ({
      id: r.id,
      receiptNo: r.receipt_no,
      customerId: r.customer_id,
      receiptDate: r.receipt_date,
      bankAmount: paise(r.bank_amount),
      tdsAmount: paise(r.tds_amount),
      mode: r.mode,
      reference: r.reference,
    })),

    allocations: raw.allocations.map((r) => ({
      id: r.id,
      receiptId: r.receipt_id,
      invoiceId: r.invoice_id,
      allocationDate: r.allocation_date,
      amount: paise(r.amount),
    })),

    notes: raw.notes.map((r) => ({
      id: r.id,
      customerId: r.customer_id,
      invoiceId: r.invoice_id,
      noteDate: r.note_date,
      noteType: r.note_type,
      body: r.body,
      followUpDate: r.follow_up_date,
      followUpDone: r.follow_up_done,
      promiseDate: r.promise_date,
      promiseAmount: r.promise_amount === null ? null : paise(r.promise_amount),
    })),
  };
}
