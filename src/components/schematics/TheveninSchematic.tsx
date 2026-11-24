import { fmtOhms } from '../../kits/common';
import { TH } from '../../kits/thevenin';
import { Dot, Label, MeterC, Res, Source, Term, Wire } from './draw';

/** Network with load, plus the Thevenin or Norton equivalent beside it. */
export function TheveninSchematic({ norton = false }: { norton?: boolean }) {
  return (
    <svg
      viewBox="0 0 640 300"
      role="img"
      aria-label="Network: source, R1 in series, R2 across, R3 to terminal A, load RL between A and B, and its equivalent circuit"
    >
      <Source x={50} y1={60} y2={220} label="Vs" />
      <Wire
        pts={[
          [50, 60],
          [70, 60],
        ]}
      />
      <Res x1={70} y1={60} x2={150} y2={60} label={`R1 ${fmtOhms(TH.R1)}`} />
      <Wire
        pts={[
          [150, 60],
          [180, 60],
        ]}
      />
      <Dot x={180} y={60} />
      <Res x1={180} y1={60} x2={180} y2={220} label={`R2 ${fmtOhms(TH.R2)}`} side="right" />
      <Res x1={180} y1={60} x2={270} y2={60} label={`R3 ${fmtOhms(TH.R3)}`} />
      <Wire
        pts={[
          [270, 60],
          [290, 60],
        ]}
      />
      <Term x={290} y={60} label="A" />
      <Wire
        pts={[
          [50, 220],
          [290, 220],
        ]}
      />
      <Dot x={180} y={220} />
      <Term x={290} y={220} label="B" />
      <Wire
        pts={[
          [295, 60],
          [330, 60],
          [330, 90],
        ]}
        dashed
      />
      <MeterC x={330} y={106} t="mA" />
      <Wire
        pts={[
          [330, 122],
          [330, 135],
        ]}
        dashed
      />
      <Res x1={330} y1={135} x2={330} y2={200} label="RL" side="right" />
      <Wire
        pts={[
          [330, 200],
          [330, 220],
          [295, 220],
        ]}
        dashed
      />
      <Label x={175} y={270} t="Given network with load RL" />

      {norton ? (
        <g>
          <Wire
            pts={[
              [440, 60],
              [600, 60],
            ]}
          />
          <Wire
            pts={[
              [440, 220],
              [600, 220],
            ]}
          />
          <Wire
            pts={[
              [440, 60],
              [440, 118],
            ]}
          />
          <circle cx={440} cy={140} r={22} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
          <path d="M 440 154 L 440 126 M 433 133 L 440 124 L 447 133" stroke="var(--ink)" strokeWidth={2} fill="none" />
          <Wire
            pts={[
              [440, 162],
              [440, 220],
            ]}
          />
          <Label x={470} y={145} t="IN" anchor="start" />
          <Res x1={520} y1={60} x2={520} y2={220} label="RN" side="right" />
          <Dot x={520} y={60} />
          <Dot x={520} y={220} />
          <Res x1={600} y1={60} x2={600} y2={220} label="RL" side="left" />
          <Label x={520} y={270} t="Norton equivalent" />
        </g>
      ) : (
        <g>
          <Source x={440} y1={60} y2={220} label="Vth" />
          <Res x1={440} y1={60} x2={540} y2={60} label="Rth" />
          <Wire
            pts={[
              [540, 60],
              [600, 60],
            ]}
          />
          <Res x1={600} y1={60} x2={600} y2={220} label="RL" side="left" />
          <Wire
            pts={[
              [440, 220],
              [600, 220],
            ]}
          />
          <Label x={520} y={270} t="Thevenin equivalent" />
        </g>
      )}
    </svg>
  );
}

export const NortonSchematic = () => <TheveninSchematic norton />;
export const TheveninOnlySchematic = () => <TheveninSchematic />;
