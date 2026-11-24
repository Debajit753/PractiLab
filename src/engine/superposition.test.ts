import { describe, expect, it } from 'vitest';
import { analyze, defaultControls, type KitControls } from './circuit';
import { superpositionKit, superpositionTheory } from '../kits/superposition';
import type { Wire } from '../kits/types';

const wiresFrom = (pairs: [string, string][]): Wire[] => pairs.map(([a, b], i) => ({ id: `w${i}`, a, b, color: 'red' }));
const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(Math.max(Math.abs(b) * 0.005, 2e-6));
const ctl = (s1: 'a' | 'b', s2: 'a' | 'b'): KitControls => ({
  ...defaultControls(superpositionKit),
  mains: true,
  knobs: { K1: 10, K2: 5 },
  switches: { S1: s1, S2: s2 },
});
const base: [string, string][] = [
  ['O1p', 'I1p'],
  ['O1n', 'I1n'],
  ['O2p', 'I2p'],
  ['O2n', 'I2n'],
];
const withMeterIn = (gap: 'P' | 'Q' | 'G'): [string, string][] => {
  const links: [string, string][] = [
    ['P1', 'P2'],
    ['Q1', 'Q2'],
    ['G1', 'G2'],
  ];
  const meter: Record<string, [string, string][]> = {
    P: [
      ['Ap', 'P1'],
      ['An', 'P2'],
    ],
    Q: [
      ['Ap', 'Q2'],
      ['An', 'Q1'],
    ],
    G: [
      ['Ap', 'G1'],
      ['An', 'G2'],
    ],
  };
  return [...base, ...links.filter(([a]) => a[0] !== gap), ...meter[gap]];
};

describe('Superposition kit', () => {
  const cases: [string, 'a' | 'b', 'a' | 'b', number, number][] = [
    ['both sources', 'a', 'a', 1, 1],
    ['V1 alone', 'a', 'b', 1, 0],
    ['V2 alone', 'b', 'a', 0, 1],
  ];
  for (const [name, s1, s2, on1, on2] of cases) {
    it(`measures all three branch currents with ${name}`, () => {
      const th = superpositionTheory(10, 5, on1, on2);
      for (const [gap, key] of [
        ['P', 'I1'],
        ['Q', 'I2'],
        ['G', 'I3'],
      ] as const) {
        const a = analyze(superpositionKit, wiresFrom(withMeterIn(gap)), ctl(s1, s2));
        expect(a.readings.AM.measurement?.key).toBe(key);
        close(a.readings.AM.si, th[key]);
      }
    });
  }

  it('obeys superposition in every branch', () => {
    const both = superpositionTheory(10, 5, 1, 1);
    const a = superpositionTheory(10, 5, 1, 0);
    const b = superpositionTheory(10, 5, 0, 1);
    for (const k of ['I1', 'I2', 'I3'] as const) close(both[k], a[k] + b[k]);
  });

  it('does not short the supply when a source is switched out', () => {
    const a = analyze(superpositionKit, wiresFrom(withMeterIn('G')), ctl('b', 'b'));
    expect(a.overCurrent).toBe(false);
    expect(Math.abs(a.readings.AM.si)).toBeLessThan(1e-9);
  });
});
