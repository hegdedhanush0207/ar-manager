import Link from 'next/link';
import { loadArData } from '@/lib/ar/load';
import { BUCKETS, balanceCheck, dashboardSummary, followUpsDue, invoiceRows, promiseStatuses, receiptPositions } from '@/lib/ar';
import type { SearchParams } from '@/lib/asof';
import { href } from '@/lib/asof';
import { formatBalance, formatDate, formatMoney, formatPct } from '@/lib/format';
import { readPage } from '@/lib/page';
import { Alert, Badge, Balance, ButtonLink, Empty, Money, PageHeader, Section, Stat, StatusBadges, TableWrap, Td, Th } from '@/components/ui';

/** Reads live data and the as-at date on every request (see app/layout.tsx). */
export const instant = false;

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { asof } = await readPage(searchParams);
  const data = await loadArData();
  const s = dashboardSummary(data, asof);
  const customerById = new Map(data.customers.map((c) => [c.id, c]));
  const invoiceById = new Map(data.invoices.map((i) => [i.id, i]));

  const overdue = invoiceRows(data, asof)
    .filter((r) => r.status === 'Overdue')
    .sort((a, b) => b.daysLate - a.daysLate || a.invoice.invoiceNo.localeCompare(b.invoice.invoiceNo));
  const ageingRows = s.rows.filter((r) => r.outstanding !== 0 || r.unapplied !== 0);
  const overLimit = s.rows.filter((r) => r.overLimit);
  const broken = promiseStatuses(data, asof).filter((p) => p.status === 'Broken');
  const followUps = followUpsDue(data, asof);
  const unapplied = receiptPositions(data, asof).filter((r) => r.unapplied > 0);
  const control = balanceCheck(data, asof);
  const bucketLink = (customerId: number | undefined, bucket: string) => href('/invoices', asof, { customer: customerId, bucket, sort: 'late', dir: 'desc' });

  return (
    <>
      <PageHeader title="Overdue at a glance" subtitle={`As at ${formatDate(asof)}`}>
        <ButtonLink href={href('/ageing/export', asof)}>Export ageing CSV</ButtonLink>
      </PageHeader>

      {control.length > 0 && (
        <Alert tone="error">
          Control check failed (R14) for {control.map((c) => c.code).join(', ')}: balances do not agree with the documents. Please report this.
        </Alert>
      )}

      <div className="mb-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total outstanding" note="On invoices">
          {formatMoney(s.outstanding)}
        </Stat>
        <Stat label="Unapplied credit" note="Received, not yet allocated">
          {formatMoney(s.unapplied)}
        </Stat>
        <Stat label="Net receivable" note="Outstanding − unapplied">
          {formatBalance(s.netReceivable)}
        </Stat>
        <Stat label="Overdue" tone={s.overdue > 0 ? 'bad' : 'default'} note={`${formatPct(s.overduePct)} of outstanding`}>
          {formatMoney(s.overdue)}
        </Stat>
        <Stat label="Overdue invoices" tone={s.overdueCount > 0 ? 'bad' : 'default'}>
          {s.overdueCount}
        </Stat>
        <Stat label="DSO" note={`Sales ${formatDate(s.dso.windowFrom)} to ${formatDate(s.dso.windowTo)}: ${formatMoney(s.dso.sales)}`}>
          {s.dso.dso === null ? '—' : `${s.dso.dso} days`}
        </Stat>
      </div>

      <Section title="Ageing by customer">
        {ageingRows.length === 0 ? (
          <Empty>Nothing outstanding as at {formatDate(asof)}.</Empty>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Customer</Th>
                {BUCKETS.map((b) => (
                  <Th key={b} numeric>
                    {b}
                  </Th>
                ))}
                <Th numeric>Outstanding</Th>
                <Th numeric>Unapplied credit</Th>
                <Th numeric>Net balance</Th>
              </tr>
            </thead>
            <tbody>
              {ageingRows.map((r) => (
                <tr key={r.customer.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={href(`/customers/${r.customer.id}`, asof)} className="text-blue-700 hover:underline">
                      {r.customer.code} · {r.customer.name}
                    </Link>
                    {r.overLimit && (
                      <span className="ml-1">
                        <Badge label="Over limit" />
                      </span>
                    )}
                  </Td>
                  {BUCKETS.map((b) => (
                    <Td key={b} numeric className={b !== 'Not due' && r.buckets[b] > 0 ? 'text-red-700' : ''}>
                      {r.buckets[b] === 0 ? (
                        <span className="text-slate-300">–</span>
                      ) : (
                        <Link href={bucketLink(r.customer.id, b)} className="hover:underline">
                          {formatMoney(r.buckets[b])}
                        </Link>
                      )}
                    </Td>
                  ))}
                  <Td numeric>
                    <Link href={href('/invoices', asof, { customer: r.customer.id, status: 'Open' })} className="hover:underline">
                      {formatMoney(r.outstanding)}
                    </Link>
                  </Td>
                  <Td numeric className={r.unapplied > 0 ? 'text-emerald-700' : ''}>
                    {r.unapplied === 0 ? <span className="text-slate-300">–</span> : formatMoney(r.unapplied)}
                  </Td>
                  <Td numeric className="font-medium">
                    <Balance paise={r.netBalance} />
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <Td>Total</Td>
                {BUCKETS.map((b) => (
                  <Td key={b} numeric>
                    <Link href={bucketLink(undefined, b)} className="hover:underline">
                      {formatMoney(s.totals.buckets[b])}
                    </Link>
                  </Td>
                ))}
                <Td numeric>{formatMoney(s.totals.outstanding)}</Td>
                <Td numeric>{formatMoney(s.totals.unapplied)}</Td>
                <Td numeric>{formatBalance(s.totals.netBalance)}</Td>
              </tr>
            </tfoot>
          </TableWrap>
        )}
        <p className="mt-1 text-xs text-slate-500">Buckets are days past the due date. Unapplied credit is shown in its own column and not netted off against any bucket.</p>
      </Section>

      <div className="grid gap-x-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Section title={`Overdue invoices (${overdue.length})`}>
            {overdue.length === 0 ? (
              <Empty>No overdue invoices as at {formatDate(asof)}.</Empty>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Customer</Th>
                    <Th>Due</Th>
                    <Th numeric>Days late</Th>
                    <Th numeric>Outstanding</Th>
                    <Th>Labels</Th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.map((r) => (
                    <tr key={r.invoice.id} className="bg-red-50 text-red-900">
                      <Td>
                        <Link href={href(`/invoices/${r.invoice.id}`, asof)} className="font-medium hover:underline">
                          {r.invoice.invoiceNo}
                        </Link>
                      </Td>
                      <Td>{r.customer?.code} · {r.customer?.name}</Td>
                      <Td>{formatDate(r.invoice.dueDate)}</Td>
                      <Td numeric className="font-semibold">
                        {r.daysLate}
                      </Td>
                      <Td numeric>
                        <Money paise={r.outstanding} />
                      </Td>
                      <Td>
                        <StatusBadges status="Overdue" partPaid={r.isPartPaid} disputed={r.invoice.isDisputed} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Section>
        </div>

        <div className="lg:col-span-2">
          <Section title="Needs attention">
            <div className="space-y-4">
              <Attention title="Over credit limit" count={overLimit.length}>
                {overLimit.map((r) => (
                  <li key={r.customer.id}>
                    <Link href={href(`/customers/${r.customer.id}`, asof)} className="text-blue-700 hover:underline">
                      {r.customer.code} · {r.customer.name}
                    </Link>{' '}
                    {formatBalance(r.netBalance)} against {formatMoney(r.customer.creditLimit)} ({formatPct(r.limitUsedPct)})
                  </li>
                ))}
              </Attention>
              <Attention title="Broken promises" count={broken.length}>
                {broken.map((p) => {
                  const c = customerById.get(p.note.customerId);
                  return (
                    <li key={p.note.id}>
                      <Link href={href(`/customers/${p.note.customerId}`, asof)} className="text-blue-700 hover:underline">
                        {c?.code} · {c?.name}
                      </Link>{' '}
                      promised {formatMoney(p.promiseAmount)} by {formatDate(p.promiseDate)} (noted {formatDate(p.note.noteDate)}); received {formatMoney(p.receivedInWindow)}
                    </li>
                  );
                })}
              </Attention>
              <Attention title="Follow-ups due" count={followUps.length}>
                {followUps.map((n) => {
                  const c = customerById.get(n.customerId);
                  const inv = n.invoiceId ? invoiceById.get(n.invoiceId) : undefined;
                  return (
                    <li key={n.id}>
                      <span className="font-medium">{formatDate(n.followUpDate)}</span>{' '}
                      <Link href={href(`/customers/${n.customerId}`, asof)} className="text-blue-700 hover:underline">
                        {c?.code} · {c?.name}
                      </Link>
                      {inv && <> · {inv.invoiceNo}</>}
                      <div className="text-slate-600">{n.body}</div>
                    </li>
                  );
                })}
              </Attention>
              <Attention title="Unapplied credit to allocate" count={unapplied.length}>
                {unapplied.map((r) => {
                  const c = customerById.get(r.receipt.customerId);
                  return (
                    <li key={r.receipt.id}>
                      <Link href={href(`/customers/${r.receipt.customerId}`, asof)} className="text-blue-700 hover:underline">
                        {c?.code} · {c?.name}
                      </Link>{' '}
                      {r.receipt.receiptNo} of {formatDate(r.receipt.receiptDate)}: {formatMoney(r.unapplied)} unapplied
                    </li>
                  );
                })}
              </Attention>
            </div>
          </Section>
        </div>
      </div>
      <p className="text-xs text-slate-400">Control check (R14): {control.length === 0 ? 'every customer balance agrees with its documents.' : 'differences found.'}</p>
    </>
  );
}

function Attention({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <h3 className={`mb-1 font-medium ${count > 0 ? 'text-red-800' : 'text-slate-600'}`}>
        {title} ({count})
      </h3>
      {count === 0 ? <p className="text-slate-400">None.</p> : <ul className="space-y-1.5">{children}</ul>}
    </div>
  );
}
