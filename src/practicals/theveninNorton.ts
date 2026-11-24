import { NortonSchematic, TheveninOnlySchematic } from '../components/schematics/TheveninSchematic';
import { fmtOhms } from '../kits/common';
import { circuitsJoined, TH, theveninKit, theveninTheory } from '../kits/thevenin';
import { pick, type PracticalDef, type Row, type StepDef } from './types';

const has = (rows: Row[], key: string) => rows.some((r) => r[key] != null);
/** Rth from this row's own test reading only (for the table where Vt and It are entered). */
const rthRow = (r: Row) => (r.Vt != null && r.It ? ((r.Vt as number) / (r.It as number)) * 1000 : null);
/** Load resistance worked out from the meters: RL = VL / IL (the pot has no markings). */
const rlOf = (r: Row) => (r.VL != null && r.IL ? ((r.VL as number) / (r.IL as number)) * 1000 : null);
const ilFromThevenin = (r: Row, rows: Row[]) => {
  const vth = pick(r, rows, 'Vth');
  const R = rth(r, rows);
  const rl = rlOf(r);
  return vth != null && R != null && rl != null ? (vth / (R + rl)) * 1000 : null;
};
const ilFromNorton = (r: Row, rows: Row[]) => {
  const iN = pick(r, rows, 'IN');
  const R = rth(r, rows);
  const rl = rlOf(r);
  return iN != null && R != null && rl != null ? (iN * R) / (R + rl) : null;
};
const rth = (r: Row, rows: Row[]) => {
  const vt = pick(r, rows, 'Vt');
  const it = pick(r, rows, 'It');
  return vt != null && it ? (vt / it) * 1000 : null;
};

const networkSteps: StepDef[] = [
  {
    text: 'Connect DC OUTPUT + to INPUT + and DC OUTPUT − to INPUT − with patch cords.',
    check: ({ an }) => an.bridged('outP', 'inP') && an.bridged('outN', 'inN'),
    hint: ['outP', 'inP', 'outN', 'inN'],
  },
  {
    text: 'Put the voltmeter across INPUT + and INPUT − and switch it to its 20 V range. Switch mains ON, turn SET VOLTS to about 10 V and record Vs.',
    check: ({ rows }) => has(rows, 'Vs'),
    hint: ['Vp', 'inP', 'Vn', 'inN'],
  },
  {
    text: 'Connect the load RL through the milliammeter: terminal A to mA +, mA − to the left RL socket, and the right RL socket to terminal B. Move the voltmeter across A-B and record IL and VL. RL is worked out for you as VL / IL.',
    check: ({ rows }) => rows.some((r) => r.IL != null && r.VL != null),
    hint: ['A', 'Ap', 'An', 'L1', 'L2', 'B', 'Vp', 'A', 'Vn', 'B'],
  },
];

const rthStep = (name: 'Rth' | 'RN'): StepDef => ({
  text: `Find ${name}: remove the cords from INPUT and short INPUT + to INPUT − (this replaces the source by its internal resistance). Feed A-B from the supply: DC OUTPUT + to mA +, mA − to A, DC OUTPUT − to B. Voltmeter across A-B. Set about 2 V (keep It under 20 mA) and record Vt and It.`,
  check: ({ rows }) => has(rows, 'Vt') && has(rows, 'It'),
  hint: ['inP', 'inN', 'outP', 'Ap', 'An', 'A', 'outN', 'B', 'Vp', 'A', 'Vn', 'B'],
  hintText:
    'Short INPUT + to INPUT − with one cord. Then DC OUTPUT + → mA +, mA − → A, DC OUTPUT − → B, and the voltmeter across A and B.',
});

const IL_TARGETS = [2.5, 3, 3.5, 4, 4.5];

/** IL of this row, or of the last load reading before it (IL' is compared with the RL left in place). */
const networkIL = (r: Row, rows: Row[]) => {
  if (r.IL != null) return r.IL as number;
  for (let i = rows.indexOf(r) - 1; i >= 0; i--) if (rows[i].IL != null && rows[i].VL != null) return rows[i].IL as number;
  return null;
};

const theveninSteps: StepDef[] = [
  networkSteps[0],
  {
    text: 'Put the voltmeter across A and B (no load) on its 2 V range. Switch mains ON and turn SET VOLTS until the voltmeter reads Vth = 1.05 V (as in the lab record; about 5.16 V on the supply). Record Vth.',
    check: ({ rows }) => has(rows, 'Vth'),
    hint: ['Vp', 'A', 'Vn', 'B'],
    hintText: 'Hold Shift with the arrow keys or scroll wheel for fine steps of the knob.',
    records: ['Vth'],
  },
  {
    text: 'Leave SET VOLTS where it is. Connect the load RL through the milliammeter: A to mA +, mA − to the left RL socket, the right RL socket to B. Keep the voltmeter across A-B. Turn the RL knob until IL = 2.5 mA and record IL and VL.',
    check: ({ rows }) => rows.some((r) => r.IL != null && r.VL != null),
    hint: ['A', 'Ap', 'An', 'L1', 'L2', 'B'],
    records: ['IL', 'VL'],
  },
  {
    text: 'Turn RL down until IL reads 3.0, 3.5, 4.0 and 4.5 mA in turn, recording IL and VL each time (the next row is selected for you). RL = VL / IL is worked out in the table. Leave RL at the 4.5 mA position.',
    check: ({ rows }) => rows.filter((r) => r.IL != null && r.VL != null).length >= IL_TARGETS.length,
    records: ['IL', 'VL'],
  },
  {
    text: 'Find Rth: switch mains OFF and turn SET VOLTS to 0. Unplug the load cords and the INPUT cords, and short INPUT + to INPUT − (this replaces the source by its internal resistance). Feed A-B from the supply: DC OUTPUT + to mA +, mA − to A, DC OUTPUT − to B. Keep the voltmeter across A-B. Switch mains ON, raise SET VOLTS to about 1.5 V and record Vt and It.',
    check: ({ rows }) => has(rows, 'Vt') && has(rows, 'It'),
    hint: ['inP', 'inN', 'outP', 'Ap', 'An', 'A', 'outN', 'B'],
    hintText:
      'Remove A-mA, RL-B and both DC OUTPUT-INPUT cords. Short INPUT + to INPUT − with one cord. Then DC OUTPUT + → mA +, mA − → A, DC OUTPUT − → B.',
    records: ['Vt', 'It'],
  },
  {
    text: 'Build the Thevenin equivalent: unplug every cord from the given network. Put the voltmeter across VTH + and VTH −, turn SET VTH until it reads your Vth (1.05 V) and record it.',
    check: ({ rows }) => has(rows, 'Veq'),
    hint: ['Vp', 'VTHp', 'Vn', 'VTHn'],
    records: ['Veq'],
  },
  {
    text: "Turn the RTH dial to your Rth (Rth = Vt / It, about 215 Ω; see the Observations tab). Do not touch the RL knob. Connect RL to the equivalent: A' to mA +, mA − to the left RL socket, the right RL socket to B'. Record IL'. It is compared with your last network reading (IL = 4.5 mA).",
    check: ({ rows }) => has(rows, 'ILe'),
    hint: ['Aeq', 'Ap', 'An', 'L1', 'L2', 'Beq'],
    records: ['ILe', 'VLe'],
  },
];

const nortonSteps: StepDef[] = [
  ...networkSteps,
  {
    text: 'Remove the load and connect the milliammeter straight across A and B (+ on A). This shorts A-B. Record the short-circuit current IN.',
    check: ({ rows }) => has(rows, 'IN'),
    hint: ['Ap', 'A', 'An', 'B'],
  },
  rthStep('RN'),
  {
    text: 'Put the load back as in step 3 and repeat for at least 3 different RL knob positions (choose a new reading row each time).',
    check: ({ rows }) => rows.filter((r) => r.IL != null && r.VL != null).length >= 3,
    hintText: 'IN, Vt and It only need to be measured once.',
  },
];

const commonMeasured = {
  Vs: { label: 'Vs', unit: 'V', decimals: 2 },
  IL: { label: 'IL', unit: 'mA', decimals: 2 },
  VL: { label: 'VL', unit: 'V', decimals: 3 },
  Vt: { label: 'Vt', unit: 'V', decimals: 3 },
  It: { label: 'It', unit: 'mA', decimals: 2 },
};

const apparatus = [
  {
    name: "Thevenin's theorem trainer",
    spec: `R1 = ${fmtOhms(TH.R1)}, R2 = ${fmtOhms(TH.R2)}, R3 = ${fmtOhms(TH.R3)}`,
    qty: '1',
  },
  { name: 'Regulated DC power supply', spec: `0-${TH.VMAX} V (built in)`, qty: '1' },
  { name: 'Load potentiometer RL', spec: `0-${fmtOhms(TH.RL_MAX)} (built in)`, qty: '1' },
  {
    name: "Thevenin's equivalent circuit section",
    spec: `VTH source 0-${TH.VMAX} V, RTH dial 0-${fmtOhms(TH.RTH_MAX)} (built in)`,
    qty: '1',
  },
  { name: 'Digital voltmeter', spec: '0-20 V', qty: '1' },
  { name: 'Digital milliammeter', spec: '0-20 mA', qty: '1' },
  { name: 'Patch cords', spec: 'Banana to banana', qty: 'As required' },
];

const precautions = [
  'Switch the mains OFF while changing connections.',
  'Start with SET VOLTS at zero and raise it slowly.',
  'Never connect the supply output directly to the shorted input terminals. Remove the supply cords from INPUT before shorting it.',
  'Keep the RL knob in the same position while you compare the network with its equivalent.',
  'Never turn RL to zero with the supply across it.',
];

const RECORD_VTH = 1.05;
const tCaption = `Same as the college lab record: VTH = ${RECORD_VTH} V and RTH = ${theveninTheory(1).rth.toFixed(1)} Ω (Vs ≈ ${(
  (RECORD_VTH * (TH.R1 + TH.R2)) /
  TH.R2
).toFixed(2)} V). Turn RL until IL reads each value below.`;
const expectedRows = [2.5, 3, 3.5, 4, 4.5].map((il) => ({
  IL: il,
  RL: RECORD_VTH / (il / 1000) - theveninTheory(1).rth,
}));

function theoryRow(r: Row, rows: Row[], withIN: boolean) {
  const vthRec = pick(r, rows, 'Vth');
  const vs = pick(r, rows, 'Vs') ?? (vthRec != null ? (vthRec * (TH.R1 + TH.R2)) / TH.R2 : null);
  if (vs == null) return null;
  const t = theveninTheory(vs);
  const out: Record<string, number> = withIN ? { IN: t.inorton * 1000 } : { Vth: t.vth };
  const rl = rlOf(r);
  if (rl != null) {
    const il = t.vth / (t.rth + rl);
    out.IL = il * 1000;
    if (r.ILe != null) out.ILe = il * 1000;
  }
  if (r.Vt != null) out.It = ((r.Vt as number) / t.rth) * 1000;
  return out;
}

export const thevenin: PracticalDef = {
  id: 'thevenin',
  title: "Verification of Thevenin's Theorem",
  short: "Thevenin's Theorem",
  reference: {
    label: 'Network theorems (Basic Electrical Science lab, IIT Roorkee)',
    url: 'https://bes-iitr.vlabs.ac.in/exp/network-theorem/',
  },
  kit: theveninKit,
  aim: "To verify Thevenin's theorem by finding the Thevenin equivalent (Vth and Rth) of a DC network, building it on the trainer, and showing that it gives the same load current as the original network.",
  apparatus,
  theory: [
    {
      heading: "Thevenin's theorem",
      body: [
        'Any linear two-terminal network of sources and resistors can be replaced, as seen from its terminals A-B, by a single voltage source Vth in series with a single resistance Rth.',
        'Vth is the open-circuit voltage across A-B with the load removed.',
        'Rth is the resistance seen looking into A-B when every independent source is replaced by its internal resistance (a voltage source by a short, a current source by an open).',
        'The load current is then IL = Vth / (Rth + RL), for any value of RL. This makes it easy to study a network for many loads.',
      ],
    },
    {
      heading: 'Measuring Rth on the kit',
      body: [
        'With the source shorted, a known test voltage Vt is applied across A-B and the current It drawn is measured. Then Rth = Vt / It.',
        `For this kit, Rth = R3 + (R1 × R2)/(R1 + R2) = ${theveninTheory(1).rth.toFixed(0)} Ω and Vth = Vs × R2/(R1 + R2).`,
      ],
    },
    {
      heading: 'Checking with the equivalent circuit',
      body: [
        "The trainer has a separate Thevenin's equivalent circuit: an adjustable source VTH in series with a variable resistor RTH, brought out to terminals A' and B'.",
        "Set VTH to the measured Vth and RTH to the measured Rth, then connect the same load RL to A'-B'. If the theorem holds, the load current IL' equals the current IL that the original network gave.",
      ],
    },
  ],
  schematic: TheveninOnlySchematic,
  formulas: [
    { label: 'Open-circuit voltage', expr: 'Vth = Vs × R2 / (R1 + R2)' },
    { label: 'Thevenin resistance', expr: 'Rth = R3 + R1·R2 / (R1 + R2)   (measured: Vt / It)' },
    { label: 'Load current', expr: 'IL = Vth / (Rth + RL)' },
    { label: 'Percentage error', expr: '% error = |calculated − measured| / calculated × 100' },
  ],
  precautions,
  steps: theveninSteps,
  measured: {
    ...commonMeasured,
    Vth: { label: 'Vth', unit: 'V', decimals: 2 },
    Veq: { label: 'VTH set', unit: 'V', decimals: 2 },
    ILe: { label: "IL'", unit: 'mA', decimals: 2 },
    VLe: { label: "VL'", unit: 'V', decimals: 2 },
  },
  advanceWhen: [['IL', 'VL']],
  warnings: ({ an }) =>
    circuitsJoined(an)
      ? [
          "The given network and the equivalent circuit are joined by your cords (for example RL plugged into both B and B'). Unplug the network cords before using the equivalent circuit. The meters are not identified until they are separate.",
        ]
      : [],
  tables: [
    {
      title: 'Table 1: Experimental observations and results',
      columns: [
        { key: 'VTH', label: 'VTH', unit: 'V', decimals: 2, derived: (r, rows) => (r.IL != null ? pick(r, rows, 'Vth') : null) },
        { key: 'RTH', label: 'RTH', unit: 'Ω', decimals: 0, derived: (r, rows) => (r.IL != null ? rth(r, rows) : null) },
        { key: 'IL', label: 'IL', unit: 'mA', decimals: 2 },
        { key: 'VL', label: 'VL', unit: 'V', decimals: 3 },
        { key: 'RL', label: 'RL = VL / IL', unit: 'Ω', decimals: 1, derived: rlOf },
        { key: 'ILc', label: 'IL = VTH / (RL + RTH)', unit: 'mA', decimals: 2, derived: ilFromThevenin },
      ],
    },
    {
      title: 'Table 2: Finding VTH and RTH',
      columns: [
        { key: 'Vth', label: 'Vth (open circuit)', unit: 'V', decimals: 3 },
        { key: 'Vt', label: 'Vt', unit: 'V', decimals: 3 },
        { key: 'It', label: 'It', unit: 'mA', decimals: 2 },
        { key: 'Rth', label: 'Rth = Vt / It', unit: 'Ω', decimals: 0, derived: rthRow },
      ],
    },
    {
      title: "Table 3: Thevenin's equivalent circuit on the trainer",
      columns: [
        { key: 'Veq', label: 'VTH set', unit: 'V', decimals: 2 },
        { key: 'ILe', label: "IL' (equivalent)", unit: 'mA', decimals: 2 },
        {
          key: 'ILnet',
          label: 'IL (network)',
          unit: 'mA',
          decimals: 2,
          derived: (r, rows) => (r.ILe != null ? networkIL(r, rows) : null),
        },
      ],
    },
  ],
  example: {
    label: 'Load my lab record values',
    note: 'Values from the college lab record: VTH = 1.05 V, RTH = 215 Ω, and RL set for IL = 2.5 to 4.5 mA.',
    rows: [
      [2.5, 205],
      [3, 138],
      [3.5, 85],
      [4, 47.5],
      [4.5, 18.3],
    ].map(([il, rl], i) => ({
      IL: il,
      VL: +((il * rl) / 1000).toFixed(5),
      ...(i === 0 ? { Vth: 1.05, Vt: 2.0, It: +((2.0 / 215) * 1000).toFixed(3) } : {}),
    })),
  },
  plots: [
    {
      title: 'Load current IL against load resistance RL',
      xLabel: 'RL (Ω)',
      yLabel: 'IL (mA)',
      points: (rows) => rows.filter((r) => rlOf(r) != null).map((r) => [rlOf(r) as number, r.IL as number]),
      theory: (x, rows) => {
        const vth = rows.find((r) => r.Vth != null)?.Vth;
        const R = rows.map((r) => rth(r, rows)).find((v) => v != null);
        return vth != null && R != null ? ((vth as number) / (R + x)) * 1000 : null;
      },
    },
  ],
  verifications: [
    {
      title: 'Load current calculated from Vth and Rth',
      law: 'IL (measured) = Vth / (Rth + RL)',
      lhsLabel: 'IL measured',
      rhsLabel: 'IL calculated',
      unit: 'mA',
      lhs: (r) => (rlOf(r) != null ? (r.IL as number) : null),
      rhs: ilFromThevenin,
    },
    {
      title: 'Network against its equivalent circuit',
      law: "IL (network) = IL' (equivalent circuit)",
      lhsLabel: 'IL network',
      rhsLabel: "IL' equivalent",
      unit: 'mA',
      lhs: (r, rows) => (r.ILe != null ? networkIL(r, rows) : null),
      rhs: (r, rows) => (networkIL(r, rows) != null ? r.ILe : null),
    },
  ],
  theoryFor: (r, rows) => theoryRow(r, rows, false),
  expected: {
    caption: tCaption,
    columns: [
      { key: 'RL', label: 'RL', unit: 'Ω', decimals: 0 },
      { key: 'IL', label: 'IL', unit: 'mA', decimals: 2 },
      { key: 'VL', label: 'VL', unit: 'V', decimals: 2 },
    ],
    rows: expectedRows,
  },
  viva: [
    {
      q: "State Thevenin's theorem.",
      a: 'A linear two-terminal network can be replaced by a voltage source Vth in series with a resistance Rth, as seen from the terminals.',
    },
    { q: 'How is Vth found?', a: 'It is the open-circuit voltage across the load terminals with the load removed.' },
    {
      q: 'How is Rth found?',
      a: 'Replace every independent voltage source by a short and every current source by an open, then find the resistance seen from the load terminals. On the kit: apply a test voltage and use Rth = Vt / It.',
    },
    {
      q: 'Why is a voltage source replaced by a short when finding Rth?',
      a: 'An ideal voltage source has zero internal resistance.',
    },
    {
      q: 'Can Thevenin be applied to a network with a diode?',
      a: 'Not directly. The theorem needs a linear network; a diode is non-linear.',
    },
    {
      q: 'What is the advantage of the Thevenin equivalent?',
      a: 'The load current for any RL comes from one simple formula without solving the whole network again.',
    },
    {
      q: 'How are Thevenin and Norton equivalents related?',
      a: 'Rth = RN and Vth = IN × RN. One can be converted into the other by source transformation.',
    },
    {
      q: 'What happens to IL when RL = Rth?',
      a: 'The load gets the maximum power: this is the maximum power transfer condition.',
    },
    {
      q: 'Why does the equivalent circuit give the same load current?',
      a: 'As seen from A-B, the network and the source Vth with series Rth have the same open-circuit voltage and the same internal resistance, so they behave identically for any load.',
    },
  ],
  defaultRows: 5,
  maxRows: 8,
};

export const norton: PracticalDef = {
  ...thevenin,
  id: 'norton',
  title: "Verification of Norton's Theorem",
  short: "Norton's Theorem",
  aim: "To verify Norton's theorem by finding the Norton equivalent (IN and RN) of a DC network and comparing the calculated load current with the measured load current.",
  theory: [
    {
      heading: "Norton's theorem",
      body: [
        'Any linear two-terminal network can be replaced, as seen from its terminals A-B, by a current source IN in parallel with a resistance RN.',
        'IN is the current that flows through a short circuit placed across A-B.',
        'RN is the resistance seen from A-B with every independent source replaced by its internal resistance. It equals the Thevenin resistance Rth.',
        'The load current is then IL = IN × RN / (RN + RL) (current divider rule).',
      ],
    },
    {
      heading: 'Measuring IN and RN on the kit',
      body: [
        'IN is measured by connecting the milliammeter directly across A-B: its very low resistance acts as the short.',
        'RN is measured like Rth: short the source and apply a test voltage at A-B, then RN = Vt / It.',
      ],
    },
  ],
  schematic: NortonSchematic,
  formulas: [
    { label: 'Short-circuit current', expr: 'IN = Vth / Rth   (measured with A-B shorted)' },
    { label: 'Norton resistance', expr: 'RN = Rth = R3 + R1·R2 / (R1 + R2)   (measured: Vt / It)' },
    { label: 'Load current', expr: 'IL = IN × RN / (RN + RL)' },
    { label: 'Percentage error', expr: '% error = |calculated − measured| / calculated × 100' },
  ],
  steps: nortonSteps,
  measured: { ...commonMeasured, IN: { label: 'IN', unit: 'mA', decimals: 2 } },
  expected: {
    ...thevenin.expected!,
    caption: `With Vs ≈ ${((RECORD_VTH * (TH.R1 + TH.R2)) / TH.R2).toFixed(2)} V: IN = ${((RECORD_VTH / theveninTheory(1).rth) * 1000).toFixed(2)} mA and RN = ${theveninTheory(1).rth.toFixed(1)} Ω. Turn RL until IL reads each value below.`,
  },
  example: undefined,
  tables: [
    {
      title: 'Table 1: Load current in the given network',
      columns: [
        { key: 'Vs', label: 'Vs', unit: 'V', decimals: 2 },
        { key: 'IL', label: 'IL (measured)', unit: 'mA', decimals: 2 },
        { key: 'VL', label: 'VL', unit: 'V', decimals: 3 },
        { key: 'RL', label: 'RL = VL / IL', unit: 'Ω', decimals: 1, derived: rlOf },
      ],
    },
    {
      title: 'Table 2: Norton equivalent',
      columns: [
        { key: 'IN', label: 'IN', unit: 'mA', decimals: 2 },
        { key: 'Vt', label: 'Vt', unit: 'V', decimals: 3 },
        { key: 'It', label: 'It', unit: 'mA', decimals: 2 },
        { key: 'RN', label: 'RN = Vt / It', unit: 'Ω', decimals: 0, derived: rthRow },
        { key: 'ILc', label: 'IL = IN·RN / (RN + RL)', unit: 'mA', decimals: 2, derived: ilFromNorton },
      ],
    },
  ],
  verifications: [
    {
      title: 'Load current from the Norton equivalent',
      law: 'IL (measured) = IN × RN / (RN + RL)',
      lhsLabel: 'IL measured',
      rhsLabel: 'IL from equivalent',
      unit: 'mA',
      lhs: (r) => (rlOf(r) != null ? (r.IL as number) : null),
      rhs: ilFromNorton,
    },
  ],
  theoryFor: (r, rows) => theoryRow(r, rows, true),
  viva: [
    {
      q: "State Norton's theorem.",
      a: 'A linear two-terminal network can be replaced by a current source IN in parallel with a resistance RN, as seen from the terminals.',
    },
    { q: 'How is IN measured?', a: 'Short the load terminals and measure the current through the short.' },
    {
      q: 'Why can the milliammeter itself act as the short?',
      a: 'Its internal resistance is very small compared to the network resistance.',
    },
    { q: 'How are RN and Rth related?', a: 'They are equal.' },
    { q: 'Convert a Norton equivalent to a Thevenin equivalent.', a: 'Vth = IN × RN and Rth = RN.' },
    {
      q: 'Why is a current source replaced by an open circuit when finding RN?',
      a: 'An ideal current source has infinite internal resistance.',
    },
    {
      q: 'Where is the Norton form more convenient than Thevenin?',
      a: 'When loads are connected in parallel, or for transistor and other current-source models.',
    },
    { q: 'Is the theorem valid for AC circuits?', a: 'Yes, using impedances and phasors for linear AC networks.' },
  ],
};
