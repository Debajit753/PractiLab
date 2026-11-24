import type { Part } from './model';

let k = 0;
const p = (kind: Part['kind'], a: string, b: string, label: string, extra: Partial<Part> = {}): Part => ({
  id: `ex${k++}`,
  kind,
  a,
  b,
  value: 0,
  label,
  ...extra,
});

export const EXAMPLES: { id: string; name: string; about: string; parts: () => Part[] }[] = [
  {
    id: 'led',
    name: 'LED with a series resistor',
    about: 'A 9 V battery lights a red LED through 470 Ω. The ammeter shows about 15 mA. Try removing the resistor.',
    parts: () => [
      p('battery', 'tp1', 'tn1', 'B1', { value: 9 }),
      p('resistor', 'tp4', 'a6', 'R1', { value: 470 }),
      p('led', 'c6', 'c9', 'LED1', { color: 'red' }),
      p('ammeter', 'e9', 'tn10', 'AM1'),
    ],
  },
  {
    id: 'divider',
    name: 'Voltage divider',
    about: 'Two equal resistors split 10 V in half. Change R2 and watch the voltmeter.',
    parts: () => [
      p('supply', 'tp1', 'tn1', 'PS1', { value: 10 }),
      p('resistor', 'tp4', 'a6', 'R1', { value: 1000 }),
      p('resistor', 'c6', 'tn8', 'R2', { value: 1000 }),
      p('voltmeter', 'e6', 'tn13', 'VM1'),
    ],
  },
  {
    id: 'kcl',
    name: 'KCL: current splits into two branches',
    about: 'AM1 reads the total current; AM2 and AM3 read each branch. AM1 = AM2 + AM3.',
    parts: () => [
      p('supply', 'tp1', 'tn1', 'PS1', { value: 5 }),
      p('ammeter', 'tp3', 'a6', 'AM1'),
      p('resistor', 'b6', 'b10', 'R1', { value: 220 }),
      p('resistor', 'c6', 'c15', 'R2', { value: 470 }),
      p('ammeter', 'e10', 'tn9', 'AM2'),
      p('ammeter', 'e15', 'tn14', 'AM3'),
    ],
  },
];
