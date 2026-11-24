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

export interface StepDef {
  text: string;
  check: (ctx: StepContext) => boolean;
  /** Sockets to flash when the student asks for a hint. Read in pairs, they are also the cords this step needs. */
  hint?: string[];
  /** The hint sockets are not cord pairs (e.g. a step that removes or moves cords). */
  noCords?: boolean;
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
  /** Ready-made readings (e.g. a real lab record) that can be loaded to see the tables, graph and result. */
  example?: { label: string; note: string; rows: Row[] };
  /** Practical source notes, e.g. which Virtual Labs experiment it follows. */
  reference?: { label: string; url: string };
}
