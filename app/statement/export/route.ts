import type { NextRequest } from 'next/server';
import { loadArData } from '@/lib/ar/load';
import { fyStart, isIsoDate, statement } from '@/lib/ar';
import { parseAsOf } from '@/lib/asof';
import { csvHeaders, statementCsv } from '@/lib/exports';

/** GET /statement/export?customer=…&from=…&to=… → the statement as a CSV download. */
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const asof = parseAsOf(p.get('asof') ?? undefined);
  const to = isIsoDate(p.get('to') ?? '') ? p.get('to')! : asof;
  const from = isIsoDate(p.get('from') ?? '') ? p.get('from')! : fyStart(to);
  const data = await loadArData();
  const customer = data.customers.find((c) => c.id === Number(p.get('customer')));
  if (!customer) return new Response('Choose a customer.', { status: 400 });
  if (from > to) return new Response('The From date must be on or before the To date.', { status: 400 });
  const csv = statementCsv(customer, statement(data, customer.id, from, to));
  return new Response(csv, { headers: csvHeaders(`Statement_${customer.code}_${from}_to_${to}.csv`) });
}
