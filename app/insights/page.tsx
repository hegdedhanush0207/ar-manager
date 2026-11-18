import Link from 'next/link';
import { loadArData } from '@/lib/ar/load';
import type { SearchParams } from '@/lib/asof';
import { formatDate, formatMoney } from '@/lib/format';
import { customerInsights, totalOutstanding, type CustomerInsight } from '@/lib/insights/metrics';
import { lakh, lakhAxis, pointLabel, previousPeriodEnd, trendSeries, trendWindow, type Granularity } from '@/lib/insights/trend';
import { readPage } from '@/lib/page';
import { sortRows, withParams, type Dir } from '@/lib/table';
import { TrendChart, type ChartPoint } from '@/components/insights/TrendChart';
import { Alert, Badge, Empty, Money, PageHeader, Section, SortTh, TableWrap, Td, Th } from '@/components/ui';
import { inputClass } from '@/components/form';

/** Reads live data and the as-at date on every request (see app/layout.tsx). */
export const instant = false;

const SORT: Record<string, (r: CustomerInsight) => string | number | null> = {
  name: (r) => r.customer.name,
  outstanding: (r) => r.outstanding,
  payment: (r) => r.paymentFrequency,
  invoice: (r) => r.invoiceFrequency,
  collection: (r) => r.avgCollectionPeriod,
};

export default async function InsightsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { asof, params } = await readPage(searchParams);
  const data = await loadArData();

  // ---- Section 1: customer metrics (all history up to the as-at date) ----
  const sort = params.sort && SORT[params.sort] ? params.sort : 'outstanding';
  const dir: Dir = params.sort && SORT[params.sort] ? ((params.dir as Dir) ?? 'asc') : 'desc';
  const rows = sortRows(customerInsights(data, asof), SORT, sort, dir);
  const total = totalOutstanding(rows);
  const sortParams = { ...params, sort, dir };

  // ---- Section 2: Historical AR trend ----
  const granularity: Granularity = params.gran === 'week' ? 'week' : 'month';
  const window = trendWindow(asof, params.range, params.from, params.to);
  const customer = data.customers.find((c) => String(c.id) === params.cust);
  const series = trendSeries(data, window, granularity, customer?.id);
  const ticks = lakhAxis(Math.max(0, ...series.map((p) => p.closing)));
  const prevLabel = (date: string) => `${granularity === 'month' ? 'previous month' : 'previous week'} (${pointLabel(previousPeriodEnd(date, granularity), granularity, false)})`;
  const chartPoints: ChartPoint[] = series.map((p) => ({
    date: p.date,
    label: p.label,
    partial: p.partial,
    closingText: formatMoney(p.closing),
    lakhValue: p.closing / 10_000_000,
    lakhText: lakh(p.closing),
    changeText: p.changeText,
    previousLabel: prevLabel(p.date),
  }));
  const latest = series[series.length - 1];
  const label = 'mb-1 block text-xs font-medium text-slate-600';
  const keep = (extra: Record<string, string | undefined>) => withParams('/insights', params, extra);

  return (
    <>
      <PageHeader title="Insights" subtitle={`Customer metrics and AR trend · all history up to ${formatDate(asof)}`} />

      <Section title="Customer metrics">
        {rows.length === 0 ? (
          <Empty>No customers.</Empty>
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <SortTh label="Customer name" col="name" path="/insights" params={sortParams} />
                <SortTh label="Outstanding AR" col="outstanding" path="/insights" params={sortParams} numeric />
                <SortTh label="Payment frequency" col="payment" path="/insights" params={sortParams} numeric />
                <SortTh label="Invoice frequency" col="invoice" path="/insights" params={sortParams} numeric />
                <SortTh label="Average collection period" col="collection" path="/insights" params={sortParams} numeric />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.customer.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={withParams(`/customers/${r.customer.id}`, { asof }, {})} className="text-blue-700 hover:underline">
                      {r.customer.name}
                    </Link>{' '}
                    <span className="text-xs text-slate-500">{r.customer.code}</span>
                    {!r.customer.isActive && (
                      <span className="ml-1">
                        <Badge label="Inactive" />
                      </span>
                    )}
                  </Td>
                  <Td numeric>
                    <Money paise={r.outstanding} />
                  </Td>
                  <Td numeric className={r.paymentFrequency === null ? 'text-slate-400' : ''}>
                    <span title={`${r.paymentDateCount} payment date(s)`}>{r.text.paymentFrequency}</span>
                  </Td>
                  <Td numeric className={r.invoiceFrequency === null ? 'text-slate-400' : ''}>
                    <span title={`${r.invoiceCount} invoice(s), cancelled excluded`}>{r.text.invoiceFrequency}</span>
                  </Td>
                  <Td numeric className={r.avgCollectionPeriod === null ? 'text-slate-400' : ''}>
                    <span title={`${r.settledInvoiceCount} fully settled invoice(s)`}>{r.text.avgCollectionPeriod}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <Td>Total</Td>
                <Td numeric>
                  <Money paise={total} />
                </Td>
                <Td />
                <Td />
                <Td />
              </tr>
            </tfoot>
          </TableWrap>
        )}
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-slate-500">
          <li>Outstanding AR: each invoice&apos;s total less payments allocated to it (bank + TDS) and credit notes; cancelled invoices excluded. Unallocated advances are not deducted.</li>
          <li>Payment frequency: average days between successive payment (receipt) dates; needs at least two payment dates.</li>
          <li>Invoice frequency: average days between successive invoice dates; needs at least two invoices.</li>
          <li>Average collection period: average days from invoice date to the date the invoice was fully settled, for fully settled invoices only.</li>
          <li>N/A means there is not enough data. Hover a figure to see how many dates or invoices it is based on.</li>
        </ul>
      </Section>

      <Section title="Historical AR trend">
        <form action="/insights" className="mb-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="asof" value={asof} />
          {params.sort && <input type="hidden" name="sort" value={params.sort} />}
          {params.dir && <input type="hidden" name="dir" value={params.dir} />}
          <label className="w-72">
            <span className={label}>Customer</span>
            <select name="cust" defaultValue={customer ? String(customer.id) : ''} className={inputClass}>
              <option value="">All customers (consolidated)</option>
              {data.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>Show</span>
            <select name="gran" defaultValue={granularity} className={inputClass}>
              <option value="month">Monthly</option>
              <option value="week">Weekly</option>
            </select>
          </label>
          <label>
            <span className={label}>Period</span>
            <select name="range" defaultValue={window.preset} className={inputClass}>
              <option value="12m">Last 12 months</option>
              <option value="6m">Last 6 months</option>
              <option value="3m">Last 3 months</option>
              <option value="custom">Custom date range</option>
            </select>
          </label>
          <label>
            <span className={label}>From (custom)</span>
            <input type="date" name="from" defaultValue={window.preset === 'custom' ? window.from : (params.from ?? '')} className={inputClass} />
          </label>
          <label>
            <span className={label}>To (custom)</span>
            <input type="date" name="to" defaultValue={window.preset === 'custom' ? window.to : (params.to ?? '')} max={asof} className={inputClass} />
          </label>
          <button className="rounded border border-slate-300 bg-white px-3 py-1.5 hover:bg-slate-50">Apply</button>
          {(params.cust || params.gran || params.range) && (
            <Link href={keep({ cust: undefined, gran: undefined, range: undefined, from: undefined, to: undefined })} className="py-1.5 text-blue-700 underline">
              Reset chart filters
            </Link>
          )}
        </form>
        {window.error && <Alert tone="warn">{window.error}</Alert>}
        {window.note && <Alert tone="info">{window.note}</Alert>}

        <div className="rounded border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Historical AR trend</h3>
              <div className="text-xs text-slate-500">
                {customer ? `${customer.code} · ${customer.name}` : 'All customers (consolidated)'} · {granularity === 'month' ? 'month-end' : 'week-end (Sunday)'} balances · {formatDate(window.from)} to {formatDate(window.to)}
              </div>
            </div>
            {latest && (
              <div className="text-right">
                <div className="text-lg font-semibold">{formatMoney(latest.closing)}</div>
                <div className="text-xs text-slate-600">
                  {latest.label} ·{' '}
                  {latest.changeText === null ? 'no % change (previous balance nil)' : (
                    <span className={latest.closing > latest.previous ? 'text-red-700' : latest.closing < latest.previous ? 'text-emerald-700' : ''}>
                      {latest.changeText} vs {granularity === 'month' ? 'previous month' : 'previous week'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <TrendChart points={chartPoints} ticks={ticks} unit={granularity} />
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-blue-700">Show the trend figures as a table</summary>
          <div className="mt-2">
            <TableWrap>
              <thead>
                <tr>
                  <Th>Period</Th>
                  <Th>Balance as at</Th>
                  <Th numeric>Outstanding AR</Th>
                  <Th numeric>₹ lakh</Th>
                  <Th numeric>Previous {granularity === 'month' ? 'month' : 'week'}</Th>
                  <Th numeric>Change</Th>
                  <Th numeric>Unapplied credit (not deducted)</Th>
                </tr>
              </thead>
              <tbody>
                {series.map((p) => (
                  <tr key={p.date}>
                    <Td>{p.label}</Td>
                    <Td>{formatDate(p.date)}</Td>
                    <Td numeric>{formatMoney(p.closing)}</Td>
                    <Td numeric>{lakh(p.closing)}</Td>
                    <Td numeric>{formatMoney(p.previous)}</Td>
                    <Td numeric className={p.changePct === null ? 'text-slate-400' : p.closing > p.previous ? 'text-red-700' : p.closing < p.previous ? 'text-emerald-700' : ''}>
                      {p.changeText ?? 'N/A'}
                    </Td>
                    <Td numeric>{formatMoney(p.unapplied)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        </details>
        <p className="mt-2 text-xs text-slate-500">
          Month-end AR = Σ outstanding invoice balances on the last calendar day of the month: invoices raised, less payments (bank + TDS) allocated and credit notes issued, each up to that date. An increase in AR is shown in red, a decrease in green.
        </p>
      </Section>
    </>
  );
}
