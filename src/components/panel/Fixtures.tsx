import { useEffect, useRef } from 'react';
import type { DecadeBoxDef, DiodeDef, MeterDef, Pt, SwitchDef } from '../../kits/types';

const stop = (e: React.PointerEvent) => e.stopPropagation();

/** Attach a non-passive wheel listener (React's own is passive). */
function useWheel(ref: React.RefObject<SVGGElement>, onWheel: (up: boolean) => void) {
  const cb = useRef(onWheel);
  cb.current = onWheel;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = (e: WheelEvent) => {
      e.preventDefault();
      cb.current(e.deltaY < 0);
    };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  }, [ref]);
}

function Dial({
  x,
  y,
  digit,
  mult,
  onChange,
}: {
  x: number;
  y: number;
  digit: number;
  mult: number;
  onChange: (d: number) => void;
}) {
  const ref = useRef<SVGGElement>(null);
  const step = (dir: number) => onChange((digit + dir + 10) % 10);
  useWheel(ref, (up) => step(up ? 1 : -1));
  const angle = -135 + digit * 30;
  const marks = [];
  for (let i = 0; i < 10; i++) {
    const a = ((-135 + i * 30) * Math.PI) / 180;
    marks.push(
      <text
        key={i}
        x={x + 33 * Math.sin(a)}
        y={y - 33 * Math.cos(a) + 4}
        textAnchor="middle"
        fontSize={10}
        fill="#e8e8e8"
        fontFamily="Arial"
      >
        {i}
      </text>,
    );
  }
  return (
    <g
      ref={ref}
      tabIndex={0}
      role="spinbutton"
      aria-label={`Decade dial times ${mult}`}
      aria-valuenow={digit}
      className="dial"
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => {
        stop(e);
        step(e.button === 2 ? -1 : 1);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
          e.preventDefault();
          step(1);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
          e.preventDefault();
          step(-1);
        }
      }}
    >
      {marks}
      <circle cx={x} cy={y} r={22} fill="url(#knobGrad)" stroke="#000" strokeWidth={2} />
      <g transform={`rotate(${angle} ${x} ${y})`}>
        <rect x={x - 2.5} y={y - 21} width={5} height={13} rx={2} fill="#f5f5f5" />
      </g>
      <text x={x} y={y + 62} textAnchor="middle" fontSize={13} fontWeight={700} fill="#e8e8e8" fontFamily="Arial">
        ×{mult}
      </text>
    </g>
  );
}

/** Decade resistance box: one rotary dial per decade. */
export function DecadeBox({ def, value, onChange }: { def: DecadeBoxDef; value: number; onChange: (ohms: number) => void }) {
  const spacing = 80;
  const w = def.dials.length * spacing + 30;
  const h = 196;
  const x0 = def.x;
  const y0 = def.y;
  const digits = def.dials.map((m) => Math.floor(value / m) % 10);
  return (
    <g>
      <rect x={x0 + 4} y={y0 + 6} width={w} height={h} rx={10} fill="rgba(0,0,0,0.25)" />
      <rect x={x0} y={y0} width={w} height={h} rx={10} fill="#2b2f33" stroke="#111" strokeWidth={2} />
      <text x={x0 + w / 2} y={y0 + 24} textAnchor="middle" fontSize={15} fontWeight={700} fill="#f2f2f2" fontFamily="Arial">
        {def.title}
      </text>
      {def.dials.map((m, i) => (
        <Dial
          key={m}
          x={x0 + 15 + spacing / 2 + i * spacing}
          y={y0 + 88}
          digit={digits[i]}
          mult={m}
          onChange={(d) => onChange(value - digits[i] * m + d * m)}
        />
      ))}
      <rect x={x0 + w / 2 - 70} y={y0 + h - 34} width={140} height={24} rx={4} fill="#0f1f12" stroke="#2c4a30" />
      <text x={x0 + w / 2} y={y0 + h - 16} textAnchor="middle" fontSize={15} fill="#7dff8a" fontFamily="Consolas, monospace">
        {value} Ω
      </text>
    </g>
  );
}

/** Two-way toggle switch. Lever up selects throw A, down selects throw B. */
export function SpdtSwitch({ def, pos, onChange }: { def: SwitchDef; pos: 'a' | 'b'; onChange: (p: 'a' | 'b') => void }) {
  const { x, y } = def;
  const dir = pos === 'a' ? -1 : 1;
  const flip = () => onChange(pos === 'a' ? 'b' : 'a');
  return (
    <g
      role="switch"
      aria-checked={pos === 'a'}
      aria-label={`Switch: ${pos === 'a' ? def.labelA : def.labelB}`}
      tabIndex={0}
      className="toggle"
      style={{ cursor: 'pointer' }}
      onPointerDown={stop}
      onClick={flip}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          flip();
        }
      }}
    >
      <circle cx={x} cy={y} r={36} fill="transparent" />
      <rect x={x - 22} y={y - 22} width={44} height={44} rx={6} fill="url(#nutGrad)" stroke="#6d6d6d" />
      <circle cx={x} cy={y} r={13} fill="#2b2b2b" />
      <line x1={x} y1={y} x2={x} y2={y + dir * 34} stroke="#9a9a9a" strokeWidth={10} strokeLinecap="round" />
      <line x1={x} y1={y} x2={x} y2={y + dir * 34} stroke="#dcdcdc" strokeWidth={4} strokeLinecap="round" />
      <circle cx={x} cy={y + dir * 36} r={8} fill="url(#nutGrad)" stroke="#6d6d6d" />
      <text
        x={x}
        y={y - 46}
        textAnchor="middle"
        fontSize={13}
        fontWeight={pos === 'a' ? 800 : 400}
        fill="#1c1c1c"
        fontFamily="Arial"
      >
        {def.labelA}
      </text>
      <text
        x={x}
        y={y + 58}
        textAnchor="middle"
        fontSize={13}
        fontWeight={pos === 'b' ? 800 : 400}
        fill="#1c1c1c"
        fontFamily="Arial"
      >
        {def.labelB}
      </text>
    </g>
  );
}

/** Diode symbol: triangle pointing from anode to cathode, then a bar. */
export function DiodeSymbol({ def }: { def: DiodeDef }) {
  const [x1, y1] = def.from;
  const [x2, y2] = def.to;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const nx = -uy;
  const ny = ux;
  const mid: Pt = [(x1 + x2) / 2, (y1 + y2) / 2];
  const s = 18;
  const back: Pt = [mid[0] - ux * s, mid[1] - uy * s];
  const tip: Pt = [mid[0] + ux * s, mid[1] + uy * s];
  return (
    <g>
      <line x1={x1} y1={y1} x2={back[0]} y2={back[1]} stroke="#1c1c1c" strokeWidth={2.6} />
      <line x1={tip[0]} y1={tip[1]} x2={x2} y2={y2} stroke="#1c1c1c" strokeWidth={2.6} />
      <polygon
        points={`${back[0] + nx * s},${back[1] + ny * s} ${back[0] - nx * s},${back[1] - ny * s} ${tip[0]},${tip[1]}`}
        fill="#1c1c1c"
      />
      <line
        x1={tip[0] + nx * s}
        y1={tip[1] + ny * s}
        x2={tip[0] - nx * s}
        y2={tip[1] - ny * s}
        stroke="#1c1c1c"
        strokeWidth={4}
      />
    </g>
  );
}

/** Small range switch drawn beside a multi-range meter. */
export function RangeSwitch({
  meter,
  index,
  onChange,
  panelWidth,
}: {
  meter: MeterDef;
  index: number;
  onChange: (i: number) => void;
  panelWidth: number;
}) {
  const left = meter.cx < panelWidth / 2;
  const x = Math.min(Math.max(meter.cx + (left ? -205 : 205), 38 + 56), panelWidth - 38 - 56);
  const y = meter.cy + 40;
  const fmt = (r: MeterDef['ranges'][number]) => `0-${r.full} ${r.unit}`;
  return (
    <g>
      <text x={x} y={y - 64} textAnchor="middle" fontSize={13} fontWeight={700} fill="#1c1c1c" fontFamily="Arial">
        RANGE
      </text>
      {meter.ranges.map((r, i) => {
        const yy = y - 44 + i * 34;
        const on = i === index;
        return (
          <g
            key={i}
            role="radio"
            aria-checked={on}
            tabIndex={0}
            style={{ cursor: 'pointer' }}
            onPointerDown={(e) => {
              stop(e);
              onChange(i);
            }}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                onChange(i);
              }
            }}
          >
            <rect
              x={x - 46}
              y={yy}
              width={92}
              height={26}
              rx={5}
              fill={on ? '#1c1c1c' : '#f7f2e2'}
              stroke="#1c1c1c"
              strokeWidth={1.5}
            />
            <text
              x={x}
              y={yy + 18}
              textAnchor="middle"
              fontSize={13}
              fontWeight={700}
              fill={on ? '#ffd43b' : '#1c1c1c'}
              fontFamily="Arial"
            >
              {fmt(r)}
            </text>
          </g>
        );
      })}
    </g>
  );
}
