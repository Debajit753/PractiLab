import { mainsTexts, range } from './common';
import type { DiodeModel, KitDef, MeterRange } from './types';

/**
 * PN junction diode characteristics apparatus, laid out like the college kit:
 *  - 0-3 V DC output (forward bias), current-limited inside the kit
 *  - 0-30 V DC output (reverse bias)
 *  - a FORWARD BIAS diode and a REVERSE BIAS diode, each on its own sockets
 *  - voltmeter with 3 V / 30 V ranges, current meter with 10 mA / 100 µA ranges
 */
export const DI = { FWD_MAX: 3, REV_MAX: 30, FWD_R: 220, REV_R: 1000 };

export const DIODE_MODELS: Record<string, DiodeModel> = {
  si: { label: 'Si (1N4007)', is: 1e-9, n: 1.7, rleak: 50e6 },
};

const vRange = (full: number, majors: number, minors: number): MeterRange => ({
  ...range(full, 'V', majors, minors),
  ohms: 10e6,
});

export const diodeKit: KitDef = {
  id: 'pn-diode',
  width: 1200,
  height: 900,
  face: '#f4f4f1',
  title: ['PN JUNCTION DIODE /', 'SEMICONDUCTOR DIODE CHARACTERISTICS APPARATUS'],
  sockets: [
    { id: 'Vp', x: 250, y: 470, color: 'red', name: 'Voltmeter +' },
    { id: 'Vn', x: 410, y: 470, color: 'black', name: 'Voltmeter −' },
    { id: 'Ap', x: 790, y: 470, color: 'red', name: 'Current meter +' },
    { id: 'An', x: 950, y: 470, color: 'black', name: 'Current meter −' },

    { id: 'FP1', x: 280, y: 580, color: 'red', name: '0-3V DC OUTPUT +' },
    { id: 'FP2', x: 355, y: 580, color: 'red', name: '0-3V DC OUTPUT + (second socket)' },
    { id: 'FN1', x: 280, y: 790, color: 'black', name: '0-3V DC OUTPUT −' },
    { id: 'FN2', x: 355, y: 790, color: 'black', name: '0-3V DC OUTPUT − (second socket)' },

    { id: 'FA', x: 480, y: 600, color: 'red', name: 'FORWARD BIAS diode A (anode)' },
    { id: 'FK', x: 700, y: 600, color: 'black', name: 'FORWARD BIAS diode K (cathode)' },
    { id: 'RK', x: 480, y: 770, color: 'black', name: 'REVERSE BIAS diode K (cathode)' },
    { id: 'RA', x: 700, y: 770, color: 'red', name: 'REVERSE BIAS diode A (anode)' },

    { id: 'RP1', x: 845, y: 580, color: 'red', name: '0-30V DC OUTPUT +' },
    { id: 'RP2', x: 920, y: 580, color: 'red', name: '0-30V DC OUTPUT + (second socket)' },
    { id: 'RN1', x: 845, y: 790, color: 'black', name: '0-30V DC OUTPUT −' },
    { id: 'RN2', x: 920, y: 790, color: 'black', name: '0-30V DC OUTPUT − (second socket)' },
  ],
  resistors: [],
  diodes: [
    { id: 'DF', anode: 'FA', cathode: 'FK', from: [502, 600], to: [678, 600], models: DIODE_MODELS },
    { id: 'DR', anode: 'RA', cathode: 'RK', from: [678, 770], to: [502, 770], models: DIODE_MODELS },
  ],
  hardNets: [
    ['FP1', 'FP2'],
    ['FN1', 'FN2'],
    ['RP1', 'RP2'],
    ['RN1', 'RN2'],
  ],
  traces: [
    // 0-3 V output: knob to the paired sockets
    {
      points: [
        [302, 580],
        [333, 580],
      ],
    },
    {
      points: [
        [302, 790],
        [333, 790],
      ],
    },
    {
      points: [
        [184, 685],
        [230, 685],
      ],
    },
    {
      points: [
        [230, 685],
        [230, 580],
        [258, 580],
      ],
      arrow: true,
    },
    {
      points: [
        [230, 685],
        [230, 790],
        [258, 790],
      ],
      arrow: true,
    },
    // 0-30 V output
    {
      points: [
        [867, 580],
        [898, 580],
      ],
    },
    {
      points: [
        [867, 790],
        [898, 790],
      ],
    },
    {
      points: [
        [1016, 685],
        [970, 685],
      ],
    },
    {
      points: [
        [970, 685],
        [970, 580],
        [942, 580],
      ],
      arrow: true,
    },
    {
      points: [
        [970, 685],
        [970, 790],
        [942, 790],
      ],
      arrow: true,
    },
  ],
  texts: [
    { x: 330, y: 478, text: 'V', size: 22, weight: 700 },
    { x: 870, y: 478, text: 'mA / µA', size: 20, weight: 700 },
    ...mainsTexts(),
    { x: 318, y: 545, text: '+', size: 28, weight: 700 },
    { x: 318, y: 842, text: '−', size: 28, weight: 700 },
    { x: 318, y: 675, text: 'DC', size: 16, weight: 700 },
    { x: 318, y: 697, text: 'OUTPUT', size: 16, weight: 700 },
    { x: 882, y: 545, text: '+', size: 28, weight: 700 },
    { x: 882, y: 842, text: '−', size: 28, weight: 700 },
    { x: 882, y: 675, text: 'DC', size: 16, weight: 700 },
    { x: 882, y: 697, text: 'OUTPUT', size: 16, weight: 700 },
    { x: 590, y: 560, text: 'FORWARD BIAS', size: 17, weight: 800 },
    { x: 480, y: 645, text: 'A', size: 18, weight: 800 },
    { x: 700, y: 645, text: 'K', size: 18, weight: 800 },
    { x: 590, y: 730, text: 'REVERSE BIAS', size: 17, weight: 800 },
    { x: 480, y: 815, text: 'K', size: 18, weight: 800 },
    { x: 700, y: 815, text: 'A', size: 18, weight: 800 },
  ],
  symbols: [],
  meters: [
    { id: 'VM', kind: 'V', cx: 330, cy: 290, plus: 'Vp', minus: 'Vn', ranges: [vRange(30, 6, 5), vRange(3, 6, 5)] },
    { id: 'AM', kind: 'A', cx: 870, cy: 290, plus: 'Ap', minus: 'An', ranges: [range(10, 'mA', 5, 10), range(100, 'µA', 5, 10)] },
  ],
  knobs: [
    { id: 'KF', x: 140, y: 685, max: DI.FWD_MAX, label: ['SET VOLTS', '0-3V DC'] },
    { id: 'KR', x: 1060, y: 685, max: DI.REV_MAX, label: ['SET VOLTS', '0-30V DC'] },
  ],
  supplies: [
    { id: 'SF', plus: 'FP1', minus: 'FN1', knobs: ['KF'], maxV: DI.FWD_MAX, rint: DI.FWD_R },
    { id: 'SR', plus: 'RP1', minus: 'RN1', knobs: ['KR'], maxV: DI.REV_MAX, rint: DI.REV_R },
  ],
  fuseA: 0.2,
  mains: { led: [600, 205], toggle: [600, 345] },
  voltageMeasurements: [
    { key: 'Vf', label: 'forward voltage across the diode', pair: ['FA', 'FK'] },
    { key: 'Vr', label: 'reverse voltage across the diode', pair: ['RK', 'RA'] },
    {
      key: 'Vr',
      label: 'reverse voltage (0-30V output)',
      pair: ['RP1', 'RN1'],
      when: (q) => q.bridged('RP1', 'RK') && q.bridged('RA', 'RN1'),
    },
  ],
  currentMeasurements: [
    { key: 'If', label: 'forward diode current', pair: ['FP1', 'FA'] },
    { key: 'If', label: 'forward diode current', pair: ['FK', 'FN1'] },
    { key: 'Ir', label: 'reverse diode current', pair: ['RA', 'RN1'] },
    { key: 'Ir', label: 'reverse diode current', pair: ['RP1', 'RK'] },
  ],
  solution: [
    ['FP1', 'Ap'],
    ['An', 'FA'],
    ['FK', 'FN1'],
    ['Vp', 'FA'],
    ['Vn', 'FK'],
  ],
};

/** Reverse-bias wiring: µA meter in series, voltmeter across the 0-30 V output. */
export const diodeReverseWiring: [string, string][] = [
  ['RP1', 'RK'],
  ['RA', 'Ap'],
  ['An', 'RN1'],
  ['Vp', 'RP2'],
  ['Vn', 'RN2'],
];

/** Forward operating point with the 0-3 V output set to vs (bisection on the diode equation). */
export function diodePoint(model: DiodeModel, vs: number, r = DI.FWD_R) {
  const vt = 0.025852 * model.n;
  let lo = 0;
  let hi = Math.max(vs, 0);
  for (let i = 0; i < 80; i++) {
    const vd = (lo + hi) / 2;
    const id = model.is * (Math.exp(vd / vt) - 1) + vd / model.rleak;
    if (id > (vs - vd) / r) hi = vd;
    else lo = vd;
  }
  const vd = (lo + hi) / 2;
  return { vd, id: (vs - vd) / r };
}
