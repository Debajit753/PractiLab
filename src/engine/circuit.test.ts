import { describe, expect, it } from 'vitest';
import { analyze, defaultControls, type KitControls } from './circuit';
import { kclKvlKit } from '../kits/kclKvl';
import type { Wire } from '../kits/types';

const wiresFrom = (pairs: [string, string][]): Wire[] => pairs.map(([a, b], i) => ({ id: `w${i}`, a, b, color: 'red' }));

const on: KitControls = { ...defaultControls(kclKvlKit), mains: true, knobs: { K1: 5 } };
const within = (a: number, b: number, pct: number) => expect(Math.abs(a - b) / Math.abs(b)).toBeLessThan(pct / 100);

describe('KCL and KVL kit', () => {
  it('reads Vs and total current with the solution wiring', () => {
    const a = analyze(kclKvlKit, wiresFrom(kclKvlKit.solution), on);
    expect(a.readings.VM.measurement?.key).toBe('Vs');
    expect(a.readings.AM.measurement?.key).toBe('I');
    within(a.readings.VM.display, 5, 0.5);
    within(a.readings.AM.display, 1000 * (5 / 150 + 5 / 550), 0.5);
    expect(a.overCurrent).toBe(false);
  });

  it('measures I1 and I2 when the meter is moved into each branch (KCL)', () => {
    const base = kclKvlKit.solution.filter(
      ([x, y]) => !(x === 'Ap' || x === 'An' || (x === 'Y1' && y === 'Y2') || (x === 'B1' && y === 'B2')),
    );
    // Meter in branch A, branch B linked, mA symbol linked.
    const inA = analyze(kclKvlKit, wiresFrom([...base, ['B1', 'B2'], ['Mp', 'Mn'], ['Ap', 'Y1'], ['An', 'Y2']]), on);
    expect(inA.readings.AM.measurement?.key).toBe('I1');
    within(inA.readings.AM.display, 1000 * (5 / 150), 0.5);

    const inB = analyze(kclKvlKit, wiresFrom([...base, ['Y1', 'Y2'], ['Mp', 'Mn'], ['Ap', 'B1'], ['An', 'B2']]), on);
    expect(inB.readings.AM.measurement?.key).toBe('I2');
    within(inB.readings.AM.display, 1000 * (5 / 550), 0.5);
  });

  it('measures each resistor voltage and they add up around each loop (KVL)', () => {
    const base = kclKvlKit.solution.filter(([x]) => x !== 'Vp' && x !== 'Vn');
    const read = (p: string, n: string) => analyze(kclKvlKit, wiresFrom([...base, ['Vp', p], ['Vn', n]]), on).readings.VM;
    const r1 = read('J1', 'Y1');
    const r2 = read('Y2', 'Y3');
    const r3 = read('J1', 'B1');
    const r4 = read('B2', 'B3');
    expect([r1, r2, r3, r4].map((r) => r.measurement?.key)).toEqual(['VR1', 'VR2', 'VR3', 'VR4']);
    within(r1.display, 5 / 3, 0.5);
    within(r2.display, 10 / 3, 0.5);
    within(r3.display, 2, 0.5);
    within(r4.display, 3, 0.5);
    within(r1.display + r2.display, 5, 0.5);
    within(r3.display + r4.display, 5, 0.5);
  });

  it('flags a reversed meter', () => {
    const wires = kclKvlKit.solution.map(([a, b]) => (a === 'Vp' ? ['Vp', 'J2'] : a === 'Vn' ? ['Vn', 'J1'] : [a, b])) as [
      string,
      string,
    ][];
    const a = analyze(kclKvlKit, wiresFrom(wires), on);
    expect(a.readings.VM.reversed).toBe(true);
    expect(a.readings.VM.display).toBeLessThan(0);
  });

  it('reads zero when a branch gap is left open', () => {
    const wires = kclKvlKit.solution.filter(([x]) => x !== 'Y1' && x !== 'B1');
    const a = analyze(kclKvlKit, wiresFrom(wires), on);
    expect(Math.abs(a.readings.AM.display)).toBeLessThan(0.01);
  });

  it('detects a short across the supply (fuse)', () => {
    const a = analyze(
      kclKvlKit,
      wiresFrom([
        ['Ap', 'outP'],
        ['An', 'outN'],
      ]),
      on,
    );
    expect(a.overCurrent).toBe(true);
  });

  it('reads nothing with mains off', () => {
    const a = analyze(kclKvlKit, wiresFrom(kclKvlKit.solution), { ...on, mains: false });
    expect(Math.abs(a.readings.VM.display)).toBeLessThan(1e-6);
  });
});
