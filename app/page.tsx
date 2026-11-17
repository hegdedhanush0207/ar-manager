import { loadArData } from '@/lib/ar/load';
import { customerPositions } from '@/lib/ar';
import { parseAsOf, type SearchParams } from '@/lib/asof';
import { formatDate } from '@/lib/format';
import { Balance, PageHeader } from '@/components/ui';

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const asof = parseAsOf((await searchParams).asof);
  const data = await loadArData();
  const rows = customerPositions(data, asof);

  return (
    <>
      <PageHeader title="Overdue at a glance" subtitle={`As at ${formatDate(asof)}`} />
      <ul className="space-y-1">
        {rows.map((p) => (
          <li key={p.customer.id}>
            {p.customer.code} — {p.customer.name}: <Balance paise={p.netBalance} />
          </li>
        ))}
      </ul>
    </>
  );
}
