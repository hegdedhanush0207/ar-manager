import sample from './fixtures/sample.json';
import { toArData, type RawArData } from '../lib/ar/map';
import type { ArData } from '../lib/ar/types';

/** A fresh copy of the sample data for each test, so tests can add records without affecting each other. */
export function sampleData(): ArData {
  return toArData(structuredClone(sample) as RawArData);
}

export const rupees = (r: number) => Math.round(r * 100);

export function byNo(data: ArData, invoiceNo: string) {
  const i = data.invoices.find((x) => x.invoiceNo === invoiceNo);
  if (!i) throw new Error(`No invoice ${invoiceNo}`);
  return i;
}

export function byCode(data: ArData, code: string) {
  const c = data.customers.find((x) => x.code === code);
  if (!c) throw new Error(`No customer ${code}`);
  return c;
}
