import type { Pt, SocketColor, SymbolDef, TraceDef } from '../../kits/types';

export const SOCKET_FILL: Record<SocketColor, { fill: string; edge: string }> = {
  red: { fill: '#d32f2f', edge: '#8e1b1b' },
  black: { fill: '#232323', edge: '#000000' },
  yellow: { fill: '#f2b705', edge: '#a87e00' },
  blue: { fill: '#1e63d6', edge: '#123f8a' },
  green: { fill: '#2e9b4b', edge: '#1b6230' },
};

export const WIRE_COLORS: Record<SocketColor, { body: string; edge: string }> = {
  red: { body: '#e0332f', edge: '#7c1412' },
  black: { body: '#2a2a2a', edge: '#000000' },
  yellow: { body: '#f4c20d', edge: '#8a6d00' },
  blue: { body: '#2a6ee8', edge: '#123f8a' },
  green: { body: '#2fa651', edge: '#155a28' },
};

export function SocketVisual({ x, y, color }: { x: number; y: number; color: SocketColor }) {
  const c = SOCKET_FILL[color];
  return (
    <g>
      <circle cx={x} cy={y + 2} r={22} fill="rgba(0,0,0,0.25)" />
      <circle cx={x} cy={y} r={21} fill={c.fill} stroke={c.edge} strokeWidth={2} />
      <circle cx={x - 6} cy={y - 7} r={6} fill="rgba(255,255,255,0.25)" />
      <circle cx={x} cy={y} r={11.5} fill="#bdbdbd" stroke="#6b6b6b" strokeWidth={1.5} />
      <circle cx={x} cy={y} r={6.5} fill="#1a1a1a" />
    </g>
  );
}

export function Screw({ x, y, r = 11 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="url(#screwGrad)" stroke="#777" strokeWidth={1} />
      <line x1={x - r * 0.6} y1={y - r * 0.6} x2={x + r * 0.6} y2={y + r * 0.6} stroke="#666" strokeWidth={2} />
      <line x1={x - r * 0.6} y1={y + r * 0.6} x2={x + r * 0.6} y2={y - r * 0.6} stroke="#666" strokeWidth={2} />
    </g>
  );
}

export function ResistorZigzag({ from, to }: { from: Pt; to: Pt }) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const nx = -uy;
  const ny = ux;
  const lead = len * 0.12;
  const peaks = 7;
  const body = len - 2 * lead;
  const amp = 9;
  const pts: string[] = [`${x1},${y1}`, `${x1 + ux * lead},${y1 + uy * lead}`];
  for (let i = 0; i < peaks; i++) {
    const t = lead + (body * (i + 0.5)) / peaks;
    const s = i % 2 === 0 ? amp : -amp;
    pts.push(`${x1 + ux * t + nx * s},${y1 + uy * t + ny * s}`);
  }
  pts.push(`${x2 - ux * lead},${y2 - uy * lead}`, `${x2},${y2}`);
  return <polyline points={pts.join(' ')} fill="none" stroke="#1c1c1c" strokeWidth={2.6} strokeLinejoin="round" />;
}

export function Trace({ t }: { t: TraceDef }) {
  return (
    <polyline
      points={t.points.map((p) => p.join(',')).join(' ')}
      fill="none"
      stroke="#1c1c1c"
      strokeWidth={2.6}
      strokeDasharray={t.dashed ? '7 6' : undefined}
      markerEnd={t.arrow ? 'url(#arrowHead)' : undefined}
    />
  );
}

export function MeterSymbol({ s }: { s: SymbolDef }) {
  return (
    <g>
      <circle cx={s.x} cy={s.y} r={26} fill="#f7f2e2" stroke="#1c1c1c" strokeWidth={2.4} />
      <text x={s.x} y={s.y + 7} textAnchor="middle" fontSize={s.kind === 'V' ? 22 : 19} fontWeight={700} fill="#1c1c1c">
        {s.kind}
      </text>
    </g>
  );
}

export function wirePath(a: Pt, b: Pt): string {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const sag = 30 + dist * 0.28;
  const low = Math.max(y1, y2) + sag;
  const c1x = x1 + (x2 - x1) * 0.2;
  const c2x = x1 + (x2 - x1) * 0.8;
  return `M ${x1} ${y1} C ${c1x} ${low}, ${c2x} ${low}, ${x2} ${y2}`;
}

export function Plug({ x, y, color }: { x: number; y: number; color: SocketColor }) {
  const c = WIRE_COLORS[color];
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={14} fill={c.body} stroke={c.edge} strokeWidth={2} />
      <circle cx={x - 4} cy={y - 5} r={4} fill="rgba(255,255,255,0.35)" />
      <circle cx={x} cy={y} r={5} fill={c.edge} />
    </g>
  );
}

export function SharedDefs() {
  return (
    <defs>
      <radialGradient id="screwGrad" cx="35%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="60%" stopColor="#c9c9c9" />
        <stop offset="100%" stopColor="#8d8d8d" />
      </radialGradient>
      <linearGradient id="frameGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c3c7ca" />
        <stop offset="100%" stopColor="#9da2a6" />
      </linearGradient>
      <radialGradient id="knobGrad" cx="40%" cy="35%" r="75%">
        <stop offset="0%" stopColor="#5a5a5a" />
        <stop offset="70%" stopColor="#1e1e1e" />
        <stop offset="100%" stopColor="#0c0c0c" />
      </radialGradient>
      <radialGradient id="nutGrad" cx="40%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#f4f4f4" />
        <stop offset="100%" stopColor="#8b8b8b" />
      </radialGradient>
      <radialGradient id="ledOn" cx="40%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#ffd0d0" />
        <stop offset="40%" stopColor="#ff3b30" />
        <stop offset="100%" stopColor="#a30000" />
      </radialGradient>
      <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="6" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="wireShadow" x="-10%" y="-10%" width="120%" height="130%">
        <feDropShadow dx="2" dy="5" stdDeviation="3" floodColor="#000" floodOpacity="0.3" />
      </filter>
      <marker id="arrowHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="#1c1c1c" />
      </marker>
    </defs>
  );
}
