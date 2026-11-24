import { pick, type AutoAction, type PracticalDef } from './types';

/**
 * What "Next step" does in each practical: the cords, settings and recordings
 * that complete each procedure step, in the same order as the step text.
 * One list of actions per step.
 */

const rec: AutoAction = { do: 'record' };
const add = (...pairs: [string, string][]): AutoAction => ({ do: 'add', pairs });
const remove = (...pairs: [string, string][]): AutoAction => ({ do: 'remove', pairs });
const unplug = (...sockets: string[]): AutoAction => ({ do: 'unplug', sockets });

// ---------- KCL and KVL ----------

const kclMeterInBranchA: AutoAction[] = [
  remove(['Y1', 'Y2']),
  unplug('Ap', 'An'),
  add(['Mp', 'Mn'], ['Ap', 'Y1'], ['An', 'Y2']),
  rec,
];
const kclMeterInBranchB: AutoAction[] = [
  add(['Y1', 'Y2']),
  remove(['B1', 'B2']),
  unplug('Ap', 'An'),
  add(['Ap', 'B1'], ['An', 'B2']),
  rec,
];
const kclGaps: [string, string][] = [
  ['Y1', 'Y2'],
  ['Y3', 'Y4'],
  ['B1', 'B2'],
  ['B3', 'B4'],
];
const voltmeterAcross = (a: string, b: string): AutoAction[] => [unplug('Vp', 'Vn'), add(['Vp', a], ['Vn', b]), rec];
const kvlLoop1 = [...voltmeterAcross('J1', 'Y1'), ...voltmeterAcross('Y2', 'Y3')];
const kvlLoop2 = [...voltmeterAcross('J1', 'B1'), ...voltmeterAcross('B2', 'B3')];

/** A full KCL set (Vs, I, I1, I2) at one supply voltage, in a new row. */
const kclFullSet = (volts: number): AutoAction[] => [
  { do: 'row', row: 'empty' },
  { do: 'set', mains: true, knobs: { K1: volts } },
  unplug('Ap', 'An', 'Vp', 'Vn'),
  remove(['Mp', 'Mn']),
  add(['outP', 'inP'], ['outN', 'inN'], ...kclGaps, ['Ap', 'Mp'], ['An', 'Mn'], ['Vp', 'J1'], ['Vn', 'J2']),
  rec,
  ...kclMeterInBranchA,
  ...kclMeterInBranchB,
];
/** A full KVL set (Vs, VR1-VR4) at one supply voltage, in a new row. */
const kvlFullSet = (volts: number): AutoAction[] => [
  { do: 'row', row: 'empty' },
  { do: 'set', mains: true, knobs: { K1: volts } },
  ...voltmeterAcross('J1', 'J2'),
  ...kvlLoop1,
  ...kvlLoop2,
];

const KCL_KVL: AutoAction[][] = [
  // KCL
  [add(['outP', 'inP'], ['outN', 'inN'])],
  [add(['Vp', 'J1'], ['Vn', 'J2'])],
  [add(...kclGaps)],
  [add(['Ap', 'Mp'], ['An', 'Mn'])],
  [{ do: 'set', mains: true, knobs: { K1: 2 } }, rec],
  kclMeterInBranchA,
  kclMeterInBranchB,
  [...kclFullSet(3), ...kclFullSet(4)],
  // KVL
  [add(['outP', 'inP'], ['outN', 'inN'])],
  [unplug('Ap', 'An'), add(...kclGaps, ['Mp', 'Mn'])],
  [{ do: 'row', row: 0 }, { do: 'set', mains: true, knobs: { K1: 2 } }, ...voltmeterAcross('J1', 'J2')],
  kvlLoop1,
  kvlLoop2,
  [...kvlFullSet(3), ...kvlFullSet(4)],
];

// ---------- Thevenin and Norton (same trainer) ----------

const rthOf = (rows: Parameters<typeof pick>[1]) => {
  const vt = rows.find((r) => r.Vt != null)?.Vt as number;
  const it = rows.find((r) => r.It != null)?.It as number;
  return (vt / it) * 1000;
};
/** Short the input and drive A-B from the supply through the milliammeter (Rth / RN test). */
const testRth: AutoAction[] = [
  { do: 'set', mains: false, knobs: { K1: 0 } },
  remove(['A', 'Ap'], ['L2', 'B'], ['outP', 'inP'], ['outN', 'inN'], ['Ap', 'A'], ['An', 'B']),
  add(['inP', 'inN'], ['outP', 'Ap'], ['An', 'A'], ['outN', 'B'], ['Vp', 'A'], ['Vn', 'B']),
  { do: 'set', mains: true, knobs: { K1: 1.5 }, ranges: { VM: 0 } },
  rec,
];

const THEVENIN: AutoAction[][] = [
  [add(['outP', 'inP'], ['outN', 'inN'])],
  [
    add(['Vp', 'A'], ['Vn', 'B']),
    { do: 'set', mains: true, ranges: { VM: 0 } },
    { do: 'seek', knob: 'K1', meter: 'VM', target: 1.05 },
    rec,
  ],
  [add(['A', 'Ap'], ['An', 'L1'], ['L2', 'B']), { do: 'seek', knob: 'KRL', meter: 'AM', target: 2.5e-3 }, rec],
  [3, 3.5, 4, 4.5].flatMap((ma): AutoAction[] => [{ do: 'seek', knob: 'KRL', meter: 'AM', target: ma / 1000 }, rec]),
  testRth,
  [
    unplug('inP', 'inN', 'outP', 'outN', 'A', 'B', 'Ap', 'An', 'Vp', 'Vn'),
    add(['Vp', 'VTHp'], ['Vn', 'VTHn']),
    { do: 'seek', knob: 'KVTH', meter: 'VM', target: (rows) => rows.find((r) => r.Vth != null)?.Vth as number },
    rec,
  ],
  [{ do: 'set', knobs: { KRTH: rthOf } }, add(['Aeq', 'Ap'], ['An', 'L1'], ['L2', 'Beq']), rec],
];

const NORTON: AutoAction[][] = [
  [add(['outP', 'inP'], ['outN', 'inN'])],
  [add(['Vp', 'inP'], ['Vn', 'inN']), { do: 'set', mains: true, knobs: { K1: 10 }, ranges: { VM: 1 } }, rec],
  [
    unplug('Vp', 'Vn'),
    add(['A', 'Ap'], ['An', 'L1'], ['L2', 'B'], ['Vp', 'A'], ['Vn', 'B']),
    { do: 'set', knobs: { KRL: 200 }, ranges: { VM: 0 } },
    rec,
  ],
  [remove(['An', 'L1'], ['L2', 'B']), add(['Ap', 'A'], ['An', 'B']), rec],
  testRth,
  [
    remove(['inP', 'inN'], ['outP', 'Ap'], ['An', 'A'], ['outN', 'B']),
    add(['outP', 'inP'], ['outN', 'inN'], ['A', 'Ap'], ['An', 'L1'], ['L2', 'B']),
    { do: 'set', knobs: { K1: 10 } },
    ...[100, 300, 500].flatMap((rl): AutoAction[] => [{ do: 'row', row: 'empty' }, { do: 'set', knobs: { KRL: rl } }, rec]),
  ],
];

// ---------- Superposition ----------

const GAPS: Record<'P' | 'Q' | 'G', { link: [string, string]; meter: [string, string][] }> = {
  P: {
    link: ['P1', 'P2'],
    meter: [
      ['Ap', 'P1'],
      ['An', 'P2'],
    ],
  },
  Q: {
    link: ['Q1', 'Q2'],
    meter: [
      ['Ap', 'Q2'],
      ['An', 'Q1'],
    ],
  },
  G: {
    link: ['G1', 'G2'],
    meter: [
      ['Ap', 'G1'],
      ['An', 'G2'],
    ],
  },
};
/** Put the milliammeter in one branch gap and close the other two with cords. */
const meterIn = (gap: 'P' | 'Q' | 'G'): AutoAction[] => [
  unplug('Ap', 'An'),
  add(...(Object.keys(GAPS) as ('P' | 'Q' | 'G')[]).filter((g) => g !== gap).map((g) => GAPS[g].link)),
  remove(GAPS[gap].link),
  add(...GAPS[gap].meter),
];
const allBranches: AutoAction[] = [...meterIn('P'), rec, ...meterIn('Q'), rec, ...meterIn('G'), rec];

const SUPERPOSITION: AutoAction[][] = [
  [add(['O1p', 'I1p'], ['O1n', 'I1n'], ['O2p', 'I2p'], ['O2n', 'I2n'])],
  [add(['Q1', 'Q2'], ['G1', 'G2'], ['Ap', 'P1'], ['An', 'P2'])],
  [
    { do: 'row', row: 0 },
    { do: 'set', mains: true, switches: { S1: 'a', S2: 'a' }, knobs: { K1: 10, K2: 5 } },
    add(['Vp', 'I1p'], ['Vn', 'I1n']),
    rec,
    unplug('Vp', 'Vn'),
    add(['Vp', 'I2p'], ['Vn', 'I2n']),
    rec,
  ],
  [...meterIn('Q'), rec, ...meterIn('G'), rec],
  [{ do: 'set', switches: { S2: 'b' } }, { do: 'row', row: 'empty' }, ...allBranches],
  [{ do: 'set', switches: { S1: 'b', S2: 'a' } }, { do: 'row', row: 'empty' }, ...allBranches],
];

// ---------- Maximum power transfer ----------

const MAX_POWER: AutoAction[][] = [
  [add(['outP', 'inP'], ['outN', 'inN'])],
  [add(['Vp', 'inP'], ['Vn', 'inN']), { do: 'set', mains: true, knobs: { K1: 10 }, ranges: { VM: 0 } }, rec],
  [
    unplug('Vp', 'Vn'),
    add(['Ap', 'A'], ['An', 'L1'], ['L2', 'B'], ['Vp', 'A'], ['Vn', 'B']),
    { do: 'set', decades: { RL: 100 } },
    rec,
  ],
  [200, 400, 600, 800, 1000, 1200, 1500, 2000, 3000].flatMap((rl): AutoAction[] => [{ do: 'set', decades: { RL: rl } }, rec]),
  [],
];

// ---------- PN junction diode ----------

const DIODE: AutoAction[][] = [
  [add(['FP1', 'Ap'], ['An', 'FA'], ['FK', 'FN1']), { do: 'set', ranges: { AM: 0 } }],
  [add(['Vp', 'FA'], ['Vn', 'FK']), { do: 'set', ranges: { VM: 1 } }],
  [
    { do: 'set', mains: true },
    ...[0.3, 0.5, 0.6, 0.7, 0.8, 1, 1.5, 2, 2.5].flatMap((v): AutoAction[] => [{ do: 'set', knobs: { KF: v } }, rec]),
  ],
  [
    { do: 'set', mains: false, knobs: { KF: 0 } },
    unplug('FP1', 'FN1', 'FA', 'FK', 'Ap', 'An', 'Vp', 'Vn'),
    add(['RP1', 'RK'], ['RA', 'Ap'], ['An', 'RN1'], ['Vp', 'RP2'], ['Vn', 'RN2']),
    { do: 'set', ranges: { AM: 1, VM: 0 } },
  ],
  [
    { do: 'row', row: 0 },
    { do: 'set', mains: true },
    ...[5, 10, 15, 20, 25, 30].flatMap((v): AutoAction[] => [{ do: 'set', knobs: { KR: v } }, rec]),
  ],
];

const AUTO: Record<string, AutoAction[][]> = {
  'kcl-kvl': KCL_KVL,
  thevenin: THEVENIN,
  norton: NORTON,
  superposition: SUPERPOSITION,
  'max-power': MAX_POWER,
  'pn-diode': DIODE,
};

/** The practical with "Next step" actions attached to each of its steps. */
export function withAuto(p: PracticalDef): PracticalDef {
  const auto = AUTO[p.id];
  if (!auto) return p;
  if (auto.length !== p.steps.length) throw new Error(`${p.id}: ${auto.length} auto steps for ${p.steps.length} procedure steps`);
  return { ...p, steps: p.steps.map((s, i) => ({ ...s, auto: auto[i] })) };
}
