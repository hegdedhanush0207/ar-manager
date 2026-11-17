import Link from 'next/link';
import { loadArData } from '@/lib/ar/load';
import { invoiceTotals } from '@/lib/ar';
import type { SearchParams } from '@/lib/asof';
import { href } from '@/lib/asof';
import { formatDate } from '@/lib/format';
import { filteredInvoiceRows } from '@/lib/invoiceList';
import { readPage } from '@/lib/page';
import { withParams } from '@/lib/table';
import { ButtonLink, Empty, Money, PageHeader, SortTh, StatusBadges, TableWrap, Td } from '@/components/ui';
import { inputClass } from '@/components/form';

/** Reads live data and the as-at date on every request (see app/layout.tsx). */
export const instant = false;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { asof, params } = await readPage(searchParams);
  const data = await loadArData();
  const rows = filteredInvoiceRows(data, asof, params);
  const totals = invoiceTotals(rows);
  const filtered = ['q', 'customer', 'status', 'disputed', 'from', 'to', 'bucket'].some((k) => params[k]);
  const sortTh = (label: string, col: string, numeric = false) => <SortTh label={label} col={col} path="/invoices" params={params} numeric={numeric} />;
  const label = 'mb-1 block text-xs font-medium text-slate-600';

  return (
    <>
      <PageHeader title="Invoices" subtitle={`Positions as at ${formatDate(asof)}`}>
        <ButtonLink href={withParams('/invoices/export', params, { sort: params.sort, dir: params.dir })}>Export CSV</ButtonLink>
        <ButtonLink href={href('/invoices/new', asof)} primary>
          New invoice
        </ButtonLink>
      </PageHeader>

      <form action="/invoices" className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <input type="hidden" name="asof" value={asof} />
        {params.bucket && <input type="hidden" name="bucket" value={params.bucket} />}
        <label className="w-40">
          <span className={label}>Invoice number</span>
          <input name="q" defaultValue={params.q ?? ''} placeholder="e.g. 0007" className={inputClass} />
        </label>
        <label className="w-56">
          <span className={label}>Customer</span>
          <select name="customer" defaultValue={params.customer ?? ''} className={inputClass}>
            <option value="">All customers</option>
            {data.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>Status</span>
          <select name="status" defaultValue={params.status ?? ''} className={inputClass}>
            <option value="">All</option>
            <option value="Open">Open (due or overdue)</option>
            <option>Overdue</option>
            <option>Due</option>
            <option>Paid</option>
            <option>Cancelled</option>
          </select>
        </label>
        <label>
          <span className={label}>Disputed</span>
          <select name="disputed" defaultValue={params.disputed ?? ''} className={inputClass}>
            <option value="">Any</option>
            <option value="yes">Disputed</option>
            <option value="no">Not disputed</option>
          </select>
        </label>
        <label>
          <span className={label}>Invoice date from</span>
          <input type="date" name="from" defaultValue={params.from ?? ''} className={inputClass} />
        </label>
        <label>
          <span className={label}>to</span>
          <input type="date" name="to" defaultValue={params.to ?? ''} className={inputClass} />
        </label>
        <button className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50">Apply</button>
        {filtered && (
          <Link href={withParams('/invoices', { asof }, {})} className="py-1.5 text-blue-700 underline">
            Clear filters
          </Link>
        )}
      </form>
      {params.bucket && <p className="mb-3 text-slate-600">Showing ageing bucket <b>{params.bucket}</b> only.</p>}

      {rows.length === 0 ? (
        <Empty>No invoices match these filters as at {formatDate(asof)}.</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              {sortTh('Number', 'number')}
              {sortTh('Customer', 'customer')}
              {sortTh('Invoice date', 'date')}
              {sortTh('Due date', 'due')}
              {sortTh('Total', 'total', true)}
              {sortTh('Received', 'received', true)}
              {sortTh('Credited', 'credited', true)}
              {sortTh('Outstanding', 'outstanding', true)}
              {sortTh('Status', 'status')}
              {sortTh('Days late', 'late', true)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cancelled = r.status === 'Cancelled';
              return (
                <tr key={r.invoice.id} className={r.status === 'Overdue' ? 'bg-red-50 text-red-900' : cancelled ? 'text-slate-400' : ''}>
                  <Td>
                    <Link href={href(`/invoices/${r.invoice.id}`, asof)} className="font-medium text-blue-700 hover:underline">
                      {r.invoice.invoiceNo}
                    </Link>
                  </Td>
                  <Td>
                    <Link href={href(`/customers/${r.invoice.customerId}`, asof)} className="hover:underline">
                      {r.customer?.code} · {r.customer?.name}
                    </Link>
                  </Td>
                  <Td>{formatDate(r.invoice.invoiceDate)}</Td>
                  <Td>{formatDate(r.invoice.dueDate)}</Td>
                  <Td numeric className={cancelled ? 'line-through' : ''}>
                    <Money paise={r.invoice.total} />
                  </Td>
                  <Td numeric>{cancelled ? '—' : <Money paise={r.received} />}</Td>
                  <Td numeric>{cancelled ? '—' : <Money paise={r.credited} />}</Td>
                  <Td numeric className="font-medium">
                    {cancelled ? '—' : <Money paise={r.outstanding} />}
                  </Td>
                  <Td>
                    <StatusBadges status={r.status} partPaid={r.isPartPaid} disputed={r.invoice.isDisputed} />
                  </Td>
                  <Td numeric className={r.daysLate > 0 ? 'font-semibold text-red-700' : ''}>
                    {r.daysLate > 0 ? r.daysLate : ''}
                  </Td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <Td>Totals</Td>
              <Td className="font-normal text-slate-500">
                {totals.count} invoice(s){rows.length > totals.count ? `; ${rows.length - totals.count} cancelled not counted` : ''}
              </Td>
              <Td />
              <Td />
              <Td numeric>
                <Money paise={totals.total} />
              </Td>
              <Td numeric>
                <Money paise={totals.received} />
              </Td>
              <Td numeric>
                <Money paise={totals.credited} />
              </Td>
              <Td numeric>
                <Money paise={totals.outstanding} />
              </Td>
              <Td />
              <Td />
            </tr>
          </tfoot>
        </TableWrap>
      )}
    </>
  );
}
