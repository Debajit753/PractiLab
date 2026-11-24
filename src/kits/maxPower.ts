import { fmtOhms, mainsTexts, meterSocketTexts, meterSockets, range, supplyArrows } from './common';
import type { KitDef, QueryContext } from './types';

/**
 * Maximum power transfer trainer: a source with internal resistance Rs feeding
 * a variable load RL on a decade box.
 *
 *  INPUT + ── Rs ── A ──[ load RL ]── B ── INPUT −
 */
export const MP = { RS: 1000, VMAX: 12 };

const loadOn = (q: QueryContext) =>
  (q.bridged('A', 'L1') && q.bridged('B', 'L2')) || (q.bridged('A', 'L2') && q.bridged('B', 'L1'));

export const maxPowerKit: KitDef = {
  id: 'max-power',
  width: 1200,
  height: 900,
  title: ['MAXIMUM POWER TRANSFER THEOREM', 'TRAINER KIT'],
  sockets: [
    ...meterSockets(),
    { id: 'outP', x: 250, y: 560, color: 'red', name: 'OUTPUT +' },
    { id: 'outN', x: 250, y: 780, color: 'black', name: 'OUTPUT −' },
    { id: 'inP', x: 360, y: 560, color: 'red', name: 'INPUT +' },
    { id: 'inN', x: 360, y: 780, color: 'black', name: 'INPUT −' },
    { id: 'A', x: 720, y: 560, color: 'red', name: 'terminal A' },
    { id: 'B', x: 720, y: 780, color: 'black', name: 'terminal B' },
    { id: 'L1', x: 860, y: 815, color: 'red', name: 'load box red socket' },
    { id: 'L2', x: 1070, y: 815, color: 'black', name: 'load box black socket' },
  ],
  resistors: [{ id: 'RS', a: 'inP', b: 'A', ohms: MP.RS, from: [430, 560], to: [640, 560] }],
  hardNets: [['inN', 'B']],
  traces: [
    ...supplyArrows(130, 660, 250, 560, 780),
    {
      points: [
        [380, 560],
        [430, 560],
      ],
    },
    {
      points: [
        [640, 560],
        [698, 560],
      ],
    },
    {
      points: [
        [380, 780],
        [698, 780],
      ],
    },
    // dashed outline of the "practical source"
    {
      points: [
        [318, 505],
        [665, 505],
        [665, 840],
        [318, 840],
        [318, 505],
      ],
      dashed: true,
    },
  ],
  texts: [
    ...meterSocketTexts('V', 'mA'),
    ...mainsTexts(),
    { x: 228, y: 522, text: '+', size: 30, weight: 700 },
    { x: 228, y: 832, text: '−', size: 30, weight: 700 },
    { x: 300, y: 655, text: 'OUTPUT', size: 17, weight: 700 },
    { x: 300, y: 678, text: `0-${MP.VMAX}V DC`, size: 17, weight: 700 },
    { x: 360, y: 530, text: 'INPUT', size: 14, weight: 700 },
    { x: 535, y: 538, text: 'Rs (source resistance)', size: 17, weight: 700 },
    { x: 535, y: 600, text: fmtOhms(MP.RS), size: 18, weight: 700 },
    { x: 490, y: 690, text: 'PRACTICAL SOURCE', size: 16, weight: 800, color: '#6b6b6b' },
    { x: 490, y: 712, text: '(supply + internal resistance)', size: 13, color: '#6b6b6b' },
    { x: 720, y: 524, text: 'A', size: 24, weight: 800 },
    { x: 720, y: 836, text: 'B', size: 24, weight: 800 },
  ],
  symbols: [],
  meters: [
    { id: 'VM', kind: 'V', cx: 330, cy: 290, plus: 'Vp', minus: 'Vn', ranges: [range(15, 'V', 3, 10), range(5, 'V', 5, 10)] },
    { id: 'AM', kind: 'A', cx: 870, cy: 290, plus: 'Ap', minus: 'An', ranges: [range(20, 'mA', 4, 10), range(10, 'mA', 5, 10)] },
  ],
  knobs: [{ id: 'K1', x: 130, y: 660, max: MP.VMAX, label: ['SET', 'VOLTS'] }],
  supplies: [{ id: 'S1', plus: 'outP', minus: 'outN', knobs: ['K1'], maxV: MP.VMAX, rint: 0.05 }],
  decades: [
    { id: 'RL', a: 'L1', b: 'L2', x: 795, y: 560, dials: [1000, 100, 10, 1], title: 'LOAD RL (DECADE BOX)', initial: 100 },
  ],
  fuseA: 0.2,
  mains: { led: [600, 205], toggle: [600, 345] },
  voltageMeasurements: [
    { key: 'Vs', label: 'source voltage Vs', pair: ['inP', 'inN'] },
    { key: 'Vs', label: 'source voltage Vs', pair: ['outP', 'outN'] },
    { key: 'VL', label: 'load voltage VL', pair: ['A', 'B'], when: loadOn },
    { key: 'VL', label: 'load voltage VL', pair: ['L1', 'L2'], when: loadOn },
  ],
  currentMeasurements: [
    { key: 'IL', label: 'load current IL', pair: ['A', 'L1'], when: (q) => q.bridged('B', 'L2') },
    { key: 'IL', label: 'load current IL', pair: ['L2', 'B'], when: (q) => q.bridged('A', 'L1') },
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

/** Load current (A), load voltage (V) and load power (W). */
export function maxPowerTheory(vs: number, rl: number) {
  const il = vs / (MP.RS + rl);
  return { il, vl: il * rl, p: il * il * rl };
}
