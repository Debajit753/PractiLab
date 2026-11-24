import { solve, type Element } from '../engine/solver';

/**
 * Breadboard sandbox model.
 *
 * The board has 30 columns. In each column, holes a-e form one connected strip
 * and holes f-j another (the centre channel separates them). There are + and −
 * power rails along the top and bottom; each rail row is one long strip.
 * Every part has two legs that sit in two holes.
 */

export const COLS = 30;
export const PITCH = 36;
export const X0 = 120;
export const ROWS_TOP = ['a', 'b', 'c', 'd', 'e'] as const;
export const ROWS_BOTTOM = ['f', 'g', 'h', 'i', 'j'] as const;
export const RAILS = ['tp', 'tn', 'bp', 'bn'] as const;

export const ROW_Y: Record<string, number> = {
  tp: 62,
  tn: 96,
  a: 170,
  b: 206,
  c: 242,
  d: 278,
  e: 314,
  f: 392,
  g: 428,
  h: 464,
  i: 500,
  j: 536,
  bp: 614,
  bn: 648,
};
export const BOARD_W = X0 * 2 + (COLS - 1) * PITCH;
/** Height of the breadboard itself; the multimeter sits below it. */
export const BOARD_FRAME_H = 680;
export const BOARD_H = 850;

export interface Hole {
  id: string;
  row: string;
  col: number;
  x: number;
  y: number;
  /** The connected strip this hole belongs to. */
  strip: string;
}

export const colX = (c: number) => X0 + c * PITCH;

function stripOf(row: string, col: number) {
  if ((ROWS_TOP as readonly string[]).includes(row)) return `T${col}`;
  if ((ROWS_BOTTOM as readonly string[]).includes(row)) return `B${col}`;
  return row.toUpperCase();
}

export const HOLES: Hole[] = (() => {
  const out: Hole[] = [];
  for (const row of Object.keys(ROW_Y)) {
    for (let col = 0; col < COLS; col++) {
      // Rails have a gap after every 5 holes, like a real board.
      if ((RAILS as readonly string[]).includes(row) && col % 6 === 5) continue;
      out.push({ id: `${row}${col}`, row, col, x: colX(col), y: ROW_Y[row], strip: stripOf(row, col) });
    }
  }
  return out;
})();
export const HOLE_BY_ID = new Map(HOLES.map((h) => [h.id, h]));

export type PartKind = 'wire' | 'resistor' | 'pot' | 'diode' | 'led' | 'switch' | 'battery' | 'supply' | 'voltmeter' | 'ammeter';

export type LedColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Part {
  id: string;
  kind: PartKind;
  /** Leg A: + for sources and meters, anode for diodes and LEDs. */
  a: string;
  b: string;
  /** Resistance (Ω), pot maximum (Ω), or voltage (V) for sources. */
  value: number;
  /** Pot wiper position 0-1. */
  wiper?: number;
  closed?: boolean;
  color?: LedColor | string;
  broken?: boolean;
  label: string;
}

export const PART_INFO: Record<PartKind, { name: string; prefix: string; value: number; unit: string }> = {
  wire: { name: 'Jumper wire', prefix: 'W', value: 0, unit: '' },
  resistor: { name: 'Resistor', prefix: 'R', value: 1000, unit: 'Ω' },
  pot: { name: 'Potentiometer', prefix: 'P', value: 10000, unit: 'Ω' },
  diode: { name: 'Diode (1N4007)', prefix: 'D', value: 0, unit: '' },
  led: { name: 'LED', prefix: 'LED', value: 0, unit: '' },
  switch: { name: 'Switch', prefix: 'SW', value: 0, unit: '' },
  battery: { name: 'Battery', prefix: 'B', value: 9, unit: 'V' },
  supply: { name: 'DC power supply', prefix: 'PS', value: 5, unit: 'V' },
  voltmeter: { name: 'Voltmeter', prefix: 'VM', value: 0, unit: '' },
  ammeter: { name: 'Ammeter', prefix: 'AM', value: 0, unit: '' },
};

/** LED forward voltage at 10 mA by colour; the model uses η = 2. */
export const LED_VF: Record<LedColor, number> = { red: 1.9, yellow: 2.0, green: 2.1, blue: 3.0 };
const VT = 0.025852;
const ledIs = (c: LedColor) => 0.01 / Math.exp(LED_VF[c] / (2 * VT));

export const LIMITS = { ledMaxA: 0.03, resistorMaxW: 0.25, supplyMaxA: 1, batteryMaxA: 2 };

export interface PartResult {
  /** V(a) − V(b) */
  volts: number;
  /** Current from a to b through the part (for sources: current delivered out of +). */
  amps: number;
  watts: number;
  /** What a meter shows (V for a voltmeter, A for an ammeter). */
  reading?: number;
  warning?: string;
  /** The part has just been destroyed (LED over current). */
  burns?: boolean;
}

export interface BoardResult {
  parts: Record<string, PartResult>;
  warnings: { partId: string; text: string }[];
  /** Hole voltage relative to the − of the first source. */
  holeVolts: (holeId: string) => number;
}

class UnionFind {
  private p = new Map<string, string>();
  find(x: string): string {
    const q = this.p.get(x) ?? x;
    if (q === x) return x;
    const r = this.find(q);
    this.p.set(x, r);
    return r;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.p.set(ra, rb);
  }
}

const isSource = (k: PartKind) => k === 'battery' || k === 'supply';

export function analyzeBoard(parts: Part[]): BoardResult {
  const uf = new UnionFind();
  const netOfHole = (h: string) => uf.find(HOLE_BY_ID.get(h)?.strip ?? h);
  for (const p of parts) {
    if (p.kind === 'wire' || (p.kind === 'switch' && p.closed))
      uf.union(HOLE_BY_ID.get(p.a)?.strip ?? p.a, HOLE_BY_ID.get(p.b)?.strip ?? p.b);
  }

  const elements: Element[] = [];
  for (const p of parts) {
    const a = netOfHole(p.a);
    const b = netOfHole(p.b);
    switch (p.kind) {
      case 'resistor':
        elements.push({ kind: 'R', id: p.id, a, b, ohms: Math.max(p.value, 0.01) });
        break;
      case 'pot':
        elements.push({ kind: 'R', id: p.id, a, b, ohms: Math.max(p.value * (p.wiper ?? 0.5), 1) });
        break;
      case 'diode':
        elements.push({ kind: 'D', id: p.id, a, k: b, is: 1e-9, n: 1.7 });
        elements.push({ kind: 'R', id: `${p.id}_leak`, a, b, ohms: 50e6 });
        break;
      case 'led':
        if (!p.broken) elements.push({ kind: 'D', id: p.id, a, k: b, is: ledIs((p.color as LedColor) ?? 'red'), n: 2 });
        elements.push({ kind: 'R', id: `${p.id}_leak`, a, b, ohms: 1e9 });
        break;
      case 'battery':
      case 'supply': {
        const inner = `__${p.id}`;
        elements.push({ kind: 'V', id: p.id, p: inner, n: b, volts: p.value });
        elements.push({ kind: 'R', id: `${p.id}_rint`, a: inner, b: a, ohms: p.kind === 'battery' ? 0.5 : 0.05 });
        break;
      }
      case 'voltmeter':
        elements.push({ kind: 'R', id: p.id, a, b, ohms: 10e6 });
        break;
      case 'ammeter':
        elements.push({ kind: 'R', id: p.id, a, b, ohms: 0.1 });
        break;
      default:
        break;
    }
  }

  const firstSource = parts.find((p) => isSource(p.kind));
  const ground = firstSource ? netOfHole(firstSource.b) : '__gnd';
  const sol = elements.length ? solve(elements, ground) : null;
  const v = (net: string) => (sol ? sol.voltage(net) : 0);

  const results: Record<string, PartResult> = {};
  const warnings: BoardResult['warnings'] = [];
  for (const p of parts) {
    const va = v(netOfHole(p.a));
    const vb = v(netOfHole(p.b));
    const volts = va - vb;
    let amps = 0;
    const r: PartResult = { volts, amps: 0, watts: 0 };
    switch (p.kind) {
      case 'resistor':
      case 'pot':
      case 'voltmeter':
      case 'ammeter':
        amps = sol ? sol.current(p.id) : 0;
        break;
      case 'diode':
      case 'led':
        amps = sol ? (p.broken ? 0 : sol.current(p.id)) + sol.current(`${p.id}_leak`) : 0;
        break;
      case 'battery':
      case 'supply':
        // current out of the + terminal into the circuit
        amps = sol ? sol.current(`${p.id}_rint`) : 0;
        break;
      case 'switch':
      case 'wire':
        amps = NaN; // not computed for ideal connections
        break;
    }
    r.amps = amps;
    r.watts = Number.isFinite(amps) ? Math.abs(volts * amps) : 0;
    if (p.kind === 'voltmeter') r.reading = volts;
    if (p.kind === 'ammeter') r.reading = amps;

    if (p.kind === 'led' && !p.broken && amps > LIMITS.ledMaxA) {
      r.burns = true;
      warnings.push({
        partId: p.id,
        text: `${p.label} burnt out: ${(amps * 1000).toFixed(0)} mA is more than an LED can take (about 20 mA). Add a series resistor, then replace the LED.`,
      });
    } else if (p.kind === 'led' && p.broken) {
      warnings.push({
        partId: p.id,
        text: `${p.label} is burnt out: too much current flowed through it (an LED needs a series resistor). Fix the circuit, then select it and press Replace LED.`,
      });
    }
    if ((p.kind === 'resistor' || p.kind === 'pot') && r.watts > LIMITS.resistorMaxW) {
      r.warning = 'overheating';
      warnings.push({ partId: p.id, text: `${p.label} is overheating: ${r.watts.toFixed(2)} W is more than its 0.25 W rating.` });
    }
    if (isSource(p.kind)) {
      const max = p.kind === 'supply' ? LIMITS.supplyMaxA : LIMITS.batteryMaxA;
      if (Math.abs(amps) > max) {
        r.warning = 'short';
        warnings.push({
          partId: p.id,
          text: `${p.label} is shorted (${Math.abs(amps).toFixed(1)} A). Something connects its + straight to its −.`,
        });
      }
    }
    if (p.kind === 'ammeter' && Math.abs(amps) > 2) {
      r.warning = 'overload';
      warnings.push({
        partId: p.id,
        text: `${p.label} is overloaded. An ammeter must be in series, never straight across a source.`,
      });
    }
    results[p.id] = r;
  }

  return { parts: results, warnings, holeVolts: (h) => v(netOfHole(h)) };
}

/** Next free label for a new part of this kind, e.g. R3. */
export function nextLabel(parts: Part[], kind: PartKind) {
  const prefix = PART_INFO[kind].prefix;
  let n = 1;
  const used = new Set(parts.map((p) => p.label));
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/** Engineering format, e.g. 4700 → "4.7 k". */
export function eng(x: number, digits = 3) {
  if (!Number.isFinite(x)) return '–';
  const ax = Math.abs(x);
  const units: [number, string][] = [
    [1e6, 'M'],
    [1e3, 'k'],
    [1, ''],
    [1e-3, 'm'],
    [1e-6, 'µ'],
  ];
  if (ax < 1e-9) return '0 ';
  for (const [f, u] of units) if (ax >= f) return `${+(x / f).toPrecision(digits)} ${u}`;
  return `${+(x / 1e-6).toPrecision(digits)} µ`;
}

/** Resistor colour bands (4-band code) for a value in ohms. */
export function resistorBands(ohms: number): string[] {
  const colors = ['#000000', '#7a4b1c', '#d32f2f', '#f57c00', '#f2c200', '#2e9b4b', '#1e63d6', '#7b3fbf', '#8d8d8d', '#ffffff'];
  if (ohms < 1) return [colors[0], colors[0], colors[0], '#c9a227'];
  const exp = Math.floor(Math.log10(ohms)) - 1;
  const sig = Math.round(ohms / 10 ** exp);
  const d1 = Math.floor(sig / 10) % 10;
  const d2 = sig % 10;
  const mult = exp < 0 ? '#c9a227' : colors[Math.min(exp, 9)];
  return [colors[d1], colors[d2], mult, '#c9a227'];
}

/**
 * Resistance between two holes, as a multimeter on its Ω range would read it.
 * Real meters must not be used on a powered circuit, so this returns
 * { powered: true } when a battery or supply is on the board.
 */
export function measureResistance(parts: Part[], red: string, black: string): { powered: boolean; ohms: number | null } {
  if (parts.some((p) => isSource(p.kind))) return { powered: true, ohms: null };
  const uf = new UnionFind();
  const strip = (h: string) => HOLE_BY_ID.get(h)?.strip ?? h;
  for (const p of parts) if (p.kind === 'wire' || (p.kind === 'switch' && p.closed)) uf.union(strip(p.a), strip(p.b));
  const net = (h: string) => uf.find(strip(h));
  const r = net(red);
  const b = net(black);
  if (r === b) return { powered: false, ohms: 0 };
  const elements: Element[] = [{ kind: 'I', id: '__meter', a: b, b: r, amps: 1e-3 }];
  for (const p of parts) {
    const a = net(p.a);
    const k = net(p.b);
    if (p.kind === 'resistor') elements.push({ kind: 'R', id: p.id, a, b: k, ohms: Math.max(p.value, 0.01) });
    else if (p.kind === 'pot') elements.push({ kind: 'R', id: p.id, a, b: k, ohms: Math.max(p.value * (p.wiper ?? 0.5), 1) });
    else if (p.kind === 'voltmeter') elements.push({ kind: 'R', id: p.id, a, b: k, ohms: 10e6 });
    else if (p.kind === 'ammeter') elements.push({ kind: 'R', id: p.id, a, b: k, ohms: 0.1 });
    else if (p.kind === 'diode') elements.push({ kind: 'D', id: p.id, a, k, is: 1e-9, n: 1.7 });
    else if (p.kind === 'led' && !p.broken)
      elements.push({ kind: 'D', id: p.id, a, k, is: ledIs((p.color as LedColor) ?? 'red'), n: 2 });
  }
  const sol = solve(elements, b);
  const ohms = sol.voltage(r) / 1e-3;
  return { powered: false, ohms: ohms > 40e6 ? null : ohms };
}

export interface SchematicNet {
  id: string;
  volts: number;
  /** True for the − terminal of the first source (drawn with a ground symbol). */
  ground: boolean;
}
export interface SchematicEdge {
  part: Part;
  /** Net of leg a and leg b. */
  na: string;
  nb: string;
}

/**
 * Nets for the circuit diagram: holes joined by strips and jumper wires.
 * Switches are kept as parts (not merged) so they appear in the diagram.
 */
export function schematicOf(parts: Part[], result: BoardResult): { nets: SchematicNet[]; edges: SchematicEdge[] } {
  const uf = new UnionFind();
  const strip = (h: string) => HOLE_BY_ID.get(h)?.strip ?? h;
  for (const p of parts) if (p.kind === 'wire') uf.union(strip(p.a), strip(p.b));
  const net = (h: string) => uf.find(strip(h));
  const edges: SchematicEdge[] = parts.filter((p) => p.kind !== 'wire').map((p) => ({ part: p, na: net(p.a), nb: net(p.b) }));
  const firstSource = parts.find((p) => isSource(p.kind));
  const groundNet = firstSource ? net(firstSource.b) : null;
  const holeOf = new Map<string, string>();
  for (const p of parts) {
    holeOf.set(net(p.a), p.a);
    holeOf.set(net(p.b), p.b);
  }
  const ids = Array.from(new Set(edges.flatMap((e) => [e.na, e.nb])));
  const nets = ids.map((id) => ({ id, volts: result.holeVolts(holeOf.get(id)!), ground: id === groundNet }));
  return { nets, edges };
}
