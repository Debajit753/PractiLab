import { describe, expect, it } from 'vitest';
import { analyzeBoard, HOLES, HOLE_BY_ID, measureResistance, resistorBands, schematicOf, type Part } from './model';

let n = 0;
const part = (kind: Part['kind'], a: string, b: string, extra: Partial<Part> = {}): Part => ({
  id: `p${n++}`,
  kind,
  a,
  b,
  value: kind === 'resistor' ? 1000 : kind === 'battery' ? 9 : kind === 'supply' ? 5 : kind === 'pot' ? 10000 : 0,
  label: `${kind}${n}`,
  ...extra,
});
const close = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('breadboard geometry', () => {
  it('connects a-e in a column but not across the centre channel', () => {
    expect(HOLE_BY_ID.get('a3')!.strip).toBe(HOLE_BY_ID.get('e3')!.strip);
    expect(HOLE_BY_ID.get('e3')!.strip).not.toBe(HOLE_BY_ID.get('f3')!.strip);
    expect(HOLE_BY_ID.get('a3')!.strip).not.toBe(HOLE_BY_ID.get('a4')!.strip);
  });
  it('makes each rail one long strip, with the usual gaps', () => {
    expect(HOLE_BY_ID.get('tp0')!.strip).toBe(HOLE_BY_ID.get('tp28')!.strip);
    expect(HOLE_BY_ID.get('tp5')).toBeUndefined();
    expect(HOLES.length).toBe(10 * 30 + 4 * 25);
  });
});

describe('sandbox circuits', () => {
  it('voltage divider: 10 V across 1 kΩ + 1 kΩ gives 5 V at the middle', () => {
    const parts = [
      part('supply', 'tp0', 'tn0', { value: 10 }),
      part('resistor', 'a2', 'tp2'),
      part('resistor', 'b2', 'tn3'),
      part('voltmeter', 'c2', 'tn6'),
    ];
    const r = analyzeBoard(parts);
    close(r.parts[parts[3].id].reading!, 5, 0.01);
    close(r.parts[parts[0].id].amps, 0.005, 1e-5);
  });

  it('LED with a 470 Ω resistor on 9 V: about 15 mA and it does not burn', () => {
    const parts = [
      part('battery', 'tp0', 'tn0', { value: 9 }),
      part('resistor', 'tp4', 'a4', { value: 470 }),
      part('led', 'b4', 'b5', { color: 'red' }),
      part('ammeter', 'c5', 'tn7'),
    ];
    const r = analyzeBoard(parts);
    const i = r.parts[parts[3].id].reading!;
    expect(i).toBeGreaterThan(0.013);
    expect(i).toBeLessThan(0.017);
    close(r.parts[parts[2].id].volts, 1.9, 0.15);
    expect(r.parts[parts[2].id].burns).toBeFalsy();
  });

  it('an LED straight across 9 V burns out', () => {
    const parts = [part('battery', 'tp0', 'tn0', { value: 9 }), part('led', 'tp3', 'tn3', { color: 'red' })];
    expect(analyzeBoard(parts).parts[parts[1].id].burns).toBe(true);
  });

  it('a reversed LED does not light', () => {
    const parts = [
      part('battery', 'tp0', 'tn0', { value: 9 }),
      part('resistor', 'tp4', 'a4', { value: 470 }),
      part('led', 'b5', 'b4'),
      part('wire', 'c5', 'tn4'),
    ];
    expect(Math.abs(analyzeBoard(parts).parts[parts[2].id].amps)).toBeLessThan(1e-6);
  });

  it('an open switch breaks the circuit and a closed one completes it', () => {
    const make = (closed: boolean) => [
      part('supply', 'tp0', 'tn0', { value: 5 }),
      part('resistor', 'tp2', 'a2', { value: 1000 }),
      part('switch', 'b2', 'b3', { closed }),
      part('ammeter', 'c3', 'tn3'),
    ];
    const open = make(false);
    const shut = make(true);
    close(analyzeBoard(open).parts[open[3].id].reading!, 0, 1e-6);
    close(analyzeBoard(shut).parts[shut[3].id].reading!, 0.005, 1e-5);
  });

  it('flags a shorted supply and an overheating resistor', () => {
    const shorted = [part('supply', 'tp0', 'tn0', { value: 5 }), part('wire', 'tp1', 'tn1')];
    expect(analyzeBoard(shorted).warnings.some((w) => w.text.includes('shorted'))).toBe(true);
    const hot = [part('supply', 'tp0', 'tn0', { value: 12 }), part('resistor', 'tp2', 'tn2', { value: 100 })];
    expect(analyzeBoard(hot).warnings.some((w) => w.text.includes('overheating'))).toBe(true);
  });

  it('the potentiometer follows its wiper', () => {
    const parts = [part('supply', 'tp0', 'tn0', { value: 10 }), part('pot', 'tp2', 'tn2', { value: 10000, wiper: 0.25 })];
    close(analyzeBoard(parts).parts[parts[1].id].amps, 10 / 2500, 1e-5);
  });
});

describe('resistor colour code', () => {
  it('codes 4.7 kΩ as yellow, violet, red', () => {
    expect(resistorBands(4700).slice(0, 3)).toEqual(['#f2c200', '#7b3fbf', '#d32f2f']);
  });
});

describe('multimeter Ω range', () => {
  it('reads two 1 kΩ resistors in series as 2 kΩ and in parallel as 500 Ω', () => {
    const series = [part('resistor', 'a2', 'a4'), part('resistor', 'b4', 'a7')];
    close(measureResistance(series, 'c2', 'c7').ohms!, 2000, 1);
    const parallel = [part('resistor', 'a2', 'a4'), part('resistor', 'b2', 'b4')];
    close(measureResistance(parallel, 'c2', 'c4').ohms!, 500, 1);
  });
  it('shows open (null) across nothing, and refuses while powered', () => {
    expect(measureResistance([part('resistor', 'a2', 'a4')], 'c2', 'c9').ohms).toBeNull();
    expect(measureResistance([part('battery', 'tp0', 'tn0')], 'c2', 'c4').powered).toBe(true);
  });
});

describe('circuit diagram data', () => {
  it('finds one net per connected strip group, ordered by voltage', () => {
    const parts = [
      part('supply', 'tp0', 'tn0', { value: 10 }),
      part('resistor', 'a2', 'tp2'),
      part('resistor', 'b2', 'tn3'),
      part('wire', 'c2', 'c8'),
    ];
    const s = schematicOf(parts, analyzeBoard(parts));
    expect(s.edges.length).toBe(3);
    expect(s.nets.length).toBe(3);
    const volts = s.nets.map((n) => +n.volts.toFixed(1)).sort((a, b) => b - a);
    expect(volts).toEqual([10, 5, 0]);
    expect(s.nets.find((n) => n.ground)!.volts).toBeCloseTo(0, 3);
  });
});
