/**
 * zod building blocks for form fields. Forms send strings; these turn them into
 * checked values (amounts become whole paise here, once).
 */
import { z } from 'zod';
import { isIsoDate } from '../ar/dates';
import { parseRupees } from '../format';

export const requiredText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be at most ${max} characters.`);

export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters.`)
    .transform((s) => (s === '' ? null : s));

export const isoDate = (label: string) =>
  z.string().trim().refine(isIsoDate, `${label} must be a valid date.`);

export const optionalIsoDate = (label: string) =>
  z
    .string()
    .trim()
    .refine((s) => s === '' || isIsoDate(s), `${label} must be a valid date.`)
    .transform((s) => (s === '' ? null : s));

/** Rupees as typed ('1,23,456.50') → whole paise. */
export const amount = (label: string, { min = 0, allowZero = true }: { min?: number; allowZero?: boolean } = {}) =>
  z
    .string()
    .trim()
    .transform((s, ctx) => {
      const p = parseRupees(s);
      if (p === null) {
        ctx.addIssue({ code: 'custom', message: `${label} must be an amount in rupees, with up to 2 decimals.` });
        return z.NEVER;
      }
      if (p < min || (!allowZero && p === 0)) {
        ctx.addIssue({ code: 'custom', message: allowZero ? `${label} cannot be negative.` : `${label} must be more than zero.` });
        return z.NEVER;
      }
      return p;
    });

export const optionalAmount = (label: string) =>
  z
    .string()
    .trim()
    .transform((s, ctx) => {
      if (s === '') return null;
      const p = parseRupees(s);
      if (p === null || p <= 0) {
        ctx.addIssue({ code: 'custom', message: `${label} must be an amount above zero.` });
        return z.NEVER;
      }
      return p;
    });

export const id = z.coerce.number().int().positive();
