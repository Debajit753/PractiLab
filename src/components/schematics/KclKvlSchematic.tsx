/** Textbook circuit diagram for the KCL and KVL practical. */
export function KclKvlSchematic() {
  const ink = 'var(--ink)';
  const zig = (x: number, y: number, w = 70) => {
    const pts = [`${x},${y}`, `${x + 8},${y}`];
    const n = 6;
    for (let i = 0; i < n; i++) pts.push(`${x + 8 + ((w - 16) * (i + 0.5)) / n},${y + (i % 2 ? -8 : 8)}`);
    pts.push(`${x + w - 8},${y}`, `${x + w},${y}`);
    return <polyline points={pts.join(' ')} fill="none" stroke={ink} strokeWidth={2} />;
  };
  const meter = (x: number, y: number, t: string) => (
    <g>
      <circle cx={x} cy={y} r={17} fill="var(--bg)" stroke={ink} strokeWidth={2} />
      <text x={x} y={y + 5} textAnchor="middle" fontSize={13} fontWeight={700} fill={ink}>
        {t}
      </text>
    </g>
  );
  const label = (x: number, y: number, t: string, anchor: 'start' | 'middle' | 'end' = 'middle') => (
    <text x={x} y={y} textAnchor={anchor} fontSize={13} fill={ink}>
      {t}
    </text>
  );
  const arrow = (x: number, y: number) => (
    <path d={`M ${x - 7} ${y - 5} L ${x + 3} ${y} L ${x - 7} ${y + 5} z`} fill="var(--accent)" />
  );

  return (
    <svg
      viewBox="0 0 560 300"
      role="img"
      aria-label="Circuit: supply Vs feeding R1 plus R2 in parallel with R3 plus R4, with a milliammeter in the return line"
    >
      {/* source */}
      <line x1={60} y1={60} x2={60} y2={128} stroke={ink} strokeWidth={2} />
      <line x1={40} y1={128} x2={80} y2={128} stroke={ink} strokeWidth={3} />
      <line x1={50} y1={140} x2={70} y2={140} stroke={ink} strokeWidth={3} />
      <line x1={60} y1={140} x2={60} y2={250} stroke={ink} strokeWidth={2} />
      {label(30, 125, '+')}
      {label(30, 150, '−')}
      {label(22, 100, 'Vs')}
      {/* top rail to node A */}
      <line x1={60} y1={60} x2={160} y2={60} stroke={ink} strokeWidth={2} />
      {arrow(110, 60)}
      {label(110, 50, 'I')}
      <circle cx={160} cy={60} r={4} fill={ink} />
      {label(168, 102, 'Node A', 'start')}
      {/* branch A */}
      {zig(180, 60)}
      <line x1={160} y1={60} x2={180} y2={60} stroke={ink} strokeWidth={2} />
      <line x1={250} y1={60} x2={300} y2={60} stroke={ink} strokeWidth={2} />
      {zig(300, 60)}
      <line x1={370} y1={60} x2={440} y2={60} stroke={ink} strokeWidth={2} />
      {label(215, 40, 'R1 = 50 Ω')}
      {label(335, 40, 'R2 = 100 Ω')}
      {arrow(278, 60)}
      {label(278, 80, 'I1')}
      {/* branch B */}
      <line x1={160} y1={60} x2={160} y2={150} stroke={ink} strokeWidth={2} />
      <line x1={160} y1={150} x2={180} y2={150} stroke={ink} strokeWidth={2} />
      {zig(180, 150)}
      <line x1={250} y1={150} x2={300} y2={150} stroke={ink} strokeWidth={2} />
      {zig(300, 150)}
      <line x1={370} y1={150} x2={440} y2={150} stroke={ink} strokeWidth={2} />
      {label(215, 130, 'R3 = 220 Ω')}
      {label(335, 130, 'R4 = 330 Ω')}
      {arrow(278, 150)}
      {label(278, 170, 'I2')}
      {/* join and meter */}
      <line x1={440} y1={60} x2={440} y2={150} stroke={ink} strokeWidth={2} />
      <circle cx={440} cy={150} r={4} fill={ink} />
      {label(458, 154, 'Node B', 'start')}
      <line x1={440} y1={150} x2={440} y2={183} stroke={ink} strokeWidth={2} />
      {meter(440, 200, 'mA')}
      <line x1={440} y1={217} x2={440} y2={250} stroke={ink} strokeWidth={2} />
      <line x1={440} y1={250} x2={60} y2={250} stroke={ink} strokeWidth={2} />
      {/* voltmeter across supply */}
      <line x1={60} y1={85} x2={100} y2={85} stroke={ink} strokeWidth={1.5} strokeDasharray="4 3" />
      <line x1={60} y1={225} x2={100} y2={225} stroke={ink} strokeWidth={1.5} strokeDasharray="4 3" />
      <line x1={100} y1={85} x2={100} y2={168} stroke={ink} strokeWidth={1.5} strokeDasharray="4 3" />
      <line x1={100} y1={202} x2={100} y2={225} stroke={ink} strokeWidth={1.5} strokeDasharray="4 3" />
      {meter(100, 185, 'V')}
      {label(140, 285, 'Loop 1: Vs, R1, R2')}
      {label(300, 285, 'Loop 2: Vs, R3, R4')}
      {label(460, 285, 'KCL at node A: I = I1 + I2')}
    </svg>
  );
}
