import type { PracticalDef } from '../practicals/types';

export function TheoryTab({ practical }: { practical: PracticalDef }) {
  const Schematic = practical.schematic;
  const ex = practical.expected;
  return (
    <div className="doc">
      <section>
        <h2>Aim</h2>
        <p>{practical.aim}</p>
      </section>

      <section>
        <h2>Apparatus required</h2>
        <table className="table">
          <thead>
            <tr>
              <th>S. No.</th>
              <th>Apparatus</th>
              <th>Range / specification</th>
              <th>Qty</th>
            </tr>
          </thead>
          <tbody>
            {practical.apparatus.map((a, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{a.name}</td>
                <td>{a.spec}</td>
                <td>{a.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Theory</h2>
        {practical.theory.map((t) => (
          <div key={t.heading}>
            <h3>{t.heading}</h3>
            {t.body.map((b, i) => (
              <p key={i}>{b}</p>
            ))}
          </div>
        ))}
      </section>

      <section>
        <h2>Circuit diagram</h2>
        <div className="schematic">
          <Schematic />
        </div>
      </section>

      <section>
        <h2>Formulas</h2>
        <table className="table">
          <tbody>
            {practical.formulas.map((f) => (
              <tr key={f.label}>
                <td>{f.label}</td>
                <td className="mono">{f.expr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {ex && (
        <section>
          <h2>Expected readings (theoretical)</h2>
          <p className="muted">{ex.caption}</p>
          <div className="table-scroll">
            <table className="table num">
              <thead>
                <tr>
                  {ex.columns.map((c) => (
                    <th key={c.key}>
                      {c.label} ({c.unit})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ex.rows.map((r, i) => (
                  <tr key={i}>
                    {ex.columns.map((c) => (
                      <td key={c.key}>{r[c.key]?.toFixed(c.decimals)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2>Precautions</h2>
        <ul>
          {practical.precautions.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      {practical.reference && (
        <p className="muted small">
          Also see the matching experiment on Virtual Labs:{' '}
          <a href={practical.reference.url} target="_blank" rel="noreferrer">
            {practical.reference.label}
          </a>
        </p>
      )}
    </div>
  );
}
