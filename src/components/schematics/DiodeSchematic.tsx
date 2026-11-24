import { DiodeH, Label, MeterC, Res, Source, Wire } from './draw';

function Circuit({ x0, reverse }: { x0: number; reverse: boolean }) {
  const meter = reverse ? 'µA' : 'mA';
  return (
    <g transform={`translate(${x0} 0)`}>
      <Source x={30} y1={60} y2={220} label={reverse ? '0-30V' : '0-3V'} />
      <Wire
        pts={[
          [30, 60],
          [50, 60],
        ]}
      />
      <Res x1={50} y1={60} x2={120} y2={60} label="R (built in)" />
      <Wire
        pts={[
          [120, 60],
          [135, 60],
        ]}
      />
      <MeterC x={151} y={60} t={meter} />
      <Wire
        pts={[
          [167, 60],
          [190, 60],
          [190, 90],
        ]}
      />
      {reverse ? (
        <g transform="rotate(-90 190 140)">
          <DiodeH x1={140} x2={240} y={140} />
        </g>
      ) : (
        <g transform="rotate(90 190 140)">
          <DiodeH x1={140} x2={240} y={140} />
        </g>
      )}
      <Wire
        pts={[
          [190, 190],
          [190, 220],
          [30, 220],
        ]}
      />
      <Wire
        pts={[
          [190, 75],
          [250, 75],
          [250, 124],
        ]}
      />
      <MeterC x={250} y={140} t="V" />
      <Wire
        pts={[
          [250, 156],
          [250, 205],
          [190, 205],
        ]}
      />
      <Label
        x={140}
        y={262}
        t={reverse ? 'Reverse bias: REVERSE BIAS diode, K to +' : 'Forward bias: FORWARD BIAS diode, A to +'}
        size={14}
      />
    </g>
  );
}

export function DiodeSchematic() {
  return (
    <svg
      viewBox="0 0 620 280"
      role="img"
      aria-label="Forward and reverse bias circuits: supply, series resistor, ammeter and diode, with a voltmeter across the diode"
    >
      <Circuit x0={20} reverse={false} />
      <Circuit x0={330} reverse />
    </svg>
  );
}
