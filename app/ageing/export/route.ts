import type { NextRequest } from 'next/server';
import { loadArData } from '@/lib/ar/load';
import { customerPositions, totalPositions } from '@/lib/ar';
import { parseAsOf } from '@/lib/asof';
import { ageingCsv, csvHeaders } from '@/lib/exports';

/** GET /ageing/export?asof=… → ageing by customer as CSV (customers with any balance). */
export async function GET(request: NextRequest) {
  const asof = parseAsOf(request.nextUrl.searchParams.get('asof') ?? undefined);
  const data = await loadArData();
  const rows = customerPositions(data, asof).filter((r) => r.outstanding !== 0 || r.unapplied !== 0);
  return new Response(ageingCsv(rows, totalPositions(rows), asof), { headers: csvHeaders(`Ageing_as_at_${asof}.csv`) });
}
