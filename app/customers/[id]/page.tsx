import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadArData } from '@/lib/ar/load';
import { BUCKETS, SELLER_STATE, customerPosition, fyStart, invoiceRows, notesAsAt, promiseStatus, receiptPositions } from '@/lib/ar';
import { setCustomerActive } from '@/lib/actions/customers';
import type { SearchParams } from '@/lib/asof';
import { href } from '@/lib/asof';
import { formatBalance, formatDate, formatMoney, formatPct } from '@/lib/format';
import { readPage } from '@/lib/page';
import { Alert, Badge, Balance, ButtonLink, Empty, Money, PageHeader, Section, Stat, StatusBadges, TableWrap, Td, Th } from '@/components/ui';

/** Reads live data and the as-at date on every request (see app/layout.tsx). */
export const instant = false;

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const { asof } = await readPage(searchParams);
  const id = Number((await params).id);
  const data = await loadArData();
  const pos = customerPosition(data, id, asof);
  if (!pos) notFound();
  const c = pos.customer;

  const invoices = invoiceRows(data, asof)
    .filter((r) => r.invoice.customerId === id)
    .sort((a, b) => b.invoice.invoiceDate.localeCompare(a.invoice.invoiceDate) || b.invoice.invoiceNo.localeCompare(a.invoice.invoiceNo));
  const receipts = receiptPositions(data, asof)
    .filter((r) => r.receipt.customerId === id)
    .sort((a, b) => b.receipt.receiptDate.localeCompare(a.receipt.receiptDate));
  const invoiceById = new Map(data.invoices.map((i) => [i.id, i]));
  const notes = notesAsAt(data, asof)
    .filter((n) => n.customerId === id)
    .sort((a, b) => b.noteDate.localeCompare(a.noteDate) || b.id - a.id);

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {c.code} · {c.name} <Badge label={c.isActive ? 'Active' : 'Inactive'} />
          </span>
        }
        subtitle={`As at ${formatDate(asof)}`}
      >
        {c.isActive && (
          <ButtonLink href={href('/invoices/new', asof, { customer: id })} primary>
            New invoice
          </ButtonLink>
        )}
        <ButtonLink href={href('/receipts/new', asof, { customer: id })}>Record payment</ButtonLink>
        <ButtonLink href={href('/statement', asof, { customer: id, from: fyStart(asof), to: asof })}>Statement</ButtonLink>
        <ButtonLink href={href(`/customers/${id}/edit`, asof)}>Edit</ButtonLink>
        <form action={setCustomerActive}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="active" value={c.isActive ? 'false' : 'true'} />
          <button className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
            {c.isActive ? 'Deactivate' : 'Reactivate'}
          </button>
        </form>
      </PageHeader>

      {!c.isActive && <Alert tone="info">This customer is inactive: no new invoices can be raised. Payments and notes can still be recorded.</Alert>}
      {pos.overLimit && (
        <Alert tone="error">
          Over credit limit: net balance {formatBalance(pos.netBalance)} against a limit of {formatMoney(c.creditLimit)} ({formatPct(pos.limitUsedPct)} used).
        </Alert>
      )}

      <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Net balance" tone={pos.netBalance < 0 ? 'good' : 'default'}>
          {formatBalance(pos.netBalance)}
        </Stat>
        <Stat label="Invoices outstanding">{formatMoney(pos.outstanding)}</Stat>
        <Stat label="Unapplied credit">{formatMoney(pos.unapplied)}</Stat>
        <Stat label="Overdue" tone={pos.overdue > 0 ? 'bad' : 'default'} note={`${pos.overdueCount} invoice(s)`}>
          {formatMoney(pos.overdue)}
        </Stat>
        <Stat label="Credit limit" note={`${formatPct(pos.limitUsedPct)} used`}>
          {formatMoney(c.creditLimit)}
        </Stat>
      </div>
      <div className="mb-6 rounded border border-slate-200 bg-white px-3 py-2 text-slate-700">
        <span className="font-medium">Ageing:</span>{' '}
        {BUCKETS.map((b, i) => (
          <span key={b} className={b !== 'Not due' && pos.buckets[b] > 0 ? 'text-red-700' : ''}>
            {i > 0 && ' · '}
            {b} {formatMoney(pos.buckets[b])}
          </span>
        ))}
        {pos.unapplied > 0 && <span> · Unapplied credit {formatMoney(pos.unapplied)} (shown separately, not netted off)</span>}
      </div>

      <div className="grid gap-x-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Profile">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 rounded border border-slate-200 bg-white p-3 sm:grid-cols-3">
              {[
                ['City, state', `${c.city}, ${c.state}`],
                ['Contact person', c.contactPerson],
                ['Email', c.email],
                ['Phone', c.phone ?? '—'],
                ['GSTIN', c.gstin ?? '—'],
                ['Credit days', String(c.creditDays)],
                ['TDS rate', `${c.tdsRatePct}%`],
                ['GST', c.state === SELLER_STATE ? 'CGST + SGST' : 'IGST'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="Invoices" actions={<ButtonLink href={href('/invoices', asof, { customer: id })}>Open in invoice list</ButtonLink>}>
            {invoices.length === 0 ? (
              <Empty>No invoices dated on or before {formatDate(asof)}.</Empty>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Number</Th>
                    <Th>Date</Th>
                    <Th>Due</Th>
                    <Th numeric>Total</Th>
                    <Th numeric>Outstanding</Th>
                    <Th>Status</Th>
                    <Th numeric>Days late</Th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((r) => (
                    <tr key={r.invoice.id} className={r.status === 'Overdue' ? 'bg-red-50/60' : ''}>
                      <Td>
                        <Link href={href(`/invoices/${r.invoice.id}`, asof)} className="text-blue-700 hover:underline">
                          {r.invoice.invoiceNo}
                        </Link>
                      </Td>
                      <Td>{formatDate(r.invoice.invoiceDate)}</Td>
                      <Td>{formatDate(r.invoice.dueDate)}</Td>
                      <Td numeric className={r.status === 'Cancelled' ? 'text-slate-400 line-through' : ''}>
                        <Money paise={r.invoice.total} />
                      </Td>
                      <Td numeric>{r.status === 'Cancelled' ? '—' : <Money paise={r.outstanding} />}</Td>
                      <Td>
                        <StatusBadges status={r.status} partPaid={r.isPartPaid} disputed={r.invoice.isDisputed} />
                      </Td>
                      <Td numeric className={r.daysLate > 0 ? 'text-red-700' : ''}>
                        {r.daysLate > 0 ? r.daysLate : ''}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Section>

          <Section title="Receipts">
            {receipts.length === 0 ? (
              <Empty>No receipts dated on or before {formatDate(asof)}.</Empty>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Receipt</Th>
                    <Th>Date</Th>
                    <Th numeric>Bank</Th>
                    <Th numeric>TDS</Th>
                    <Th numeric>Settlement</Th>
                    <Th>Allocated to</Th>
                    <Th numeric>Unapplied</Th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r) => {
                    const allocs = data.allocations.filter((a) => a.receiptId === r.receipt.id && a.allocationDate <= asof);
                    return (
                      <tr key={r.receipt.id}>
                        <Td>
                          {r.receipt.receiptNo}
                          <div className="text-xs text-slate-500">
                            {r.receipt.mode} {r.receipt.reference}
                          </div>
                        </Td>
                        <Td>{formatDate(r.receipt.receiptDate)}</Td>
                        <Td numeric>
                          <Money paise={r.receipt.bankAmount} />
                        </Td>
                        <Td numeric>
                          <Money paise={r.receipt.tdsAmount} />
                        </Td>
                        <Td numeric>
                          <Money paise={r.settlement} />
                        </Td>
                        <Td>
                          {allocs.length === 0 && <span className="text-slate-400">—</span>}
                          {allocs.map((a) => (
                            <div key={a.id} className="whitespace-nowrap">
                              {invoiceById.get(a.invoiceId)?.invoiceNo} <Money paise={a.amount} />{' '}
                              <span className="text-xs text-slate-500">on {formatDate(a.allocationDate)}</span>
                            </div>
                          ))}
                        </Td>
                        <Td numeric className={r.unapplied > 0 ? 'font-semibold text-emerald-700' : ''}>
                          <Money paise={r.unapplied} />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            )}
          </Section>
        </div>

        <div>
          <Section title="Notes timeline">
            {notes.length === 0 ? (
              <Empty>No notes yet.</Empty>
            ) : (
              <ol className="space-y-3">
                {notes.map((n) => {
                  const promise = promiseStatus(data, n, asof);
                  const inv = n.invoiceId ? invoiceById.get(n.invoiceId) : undefined;
                  return (
                    <li key={n.id} className="rounded border border-slate-200 bg-white p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{formatDate(n.noteDate)}</span>
                        <Badge label={n.noteType} />
                        {inv && (
                          <Link href={href(`/invoices/${inv.id}`, asof)} className="text-blue-700 hover:underline">
                            {inv.invoiceNo}
                          </Link>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap">{n.body}</p>
                      {promise && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          Promise: {formatMoney(promise.promiseAmount)} by {formatDate(promise.promiseDate)} <Badge label={promise.status} />
                        </div>
                      )}
                      {n.followUpDate && (
                        <div className="mt-1 text-xs">
                          Follow up {formatDate(n.followUpDate)} {n.followUpDone ? '(done)' : n.followUpDate <= asof ? <span className="font-medium text-red-700">(due)</span> : ''}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>
        </div>
      </div>
      <p className="text-xs text-slate-400">Net balance = invoices outstanding {formatMoney(pos.outstanding)} − unapplied credit {formatMoney(pos.unapplied)} = <Balance paise={pos.netBalance} /></p>
    </>
  );
}
