import { useMemo, useRef, useState } from 'react';
import { dayLabel } from '../lib/format';

const W = 720;

function smoothPath(pts) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export default function TrendChart({ data = [], height = 196, color = '#6366f1' }) {
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);

  const H = height;
  const pad = { t: 16, r: 12, b: 26, l: 28 };
  const max = Math.max(4, ...data.map((d) => d.count));
  const step = data.length > 1 ? (W - pad.l - pad.r) / (data.length - 1) : 0;

  const points = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        x: pad.l + i * step,
        y: H - pad.b - (d.count / max) * (H - pad.t - pad.b),
      })),
    [data, step, max, H, pad.b, pad.t, pad.l]
  );

  const line = smoothPath(points);
  const area = points.length
    ? `${line} L${points[points.length - 1].x},${H - pad.b} L${points[0].x},${H - pad.b} Z`
    : '';

  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const uniqueTicks = [...new Set(ticks)];

  const handleMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || !points.length) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - x);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    setHover(nearest);
  };

  const active = hover !== null ? points[hover] : null;

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', padding: '4px 6px 0' }}
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Leads per day">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {uniqueTicks.map((t) => {
          const y = H - pad.b - (t / max) * (H - pad.t - pad.b);
          return (
            <g key={t}>
              <line className="grid-line" x1={pad.l} y1={y} x2={W - pad.r} y2={y} strokeDasharray="3 4" />
              <text className="axis-label" x={4} y={y + 3.5}>
                {t}
              </text>
            </g>
          );
        })}

        {area && <path d={area} fill="url(#areaFill)" />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />}

        {active && (
          <line
            x1={active.x}
            y1={pad.t - 6}
            x2={active.x}
            y2={H - pad.b}
            stroke="#c7d2fe"
            strokeWidth="1.4"
            strokeDasharray="3 4"
          />
        )}

        {points.map((p, i) => (
          <g key={p.date}>
            {(hover === i || data.length <= 1) && (
              <>
                <circle cx={p.x} cy={p.y} r="6.5" fill={color} fillOpacity="0.16" />
                <circle cx={p.x} cy={p.y} r="3.4" fill="#fff" stroke={color} strokeWidth="2.2" />
              </>
            )}
            {data.length > 1 && i % 2 === 0 && (
              <text className="axis-label" x={p.x} y={H - 6} textAnchor="middle">
                {dayLabel(p.date)}
              </text>
            )}
          </g>
        ))}
      </svg>

      {active && (
        <div
          className="chart-tip"
          style={{ left: `${(active.x / W) * 100}%`, top: `${(active.y / H) * 100}%` }}
        >
          {active.count} {active.count === 1 ? 'lead' : 'leads'} <span>· {dayLabel(active.date)}</span>
        </div>
      )}
    </div>
  );
}
