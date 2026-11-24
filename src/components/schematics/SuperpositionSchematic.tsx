import { fmtOhms } from '../../kits/common';
import { SP } from '../../kits/superposition';
import { Dot, Label, MeterC, Res, Source, Wire } from './draw';

/** Changeover switch: common at (x, y), throws up to the source and down to the short. */
function Changeover({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <circle cx={x} cy={y - 30} r={3} fill="var(--ink)" />
      <circle cx={x} cy={y + 30} r={3} fill="var(--ink)" />
      <circle cx={x + 30} cy={y} r={3} fill="var(--ink)" />
      <line x1={x + 30} y1={y} x2={x + 3} y2={y - 27} stroke="var(--ink)" strokeWidth={2} />
      <Label x={x - 10} y={y + 5} t={label} anchor="end" />
    </g>
  );
}

export function SuperpositionSchematic() {
  return (
    <svg
      viewBox="0 0 640 300"
      role="img"
      aria-label="Two sources V1 and V2 with changeover switches S1 and S2, feeding R1 and R2 into a common node with R3 to the return line"
    >
      <Source x={50} y1={50} y2={230} label="V1" />
      <Wire
        pts={[
          [50, 50],
          [120, 50],
          [120, 110],
        ]}
      />
      <Changeover x={120} y={140} label="S1" />
      <Wire
        pts={[
          [120, 170],
          [120, 230],
        ]}
      />
      <Wire
        pts={[
          [150, 140],
          [170, 140],
          [170, 80],
          [190, 80],
        ]}
      />
      <Res x1={190} y1={80} x2={270} y2={80} label={`R1 ${fmtOhms(SP.R1)}`} />
      <Wire
        pts={[
          [270, 80],
          [290, 80],
        ]}
      />
      <MeterC x={306} y={80} t="mA" />
      <Label x={306} y={56} t="I1 →" />
      <Wire
        pts={[
          [322, 80],
          [340, 80],
        ]}
      />
      <Dot x={340} y={80} />
      <Wire
        pts={[
          [340, 80],
          [358, 80],
        ]}
      />
      <MeterC x={374} y={80} t="mA" />
      <Label x={374} y={56} t="← I2" />
      <Wire
        pts={[
          [390, 80],
          [410, 80],
        ]}
      />
      <Res x1={410} y1={80} x2={490} y2={80} label={`R2 ${fmtOhms(SP.R2)}`} />
      <Wire
        pts={[
          [490, 80],
          [510, 80],
          [510, 140],
          [490, 140],
        ]}
      />
      <Changeover x={460} y={140} label="S2" />
      <Wire
        pts={[
          [460, 110],
          [460, 50],
          [590, 50],
        ]}
      />
      <Wire
        pts={[
          [460, 170],
          [460, 230],
        ]}
      />
      <Source x={590} y1={50} y2={230} label="" />
      <Label x={612} y={145} t="V2" anchor="start" />
      <Res x1={340} y1={80} x2={340} y2={160} label={`R3 ${fmtOhms(SP.R3)}`} side="right" />
      <MeterC x={340} y={182} t="mA" />
      <Label x={362} y={200} t="I3 ↓" anchor="start" />
      <Wire
        pts={[
          [340, 198],
          [340, 230],
        ]}
      />
      <Wire
        pts={[
          [50, 230],
          [590, 230],
        ]}
      />
      <Dot x={120} y={230} />
      <Dot x={340} y={230} />
      <Dot x={460} y={230} />
      <Label x={320} y={275} t="Switch up: source in the circuit. Switch down: source replaced by a short." />
    </svg>
  );
}
