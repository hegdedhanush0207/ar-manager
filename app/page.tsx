import { loadArData } from '@/lib/ar/load';

export default async function Home() {
  const data = await loadArData();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">
        Brightwater Advisory — Customers
      </h1>

      <p className="mb-4">
        Customers loaded: {data.customers.length}
      </p>

      <ul className="space-y-2">
        {data.customers.map((customer) => (
          <li key={customer.id}>
            {customer.code} — {customer.name}
          </li>
        ))}
      </ul>
    </main>
  );
}
