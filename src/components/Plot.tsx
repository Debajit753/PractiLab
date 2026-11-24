import type { PlotDef, Row } from '../practicals/types';

/** "Nice" tick step for an axis span. */
function niceStep(span: number, target = 5) {
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
}

function axis(min: number, max: number) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const step = niceStep(max - min);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
  return { lo, hi, ticks };
}

const fmt = (v: number) => (Math.abs(v) >= 100 || Number.isInteger(v) ? String(Math.round(v)) : String(+v.toPrecision(3)));

/** Small scatter-and-line plot of recorded readings, drawn as plain SVG. */
export function Plot({ def, rows }: { def: PlotDef; rows: Row[] }) {
  const pts = def
    .points(rows)
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    .sort((a, b) => a[0] - b[0]);
  const W = 560;
  const H = 320;
  const m = { l: 62, r: 18, t: def.markMax ? 36 : 18, b: 52 };
  if (pts.length < 2) {
    return (
      <figure className="plot">
        <figcaption>{def.title}</figcaption>
        <p className="muted">Record at least two readings to draw this graph.</p>
      </figure>
    );
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const xa = axis(Math.min(0, ...xs), Math.max(...xs));
  let theoryPts: [number, number][] = [];
  if (def.theory) {
    for (let i = 0; i <= 60; i++) {
      const x = xa.lo + ((xa.hi - xa.lo) * i) / 60;
      const y = def.theory(x, rows);
      if (y != null && Number.isFinite(y)) theoryPts.push([x, y]);
    }
  }
  const ya = axis(Math.min(0, ...ys), Math.max(...ys, ...theoryPts.map((p) => p[1])));
  const sx = (x: number) => m.l + ((x - xa.lo) / (xa.hi - xa.lo)) * (W - m.l - m.r);
  const sy = (y: number) => H - m.b - ((y - ya.lo) / (ya.hi - ya.lo)) * (H - m.t - m.b);
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${sx(x)} ${sy(y)}`).join(' ');
  const tpath = theoryPts.map(([x, y], i) => `${i ? 'L' : 'M'} ${sx(x)} ${sy(Math.min(y, ya.hi))}`).join(' ');
  const max = def.markMax ? pts.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;

  return (
    <figure className="plot">
      <figcaption>{def.title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={def.title}>
        {xa.ticks.map((t) => (
          <g key={`x${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={m.t} y2={H - m.b} stroke="var(--line)" />
            <text x={sx(t)} y={H - m.b + 18} textAnchor="middle" fontSize={12} fill="var(--muted)">
              {fmt(t)}
            </text>
          </g>
        ))}
        {ya.ticks.map((t) => (
          <g key={`y${t}`}>
            <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke="var(--line)" />
            <text x={m.l - 8} y={sy(t) + 4} textAnchor="end" fontSize={12} fill="var(--muted)">
              {fmt(t)}
            </text>
          </g>
        ))}
        <line x1={m.l} x2={W - m.r} y1={sy(Math.max(ya.lo, 0))} y2={sy(Math.max(ya.lo, 0))} stroke="var(--ink)" />
        <line x1={sx(Math.max(xa.lo, 0))} x2={sx(Math.max(xa.lo, 0))} y1={m.t} y2={H - m.b} stroke="var(--ink)" />
        {tpath && <path d={tpath} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="5 4" />}
        <path d={path} fill="none" stroke="var(--brand)" strokeWidth={2.2} />
        {pts.map(([x, y], i) => (
          <circle key={i} cx={sx(x)} cy={sy(y)} r={4.5} fill="var(--surface)" stroke="var(--brand)" strokeWidth={2} />
        ))}
        {max && (
          <g>
            <circle cx={sx(max[0])} cy={sy(max[1])} r={8} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
            <text x={sx(max[0])} y={sy(max[1]) - 14} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--accent)">
              max at {fmt(max[0])}
            </text>
          </g>
        )}
        <text x={(m.l + W - m.r) / 2} y={H - 10} textAnchor="middle" fontSize={13} fill="var(--ink)">
          {def.xLabel}
        </text>
        <text
          x={16}
          y={(m.t + H - m.b) / 2}
          textAnchor="middle"
          fontSize={13}
          fill="var(--ink)"
          transform={`rotate(-90 16 ${(m.t + H - m.b) / 2})`}
        >
          {def.yLabel}
        </text>
      </svg>
      {def.theory && <p className="muted small">Solid line: your readings. Dashed line: theoretical curve.</p>}
    </figure>
  );
}
