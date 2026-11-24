import { useEffect, useMemo, useState } from 'react';
import { analyze, type MeterReading } from '../engine/circuit';
import { UNIT_FACTOR, type MeterUnit, type SocketColor } from '../kits/types';
import type { PracticalDef } from '../practicals/types';
import { getLabStore, type WireColorChoice } from '../store';
import { KitPanel } from './panel/KitPanel';
import { digitalDecimals } from './panel/Meter';
import { WIRE_COLORS } from './panel/parts';

const COLOR_CHOICES: WireColorChoice[] = ['auto', 'red', 'black', 'yellow', 'blue', 'green'];

/**
 * The value a student writes down: the digits shown on a digital display or
 * readout, or else a fifth of the smallest division on an analog scale.
 */
function readOff(display: number, r: MeterReading, digital: boolean) {
  if (digital) {
    const f = 10 ** digitalDecimals(r.range.full);
    return Math.round(display * f) / f;
  }
  const div = r.range.full / (r.range.majors * r.range.minorsPerMajor);
  const step = div / 5;
  return Math.round(display / step) * step;
}

export function meterName(r: MeterReading) {
  const what = r.meter.kind === 'V' ? 'Voltmeter' : r.range.unit === 'µA' ? 'Microammeter' : 'Milliammeter';
  return `${what} (0-${r.range.full} ${r.range.unit})`;
}

const unitFactor = (u: string) => (u in UNIT_FACTOR ? UNIT_FACTOR[u as MeterUnit] : 1);

export function Workbench({ practical }: { practical: PracticalDef }) {
  const store = getLabStore(practical);
  const s = store();
  const kit = practical.kit;
  const c = s.controls;
  const [selectedWire, setSelectedWire] = useState<string | null>(null);
  const [hintFor, setHintFor] = useState<number | null>(null);
  const [showCord, setShowCord] = useState(false);
  const [toast, setToast] = useState<{ text: string; kind: 'ok' | 'warn' } | null>(null);

  const an = useMemo(() => analyze(kit, s.wires, c), [kit, s.wires, c]);
  const powered = c.mains && !c.fuseBlown;
  const digital = s.digitalMeters;

  // Blow the fuse when the wiring shorts a supply.
  useEffect(() => {
    if (an.overCurrent && powered) s.blowFuse();
  }, [an.overCurrent, powered]);

  // Fixed per-visit meter error, used only when the "real-world error" option is on.
  const errorFactor = useMemo(
    () => Object.fromEntries(kit.meters.map((m) => [m.id, 1 + (Math.random() * 2 - 1) * 0.015])),
    [kit],
  );
  const readings = kit.meters.map((m) => {
    const r = an.readings[m.id];
    return { ...r, display: r.display * (s.meterError ? errorFactor[m.id] : 1) };
  });
  const meterValues = Object.fromEntries(readings.map((r) => [r.meter.id, r.display]));

  // Procedure steps tick themselves off and stay ticked.
  const live = practical.steps.map((st) => st.check({ an, rows: s.rows, controls: c }));
  useEffect(() => {
    const done = live.flatMap((ok, i) => (ok ? [i] : []));
    if (done.some((i) => !s.stepsDone.includes(i))) s.markSteps(done);
  });
  const current = practical.steps.findIndex((_, i) => !s.stepsDone.includes(i));
  useEffect(() => {
    setHintFor(null);
    setShowCord(false);
  }, [current]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const colorFor = (socket: string): SocketColor => {
    if (s.wireColor !== 'auto') return s.wireColor;
    return kit.sockets.find((x) => x.id === socket)?.color ?? 'red';
  };

  const record = () => {
    if (!powered) {
      setToast({ text: 'Switch the mains ON first. With no supply every meter reads zero.', kind: 'warn' });
      return;
    }
    const values: Record<string, number> = {};
    const saved: string[] = [];
    const skipped: string[] = [];
    const ignored: string[] = [];
    const replaced: string[] = [];
    // While a step is current, save only the readings it asks for (stray meters stay out of the table).
    const allowed = current >= 0 ? practical.steps[current].records : undefined;
    let flipped = false;
    for (const r of readings) {
      if (!r.measurement) continue;
      if (!digital && r.display < -r.range.full * 0.01) {
        skipped.push(`${meterName(r)} is deflecting backwards`);
        continue;
      }
      const m = practical.measured[r.measurement.key];
      if (allowed && !allowed.includes(r.measurement.key)) {
        ignored.push(m?.label ?? r.measurement.key);
        continue;
      }
      const si = readOff(r.display, r, digital || s.showReadout) / UNIT_FACTOR[r.range.unit];
      // Meter wired against the marked direction but reading forwards: the quantity is negative.
      const sign = r.reversed ? -1 : 1;
      if (r.reversed && Math.abs(si) > 0) flipped = true;
      const v = +(sign * si * unitFactor(m?.unit ?? '')).toFixed(6);
      const old = s.rows[s.activeRow]?.[r.measurement.key];
      if (old != null && Math.abs(old - v) > 1e-9) replaced.push(`${m?.label ?? r.measurement.key} (was ${old})`);
      values[r.measurement.key] = v;
      saved.push(`${m?.label ?? r.measurement.key} = ${v.toFixed(m?.decimals ?? 2)} ${m?.unit ?? ''}`);
    }
    if (flipped) skipped.push('A negative value means the current flows opposite to the arrow marked on the kit');
    if (!saved.length) {
      setToast({
        text: skipped.length
          ? `${skipped.join(', ')}. Swap its + and − cords, then record.`
          : ignored.length
            ? `This step does not use ${ignored.join(', ')}. Connect the meter as the current step says.`
            : 'Nothing to record. Connect a meter across a part of the circuit first.',
        kind: 'warn',
      });
      return;
    }
    const extras = practical.recordExtras?.(c) ?? {};
    for (const [k, v] of Object.entries(extras)) {
      const m = practical.measured[k];
      if (m && m.unit === 'Ω') saved.push(`${m.label} = ${v} ${m.unit}`);
    }
    const row = s.activeRow;
    s.setCells(row, { ...values, ...extras });
    const merged = { ...s.rows[row], ...values, ...extras };
    const complete = practical.advanceWhen?.some((g) => g.every((k) => merged[k] != null) && g.some((k) => k in values));
    let note = '';
    if (complete) {
      if (row + 1 < s.rows.length) {
        s.setActiveRow(row + 1);
        note = ` Next: reading ${row + 2}.`;
      } else if (s.rows.length < practical.maxRows) {
        s.addRow();
        note = ` Added reading ${row + 2}.`;
      }
    }
    setToast({
      text: `Saved in reading ${row + 1}: ${saved.join(', ')}.${replaced.length ? ` Replaced ${replaced.join(', ')}.` : ''}${ignored.length ? ` Not saved (not needed in this step): ${ignored.join(', ')}.` : ''}${skipped.length ? ` ${skipped.join(', ')}.` : ''}${note}`,
      kind: 'ok',
    });
  };

  const warnings: string[] = [...(practical.warnings?.({ an, rows: s.rows, controls: c }) ?? [])];
  if (c.fuseBlown)
    warnings.push(
      'Fuse blown! A supply was shorted, usually by an ammeter or a cord placed straight across it (or a decade box set to 0 Ω across it). Fix the wiring, then press Replace fuse.',
    );
  for (const r of readings) {
    if (r.display < -r.range.full * 0.01)
      warnings.push(
        digital
          ? `${meterName(r)} shows a minus sign: its + and − cords are the other way round from the marked direction.`
          : `${meterName(r)} is deflecting backwards: its + and − cords are the wrong way round.`,
      );
    if (Math.abs(r.display) > r.range.full * (digital ? 1.1 : 1.02))
      warnings.push(
        `${meterName(r)} is over range. ${r.meter.ranges.length > 1 ? 'Switch to a higher range or turn the supply down.' : 'Turn the supply down.'}`,
      );
  }

  const hintSockets = hintFor != null ? (practical.steps[hintFor]?.hint ?? []) : [];

  // Next cord the current step still needs (hint sockets read in pairs).
  const step = current >= 0 ? practical.steps[current] : undefined;
  const stepCords: [string, string][] = [];
  if (step?.hint && !step.noCords)
    for (let i = 0; i + 1 < step.hint.length; i += 2) stepCords.push([step.hint[i], step.hint[i + 1]]);
  const nextCord = stepCords.find(([a, b]) => !an.bridged(a, b)) ?? null;
  const ghost = showCord ? nextCord : null;
  const sockName = (id: string) => kit.sockets.find((x) => x.id === id)?.name ?? id;

  // Suggest a lower range when the reading would fit it.
  const rangeTip = (r: MeterReading) => {
    if (r.meter.ranges.length < 2) return null;
    const v = Math.abs(r.display) / UNIT_FACTOR[r.range.unit];
    const better = r.meter.ranges
      .filter((x) => x.full / UNIT_FACTOR[x.unit] < r.range.full / UNIT_FACTOR[r.range.unit])
      .filter((x) => v < (x.full / UNIT_FACTOR[x.unit]) * 0.95)
      .sort((x, y) => x.full / UNIT_FACTOR[x.unit] - y.full / UNIT_FACTOR[y.unit])[0];
    return v > 0 && better ? `Tip: switch to 0-${better.full} ${better.unit} for a finer reading.` : null;
  };
  const row = s.rows[s.activeRow] ?? {};

  return (
    <div className="workbench">
      <div className="bench-main">
        <KitPanel
          kit={kit}
          wires={s.wires}
          meterValues={meterValues}
          showDigital={s.showReadout && !digital}
          digital={digital}
          controls={c}
          powered={powered}
          hintSockets={hintSockets}
          ghost={ghost}
          selectedWire={selectedWire}
          colorFor={colorFor}
          onSelectWire={setSelectedWire}
          onAddWire={(a, b) => s.addWire(a, b, colorFor(a))}
          onRemoveWire={(id) => s.removeWire(id)}
          onMains={(on) =>
            c.fuseBlown
              ? setToast({ text: 'The fuse is blown. Press Replace fuse first.', kind: 'warn' })
              : s.setControl('mains', on)
          }
          onKnob={(id, v) => s.setControlItem('knobs', id, v)}
          onDecade={(id, v) => s.setControlItem('decades', id, v)}
          onSwitch={(id, v) => s.setControlItem('switches', id, v)}
          onRange={(id, i) => s.setControlItem('ranges', id, i)}
        />
        <div className="bench-toolbar">
          <div className="swatches" role="radiogroup" aria-label="Cord colour">
            <span className="muted">Cord colour</span>
            {COLOR_CHOICES.map((col) => (
              <button
                key={col}
                role="radio"
                aria-checked={s.wireColor === col}
                title={col === 'auto' ? 'Match the socket colour' : col}
                className={`swatch ${s.wireColor === col ? 'on' : ''}`}
                style={col === 'auto' ? undefined : { background: WIRE_COLORS[col].body }}
                onClick={() => s.setWireColor(col)}
              >
                {col === 'auto' ? 'Auto' : ''}
              </button>
            ))}
          </div>
          <div className="toolbar-buttons">
            {selectedWire && (
              <button
                className="btn"
                onClick={() => {
                  s.removeWire(selectedWire);
                  setSelectedWire(null);
                }}
              >
                Remove cord
              </button>
            )}
            <button
              className="btn"
              onClick={() => {
                if (s.wires.length && !confirm('Remove all cords from the kit?')) return;
                s.clearWires();
              }}
            >
              Clear all cords
            </button>
            <button
              className="btn"
              onClick={() => {
                if (!confirm('Wire the kit for you? This replaces your cords and is noted in your results as "solution used".'))
                  return;
                s.setWires(kit.solution, colorFor);
              }}
            >
              Show solution
            </button>
            {c.fuseBlown && (
              <button className="btn danger" onClick={s.resetFuse}>
                Replace fuse
              </button>
            )}
          </div>
        </div>
        <p className="muted small how-to">
          <b>Wiring:</b> drag from one socket to another, or click one socket and then another. Click a cord to select it and
          press Delete, or right-click / double-click a cord to remove it. <b>Knobs:</b> drag around them, scroll over them, or
          use the arrow keys (Shift for fine steps). <b>Dials and switches:</b> click (right-click turns a dial back).
        </p>
      </div>

      <aside className="bench-side">
        {warnings.map((w, i) => (
          <div key={i} className="alert warn">
            {w}
          </div>
        ))}

        <section className="card">
          <h3>Meters</h3>
          {readings.map((r) => (
            <div key={r.meter.id} className="reading">
              <div className="reading-head">
                <span className="reading-name">{meterName(r)}</span>
                {(s.showReadout || digital) && (
                  <span className="reading-val">
                    {r.display.toFixed(digitalDecimals(r.range.full))} {r.range.unit}
                  </span>
                )}
              </div>
              <div className="reading-what">
                {!r.connected
                  ? 'Not connected'
                  : r.measurement
                    ? `Measuring ${r.measurement.label}${r.reversed ? ' (reversed)' : ''}`
                    : 'Not across a part used in this step'}
              </div>
              {powered && rangeTip(r) && <div className="range-tip">{rangeTip(r)}</div>}
            </div>
          ))}
          <div className="record-row">
            <label>
              Record into{' '}
              <select value={s.activeRow} onChange={(e) => s.setActiveRow(+e.target.value)}>
                {s.rows.map((_, i) => (
                  <option key={i} value={i}>
                    Reading {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn primary" onClick={record}>
              Record reading
            </button>
          </div>
          <div className="row-chips">
            {Object.entries(practical.measured).map(([k, m]) => (
              <span
                key={k}
                className={`chip ${row[k] != null ? 'filled' : ''}`}
                title={row[k] != null ? `${row[k]} ${m.unit}` : 'not recorded'}
              >
                {m.label}
                {row[k] != null ? ` ${(row[k] as number).toFixed(m.decimals)}` : ''}
              </span>
            ))}
          </div>
          {toast && <div className={`alert ${toast.kind}`}>{toast.text}</div>}
          <div className="options">
            <label>
              <input type="checkbox" checked={digital} onChange={(e) => s.setDigitalMeters(e.target.checked)} /> Digital panel
              meters (like many college kits)
            </label>
            {!digital && (
              <label>
                <input type="checkbox" checked={s.showReadout} onChange={(e) => s.setShowReadout(e.target.checked)} /> Digital
                readout on each meter (untick to practise reading the needle)
              </label>
            )}
            <label>
              <input type="checkbox" checked={s.meterError} onChange={(e) => s.setMeterError(e.target.checked)} /> Real-world
              meter error (±1.5%)
            </label>
          </div>
        </section>

        <section className="card">
          <h3>Procedure</h3>
          <ol className="steps">
            {practical.steps.map((st, i) => {
              const done = s.stepsDone.includes(i);
              return (
                <li key={i} className={done ? 'done' : i === current ? 'current' : ''}>
                  <span className="tick" aria-hidden>
                    {done ? '✓' : i + 1}
                  </span>
                  <div>
                    <div>{st.text}</div>
                    {i === current && (st.hint?.length || st.hintText) && (
                      <div className="step-hint">
                        <div className="hint-buttons">
                          <button className="link" onClick={() => setHintFor(hintFor === i ? null : i)}>
                            {hintFor === i ? 'Hide hint' : 'Hint'}
                          </button>
                          {nextCord && (
                            <button className="link" onClick={() => setShowCord(!showCord)}>
                              {showCord ? 'Hide next cord' : 'Show next cord'}
                            </button>
                          )}
                        </div>
                        {showCord && nextCord && (
                          <span className="small next-cord">
                            Next cord: <b>{sockName(nextCord[0])}</b> to <b>{sockName(nextCord[1])}</b> (the flashing orange
                            line).{' '}
                            <button className="link" onClick={() => s.addWire(nextCord[0], nextCord[1], colorFor(nextCord[0]))}>
                              Place it for me
                            </button>
                          </span>
                        )}
                        {hintFor === i && (
                          <span className="muted small">
                            {st.hintText ??
                              `Use the flashing sockets: ${st.hint!.map((h) => kit.sockets.find((x) => x.id === h)?.name).join(', ')}.`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {current === -1 && <div className="alert ok">All steps done. Open the Observations tab to see your result.</div>}
        </section>
      </aside>
    </div>
  );
}
