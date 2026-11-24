import { SuperpositionSchematic } from '../components/schematics/SuperpositionSchematic';
import { fmtOhms } from '../kits/common';
import { SP, superpositionKit, superpositionTheory } from '../kits/superposition';
import { pick, type PracticalDef, type ResultBlock, type Row } from './types';

const BRANCHES = ['I1', 'I2', 'I3'] as const;
const caseOf = (r: Row) =>
  r.S1 === 1 && r.S2 === 1 ? 'both' : r.S1 === 1 && r.S2 === 0 ? 'v1' : r.S1 === 0 && r.S2 === 1 ? 'v2' : null;
const findCase = (rows: Row[], c: string) => rows.find((r) => caseOf(r) === c && BRANCHES.every((k) => r[k] != null));
const hasCase = (rows: Row[], c: string) => !!findCase(rows, c);

function results(rows: Row[]): ResultBlock[] {
  const both = findCase(rows, 'both');
  const a = findCase(rows, 'v1');
  const b = findCase(rows, 'v2');
  if (!both || !a || !b) {
    return [
      {
        title: 'Superposition check',
        lines: [
          `Record I1, I2 and I3 for all three cases to verify the theorem. So far: both sources ${both ? 'done' : 'missing'}, V1 alone ${a ? 'done' : 'missing'}, V2 alone ${b ? 'done' : 'missing'}.`,
        ],
      },
    ];
  }
  let worst = 0;
  const lines = BRANCHES.map((k) => {
    const total = both[k] as number;
    const sum = (a[k] as number) + (b[k] as number);
    const diff = Math.abs(total - sum);
    // Compare against the size of the currents involved, so a near-zero branch doesn't blow up the %.
    const scale = Math.max(Math.abs(total), Math.abs(a[k] as number), Math.abs(b[k] as number), 1e-9);
    worst = Math.max(worst, (diff / scale) * 100);
    return `${k}: with both sources ${total.toFixed(2)} mA; V1 alone ${(a[k] as number).toFixed(2)} + V2 alone ${(b[k] as number).toFixed(2)} = ${sum.toFixed(2)} mA.`;
  });
  const ok = worst <= 5;
  return [
    {
      title: 'Superposition check (I = I′ + I″ in every branch)',
      lines: [
        ...lines,
        ok
          ? `Verified. In every branch the current with both sources equals the algebraic sum of the currents with each source alone (within ${worst.toFixed(1)}%).`
          : `Not verified yet: one branch is off by ${worst.toFixed(1)}%. Check that the knobs were not moved between cases and that negative currents were recorded with a minus sign.`,
      ],
      ok,
    },
  ];
}

export const superposition: PracticalDef = {
  id: 'superposition',
  title: 'Verification of Superposition Theorem',
  short: 'Superposition Theorem',
  reference: {
    label: 'Network theorems (Basic Electrical Science lab, IIT Roorkee)',
    url: 'https://bes-iitr.vlabs.ac.in/exp/network-theorem/',
  },
  kit: superpositionKit,
  aim: 'To verify the superposition theorem in a DC network with two independent voltage sources by measuring the current in every branch.',
  apparatus: [
    {
      name: 'Superposition theorem trainer kit',
      spec: `R1 = ${fmtOhms(SP.R1)}, R2 = ${fmtOhms(SP.R2)}, R3 = ${fmtOhms(SP.R3)}, changeover switches S1, S2`,
      qty: '1',
    },
    { name: 'Regulated DC power supplies V1 and V2', spec: `0-${SP.VMAX} V each (built in)`, qty: '2' },
    { name: 'DC voltmeter', spec: '0-15 V / 0-5 V', qty: '1' },
    { name: 'DC milliammeter', spec: '0-10 mA / 0-5 mA', qty: '1' },
    { name: 'Patch cords', spec: 'Banana to banana', qty: 'As required' },
  ],
  theory: [
    {
      heading: 'Superposition theorem',
      body: [
        'In a linear, bilateral network with more than one independent source, the current through (or voltage across) any element is the algebraic sum of the currents (or voltages) produced by each source acting alone.',
        'While one source acts, every other independent voltage source is replaced by a short circuit and every independent current source by an open circuit (each by its internal resistance, in general).',
        'On this kit the changeover switches S1 and S2 do exactly that: in the down position the source is disconnected and its place in the circuit is shorted.',
      ],
    },
    {
      heading: 'Signs matter',
      body: [
        'A branch current can change direction when a source is removed. Currents are taken positive in the direction of the arrows on the kit. If a needle swings backwards, swap the meter cords: the reading is then recorded as negative.',
        'Superposition cannot be used to add powers, because power is proportional to the square of current: (I′ + I″)² is not I′² + I″².',
      ],
    },
  ],
  schematic: SuperpositionSchematic,
  formulas: [
    { label: 'Node voltage (both sources)', expr: 'VN = (V1/R1 + V2/R2) / (1/R1 + 1/R2 + 1/R3)' },
    { label: 'Branch currents', expr: 'I1 = (V1 − VN)/R1,  I2 = (V2 − VN)/R2,  I3 = VN/R3' },
    { label: 'Superposition', expr: 'I = I′ (V1 alone) + I″ (V2 alone), for each branch' },
    { label: 'KCL at the node (check)', expr: 'I1 + I2 = I3' },
  ],
  precautions: [
    'Do not change V1 or V2 between the three cases. Only flip the switches.',
    'Never short a supply by wiring it directly: always use the S1 and S2 switches to remove a source.',
    'When moving the milliammeter to another gap, close the gap you leave with a cord.',
    'Record the sign of each current carefully.',
  ],
  steps: [
    {
      text: 'Connect V1 OUTPUT to V1 INPUT and V2 OUTPUT to V2 INPUT (+ to + and − to −).',
      check: ({ an }) => ['1', '2'].every((n) => an.bridged(`O${n}p`, `I${n}p`) && an.bridged(`O${n}n`, `I${n}n`)),
      hint: ['O1p', 'I1p', 'O1n', 'I1n', 'O2p', 'I2p', 'O2n', 'I2n'],
    },
    {
      text: 'Close the I2 and I3 gaps with cords, and put the milliammeter in the I1 gap (mA + on the left yellow socket).',
      check: ({ an }) => an.readings.AM.measurement?.key === 'I1' && an.bridged('Q1', 'Q2') && an.bridged('G1', 'G2'),
      hint: ['Q1', 'Q2', 'G1', 'G2', 'Ap', 'P1', 'An', 'P2'],
    },
    {
      text: 'Case 1, both sources: set S1 to V1 IN and S2 to V2 IN, and choose Reading 1. Switch mains ON. With the voltmeter across each INPUT, set V1 to about 10 V and V2 to about 5 V and record each.',
      check: ({ rows }) => rows.some((r) => r.V1 != null) && rows.some((r) => r.V2 != null),
      hint: ['Vp', 'I1p', 'Vn', 'I1n'],
    },
    {
      text: 'Still in case 1, record I1. Then move the meter to the I2 gap and then the I3 gap (closing each gap you leave with a cord), recording each current.',
      check: ({ rows }) => hasCase(rows, 'both'),
      hintText:
        'For I2, mA + goes on the right yellow socket of the I2 gap (current flows right to left). For I3, mA + goes on the upper blue socket.',
    },
    {
      text: 'Case 2, V1 alone: flip S2 to SHORT, choose Reading 2 and record I1, I2 and I3 again. If a needle swings backwards, swap the meter cords: the value is saved as negative.',
      check: ({ rows }) => hasCase(rows, 'v1'),
    },
    {
      text: 'Case 3, V2 alone: S1 to SHORT and S2 to V2 IN, choose Reading 3 and record I1, I2 and I3.',
      check: ({ rows }) => hasCase(rows, 'v2'),
    },
  ],
  measured: {
    S1: { label: 'V1 in', unit: '1 = yes', decimals: 0 },
    S2: { label: 'V2 in', unit: '1 = yes', decimals: 0 },
    V1: { label: 'V1', unit: 'V', decimals: 2 },
    V2: { label: 'V2', unit: 'V', decimals: 2 },
    I1: { label: 'I1', unit: 'mA', decimals: 2 },
    I2: { label: 'I2', unit: 'mA', decimals: 2 },
    I3: { label: 'I3', unit: 'mA', decimals: 2 },
  },
  recordExtras: (c) => ({ S1: c.switches.S1 === 'a' ? 1 : 0, S2: c.switches.S2 === 'a' ? 1 : 0 }),
  tables: [
    {
      title: 'Table 1: Branch currents for each case',
      columns: [
        { key: 'S1', label: 'V1 in', unit: '1 = yes', decimals: 0 },
        { key: 'S2', label: 'V2 in', unit: '1 = yes', decimals: 0 },
        { key: 'V1', label: 'V1', unit: 'V', decimals: 2 },
        { key: 'V2', label: 'V2', unit: 'V', decimals: 2 },
        { key: 'I1', label: 'I1', unit: 'mA', decimals: 2 },
        { key: 'I2', label: 'I2', unit: 'mA', decimals: 2 },
        { key: 'I3', label: 'I3', unit: 'mA', decimals: 2 },
        {
          key: 'kcl',
          label: 'I1 + I2',
          unit: 'mA',
          decimals: 2,
          derived: (r) => (r.I1 != null && r.I2 != null ? (r.I1 as number) + (r.I2 as number) : null),
        },
      ],
    },
  ],
  results,
  theoryFor: (r, rows) => {
    const v1 = pick(r, rows, 'V1');
    const v2 = pick(r, rows, 'V2');
    if (v1 == null || v2 == null || r.S1 == null || r.S2 == null) return null;
    const t = superpositionTheory(v1, v2, r.S1 as number, r.S2 as number);
    return { I1: t.I1 * 1000, I2: t.I2 * 1000, I3: t.I3 * 1000 };
  },
  expected: {
    caption: 'For V1 = 10 V and V2 = 5 V. Negative means opposite to the arrow on the kit.',
    columns: [
      { key: 'S1', label: 'V1 in', unit: '1 = yes', decimals: 0 },
      { key: 'S2', label: 'V2 in', unit: '1 = yes', decimals: 0 },
      { key: 'I1', label: 'I1', unit: 'mA', decimals: 2 },
      { key: 'I2', label: 'I2', unit: 'mA', decimals: 2 },
      { key: 'I3', label: 'I3', unit: 'mA', decimals: 2 },
    ],
    rows: (
      [
        [1, 1],
        [1, 0],
        [0, 1],
      ] as const
    ).map(([a, b]) => {
      const t = superpositionTheory(10, 5, a, b);
      return { S1: a, S2: b, I1: t.I1 * 1000, I2: t.I2 * 1000, I3: t.I3 * 1000 };
    }),
  },
  viva: [
    {
      q: 'State the superposition theorem.',
      a: 'In a linear bilateral network with several sources, the response in any element is the algebraic sum of the responses due to each source acting alone.',
    },
    {
      q: 'How are the other sources treated when one source acts?',
      a: 'Voltage sources are replaced by a short (their internal resistance) and current sources by an open circuit.',
    },
    {
      q: 'Why can superposition not be applied to power?',
      a: 'Power depends on the square of current or voltage, which is not linear.',
    },
    { q: 'Can superposition be applied to a circuit with a diode?', a: 'No. The diode is non-linear.' },
    { q: 'What is a bilateral element?', a: 'One that behaves the same for current in either direction, such as a resistor.' },
    {
      q: 'Why did one current come out negative in a single-source case?',
      a: 'With that source removed, the current in the branch flows opposite to its direction in the two-source case.',
    },
    {
      q: 'Does superposition work for dependent sources?',
      a: 'Dependent sources are never removed; they stay in the circuit for every case.',
    },
    {
      q: 'Where is superposition useful in practice?',
      a: 'In amplifiers with DC bias and AC signal, and in any network with several independent sources.',
    },
  ],
  defaultRows: 3,
  maxRows: 6,
};
