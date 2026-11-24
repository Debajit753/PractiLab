import type { MeterRange, SocketDef, TextDef, TraceDef } from './types';

/** Pieces every trainer kit shares: meter sockets, the supply arrows, standard ranges. */

export const meterSockets = (): SocketDef[] => [
  { id: 'Vp', x: 250, y: 470, color: 'red', name: 'Voltmeter +' },
  { id: 'Vn', x: 410, y: 470, color: 'black', name: 'Voltmeter −' },
  { id: 'Ap', x: 790, y: 470, color: 'red', name: 'Ammeter +' },
  { id: 'An', x: 950, y: 470, color: 'black', name: 'Ammeter −' },
];

export const meterSocketTexts = (v = 'V', a = 'mA'): TextDef[] => [
  { x: 330, y: 478, text: v, size: 22, weight: 700 },
  { x: 870, y: 478, text: a, size: 22, weight: 700 },
];

export const mainsTexts = (x = 600): TextDef[] => [
  { x, y: 248, text: 'MAINS', size: 17, weight: 700 },
  { x, y: 285, text: 'OFF', size: 17, weight: 700 },
  { x, y: 410, text: 'ON', size: 17, weight: 700 },
];

/** Arrow tracks from a knob at (kx, ky) to + and − output sockets at x = sx. */
export function supplyArrows(kx: number, ky: number, sx: number, yPlus: number, yMinus: number): TraceDef[] {
  const bus = sx - 45;
  return [
    {
      points: [
        [kx + 44, ky],
        [bus, ky],
      ],
    },
    {
      points: [
        [bus, ky],
        [bus, yPlus],
        [sx - 22, yPlus],
      ],
      arrow: true,
    },
    {
      points: [
        [bus, ky],
        [bus, yMinus],
        [sx - 22, yMinus],
      ],
      arrow: true,
    },
  ];
}

export const range = (full: number, unit: MeterRange['unit'], majors: number, minorsPerMajor: number): MeterRange => ({
  full,
  unit,
  majors,
  minorsPerMajor,
  ohms: unit === 'V' ? 1e6 : unit === 'mA' ? 0.5 : 50,
});

export const fmtOhms = (r: number) => (r >= 1000 ? `${+(r / 1000).toFixed(2)}kΩ` : `${r}Ω`);
