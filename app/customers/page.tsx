import Link from 'next/link';
import { loadArData } from '@/lib/ar/load';
import { customerPositions, type CustomerPosition } from '@/lib/ar';
import type { SearchParams } from '@/lib/asof';
import { href } from '@/lib/asof';
import { formatDate, formatPct } from '@/lib/format';
import { readPage } from '@/lib/page';
import { sortRows, withParams, type Dir } from '@/lib/table';
import { Badge, Balance, ButtonLink, Empty, Money, PageHeader, SortTh, TableWrap, Td } from '@/components/ui';
import { inputClass } from '@/components/form';

/** Reads live data and the as-at date on every request (see app/layout.tsx). */
export const instant = false;

const SORT: Record<string, (p: CustomerPosition) => string | number | null> = {
  code: (p) => p.customer.code,
  name: (p) => p.customer.name,
  place: (p) => `${p.customer.city}, ${p.customer.state}`,
  contact: (p) => p.customer.contactPerson,
  days: (p) => p.customer.creditDays,
  limit: (p) => p.customer.creditLimit,
  balance: (p) => p.netBalance,
  overdue: (p) => p.overdue,
  used: (p) => p.limitUsedPct,
  status: (p) => (p.customer.isActive ? 'Active' : 'Inactive'),
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { asof, params } = await readPage(searchParams);
  const data = await loadArData();

  const q = (params.q ?? '').trim().toLowerCase();
  const show = params.show ?? 'all';
  let rows = customerPositions(data, asof).filter((p) => {
    const c = p.customer;
    if (show === 'active' && !c.isActive) return false;
    if (show === 'inactive' && c.isActive) return false;
    if (!q) return true;
    return [c.code, c.name, c.contactPerson, c.email].some((s) => s.toLowerCase().includes(q));
  });
  rows = sortRows(rows, SORT, params.sort ?? 'code', (params.dir as Dir) ?? 'asc');

  return (
    <>
      <PageHeader title="Customers" subtitle={`Balances as at ${formatDate(asof)}`}>
        <ButtonLink href={href('/customers/new', asof)} primary>
          Add customer
        </ButtonLink>
      </PageHeader>

      <form className="mb-4 flex flex-wrap items-end gap-3 print:hidden" action="/customers">
        <input type="hidden" name="asof" value={asof} />
        <label className="w-72">
          <span className="mb-1 block text-xs font-medium text-slate-600">Search code, name, contact or email</span>
          <input name="q" defaultValue={params.q ?? ''} className={inputClass} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-600">Show</span>
          <select name="show" defaultValue={show} className={inputClass}>
            <option value="all">All customers</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </label>
        <button className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50">Apply</button>
        {(q || show !== 'all') && (
          <Link href={withParams('/customers', { asof }, {})} className="py-1.5 text-blue-700 underline">
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <Empty>No customers match.</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <SortTh label="Code" col="code" path="/customers" params={params} />
              <SortTh label="Name" col="name" path="/customers" params={params} />
              <SortTh label="City, state" col="place" path="/customers" params={params} />
              <SortTh label="Contact" col="contact" path="/customers" params={params} />
              <SortTh label="Credit days" col="days" path="/customers" params={params} numeric />
              <SortTh label="Credit limit" col="limit" path="/customers" params={params} numeric />
              <SortTh label="Balance" col="balance" path="/customers" params={params} numeric />
              <SortTh label="Overdue" col="overdue" path="/customers" params={params} numeric />
              <SortTh label="Limit used" col="used" path="/customers" params={params} numeric />
              <SortTh label="Status" col="status" path="/customers" params={params} />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.customer.id} className="hover:bg-slate-50">
                <Td>
                  <Link href={href(`/customers/${p.customer.id}`, asof)} className="font-medium text-blue-700 hover:underline">
                    {p.customer.code}
                  </Link>
                </Td>
                <Td>
                  <Link href={href(`/customers/${p.customer.id}`, asof)} className="hover:underline">
                    {p.customer.name}
                  </Link>
                </Td>
                <Td>
                  {p.customer.city}, {p.customer.state}
                </Td>
                <Td>
                  {p.customer.contactPerson}
                  <div className="text-xs text-slate-500">{p.customer.email}</div>
                </Td>
                <Td numeric>{p.customer.creditDays}</Td>
                <Td numeric>
                  <Money paise={p.customer.creditLimit} />
                </Td>
                <Td numeric>
                  <Balance paise={p.netBalance} />
                </Td>
                <Td numeric className={p.overdue > 0 ? 'text-red-700' : ''}>
                  <Money paise={p.overdue} />
                </Td>
                <Td numeric className={p.overLimit ? 'font-semibold text-red-700' : ''}>
                  {formatPct(p.limitUsedPct)}
                </Td>
                <Td>
                  <span className="inline-flex gap-1">
                    <Badge label={p.customer.isActive ? 'Active' : 'Inactive'} />
                    {p.overLimit && <Badge label="Over limit" />}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
