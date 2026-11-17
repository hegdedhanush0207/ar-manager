'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const AREAS = [
  { path: '/', label: 'Overdue at a glance' },
  { path: '/customers', label: 'Customers' },
  { path: '/invoices', label: 'Invoices' },
  { path: '/receipts/new', label: 'Record payment' },
  { path: '/statement', label: 'Statement' },
];

/** Navigation between the areas. Every link keeps the ?asof= date. */
export function Nav() {
  const pathname = usePathname();
  const asof = useSearchParams().get('asof');
  const suffix = asof ? `?asof=${encodeURIComponent(asof)}` : '';
  return (
    <nav className="flex flex-1 flex-wrap gap-1">
      {AREAS.map((a) => {
        const active = a.path === '/' ? pathname === '/' : pathname.startsWith(a.path);
        return (
          <Link
            key={a.path}
            href={a.path + suffix}
            className={`rounded px-3 py-1.5 ${active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
          >
            {a.label}
          </Link>
        );
      })}
    </nav>
  );
}
