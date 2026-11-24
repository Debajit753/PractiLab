import { eng, HOLE_BY_ID, resistorBands, type LedColor, type Part, type PartResult } from './model';

const LED_FILL: Record<LedColor, { on: string; off: string }> = {
  red: { on: '#ff3b30', off: '#7a1f1a' },
  green: { on: '#34e36b', off: '#1f5f33' },
  yellow: { on: '#ffd60a', off: '#7a6a1a' },
  blue: { on: '#3d8bff', off: '#1c3a6e' },
};

export const WIRE_FILL: Record<string, string> = {
  red: '#e0332f',
  black: '#2a2a2a',
  blue: '#2a6ee8',
  green: '#2fa651',
  yellow: '#f4c20d',
  orange: '#f57c00',
  white: '#f2f2f2',
};

function Lcd({ x, y, w, text, color = '#7dff8a' }: { x: number; y: number; w: number; text: string; color?: string }) {
  return (
    <g>
      <rect x={x - w / 2} y={y - 11} width={w} height={22} rx={3} fill="#0c1a0e" stroke="#3b6b41" />
      <text x={x} y={y + 5} textAnchor="middle" fontSize={13} fill={color} fontFamily="Consolas, 'Courier New', monospace">
        {text}
      </text>
    </g>
  );
}

/** One part on the breadboard: legs into its two holes, body in between. */
export function PartView({
  p,
  r,
  selected,
  onPointerDown,
}: {
  p: Part;
  r?: PartResult;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const A = HOLE_BY_ID.get(p.a);
  const B = HOLE_BY_ID.get(p.b);
  if (!A || !B) return null;
  const mx = (A.x + B.x) / 2;
  const my = (A.y + B.y) / 2;
  const angle = (Math.atan2(B.y - A.y, B.x - A.x) * 180) / Math.PI;
  const leads = (
    <g>
      <line x1={A.x} y1={A.y} x2={mx} y2={my} stroke="#9aa0a6" strokeWidth={3} strokeLinecap="round" />
      <line x1={B.x} y1={B.y} x2={mx} y2={my} stroke="#9aa0a6" strokeWidth={3} strokeLinecap="round" />
      <circle cx={A.x} cy={A.y} r={4} fill="#9aa0a6" />
      <circle cx={B.x} cy={B.y} r={4} fill="#9aa0a6" />
    </g>
  );
  const plus = (
    <text x={A.x + 9} y={A.y - 8} fontSize={14} fontWeight={800} fill="#d32f2f" pointerEvents="none">
      +
    </text>
  );
  const label = (dy: number, text: string) => (
    <text
      x={mx}
      y={my + dy}
      textAnchor="middle"
      fontSize={12}
      fontWeight={700}
      fill="#1d2330"
      pointerEvents="none"
      className="part-label"
    >
      {text}
    </text>
  );

  let body: JSX.Element;
  switch (p.kind) {
    case 'wire': {
      const c = WIRE_FILL[p.color ?? 'red'] ?? '#e0332f';
      const lift = Math.min(40, Math.hypot(B.x - A.x, B.y - A.y) * 0.2);
      const d = `M ${A.x} ${A.y} Q ${mx} ${my - lift} ${B.x} ${B.y}`;
      return (
        <g className="sb-part" onPointerDown={onPointerDown}>
          <path d={d} fill="none" stroke="transparent" strokeWidth={16} />
          {selected && <path d={d} fill="none" stroke="#ff8f00" strokeWidth={11} strokeLinecap="round" opacity={0.7} />}
          <path d={d} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={7} strokeLinecap="round" />
          <path d={d} fill="none" stroke={c} strokeWidth={5} strokeLinecap="round" />
          <circle cx={A.x} cy={A.y} r={4.5} fill={c} stroke="#333" />
          <circle cx={B.x} cy={B.y} r={4.5} fill={c} stroke="#333" />
        </g>
      );
    }
    case 'resistor': {
      const bands = resistorBands(p.value);
      body = (
        <g>
          {leads}
          <g transform={`translate(${mx} ${my}) rotate(${angle})`}>
            <rect x={-24} y={-8} width={48} height={16} rx={7} fill={r?.warning ? '#b5651d' : '#e8d3a8'} stroke="#8a6d3b" />
            {[-15, -8, -1].map((x, i) => (
              <rect key={i} x={x} y={-8} width={4} height={16} fill={bands[i]} />
            ))}
            <rect x={13} y={-8} width={4} height={16} fill={bands[3]} />
          </g>
          {label(-16, `${p.label} ${eng(p.value)}Ω`)}
        </g>
      );
      break;
    }
    case 'diode':
      body = (
        <g>
          {leads}
          <g transform={`translate(${mx} ${my}) rotate(${angle})`}>
            <rect x={-18} y={-7} width={36} height={14} rx={4} fill="#1d1d1d" />
            <rect x={10} y={-7} width={4} height={14} fill="#c8c8c8" />
          </g>
          {label(-14, p.label)}
        </g>
      );
      break;
    case 'led': {
      const color = (p.color as LedColor) ?? 'red';
      const bright = p.broken ? 0 : Math.max(0, Math.min(1, (r?.amps ?? 0) / 0.015));
      body = (
        <g>
          {leads}
          {bright > 0.02 && (
            <circle cx={mx} cy={my} r={30} fill={LED_FILL[color].on} opacity={0.35 * bright} filter="url(#sbGlow)" />
          )}
          <circle
            cx={mx}
            cy={my}
            r={13}
            fill={p.broken ? '#3a3a3a' : bright > 0.02 ? LED_FILL[color].on : LED_FILL[color].off}
            stroke="#00000055"
            strokeWidth={2}
            opacity={p.broken ? 1 : 0.6 + 0.4 * bright}
          />
          <circle cx={mx - 4} cy={my - 5} r={4} fill="rgba(255,255,255,0.5)" />
          {p.broken && (
            <path
              d={`M ${mx - 7} ${my - 7} L ${mx + 7} ${my + 7} M ${mx + 7} ${my - 7} L ${mx - 7} ${my + 7}`}
              stroke="#ff8f00"
              strokeWidth={3}
            />
          )}
          {plus}
          {label(-20, p.label)}
        </g>
      );
      break;
    }
    case 'switch':
      body = (
        <g>
          {leads}
          <rect x={mx - 24} y={my - 13} width={48} height={26} rx={5} fill="#3a3f45" stroke="#1b1e21" />
          <line
            x1={mx - 14}
            y1={my + 4}
            x2={mx + 14}
            y2={p.closed ? my + 4 : my - 8}
            stroke="#e8e8e8"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <circle cx={mx - 14} cy={my + 4} r={3} fill="#e8e8e8" />
          <circle cx={mx + 14} cy={my + 4} r={3} fill="#e8e8e8" />
          {label(-19, `${p.label} ${p.closed ? 'ON' : 'OFF'}`)}
        </g>
      );
      break;
    case 'pot': {
      const a = -135 + 270 * (p.wiper ?? 0.5);
      body = (
        <g>
          {leads}
          <rect x={mx - 22} y={my - 18} width={44} height={36} rx={5} fill="#1e5aa8" stroke="#0f3466" />
          <circle cx={mx} cy={my} r={11} fill="#d9d9d9" stroke="#777" />
          <line
            x1={mx}
            y1={my}
            x2={mx + 9 * Math.sin((a * Math.PI) / 180)}
            y2={my - 9 * Math.cos((a * Math.PI) / 180)}
            stroke="#333"
            strokeWidth={3}
            strokeLinecap="round"
          />
          {label(-24, `${p.label} ${eng(p.value * (p.wiper ?? 0.5))}Ω`)}
        </g>
      );
      break;
    }
    case 'battery':
      body = (
        <g>
          {leads}
          <rect
            x={mx - 30}
            y={my - 17}
            width={60}
            height={34}
            rx={5}
            fill="#2b2b2b"
            stroke={r?.warning ? '#ff3b30' : '#111'}
            strokeWidth={r?.warning ? 3 : 1}
          />
          <rect x={mx - 30} y={my - 17} width={16} height={34} rx={3} fill="#c58b2b" />
          <text x={mx + 8} y={my + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill="#f2f2f2">
            {p.value} V
          </text>
          {plus}
          {label(-23, p.label)}
        </g>
      );
      break;
    case 'supply':
      body = (
        <g>
          {leads}
          <rect
            x={mx - 46}
            y={my - 26}
            width={92}
            height={52}
            rx={6}
            fill="#cfd4d9"
            stroke={r?.warning ? '#ff3b30' : '#7b8188'}
            strokeWidth={r?.warning ? 3 : 1.5}
          />
          <Lcd
            x={mx}
            y={my - 9}
            w={78}
            text={r?.warning ? 'SHORT' : `${p.value.toFixed(2)} V`}
            color={r?.warning ? '#ff6b5e' : '#7dff8a'}
          />
          <text x={mx} y={my + 17} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1d2330">
            {`${eng(Math.abs(r?.amps ?? 0))}A`}
          </text>
          {plus}
          {label(-32, p.label)}
        </g>
      );
      break;
    case 'voltmeter':
    case 'ammeter': {
      const v = r?.reading ?? 0;
      const text =
        p.kind === 'voltmeter'
          ? `${v.toFixed(Math.abs(v) < 10 ? 3 : 2)} V`
          : `${(v * 1000).toFixed(Math.abs(v) < 0.1 ? 2 : 1)} mA`;
      body = (
        <g>
          {leads}
          <rect x={mx - 40} y={my - 21} width={80} height={42} rx={7} fill="#f5c400" stroke="#6b5600" />
          <Lcd x={mx} y={my - 4} w={70} text={text} />
          <text x={mx} y={my + 17} textAnchor="middle" fontSize={10} fontWeight={800} fill="#3b3000">
            {p.kind === 'voltmeter' ? 'VOLTMETER' : 'AMMETER'}
          </text>
          {plus}
          {label(-27, p.label)}
        </g>
      );
      break;
    }
    default:
      body = leads;
  }
  return (
    <g className="sb-part" onPointerDown={onPointerDown}>
      {selected && <circle cx={mx} cy={my} r={42} fill="#ff8f0022" stroke="#ff8f00" strokeWidth={2} strokeDasharray="6 4" />}
      {body}
    </g>
  );
}
