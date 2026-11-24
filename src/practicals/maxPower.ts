import { MaxPowerSchematic } from '../components/schematics/MaxPowerSchematic';
import { fmtOhms } from '../kits/common';
import { MP, maxPowerKit, maxPowerTheory } from '../kits/maxPower';
import { pick, type PracticalDef, type Row } from './types';

const powerMw = (r: Row) => (r.VL != null && r.IL != null ? (r.VL as number) * (r.IL as number) : null);
const loadRows = (rows: Row[]) => rows.filter((r) => r.RL != null && powerMw(r) != null);

export const maxPower: PracticalDef = {
  id: 'max-power',
  title: 'Verification of Maximum Power Transfer Theorem',
  short: 'Maximum Power Transfer',
  reference: {
    label: 'Network theorems (Basic Electrical Science lab, IIT Roorkee)',
    url: 'https://bes-iitr.vlabs.ac.in/exp/network-theorem/',
  },
  kit: maxPowerKit,
  aim: 'To verify the maximum power transfer theorem: a source delivers the most power to a load when the load resistance equals the internal (source) resistance.',
  apparatus: [
    { name: 'Maximum power transfer trainer kit', spec: `Source resistance Rs = ${fmtOhms(MP.RS)}`, qty: '1' },
    { name: 'Regulated DC power supply', spec: `0-${MP.VMAX} V (built in)`, qty: '1' },
    { name: 'DC voltmeter', spec: '0-15 V / 0-5 V', qty: '1' },
    { name: 'DC milliammeter', spec: '0-20 mA / 0-10 mA', qty: '1' },
    { name: 'Decade resistance box (load RL)', spec: '0-9999 Ω', qty: '1' },
    { name: 'Patch cords', spec: 'Banana to banana', qty: 'As required' },
  ],
  theory: [
    {
      heading: 'Maximum power transfer theorem',
      body: [
        'A DC source with internal resistance Rs (or any network reduced to its Thevenin equivalent Vth, Rth) delivers maximum power to a load RL when RL = Rs.',
        'The load power is P = Vs² × RL / (Rs + RL)². It is small for very small RL (little voltage across the load) and for very large RL (little current), and peaks in between.',
        'At the peak, Pmax = Vs² / (4·Rs), and only half of the power drawn from the source reaches the load: the efficiency is 50%. The other half is lost in Rs.',
      ],
    },
    {
      heading: 'Maximum power is not maximum efficiency',
      body: [
        'Power systems aim for high efficiency, so they keep RL much larger than the source resistance. Communication circuits and amplifiers care more about getting the most signal power into the load, so they match RL to Rs.',
        'For AC circuits the condition becomes ZL = Zs* (the complex conjugate of the source impedance).',
      ],
    },
  ],
  schematic: MaxPowerSchematic,
  formulas: [
    { label: 'Load current', expr: 'IL = Vs / (Rs + RL)' },
    { label: 'Load power', expr: 'P = VL × IL = Vs²·RL / (Rs + RL)²' },
    { label: 'Condition for maximum power', expr: 'RL = Rs' },
    { label: 'Maximum power', expr: 'Pmax = Vs² / (4·Rs)' },
    { label: 'Efficiency', expr: 'η = VL / Vs × 100%  (50% at maximum power)' },
  ],
  precautions: [
    'Switch the mains OFF while changing connections.',
    'Keep Vs the same for the whole sweep.',
    'Do not set the decade box to 0 Ω.',
    'Take more readings close to RL = Rs, where the curve is flat at the top.',
  ],
  steps: [
    {
      text: 'Connect OUTPUT + to INPUT + and OUTPUT − to INPUT −.',
      check: ({ an }) => an.bridged('outP', 'inP') && an.bridged('outN', 'inN'),
      hint: ['outP', 'inP', 'outN', 'inN'],
    },
    {
      text: 'Put the voltmeter across INPUT. Switch mains ON, set SET VOLTS to about 10 V and record Vs.',
      check: ({ rows }) => rows.some((r) => r.Vs != null),
      hint: ['Vp', 'inP', 'Vn', 'inN'],
    },
    {
      text: 'Connect the load through the milliammeter: A to mA +, mA − to the red load-box socket, black load-box socket to B. Move the voltmeter across A-B. Set RL = 100 Ω and record VL and IL.',
      check: ({ rows }) => rows.some((r) => r.IL != null && r.VL != null),
      hint: ['A', 'Ap', 'An', 'L1', 'L2', 'B'],
    },
    {
      text: 'Increase RL step by step (for example 200, 400, 600, 800, 1000, 1200, 1500, 2000, 3000 Ω) and record VL and IL each time. The next reading row is selected for you.',
      check: ({ rows }) => loadRows(rows).length >= 8,
      hintText:
        'Change the decade box dials (click to turn up, right-click to turn down), then press Record reading. Include RL = 1000 Ω.',
    },
    {
      text: 'Open the Observations tab to see the power curve and find the RL that gives maximum power.',
      check: ({ rows }) => loadRows(rows).some((r) => Math.abs((r.RL as number) - MP.RS) <= MP.RS * 0.05),
      hintText: 'Make sure one of your readings is at RL = Rs = 1000 Ω.',
    },
  ],
  measured: {
    Vs: { label: 'Vs', unit: 'V', decimals: 2 },
    RL: { label: 'RL', unit: 'Ω', decimals: 0 },
    VL: { label: 'VL', unit: 'V', decimals: 2 },
    IL: { label: 'IL', unit: 'mA', decimals: 2 },
  },
  recordExtras: (c) => ({ RL: c.decades.RL }),
  advanceWhen: [['VL', 'IL']],
  tables: [
    {
      title: 'Table 1: Load power for different load resistances',
      columns: [
        { key: 'RL', label: 'RL', unit: 'Ω', decimals: 0 },
        { key: 'VL', label: 'VL', unit: 'V', decimals: 2 },
        { key: 'IL', label: 'IL', unit: 'mA', decimals: 2 },
        { key: 'P', label: 'P = VL × IL', unit: 'mW', decimals: 2, derived: powerMw },
        {
          key: 'eta',
          label: 'η = VL / Vs',
          unit: '%',
          decimals: 1,
          derived: (r, rows) => {
            const vs = pick(r, rows, 'Vs');
            return vs && r.VL != null ? ((r.VL as number) / vs) * 100 : null;
          },
        },
      ],
    },
  ],
  plots: [
    {
      title: 'Load power P against load resistance RL',
      xLabel: 'RL (Ω)',
      yLabel: 'P (mW)',
      points: (rows) => loadRows(rows).map((r) => [r.RL as number, powerMw(r) as number]),
      markMax: true,
      theory: (x, rows) => {
        const vs = rows.find((r) => r.Vs != null)?.Vs;
        return vs ? maxPowerTheory(vs, x).p * 1000 : null;
      },
    },
  ],
  results: (rows) => {
    const pts = loadRows(rows);
    if (pts.length < 3)
      return [
        { title: 'Maximum power', lines: ['Record at least 3 load readings, including one near RL = Rs, to find the maximum.'] },
      ];
    const best = pts.reduce((a, b) => ((powerMw(b) as number) > (powerMw(a) as number) ? b : a));
    const vs = rows.find((r) => r.Vs != null)?.Vs as number | undefined;
    const pmax = powerMw(best) as number;
    const lines = [`Maximum measured power: ${pmax.toFixed(2)} mW at RL = ${best.RL} Ω (source resistance Rs = ${MP.RS} Ω).`];
    let ok = Math.abs((best.RL as number) - MP.RS) <= MP.RS * 0.25;
    if (vs) {
      const theory = ((vs * vs) / (4 * MP.RS)) * 1000;
      const eff = ((best.VL as number) / vs) * 100;
      lines.push(
        `Theoretical Pmax = Vs² / 4Rs = ${theory.toFixed(2)} mW. Efficiency at the peak = ${eff.toFixed(1)}% (theory: 50%).`,
      );
      ok = ok && Math.abs(pmax - theory) / theory <= 0.05;
    }
    lines.push(
      ok
        ? 'Verified. The power delivered to the load is largest when RL equals the source resistance.'
        : 'Not verified yet. Add readings closer to RL = Rs, and check Vs was not changed during the sweep.',
    );
    return [{ title: 'Maximum power transfer', lines, ok }];
  },
  theoryFor: (r, rows) => {
    const vs = pick(r, rows, 'Vs');
    if (vs == null || r.RL == null) return null;
    const t = maxPowerTheory(vs, r.RL as number);
    return { IL: t.il * 1000, VL: t.vl };
  },
  expected: {
    caption: `For Vs = 10 V and Rs = ${MP.RS} Ω.`,
    columns: [
      { key: 'RL', label: 'RL', unit: 'Ω', decimals: 0 },
      { key: 'IL', label: 'IL', unit: 'mA', decimals: 2 },
      { key: 'VL', label: 'VL', unit: 'V', decimals: 2 },
      { key: 'P', label: 'P', unit: 'mW', decimals: 2 },
    ],
    rows: [200, 500, 800, 1000, 1200, 1500, 2000, 3000].map((rl) => {
      const t = maxPowerTheory(10, rl);
      return { RL: rl, IL: t.il * 1000, VL: t.vl, P: t.p * 1000 };
    }),
  },
  viva: [
    {
      q: 'State the maximum power transfer theorem.',
      a: 'A source delivers maximum power to a load when the load resistance equals the source (Thevenin) resistance.',
    },
    { q: 'What is the efficiency at maximum power transfer?', a: '50%, because equal power is lost in the source resistance.' },
    { q: 'Write the expression for maximum power.', a: 'Pmax = Vth² / (4·Rth).' },
    {
      q: 'Why is maximum power transfer not used in power systems?',
      a: 'Power systems need high efficiency; 50% loss would be unacceptable.',
    },
    {
      q: 'Where is the theorem used?',
      a: 'Communication circuits, audio amplifiers and speakers, antennas: wherever the most signal power into the load matters.',
    },
    {
      q: 'What is the condition for AC circuits?',
      a: 'The load impedance must be the complex conjugate of the source impedance, ZL = Zs*.',
    },
    {
      q: 'Why is the power curve flat near the peak?',
      a: 'P changes slowly around RL = Rs (the slope is zero at the maximum), so small mismatch costs little power.',
    },
    {
      q: 'How would you apply the theorem to a complex network?',
      a: 'Find the Thevenin equivalent seen by the load, then set RL = Rth.',
    },
  ],
  defaultRows: 10,
  maxRows: 16,
};
