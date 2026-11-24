import { DiodeSchematic } from '../components/schematics/DiodeSchematic';
import { DI, DIODE_MODELS, diodeKit, diodePoint } from '../kits/diode';
import type { PracticalDef, ResultBlock, Row } from './types';

const fwd = (rows: Row[]) =>
  rows.filter((r) => r.Vf != null && r.If != null).map((r) => [r.Vf as number, r.If as number] as [number, number]);
const rev = (rows: Row[]) =>
  rows.filter((r) => r.Vr != null && r.Ir != null).map((r) => [r.Vr as number, r.Ir as number] as [number, number]);

function results(rows: Row[]): ResultBlock[] {
  const out: ResultBlock[] = [];
  const kind: 'si' | 'ge' | null = 'si';
  const types = new Set([1]);
  const f = fwd(rows).sort((a, b) => a[1] - b[1]);
  if (f.length >= 3 && f[f.length - 1][1] > 0.5) {
    const [v1, i1] = f[f.length - 2];
    const [v2, i2] = f[f.length - 1];
    const rd = i2 !== i1 ? ((v2 - v1) / (i2 - i1)) * 1000 : NaN;
    // Cut-in: where the straight part of the curve, extended down, meets the voltage axis.
    const cutIn = Number.isFinite(rd) ? v2 - (i2 / 1000) * rd : NaN;
    const expect = kind === 'si' ? [0.5, 0.75] : kind === 'ge' ? [0.12, 0.35] : null;
    const ok = expect ? cutIn >= expect[0] && cutIn <= expect[1] : undefined;
    out.push({
      title: 'Forward characteristic',
      lines: [
        `Cut-in (knee) voltage from the graph ≈ ${cutIn.toFixed(2)} V${kind ? ` (typical for ${DIODE_MODELS[kind].label}: ${kind === 'si' ? '0.6 to 0.7' : '0.2 to 0.3'} V)` : ''}.`,
        `Dynamic resistance rd = ΔVf / ΔIf = (${v2.toFixed(3)} − ${v1.toFixed(3)}) V / (${i2.toFixed(2)} − ${i1.toFixed(2)}) mA ≈ ${rd.toFixed(1)} Ω.`,
        `Static (DC) resistance at ${i2.toFixed(2)} mA: R = Vf / If = ${((v2 / i2) * 1000).toFixed(0)} Ω.`,
        types.size > 1 ? 'Note: your readings mix Si and Ge diodes. Use one diode type per experiment.' : '',
      ].filter(Boolean),
      ok,
    });
  } else {
    out.push({
      title: 'Forward characteristic',
      lines: [
        'Record at least 3 forward readings, some above the knee (a few mA), to find the cut-in voltage and dynamic resistance.',
      ],
    });
  }
  const r = rev(rows).sort((a, b) => a[0] - b[0]);
  if (r.length >= 2) {
    const [vmax, imax] = r[r.length - 1];
    out.push({
      title: 'Reverse characteristic',
      lines: [
        `Reverse current at ${vmax.toFixed(1)} V: ${imax.toFixed(2)} µA. It stays tiny and nearly flat, so the diode blocks in reverse bias.`,
        `Reverse resistance ≈ Vr / Ir = ${imax > 0 ? (vmax / imax).toFixed(2) : '∞'} MΩ.`,
      ],
    });
  }
  return out;
}

const sample = [0.4, 0.6, 0.8, 1, 1.5, 2, 2.5, 3];

export const diode: PracticalDef = {
  id: 'pn-diode',
  title: 'V-I Characteristics of a PN Junction Diode',
  short: 'PN Junction Diode',
  reference: {
    label: 'Characteristics of diode (Basic Electronics lab, IIT Kharagpur)',
    url: 'https://be-iitkgp.vlabs.ac.in/exp/characteristics-diode/',
  },
  kit: diodeKit,
  aim: 'To plot the forward and reverse V-I characteristics of a silicon PN junction diode, and to find its cut-in voltage, dynamic resistance and reverse resistance.',
  apparatus: [
    {
      name: 'PN junction diode characteristics apparatus',
      spec: 'Silicon diodes for forward and reverse bias (1N4007 type)',
      qty: '1',
    },
    { name: 'DC power supply for forward bias', spec: `0-${DI.FWD_MAX} V, current-limited (built in)`, qty: '1' },
    { name: 'DC power supply for reverse bias', spec: `0-${DI.REV_MAX} V (built in)`, qty: '1' },
    { name: 'DC voltmeter', spec: '0-3 V / 0-30 V', qty: '1' },
    { name: 'DC milliammeter / microammeter', spec: '0-10 mA / 0-100 µA', qty: '1' },
    { name: 'Patch cords', spec: 'Banana to banana', qty: 'As required' },
  ],
  theory: [
    {
      heading: 'The PN junction',
      body: [
        'A PN junction diode is made by joining P-type and N-type semiconductor. Near the junction, electrons and holes recombine and leave a depletion region with a built-in barrier potential: about 0.7 V for silicon and 0.3 V for germanium.',
        'The P side is the anode and the N side the cathode. The arrow in the symbol points in the direction of conventional current in forward bias.',
      ],
    },
    {
      heading: 'Forward and reverse bias',
      body: [
        'Forward bias (anode positive) narrows the depletion region. Almost no current flows until the applied voltage reaches the cut-in (knee) voltage; after that the current rises steeply.',
        'Reverse bias (cathode positive) widens the depletion region. Only a tiny reverse saturation current of minority carriers flows: nanoamps for silicon, microamps for germanium. At a large enough reverse voltage the junction breaks down; this kit stays well below that.',
        'The diode current follows I = Is (e^(V / ηVT) − 1), with VT = kT/q ≈ 26 mV at room temperature and η between 1 and 2.',
      ],
    },
    {
      heading: 'Why current limiting and meter positions matter',
      body: [
        'Once the diode conducts, its current rises very steeply. The 0-3 V output of the kit has a current-limiting resistor built in, so the forward current cannot run away.',
        'In reverse bias the current is so small that even the voltmeter current would spoil the reading. So the microammeter is placed directly in series with the diode, and the voltmeter is connected across the 0-30 V output (the diode plus microammeter).',
      ],
    },
  ],
  schematic: DiodeSchematic,
  formulas: [
    { label: 'Diode equation', expr: 'I = Is (e^(V / ηVT) − 1),  VT ≈ 26 mV' },
    { label: 'Dynamic (AC) resistance', expr: 'rd = ΔVf / ΔIf  (from the straight part of the curve)' },
    { label: 'Static (DC) resistance', expr: 'R = Vf / If' },
    { label: 'Reverse resistance', expr: 'Rr = Vr / Ir' },
  ],
  precautions: [
    'Use the 0-3 V output only for forward bias and the 0-30 V output only for reverse bias.',
    'In forward bias, raise the voltage slowly near the knee; the current rises very fast after it.',
    'Use the 3 V voltmeter range for forward readings and the 30 V range for reverse readings.',
    'Switch the current meter to the 100 µA range for reverse readings.',
    'Do not exceed 10 mA forward current.',
  ],
  steps: [
    {
      text: 'Forward bias: connect 0-3V DC OUTPUT + to the meter +, meter − to A of the FORWARD BIAS diode, and its K to 0-3V DC OUTPUT −. Keep the meter on the 10 mA range.',
      check: ({ an }) => an.readings.AM.measurement?.key === 'If' && !an.readings.AM.reversed,
      hint: ['FP1', 'Ap', 'An', 'FA', 'FK', 'FN1'],
    },
    {
      text: 'Connect the voltmeter across the FORWARD BIAS diode (V + to A, V − to K) and switch it to the 3 V range.',
      check: ({ an, controls }) =>
        an.readings.VM.measurement?.key === 'Vf' && !an.readings.VM.reversed && controls.ranges.VM === 1,
      hint: ['Vp', 'FA', 'Vn', 'FK'],
      hintText: 'Click "0-3 V" beside the voltmeter to pick the 3 V range.',
    },
    {
      text: 'Switch mains ON. Raise the 0-3V SET VOLTS knob in small steps and record Vf and If each time (the next row is selected for you). Take at least 8 readings, up to about 8 mA.',
      check: ({ rows }) => fwd(rows).length >= 8 && fwd(rows).some(([, i]) => i >= 3),
      hintText: 'Hold Shift and use the arrow keys or scroll wheel on the knob for fine steps near 0.5 to 0.7 V.',
    },
    {
      text: 'Reverse bias: switch mains OFF. Connect 0-30V DC OUTPUT + to K of the REVERSE BIAS diode, its A to the meter +, and the meter − to 0-30V DC OUTPUT −. Put the voltmeter across the 0-30V DC OUTPUT (second pair of sockets). Set the meter to 100 µA and the voltmeter to 30 V.',
      check: ({ an, controls }) =>
        an.readings.AM.measurement?.key === 'Ir' && controls.ranges.AM === 1 && controls.ranges.VM === 0,
      hint: ['RP1', 'RK', 'RA', 'Ap', 'An', 'RN1', 'Vp', 'RP2', 'Vn', 'RN2'],
    },
    {
      text: 'Choose Reading 1 again. Switch mains ON, raise the 0-30V knob in steps of about 5 V up to 30 V, and record Vr and Ir each time.',
      check: ({ rows }) => rev(rows).length >= 5,
    },
  ],
  measured: {
    Vf: { label: 'Vf', unit: 'V', decimals: 3 },
    If: { label: 'If', unit: 'mA', decimals: 2 },
    Vr: { label: 'Vr', unit: 'V', decimals: 1 },
    Ir: { label: 'Ir', unit: 'µA', decimals: 2 },
  },
  advanceWhen: [
    ['Vf', 'If'],
    ['Vr', 'Ir'],
  ],
  tables: [
    {
      title: 'Table 1: Forward bias',
      columns: [
        { key: 'Vf', label: 'Forward voltage Vf', unit: 'V', decimals: 3 },
        { key: 'If', label: 'Forward current If', unit: 'mA', decimals: 2 },
      ],
    },
    {
      title: 'Table 2: Reverse bias',
      columns: [
        { key: 'Vr', label: 'Reverse voltage Vr', unit: 'V', decimals: 1 },
        { key: 'Ir', label: 'Reverse current Ir', unit: 'µA', decimals: 2 },
      ],
    },
  ],
  plots: [
    { title: 'Forward characteristic', xLabel: 'Vf (V)', yLabel: 'If (mA)', points: fwd },
    { title: 'Reverse characteristic', xLabel: 'Vr (V)', yLabel: 'Ir (µA)', points: rev },
  ],
  results,
  expected: {
    caption: 'Forward bias on the 0-3 V output, for each setting of SET VOLTS.',
    columns: [
      { key: 'vs', label: 'SET VOLTS', unit: 'V', decimals: 1 },
      { key: 'vf', label: 'Vf', unit: 'V', decimals: 3 },
      { key: 'if', label: 'If', unit: 'mA', decimals: 2 },
    ],
    rows: sample.map((vs) => {
      const p = diodePoint(DIODE_MODELS.si, vs);
      return { vs, vf: p.vd, if: Math.max(0, p.id * 1000) };
    }),
  },
  viva: [
    { q: 'What is the cut-in voltage of Si and Ge diodes?', a: 'About 0.6 to 0.7 V for silicon and 0.2 to 0.3 V for germanium.' },
    {
      q: 'Why is reverse current higher in germanium?',
      a: 'Germanium has a smaller band gap, so more minority carriers are generated thermally.',
    },
    {
      q: 'What is the depletion region?',
      a: 'The region near the junction emptied of free carriers, leaving fixed ions that create the barrier potential.',
    },
    {
      q: 'What happens to the depletion region in forward and reverse bias?',
      a: 'It narrows in forward bias and widens in reverse bias.',
    },
    { q: 'Why is a series resistor used?', a: 'To limit the forward current, which rises very steeply above the knee.' },
    {
      q: 'What is dynamic resistance?',
      a: 'The ratio of a small change in voltage to the change in current, ΔV/ΔI, on the forward curve.',
    },
    {
      q: 'Why is the microammeter connected directly in series with the diode in reverse bias?',
      a: 'So the voltmeter current, which can be larger than the diode reverse current, is not included in the reading.',
    },
    {
      q: 'What is breakdown?',
      a: 'At a large reverse voltage the reverse current suddenly increases due to avalanche or Zener effect.',
    },
    {
      q: 'How do you test a diode with a multimeter?',
      a: 'Low resistance one way and high the other means good. Low both ways means shorted; high both ways means open.',
    },
    {
      q: 'Name some uses of a diode.',
      a: 'Rectifiers, clippers and clampers, protection against reverse polarity, switching, and signal detection.',
    },
  ],
  defaultRows: 12,
  maxRows: 20,
};
