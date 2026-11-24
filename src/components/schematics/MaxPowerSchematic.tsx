import { fmtOhms } from '../../kits/common';
import { MP } from '../../kits/maxPower';
import { Label, MeterC, Res, Source, Term, Wire } from './draw';

export function MaxPowerSchematic() {
  return (
    <svg
      viewBox="0 0 560 290"
      role="img"
      aria-label="Source Vs with internal resistance Rs feeding a variable load RL through a milliammeter, with a voltmeter across the load"
    >
      <rect x={20} y={30} width={230} height={210} fill="none" stroke="var(--muted)" strokeDasharray="6 5" />
      <Label x={135} y={22} t="Practical source" />
      <Source x={70} y1={70} y2={210} label="Vs" />
      <Wire
        pts={[
          [70, 70],
          [110, 70],
        ]}
      />
      <Res x1={110} y1={70} x2={210} y2={70} label={`Rs ${fmtOhms(MP.RS)}`} />
      <Wire
        pts={[
          [210, 70],
          [280, 70],
        ]}
      />
      <Term x={280} y={70} label="A" />
      <Wire
        pts={[
          [70, 210],
          [280, 210],
        ]}
      />
      <Term x={280} y={210} label="B" />
      <Wire
        pts={[
          [285, 70],
          [340, 70],
        ]}
      />
      <MeterC x={356} y={70} t="mA" />
      <Wire
        pts={[
          [372, 70],
          [420, 70],
          [420, 100],
        ]}
      />
      <Res x1={420} y1={100} x2={420} y2={180} label="RL (variable)" side="right" />
      <Wire
        pts={[
          [420, 180],
          [420, 210],
          [285, 210],
        ]}
      />
      <Wire
        pts={[
          [400, 70],
          [400, 50],
          [500, 50],
          [500, 125],
        ]}
      />
      <MeterC x={500} y={140} t="V" />
      <Wire
        pts={[
          [500, 156],
          [500, 230],
          [420, 230],
          [420, 210],
        ]}
      />
      <Label x={280} y={275} t="P = VL × IL is largest when RL = Rs" />
    </svg>
  );
}
