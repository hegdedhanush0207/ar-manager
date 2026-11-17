import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadArData } from '@/lib/ar/load';
import { cancelProblem, invoiceAvailable, invoiceRows, nextNumber, todayInIndia } from '@/lib/ar';
import { setDisputed } from '@/lib/actions/invoices';
import { removeAllocation } from '@/lib/actions/receipts';
import { ConfirmButton } from '@/components/ConfirmButton';
import { ReturnTo } from '@/components/ReturnTo';
import { NoteForm } from '@/components/NoteForm';
import type { SearchParams } from '@/lib/asof';
import { href } from '@/lib/asof';
import { formatDate, formatMoney } from '@/lib/format';
import { readPage } from '@/lib/page';
import { CancelInvoiceButton, CreditNoteForm } from '@/components/InvoiceActions';
import { Alert, Badge, Empty, Money, PageHeader, Section, Stat, StatusBadges, TableWrap, Td, Th } from '@/components/ui';

/** Reads live data and the as-at date on every request (see app/layout.tsx). */
export const instant = false;

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const { asof } = await readPage(searchParams);
  const id = Number((await params).id);
  const data = await loadArData();
  const inv = data.invoices.find((i) => i.id === id);
  if (!inv) notFound();
  const customer = data.customers.find((c) => c.id === inv.customerId)!;
  const row = invoiceRows(data, asof).find((r) => r.invoice.id === id);

  const allocations = data.allocations.filter((a) => a.invoiceId === id).sort((a, b) => a.allocationDate.localeCompare(b.allocationDate));
  const creditNotes = data.creditNotes.filter((c) => c.invoiceId === id).sort((a, b) => a.creditNoteDate.localeCompare(b.creditNoteDate));
  const notes = data.notes.filter((n) => n.invoiceId === id && n.noteDate <= asof).sort((a, b) => b.noteDate.localeCompare(a.noteDate));
  const receiptById = new Map(data.receipts.map((r) => [r.id, r]));
  const later = allocations.filter((a) => a.allocationDate > asof).length + creditNotes.filter((c) => c.creditNoteDate > asof).length;
  const available = invoiceAvailable(data, id);
  const today = todayInIndia();
  const cnDate = today < inv.invoiceDate ? inv.invoiceDate : today;

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {inv.invoiceNo}
            {row ? <StatusBadges status={row.status} partPaid={row.isPartPaid} disputed={inv.isDisputed} /> : <Badge label="Not yet issued" />}
          </span>
        }
        subtitle={
          <>
            <Link href={href(`/customers/${customer.id}`, asof)} className="text-blue-700 hover:underline">
              {customer.code} · {customer.name}
            </Link>{' '}
            · {inv.description}
          </>
        }
      />

      {!row && <Alert tone="info">This invoice is dated {formatDate(inv.invoiceDate)}, after the as-at date {formatDate(asof)}, so it does not exist yet at that date.</Alert>}
      {inv.isCancelled && <Alert tone="info">Cancelled. The invoice keeps its number and is left out of every total, balance, ageing figure, statement and DSO (R8).</Alert>}
      {inv.isDisputed && <Alert tone="warn">Disputed: the customer disputes this invoice. The label changes no amount.</Alert>}

      {row && !inv.isCancelled && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Total">{formatMoney(inv.total)}</Stat>
          <Stat label="Received">{formatMoney(row.received)}</Stat>
          <Stat label="Credited">{formatMoney(row.credited)}</Stat>
          <Stat label={`Outstanding at ${formatDate(asof)}`} tone={row.status === 'Overdue' ? 'bad' : row.status === 'Paid' ? 'good' : 'default'}>
            {formatMoney(row.outstanding)}
          </Stat>
          <Stat label="Days past due" tone={row.daysLate > 0 ? 'bad' : 'default'} note={row.bucket ? `Bucket ${row.bucket}` : undefined}>
            {row.daysPastDue}
          </Stat>
        </div>
      )}

      <div className="grid gap-x-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section title="Invoice details and tax">
            <TableWrap>
              <tbody>
                {[
                  ['Invoice date', formatDate(inv.invoiceDate)],
                  ['Due date', `${formatDate(inv.dueDate)} (${customer.creditDays} days at creation; does not change with later terms)`],
                  ['Taxable value', formatMoney(inv.taxableValue)],
                  ...(inv.igst > 0
                    ? [[`IGST @ ${inv.gstRatePct}%`, formatMoney(inv.igst)]]
                    : [
                        [`CGST @ ${inv.gstRatePct / 2}%`, formatMoney(inv.cgst)],
                        [`SGST @ ${inv.gstRatePct / 2}%`, formatMoney(inv.sgst)],
                      ]),
                ].map(([k, v]) => (
                  <tr key={k}>
                    <Td className="w-56 text-slate-500">{k}</Td>
                    <Td>{v}</Td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <Td>Invoice total</Td>
                  <Td>{formatMoney(inv.total)}</Td>
                </tr>
              </tbody>
            </TableWrap>
          </Section>

          <Section title="Payments allocated">
            {allocations.length === 0 ? (
              <Empty>No payments allocated.</Empty>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Receipt</Th>
                    <Th>Receipt date</Th>
                    <Th>Allocation date</Th>
                    <Th numeric>Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((a) => {
                    const r = receiptById.get(a.receiptId);
                    return (
                      <tr key={a.id} className={a.allocationDate > asof ? 'text-slate-400' : ''}>
                        <Td>{r?.receiptNo}</Td>
                        <Td>{formatDate(r?.receiptDate)}</Td>
                        <Td>
                          {formatDate(a.allocationDate)}
                          {a.allocationDate > asof && ' (after as-at date)'}
                        </Td>
                        <Td numeric>
                          <Money paise={a.amount} />
                          <form action={removeAllocation}>
                            <input type="hidden" name="id" value={a.id} />
                            <ReturnTo />
                            <ConfirmButton message={`Remove this allocation of ${formatMoney(a.amount)} from ${r?.receiptNo}? It goes back to the receipt's unapplied credit.`}>remove</ConfirmButton>
                          </form>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            )}
          </Section>

          <Section title="Credit notes">
            {creditNotes.length === 0 ? (
              <Empty>No credit notes.</Empty>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Number</Th>
                    <Th>Date</Th>
                    <Th>Reason</Th>
                    <Th numeric>Taxable</Th>
                    <Th numeric>GST</Th>
                    <Th numeric>Total</Th>
                  </tr>
                </thead>
                <tbody>
                  {creditNotes.map((c) => (
                    <tr key={c.id} className={c.creditNoteDate > asof ? 'text-slate-400' : ''}>
                      <Td>{c.creditNoteNo}</Td>
                      <Td>
                        {formatDate(c.creditNoteDate)}
                        {c.creditNoteDate > asof && ' (after as-at date)'}
                      </Td>
                      <Td>{c.reason}</Td>
                      <Td numeric>
                        <Money paise={c.taxableValue} />
                      </Td>
                      <Td numeric>
                        <Money paise={c.cgst + c.sgst + c.igst} />
                      </Td>
                      <Td numeric>
                        <Money paise={c.total} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
            {later > 0 && <p className="mt-1 text-xs text-slate-500">Greyed rows are dated after the as-at date and do not count in the figures above (R10).</p>}
          </Section>

          <Section title="Notes on this invoice" actions={<span className="text-xs text-slate-500">Full timeline on the customer page</span>}>
            {notes.length === 0 ? (
              <Empty>No notes on this invoice.</Empty>
            ) : (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="rounded border border-slate-200 bg-white p-3">
                    <div className="mb-1 text-xs text-slate-500">
                      {formatDate(n.noteDate)} · {n.noteType}
                    </div>
                    {n.body}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div>
          {!inv.isCancelled && (
            <Section title="Actions">
              <div className="space-y-4">
                <form action={setDisputed} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={inv.id} />
                  <input type="hidden" name="disputed" value={inv.isDisputed ? 'false' : 'true'} />
                  <ReturnTo />
                  <button className="rounded border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50">
                    {inv.isDisputed ? 'Clear disputed flag' : 'Mark as disputed'}
                  </button>
                </form>
                <div>
                  <h3 className="mb-2 font-medium">Raise a credit note</h3>
                  {available > 0 ? (
                    <CreditNoteForm key={nextNumber('creditNote', data, cnDate)} invoice={inv} available={available} defaultDate={cnDate} nextNo={nextNumber('creditNote', data, cnDate)} />
                  ) : (
                    <p className="text-slate-500">Nothing left to credit: the invoice is fully settled or credited.</p>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 font-medium">Add a note</h3>
                  <NoteForm customerId={customer.id} asof={asof} defaultDate={today} defaultInvoiceId={inv.id} invoices={[{ id: inv.id, invoiceNo: inv.invoiceNo }]} />
                </div>
                <div>
                  <h3 className="mb-2 font-medium">Cancel</h3>
                  <CancelInvoiceButton invoiceId={inv.id} invoiceNo={inv.invoiceNo} blockedReason={cancelProblem(data, inv.id)} />
                </div>
              </div>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
