import { KclKvlSchematic } from '../components/schematics/KclKvlSchematic';
import { kclKvlKit } from '../kits/kclKvl';
import type { PracticalDef, Row } from './types';

const sum = (r: Row, a: string, b: string) => (r[a] != null && r[b] != null ? (r[a] as number) + (r[b] as number) : null);
function theoryAt(vs: number): Record<string, number> {
  const i1 = vs / 150;
  const i2 = vs / 550;
  return { Vs: vs, I1: i1 * 1000, I2: i2 * 1000, I: (i1 + i2) * 1000, VR1: i1 * 50, VR2: i1 * 100, VR3: i2 * 220, VR4: i2 * 330 };
}

const recordedAnywhere = (rows: Row[], key: string) => rows.some((r) => r[key] != null);

export const kclKvl: PracticalDef = {
  id: 'kcl-kvl',
  title: "Verification of Kirchhoff's Current Law and Voltage Law",
  short: 'KCL and KVL',
  reference: {
    label: "Kirchhoff's laws (Basic Electrical Science lab, IIT Roorkee)",
    url: 'https://bes-iitr.vlabs.ac.in/exp/kirchhoff-law/',
  },
  kit: kclKvlKit,
  aim: "To verify Kirchhoff's Current Law (KCL) and Kirchhoff's Voltage Law (KVL) using a DC circuit with two parallel branches.",
  apparatus: [
    { name: 'KCL and KVL trainer kit', spec: 'R1 = 50 Ω, R2 = 100 Ω, R3 = 220 Ω, R4 = 330 Ω', qty: '1' },
    { name: 'Regulated DC power supply', spec: '0-5 V (built into the kit)', qty: '1' },
    { name: 'DC voltmeter (moving coil)', spec: '0-5 V', qty: '1' },
    { name: 'DC milliammeter (moving coil)', spec: '0-50 mA', qty: '1' },
    { name: 'Patch cords', spec: 'Banana to banana', qty: 'As required' },
  ],
  theory: [
    {
      heading: "Kirchhoff's Current Law (KCL)",
      body: [
        'The algebraic sum of all currents meeting at a node (junction) is zero. In other words, the total current entering a node is equal to the total current leaving it.',
        'KCL follows from conservation of charge: charge cannot pile up at a junction, so whatever flows in must flow out.',
        'In this kit the supply current I enters the red junction and splits into branch A (R1, R2) and branch B (R3, R4). So I = I1 + I2.',
      ],
    },
    {
      heading: "Kirchhoff's Voltage Law (KVL)",
      body: [
        'The algebraic sum of all voltages around any closed loop is zero. The voltage rises (sources) in a loop equal the voltage drops (resistors).',
        'KVL follows from conservation of energy: a charge that goes round a loop and returns to where it started has the same energy it began with.',
        'Loop 1 is the supply, R1 and R2, so Vs = VR1 + VR2. Loop 2 is the supply, R3 and R4, so Vs = VR3 + VR4.',
      ],
    },
  ],
  schematic: KclKvlSchematic,
  formulas: [
    { label: 'Branch A current', expr: 'I1 = Vs / (R1 + R2) = Vs / 150 Ω' },
    { label: 'Branch B current', expr: 'I2 = Vs / (R3 + R4) = Vs / 550 Ω' },
    { label: 'KCL at the junction', expr: 'I = I1 + I2' },
    { label: 'KVL, loop 1', expr: 'Vs = VR1 + VR2 = I1·R1 + I1·R2' },
    { label: 'KVL, loop 2', expr: 'Vs = VR3 + VR4 = I2·R3 + I2·R4' },
    { label: 'Percentage error', expr: '% error = |theoretical − measured| / theoretical × 100' },
  ],
  precautions: [
    'Switch the mains OFF while changing connections.',
    'Keep SET VOLTS at zero before switching ON, then raise it slowly.',
    'Connect the milliammeter in series and the voltmeter in parallel. A milliammeter across the supply will blow the fuse.',
    'Connect meter + to the higher potential. A reversed meter deflects backwards.',
    'Read the meter looking straight at the needle to avoid parallax error.',
    'Do not exceed 5 V, so the total current stays within the 50 mA meter range.',
  ],
  steps: [
    {
      text: 'Connect OUTPUT + to INPUT + and OUTPUT − to INPUT − with patch cords.',
      check: ({ an }) => an.bridged('outP', 'inP') && an.bridged('outN', 'inN'),
      hint: ['outP', 'inP', 'outN', 'inN'],
    },
    {
      text: 'Connect the voltmeter across the input: V + to the red socket and V − to the black socket at the (V) symbol.',
      check: ({ an }) => an.readings.VM.measurement?.key === 'Vs' && !an.readings.VM.reversed,
      hint: ['Vp', 'J1', 'Vn', 'J2'],
    },
    {
      text: 'Close branch A: put a cord across each dashed gap between the yellow sockets.',
      check: ({ an }) => an.bridged('Y1', 'Y2') && an.bridged('Y3', 'Y4'),
      hint: ['Y1', 'Y2', 'Y3', 'Y4'],
    },
    {
      text: 'Close branch B: put a cord across each dashed gap between the blue sockets.',
      check: ({ an }) => an.bridged('B1', 'B2') && an.bridged('B3', 'B4'),
      hint: ['B1', 'B2', 'B3', 'B4'],
    },
    {
      text: 'Connect the milliammeter at the (mA) symbol: mA + to the red socket, mA − to the black socket.',
      check: ({ an }) => an.readings.AM.measurement?.key === 'I' && !an.readings.AM.reversed,
      hint: ['Ap', 'Mp', 'An', 'Mn'],
    },
    {
      text: 'Switch mains ON, turn SET VOLTS to about 2 V, then press Record to save Vs and the total current I.',
      check: ({ rows }) => recordedAnywhere(rows, 'Vs') && recordedAnywhere(rows, 'I'),
      hintText: 'Flip the toggle switch to ON, drag the SET VOLTS knob, then press Record reading.',
    },
    {
      text: 'Move the milliammeter into branch A in place of one yellow cord, and put a cord across the (mA) symbol. Record I1.',
      check: ({ rows }) => recordedAnywhere(rows, 'I1'),
      hint: ['Y1', 'Y2', 'Mp', 'Mn'],
      noCords: true,
      hintText:
        'Remove the Y1 to Y2 cord, wire mA + to the yellow socket after R1 and mA − to the next yellow socket, and link the red and black sockets at the (mA) symbol.',
    },
    {
      text: 'Move the milliammeter into branch B in the same way and close branch A again. Record I2.',
      check: ({ rows }) => recordedAnywhere(rows, 'I2'),
      hint: ['B1', 'B2'],
      noCords: true,
    },
    {
      text: 'Move the voltmeter across R1, R2, R3 and R4 in turn (+ on the side nearer the supply +). Record each voltage.',
      check: ({ rows }) => ['VR1', 'VR2', 'VR3', 'VR4'].every((k) => recordedAnywhere(rows, k)),
      hintText: 'For R1, put V + on the red junction and V − on the yellow socket after R1.',
    },
    {
      text: 'Repeat for at least 3 different supply voltages (one row each), then open the Observations tab.',
      check: ({ rows }) =>
        rows.filter((r) => ['Vs', 'I', 'I1', 'I2', 'VR1', 'VR2', 'VR3', 'VR4'].every((k) => r[k] != null)).length >= 3,
      hintText: 'Select the next reading row on the right, change SET VOLTS, and record everything again.',
    },
  ],
  measured: {
    Vs: { label: 'Vs', unit: 'V', decimals: 2 },
    I: { label: 'I', unit: 'mA', decimals: 2 },
    I1: { label: 'I1', unit: 'mA', decimals: 2 },
    I2: { label: 'I2', unit: 'mA', decimals: 2 },
    VR1: { label: 'VR1', unit: 'V', decimals: 2 },
    VR2: { label: 'VR2', unit: 'V', decimals: 2 },
    VR3: { label: 'VR3', unit: 'V', decimals: 2 },
    VR4: { label: 'VR4', unit: 'V', decimals: 2 },
  },
  tables: [
    {
      title: 'Table 1: Verification of KCL',
      columns: [
        { key: 'Vs', label: 'Vs', unit: 'V', decimals: 2 },
        { key: 'I1', label: 'I1', unit: 'mA', decimals: 2 },
        { key: 'I2', label: 'I2', unit: 'mA', decimals: 2 },
        { key: 'I1+I2', label: 'I1 + I2', unit: 'mA', decimals: 2, derived: (r) => sum(r, 'I1', 'I2') },
        { key: 'I', label: 'I (measured)', unit: 'mA', decimals: 2 },
      ],
    },
    {
      title: 'Table 2: Verification of KVL',
      columns: [
        { key: 'Vs', label: 'Vs', unit: 'V', decimals: 2 },
        { key: 'VR1', label: 'VR1', unit: 'V', decimals: 2 },
        { key: 'VR2', label: 'VR2', unit: 'V', decimals: 2 },
        { key: 'VR1+VR2', label: 'VR1 + VR2', unit: 'V', decimals: 2, derived: (r) => sum(r, 'VR1', 'VR2') },
        { key: 'VR3', label: 'VR3', unit: 'V', decimals: 2 },
        { key: 'VR4', label: 'VR4', unit: 'V', decimals: 2 },
        { key: 'VR3+VR4', label: 'VR3 + VR4', unit: 'V', decimals: 2, derived: (r) => sum(r, 'VR3', 'VR4') },
      ],
    },
  ],
  verifications: [
    {
      title: 'KCL at the junction',
      law: 'I = I1 + I2',
      lhsLabel: 'I',
      rhsLabel: 'I1 + I2',
      lhs: (r) => r.I,
      rhs: (r) => sum(r, 'I1', 'I2'),
      unit: 'mA',
    },
    {
      title: 'KVL, loop 1 (R1, R2)',
      law: 'Vs = VR1 + VR2',
      lhsLabel: 'Vs',
      rhsLabel: 'VR1 + VR2',
      lhs: (r) => r.Vs,
      rhs: (r) => sum(r, 'VR1', 'VR2'),
      unit: 'V',
    },
    {
      title: 'KVL, loop 2 (R3, R4)',
      law: 'Vs = VR3 + VR4',
      lhsLabel: 'Vs',
      rhsLabel: 'VR3 + VR4',
      lhs: (r) => r.Vs,
      rhs: (r) => sum(r, 'VR3', 'VR4'),
      unit: 'V',
    },
  ],
  plots: [
    {
      title: 'Total current I against supply voltage Vs',
      xLabel: 'Vs (V)',
      yLabel: 'I (mA)',
      points: (rows) => rows.filter((r) => r.Vs != null && r.I != null).map((r) => [r.Vs as number, r.I as number]),
      theory: (x) => theoryAt(x).I,
    },
  ],
  theoryFor: (r) => {
    if (r.Vs == null) return null;
    const { Vs: _vs, ...rest } = theoryAt(r.Vs);
    return rest;
  },
  expected: {
    caption: 'Use these to check your own readings. Small differences come from meter tolerance and reading error.',
    columns: [
      { key: 'Vs', label: 'Vs', unit: 'V', decimals: 1 },
      { key: 'I1', label: 'I1', unit: 'mA', decimals: 2 },
      { key: 'I2', label: 'I2', unit: 'mA', decimals: 2 },
      { key: 'I', label: 'I', unit: 'mA', decimals: 2 },
      { key: 'VR1', label: 'VR1', unit: 'V', decimals: 2 },
      { key: 'VR2', label: 'VR2', unit: 'V', decimals: 2 },
      { key: 'VR3', label: 'VR3', unit: 'V', decimals: 2 },
      { key: 'VR4', label: 'VR4', unit: 'V', decimals: 2 },
    ],
    rows: [1, 2, 3, 4, 5].map(theoryAt),
  },
  viva: [
    {
      q: "State Kirchhoff's Current Law.",
      a: 'The algebraic sum of currents meeting at a node is zero: total current in equals total current out.',
    },
    { q: "State Kirchhoff's Voltage Law.", a: 'The algebraic sum of all voltages around any closed loop is zero.' },
    {
      q: 'KCL and KVL are based on which conservation laws?',
      a: 'KCL on conservation of charge, KVL on conservation of energy.',
    },
    {
      q: 'Why is the milliammeter connected in series?',
      a: 'An ammeter must carry the same current as the branch it measures, so the current has to flow through it. Its resistance is very low so it barely affects the circuit.',
    },
    {
      q: 'What happens if you connect the milliammeter across the supply?',
      a: 'Its very low resistance shorts the supply, a large current flows and the fuse blows (or the meter is damaged).',
    },
    {
      q: 'Why is the voltmeter connected in parallel?',
      a: 'It measures the potential difference between two points. Its very high resistance draws almost no current.',
    },
    { q: 'Do KCL and KVL apply to AC circuits?', a: 'Yes, at every instant, and also with phasor values in steady-state AC.' },
    {
      q: 'Where do KCL and KVL fail?',
      a: 'At very high frequencies where the circuit is no longer lumped (wavelength comparable to the circuit size), and with changing magnetic fields linking the loop.',
    },
    {
      q: 'Why does the measured I1 + I2 differ slightly from I?',
      a: 'Meter tolerance (class 2 means ±2% of full scale), reading error, resistor tolerance and contact resistance of cords.',
    },
    {
      q: 'Which branch carries more current here and why?',
      a: 'Branch A (R1 + R2 = 150 Ω) carries more current than branch B (550 Ω) because both have the same voltage across them and current is inversely proportional to resistance.',
    },
  ],
  defaultRows: 3,
  maxRows: 6,
};
