import { useEffect, useRef } from 'react';
import type { MeterDef, MeterRange } from '../../kits/types';
import { Screw } from './parts';

const SPAN = 46; // degrees either side of vertical
const SCALE_R = 112;

/**
 * Analog moving-coil meter. The needle follows the value with a damped spring,
 * so it swings and settles like a real meter. Values past the ends pin the
 * needle slightly beyond the scale.
 */
/** Decimal places a 3½-digit panel meter shows on this range. */
export function digitalDecimals(full: number) {
  return full <= 2 ? 3 : full <= 50 ? 2 : full <= 500 ? 1 : 0;
}

/** Red LED panel meter, like the digital trainer kits. */
function DigitalMeter({ def, range, value }: { def: MeterDef; range: MeterRange; value: number }) {
  const { cx, cy } = def;
  const d = digitalDecimals(range.full);
  const over = Math.abs(value) > range.full * 1.1;
  const text = over ? (value < 0 ? '-1   ' : '1   ') : value.toFixed(d).replace(/^-0(\.0+)?$/, '0$1');
  return (
    <g>
      <circle cx={cx} cy={cy + 4} r={150} fill="rgba(0,0,0,0.25)" />
      <circle cx={cx} cy={cy} r={148} fill="#111" />
      <circle cx={cx} cy={cy} r={134} fill="#1b1b1b" stroke="#2e2e2e" strokeWidth={3} />
      <rect x={cx - 108} y={cy - 52} width={216} height={104} rx={8} fill="#2a0505" stroke="#000" strokeWidth={4} />
      <text
        x={cx + 96}
        y={cy + 30}
        textAnchor="end"
        fontSize={78}
        fontFamily="'DSEG7 Classic', 'Segment7', Consolas, 'Courier New', monospace"
        fontWeight={700}
        fill="#ff2a1a"
        filter="url(#glow)"
        style={{ letterSpacing: 2 }}
      >
        {text}
      </text>
      <text x={cx} y={cy + 92} textAnchor="middle" fontSize={20} fontWeight={700} fill="#e8e8e8" fontFamily="Arial">
        {range.full} {range.unit}
      </text>
    </g>
  );
}

export function Meter({
  def,
  range,
  value,
  showDigital,
  digital = false,
}: {
  def: MeterDef;
  range: MeterRange;
  value: number;
  showDigital: boolean;
  digital?: boolean;
}) {
  if (digital) return <DigitalMeter def={def} range={range} value={value} />;
  return <AnalogMeter def={def} range={range} value={value} showDigital={showDigital} />;
}

function AnalogMeter({
  def,
  range,
  value,
  showDigital,
}: {
  def: MeterDef;
  range: MeterRange;
  value: number;
  showDigital: boolean;
}) {
  const { cx, cy, id } = def;
  const { full, majors, minorsPerMajor, unit } = range;
  const kind = unit;
  const px = cx;
  const py = cy + 50;
  const needleRef = useRef<SVGGElement>(null);
  const state = useRef({ pos: 0, vel: 0, target: 0, raf: 0, last: 0 });

  const frac = Math.max(-0.07, Math.min(1.07, value / full));

  useEffect(() => {
    const s = state.current;
    s.target = frac;
    if (s.raf) return;
    s.last = performance.now();
    const tick = (now: number) => {
      // Integrate the real elapsed time in small sub-steps, so the needle settles
      // in the same time whether the browser draws 60 frames a second or 4.
      let remaining = Math.min(0.5, (now - s.last) / 1000);
      s.last = now;
      const k = 90;
      const c = 13;
      while (remaining > 0) {
        const dt = Math.min(0.016, remaining);
        const acc = k * (s.target - s.pos) - c * s.vel;
        s.vel += acc * dt;
        s.pos += s.vel * dt;
        remaining -= dt;
      }
      const angle = -SPAN + 2 * SPAN * s.pos;
      needleRef.current?.setAttribute('transform', `rotate(${angle} ${px} ${py})`);
      if (Math.abs(s.target - s.pos) < 1e-4 && Math.abs(s.vel) < 1e-4) {
        s.pos = s.target;
        s.raf = 0;
        return;
      }
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  }, [frac, px, py]);

  useEffect(
    () => () => {
      cancelAnimationFrame(state.current.raf);
      state.current.raf = 0;
    },
    [],
  );

  const polar = (deg: number, r: number): [number, number] => {
    const rad = (deg * Math.PI) / 180;
    return [px + r * Math.sin(rad), py - r * Math.cos(rad)];
  };

  const ticks = [];
  const total = majors * minorsPerMajor;
  for (let i = 0; i <= total; i++) {
    const deg = -SPAN + (2 * SPAN * i) / total;
    const major = i % minorsPerMajor === 0;
    const half = !major && minorsPerMajor % 2 === 0 && i % (minorsPerMajor / 2) === 0;
    const len = major ? 15 : half ? 10 : 6;
    const [x1, y1] = polar(deg, SCALE_R);
    const [x2, y2] = polar(deg, SCALE_R + len);
    ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#222" strokeWidth={major ? 1.8 : 1} />);
    if (major) {
      const [tx, ty] = polar(deg, SCALE_R + 27);
      const label = +((full / majors) * (i / minorsPerMajor)).toFixed(3);
      ticks.push(
        <text key={`l${i}`} x={tx} y={ty + 5} textAnchor="middle" fontSize={14} fill="#222" fontFamily="Arial">
          {label}
        </text>,
      );
    }
  }
  const [ax1, ay1] = polar(-SPAN, SCALE_R);
  const [ax2, ay2] = polar(SPAN, SCALE_R);
  const clipId = `face-${id}`;
  const digits = value.toFixed(digitalDecimals(full)).replace(/^-0(\.0+)?$/, '0$1');

  return (
    <g>
      <defs>
        <clipPath id={clipId}>
          <rect x={cx - 130} y={cy - 130} width={260} height={162} />
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy + 4} r={156} fill="rgba(0,0,0,0.25)" />
      <circle cx={cx} cy={cy} r={154} fill="#121212" />
      <circle cx={cx} cy={cy} r={140} fill="#1a1a1a" stroke="#2e2e2e" strokeWidth={3} />
      <circle cx={cx} cy={cy} r={120} fill="#f3f1ea" clipPath={`url(#${clipId})`} />
      <rect x={cx - 120} y={cy + 30} width={240} height={4} fill="#0d0d0d" />
      <path d={`M ${ax1} ${ay1} A ${SCALE_R} ${SCALE_R} 0 0 1 ${ax2} ${ay2}`} fill="none" stroke="#222" strokeWidth={1.4} />
      {ticks}
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={34} fontWeight={700} fill="#222" fontFamily="Arial">
        {kind}
      </text>
      <text x={cx - 92} y={cy + 13} fontSize={7.5} fill="#333" fontFamily="Arial">
        MOVING COIL
      </text>
      <text x={cx - 92} y={cy + 23} fontSize={7.5} fill="#333" fontFamily="Arial">
        CLASS 2.0
      </text>
      <g clipPath={`url(#${clipId})`}>
        <g ref={needleRef} transform={`rotate(${-SPAN} ${px} ${py})`}>
          <line x1={px} y1={py} x2={px} y2={py - SCALE_R - 10} stroke="#111" strokeWidth={2} />
        </g>
      </g>
      <circle
        cx={cx}
        cy={cy + (showDigital ? 62 : 86)}
        r={showDigital ? 8 : 11}
        fill="#262626"
        stroke="#3a3a3a"
        strokeWidth={2}
      />
      <line
        x1={cx - (showDigital ? 5 : 7)}
        y1={cy + (showDigital ? 62 : 86)}
        x2={cx + (showDigital ? 5 : 7)}
        y2={cy + (showDigital ? 62 : 86)}
        stroke="#0a0a0a"
        strokeWidth={3}
      />
      <Screw x={cx - 128} y={cy + 52} r={9} />
      <Screw x={cx + 128} y={cy + 52} r={9} />
      {showDigital && (
        <g>
          <rect x={cx - 76} y={cy + 84} width={152} height={40} rx={6} fill="#0c1a0e" stroke="#3b6b41" strokeWidth={2} />
          <text
            x={cx + 66}
            y={cy + 113}
            textAnchor="end"
            fontSize={24}
            fontWeight={700}
            fill="#7dff8a"
            fontFamily="Consolas, 'Courier New', monospace"
          >
            {digits} {kind}
          </text>
        </g>
      )}
    </g>
  );
}
