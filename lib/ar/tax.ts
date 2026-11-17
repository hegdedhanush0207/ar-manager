/**
 * R2 (due date), R3 (GST) and R7 (credit-note GST).
 */
import type { Invoice, Paise } from './types';
import { addDays } from './dates';

/** The seller's state. Customers in this state are charged CGST + SGST (R3). */
export const SELLER_STATE = 'Maharashtra';

export const DEFAULT_GST_RATE = 18;

export interface GstSplit {
  cgst: Paise;
  sgst: Paise;
  igst: Paise;
}

/**
 * numerator ÷ denominator rounded to the nearest whole number, halves up.
 * Done in whole numbers so a value such as 6750.5 paise is never misread
 * because of floating-point error.
 */
export function divideRoundHalfUp(numerator: number, denominator: number): number {
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
    return Math.round(numerator / denominator);
  }
  const quotient = Math.floor(numerator / denominator);
  const remainder = numerator - quotient * denominator;
  return remainder * 2 >= denominator ? quotient + 1 : quotient;
}

/**
 * R3. In Maharashtra: CGST and SGST at half the rate each. Elsewhere: IGST at the full rate.
 * Each component is rounded to the paisa, halves up.
 */
export function gstSplit(state: string, taxable: Paise, ratePct: number): GstSplit {
  if (state.trim().toLowerCase() === SELLER_STATE.toLowerCase()) {
    const half = divideRoundHalfUp(taxable * ratePct, 200);
    return { cgst: half, sgst: half, igst: 0 };
  }
  return { cgst: 0, sgst: 0, igst: divideRoundHalfUp(taxable * ratePct, 100) };
}

/** Invoice total = taxable value + GST (R3). */
export function totalWithGst(taxable: Paise, gst: GstSplit): Paise {
  return taxable + gst.cgst + gst.sgst + gst.igst;
}

/** R2. Invoice date + the customer's credit days, in calendar days. */
export function dueDate(invoiceDate: string, creditDays: number): string {
  return addDays(invoiceDate, creditDays);
}

/**
 * R7. A credit note's GST uses the invoice's rate and the invoice's split
 * (IGST if the invoice charged IGST, otherwise CGST + SGST).
 */
export function creditNoteGst(invoice: Invoice, taxable: Paise): GstSplit {
  const intraState = invoice.igst === 0;
  return gstSplit(intraState ? SELLER_STATE : 'Other', taxable, invoice.gstRatePct);
}
