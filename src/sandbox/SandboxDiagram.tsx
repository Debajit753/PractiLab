import { eng, schematicOf, type BoardResult, type Part, type SchematicEdge } from './model';

const ink = 'var(--ink)';
const RAIL_GAP = 84;
const SLOT = 104;
const TOP = 46;
const LEFT = 96;

/** Symbol for one part, drawn vertically between y1 (leg at top) and y2, centred on x. */
function Symbol({
  e,
  x,
  y1,
  y2,
  aTop,
  reading,
}: {
  e: SchematicEdge;
  x: number;
  y1: number;
  y2: number;
  aTop: boolean;
  reading?: number;
}) {
  const p = e.part;
  const mid = (y1 + y2) / 2;
  const h = 22; // half-height of the symbol
  const lead = (
    <g>
      <line x1={x} y1={y1} x2={x} y2={mid - h} stroke={ink} strokeWidth={2} />
      <line x1={x} y1={mid + h} x2={x} y2={y2} stroke={ink} strokeWidth={2} />
    </g>
  );
  const label = (text: string, sub?: string) => (
    <g>
      <text x={x + 18} y={mid - 2} fontSize={12} fontWeight={700} fill={ink}>
        {text}
      </text>
      {sub && (
        <text x={x + 18} y={mid + 13} fontSize={11} fill="var(--muted)">
          {sub}
        </text>
      )}
    </g>
  );
  const zig = (arrow = false) => {
    const pts: string[] = [`${x},${mid - h}`];
    for (let i = 0; i < 6; i++) pts.push(`${x + (i % 2 ? -7 : 7)},${mid - h + ((2 * h) / 6) * (i + 0.5)}`);
    pts.push(`${x},${mid + h}`);
    return (
      <g>
        <polyline points={pts.join(' ')} fill="none" stroke={ink} strokeWidth={2} />
        {arrow && (
          <path
            d={`M ${x - 14} ${mid + 14} L ${x + 12} ${mid - 12} M ${x + 12} ${mid - 12} l -8 1 M ${x + 12} ${mid - 12} l -1 8`}
            stroke={ink}
            strokeWidth={2}
            fill="none"
          />
        )}
      </g>
    );
  };
  // +1 when leg a (anode / +) is at the top
  const dir = aTop ? 1 : -1;
  switch (p.kind) {
    case 'resistor':
      return (
        <g>
          {lead}
          {zig()}
          {label(p.label, `${eng(p.value)}Ω`)}
        </g>
      );
    case 'pot':
      return (
        <g>
          {lead}
          {zig(true)}
          {label(p.label, `${eng(p.value * (p.wiper ?? 0.5))}Ω`)}
        </g>
      );
    case 'diode':
    case 'led': {
      const tipY = mid + dir * 10;
      const baseY = mid - dir * 10;
      return (
        <g>
          <line x1={x} y1={y1} x2={x} y2={y2} stroke={ink} strokeWidth={2} />
          <polygon
            points={`${x - 10},${baseY} ${x + 10},${baseY} ${x},${tipY}`}
            fill={p.kind === 'led' && !p.broken ? '#ff6b5e' : ink}
            stroke={ink}
            strokeWidth={1.5}
          />
          <line x1={x - 10} y1={tipY} x2={x + 10} y2={tipY} stroke={ink} strokeWidth={2.5} />
          {p.kind === 'led' && (
            <path d={`M ${x - 12} ${mid - 4} l -10 -8 M ${x - 12} ${mid + 5} l -10 -8`} stroke={ink} strokeWidth={1.5} />
          )}
          {label(p.label, p.kind === 'led' ? `${p.color ?? 'red'} LED${p.broken ? ' (burnt)' : ''}` : '1N4007')}
        </g>
      );
    }
    case 'battery':
    case 'supply': {
      const plus = mid - dir * 5;
      const minus = mid + dir * 5;
      return (
        <g>
          <line x1={x} y1={y1} x2={x} y2={Math.min(plus, minus)} stroke={ink} strokeWidth={2} />
          <line x1={x} y1={Math.max(plus, minus)} x2={x} y2={y2} stroke={ink} strokeWidth={2} />
          <line x1={x - 16} y1={plus} x2={x + 16} y2={plus} stroke={ink} strokeWidth={3} />
          <line x1={x - 8} y1={minus} x2={x + 8} y2={minus} stroke={ink} strokeWidth={4} />
          <text x={x - 22} y={plus + (dir > 0 ? -4 : 12)} fontSize={13} fontWeight={800} fill="#d32f2f" textAnchor="middle">
            +
          </text>
          {label(p.label, `${p.value} V`)}
        </g>
      );
    }
    case 'switch':
      return (
        <g>
          <line x1={x} y1={y1} x2={x} y2={mid - 12} stroke={ink} strokeWidth={2} />
          <line x1={x} y1={mid + 12} x2={x} y2={y2} stroke={ink} strokeWidth={2} />
          <circle cx={x} cy={mid - 12} r={3} fill={ink} />
          <circle cx={x} cy={mid + 12} r={3} fill={ink} />
          <line x1={x} y1={mid + 12} x2={p.closed ? x : x + 14} y2={mid - 12} stroke={ink} strokeWidth={2} />
          {label(p.label, p.closed ? 'ON' : 'OFF')}
        </g>
      );
    case 'voltmeter':
    case 'ammeter': {
      const v = reading ?? 0;
      return (
        <g>
          {lead}
          <circle cx={x} cy={mid} r={h - 4} fill="var(--surface)" stroke={ink} strokeWidth={2} />
          <text x={x} y={mid + 5} textAnchor="middle" fontSize={14} fontWeight={800} fill={ink}>
            {p.kind === 'voltmeter' ? 'V' : 'A'}
          </text>
          {label(p.label, p.kind === 'voltmeter' ? `${v.toFixed(3)} V` : `${(v * 1000).toFixed(2)} mA`)}
        </g>
      );
    }
    default:
      return lead;
  }
}

/** Live circuit diagram: one horizontal line per node, highest voltage at the top. */
export function SandboxDiagram({ parts, result }: { parts: Part[]; result: BoardResult }) {
  const { nets, edges } = schematicOf(parts, result);
  if (!edges.length) return <p className="muted small">Place some parts on the breadboard to see their circuit diagram here.</p>;

  const order = [...nets].sort((a, b) => b.volts - a.volts || a.id.localeCompare(b.id));
  const railIdx = new Map(order.map((n, i) => [n.id, i]));
  const railY = (id: string) => TOP + (railIdx.get(id) ?? 0) * RAIL_GAP;
  // Sources first (at the far left, so no node line crosses them), then by the nodes each part joins.
  const isSrc = (e: SchematicEdge) => e.part.kind === 'battery' || e.part.kind === 'supply';
  const key = (e: SchematicEdge) =>
    (isSrc(e) ? 0 : 10000) +
    Math.min(railIdx.get(e.na)!, railIdx.get(e.nb)!) * 100 +
    Math.max(railIdx.get(e.na)!, railIdx.get(e.nb)!);
  const sorted = [...edges].sort((a, b) => key(a) - key(b));
  const xOf = new Map(sorted.map((e, i) => [e.part.id, LEFT + 30 + i * SLOT]));
  const width = LEFT + 30 + sorted.length * SLOT + 40;
  const height = TOP + Math.max(order.length - 1, 1) * RAIL_GAP + 50;

  const attach = new Map<string, number[]>();
  for (const e of sorted) {
    const x = xOf.get(e.part.id)!;
    for (const n of [e.na, e.nb]) attach.set(n, [...(attach.get(n) ?? []), x]);
  }

  return (
    <svg
      className="sb-diagram"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Circuit diagram of the parts on the breadboard"
    >
      {order.map((n) => {
        const xs = attach.get(n.id) ?? [LEFT];
        const x1 = Math.min(...xs) - 26;
        const x2 = Math.max(...xs) + 26;
        const y = railY(n.id);
        return (
          <g key={n.id}>
            <line x1={x1} y1={y} x2={x2} y2={y} stroke={ink} strokeWidth={2} />
            <text x={x1 - 6} y={y - 5} textAnchor="end" fontSize={11} fontWeight={700} fill="var(--brand)">
              {`${n.volts.toFixed(3)} V`}
            </text>
            {n.ground && (
              <g>
                <line x1={x1} y1={y} x2={x1} y2={y + 12} stroke={ink} strokeWidth={2} />
                <line x1={x1 - 10} y1={y + 12} x2={x1 + 10} y2={y + 12} stroke={ink} strokeWidth={2} />
                <line x1={x1 - 6} y1={y + 17} x2={x1 + 6} y2={y + 17} stroke={ink} strokeWidth={2} />
                <line x1={x1 - 2} y1={y + 22} x2={x1 + 2} y2={y + 22} stroke={ink} strokeWidth={2} />
              </g>
            )}
            {xs.length > 1 && xs.map((x, i) => <circle key={i} cx={x} cy={y} r={3.5} fill={ink} />)}
          </g>
        );
      })}
      {sorted.map((e) => {
        const x = xOf.get(e.part.id)!;
        const ya = railY(e.na);
        const yb = railY(e.nb);
        if (e.na === e.nb) {
          // both legs on the same node: draw it as a little loop below the line
          return (
            <g key={e.part.id}>
              <Symbol e={e} x={x} y1={ya} y2={ya + 60} aTop reading={result.parts[e.part.id]?.reading} />
              <path d={`M ${x} ${ya + 60} h -16 V ${ya}`} fill="none" stroke={ink} strokeWidth={2} />
            </g>
          );
        }
        const aTop = ya < yb;
        return (
          <Symbol
            key={e.part.id}
            e={e}
            x={x}
            y1={Math.min(ya, yb)}
            y2={Math.max(ya, yb)}
            aTop={aTop}
            reading={result.parts[e.part.id]?.reading}
          />
        );
      })}
    </svg>
  );
}
