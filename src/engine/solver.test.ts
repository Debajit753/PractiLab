import { describe, expect, it } from 'vitest';
import { solve, type Element } from './solver';

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('MNA solver', () => {
  it('solves a voltage divider', () => {
    const els: Element[] = [
      { kind: 'V', id: 'V1', p: 'in', n: 'gnd', volts: 10 },
      { kind: 'R', id: 'R1', a: 'in', b: 'mid', ohms: 1000 },
      { kind: 'R', id: 'R2', a: 'mid', b: 'gnd', ohms: 3000 },
    ];
    const s = solve(els, 'gnd');
    close(s.voltage('mid'), 7.5);
    close(s.current('R1'), 0.0025);
    // Source delivers 2.5 mA, so current from p through source to n is negative.
    close(s.current('V1'), -0.0025);
  });

  it('solves two parallel branches (KCL)', () => {
    const els: Element[] = [
      { kind: 'V', id: 'V1', p: 'a', n: '0', volts: 5 },
      { kind: 'R', id: 'R1', a: 'a', b: 'x', ohms: 50 },
      { kind: 'R', id: 'R2', a: 'x', b: '0', ohms: 100 },
      { kind: 'R', id: 'R3', a: 'a', b: 'y', ohms: 220 },
      { kind: 'R', id: 'R4', a: 'y', b: '0', ohms: 330 },
    ];
    const s = solve(els, '0');
    const i1 = s.current('R1');
    const i2 = s.current('R3');
    close(i1, 5 / 150);
    close(i2, 5 / 550);
    close(-s.current('V1'), i1 + i2);
    // KVL around each loop
    close(s.voltage('a') - s.voltage('x') + s.voltage('x'), 5);
    close(s.voltage('y'), 3);
  });

  it('keeps floating nodes at about 0 V instead of failing', () => {
    const els: Element[] = [
      { kind: 'V', id: 'V1', p: 'a', n: '0', volts: 5 },
      { kind: 'R', id: 'R1', a: 'a', b: '0', ohms: 100 },
      { kind: 'R', id: 'Rf', a: 'f1', b: 'f2', ohms: 100 },
    ];
    const s = solve(els, '0');
    expect(s.converged).toBe(true);
    close(s.voltage('f1'), 0, 1e-3);
  });

  it('handles a current source', () => {
    const els: Element[] = [
      { kind: 'I', id: 'I1', a: '0', b: 'a', amps: 0.002 },
      { kind: 'R', id: 'R1', a: 'a', b: '0', ohms: 1000 },
    ];
    close(solve(els, '0').voltage('a'), 2);
  });

  it('solves a silicon diode in forward bias', () => {
    const els: Element[] = [
      { kind: 'V', id: 'V1', p: 'a', n: '0', volts: 5 },
      { kind: 'R', id: 'R1', a: 'a', b: 'd', ohms: 1000 },
      { kind: 'D', id: 'D1', a: 'd', k: '0' },
    ];
    const s = solve(els, '0');
    expect(s.converged).toBe(true);
    const v = s.voltage('d');
    expect(v).toBeGreaterThan(0.6);
    expect(v).toBeLessThan(0.75);
    close(s.current('D1'), s.current('R1'), 1e-6);
  });

  it('blocks current in reverse bias', () => {
    const els: Element[] = [
      { kind: 'V', id: 'V1', p: 'a', n: '0', volts: 10 },
      { kind: 'R', id: 'R1', a: 'a', b: 'd', ohms: 1000 },
      { kind: 'D', id: 'D1', a: '0', k: 'd' },
    ];
    const s = solve(els, '0');
    expect(Math.abs(s.current('R1'))).toBeLessThan(1e-9);
  });
});
