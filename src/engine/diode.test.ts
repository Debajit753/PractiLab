import { describe, expect, it } from 'vitest';
import { analyze, defaultControls, type KitControls } from './circuit';
import { DIODE_MODELS, diodeKit, diodePoint, diodeReverseWiring } from '../kits/diode';
import type { Wire } from '../kits/types';

const wiresFrom = (pairs: [string, string][]): Wire[] => pairs.map(([a, b], i) => ({ id: `w${i}`, a, b, color: 'red' }));
const ctl = (kf: number, kr = 0): KitControls => ({ ...defaultControls(diodeKit), mains: true, knobs: { KF: kf, KR: kr } });

describe('PN junction diode kit (college layout)', () => {
  it('forward bias: silicon conducts with about 0.6 to 0.75 V across it', () => {
    const a = analyze(diodeKit, wiresFrom(diodeKit.solution), ctl(2));
    expect(a.readings.VM.measurement?.key).toBe('Vf');
    expect(a.readings.AM.measurement?.key).toBe('If');
    expect(a.readings.VM.si).toBeGreaterThan(0.6);
    expect(a.readings.VM.si).toBeLessThan(0.75);
    const p = diodePoint(DIODE_MODELS.si, 2);
    expect(Math.abs(a.readings.AM.si - p.id) / p.id).toBeLessThan(0.01);
  });

  it('forward current at full 3 V stays near the 10 mA range', () => {
    const a = analyze(diodeKit, wiresFrom(diodeKit.solution), ctl(3));
    expect(a.readings.AM.si).toBeGreaterThan(8e-3);
    expect(a.readings.AM.si).toBeLessThan(11e-3);
  });

  it('no forward current below the knee', () => {
    const a = analyze(diodeKit, wiresFrom(diodeKit.solution), ctl(0.3));
    expect(a.readings.AM.si).toBeLessThan(1e-5);
  });

  it('reverse bias: under a microamp flows at 30 V', () => {
    const a = analyze(diodeKit, wiresFrom(diodeReverseWiring), ctl(0, 30));
    expect(a.readings.VM.measurement?.key).toBe('Vr');
    expect(a.readings.AM.measurement?.key).toBe('Ir');
    expect(Math.abs(a.readings.VM.si - 30)).toBeLessThan(0.05);
    expect(a.readings.AM.si).toBeGreaterThan(0);
    expect(a.readings.AM.si).toBeLessThan(1e-6);
  });

  it('wiring the forward diode the wrong way blocks the current', () => {
    const w: [string, string][] = [
      ['FP1', 'Ap'],
      ['An', 'FK'],
      ['FA', 'FN1'],
    ];
    const a = analyze(diodeKit, wiresFrom(w), ctl(3));
    expect(Math.abs(a.readings.AM.si)).toBeLessThan(1e-6);
  });
});
