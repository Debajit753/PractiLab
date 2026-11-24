import { describe, expect, it } from 'vitest';
import { beeeCatalog } from '../practicals/catalog';
import { stepsOfPart, type PracticalDef } from '../practicals/types';
import { runAuto, type LabSnapshot } from './autoStep';
import { analyze, defaultControls } from './circuit';

const practicals = beeeCatalog.map((c) => c.practical).filter((p): p is PracticalDef => !!p);

/** Run a practical from an empty kit using only "Next step". */
function runAll(p: PracticalDef) {
  let snap: LabSnapshot = {
    wires: [],
    controls: defaultControls(p.kit),
    rows: Array.from({ length: p.defaultRows }, () => ({})),
    checkRows: Array.from({ length: p.defaultRows }, () => ({})),
    activeRow: 0,
  };
  const stepResults: { step: number; ticks: boolean; overCurrent: boolean }[] = [];
  p.steps.forEach((step, i) => {
    snap = runAuto(p, i, snap, () => 'red');
    const an = analyze(p.kit, snap.wires, snap.controls);
    stepResults.push({
      step: i + 1,
      ticks: step.check({ an, rows: snap.checkRows, controls: snap.controls }),
      overCurrent: an.overCurrent,
    });
  });
  return { snap, stepResults };
}

describe('Next step completes every practical', () => {
  for (const p of practicals) {
    it(`${p.short}: every step ticks and every result is verified`, () => {
      const { snap, stepResults } = runAll(p);
      for (const s of stepResults) {
        expect(s, `step ${s.step}`).toEqual({ step: s.step, ticks: true, overCurrent: false });
      }
      for (const v of p.verifications ?? []) {
        const pairs = snap.rows
          .map((r) => [v.lhs(r, snap.rows), v.rhs(r, snap.rows)])
          .filter(([a, b]) => a != null && b != null) as [number, number][];
        expect(pairs.length, v.title).toBeGreaterThan(0);
        for (const [a, b] of pairs) expect(Math.abs(a - b) / Math.abs(a), `${v.title}: ${a} vs ${b}`).toBeLessThan(0.05);
      }
      for (const block of p.results?.(snap.rows) ?? []) {
        if (block.ok !== undefined) expect(block.ok, `${block.title}: ${block.lines.join(' ')}`).toBe(true);
      }
    });
  }
});

describe('KCL and KVL are separate procedures', () => {
  const p = practicals.find((x) => x.id === 'kcl-kvl')!;
  const kvl = p.parts!.find((x) => x.id === 'kvl')!;

  it('KVL alone, from an empty kit, completes and records only KVL readings', () => {
    let snap: LabSnapshot = {
      wires: [],
      controls: defaultControls(p.kit),
      rows: Array.from({ length: p.defaultRows }, () => ({})),
      checkRows: Array.from({ length: p.defaultRows }, () => ({})),
      activeRow: 0,
    };
    stepsOfPart(p, kvl).forEach((i) => {
      snap = runAuto(p, i, snap, () => 'red');
      const an = analyze(p.kit, snap.wires, snap.controls);
      expect(p.steps[i].check({ an, rows: snap.checkRows, controls: snap.controls }), `KVL step ${i}`).toBe(true);
      expect(an.overCurrent).toBe(false);
    });
    const keys = new Set(snap.rows.flatMap((r) => Object.keys(r).filter((k) => r[k] != null)));
    expect([...keys].sort()).toEqual([...kvl.keys].sort());
    expect(snap.rows.filter((r) => kvl.keys.every((k) => r[k] != null)).length).toBeGreaterThanOrEqual(3);
  });
});
