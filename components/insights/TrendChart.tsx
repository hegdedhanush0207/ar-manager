'use client';

/**
 * Historical AR trend: an interactive line chart (hand-built SVG, no chart library).
 *
 * As the Phase 2 brief specifies: X axis = time (months by default, or weeks), earliest
 * on the left; Y axis = amount in ₹ lakh with 2-lakh steps from 0. Hovering (or the
 * arrow keys) snaps to the nearest period and shows its date, balance and % change.
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
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const n = points.length;
  const top = ticks[ticks.length - 1];

  // Geometry in SVG user units: time across (X), amount up (Y, 0 … top lakh).
  const W = Math.max(640, 90 + n * 40);
  const H = 360;
  const pad = { l: 64, r: 24, t: 20, b: 70 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (n === 1 ? 0.5 : i / (n - 1)) * plotW;
  const y = (lakh: number) => pad.t + plotH - (lakh / top) * plotH;

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.lakhValue).toFixed(1)}`).join(' ');
  const labelEvery = Math.ceil(n / Math.max(1, Math.floor(plotW / 46))); // thin the time labels only when they would collide

  function nearest(clientX: number) {
    const svg = svgRef.current;
    if (!svg || !n) return;
    const r = svg.getBoundingClientRect();
    const pos = (clientX - r.left) * (W / r.width) - pad.l;
    const i = n === 1 ? 0 : Math.round((pos / plotW) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  }

  const a = active !== null ? points[active] : null;
  const ax = active !== null ? x(active) : 0;
  const ay = active !== null ? y(points[active].lakhValue) : 0;

  return (
    <div>
      <div className="mb-2 text-xs text-slate-600">
        X axis: {unit === 'month' ? 'month' : 'week'} · Y axis: outstanding AR in ₹ lakh (1 lakh = ₹1,00,000), 2-lakh steps
      </div>
      <div className="w-full overflow-x-auto">
        {/* The tooltip is positioned in this box, which is exactly the size of the chart. */}
        <div className="relative" style={{ width: '100%', maxWidth: W, minWidth: Math.min(W, 640) }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            className="block focus:outline-2 focus:outline-blue-500"
            role="img"
            aria-label={`Historical AR trend, ${n} ${unit === 'month' ? 'months' : 'weeks'}. Use the left and right arrow keys to read each point.`}
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
            {/* Y axis: amount gridlines and labels (₹ lakh, 2-lakh steps) */}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={pad.l + plotW} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
                <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill={AXIS_TEXT}>{t}</text>
              </g>
            ))}
            <text x={14} y={pad.t + plotH / 2} fontSize={12} fill={AXIS_TEXT} transform={`rotate(-90 14 ${pad.t + plotH / 2})`} textAnchor="middle">₹ lakh</text>

            {/* X axis: time labels */}
            {points.map((p, i) => {
              if (i % labelEvery !== 0 && i !== n - 1) return null;
              const short = unit === 'month' ? p.label.replace(/ \(to .*\)$/, '*') : p.date.slice(5).split('-').reverse().join('/') + (p.partial ? '*' : '');
              const ly = pad.t + plotH + 18;
              return (
                <text key={p.date} x={x(i)} y={ly} fontSize={11} fill={AXIS_TEXT} textAnchor="end" transform={`rotate(-40 ${x(i)} ${ly})`}>{short}</text>
              );
            })}

            {/* crosshair at the hovered period */}
            {a && <line x1={ax} x2={ax} y1={pad.t} y2={pad.t + plotH} stroke="#94a3b8" strokeWidth={1} />}

            {/* the line and its points */}
            <path d={path} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => (
              <circle key={p.date} cx={x(i)} cy={y(p.lakhValue)} r={active === i ? 6 : 4} fill={p.partial ? '#fff' : SERIES} stroke={SERIES} strokeWidth={2} />
            ))}
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
