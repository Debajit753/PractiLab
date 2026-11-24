import {
  UNIT_FACTOR,
  type KitDef,
  type MeasurementDef,
  type MeterDef,
  type MeterRange,
  type QueryContext,
  type Wire,
} from '../kits/types';
import { solve, type Element } from './solver';

export interface KitControls {
  mains: boolean;
  fuseBlown: boolean;
  knobs: Record<string, number>;
  decades: Record<string, number>;
  switches: Record<string, 'a' | 'b'>;
  /** Selected range index per meter. */
  ranges: Record<string, number>;
}

export function defaultControls(kit: KitDef): KitControls {
  return {
    mains: false,
    fuseBlown: false,
    knobs: Object.fromEntries(kit.knobs.map((k) => [k.id, k.initial ?? 0])),
    decades: Object.fromEntries((kit.decades ?? []).map((d) => [d.id, d.initial])),
    switches: Object.fromEntries((kit.switches ?? []).map((s) => [s.id, s.initial])),
    ranges: Object.fromEntries(kit.meters.map((m) => [m.id, 0])),
  };
}

export function supplyVolts(kit: KitDef, controls: KitControls, supplyId: string) {
  const s = kit.supplies.find((x) => x.id === supplyId)!;
  const v = s.knobs.reduce((t, k) => t + (controls.knobs[k] ?? 0), 0);
  return Math.min(s.maxV, v);
}

export interface MeterReading {
  meter: MeterDef;
  range: MeterRange;
  /** SI value: volts or amps. */
  si: number;
  /** Value in the units of the selected range. */
  display: number;
  /** What the meter is placed across, if it matches a known measurement. */
  measurement: MeasurementDef | null;
  /** Meter is across a known part but with + and − swapped. */
  reversed: boolean;
  connected: boolean;
}

export interface Analysis extends QueryContext {
  netOf: (socket: string) => string;
  readings: Record<string, MeterReading>;
  supplyCurrent: number;
  /** True when this wiring would blow the fuse at the current settings. */
  overCurrent: boolean;
}

class UnionFind {
  private parent = new Map<string, string>();
  find(x: string): string {
    let p = this.parent.get(x) ?? x;
    if (p !== x) {
      p = this.find(p);
      this.parent.set(x, p);
    }
    return p;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

export function analyze(kit: KitDef, wires: Wire[], controls: KitControls): Analysis {
  const uf = new UnionFind();
  for (const group of kit.hardNets) for (let i = 1; i < group.length; i++) uf.union(group[0], group[i]);
  for (const w of wires) uf.union(w.a, w.b);
  const switchPos = (id: string) => controls.switches[id] ?? kit.switches?.find((s) => s.id === id)?.initial ?? 'a';
  for (const sw of kit.switches ?? []) uf.union(sw.common, switchPos(sw.id) === 'a' ? sw.a : sw.b);

  const netOf = (s: string) => uf.find(s);
  const sameNet = (a: string, b: string) => netOf(a) === netOf(b);

  const on = controls.mains && !controls.fuseBlown;
  const elements: Element[] = [];
  // A switched-off supply is an open circuit.
  if (on) {
    for (const s of kit.supplies) {
      const inner = `__${s.id}`;
      elements.push({ kind: 'V', id: s.id, p: inner, n: netOf(s.minus), volts: supplyVolts(kit, controls, s.id) });
      elements.push({ kind: 'R', id: `${s.id}_rint`, a: inner, b: netOf(s.plus), ohms: s.rint });
    }
  }
  for (const r of kit.resistors) elements.push({ kind: 'R', id: r.id, a: netOf(r.a), b: netOf(r.b), ohms: r.ohms });
  for (const pt of kit.pots ?? [])
    elements.push({ kind: 'R', id: pt.id, a: netOf(pt.a), b: netOf(pt.b), ohms: Math.max(controls.knobs[pt.knob] ?? 0, pt.min) });
  for (const d of kit.decades ?? [])
    elements.push({
      kind: 'R',
      id: d.id,
      a: netOf(d.a),
      b: netOf(d.b),
      ohms: Math.max(controls.decades[d.id] ?? d.initial, 0.01),
    });
  for (const d of kit.diodes ?? []) {
    const model = d.models[Object.keys(d.models)[0]];
    elements.push({ kind: 'D', id: d.id, a: netOf(d.anode), k: netOf(d.cathode), is: model.is, n: model.n });
    elements.push({ kind: 'R', id: `${d.id}_leak`, a: netOf(d.anode), b: netOf(d.cathode), ohms: model.rleak });
  }
  const rangeOf = (m: MeterDef) => m.ranges[Math.min(controls.ranges[m.id] ?? 0, m.ranges.length - 1)];
  for (const m of kit.meters) elements.push({ kind: 'R', id: m.id, a: netOf(m.plus), b: netOf(m.minus), ohms: rangeOf(m).ohms });

  // Ground: the first supply's negative terminal.
  const sol = solve(elements, netOf(kit.supplies[0].minus));
  const supplyCurrent = on ? Math.max(0, ...kit.supplies.map((s) => Math.abs(sol.current(`${s.id}_rint`)))) : 0;

  const ammeters = kit.meters.filter((m) => m.kind === 'A');
  const bridged = (a: string, b: string) => {
    if (sameNet(a, b)) return true;
    const na = netOf(a);
    const nb = netOf(b);
    return ammeters.some((m) => {
      const p = netOf(m.plus);
      const n = netOf(m.minus);
      return (p === na && n === nb) || (p === nb && n === na);
    });
  };
  const q: QueryContext = { sameNet, bridged, switchPos };

  const readings: Record<string, MeterReading> = {};
  for (const m of kit.meters) {
    const p = netOf(m.plus);
    const n = netOf(m.minus);
    const si = m.kind === 'V' ? sol.voltage(p) - sol.voltage(n) : sol.current(m.id);
    const range = rangeOf(m);
    const list = m.kind === 'V' ? kit.voltageMeasurements : kit.currentMeasurements;
    let measurement: MeasurementDef | null = null;
    let reversed = false;
    if (p !== n) {
      for (const def of list) {
        const a = netOf(def.pair[0]);
        const b = netOf(def.pair[1]);
        if (a === b) continue;
        const fwd = p === a && n === b;
        const rev = p === b && n === a;
        if (!fwd && !rev) continue;
        if (def.when && !def.when(q)) continue;
        measurement = def;
        reversed = rev;
        break;
      }
    }
    const touches = (s: string) => wires.some((w) => w.a === s || w.b === s);
    readings[m.id] = {
      meter: m,
      range,
      si,
      display: si * UNIT_FACTOR[range.unit],
      measurement,
      reversed,
      connected: touches(m.plus) && touches(m.minus),
    };
  }

  return {
    netOf,
    sameNet,
    bridged,
    switchPos,
    readings,
    supplyCurrent,
    overCurrent: supplyCurrent > kit.fuseA,
  };
}
