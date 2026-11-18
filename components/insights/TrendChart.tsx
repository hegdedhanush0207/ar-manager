'use client';

/**
 * Historical AR trend: an interactive line chart (hand-built SVG, no chart library).
 *
 * X axis = time (months by default, or weeks), earliest on the left; Y axis = amount
 * in ₹ lakh from 0, in 2-lakh steps (1-lakh steps when only customer lines are shown).
 * One line per selected series: the consolidated
 * total and/or individual customers, chosen in the picker inside the chart box. Picking
 * redraws instantly (every series is already calculated on the server) and the choice
 * is kept in the URL (?cust=) without reloading. Hovering, or the arrow keys, shows
 * every visible line's balance and % change for that period.
 * All figures arrive pre-calculated from lib/insights; this component only draws them.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { lakhAxis } from '@/lib/insights/trend';
import { assignColors, CONSOLIDATED, MAX_CUSTOMER_LINES, selectionParam } from '@/lib/insights/selection';

export interface ChartPoint {
  date: string;
  dateText: string; // 31-Aug-2026
  label: string; // Aug 2026 / Nov 2026 (to 18-Nov-2026)
  axisLabel: string; // Aug '26 / Nov '26*
  partial: boolean;
  closing: number; // paise, for the axis range
  closingText: string;
  lakhValue: number; // for positioning only
  lakhText: string; // exact, 2 decimals
  previousText: string;
  previousLabel: string;
  previousShort: string; // Apr '26 / 8 Nov '26, for the tooltip
  changeText: string | null;
  direction: 'up' | 'down' | 'flat';
  unappliedText: string;
}

export interface SeriesData {
  key: string; // 'all' or a customer id
  name: string; // shown in the legend, tooltip and table
  short: string; // end-of-line label: 'All' or the customer code
  points: ChartPoint[];
}

const GRID = '#e2e8f0';
const AXIS_TEXT = '#475569';

/** `header` (title on the left, headline figures on the right) is drawn at the top of the chart box. */
export function TrendChart({ series, initialSelected, unit, header }: { series: SeriesData[]; initialSelected: string[]; unit: 'month' | 'week'; header: ReactNode }) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [colors, setColors] = useState<Record<string, string>>(() => assignColors(initialSelected));
  const [active, setActive] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  // Lines in a stable order: consolidated first, then customers in list order.
  const shown = useMemo(() => series.filter((s) => selected.includes(s.key)), [series, selected]);
  const customerCount = selected.filter((k) => k !== CONSOLIDATED).length;

  function toggle(key: string) {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    if (next.length === 0) return; // at least one line is always shown
    applySelection(next);
  }

  /** "De-select all": clear every customer and show the consolidated trend only. */
  function deselectAll() {
    applySelection([CONSOLIDATED]);
  }

  function applySelection(next: string[]) {
    setSelected(next);
    setColors((prev) => assignColors(next, prev));
    const sp = new URLSearchParams(window.location.search);
    const v = selectionParam(next);
    if (v) sp.set('cust', v);
    else sp.delete('cust');
    const qs = sp.toString();
    window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }

  // Close the picker on an outside click or Escape.
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: PointerEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  const base = series[0]?.points ?? [];
  const n = base.length;
  // Amount axis: 1-lakh steps when only customer lines are shown, otherwise 2-lakh steps.
  const customerOnly = !selected.includes(CONSOLIDATED);
  const step: 1 | 2 = customerOnly ? 1 : 2;
  const ticks = lakhAxis(Math.max(0, ...shown.flatMap((s) => s.points.map((p) => p.closing))), step);
  const tickLabelEvery = ticks.length > 16 ? 2 : 1; // gridline every step; thin the labels only if they would crowd
  const top = ticks[ticks.length - 1];

  // Geometry in SVG user units. The plot narrows to fit; a small gutter on the right holds end-of-line names.
  const endLabels = shown.length >= 2 && shown.length <= 4;
  const W = Math.min(1180, Math.max(640, 90 + n * 40)) + (endLabels ? 44 : 0);
  const H = 360;
  const pad = { l: 64, r: endLabels ? 68 : 24, t: 20, b: 70 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (n === 1 ? 0.5 : i / (n - 1)) * plotW;
  const y = (lakh: number) => pad.t + plotH - (lakh / top) * plotH;
  const labelEvery = Math.ceil(n / Math.max(1, Math.floor(plotW / 46))); // thin the time labels only when they would collide

  // End-of-line names, only when they do not collide (otherwise the legend and tooltip carry identity).
  const ends = shown.map((s) => ({ key: s.key, short: s.short, y: y(s.points[n - 1]?.lakhValue ?? 0) })).sort((a, b) => a.y - b.y);
  const endsFit = endLabels && ends.every((e, i) => i === 0 || e.y - ends[i - 1].y >= 14);

  function nearest(clientX: number) {
    const svg = svgRef.current;
    if (!svg || !n) return;
    const r = svg.getBoundingClientRect();
    const pos = (clientX - r.left) * (W / r.width) - pad.l;
    const i = n === 1 ? 0 : Math.round((pos / plotW) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  }

  const ax = active !== null ? x(active) : 0;
  const ay = active !== null ? Math.min(...shown.map((s) => y(s.points[active].lakhValue))) : 0; // highest hovered point
  const ayLow = active !== null ? Math.max(...shown.map((s) => y(s.points[active].lakhValue))) : 0; // lowest hovered point

  // Keep the tooltip inside the chart without hiding the hovered points:
  // beside the crosshair (right, else left); if it fits neither side, above the highest
  // hovered point, else below the lowest; only as a last resort pinned over the chart.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    const holder = tip?.parentElement;
    if (!tip || !holder) return;
    const cw = holder.clientWidth, ch = holder.clientHeight;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    const px = (ax / W) * cw, pyTop = (ay / H) * ch, pyLow = (ayLow / H) * ch;
    const gap = 14;
    let left: number, top: number;
    if (px + gap + tw <= cw) {
      left = px + gap;
      top = Math.min(Math.max(0, pyTop - 8), Math.max(0, ch - th));
    } else if (px - gap - tw >= 0) {
      left = px - gap - tw;
      top = Math.min(Math.max(0, pyTop - 8), Math.max(0, ch - th));
    } else {
      left = Math.min(Math.max(0, px - tw / 2), Math.max(0, cw - tw));
      if (pyTop - gap - th >= 0) top = pyTop - gap - th;
      else if (pyLow + gap + th <= ch) top = pyLow + gap;
      else top = Math.max(0, ch - th);
    }
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  });

  return (
    // The box is exactly as wide as the chart (plus its padding), so there is no empty space on the right.
    <div className="max-w-full rounded border border-slate-200 bg-white p-4" style={{ width: W + 34 }} data-chart-box>
      {header}
      {/* customer picker and legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="relative" ref={pickerRef}>
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            aria-expanded={pickerOpen}
            aria-haspopup="true"
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Customers: {shown.length === 1 ? shown[0].name : `${shown.length} lines`} ▾
          </button>
          {pickerOpen && (
            <div className="absolute left-0 z-20 mt-1 max-h-80 w-80 overflow-y-auto rounded border border-slate-200 bg-white p-2 text-sm shadow-lg" role="group" aria-label="Lines to show">
              <button
                type="button"
                onClick={deselectAll}
                disabled={selected.length === 1 && selected[0] === CONSOLIDATED}
                className="mb-1 w-full rounded px-2 py-1 text-left text-blue-700 underline hover:bg-slate-50 disabled:text-slate-400 disabled:no-underline"
              >
                De-select all (show the consolidated trend only)
              </button>
              {series.map((s) => {
                const on = selected.includes(s.key);
                const atCap = !on && s.key !== CONSOLIDATED && customerCount >= MAX_CUSTOMER_LINES;
                const last = on && selected.length === 1;
                return (
                  <label key={s.key} className={`flex items-center gap-2 rounded px-2 py-1 ${atCap ? 'text-slate-400' : 'hover:bg-slate-50'} ${s.key === CONSOLIDATED ? 'mb-1 border-b border-slate-100 pb-2' : ''}`}>
                    <input type="checkbox" checked={on} disabled={atCap || last} onChange={() => toggle(s.key)} />
                    <span className="inline-block h-0.5 w-4 shrink-0" style={{ background: on ? colors[s.key] : 'transparent' }} aria-hidden />
                    <span>{s.name}</span>
                  </label>
                );
              })}
              <p className="mt-1 px-2 text-xs text-slate-500">
                Up to {MAX_CUSTOMER_LINES} customers at once, plus the consolidated total. At least one line is always shown.
              </p>
            </div>
          )}
        </div>
        {shown.length >= 2 && (
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700" aria-label="Legend">
            {shown.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4" style={{ background: colors[s.key] }} aria-hidden />
                {s.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-1 text-xs text-slate-600">X axis: {unit} · Y axis: outstanding AR in ₹ lakh (1 lakh = ₹1,00,000), {step}-lakh steps</div>
      <div className="w-full overflow-x-auto">
        {/* The tooltip is positioned in this box, which is exactly the size of the chart. */}
        <div className="relative" style={{ width: '100%', maxWidth: W, minWidth: Math.min(W, 600) }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            className="block focus:outline-2 focus:outline-blue-500"
            role="img"
            aria-label={`Historical AR trend, ${n} ${unit === 'month' ? 'months' : 'weeks'}, ${shown.length} line(s). Use the left and right arrow keys to read each period.`}
            tabIndex={0}
            style={{ touchAction: 'none', userSelect: 'none' }}
            onPointerMove={(e) => nearest(e.clientX)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive((v) => v ?? n - 1)}
            onBlur={() => setActive(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') { e.preventDefault(); setActive((v) => Math.max(0, (v ?? n) - 1)); }
              if (e.key === 'ArrowRight') { e.preventDefault(); setActive((v) => Math.min(n - 1, (v ?? -1) + 1)); }
            }}
          >
            {/* Y axis: amount gridlines and labels (₹ lakh; 2-lakh steps, or 1-lakh for customer-only views) */}
            {ticks.map((t, i) => (
              <g key={t}>
                <line x1={pad.l} x2={pad.l + plotW} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                {i % tickLabelEvery === 0 && <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill={AXIS_TEXT}>{t}</text>}
              </g>
            ))}
            <text x={14} y={pad.t + plotH / 2} fontSize={12} fill={AXIS_TEXT} transform={`rotate(-90 14 ${pad.t + plotH / 2})`} textAnchor="middle">₹ lakh</text>

            {/* X axis: time labels */}
            {base.map((p, i) => {
              if (i % labelEvery !== 0 && i !== n - 1) return null;
              const ly = pad.t + plotH + 18;
              return (
                <text key={p.date} x={x(i)} y={ly} fontSize={11} fill={AXIS_TEXT} textAnchor="end" transform={`rotate(-40 ${x(i)} ${ly})`}>{p.axisLabel}</text>
              );
            })}

            {/* crosshair at the hovered period */}
            {active !== null && <line x1={ax} x2={ax} y1={pad.t} y2={pad.t + plotH} stroke="#94a3b8" strokeWidth={1} />}

            {/* one line per selected series */}
            {shown.map((s) => (
              <g key={s.key} data-series={s.key}>
                <path
                  d={s.points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.lakhValue).toFixed(1)}`).join(' ')}
                  fill="none"
                  stroke={colors[s.key]}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {s.points.map((p, i) => (
                  <circle key={p.date} cx={x(i)} cy={y(p.lakhValue)} r={active === i ? 6 : 4} fill={p.partial ? '#fff' : colors[s.key]} stroke={active === i || p.partial ? colors[s.key] : '#fff'} strokeWidth={active === i || p.partial ? 2 : 1.5} />
                ))}
              </g>
            ))}

            {/* end-of-line names (2–4 lines, when they do not collide) */}
            {endsFit &&
              ends.map((e) => (
                <text key={e.key} x={pad.l + plotW + 10} y={e.y + 4} fontSize={11} fill={AXIS_TEXT}>
                  {e.short}
                </text>
              ))}
          </svg>

          {active !== null && (
            <div
              ref={tipRef}
              role="status"
              className="pointer-events-none absolute left-0 top-0 z-10 rounded border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
              style={{ whiteSpace: 'nowrap' }}
            >
              {shown.length === 1 ? (
                // One line: balance, lakh figure and change, as before.
                (() => {
                  const p = shown[0].points[active];
                  return (
                    <>
                      <div className="mb-1 font-medium text-slate-700">{p.label}</div>
                      <div className="text-sm font-semibold text-slate-900">{p.closingText}</div>
                      <div className="text-slate-600">₹{p.lakhText} lakh</div>
                      <div className="text-slate-600">{p.changeText === null ? 'No % change (previous balance was nil)' : `${p.changeText} vs ${p.previousShort}`}</div>
                    </>
                  );
                })()
              ) : (
                // Several lines: a compact row per line (names are in the legend above).
                <>
                  <div className="mb-1 font-medium text-slate-700">
                    {base[active].label} <span className="font-normal text-slate-500">· % vs {base[active].previousShort}</span>
                  </div>
                  <table className="border-separate border-spacing-x-2 border-spacing-y-0.5" style={{ marginLeft: -8 }}>
                    <tbody>
                      {shown.map((s) => {
                        const p = s.points[active];
                        return (
                          <tr key={s.key}>
                            <td><span className="inline-block h-0.5 w-3 align-middle" style={{ background: colors[s.key] }} aria-hidden /></td>
                            <td className="num text-sm font-semibold text-slate-900">{p.closingText}</td>
                            <td className="num text-slate-600">{p.changeText ?? 'N/A'}</td>
                            <td className="text-slate-500">{s.short}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Each point is the outstanding AR at the end of the {unit}. * and a hollow point mark a {unit} still in progress: its balance is to the end date shown.
      </p>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-blue-700">Show the trend figures as a table</summary>
        <div className="mt-2 overflow-x-auto rounded border border-slate-200">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-2 py-2 text-left font-medium">Period</th>
                <th className="px-2 py-2 text-left font-medium">Balance as at</th>
                <th className="px-2 py-2 text-right font-medium">Outstanding AR</th>
                <th className="px-2 py-2 text-right font-medium">₹ lakh</th>
                <th className="px-2 py-2 text-right font-medium">Previous {unit}</th>
                <th className="px-2 py-2 text-right font-medium">Change</th>
                <th className="px-2 py-2 text-right font-medium">Unapplied credit (not deducted)</th>
              </tr>
            </thead>
            {shown.map((s) => (
              <tbody key={s.key} data-series={s.key}>
                <tr className="border-t border-slate-200 bg-slate-50/60">
                  <th colSpan={7} className="px-2 py-1.5 text-left font-semibold text-slate-800">
                    <span className="mr-2 inline-block h-0.5 w-4 align-middle" style={{ background: colors[s.key] }} aria-hidden />
                    {s.name}
                  </th>
                </tr>
                {s.points.map((p) => (
                  <tr key={p.date} className="border-t border-slate-100">
                    <td className="px-2 py-1.5">{p.label}</td>
                    <td className="px-2 py-1.5">{p.dateText}</td>
                    <td className="num px-2 py-1.5">{p.closingText}</td>
                    <td className="num px-2 py-1.5">{p.lakhText}</td>
                    <td className="num px-2 py-1.5">{p.previousText}</td>
                    <td className={`num px-2 py-1.5 ${p.changeText === null ? 'text-slate-400' : p.direction === 'up' ? 'text-red-700' : p.direction === 'down' ? 'text-emerald-700' : ''}`}>{p.changeText ?? 'N/A'}</td>
                    <td className="num px-2 py-1.5">{p.unappliedText}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </details>
    </div>
  );
}
