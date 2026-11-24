import { fmtOhms, range } from './common';
import type { KitDef } from './types';

/**
 * Superposition theorem trainer (two DC sources with changeover switches, as on
 * the IIT Kharagpur Virtual Labs version).
 *
 *  S1 ── R1 ──[I1 gap]──┬──[I2 gap]── R2 ── S2
 *                       R3
 *                   [I3 gap]
 *  rail ────────────────┴──────────────────── rail
 *
 * S1 joins R1 to V1 (up) or to the rail, i.e. shorts V1 out (down). S2 likewise.
 */
export const SP = { R1: 1000, R2: 1500, R3: 2200, VMAX: 15 };

const Y = 560;
const RAIL = 810;

export const superpositionKit: KitDef = {
  id: 'superposition',
  width: 1400,
  height: 900,
  title: ['SUPERPOSITION THEOREM', 'TRAINER KIT'],
  sockets: [
    { id: 'Vp', x: 245, y: 470, color: 'red', name: 'Voltmeter +' },
    { id: 'Vn', x: 405, y: 470, color: 'black', name: 'Voltmeter −' },
    { id: 'Ap', x: 985, y: 470, color: 'red', name: 'Milliammeter +' },
    { id: 'An', x: 1145, y: 470, color: 'black', name: 'Milliammeter −' },

    { id: 'O1p', x: 215, y: Y, color: 'red', name: 'V1 OUTPUT +' },
    { id: 'O1n', x: 215, y: RAIL, color: 'black', name: 'V1 OUTPUT −' },
    { id: 'I1p', x: 300, y: Y, color: 'red', name: 'V1 INPUT +' },
    { id: 'I1n', x: 300, y: RAIL, color: 'black', name: 'V1 INPUT −' },

    { id: 'P1', x: 585, y: Y, color: 'yellow', name: 'I1 gap, left yellow socket' },
    { id: 'P2', x: 665, y: Y, color: 'yellow', name: 'I1 gap, right yellow socket' },
    { id: 'Q1', x: 745, y: Y, color: 'yellow', name: 'I2 gap, left yellow socket' },
    { id: 'Q2', x: 825, y: Y, color: 'yellow', name: 'I2 gap, right yellow socket' },
    { id: 'G1', x: 705, y: 690, color: 'blue', name: 'I3 gap, upper blue socket' },
    { id: 'G2', x: 705, y: 762, color: 'blue', name: 'I3 gap, lower blue socket' },

    { id: 'I2p', x: 1100, y: Y, color: 'red', name: 'V2 INPUT +' },
    { id: 'I2n', x: 1100, y: RAIL, color: 'black', name: 'V2 INPUT −' },
    { id: 'O2p', x: 1185, y: Y, color: 'red', name: 'V2 OUTPUT +' },
    { id: 'O2n', x: 1185, y: RAIL, color: 'black', name: 'V2 OUTPUT −' },
  ],
  resistors: [
    { id: 'R1', a: 'S1c', b: 'P1', ohms: SP.R1, from: [470, Y], to: [563, Y] },
    { id: 'R2', a: 'Q2', b: 'S2c', ohms: SP.R2, from: [847, Y], to: [940, Y] },
    { id: 'R3', a: 'P2', b: 'G1', ohms: SP.R3, from: [705, 582], to: [705, 668] },
  ],
  hardNets: [
    ['P2', 'Q1'],
    ['I1n', 'I2n', 'G2'],
  ],
  switches: [
    { id: 'S1', common: 'S1c', a: 'I1p', b: 'I1n', x: 395, y: 690, labelA: 'V1 IN', labelB: 'SHORT', initial: 'a' },
    { id: 'S2', common: 'S2c', a: 'I2p', b: 'I1n', x: 1010, y: 690, labelA: 'V2 IN', labelB: 'SHORT', initial: 'a' },
  ],
  traces: [
    // V1 supply arrows
    {
      points: [
        [154, 690],
        [172, 690],
      ],
    },
    {
      points: [
        [172, 690],
        [172, Y],
        [193, Y],
      ],
      arrow: true,
    },
    {
      points: [
        [172, 690],
        [172, RAIL],
        [193, RAIL],
      ],
      arrow: true,
    },
    // V2 supply arrows
    {
      points: [
        [1251, 690],
        [1228, 690],
      ],
    },
    {
      points: [
        [1228, 690],
        [1228, Y],
        [1207, Y],
      ],
      arrow: true,
    },
    {
      points: [
        [1228, 690],
        [1228, RAIL],
        [1207, RAIL],
      ],
      arrow: true,
    },
    // S1: throw A to V1 input +, throw B to rail, common to R1
    {
      points: [
        [320, Y],
        [395, Y],
        [395, 630],
      ],
    },
    {
      points: [
        [395, 750],
        [395, RAIL],
      ],
    },
    {
      points: [
        [418, 690],
        [445, 690],
        [445, Y],
        [470, Y],
      ],
    },
    // node and gaps
    {
      points: [
        [605, Y],
        [645, Y],
      ],
      dashed: true,
    },
    {
      points: [
        [685, Y],
        [723, Y],
      ],
    },
    {
      points: [
        [765, Y],
        [805, Y],
      ],
      dashed: true,
    },
    {
      points: [
        [705, Y],
        [705, 582],
      ],
    },
    {
      points: [
        [705, 712],
        [705, 740],
      ],
      dashed: true,
    },
    {
      points: [
        [705, 784],
        [705, RAIL],
      ],
    },
    // S2: common from R2, throw A to V2 input +, throw B to rail
    {
      points: [
        [940, Y],
        [962, Y],
        [962, 690],
        [987, 690],
      ],
    },
    {
      points: [
        [1010, 630],
        [1010, 600],
        [1040, 600],
        [1040, Y],
        [1078, Y],
      ],
    },
    {
      points: [
        [1010, 750],
        [1010, RAIL],
      ],
    },
    // rail
    {
      points: [
        [320, RAIL],
        [1078, RAIL],
      ],
    },
  ],
  dots: [
    [705, Y],
    [395, RAIL],
    [705, RAIL],
    [1010, RAIL],
  ],
  texts: [
    { x: 325, y: 478, text: 'V', size: 22, weight: 700 },
    { x: 1065, y: 478, text: 'mA', size: 22, weight: 700 },
    { x: 700, y: 248, text: 'MAINS', size: 17, weight: 700 },
    { x: 700, y: 285, text: 'OFF', size: 17, weight: 700 },
    { x: 700, y: 410, text: 'ON', size: 17, weight: 700 },
    { x: 258, y: 668, text: 'V1', size: 24, weight: 800 },
    { x: 258, y: 692, text: `0-${SP.VMAX}V`, size: 14, weight: 700 },
    { x: 1143, y: 668, text: 'V2', size: 24, weight: 800 },
    { x: 1143, y: 692, text: `0-${SP.VMAX}V`, size: 14, weight: 700 },
    { x: 215, y: 528, text: 'OUT +', size: 13, weight: 700 },
    { x: 300, y: 528, text: 'IN +', size: 13, weight: 700 },
    { x: 1100, y: 528, text: 'IN +', size: 13, weight: 700 },
    { x: 1185, y: 528, text: 'OUT +', size: 13, weight: 700 },
    { x: 516, y: 538, text: 'R1', size: 18, weight: 700 },
    { x: 516, y: 598, text: fmtOhms(SP.R1), size: 17, weight: 700 },
    { x: 893, y: 538, text: 'R2', size: 18, weight: 700 },
    { x: 893, y: 598, text: fmtOhms(SP.R2), size: 17, weight: 700 },
    { x: 730, y: 620, text: 'R3', size: 18, weight: 700, anchor: 'start' },
    { x: 730, y: 643, text: fmtOhms(SP.R3), size: 17, weight: 700, anchor: 'start' },
    { x: 625, y: 530, text: 'I1 →', size: 17, weight: 800, color: '#1a5fb4' },
    { x: 785, y: 530, text: '← I2', size: 17, weight: 800, color: '#1a5fb4' },
    { x: 730, y: 731, text: 'I3 ↓', size: 17, weight: 800, color: '#1a5fb4', anchor: 'start' },
  ],
  symbols: [],
  meters: [
    { id: 'VM', kind: 'V', cx: 330, cy: 290, plus: 'Vp', minus: 'Vn', ranges: [range(15, 'V', 3, 10), range(5, 'V', 5, 10)] },
    { id: 'AM', kind: 'A', cx: 1070, cy: 290, plus: 'Ap', minus: 'An', ranges: [range(10, 'mA', 5, 10), range(5, 'mA', 5, 10)] },
  ],
  knobs: [
    { id: 'K1', x: 110, y: 690, max: SP.VMAX, label: ['SET', 'V1'] },
    { id: 'K2', x: 1295, y: 690, max: SP.VMAX, label: ['SET', 'V2'] },
  ],
  supplies: [
    { id: 'S1', plus: 'O1p', minus: 'O1n', knobs: ['K1'], maxV: SP.VMAX, rint: 0.05 },
    { id: 'S2', plus: 'O2p', minus: 'O2n', knobs: ['K2'], maxV: SP.VMAX, rint: 0.05 },
  ],
  fuseA: 0.2,
  mains: { led: [700, 205], toggle: [700, 345] },
  voltageMeasurements: [
    { key: 'V1', label: 'source voltage V1', pair: ['I1p', 'I1n'] },
    { key: 'V1', label: 'source voltage V1', pair: ['O1p', 'O1n'] },
    { key: 'V2', label: 'source voltage V2', pair: ['I2p', 'I2n'] },
    { key: 'V2', label: 'source voltage V2', pair: ['O2p', 'O2n'] },
  ],
  currentMeasurements: [
    { key: 'I1', label: 'branch current I1 (through R1)', pair: ['P1', 'P2'] },
    { key: 'I2', label: 'branch current I2 (through R2)', pair: ['Q2', 'Q1'] },
    { key: 'I3', label: 'branch current I3 (through R3)', pair: ['G1', 'G2'] },
  ],
  solution: [
    ['O1p', 'I1p'],
    ['O1n', 'I1n'],
    ['O2p', 'I2p'],
    ['O2n', 'I2n'],
    ['Q1', 'Q2'],
    ['G1', 'G2'],
    ['Ap', 'P1'],
    ['An', 'P2'],
    ['Vp', 'I1p'],
    ['Vn', 'I1n'],
  ],
};

/** Branch currents (amps) with each source on (1) or replaced by a short (0). */
export function superpositionTheory(v1: number, v2: number, on1: number, on2: number) {
  const { R1, R2, R3 } = SP;
  const e1 = on1 ? v1 : 0;
  const e2 = on2 ? v2 : 0;
  const vn = (e1 / R1 + e2 / R2) / (1 / R1 + 1 / R2 + 1 / R3);
  return { I1: (e1 - vn) / R1, I2: (e2 - vn) / R2, I3: vn / R3 };
}
