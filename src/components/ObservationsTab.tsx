import type { PracticalDef, Row } from '../practicals/types';
import { getLabStore } from '../store';
import { Plot } from './Plot';

const PASS_PCT = 5;

const fmt = (v: number | null | undefined, d: number) => (v == null || Number.isNaN(v) ? '' : v.toFixed(d));
const pctDiff = (a: number, b: number) => (Math.abs(a - b) / Math.max(Math.abs(a), 1e-9)) * 100;

function NumCell({
  value,
  onChange,
  label,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  label: string;
}) {
  return (
    <input
      className="cell-input"
      type="number"
      step="any"
      aria-label={label}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  );
}

function Calculations({ practical, rows }: { practical: PracticalDef; rows: Row[] }) {
  const theoryFor = practical.theoryFor;
  if (!theoryFor) return null;
  const blocks = rows
    .map((r, i) => ({ r, i, th: theoryFor(r, rows) }))
    .filter((x) => x.th && Object.keys(x.th).some((k) => x.r[k] != null));
  return (
    <section>
      <h2>Calculations: theory vs measured</h2>
      {blocks.length === 0 ? (
        <p className="muted">Record a reading to compare it with the theoretical values.</p>
      ) : (
        blocks.map(({ r, i, th }) => (
          <div key={i} className="calc-block">
            <h3>Reading {i + 1}</h3>
            <div className="table-scroll">
              <table className="table num">
                <thead>
                  <tr>
                    <th>Quantity</th>
                    <th>Measured</th>
                    <th>Theoretical</th>
                    <th>% error</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(th!)
                    .filter(([k]) => r[k] != null && practical.measured[k])
                    .map(([k, t]) => {
                      const m = practical.measured[k];
                      const e = pctDiff(t, r[k] as number);
                      return (
                        <tr key={k}>
                          <td>
                            {m.label} ({m.unit})
                          </td>
                          <td>{fmt(r[k], m.decimals)}</td>
                          <td>{fmt(t, m.decimals)}</td>
                          <td className={e > PASS_PCT ? 'bad' : ''}>{e.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

export function ObservationsTab({ practical }: { practical: PracticalDef }) {
  const s = getLabStore(practical)();
  const custom = practical.results?.(s.rows) ?? [];

  return (
    <div className="doc">
      <div className="print-only">
        <h1>{practical.title}</h1>
        <h2>Aim</h2>
        <p>{practical.aim}</p>
        <h2>Apparatus</h2>
        <ul>
          {practical.apparatus.map((a) => (
            <li key={a.name}>
              {a.name}: {a.spec} ({a.qty})
            </li>
          ))}
        </ul>
      </div>

      <section>
        <div className="section-head">
          <h2>Observations</h2>
          <div className="no-print">
            {practical.example && (
              <button
                className="btn"
                title={practical.example.note}
                onClick={() => {
                  const hasData = s.rows.some((r) => Object.values(r).some((v) => v != null));
                  if (hasData && !confirm('Replace your readings with the example values?')) return;
                  s.setRows(practical.example!.rows);
                }}
              >
                {practical.example.label}
              </button>
            )}
            <button className="btn" disabled={s.rows.length >= practical.maxRows} onClick={s.addRow}>
              Add reading
            </button>
            <button className="btn primary" onClick={() => window.print()}>
              Save as PDF
            </button>
          </div>
        </div>
        {practical.example && <p className="muted small no-print">{practical.example.note}</p>}
        <p className="muted no-print">
          Readings saved with <b>Record reading</b> on the Workbench appear here. You can also type or correct values. The
          highlighted row is where the next recording goes.
        </p>

        {practical.tables.map((t) => (
          <div key={t.title} className="obs-table">
            <h3>{t.title}</h3>
            <div className="table-scroll">
              <table className="table num">
                <thead>
                  <tr>
                    <th>S. No.</th>
                    {t.columns.map((col) => (
                      <th key={col.key} className={col.derived ? 'derived' : ''}>
                        {col.label} ({col.unit})
                      </th>
                    ))}
                    <th className="no-print" />
                  </tr>
                </thead>
                <tbody>
                  {s.rows.map((r, i) => (
                    <tr key={i} className={i === s.activeRow ? 'active' : ''} onClick={() => s.setActiveRow(i)}>
                      <td>{i + 1}</td>
                      {t.columns.map((col) => (
                        <td key={col.key} className={col.derived ? 'derived' : ''}>
                          {col.derived ? (
                            fmt(col.derived(r, s.rows), col.decimals)
                          ) : (
                            <>
                              <NumCell
                                value={r[col.key]}
                                label={`${col.label} reading ${i + 1}`}
                                onChange={(v) => s.setCell(i, col.key, v)}
                              />
                              <span className="print-only">{fmt(r[col.key], col.decimals)}</span>
                            </>
                          )}
                        </td>
                      ))}
                      <td className="no-print">
                        <button
                          className="link danger"
                          disabled={s.rows.length <= 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete reading ${i + 1}?`)) s.removeRow(i);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      {practical.plots?.length ? (
        <section>
          <h2>Graphs</h2>
          <div className="plots">
            {practical.plots.map((p) => (
              <Plot key={p.title} def={p} rows={s.rows} />
            ))}
          </div>
        </section>
      ) : null}

      <Calculations practical={practical} rows={s.rows} />

      <section>
        <h2>Result</h2>
        {(practical.verifications ?? []).map((v) => {
          const rows = s.rows
            .map((r, i) => ({ i, l: v.lhs(r, s.rows), rr: v.rhs(r, s.rows) }))
            .filter((x) => x.l != null && x.rr != null) as { i: number; l: number; rr: number }[];
          const worst = rows.reduce((m, x) => Math.max(m, pctDiff(x.l, x.rr)), 0);
          const ok = rows.length > 0 && worst <= PASS_PCT;
          return (
            <div key={v.title} className="result-block">
              <h3>
                {v.title}: <span className="mono">{v.law}</span>
              </h3>
              {rows.length === 0 ? (
                <p className="muted">No readings yet.</p>
              ) : (
                <>
                  <div className="table-scroll">
                    <table className="table num">
                      <thead>
                        <tr>
                          <th>Reading</th>
                          <th>
                            {v.lhsLabel} ({v.unit})
                          </th>
                          <th>
                            {v.rhsLabel} ({v.unit})
                          </th>
                          <th>Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((x) => (
                          <tr key={x.i}>
                            <td>{x.i + 1}</td>
                            <td>{x.l.toFixed(2)}</td>
                            <td>{x.rr.toFixed(2)}</td>
                            <td className={pctDiff(x.l, x.rr) > PASS_PCT ? 'bad' : ''}>{pctDiff(x.l, x.rr).toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className={`verdict ${ok ? 'ok' : 'bad'}`}>
                    {ok
                      ? `Verified. ${v.lhsLabel} and ${v.rhsLabel} agree within ${worst.toFixed(1)}% in all ${rows.length} reading${rows.length > 1 ? 's' : ''}, which is within the expected experimental error.`
                      : `Not verified yet. The largest difference is ${worst.toFixed(1)}%. Check the meter connections and readings for the rows marked in red.`}
                  </p>
                </>
              )}
            </div>
          );
        })}
        {custom.map((b) => (
          <div key={b.title} className="result-block">
            <h3>{b.title}</h3>
            <div className={b.ok === undefined ? '' : `verdict ${b.ok ? 'ok' : 'bad'}`}>
              {b.lines.map((l, i) => (
                <p key={i} style={{ margin: '4px 0' }}>
                  {l}
                </p>
              ))}
            </div>
          </div>
        ))}
        {s.solutionUsed && <p className="muted small">Note: "Show solution" or "Next step" did some of this work for you.</p>}
      </section>

      <section className="no-print">
        <h2>Viva questions</h2>
        {practical.viva.map((q, i) => (
          <details key={i} className="viva">
            <summary>
              {i + 1}. {q.q}
            </summary>
            <p>{q.a}</p>
          </details>
        ))}
      </section>

      <section className="no-print">
        <button
          className="btn danger"
          onClick={() => {
            if (confirm('Start this practical again? Your cords and all readings will be cleared.')) s.resetLab();
          }}
        >
          Start this practical again
        </button>
      </section>
    </div>
  );
}
