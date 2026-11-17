/**
 * Reads a page's URL parameters: the as-at date (R10) plus filters and sorting.
 */
import { parseAsOf, type SearchParams } from './asof';
import { flatParams } from './table';

export async function readPage(searchParams: Promise<SearchParams>) {
  const sp = await searchParams;
  const asof = parseAsOf(sp.asof);
  const params: Record<string, string> = { ...flatParams(sp), asof };
  return { asof, params };
}
