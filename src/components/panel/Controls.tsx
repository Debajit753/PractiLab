import { useEffect, useRef } from 'react';

type ToSvg = (clientX: number, clientY: number) => [number, number];

const MIN_ANGLE = -135;
const MAX_ANGLE = 135;

/** Rotary knob: drag around it, scroll the wheel over it, or use arrow keys. */
export function Knob({
  x,
  y,
  value,
  max,
  onChange,
  toSvg,
  step: baseStep = 0.1,
}: {
  x: number;
  y: number;
  value: number;
  max: number;
  onChange: (v: number) => void;
  toSvg: ToSvg;
  step?: number;
}) {
  const ref = useRef<SVGGElement>(null);
  const drag = useRef<{ lastAngle: number; value: number } | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  const clamp = (v: number) => Math.max(0, Math.min(max, v));
  const angle = MIN_ANGLE + ((MAX_ANGLE - MIN_ANGLE) * value) / max;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = e.shiftKey ? baseStep / 10 : baseStep / 2;
      const v = clamp(+(valueRef.current + (e.deltaY < 0 ? step : -step)).toFixed(3));
      valueRef.current = v;
      onChange(v);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });

  const pointerAngle = (e: React.PointerEvent) => {
    const [px, py] = toSvg(e.clientX, e.clientY);
    return (Math.atan2(px - x, -(py - y)) * 180) / Math.PI;
  };

  const ridges = [];
  for (let i = 0; i < 28; i++) {
    const a = (i * 360) / 28;
    ridges.push(
      <rect key={i} x={x - 2.5} y={y - 47} width={5} height={9} rx={1} fill="#151515" transform={`rotate(${a} ${x} ${y})`} />,
    );
  }

  const arcR = 62;
  const arc = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return [x + arcR * Math.sin(r), y - arcR * Math.cos(r)];
  };
  const [sx, sy] = arc(-60);
  const [ex, ey] = arc(55);

  return (
    <g
      ref={ref}
      tabIndex={0}
      role="slider"
      aria-label="Set volts"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={+value.toFixed(2)}
      className="knob"
      onKeyDown={(e) => {
        const step = e.shiftKey ? baseStep / 10 : baseStep;
        let dir = 0;
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') dir = 1;
        else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') dir = -1;
        else if (e.key === 'Home') dir = -Infinity;
        else if (e.key === 'End') dir = Infinity;
        if (!dir) return;
        e.preventDefault();
        const v = Number.isFinite(dir) ? clamp(+(valueRef.current + dir * step).toFixed(3)) : dir > 0 ? max : 0;
        valueRef.current = v;
        onChange(v);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        drag.current = { lastAngle: pointerAngle(e), value };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const a = pointerAngle(e);
        let delta = a - d.lastAngle;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        d.lastAngle = a;
        d.value = clamp(d.value + (delta / (MAX_ANGLE - MIN_ANGLE)) * max);
        onChange(+d.value.toFixed(3));
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      style={{ cursor: 'grab' }}
    >
      <path
        d={`M ${sx} ${sy} A ${arcR} ${arcR} 0 0 1 ${ex} ${ey}`}
        fill="none"
        stroke="#111"
        strokeWidth={7}
        markerEnd="url(#arrowHead)"
      />
      <circle cx={x} cy={y + 3} r={50} fill="rgba(0,0,0,0.3)" />
      {ridges}
      <circle cx={x} cy={y} r={42} fill="url(#knobGrad)" stroke="#000" strokeWidth={2} />
      <circle cx={x} cy={y} r={30} fill="#1c1c1c" stroke="#333" strokeWidth={1.5} />
      <g transform={`rotate(${angle} ${x} ${y})`}>
        <rect x={x - 3} y={y - 40} width={6} height={22} rx={2} fill="#f5f5f5" />
      </g>
      <circle cx={x} cy={y} r={56} fill="transparent" />
    </g>
  );
}

/** Bat-handle toggle switch: lever up is OFF, lever down is ON (as on the kit). */
export function Toggle({ x, y, on, onChange }: { x: number; y: number; on: boolean; onChange: (v: boolean) => void }) {
  const dir = on ? 1 : -1;
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${x + 30 * Math.cos(a)},${y + 30 * Math.sin(a)}`;
  }).join(' ');
  return (
    <g
      role="switch"
      aria-checked={on}
      aria-label="Mains switch"
      tabIndex={0}
      className="toggle"
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => onChange(!on)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(!on);
        }
      }}
    >
      <circle cx={x} cy={y} r={44} fill="transparent" />
      <polygon points={hex} fill="url(#nutGrad)" stroke="#6d6d6d" strokeWidth={1.5} />
      <circle cx={x} cy={y} r={20} fill="#2b2b2b" stroke="#111" strokeWidth={2} />
      <line x1={x} y1={y} x2={x} y2={y + dir * 46} stroke="#9a9a9a" strokeWidth={13} strokeLinecap="round" />
      <line x1={x} y1={y} x2={x} y2={y + dir * 46} stroke="#d9d9d9" strokeWidth={5} strokeLinecap="round" />
      <circle cx={x} cy={y + dir * 48} r={10} fill="url(#nutGrad)" stroke="#6d6d6d" />
    </g>
  );
}

export function Led({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={20} fill="#151515" />
      <circle cx={x} cy={y} r={13} fill={on ? 'url(#ledOn)' : '#3b0d0d'} filter={on ? 'url(#glow)' : undefined} />
      {!on && <circle cx={x - 4} cy={y - 4} r={4} fill="rgba(255,255,255,0.12)" />}
    </g>
  );
}
