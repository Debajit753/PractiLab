/** Tiny drawing helpers for textbook circuit diagrams. */

const ink = 'var(--ink)';

export const Wire = ({ pts, dashed }: { pts: [number, number][]; dashed?: boolean }) => (
  <polyline
    points={pts.map((p) => p.join(',')).join(' ')}
    fill="none"
    stroke={ink}
    strokeWidth={2}
    strokeDasharray={dashed ? '5 4' : undefined}
  />
);

/** Resistor from (x1, y1) to (x2, y2), horizontal or vertical. */
export function Res({
  x1,
  y1,
  x2,
  y2,
  label,
  side = 'above',
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  side?: 'above' | 'below' | 'left' | 'right';
}) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const nx = -uy;
  const ny = ux;
  const lead = len * 0.15;
  const pts = [`${x1},${y1}`, `${x1 + ux * lead},${y1 + uy * lead}`];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t = lead + ((len - 2 * lead) * (i + 0.5)) / n;
    const s = i % 2 ? -7 : 7;
    pts.push(`${x1 + ux * t + nx * s},${y1 + uy * t + ny * s}`);
  }
  pts.push(`${x2 - ux * lead},${y2 - uy * lead}`, `${x2},${y2}`);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const off = { above: [0, -16], below: [0, 26], left: [-14, 5], right: [14, 5] }[side];
  const anchor = side === 'left' ? 'end' : side === 'right' ? 'start' : 'middle';
  return (
    <g>
      <polyline points={pts.join(' ')} fill="none" stroke={ink} strokeWidth={2} />
      {label && (
        <text x={mx + off[0]} y={my + off[1]} textAnchor={anchor} fontSize={13} fill={ink}>
          {label}
        </text>
      )}
    </g>
  );
}

/** Battery / DC source, vertical, + on top. */
export function Source({ x, y1, y2, label }: { x: number; y1: number; y2: number; label?: string }) {
  const m = (y1 + y2) / 2;
  return (
    <g>
      <Wire
        pts={[
          [x, y1],
          [x, m - 6],
        ]}
      />
      <line x1={x - 18} y1={m - 6} x2={x + 18} y2={m - 6} stroke={ink} strokeWidth={3} />
      <line x1={x - 10} y1={m + 6} x2={x + 10} y2={m + 6} stroke={ink} strokeWidth={3} />
      <Wire
        pts={[
          [x, m + 6],
          [x, y2],
        ]}
      />
      <text x={x - 24} y={m - 10} textAnchor="end" fontSize={13} fill={ink}>
        +
      </text>
      {label && (
        <text x={x - 24} y={m + 12} textAnchor="end" fontSize={13} fill={ink}>
          {label}
        </text>
      )}
    </g>
  );
}

export function MeterC({ x, y, t }: { x: number; y: number; t: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={16} fill="var(--surface)" stroke={ink} strokeWidth={2} />
      <text x={x} y={y + 5} textAnchor="middle" fontSize={t.length > 1 ? 11 : 13} fontWeight={700} fill={ink}>
        {t}
      </text>
    </g>
  );
}

export const Dot = ({ x, y }: { x: number; y: number }) => <circle cx={x} cy={y} r={3.5} fill={ink} />;

export const Term = ({ x, y, label }: { x: number; y: number; label: string }) => (
  <g>
    <circle cx={x} cy={y} r={5} fill="var(--surface)" stroke={ink} strokeWidth={2} />
    <text x={x + 10} y={y + 5} fontSize={14} fontWeight={700} fill={ink}>
      {label}
    </text>
  </g>
);

export const Label = ({
  x,
  y,
  t,
  anchor = 'middle',
  size = 13,
}: {
  x: number;
  y: number;
  t: string;
  anchor?: 'start' | 'middle' | 'end';
  size?: number;
}) => (
  <text x={x} y={y} textAnchor={anchor} fontSize={size} fill={ink}>
    {t}
  </text>
);

/** Diode pointing right (anode left), horizontal. */
export function DiodeH({ x1, x2, y, label }: { x1: number; x2: number; y: number; label?: string }) {
  const m = (x1 + x2) / 2;
  return (
    <g>
      <Wire
        pts={[
          [x1, y],
          [m - 10, y],
        ]}
      />
      <polygon points={`${m - 10},${y - 11} ${m - 10},${y + 11} ${m + 10},${y}`} fill={ink} />
      <line x1={m + 10} y1={y - 11} x2={m + 10} y2={y + 11} stroke={ink} strokeWidth={3} />
      <Wire
        pts={[
          [m + 10, y],
          [x2, y],
        ]}
      />
      {label && <Label x={m} y={y - 18} t={label} />}
    </g>
  );
}
