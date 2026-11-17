import { notFound } from 'next/navigation';
import { loadArData } from '@/lib/ar/load';
import type { SearchParams } from '@/lib/asof';
import { rupeesPlain } from '@/lib/format';
import { readPage } from '@/lib/page';
import { CustomerForm } from '@/components/CustomerForm';
import { Alert, PageHeader } from '@/components/ui';

/** Reads live data and the as-at date on every request (see app/layout.tsx). */
export const instant = false;

export default async function EditCustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const { asof } = await readPage(searchParams);
  const id = Number((await params).id);
  const data = await loadArData();
  const c = data.customers.find((x) => x.id === id);
  if (!c) notFound();

  return (
    <>
      <PageHeader title={`Edit ${c.code} · ${c.name}`} />
      <Alert tone="info">Changing credit days or state affects new invoices only. Existing invoices keep their due dates and GST (R2, R3).</Alert>
      <CustomerForm
        asof={asof}
        initial={{
          id: String(c.id),
          code: c.code,
          name: c.name,
          city: c.city,
          state: c.state,
          contactPerson: c.contactPerson,
          email: c.email,
          phone: c.phone ?? '',
          gstin: c.gstin ?? '',
          creditDays: String(c.creditDays),
          creditLimit: rupeesPlain(c.creditLimit),
          tdsRatePct: String(c.tdsRatePct),
        }}
      />
    </>
  );
}
