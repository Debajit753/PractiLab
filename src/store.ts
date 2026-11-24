import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { LabSnapshot } from './engine/autoStep';
import { defaultControls, type KitControls } from './engine/circuit';
import type { SocketColor, Wire } from './kits/types';
import type { PracticalDef, Row } from './practicals/types';

export type WireColorChoice = SocketColor | 'auto';

export interface LabState {
  wires: Wire[];
  wireColor: WireColorChoice;
  controls: KitControls;
  rows: Row[];
  /**
   * Readings recorded since the procedure was last restarted. Same shape as `rows`;
   * the procedure checklist looks only at these, so restarting it does not re-tick
   * steps from older readings (which stay in `rows` for the tables).
   */
  checkRows: Row[];
  activeRow: number;
  stepsDone: number[];
  /** Selected procedure part (e.g. 'kcl' or 'kvl'), for practicals that have parts. */
  part?: string;
  /** Cords and settings of the parts not on the bench right now, so each part keeps its own wiring. */
  benches: Record<string, { wires: Wire[]; controls: KitControls }>;
  solutionUsed: boolean;
  /** Digital readout drawn on each analog meter. */
  showReadout: boolean;
  meterError: boolean;
  digitalMeters: boolean;
}

export interface LabActions {
  addWire: (a: string, b: string, color: SocketColor) => void;
  removeWire: (id: string) => void;
  /**
   * Remove every cord and restart the procedure checklist; recorded readings are kept.
   * With `steps` and `keys`, only those steps and checklist readings are reset (one part of the practical).
   */
  restartProcedure: (steps?: number[], keys?: string[]) => void;
  /**
   * Switch to another part of the procedure: put this part's cords and settings aside, bring back
   * the other part's (an empty kit the first time), and pick the first reading row it has not filled.
   */
  setPart: (id: string, keys: string[]) => void;
  setWires: (pairs: [string, string][], colorOf: (s: string) => SocketColor) => void;
  setWireColor: (c: WireColorChoice) => void;
  setControl: <K extends keyof KitControls>(group: K, value: KitControls[K]) => void;
  setControlItem: (group: 'knobs' | 'decades' | 'switches' | 'ranges', id: string, value: number | string) => void;
  blowFuse: () => void;
  resetFuse: () => void;
  setCell: (row: number, key: string, value: number | null) => void;
  setCells: (row: number, values: Record<string, number>) => void;
  setRows: (rows: Row[]) => void;
  setActiveRow: (i: number) => void;
  addRow: () => void;
  removeRow: (i: number) => void;
  markSteps: (done: number[]) => void;
  /** Apply the result of "Next step" (cords, controls and readings) and tick that step. */
  applyStep: (snap: LabSnapshot, step: number) => void;
  setShowReadout: (v: boolean) => void;
  setMeterError: (v: boolean) => void;
  setDigitalMeters: (v: boolean) => void;
  resetLab: () => void;
}

export type LabStore = UseBoundStore<StoreApi<LabState & LabActions>>;

const stores = new Map<string, LabStore>();

function initial(p: PracticalDef): LabState {
  return {
    wires: [],
    wireColor: 'auto',
    controls: defaultControls(p.kit),
    rows: Array.from({ length: p.defaultRows }, () => ({})),
    checkRows: Array.from({ length: p.defaultRows }, () => ({})),
    activeRow: 0,
    stepsDone: [],
    part: p.parts?.[0]?.id,
    benches: {},
    solutionUsed: false,
    showReadout: true,
    meterError: false,
    // Digital panel meters by default (as on the college kits); students can switch to moving-coil meters.
    digitalMeters: p.kit.defaultDigital ?? true,
  };
}

function load(key: string): Partial<LabState> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<LabState>) : null;
  } catch {
    return null;
  }
}

let wireSeq = 0;
const newId = () => `w${Date.now().toString(36)}${(wireSeq++).toString(36)}`;

export function getLabStore(p: PracticalDef): LabStore {
  let store = stores.get(p.id);
  if (store) return store;
  const key = `practilab:v2:${p.id}`;
  const saved = load(key);
  const base = initial(p);
  const savedControls = saved?.controls;

  // Progress saved before the checklist reset existed: count all of it as recorded since the last restart.
  const savedRows = saved?.rows ?? base.rows;
  const checkRows = savedRows.map((_, i) => ({ ...(saved?.checkRows?.[i] ?? (saved?.checkRows ? {} : savedRows[i])) }));

  store = create<LabState & LabActions>()((set) => ({
    ...base,
    ...(saved ?? {}),
    checkRows,
    // Keep saved knob and dial settings, but never come back with mains on or a blown fuse.
    controls: {
      ...base.controls,
      ...(savedControls ?? {}),
      knobs: { ...base.controls.knobs, ...(savedControls?.knobs ?? {}) },
      decades: { ...base.controls.decades, ...(savedControls?.decades ?? {}) },
      switches: { ...base.controls.switches, ...(savedControls?.switches ?? {}) },
      ranges: { ...base.controls.ranges, ...(savedControls?.ranges ?? {}) },
      mains: false,
      fuseBlown: false,
    },
    benches: Object.fromEntries(
      Object.entries(saved?.benches ?? {}).map(([id, b]) => [
        id,
        { wires: b.wires, controls: { ...base.controls, ...b.controls, mains: false, fuseBlown: false } },
      ]),
    ),

    addWire: (a, b, color) =>
      set((s) => {
        if (a === b) return s;
        const dup = s.wires.some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a));
        if (dup) return s;
        return { wires: [...s.wires, { id: newId(), a, b, color }] };
      }),
    removeWire: (id) => set((s) => ({ wires: s.wires.filter((w) => w.id !== id) })),
    restartProcedure: (steps, keys) =>
      set((s) => ({
        wires: [],
        stepsDone: steps ? s.stepsDone.filter((i) => !steps.includes(i)) : [],
        checkRows: keys
          ? s.checkRows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !keys.includes(k))))
          : s.rows.map(() => ({})),
      })),
    setPart: (id, keys) =>
      set((s) => {
        if (id === s.part) return s;
        const free = s.rows.findIndex((r) => keys.every((k) => r[k] == null));
        const benches = { ...s.benches };
        if (s.part) benches[s.part] = { wires: s.wires, controls: s.controls };
        const next = benches[id] ?? { wires: [], controls: { ...s.controls, mains: false, fuseBlown: false } };
        delete benches[id];
        return { part: id, benches, wires: next.wires, controls: next.controls, activeRow: free >= 0 ? free : s.activeRow };
      }),
    setWires: (pairs, colorOf) =>
      set({ wires: pairs.map(([a, b]) => ({ id: newId(), a, b, color: colorOf(a) })), solutionUsed: true }),
    setWireColor: (c) => set({ wireColor: c }),
    setControl: (group, value) => set((s) => ({ controls: { ...s.controls, [group]: value } })),
    setControlItem: (group, id, value) =>
      set((s) => ({ controls: { ...s.controls, [group]: { ...(s.controls[group] as object), [id]: value } } })),
    blowFuse: () => set((s) => ({ controls: { ...s.controls, fuseBlown: true } })),
    resetFuse: () => set((s) => ({ controls: { ...s.controls, fuseBlown: false, mains: false } })),
    setCell: (row, k, value) =>
      set((s) => ({
        rows: s.rows.map((r, i) => (i === row ? { ...r, [k]: value } : r)),
        checkRows: s.checkRows.map((r, i) => (i === row ? { ...r, [k]: value } : r)),
      })),
    setCells: (row, values) =>
      set((s) => ({
        rows: s.rows.map((r, i) => (i === row ? { ...r, ...values } : r)),
        checkRows: s.checkRows.map((r, i) => (i === row ? { ...r, ...values } : r)),
      })),
    setRows: (rows) => set({ rows: rows.map((r) => ({ ...r })), checkRows: rows.map((r) => ({ ...r })), activeRow: 0 }),
    setActiveRow: (i) => set({ activeRow: i }),
    addRow: () =>
      set((s) =>
        s.rows.length >= p.maxRows ? s : { rows: [...s.rows, {}], checkRows: [...s.checkRows, {}], activeRow: s.rows.length },
      ),
    removeRow: (i) =>
      set((s) => {
        if (s.rows.length <= 1) return s;
        const rows = s.rows.filter((_, j) => j !== i);
        const checkRows = s.checkRows.filter((_, j) => j !== i);
        return { rows, checkRows, activeRow: Math.min(s.activeRow, rows.length - 1) };
      }),
    applyStep: (snap, step) =>
      set((s) => ({
        wires: snap.wires,
        controls: snap.controls,
        rows: snap.rows,
        checkRows: snap.checkRows,
        activeRow: snap.activeRow,
        stepsDone: Array.from(new Set([...s.stepsDone, step])).sort((a, b) => a - b),
        solutionUsed: true,
      })),
    markSteps: (done) =>
      set((s) => {
        const merged = Array.from(new Set([...s.stepsDone, ...done])).sort((a, b) => a - b);
        return merged.length === s.stepsDone.length ? s : { stepsDone: merged };
      }),
    setShowReadout: (v) => set({ showReadout: v }),
    setMeterError: (v) => set({ meterError: v }),
    setDigitalMeters: (v) => set({ digitalMeters: v }),
    resetLab: () => set(initial(p)),
  }));

  store.subscribe((s) => {
    try {
      const {
        wires,
        wireColor,
        controls,
        rows,
        checkRows,
        activeRow,
        stepsDone,
        part,
        benches,
        solutionUsed,
        showReadout,
        meterError,
        digitalMeters,
      } = s;
      localStorage.setItem(
        key,
        JSON.stringify({
          wires,
          wireColor,
          controls,
          rows,
          checkRows,
          activeRow,
          stepsDone,
          part,
          benches,
          solutionUsed,
          showReadout,
          meterError,
          digitalMeters,
        }),
      );
    } catch {
      /* storage unavailable: progress just isn't saved */
    }
  });

  stores.set(p.id, store);
  return store;
}
