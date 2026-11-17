import type { SearchParams } from '@/lib/asof';
import { readPage } from '@/lib/page';
import { CustomerForm } from '@/components/CustomerForm';
import { PageHeader } from '@/components/ui';

export default async function NewCustomerPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { asof } = await readPage(searchParams);
  return (
    <>
      <PageHeader title="Add customer" />
      <CustomerForm
        asof={asof}
        initial={{ code: '', name: '', city: '', state: '', contactPerson: '', email: '', phone: '', gstin: '', creditDays: '30', creditLimit: '0.00', tdsRatePct: '10' }}
      />
    </>
  );
}
