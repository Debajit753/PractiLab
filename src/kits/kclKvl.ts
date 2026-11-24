import type { KitDef } from './types';

/**
 * "Verification of KCL & KVL Apparatus" trainer, laid out like the real kit.
 *
 * Electrically: INPUT + feeds two parallel branches.
 *  Branch A: R1 50 ohm, gap Y1-Y2, R2 100 ohm, gap Y3-Y4
 *  Branch B: R3 220 ohm, gap B1-B2, R4 330 ohm, gap B3-B4
 * Both branches join at the red socket above the (mA) symbol, and the black
 * socket below it returns to INPUT -. The dashed gaps are open until the
 * student bridges them with a cord or puts the milliammeter in.
 */
export const kclKvlKit: KitDef = {
  id: 'kcl-kvl',
  width: 1200,
  height: 900,
  title: ['VERIFICATION OF KCL & KVL APPARATUS', "KIRCHHOFF'S LAW"],
  sockets: [
    { id: 'Vp', x: 250, y: 470, color: 'red', name: 'Voltmeter +' },
    { id: 'Vn', x: 410, y: 470, color: 'black', name: 'Voltmeter −' },
    { id: 'Ap', x: 790, y: 470, color: 'red', name: 'Milliammeter +' },
    { id: 'An', x: 950, y: 470, color: 'black', name: 'Milliammeter −' },

    { id: 'outP', x: 290, y: 560, color: 'red', name: 'OUTPUT +' },
    { id: 'outN', x: 290, y: 780, color: 'black', name: 'OUTPUT −' },
    { id: 'inP', x: 390, y: 560, color: 'red', name: 'INPUT +' },
    { id: 'inN', x: 390, y: 780, color: 'black', name: 'INPUT −' },
    { id: 'J1', x: 490, y: 560, color: 'red', name: 'red junction (top of V symbol)' },
    { id: 'J2', x: 490, y: 780, color: 'black', name: 'black junction (bottom of V symbol)' },

    { id: 'Y1', x: 640, y: 560, color: 'yellow', name: 'yellow socket after R1' },
    { id: 'Y2', x: 720, y: 560, color: 'yellow', name: 'yellow socket before R2' },
    { id: 'Y3', x: 840, y: 560, color: 'yellow', name: 'yellow socket after R2' },
    { id: 'Y4', x: 920, y: 560, color: 'yellow', name: 'last yellow socket' },
    { id: 'B1', x: 640, y: 670, color: 'blue', name: 'blue socket after R3' },
    { id: 'B2', x: 720, y: 670, color: 'blue', name: 'blue socket before R4' },
    { id: 'B3', x: 840, y: 670, color: 'blue', name: 'blue socket after R4' },
    { id: 'B4', x: 920, y: 670, color: 'blue', name: 'last blue socket' },

    { id: 'Mp', x: 1040, y: 560, color: 'red', name: 'red socket (top of mA symbol)' },
    { id: 'Mn', x: 1040, y: 780, color: 'black', name: 'black socket (bottom of mA symbol)' },
  ],
  resistors: [
    { id: 'R1', a: 'J1', b: 'Y1', ohms: 50, from: [530, 560], to: [620, 560] },
    { id: 'R2', a: 'Y2', b: 'Y3', ohms: 100, from: [740, 560], to: [820, 560] },
    { id: 'R3', a: 'J1', b: 'B1', ohms: 220, from: [530, 670], to: [620, 670] },
    { id: 'R4', a: 'B2', b: 'B3', ohms: 330, from: [740, 670], to: [820, 670] },
  ],
  hardNets: [
    ['inP', 'J1'],
    ['inN', 'J2', 'Mn'],
    ['Y4', 'B4', 'Mp'],
  ],
  traces: [
    // supply arrows from the knob to the output sockets
    {
      points: [
        [195, 670],
        [235, 670],
      ],
    },
    {
      points: [
        [235, 670],
        [235, 560],
        [268, 560],
      ],
      arrow: true,
    },
    {
      points: [
        [235, 670],
        [235, 780],
        [268, 780],
      ],
      arrow: true,
    },
    // input to junctions
    {
      points: [
        [410, 560],
        [470, 560],
      ],
    },
    {
      points: [
        [410, 780],
        [470, 780],
      ],
    },
    {
      points: [
        [510, 560],
        [530, 560],
      ],
    },
    {
      points: [
        [530, 560],
        [530, 670],
      ],
    },
    // dashed gaps
    {
      points: [
        [660, 560],
        [700, 560],
      ],
      dashed: true,
    },
    {
      points: [
        [860, 560],
        [900, 560],
      ],
      dashed: true,
    },
    {
      points: [
        [660, 670],
        [700, 670],
      ],
      dashed: true,
    },
    {
      points: [
        [860, 670],
        [900, 670],
      ],
      dashed: true,
    },
    // join of the two branches to the mA symbol
    {
      points: [
        [940, 560],
        [1018, 560],
      ],
    },
    {
      points: [
        [970, 560],
        [970, 670],
        [940, 670],
      ],
    },
    // return line
    {
      points: [
        [510, 780],
        [1018, 780],
      ],
    },
    // symbol guide lines (not connections)
    {
      points: [
        [490, 582],
        [490, 642],
      ],
      dashed: true,
    },
    {
      points: [
        [490, 698],
        [490, 758],
      ],
      dashed: true,
    },
    {
      points: [
        [1040, 582],
        [1040, 642],
      ],
      dashed: true,
    },
    {
      points: [
        [1040, 698],
        [1040, 758],
      ],
      dashed: true,
    },
  ],
  texts: [
    { x: 268, y: 522, text: '+', size: 30, weight: 700 },
    { x: 372, y: 522, text: '+', size: 30, weight: 700 },
    { x: 268, y: 830, text: '−', size: 30, weight: 700 },
    { x: 372, y: 830, text: '−', size: 30, weight: 700 },
    { x: 330, y: 655, text: 'OUTPUT', size: 19, weight: 700 },
    { x: 330, y: 680, text: '0-5V DC', size: 19, weight: 700 },
    { x: 430, y: 675, text: 'INPUT', size: 19, weight: 700 },
    { x: 330, y: 478, text: 'V', size: 22, weight: 700 },
    { x: 870, y: 478, text: 'mA', size: 22, weight: 700 },
    { x: 466, y: 622, text: '+', size: 26, weight: 700 },
    { x: 466, y: 728, text: '−', size: 26, weight: 700 },
    { x: 1068, y: 622, text: '+', size: 26, weight: 700 },
    { x: 1068, y: 728, text: '−', size: 26, weight: 700 },
    { x: 575, y: 538, text: 'R1', size: 18, weight: 700 },
    { x: 575, y: 596, text: '50Ω', size: 18, weight: 700 },
    { x: 780, y: 538, text: 'R2', size: 18, weight: 700 },
    { x: 780, y: 596, text: '100Ω', size: 18, weight: 700 },
    { x: 575, y: 648, text: 'R3', size: 18, weight: 700 },
    { x: 575, y: 706, text: '220Ω', size: 18, weight: 700 },
    { x: 780, y: 648, text: 'R4', size: 18, weight: 700 },
    { x: 780, y: 706, text: '330Ω', size: 18, weight: 700 },
    { x: 600, y: 248, text: 'MAINS', size: 17, weight: 700 },
    { x: 600, y: 285, text: 'OFF', size: 17, weight: 700 },
    { x: 600, y: 410, text: 'ON', size: 17, weight: 700 },
  ],
  symbols: [
    { kind: 'V', x: 490, y: 670 },
    { kind: 'mA', x: 1040, y: 670 },
  ],
  meters: [
    {
      id: 'VM',
      kind: 'V',
      cx: 330,
      cy: 290,
      plus: 'Vp',
      minus: 'Vn',
      ranges: [{ full: 5, unit: 'V', majors: 5, minorsPerMajor: 10, ohms: 1e6 }],
    },
    {
      id: 'AM',
      kind: 'A',
      cx: 870,
      cy: 290,
      plus: 'Ap',
      minus: 'An',
      ranges: [{ full: 50, unit: 'mA', majors: 5, minorsPerMajor: 10, ohms: 0.1 }],
    },
  ],
  knobs: [{ id: 'K1', x: 150, y: 670, max: 5, label: ['SET', 'VOLTS'] }],
  supplies: [{ id: 'S1', plus: 'outP', minus: 'outN', knobs: ['K1'], maxV: 5, rint: 0.05 }],
  fuseA: 0.2,
  mains: { led: [600, 205], toggle: [600, 345] },
  voltageMeasurements: [
    { key: 'Vs', label: 'supply voltage Vs', pair: ['J1', 'J2'] },
    { key: 'Vs', label: 'supply voltage Vs', pair: ['outP', 'outN'] },
    { key: 'VR1', label: 'voltage across R1', pair: ['J1', 'Y1'] },
    { key: 'VR2', label: 'voltage across R2', pair: ['Y2', 'Y3'] },
    { key: 'VR3', label: 'voltage across R3', pair: ['J1', 'B1'] },
    { key: 'VR4', label: 'voltage across R4', pair: ['B2', 'B3'] },
  ],
  currentMeasurements: [
    { key: 'I', label: 'total current I', pair: ['Mp', 'Mn'] },
    { key: 'I', label: 'total current I', pair: ['outP', 'inP'] },
    { key: 'I', label: 'total current I', pair: ['inN', 'outN'] },
    { key: 'I1', label: 'branch A current I1', pair: ['Y1', 'Y2'] },
    { key: 'I1', label: 'branch A current I1', pair: ['Y3', 'Y4'] },
    { key: 'I2', label: 'branch B current I2', pair: ['B1', 'B2'] },
    { key: 'I2', label: 'branch B current I2', pair: ['B3', 'B4'] },
  ],
  solution: [
    ['outP', 'inP'],
    ['outN', 'inN'],
    ['Vp', 'J1'],
    ['Vn', 'J2'],
    ['Y1', 'Y2'],
    ['Y3', 'Y4'],
    ['B1', 'B2'],
    ['B3', 'B4'],
    ['Ap', 'Mp'],
    ['An', 'Mn'],
  ],
};
