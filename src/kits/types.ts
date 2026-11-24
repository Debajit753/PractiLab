/**
 * A kit is described entirely by data: where sockets sit on the panel, which
 * sockets are joined by printed copper tracks, which parts sit between
 * sockets, and where the supplies, controls and meters are. Adding a new
 * practical means writing one of these definitions, not new drawing code.
 */

export type SocketColor = 'red' | 'black' | 'yellow' | 'blue' | 'green';
export type Pt = [number, number];

export interface SocketDef {
  id: string;
  x: number;
  y: number;
  color: SocketColor;
  /** Friendly name shown in hints, e.g. "INPUT +". */
  name: string;
}

export interface ResistorDef {
  id: string;
  /** Sockets (or internal points) at the two ends (electrical). */
  a: string;
  b: string;
  ohms: number;
  /** Drawing: zigzag from `from` to `to`. */
  from: Pt;
  to: Pt;
}

export interface TraceDef {
  points: Pt[];
  /** Dashed = a gap the student must bridge with a cord or a meter. */
  dashed?: boolean;
  arrow?: boolean;
}

export interface TextDef {
  x: number;
  y: number;
  text: string;
  size?: number;
  weight?: number;
  color?: string;
  anchor?: 'start' | 'middle' | 'end';
}

export type MeterUnit = 'V' | 'mA' | 'µA';

export interface MeterRange {
  /** Full-scale value in display units. */
  full: number;
  unit: MeterUnit;
  majors: number;
  minorsPerMajor: number;
  /** Internal resistance in ohms on this range. */
  ohms: number;
}

export interface MeterDef {
  id: string;
  /** What the meter measures: voltage or current. */
  kind: 'V' | 'A';
  cx: number;
  cy: number;
  plus: string;
  minus: string;
  /** One or more ranges. With more than one, a range switch is drawn. */
  ranges: MeterRange[];
}

export interface KnobDef {
  id: string;
  x: number;
  y: number;
  max: number;
  /** Text under the knob, e.g. ["SET", "VOLTS"]. */
  label: string[];
  size?: number;
  /** Arrow-key step (Shift gives a tenth of it). Default 0.1. */
  step?: number;
  /** Starting value. Default 0. */
  initial?: number;
  /** Show a calibrated value box under the knob with this unit (e.g. "Ω"). */
  readout?: string;
}

/** Potentiometer / rheostat: a resistor between two sockets whose value is a knob's value in ohms. */
export interface PotDef {
  id: string;
  a: string;
  b: string;
  knob: string;
  /** Smallest resistance (the wiper never reaches exactly 0). */
  min: number;
  from: Pt;
  to: Pt;
}

export interface SupplyDef {
  id: string;
  plus: string;
  minus: string;
  /** Knobs whose values add up to the output voltage (e.g. coarse + fine). */
  knobs: string[];
  maxV: number;
  /** Internal resistance in ohms. */
  rint: number;
}

export interface DecadeBoxDef {
  id: string;
  a: string;
  b: string;
  x: number;
  y: number;
  /** Multipliers of each dial, left to right, e.g. [1000, 100, 10, 1]. */
  dials: number[];
  title: string;
  initial: number;
}

export interface SwitchDef {
  id: string;
  common: string;
  /** Throw positions: the common point joins `a` or `b`. */
  a: string;
  b: string;
  x: number;
  y: number;
  labelA: string;
  labelB: string;
  initial: 'a' | 'b';
}

export interface DiodeModel {
  label: string;
  /** Saturation current (A), emission coefficient, and leakage resistance (ohm). */
  is: number;
  n: number;
  rleak: number;
}

export interface DiodeDef {
  id: string;
  anode: string;
  cathode: string;
  from: Pt;
  to: Pt;
  models: Record<string, DiodeModel>;
}

export interface QueryContext {
  sameNet: (a: string, b: string) => boolean;
  /** Joined by a cord, a track, or an ammeter. */
  bridged: (a: string, b: string) => boolean;
  switchPos: (id: string) => 'a' | 'b';
}

export interface MeasurementDef {
  /** Key into the observation table, e.g. "I1" or "VR2". */
  key: string;
  label: string;
  /** Meter + should go on pair[0], meter − on pair[1]. */
  pair: [string, string];
  /** Extra condition, e.g. "only while the load is disconnected". */
  when?: (q: QueryContext) => boolean;
}

export interface SymbolDef {
  kind: 'V' | 'mA';
  x: number;
  y: number;
}

export interface KitDef {
  id: string;
  width: number;
  height: number;
  title: string[];
  sockets: SocketDef[];
  resistors: ResistorDef[];
  /** Groups of sockets joined by printed tracks inside the kit. */
  hardNets: string[][];
  traces: TraceDef[];
  /** Junction dots drawn on tracks. */
  dots?: Pt[];
  texts: TextDef[];
  symbols: SymbolDef[];
  meters: MeterDef[];
  knobs: KnobDef[];
  supplies: SupplyDef[];
  decades?: DecadeBoxDef[];
  switches?: SwitchDef[];
  diodes?: DiodeDef[];
  /** Face plate colour (default cream). */
  face?: string;
  /** Start with digital panel meters instead of moving-coil meters. */
  defaultDigital?: boolean;
  pots?: PotDef[];
  /** Dashed outline boxes with a caption, e.g. an "equivalent circuit" section. */
  boxes?: { x: number; y: number; w: number; h: number; label?: string }[];
  /** The whole kit shares one fuse, in amps. */
  fuseA: number;
  mains: { led: Pt; toggle: Pt };
  voltageMeasurements: MeasurementDef[];
  currentMeasurements: MeasurementDef[];
  /** Cords that wire up the standard starting circuit. */
  solution: [string, string][];
}

export interface Wire {
  id: string;
  a: string;
  b: string;
  color: SocketColor;
}

export const UNIT_FACTOR: Record<MeterUnit, number> = { V: 1, mA: 1000, µA: 1e6 };
