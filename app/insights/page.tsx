import Link from 'next/link';
import { loadArData } from '@/lib/ar/load';
import type { SearchParams } from '@/lib/asof';
import { formatDate, formatMoney } from '@/lib/format';
import { customerInsights, totalOutstanding, type CustomerInsight } from '@/lib/insights/metrics';
import { axisLabel, lakh, pointLabel, previousPeriodEnd, trendSeries, trendWindow, type Granularity, type TrendPoint } from '@/lib/insights/trend';
import { CONSOLIDATED, parseSelection } from '@/lib/insights/selection';
import { readPage } from '@/lib/page';
import { sortRows, withParams, type Dir } from '@/lib/table';
import { TrendChart, type ChartPoint, type SeriesData } from '@/components/insights/TrendChart';
import { TrendFilters } from '@/components/insights/TrendFilters';
import { Alert, Badge, Empty, Money, PageHeader, Section, SortTh, TableWrap, Td } from '@/components/ui';

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
  // Every line (consolidated and each customer) is calculated here, so the chart can switch lines instantly.
  const granularity: Granularity = params.gran === 'week' ? 'week' : 'month';
  const window = trendWindow(asof, params.range, params.from, params.to);
  const toChart = (p: TrendPoint): ChartPoint => ({
    date: p.date,
    dateText: formatDate(p.date),
    label: p.label,
    axisLabel: axisLabel(p.date, granularity, p.partial),
    partial: p.partial,
    closing: p.closing,
    closingText: formatMoney(p.closing),
    lakhValue: p.closing / 10_000_000,
    lakhText: lakh(p.closing),
    previousText: formatMoney(p.previous),
    previousLabel: `${granularity === 'month' ? 'previous month' : 'previous week'} (${pointLabel(previousPeriodEnd(p.date, granularity), granularity, false)})`,
    previousShort: axisLabel(previousPeriodEnd(p.date, granularity), granularity, false),
    changeText: p.changeText,
    direction: p.closing > p.previous ? 'up' : p.closing < p.previous ? 'down' : 'flat',
    unappliedText: formatMoney(p.unapplied),
  });
  const consolidated = trendSeries(data, window, granularity);
  const allSeries: SeriesData[] = [
    { key: CONSOLIDATED, name: 'All customers (consolidated)', short: 'All', points: consolidated.map(toChart) },
    ...data.customers.map((c) => ({
      key: String(c.id),
      name: `${c.code} · ${c.name}`,
      short: c.code,
      points: trendSeries(data, window, granularity, c.id).map(toChart),
    })),
  ];
  const selected = parseSelection(params.cust, allSeries.map((s) => s.key));
  const latest = consolidated[consolidated.length - 1];

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
        <TrendFilters key={`${window.preset}|${window.from}|${window.to}`} granularity={granularity} range={window.preset} from={window.from} to={window.to} asof={asof} />
        {window.error && <Alert tone="warn">{window.error}</Alert>}
        {window.note && <Alert tone="info">{window.note}</Alert>}

        <TrendChart
          series={allSeries}
          initialSelected={selected}
          unit={granularity}
          header={
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">Historical AR trend</h3>
              <div className="text-xs text-slate-500">
                {granularity === 'month' ? 'Month-end' : 'Week-end (Sunday)'} balances · {formatDate(window.from)} to {formatDate(window.to)}
              </div>
            </div>
            {latest && (
              <div className="shrink-0 text-right">
                <div className="text-lg font-semibold">{formatMoney(latest.closing)}</div>
                <div className="text-xs text-slate-600">
                  All customers · {latest.label}
                  <br />
                  {latest.changeText === null ? 'no % change (previous balance nil)' : (
                    <span className={latest.closing > latest.previous ? 'text-red-700' : latest.closing < latest.previous ? 'text-emerald-700' : ''}>
                      {latest.changeText} vs {granularity === 'month' ? 'previous month' : 'previous week'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          }
        />
        <p className="mt-2 text-xs text-slate-500">
          Month-end AR = Σ outstanding invoice balances on the last calendar day of the month: invoices raised, less payments (bank + TDS) allocated and credit notes issued, each up to that date. An increase in AR is shown in red, a decrease in green.
        </p>
      </Section>
    </>
  );
}
