import { UNIT_FACTOR, type MeterUnit } from '../kits/types';
import type { MeterReading } from './circuit';

/** Decimal places a 3½-digit panel meter shows on this range. */
export function digitalDecimals(full: number) {
  return full <= 2 ? 3 : full <= 50 ? 2 : full <= 500 ? 1 : 0;
}

/**
 * The value a student writes down, in the meter's display units: the digits
 * shown on a digital display or readout, or else a fifth of the smallest
 * division on an analog scale.
 */
export function readOff(display: number, r: MeterReading, digital: boolean) {
  if (digital) {
    const f = 10 ** digitalDecimals(r.range.full);
    return Math.round(display * f) / f;
  }
  const div = r.range.full / (r.range.majors * r.range.minorsPerMajor);
  const step = div / 5;
  return Math.round(display / step) * step;
}

export const unitFactor = (u: string) => (u in UNIT_FACTOR ? UNIT_FACTOR[u as MeterUnit] : 1);

/**
 * A meter reading converted to the unit of the observation table. A meter
 * wired against the marked direction but reading forwards gives a negative value.
 */
export function recordedValue(display: number, r: MeterReading, tableUnit: string, digital: boolean) {
  const si = readOff(display, r, digital) / UNIT_FACTOR[r.range.unit];
  const sign = r.reversed ? -1 : 1;
  return +(sign * si * unitFactor(tableUnit)).toFixed(6);
}
