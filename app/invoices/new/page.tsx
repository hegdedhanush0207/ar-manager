import { loadArData } from '@/lib/ar/load';
import { todayInIndia } from '@/lib/ar';
import type { SearchParams } from '@/lib/asof';
import { readPage } from '@/lib/page';
import { InvoiceForm } from '@/components/InvoiceForm';
import { PageHeader } from '@/components/ui';

/** Reads live data and the as-at date on every request (see app/layout.tsx). */
export const instant = false;

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { asof, params } = await readPage(searchParams);
  const data = await loadArData();
  const customers = data.customers
    .filter((c) => c.isActive)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((c) => ({ id: c.id, code: c.code, name: c.name, state: c.state, creditDays: c.creditDays }));
  return (
    <>
      <PageHeader title="New invoice" subtitle="The tax split, total, due date and number are worked out for you (R2, R3, R4)." />
      <InvoiceForm customers={customers} asof={asof} defaultCustomer={params.customer} defaultDate={todayInIndia()} />
    </>
  );
}
