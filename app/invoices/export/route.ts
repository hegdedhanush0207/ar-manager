import type { NextRequest } from 'next/server';
import { loadArData } from '@/lib/ar/load';
import { parseAsOf } from '@/lib/asof';
import { csvHeaders, invoiceListCsv } from '@/lib/exports';
import { filteredInvoiceRows } from '@/lib/invoiceList';

/** GET /invoices/export?asof=…&(same filters as the list) → the filtered invoice list as CSV. */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const asof = parseAsOf(params.asof);
  const data = await loadArData();
  const rows = filteredInvoiceRows(data, asof, { ...params, asof });
  return new Response(invoiceListCsv(rows, asof), { headers: csvHeaders(`Invoices_as_at_${asof}.csv`) });
}
