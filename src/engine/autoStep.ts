import type { SocketColor, Wire } from '../kits/types';
import { keyInPart, partOfStep, type PracticalDef, type Row } from '../practicals/types';
import { analyze, type KitControls } from './circuit';
import { recordedValue } from './readout';

/** The parts of a lab's state that a step can change. */
export interface LabSnapshot {
  wires: Wire[];
  controls: KitControls;
  rows: Row[];
  checkRows: Row[];
  activeRow: number;
}

let seq = 0;
const autoId = () => `a${Date.now().toString(36)}${(seq++).toString(36)}`;

const samePair = (w: Wire, a: string, b: string) => (w.a === a && w.b === b) || (w.a === b && w.b === a);

/**
 * Carry out one procedure step for the student ("Next step"): change cords,
 * set knobs and switches, and record readings, exactly as the step describes.
 * Pure: returns the new state plus a short note of what was recorded.
 */
export function runAuto(
  p: PracticalDef,
  stepIndex: number,
  start: LabSnapshot,
  colorOf: (socket: string) => SocketColor,
): LabSnapshot & { notes: string[] } {
  const step = p.steps[stepIndex];
  const part = partOfStep(p, step);
  // A row counts as empty when it has none of this part's readings (the other part may have filled it).
  const isEmpty = (r: Row) => (part?.keys ?? Object.keys(r)).every((k) => r[k] == null);
  let wires = [...start.wires];
  const c = start.controls;
  let controls: KitControls = {
    ...c,
    knobs: { ...c.knobs },
    decades: { ...c.decades },
    switches: { ...c.switches },
    ranges: { ...c.ranges },
  };
  const rows = start.rows.map((r) => ({ ...r }));
  const checkRows = start.checkRows.map((r) => ({ ...r }));
  let row = start.activeRow;
  const notes: string[] = [];
  const val = (v: number | ((rows: Row[]) => number)) => (typeof v === 'function' ? v(rows) : v);
  const addRow = () => {
    rows.push({});
    checkRows.push({});
  };

  for (const act of step.auto ?? []) {
    switch (act.do) {
      case 'unplug':
        wires = wires.filter((w) => !act.sockets.includes(w.a) && !act.sockets.includes(w.b));
        break;
      case 'remove':
        wires = wires.filter((w) => !act.pairs.some(([a, b]) => samePair(w, a, b)));
        break;
      case 'add':
        for (const [a, b] of act.pairs)
          if (!wires.some((w) => samePair(w, a, b))) wires.push({ id: autoId(), a, b, color: colorOf(a) });
        break;
      case 'set': {
        const knobs = { ...controls.knobs };
        for (const [k, v] of Object.entries(act.knobs ?? {})) knobs[k] = val(v);
        const decades = { ...controls.decades };
        for (const [k, v] of Object.entries(act.decades ?? {})) decades[k] = val(v);
        controls = {
          ...controls,
          knobs,
          decades,
          switches: { ...controls.switches, ...(act.switches ?? {}) },
          ranges: { ...controls.ranges, ...(act.ranges ?? {}) },
          ...(act.mains != null ? { mains: act.mains, fuseBlown: false } : {}),
        };
        break;
      }
      case 'seek': {
        // Turn a knob until a meter reads the target (bisection; the reading changes steadily with the knob).
        const target = val(act.target);
        const knob = p.kit.knobs.find((k) => k.id === act.knob)!;
        const read = (v: number) =>
          analyze(p.kit, wires, { ...controls, knobs: { ...controls.knobs, [act.knob]: v } }).readings[act.meter].si;
        let lo = 0;
        let hi = knob.max;
        const rising = read(hi) > read(lo);
        for (let i = 0; i < 50; i++) {
          const mid = (lo + hi) / 2;
          if (read(mid) < target === rising) lo = mid;
          else hi = mid;
        }
        controls = { ...controls, knobs: { ...controls.knobs, [act.knob]: +((lo + hi) / 2).toFixed(4) } };
        break;
      }
      case 'row':
        if (act.row === 'empty') {
          if (!isEmpty(rows[row] ?? {})) {
            let i = rows.findIndex((r, j) => j > row && isEmpty(r));
            if (i < 0 && rows.length < p.maxRows) {
              addRow();
              i = rows.length - 1;
            }
            if (i >= 0) row = i;
          }
        } else {
          while (rows.length <= act.row) addRow();
          row = act.row;
        }
        break;
      case 'record': {
        // A student switches the mains on before reading the meters (it is off after reopening the page).
        if (!controls.mains || controls.fuseBlown) controls = { ...controls, mains: true, fuseBlown: false };
        const an = analyze(p.kit, wires, controls);
        const values: Record<string, number> = {};
        for (const m of p.kit.meters) {
          const r = an.readings[m.id];
          if (!r.measurement) continue;
          const key = keyInPart(part, r.measurement.key);
          if (part && !part.keys.includes(key)) continue;
          if (step.records && !step.records.includes(key)) continue;
          values[key] = recordedValue(r.display, r, p.measured[key]?.unit ?? '', true);
        }
        if (!Object.keys(values).length) break;
        const all = { ...values, ...(p.recordExtras?.(controls) ?? {}) };
        rows[row] = { ...rows[row], ...all };
        checkRows[row] = { ...checkRows[row], ...all };
        notes.push(
          Object.entries(values)
            .map(
              ([k, v]) =>
                `${p.measured[k]?.label ?? k} = ${v.toFixed(p.measured[k]?.decimals ?? 2)} ${p.measured[k]?.unit ?? ''}`,
            )
            .join(', '),
        );
        const complete = p.advanceWhen?.some((g) => g.every((k) => rows[row][k] != null) && g.some((k) => k in values));
        if (complete) {
          if (row + 1 >= rows.length && rows.length < p.maxRows) addRow();
          row = Math.min(row + 1, rows.length - 1);
        }
        break;
      }
    }
  }
  return { wires, controls, rows, checkRows, activeRow: row, notes };
}
