'use client';

/**
 * Period controls for the Historical AR trend. They apply as soon as they change
 * (no Apply button): the page reloads its figures for the new window. The
 * current line selection (?cust=) and every other URL parameter are kept.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isIsoDate } from '@/lib/ar/dates';
import { inputClass } from '@/components/form';

export function TrendFilters({ granularity, range, from, to, asof }: { granularity: 'month' | 'week'; range: string; from: string; to: string; asof: string }) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [problem, setProblem] = useState<string | null>(null);

  function go(changes: Record<string, string | undefined>) {
    const sp = new URLSearchParams(window.location.search); // includes the latest ?cust= from the chart
    for (const [k, v] of Object.entries(changes)) {
      if (v === undefined || v === '') sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete('done');
    router.push(`${window.location.pathname}?${sp.toString()}`, { scroll: false });
  }

  function applyCustom(f: string, t: string) {
    setCustomFrom(f);
    setCustomTo(t);
    if (!isIsoDate(f) || !isIsoDate(t)) return setProblem(null); // wait until both dates are complete
    if (f > t) return setProblem('The From date must be on or before the To date.');
    setProblem(null);
    go({ range: 'custom', from: f, to: t });
  }

  const label = 'mb-1 block text-xs font-medium text-slate-600';
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label>
        <span className={label}>Show</span>
        <select value={granularity} onChange={(e) => go({ gran: e.target.value === 'week' ? 'week' : undefined })} className={inputClass}>
          <option value="month">Monthly</option>
          <option value="week">Weekly</option>
        </select>
      </label>
      <label>
        <span className={label}>Period</span>
        <select
          value={range}
          onChange={(e) => {
            const v = e.target.value;
            // Custom starts from the window currently shown, ready to edit.
            if (v === 'custom') go({ range: 'custom', from, to });
            else go({ range: v === '12m' ? undefined : v, from: undefined, to: undefined });
          }}
          className={inputClass}
        >
          <option value="12m">Last 12 months</option>
          <option value="6m">Last 6 months</option>
          <option value="3m">Last 3 months</option>
          <option value="custom">Custom date range</option>
        </select>
      </label>
      {range === 'custom' && (
        <>
          <label>
            <span className={label}>From</span>
            <input type="date" value={customFrom} max={asof} onChange={(e) => applyCustom(e.target.value, customTo)} className={inputClass} />
          </label>
          <label>
            <span className={label}>To</span>
            <input type="date" value={customTo} max={asof} onChange={(e) => applyCustom(customFrom, e.target.value)} className={inputClass} />
          </label>
        </>
      )}
      {problem && <p className="py-1.5 text-sm text-red-700">{problem}</p>}
    </div>
  );
}
