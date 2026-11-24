import { fmtOhms, range, supplyArrows } from './common';
import type { KitDef, QueryContext } from './types';

/**
 * Thevenin's theorem trainer, laid out like the college kit: digital meters,
 * a load potentiometer RL in its own box, the given network, and a separate
 * "Thevenin's equivalent circuit" section with an adjustable VTH source and an
 * RTH potentiometer.
 *
 *  Network:     INPUT + ── R1 ──┬── R3 ── A          load RL (pot) between A and B
 *                               R2
 *               INPUT − ────────┴──────── B
 *
 *  Equivalent:  VTH + ── RTH ── A'        VTH − ── B'
 */
/** Values chosen so the kit reproduces the college lab record: Vth = 1.05 V (at Vs ≈ 5.16 V) and Rth ≈ 215 Ω. */
export const TH = { R1: 470, R2: 120, R3: 120, VMAX: 12, RL_MAX: 500, RTH_MAX: 1000 };

const powered = (q: QueryContext) => q.bridged('outP', 'inP') && q.bridged('outN', 'inN');
const loadOn = (q: QueryContext, a: string, b: string) =>
  (q.bridged(a, 'L1') && q.bridged(b, 'L2')) || (q.bridged(a, 'L2') && q.bridged(b, 'L1'));
/** Source replaced by a short and the supply applied at A-B instead (to measure Rth). */
const testing = (q: QueryContext) => q.sameNet('inP', 'inN') && !powered(q);
/** The given network and the equivalent circuit joined by cords (e.g. RL plugged into both). */
export const circuitsJoined = (q: QueryContext) =>
  q.bridged('A', 'Aeq') || q.bridged('B', 'Beq') || q.bridged('A', 'Beq') || q.bridged('B', 'Aeq');

const Y1 = 570;
const Y2 = 800;

export const theveninKit: KitDef = {
  id: 'thevenin',
  width: 1400,
  height: 900,
  face: '#f6f6f3',
  defaultDigital: true,
  title: ["VERIFICATION OF THEVENIN'S THEOREM", 'TRAINER'],
  sockets: [
    { id: 'Vp', x: 215, y: 470, color: 'red', name: 'Voltmeter +' },
    { id: 'Vn', x: 375, y: 470, color: 'black', name: 'Voltmeter −' },
    { id: 'Ap', x: 1015, y: 470, color: 'red', name: 'Milliammeter +' },
    { id: 'An', x: 1175, y: 470, color: 'black', name: 'Milliammeter −' },

    { id: 'L1', x: 715, y: 395, color: 'yellow', name: 'RL left yellow socket' },
    { id: 'L2', x: 835, y: 395, color: 'yellow', name: 'RL right yellow socket' },

    { id: 'outP', x: 240, y: Y1, color: 'red', name: 'DC OUTPUT +' },
    { id: 'outN', x: 240, y: Y2, color: 'black', name: 'DC OUTPUT −' },
    { id: 'inP', x: 330, y: Y1, color: 'red', name: 'INPUT +' },
    { id: 'inN', x: 330, y: Y2, color: 'black', name: 'INPUT −' },
    { id: 'N', x: 500, y: Y1, color: 'yellow', name: 'yellow node between R1 and R3' },
    { id: 'A', x: 660, y: Y1, color: 'red', name: 'terminal A' },
    { id: 'B', x: 660, y: Y2, color: 'black', name: 'terminal B' },

    { id: 'VTHp', x: 950, y: 580, color: 'red', name: 'VTH source +' },
    { id: 'VTHn', x: 950, y: Y2, color: 'black', name: 'VTH source −' },
    { id: 'Aeq', x: 1290, y: 580, color: 'red', name: "equivalent terminal A'" },
    { id: 'Beq', x: 1290, y: Y2, color: 'black', name: "equivalent terminal B'" },
  ],
  resistors: [
    { id: 'R1', a: 'inP', b: 'N', ohms: TH.R1, from: [375, Y1], to: [465, Y1] },
    { id: 'R3', a: 'N', b: 'A', ohms: TH.R3, from: [535, Y1], to: [625, Y1] },
    { id: 'R2', a: 'N', b: 'inN', ohms: TH.R2, from: [500, 612], to: [500, 758] },
  ],
  pots: [
    { id: 'RL', a: 'L1', b: 'L2', knob: 'KRL', min: 1, from: [737, 395], to: [813, 395] },
    { id: 'RTH', a: 'VTHp', b: 'Aeq', knob: 'KRTH', min: 5, from: [1010, 580], to: [1110, 580] },
  ],
  hardNets: [
    ['inN', 'B'],
    ['VTHn', 'Beq'],
  ],
  boxes: [
    { x: 650, y: 150, w: 250, h: 285, label: 'LOAD  RL' },
    { x: 740, y: 498, w: 600, h: 356, label: "THEVENIN'S EQUIVALENT CIRCUIT" },
  ],
  traces: [
    ...supplyArrows(110, 680, 240, Y1, Y2),
    {
      points: [
        [352, Y1],
        [375, Y1],
      ],
    },
    {
      points: [
        [465, Y1],
        [478, Y1],
      ],
    },
    {
      points: [
        [522, Y1],
        [535, Y1],
      ],
    },
    {
      points: [
        [625, Y1],
        [638, Y1],
      ],
    },
    {
      points: [
        [500, 592],
        [500, 612],
      ],
    },
    {
      points: [
        [500, 758],
        [500, Y2],
      ],
    },
    {
      points: [
        [352, Y2],
        [638, Y2],
      ],
    },
    // equivalent circuit
    ...supplyArrows(820, 690, 950, 580, Y2),
    {
      points: [
        [972, 580],
        [1010, 580],
      ],
    },
    {
      points: [
        [1110, 580],
        [1268, 580],
      ],
    },
    {
      points: [
        [972, Y2],
        [1268, Y2],
      ],
    },
  ],
  dots: [[500, Y2]],
  texts: [
    { x: 295, y: 478, text: 'V', size: 22, weight: 700 },
    { x: 1095, y: 478, text: 'mA', size: 22, weight: 700 },
    { x: 520, y: 243, text: 'MAINS', size: 17, weight: 700 },
    { x: 520, y: 282, text: 'OFF', size: 17, weight: 700 },
    { x: 520, y: 405, text: 'ON', size: 17, weight: 700 },
    { x: 775, y: 345, text: `0-${fmtOhms(TH.RL_MAX)}`, size: 15, weight: 700 },
    { x: 218, y: 538, text: '+', size: 28, weight: 700 },
    { x: 218, y: 846, text: '−', size: 28, weight: 700 },
    { x: 330, y: 530, text: 'INPUT', size: 14, weight: 700 },
    { x: 330, y: 845, text: 'INPUT', size: 14, weight: 700 },
    { x: 420, y: 548, text: 'R1', size: 18, weight: 700 },
    { x: 420, y: 608, text: fmtOhms(TH.R1), size: 17, weight: 700 },
    { x: 580, y: 548, text: 'R3', size: 18, weight: 700 },
    { x: 580, y: 608, text: fmtOhms(TH.R3), size: 17, weight: 700 },
    { x: 524, y: 680, text: 'R2', size: 18, weight: 700, anchor: 'start' },
    { x: 524, y: 704, text: fmtOhms(TH.R2), size: 17, weight: 700, anchor: 'start' },
    { x: 660, y: 537, text: 'A', size: 24, weight: 800 },
    { x: 660, y: 846, text: 'B', size: 24, weight: 800 },
    { x: 950, y: 552, text: 'VTH +', size: 14, weight: 700 },
    { x: 950, y: 838, text: 'VTH −', size: 14, weight: 700 },
    { x: 1060, y: 552, text: 'RTH', size: 17, weight: 800 },
    { x: 1318, y: 587, text: "A'", size: 22, weight: 800, anchor: 'start' },
    { x: 1318, y: 807, text: "B'", size: 22, weight: 800, anchor: 'start' },
  ],
  symbols: [],
  meters: [
    { id: 'VM', kind: 'V', cx: 300, cy: 285, plus: 'Vp', minus: 'Vn', ranges: [range(2, 'V', 4, 10), range(20, 'V', 4, 10)] },
    { id: 'AM', kind: 'A', cx: 1100, cy: 285, plus: 'Ap', minus: 'An', ranges: [range(20, 'mA', 4, 10)] },
  ],
  knobs: [
    { id: 'K1', x: 110, y: 680, max: TH.VMAX, label: ['SET VOLTS', `0-${TH.VMAX}V DC`] },
    { id: 'KRL', x: 775, y: 262, max: TH.RL_MAX, step: 5, initial: 200, label: [], name: 'Load RL' },
    { id: 'KVTH', x: 820, y: 690, max: TH.VMAX, label: ['SET VTH', `0-${TH.VMAX}V DC`] },
    { id: 'KRTH', x: 1180, y: 665, max: TH.RTH_MAX, step: 5, initial: 500, label: ['RTH'], readout: 'Ω' },
  ],
  supplies: [
    { id: 'S1', plus: 'outP', minus: 'outN', knobs: ['K1'], maxV: TH.VMAX, rint: 0.05 },
    { id: 'S2', plus: 'VTHp', minus: 'VTHn', knobs: ['KVTH'], maxV: TH.VMAX, rint: 0.05 },
  ],
  fuseA: 0.2,
  mains: { led: [520, 200], toggle: [520, 335] },
  voltageMeasurements: [
    { key: 'Vs', label: 'supply voltage Vs', pair: ['inP', 'inN'], when: powered },
    { key: 'Vs', label: 'supply voltage Vs', pair: ['outP', 'outN'], when: powered },
    { key: 'VL', label: 'load voltage VL (given network)', pair: ['A', 'B'], when: (q) => powered(q) && loadOn(q, 'A', 'B') },
    { key: 'VL', label: 'load voltage VL (given network)', pair: ['L1', 'L2'], when: (q) => powered(q) && loadOn(q, 'A', 'B') },
    {
      key: 'Vth',
      label: 'open-circuit voltage Vth across A-B',
      pair: ['A', 'B'],
      when: (q) => powered(q) && !q.bridged('A', 'B'),
    },
    { key: 'Vt', label: 'test voltage across A-B (source shorted)', pair: ['A', 'B'], when: testing },
    {
      key: 'Vt',
      label: 'test voltage across A-B (source shorted)',
      pair: ['outP', 'outN'],
      when: (q) => testing(q) && q.bridged('outP', 'A'),
    },
    { key: 'Veq', label: 'VTH source setting', pair: ['VTHp', 'VTHn'] },
    { key: 'VLe', label: 'load voltage on the equivalent circuit', pair: ['Aeq', 'Beq'], when: (q) => loadOn(q, 'Aeq', 'Beq') },
    { key: 'VLe', label: 'load voltage on the equivalent circuit', pair: ['L1', 'L2'], when: (q) => loadOn(q, 'Aeq', 'Beq') },
  ],
  currentMeasurements: [
    { key: 'IL', label: 'load current IL (given network)', pair: ['A', 'L1'], when: (q) => powered(q) && q.bridged('B', 'L2') },
    { key: 'IL', label: 'load current IL (given network)', pair: ['L2', 'B'], when: (q) => powered(q) && q.bridged('A', 'L1') },
    { key: 'IN', label: 'short-circuit current IN (A-B shorted by the meter)', pair: ['A', 'B'], when: powered },
    {
      key: 'It',
      label: 'test current into A-B (source shorted)',
      pair: ['outP', 'A'],
      when: (q) => testing(q) && q.bridged('outN', 'B'),
    },
    {
      key: 'It',
      label: 'test current into A-B (source shorted)',
      pair: ['B', 'outN'],
      when: (q) => testing(q) && q.bridged('outP', 'A'),
    },
    { key: 'ILe', label: "load current IL' (equivalent circuit)", pair: ['Aeq', 'L1'], when: (q) => q.bridged('Beq', 'L2') },
    { key: 'ILe', label: "load current IL' (equivalent circuit)", pair: ['L2', 'Beq'], when: (q) => q.bridged('Aeq', 'L1') },
  ],
  solution: [
    ['outP', 'inP'],
    ['outN', 'inN'],
    ['Ap', 'A'],
    ['An', 'L1'],
    ['L2', 'B'],
    ['Vp', 'A'],
    ['Vn', 'B'],
  ],
};

for (const list of [theveninKit.voltageMeasurements, theveninKit.currentMeasurements]) {
  for (const m of list) {
    const when = m.when;
    m.when = (q) => !circuitsJoined(q) && (when ? when(q) : true);
  }
}

export function theveninTheory(vs: number) {
  const vth = (vs * TH.R2) / (TH.R1 + TH.R2);
  const rth = TH.R3 + (TH.R1 * TH.R2) / (TH.R1 + TH.R2);
  return { vth, rth, inorton: vth / rth };
}
