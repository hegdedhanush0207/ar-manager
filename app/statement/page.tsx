import Link from 'next/link';
import { loadArData } from '@/lib/ar/load';
import { BUCKETS, fyStart, isIsoDate, statement } from '@/lib/ar';
import type { SearchParams } from '@/lib/asof';
import { href } from '@/lib/asof';
import { formatBalance, formatDate, formatMoney } from '@/lib/format';
import { readPage } from '@/lib/page';
import { SELLER } from '@/lib/seller';
import { withParams } from '@/lib/table';
import { PrintButton } from '@/components/PrintButton';
import { Alert, ButtonLink, Empty, PageHeader, TableWrap, Td, Th } from '@/components/ui';
import { inputClass } from '@/components/form';

/** Reads live data and the as-at date on every request (see app/layout.tsx). */
export const instant = false;

export default async function StatementPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { asof, params } = await readPage(searchParams);
  const data = await loadArData();
  const to = isIsoDate(params.to ?? '') ? params.to : asof;
  const from = isIsoDate(params.from ?? '') ? params.from : fyStart(to);
  const customer = data.customers.find((c) => c.id === Number(params.customer));
  const badRange = from > to;
  const s = customer && !badRange ? statement(data, customer.id, from, to) : null;
  const label = 'mb-1 block text-xs font-medium text-slate-600';

  return (
    <>
      <div className="print:hidden">
        <PageHeader title="Statement of account" subtitle="Opening balance, every invoice, credit note, payment and TDS in the period, and a running balance (R15).">
          {s && customer && (
            <>
              <ButtonLink href={withParams('/statement/export', {}, { customer: String(customer.id), from, to, asof })}>Export CSV</ButtonLink>
              <PrintButton />
            </>
          )}
        </PageHeader>
        <form action="/statement" className="mb-6 flex flex-wrap items-end gap-3">
          <input type="hidden" name="asof" value={asof} />
          <label className="w-72">
            <span className={label}>Customer</span>
            <select name="customer" defaultValue={customer?.id ?? ''} className={inputClass} required>
              <option value="">Choose…</option>
              {data.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>From</span>
            <input type="date" name="from" defaultValue={from} className={inputClass} required />
          </label>
          <label>
            <span className={label}>To</span>
            <input type="date" name="to" defaultValue={to} className={inputClass} required />
          </label>
          <button className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50">Show statement</button>
        </form>
      </div>

      {badRange && <Alert tone="error">The From date must be on or before the To date.</Alert>}
      {!customer && !badRange && <Empty>Choose a customer and a period.</Empty>}

      {s && customer && (
        <article className="rounded border border-slate-200 bg-white p-6 print:border-0 print:p-0">
          <header className="mb-5 flex flex-wrap justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="text-lg font-semibold">{SELLER.name}</div>
              <div className="text-slate-600">{SELLER.addressLine}, {SELLER.state}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">Statement of account</div>
              <div>
                {formatDate(from)} to {formatDate(to)}
              </div>
            </div>
          </header>
          <div className="mb-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">Customer</div>
            <div className="font-medium">
              <Link href={href(`/customers/${customer.id}`, asof)} className="hover:underline">
                {customer.name}
              </Link>{' '}
              ({customer.code})
            </div>
            <div className="text-slate-600">
              {customer.city}, {customer.state}
              {customer.gstin ? ` · GSTIN ${customer.gstin}` : ''}
            </div>
          </div>

          <TableWrap>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Document</Th>
                <Th>Particulars</Th>
                <Th numeric>Debit</Th>
                <Th numeric>Credit</Th>
                <Th numeric>Balance</Th>
              </tr>
            </thead>
            <tbody>
              <tr className="font-medium">
                <Td className="whitespace-nowrap">{formatDate(from)}</Td>
                <Td />
                <Td>Opening balance</Td>
                <Td />
                <Td />
                <Td numeric>{formatBalance(s.opening)}</Td>
              </tr>
              {s.lines.map((l, i) => (
                <tr key={i} className="break-inside-avoid">
                  <Td className="whitespace-nowrap">{formatDate(l.date)}</Td>
                  <Td className="whitespace-nowrap">{l.documentNo}</Td>
                  <Td>{l.kind === 'Invoice' ? `Invoice: ${l.description}` : l.description}</Td>
                  <Td numeric>{l.debit ? formatMoney(l.debit) : ''}</Td>
                  <Td numeric>{l.credit ? formatMoney(l.credit) : ''}</Td>
                  <Td numeric>{formatBalance(l.balance)}</Td>
                </tr>
              ))}
              {s.lines.length === 0 && (
                <tr>
                  <Td />
                  <Td />
                  <Td className="text-slate-500">No transactions in this period.</Td>
                  <Td />
                  <Td />
                  <Td />
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <Td className="whitespace-nowrap">{formatDate(to)}</Td>
                <Td />
                <Td>Closing balance</Td>
                <Td numeric>{formatMoney(s.totalDebit)}</Td>
                <Td numeric>{formatMoney(s.totalCredit)}</Td>
                <Td numeric>{formatBalance(s.closing)}</Td>
              </tr>
            </tfoot>
          </TableWrap>

          <section className="mt-6 break-inside-avoid">
            <h2 className="mb-2 font-semibold">Ageing of the closing balance as at {formatDate(to)}</h2>
            <TableWrap>
              <thead>
                <tr>
                  {BUCKETS.map((b) => (
                    <Th key={b} numeric>
                      {b === 'Not due' ? 'Not yet due' : `${b} days`}
                    </Th>
                  ))}
                  <Th numeric>Unapplied credit</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {BUCKETS.map((b) => (
                    <Td key={b} numeric>
                      {formatMoney(s.buckets[b])}
                    </Td>
                  ))}
                  <Td numeric>{formatMoney(s.unapplied)}</Td>
                </tr>
              </tbody>
            </TableWrap>
            <p className="mt-2 text-xs text-slate-500">
              Ageing is by days past the due date. Unapplied credit is payment received but not yet matched to invoices; the closing balance is net of it. Cancelled invoices are not shown.
            </p>
          </section>
        </article>
      )}
    </>
  );
}
