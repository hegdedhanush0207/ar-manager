import { loadArData } from '@/lib/ar/load';
import { openInvoicesFor, todayInIndia } from '@/lib/ar';
import type { SearchParams } from '@/lib/asof';
import { readPage } from '@/lib/page';
import { ReceiptForm } from '@/components/ReceiptForm';
import { PageHeader } from '@/components/ui';

/** Reads live data and the as-at date on every request (see app/layout.tsx). */
export const instant = false;

export default async function NewReceiptPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { asof, params } = await readPage(searchParams);
  const data = await loadArData();
  const customers = [...data.customers]
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.code.localeCompare(b.code))
    .map((c) => ({ id: c.id, code: c.code, name: c.name, tdsRatePct: c.tdsRatePct, isActive: c.isActive }));
  // Every customer's open invoices, oldest first (R6); the form shows the chosen customer's.
  const openInvoices = data.customers.flatMap((c) => openInvoicesFor(data, c.id).map((o) => ({ ...o, customerId: c.id })));

  return (
    <>
      <PageHeader
        title="Record a payment"
        subtitle="The settlement value (bank + TDS) settles invoices. Anything not allocated stays as unapplied credit, which can be allocated later from the customer page."
      />
      <ReceiptForm
        customers={customers}
        openInvoices={openInvoices}
        receiptNumbers={data.receipts.map((r) => r.receiptNo)}
        asof={asof}
        defaultCustomer={params.customer}
        defaultDate={todayInIndia()}
      />
    </>
  );
}
