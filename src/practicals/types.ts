import type { ComponentType } from 'react';
import type { Analysis, KitControls } from '../engine/circuit';
import type { KitDef } from '../kits/types';

export type Row = Record<string, number | null>;

/** A value from this row, or else from the first row that has it (for one-off readings like Vth). */
export function pick(r: Row, rows: Row[], key: string): number | null {
  if (r[key] != null) return r[key] as number;
  for (const x of rows) if (x[key] != null) return x[key] as number;
  return null;
}

export interface StepContext {
  an: Analysis;
  rows: Row[];
  controls: KitControls;
}

/** A number, or one worked out from the readings so far (e.g. "set RTH to the measured Rth"). */
export type AutoValue = number | ((rows: Row[]) => number);

/** One action of a step carried out for the student by "Next step". */
export type AutoAction =
  /** Pull every cord out of these sockets. */
  | { do: 'unplug'; sockets: string[] }
  /** Pull out these cords. */
  | { do: 'remove'; pairs: [string, string][] }
  /** Plug in these cords (already present ones are left alone). */
  | { do: 'add'; pairs: [string, string][] }
  /** Set controls: mains switch, knobs, decade boxes, switches and meter ranges. */
  | {
      do: 'set';
      mains?: boolean;
      knobs?: Record<string, AutoValue>;
      decades?: Record<string, AutoValue>;
      switches?: Record<string, 'a' | 'b'>;
      ranges?: Record<string, number>;
    }
  /** Turn a knob until a meter reads the target (in volts or amps). */
  | { do: 'seek'; knob: string; meter: string; target: AutoValue }
  /** Choose the reading row: a number, or 'empty' for this row if empty, else the next empty one. */
  | { do: 'row'; row: number | 'empty' }
  /** Press Record reading. */
  | { do: 'record' };

/** A separate procedure within one practical (e.g. KCL and KVL), chosen with a switch on the Workbench. */
export interface PartDef {
  id: string;
  label: string;
  /** Readings this part records. Record saves only these while the part is selected. */
  keys: string[];
  /** Save a meter's reading under another key in this part (e.g. the KVL supply voltage, kept apart from KCL's). */
  alias?: Record<string, string>;
}

/** The part a step belongs to (undefined when the practical has one procedure). */
export const partOfStep = (p: PracticalDef, step: StepDef) => p.parts?.find((x) => x.id === step.part);
/** Indices of the steps in a part, or every step when there are no parts. */
export const stepsOfPart = (p: PracticalDef, part?: PartDef) =>
  p.steps.flatMap((st, i) => (!part || st.part === part.id ? [i] : []));
/** The key a meter's reading is saved under in this part. */
export const keyInPart = (part: PartDef | undefined, key: string) => part?.alias?.[key] ?? key;

export interface StepDef {
  text: string;
  /** Which part of the practical this step belongs to (see PracticalDef.parts). */
  part?: string;
  check: (ctx: StepContext) => boolean;
  /** Sockets to flash when the student asks for a hint. Read in pairs, they are also the cords this step needs. */
  hint?: string[];
  /** The hint sockets are not cord pairs (e.g. a step that removes or moves cords). */
  noCords?: boolean;
  /** Readings this step asks for. While it is the current step, Record saves only these. */
  records?: string[];
  /** What "Next step" does to complete this step for the student. */
  auto?: AutoAction[];
  hintText?: string;
}

export interface ColumnDef {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  /** Calculated columns are read-only. */
  derived?: (r: Row, rows: Row[]) => number | null;
}

export interface TableDef {
  title: string;
  columns: ColumnDef[];
}

export interface VerificationDef {
  title: string;
  law: string;
  lhsLabel: string;
  rhsLabel: string;
  lhs: (r: Row, rows: Row[]) => number | null;
  rhs: (r: Row, rows: Row[]) => number | null;
  unit: string;
}

export interface PlotDef {
  title: string;
  xLabel: string;
  yLabel: string;
  points: (rows: Row[]) => [number, number][];
  /** Mark the highest point (e.g. maximum power). */
  markMax?: boolean;
  /** Optional theoretical curve drawn as a dashed line. */
  theory?: (x: number, rows: Row[]) => number | null;
}

export interface ResultBlock {
  title: string;
  lines: string[];
  ok?: boolean;
}

export interface PracticalDef {
  id: string;
  title: string;
  short: string;
  kit: KitDef;
  aim: string;
  apparatus: { name: string; spec: string; qty: string }[];
  theory: { heading: string; body: string[] }[];
  schematic: ComponentType;
  formulas: { label: string; expr: string }[];
  precautions: string[];
  steps: StepDef[];
  /** Separate procedures (e.g. KCL and KVL) the student switches between. Each step names its part. */
  parts?: PartDef[];
  /** Keys recorded from meters or controls, with units and display decimals. */
  measured: Record<string, { label: string; unit: string; decimals: number }>;
  /** Values copied from kit controls into the row on every recording (e.g. RL from the decade box). */
  recordExtras?: (controls: KitControls) => Record<string, number>;
  /** After recording, move to the next row once any of these key groups is complete in the row. */
  advanceWhen?: string[][];
  tables: TableDef[];
  verifications?: VerificationDef[];
  results?: (rows: Row[]) => ResultBlock[];
  plots?: PlotDef[];
  /** Theoretical value of measured keys for one row, or null if the row lacks inputs. */
  theoryFor?: (r: Row, rows: Row[]) => Record<string, number> | null;
  expected?: {
    caption: string;
    columns: { key: string; label: string; unit: string; decimals: number }[];
    rows: Record<string, number>[];
  };
  viva: { q: string; a: string }[];
  defaultRows: number;
  maxRows: number;
  /** Extra wiring warnings shown on the Workbench (e.g. two circuits joined by mistake). */
  warnings?: (ctx: StepContext) => string[];
  /** Ready-made readings (e.g. a real lab record) that can be loaded to see the tables, graph and result. */
  example?: { label: string; note: string; rows: Row[] };
  /** Practical source notes, e.g. which Virtual Labs experiment it follows. */
  reference?: { label: string; url: string };
}
