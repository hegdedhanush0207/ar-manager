/**
 * Small presentational pieces shared by the screens. They only display values
 * that lib/ar has already calculated.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatBalance, formatMoney } from '@/lib/format';
import { withParams } from '@/lib/table';

export function PageHeader({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <div className="mt-0.5 text-slate-500">{subtitle}</div>}
      </div>
      {children && <div className="flex flex-wrap gap-2 print:hidden">{children}</div>}
    </div>
  );
}

export function Money({ paise, className = '' }: { paise: number; className?: string }) {
  return <span className={`num ${className}`}>{formatMoney(paise)}</span>;
}

export function Balance({ paise, className = '' }: { paise: number; className?: string }) {
  return <span className={`num ${paise < 0 ? 'text-emerald-700' : ''} ${className}`}>{formatBalance(paise)}</span>;
}

const BADGE: Record<string, string> = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Due: 'bg-slate-100 text-slate-700 ring-slate-200',
  Overdue: 'bg-red-50 text-red-700 ring-red-200',
  Cancelled: 'bg-slate-100 text-slate-400 ring-slate-200 line-through',
  'Part-paid': 'bg-blue-50 text-blue-700 ring-blue-200',
  Disputed: 'bg-amber-50 text-amber-800 ring-amber-300',
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Inactive: 'bg-slate-100 text-slate-500 ring-slate-200',
  Kept: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Broken: 'bg-red-50 text-red-700 ring-red-200',
  Pending: 'bg-slate-100 text-slate-700 ring-slate-200',
  'Over limit': 'bg-red-50 text-red-700 ring-red-200',
};

export function Badge({ label }: { label: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE[label] ?? BADGE.Due}`}>
      {label}
    </span>
  );
}

/** Status with its labels: e.g. "Overdue · Part-paid · Disputed". */
export function StatusBadges({ status, partPaid, disputed }: { status: string; partPaid?: boolean; disputed?: boolean }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge label={status} />
      {partPaid && <Badge label="Part-paid" />}
      {disputed && <Badge label="Disputed" />}
    </span>
  );
}

/** A column header that sorts the list by this column; clicking again reverses the order. */
export function SortTh({
  label,
  col,
  path,
  params,
  numeric = false,
}: {
  label: string;
  col: string;
  path: string;
  params: Record<string, string>;
  numeric?: boolean;
}) {
  const active = params.sort === col;
  const dir = active && params.dir === 'asc' ? 'desc' : active ? 'asc' : numeric ? 'desc' : 'asc';
  const arrow = active ? (params.dir === 'desc' ? ' ▼' : ' ▲') : '';
  return (
    <th className={`px-2 py-2 font-medium ${numeric ? 'text-right' : 'text-left'}`}>
      <Link href={withParams(path, params, { sort: col, dir })} className="hover:underline print:no-underline">
        {label}
        {arrow}
      </Link>
    </th>
  );
}

export function Th({ children, numeric = false }: { children?: ReactNode; numeric?: boolean }) {
  return <th className={`px-2 py-2 font-medium ${numeric ? 'text-right' : 'text-left'}`}>{children}</th>;
}

export function Td({ children, numeric = false, className = '' }: { children?: ReactNode; numeric?: boolean; className?: string }) {
  return <td className={`px-2 py-1.5 align-top ${numeric ? 'num whitespace-nowrap' : ''} ${className}`}>{children}</td>;
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded border border-slate-200 bg-white print:border-0">
      <table className="w-full border-collapse text-sm [&_thead]:bg-slate-50 [&_thead]:text-slate-600 [&_tbody_tr]:border-t [&_tbody_tr]:border-slate-100 [&_tfoot]:border-t-2 [&_tfoot]:border-slate-300 [&_tfoot]:font-semibold">
        {children}
      </table>
    </div>
  );
}

export function Section({ title, children, actions }: { title: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-800">{title}</h2>
        {actions && <div className="flex gap-2 print:hidden">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, children, tone = 'default', note }: { label: string; children: ReactNode; tone?: 'default' | 'bad' | 'good'; note?: ReactNode }) {
  const color = tone === 'bad' ? 'text-red-700' : tone === 'good' ? 'text-emerald-700' : 'text-slate-900';
  return (
    <div className="rounded border border-slate-200 bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${color}`}>{children}</div>
      {note && <div className="mt-0.5 text-xs text-slate-500">{note}</div>}
    </div>
  );
}

export function ButtonLink({ href, children, primary = false }: { href: string; children: ReactNode; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-block rounded px-3 py-1.5 text-sm font-medium ${primary ? 'bg-slate-900 text-white hover:bg-slate-700' : 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}`}
    >
      {children}
    </Link>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded border border-dashed border-slate-300 bg-white p-4 text-slate-500">{children}</div>;
}

export function Alert({ tone = 'warn', children }: { tone?: 'warn' | 'error' | 'info' | 'ok'; children: ReactNode }) {
  const c = {
    warn: 'border-amber-300 bg-amber-50 text-amber-900',
    error: 'border-red-300 bg-red-50 text-red-800',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    ok: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  }[tone];
  return <div className={`mb-4 rounded border px-3 py-2 ${c}`}>{children}</div>;
}
