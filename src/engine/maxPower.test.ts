import { describe, expect, it } from 'vitest';
import { analyze, defaultControls } from './circuit';
import { MP, maxPowerKit, maxPowerTheory } from '../kits/maxPower';
import type { Wire } from '../kits/types';

const wiresFrom = (pairs: [string, string][]): Wire[] => pairs.map(([a, b], i) => ({ id: `w${i}`, a, b, color: 'red' }));
const within = (a: number, b: number, pct: number) => expect(Math.abs(a - b) / Math.abs(b)).toBeLessThan(pct / 100);

describe('Maximum power transfer kit', () => {
  const power = (rl: number) => {
    const a = analyze(maxPowerKit, wiresFrom(maxPowerKit.solution), {
      ...defaultControls(maxPowerKit),
      mains: true,
      knobs: { K1: 10 },
      decades: { RL: rl },
    });
    expect(a.readings.VM.measurement?.key).toBe('VL');
    expect(a.readings.AM.measurement?.key).toBe('IL');
    return a.readings.VM.si * a.readings.AM.si;
  };

  it('matches the load power formula', () => {
    for (const rl of [100, 500, 1000, 2200]) within(power(rl), maxPowerTheory(10, rl).p, 0.5);
  });

  it('delivers the most power when RL = Rs', () => {
    const sweep = [200, 500, 800, 1000, 1200, 1500, 3000].map((rl) => ({ rl, p: power(rl) }));
    const best = sweep.reduce((a, b) => (b.p > a.p ? b : a));
    expect(best.rl).toBe(MP.RS);
    within(best.p, (10 * 10) / (4 * MP.RS), 0.5);
  });
});
