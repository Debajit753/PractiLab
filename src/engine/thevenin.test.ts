import { describe, expect, it } from 'vitest';
import { analyze, defaultControls, type KitControls } from './circuit';
import { theveninKit, theveninTheory } from '../kits/thevenin';
import type { Wire } from '../kits/types';

const wiresFrom = (pairs: [string, string][]): Wire[] => pairs.map(([a, b], i) => ({ id: `w${i}`, a, b, color: 'red' }));
const within = (a: number, b: number, pct: number) => expect(Math.abs(a - b) / Math.abs(b)).toBeLessThan(pct / 100);
const ctl = (v: number, rl = 1000, extra: Record<string, number> = {}): KitControls => {
  const d = defaultControls(theveninKit);
  return { ...d, mains: true, knobs: { ...d.knobs, K1: v, KRL: rl, ...extra } };
};
const feed: [string, string][] = [
  ['outP', 'inP'],
  ['outN', 'inN'],
];

describe("Thevenin's trainer (college layout)", () => {
  const th = theveninTheory(10);

  it('starts with digital meters and RL at 200 Ω', () => {
    expect(theveninKit.defaultDigital).toBe(true);
    expect(defaultControls(theveninKit).knobs.KRL).toBe(200);
  });

  it('reproduces the college lab record: Vth 1.05 V, Rth about 215 Ω, RL for IL = 2.5 to 4.5 mA', () => {
    const t = theveninTheory(5.162);
    expect(Math.abs(t.vth - 1.05)).toBeLessThan(0.005);
    expect(Math.abs(t.rth - 215)).toBeLessThan(1);
    // RL that gives each IL in the record (record: 205, 138, 85, 47.5, 18.3 Ω)
    const record = [
      [2.5, 205],
      [3, 138],
      [3.5, 85],
      [4, 47.5],
      [4.5, 18.3],
    ];
    for (const [il, rl] of record) {
      const sim = t.vth / (il / 1000) - t.rth;
      expect(Math.abs(sim - rl)).toBeLessThan(5);
      // and the kit itself gives that IL with that RL
      const a = analyze(theveninKit, wiresFrom(theveninKit.solution), ctl(5.162, sim));
      expect(Math.abs(a.readings.AM.si * 1000 - il)).toBeLessThan(0.02);
    }
  });

  it('measures the load current and load voltage with the solution wiring', () => {
    const a = analyze(theveninKit, wiresFrom(theveninKit.solution), ctl(10));
    expect(a.readings.AM.measurement?.key).toBe('IL');
    expect(a.readings.VM.measurement?.key).toBe('VL');
    within(a.readings.AM.si, th.vth / (th.rth + 1000), 0.5);
    // RL found from the meters: VL / IL
    within(a.readings.VM.si / a.readings.AM.si, 1000, 0.5);
  });

  it('measures Vth with the load removed', () => {
    const a = analyze(theveninKit, wiresFrom([...feed, ['Vp', 'A'], ['Vn', 'B']]), ctl(10));
    expect(a.readings.VM.measurement?.key).toBe('Vth');
    within(a.readings.VM.si, th.vth, 0.5);
  });

  it('measures the short-circuit (Norton) current with the meter across A-B', () => {
    const a = analyze(theveninKit, wiresFrom([...feed, ['Ap', 'A'], ['An', 'B']]), ctl(10));
    expect(a.readings.AM.measurement?.key).toBe('IN');
    within(a.readings.AM.si, th.inorton, 0.5);
  });

  it('finds Rth by shorting the input and driving A-B from the supply', () => {
    const w: [string, string][] = [
      ['inP', 'inN'],
      ['outP', 'Ap'],
      ['An', 'A'],
      ['outN', 'B'],
      ['Vp', 'A'],
      ['Vn', 'B'],
    ];
    const a = analyze(theveninKit, wiresFrom(w), ctl(5));
    expect(a.readings.AM.measurement?.key).toBe('It');
    expect(a.readings.VM.measurement?.key).toBe('Vt');
    within(a.readings.VM.si / a.readings.AM.si, th.rth, 0.5);
  });

  it('the equivalent circuit (VTH, RTH) draws the same load current as the network', () => {
    const net = analyze(theveninKit, wiresFrom(theveninKit.solution), ctl(10, 1500));
    const eqWires: [string, string][] = [
      ['Aeq', 'Ap'],
      ['An', 'L1'],
      ['L2', 'Beq'],
      ['Vp', 'VTHp'],
      ['Vn', 'VTHn'],
    ];
    const eq = analyze(theveninKit, wiresFrom(eqWires), ctl(0, 1500, { KVTH: th.vth, KRTH: th.rth }));
    expect(eq.readings.AM.measurement?.key).toBe('ILe');
    expect(eq.readings.VM.measurement?.key).toBe('Veq');
    within(eq.readings.VM.si, th.vth, 0.5);
    within(eq.readings.AM.si, net.readings.AM.si, 0.5);
  });

  it('blows the fuse if the load pot at its minimum is put straight across the supply', () => {
    const a = analyze(
      theveninKit,
      wiresFrom([
        ['outP', 'L1'],
        ['outN', 'L2'],
      ]),
      ctl(12, 0),
    );
    expect(a.overCurrent).toBe(true);
  });
});
