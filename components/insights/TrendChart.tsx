'use client';

/**
 * Historical AR trend: an interactive line chart (hand-built SVG, no chart library).
 *
 * As the Phase 2 brief specifies, the amount (₹ lakh, 2-lakh steps) is on the X axis and
 * time on the Y axis, earliest at the top. A toggle lays time across instead. Hovering
 * (or arrow keys) snaps to the nearest period and shows its date, balance and % change.
 * All figures arrive pre-calculated from lib/insights; this component only draws them.
 */
import { useRef, useState } from 'react';

export interface ChartPoint {
  date: string;
  label: string;
  partial: boolean;
  closingText: string; // ₹ formatted
  lakhValue: number; // for positioning only
  lakhText: string; // exact, 2 decimals
  changeText: string | null;
  previousLabel: string;
}

const SERIES = '#2a78d6';
const GRID = '#e2e8f0';
const AXIS_TEXT = '#475569';

export function TrendChart({ points, ticks, unit }: { points: ChartPoint[]; ticks: number[]; unit: 'month' | 'week' }) {
  const [timeAcross, setTimeAcross] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const n = points.length;
  const top = ticks[ticks.length - 1];
  const step = n > 30 ? 22 : 34; // spacing between periods

  // Geometry (SVG user units). Amount scale is 0 … top lakh.
  const W = timeAcross ? Math.max(640, 90 + n * Math.max(step, 40)) : 720;
  const H = timeAcross ? 360 : 70 + n * step;
  const pad = timeAcross ? { l: 64, r: 24, t: 20, b: 70 } : { l: 170, r: 30, t: 36, b: 20 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const amt = (lakh: number) => (lakh / top) * (timeAcross ? plotH : plotW);
  const tPos = (i: number) => (n === 1 ? 0.5 : i / (n - 1)) * (timeAcross ? plotW : plotH);
  const xy = (i: number, v: number): [number, number] =>
    timeAcross ? [pad.l + tPos(i), pad.t + plotH - amt(v)] : [pad.l + amt(v), pad.t + tPos(i)];

  const path = points.map((p, i) => xy(i, p.lakhValue)).map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const labelEvery = timeAcross ? Math.ceil(n / Math.max(1, Math.floor(plotW / 46))) : 1;

  function nearest(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg || !n) return;
    const r = svg.getBoundingClientRect();
    const scale = timeAcross ? W / r.width : H / r.height;
    const pos = timeAcross ? (clientX - r.left) * scale - pad.l : (clientY - r.top) * scale - pad.t;
    const span = timeAcross ? plotW : plotH;
    const i = n === 1 ? 0 : Math.round((pos / span) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  }

  const a = active !== null ? points[active] : null;
  const [ax, ay] = active !== null ? xy(active, points[active].lakhValue) : [0, 0];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span>
          {timeAcross ? 'Time across, amount up' : 'Amount across (X axis), time down (Y axis)'} · amounts in ₹ lakh (1 lakh = ₹1,00,000)
        </span>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={timeAcross} onChange={(e) => setTimeAcross(e.target.checked)} />
          Show time across the bottom
        </label>
      </div>
      <div className="w-full overflow-x-auto">
      {/* The tooltip is positioned in this box, which is exactly the size of the chart. */}
      <div className="relative" style={{ width: '100%', maxWidth: W, minWidth: timeAcross ? Math.min(W, 640) : 520 }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          className="block focus:outline-2 focus:outline-blue-500"
          role="img"
          aria-label={`Historical AR trend, ${n} ${unit === 'month' ? 'months' : 'weeks'}. Use the arrow keys to read each point.`}
          tabIndex={0}
          style={{ touchAction: 'none', userSelect: 'none' }}
          onPointerMove={(e) => nearest(e.clientX, e.clientY)}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((v) => v ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            const back = timeAcross ? 'ArrowLeft' : 'ArrowUp';
            const fwd = timeAcross ? 'ArrowRight' : 'ArrowDown';
            if (e.key === back) { e.preventDefault(); setActive((v) => Math.max(0, (v ?? n) - 1)); }
            if (e.key === fwd) { e.preventDefault(); setActive((v) => Math.min(n - 1, (v ?? -1) + 1)); }
          }}
        >
          {/* amount gridlines and tick labels (₹ lakh, 2-lakh steps) */}
          {ticks.map((t) => {
            const d = amt(t);
            return timeAcross ? (
              <g key={t}>
                <line x1={pad.l} x2={pad.l + plotW} y1={pad.t + plotH - d} y2={pad.t + plotH - d} stroke={GRID} strokeWidth={1} />
                <text x={pad.l - 8} y={pad.t + plotH - d + 4} textAnchor="end" fontSize={12} fill={AXIS_TEXT}>{t}</text>
              </g>
            ) : (
              <g key={t}>
                <line x1={pad.l + d} x2={pad.l + d} y1={pad.t} y2={pad.t + plotH} stroke={GRID} strokeWidth={1} />
                <text x={pad.l + d} y={pad.t - 10} textAnchor="middle" fontSize={12} fill={AXIS_TEXT}>{t}</text>
              </g>
            );
          })}
          {timeAcross ? (
            <text x={14} y={pad.t + plotH / 2} fontSize={12} fill={AXIS_TEXT} transform={`rotate(-90 14 ${pad.t + plotH / 2})`} textAnchor="middle">₹ lakh</text>
          ) : (
            <text x={pad.l + plotW} y={pad.t - 24} fontSize={12} fill={AXIS_TEXT} textAnchor="end">₹ lakh</text>
          )}

          {/* time labels */}
          {points.map((p, i) => {
            if (i % labelEvery !== 0 && i !== n - 1) return null;
            const short = unit === 'month' ? p.label.replace(/ \(to .*\)$/, '*') : p.date.slice(5).split('-').reverse().join('/') + (p.partial ? '*' : '');
            const [x, y] = xy(i, 0);
            return timeAcross ? (
              <text key={p.date} x={x} y={pad.t + plotH + 18} fontSize={11} fill={AXIS_TEXT} textAnchor="end" transform={`rotate(-40 ${x} ${pad.t + plotH + 18})`}>{short}</text>
            ) : (
              <text key={p.date} x={pad.l - 10} y={y + 4} fontSize={12} fill={AXIS_TEXT} textAnchor="end">{short}</text>
            );
          })}

          {/* crosshair along the time axis */}
          {a && (timeAcross ? (
            <line x1={ax} x2={ax} y1={pad.t} y2={pad.t + plotH} stroke="#94a3b8" strokeWidth={1} />
          ) : (
            <line x1={pad.l} x2={pad.l + plotW} y1={ay} y2={ay} stroke="#94a3b8" strokeWidth={1} />
          ))}

          {/* the line and its points */}
          <path d={path} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => {
            const [x, y] = xy(i, p.lakhValue);
            return <circle key={p.date} cx={x} cy={y} r={active === i ? 6 : 4} fill={p.partial ? '#fff' : SERIES} stroke={SERIES} strokeWidth={2} />;
          })}
        </svg>

        {a && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 rounded border border-slate-200 bg-white px-3 py-2 text-xs shadow-md"
            style={{
              // Beside the point, flipping to the other side near the right or bottom edge so it never covers the point.
              left: `${(ax / W) * 100}%`,
              top: `${(ay / H) * 100}%`,
              transform: `translate(${ax > W * 0.55 ? 'calc(-100% - 14px)' : '14px'}, ${ay > H * 0.7 ? 'calc(-100% + 8px)' : '-8px'})`,
              whiteSpace: 'nowrap',
            }}
          >
            <div className="text-sm font-semibold text-slate-900">{a.closingText}</div>
            <div className="text-slate-600">₹{a.lakhText} lakh · {a.label}</div>
            <div className="text-slate-600">
              {a.changeText === null ? `No change % (previous balance was nil)` : `${a.changeText} vs ${a.previousLabel}`}
            </div>
          </div>
        )}
      </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Each point is the outstanding AR at the end of the {unit}. * and a hollow point mark a {unit} still in progress: its balance is to the end date shown.
      </p>
    </div>
  );
}
