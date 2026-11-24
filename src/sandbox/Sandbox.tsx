import { useEffect, useMemo, useRef, useState } from 'react';
import { EXAMPLES } from './examples';
import {
  analyzeBoard,
  BOARD_FRAME_H,
  BOARD_H,
  BOARD_W,
  COLS,
  colX,
  eng,
  HOLE_BY_ID,
  HOLES,
  measureResistance,
  nextLabel,
  PART_INFO,
  ROW_Y,
  type LedColor,
  type Part,
  type PartKind,
} from './model';
import { PartView, WIRE_FILL } from './PartView';
import { SandboxDiagram } from './SandboxDiagram';

type Tool = PartKind | 'select';
type Probe = 'red' | 'black';
type DmmMode = 'V' | 'Ω';
type Drag =
  | {
      kind: 'part';
      id: string;
      leg: 'all' | 'a' | 'b';
      sx: number;
      sy: number;
      x: number;
      y: number;
      moved: boolean;
      wasSelected: boolean;
    }
  | { kind: 'probe'; which: Probe; x: number; y: number; moved: boolean };

const STORE_KEY = 'practilab:sandbox:v1';
const PROBE_KEY = 'practilab:sandbox:probes';
const TOOLS: { id: Tool; label: string }[] = [
  { id: 'select', label: 'Select / move' },
  { id: 'wire', label: 'Wire' },
  { id: 'resistor', label: 'Resistor' },
  { id: 'pot', label: 'Potentiometer' },
  { id: 'diode', label: 'Diode' },
  { id: 'led', label: 'LED' },
  { id: 'switch', label: 'Switch' },
  { id: 'battery', label: 'Battery' },
  { id: 'supply', label: 'DC supply' },
  { id: 'voltmeter', label: 'Voltmeter' },
  { id: 'ammeter', label: 'Ammeter' },
];
const WIRE_CYCLE = ['red', 'black', 'blue', 'green', 'yellow', 'orange'];
const POLARISED: PartKind[] = ['battery', 'supply', 'voltmeter', 'ammeter', 'led', 'diode'];

/** Multimeter drawing, below the breadboard. */
const DMM = { x: 40, y: 712, w: 300, h: 124 };
const JACK: Record<Probe, [number, number]> = { black: [DMM.x + 220, DMM.y + 96], red: [DMM.x + 266, DMM.y + 96] };
const REST: Record<Probe, [number, number]> = { red: [430, 790], black: [390, 790] };

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Keep only well-formed parts whose legs are real holes (for saved and opened files). */
function validParts(list: unknown): Part[] {
  if (!Array.isArray(list)) return [];
  return list.filter(
    (x): x is Part =>
      !!x &&
      typeof x === 'object' &&
      typeof (x as Part).id === 'string' &&
      (x as Part).kind in PART_INFO &&
      HOLE_BY_ID.has((x as Part).a) &&
      HOLE_BY_ID.has((x as Part).b) &&
      typeof (x as Part).value === 'number',
  );
}

let seq = 0;
const newId = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`;

export function Sandbox() {
  const [parts, setPartsRaw] = useState<Part[]>(() => validParts(readJson(STORE_KEY, [])));
  const history = useRef<Part[][]>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [pending, setPending] = useState<string | null>(null);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [wireIdx, setWireIdx] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [probes, setProbes] = useState<Record<Probe, string | null>>(() => readJson(PROBE_KEY, { red: null, black: null }));
  const [mode, setMode] = useState<DmmMode>('V');
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setParts = (next: Part[] | ((p: Part[]) => Part[])) => {
    setPartsRaw((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      if (value !== prev) history.current = [...history.current.slice(-49), prev];
      return value;
    });
  };
  const undo = () => {
    const prev = history.current.pop();
    if (prev) setPartsRaw(prev);
  };
  const update = (id: string, patch: Partial<Part>) => setParts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const result = useMemo(() => analyzeBoard(parts), [parts]);

  // An LED pushed past its limit stays burnt until replaced.
  useEffect(() => {
    const burnt = parts.filter((p) => result.parts[p.id]?.burns).map((p) => p.id);
    if (burnt.length) setPartsRaw((ps) => ps.map((p) => (burnt.includes(p.id) ? { ...p, broken: true } : p)));
  }, [result]);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(parts));
      localStorage.setItem(PROBE_KEY, JSON.stringify(probes));
    } catch {
      /* storage unavailable */
    }
  }, [parts, probes]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        setPending(null);
        setSelected(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault();
        setParts((ps) => ps.filter((p) => p.id !== selected));
        setSelected(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const occupied = useMemo(() => new Set(parts.flatMap((p) => [p.a, p.b])), [parts]);
  const sel = parts.find((p) => p.id === selected) ?? null;

  const toSvg = (e: React.PointerEvent): [number, number] => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const r = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [r.x, r.y];
  };
  const holeAt = (x: number, y: number, radius = 15) => {
    let best: string | null = null;
    let bd = radius;
    for (const h of HOLES) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < bd) {
        bd = d;
        best = h.id;
      }
    }
    return best;
  };

  // ---- placing new parts ----
  const place = (a: string, b: string, kind: PartKind) => {
    const part: Part = {
      id: newId(),
      kind,
      a,
      b,
      value: PART_INFO[kind].value,
      label: kind === 'wire' ? '' : nextLabel(parts, kind),
      ...(kind === 'pot' ? { wiper: 0.5 } : {}),
      ...(kind === 'switch' ? { closed: false } : {}),
      ...(kind === 'led' ? { color: 'red' } : {}),
      ...(kind === 'wire' ? { color: WIRE_CYCLE[wireIdx % WIRE_CYCLE.length] } : {}),
    };
    if (kind === 'wire') setWireIdx((i) => i + 1);
    setParts((ps) => [...ps, part]);
    if (kind !== 'wire') setSelected(part.id);
  };

  const onBoardDown = (e: React.PointerEvent) => {
    const [x, y] = toSvg(e);
    const h = holeAt(x, y);
    if (tool === 'select') {
      setSelected(null);
      return;
    }
    if (!h) {
      setPending(null);
      return;
    }
    if (occupied.has(h)) {
      setToast('That hole already has a leg in it. Use another hole in the same strip (they are connected).');
      return;
    }
    if (!pending) setPending(h);
    else if (pending === h) setPending(null);
    else {
      place(pending, h, tool);
      setPending(null);
    }
  };

  // ---- dragging parts, single legs and probes ----
  const capture = (e: React.PointerEvent) => {
    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events cannot be captured */
    }
  };

  const startPartDrag = (p: Part, e: React.PointerEvent) => {
    if (tool !== 'select') return; // let the click reach the board to place a leg
    e.stopPropagation();
    const [x, y] = toSvg(e);
    const A = HOLE_BY_ID.get(p.a)!;
    const B = HOLE_BY_ID.get(p.b)!;
    const leg = Math.hypot(A.x - x, A.y - y) < 11 ? 'a' : Math.hypot(B.x - x, B.y - y) < 11 ? 'b' : 'all';
    setDrag({ kind: 'part', id: p.id, leg, sx: x, sy: y, x, y, moved: false, wasSelected: selected === p.id });
    setSelected(p.id);
    capture(e);
  };

  const startProbeDrag = (which: Probe, e: React.PointerEvent) => {
    e.stopPropagation();
    const [x, y] = toSvg(e);
    setDrag({ kind: 'probe', which, x, y, moved: false });
    capture(e);
  };

  /** Where a dragged part would land, or null if that spot is not allowed. */
  const dropFor = (d: Extract<Drag, { kind: 'part' }>) => {
    const p = parts.find((q) => q.id === d.id);
    if (!p) return null;
    const A = HOLE_BY_ID.get(p.a)!;
    const B = HOLE_BY_ID.get(p.b)!;
    const dx = d.x - d.sx;
    const dy = d.y - d.sy;
    const a = d.leg === 'all' ? holeAt(A.x + dx, A.y + dy, 19) : d.leg === 'a' ? holeAt(d.x, d.y, 19) : p.a;
    const b = d.leg === 'all' ? holeAt(B.x + dx, B.y + dy, 19) : d.leg === 'b' ? holeAt(d.x, d.y, 19) : p.b;
    if (!a || !b || a === b) return null;
    const others = new Set(parts.filter((q) => q.id !== p.id).flatMap((q) => [q.a, q.b]));
    if (others.has(a) || others.has(b)) return null;
    return { a, b };
  };

  const onMove = (e: React.PointerEvent) => {
    const [x, y] = toSvg(e);
    setCursor([x, y]);
    setHover(holeAt(x, y));
    if (drag) {
      const moved =
        drag.moved ||
        Math.hypot(x - (drag.kind === 'part' ? drag.sx : drag.x), y - (drag.kind === 'part' ? drag.sy : drag.y)) > 5;
      setDrag({ ...drag, x, y, moved });
    }
  };

  const onUp = () => {
    if (!drag) return;
    if (drag.kind === 'probe') {
      if (drag.moved) setProbes((pr) => ({ ...pr, [drag.which]: holeAt(drag.x, drag.y, 19) }));
    } else if (!drag.moved) {
      const p = parts.find((q) => q.id === drag.id);
      if (p?.kind === 'switch' && drag.wasSelected) update(p.id, { closed: !p.closed });
    } else {
      const to = dropFor(drag);
      if (to) update(drag.id, to);
      else setToast('Cannot drop there: that hole is taken, or both legs would be in the same hole.');
    }
    setDrag(null);
  };

  const partDrop = drag?.kind === 'part' && drag.moved ? dropFor(drag) : null;
  const shown = parts.map((p) => (partDrop && drag?.kind === 'part' && drag.id === p.id ? { ...p, ...partDrop } : p));

  // ---- multimeter ----
  const probePos = (w: Probe): [number, number] => {
    if (drag?.kind === 'probe' && drag.which === w && drag.moved) return [drag.x, drag.y];
    const h = probes[w] ? HOLE_BY_ID.get(probes[w]!) : null;
    return h ? [h.x, h.y] : REST[w];
  };
  const hasSource = parts.some((p) => p.kind === 'battery' || p.kind === 'supply');
  let dmmText = mode === 'V' ? '0.000 V' : 'OL';
  let dmmNote = 'Drag the red and black probe tips onto two holes.';
  if (probes.red && probes.black) {
    if (mode === 'V') {
      const v = result.holeVolts(probes.red) - result.holeVolts(probes.black);
      dmmText = `${v.toFixed(Math.abs(v) >= 100 ? 1 : Math.abs(v) >= 10 ? 2 : 3)} V`;
      dmmNote = hasSource
        ? 'Voltage of the red probe relative to the black probe.'
        : 'No battery or supply on the board, so every point is at 0 V.';
    } else {
      const m = measureResistance(parts, probes.red, probes.black);
      if (m.powered) {
        dmmText = 'OFF PWR';
        dmmNote = 'Remove the battery or supply before measuring resistance. A meter on Ω must never be used on a live circuit.';
      } else {
        dmmText = m.ohms == null ? 'OL' : `${eng(m.ohms, 4)}Ω`;
        dmmNote = m.ohms == null ? 'OL means open: no path between the probes.' : 'Resistance between the two probes.';
      }
    }
  }

  // ---- files ----
  const saveFile = () => {
    const blob = new Blob([JSON.stringify({ app: 'practilab-sandbox', version: 1, parts }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'practilab-circuit.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  const openFile = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      const list = validParts(Array.isArray(data) ? data : data?.parts);
      if (!list.length) throw new Error('empty');
      setParts(list);
      setSelected(null);
      setToast(`Opened ${list.length} parts from ${f.name}.`);
    } catch {
      setToast('That file is not a PractiLab circuit.');
    }
  };

  const ledColor = (sel?.color as LedColor) ?? 'red';
  const r = sel ? result.parts[sel.id] : undefined;
  const hoverHole = hover ? HOLE_BY_ID.get(hover) : null;
  const pendingHole = pending ? HOLE_BY_ID.get(pending) : null;
  const holeName = (h: { row: string; col: number }) =>
    h.row.length === 1 ? `${h.row}${h.col + 1}` : `rail ${h.row.endsWith('p') ? '+' : '−'} col ${h.col + 1}`;

  return (
    <div className="sandbox">
      <div className="sb-main">
        <div className="sb-toolbar">
          <div className="sb-tray" role="toolbar" aria-label="Parts tray">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                className={`sb-tool ${tool === t.id ? 'on' : ''}`}
                aria-pressed={tool === t.id}
                onClick={() => {
                  setTool(t.id);
                  setPending(null);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="toolbar-buttons">
            <select
              className="sb-select"
              value=""
              aria-label="Load an example circuit"
              onChange={(e) => {
                const ex = EXAMPLES.find((x) => x.id === e.target.value);
                if (!ex) return;
                if (parts.length && !confirm('Replace the board with this example?')) return;
                setParts(ex.parts().map((p) => ({ ...p, id: newId() })));
                setSelected(null);
                setToast(ex.about);
              }}
            >
              <option value="">Examples…</option>
              {EXAMPLES.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
            <button className="btn" onClick={undo} disabled={!history.current.length} title="Undo (Ctrl+Z)">
              Undo
            </button>
            <button className="btn" onClick={saveFile} disabled={!parts.length}>
              Save to file
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              Open file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) openFile(f);
                e.target.value = '';
              }}
            />
            <button
              className="btn danger"
              disabled={!parts.length}
              onClick={() => {
                if (confirm('Remove every part from the board?')) {
                  setParts([]);
                  setSelected(null);
                }
              }}
            >
              Clear board
            </button>
          </div>
        </div>

        <svg
          ref={svgRef}
          className="sb-board"
          viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
          onPointerDown={onBoardDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={() => setDrag(null)}
          onPointerLeave={() => setHover(null)}
          onContextMenu={(e) => e.preventDefault()}
          style={{ cursor: drag ? 'grabbing' : tool === 'select' ? 'default' : 'crosshair' }}
        >
          <defs>
            <filter id="sbGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>
          <rect
            x={20}
            y={20}
            width={BOARD_W - 40}
            height={BOARD_FRAME_H}
            rx={16}
            fill="#f2f1ec"
            stroke="#cfcdc4"
            strokeWidth={2}
          />
          {(
            [
              ['tp', '#d32f2f'],
              ['tn', '#1e63d6'],
              ['bp', '#d32f2f'],
              ['bn', '#1e63d6'],
            ] as const
          ).map(([row, c]) => {
            const y = ROW_Y[row] + (row.endsWith('p') ? -15 : 15);
            const sign = row.endsWith('p') ? '+' : '−';
            return (
              <g key={row}>
                <line x1={colX(0) - 18} x2={colX(COLS - 1) + 18} y1={y} y2={y} stroke={c} strokeWidth={2} />
                <text x={colX(0) - 34} y={ROW_Y[row] + 6} textAnchor="middle" fontSize={20} fontWeight={800} fill={c}>
                  {sign}
                </text>
                <text x={colX(COLS - 1) + 34} y={ROW_Y[row] + 6} textAnchor="middle" fontSize={20} fontWeight={800} fill={c}>
                  {sign}
                </text>
              </g>
            );
          })}
          <rect
            x={colX(0) - 20}
            y={(ROW_Y.e + ROW_Y.f) / 2 - 12}
            width={colX(COLS - 1) - colX(0) + 40}
            height={24}
            rx={4}
            fill="#e3e1d8"
          />
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((row) => (
            <g key={row}>
              <text x={colX(0) - 32} y={ROW_Y[row] + 5} textAnchor="middle" fontSize={13} fill="#7a7a7a">
                {row}
              </text>
              <text x={colX(COLS - 1) + 32} y={ROW_Y[row] + 5} textAnchor="middle" fontSize={13} fill="#7a7a7a">
                {row}
              </text>
            </g>
          ))}
          {Array.from({ length: COLS }, (_, c) =>
            c === 0 || (c + 1) % 5 === 0 ? (
              <g key={c}>
                <text x={colX(c)} y={ROW_Y.a - 22} textAnchor="middle" fontSize={12} fill="#7a7a7a">
                  {c + 1}
                </text>
                <text x={colX(c)} y={ROW_Y.j + 30} textAnchor="middle" fontSize={12} fill="#7a7a7a">
                  {c + 1}
                </text>
              </g>
            ) : null,
          )}
          {/* the strip under the pointer, to show what is connected */}
          {hoverHole &&
            HOLES.filter((h) => h.strip === hoverHole.strip).map((h) => (
              <rect key={`s${h.id}`} x={h.x - 9} y={h.y - 9} width={18} height={18} rx={4} fill="#4caf5055" />
            ))}
          {HOLES.map((h) => (
            <rect
              key={h.id}
              x={h.x - 5}
              y={h.y - 5}
              width={10}
              height={10}
              rx={2}
              fill={occupied.has(h.id) ? '#555' : '#3b3b3b'}
            />
          ))}
          {hoverHole && tool !== 'select' && !drag && (
            <circle
              cx={hoverHole.x}
              cy={hoverHole.y}
              r={10}
              fill="none"
              stroke={occupied.has(hoverHole.id) ? '#d32f2f' : '#00b894'}
              strokeWidth={3}
            />
          )}

          {shown.map((p) => (
            <PartView
              key={p.id}
              p={p}
              r={result.parts[p.id]}
              selected={p.id === selected}
              onPointerDown={(e) => startPartDrag(p, e)}
            />
          ))}
          {drag?.kind === 'part' && drag.moved && !partDrop && (
            <circle cx={drag.x} cy={drag.y} r={14} fill="none" stroke="#d32f2f" strokeWidth={3} pointerEvents="none" />
          )}

          {pendingHole && cursor && (
            <g pointerEvents="none">
              <circle
                cx={pendingHole.x}
                cy={pendingHole.y}
                r={10}
                fill="none"
                stroke="#00b894"
                strokeWidth={3}
                className="pending-ring"
              />
              <line
                x1={pendingHole.x}
                y1={pendingHole.y}
                x2={cursor[0]}
                y2={cursor[1]}
                stroke="#00b894"
                strokeWidth={3}
                strokeDasharray="8 6"
              />
            </g>
          )}

          {/* multimeter */}
          <g>
            <rect x={DMM.x} y={DMM.y} width={DMM.w} height={DMM.h} rx={14} fill="#f5c400" stroke="#6b5600" strokeWidth={2} />
            <rect x={DMM.x + 14} y={DMM.y + 12} width={190} height={50} rx={6} fill="#c9d4b8" stroke="#55604a" strokeWidth={2} />
            <text
              x={DMM.x + 196}
              y={DMM.y + 48}
              textAnchor="end"
              fontSize={30}
              fontWeight={700}
              fill="#1b1f17"
              fontFamily="Consolas, 'Courier New', monospace"
            >
              {dmmText}
            </text>
            <text x={DMM.x + 214} y={DMM.y + 30} fontSize={12} fontWeight={800} fill="#3b3000">
              MULTIMETER
            </text>
            {(['V', 'Ω'] as DmmMode[]).map((m, i) => (
              <g
                key={m}
                role="radio"
                aria-checked={mode === m}
                style={{ cursor: 'pointer' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setMode(m);
                }}
              >
                <rect
                  x={DMM.x + 14 + i * 62}
                  y={DMM.y + 76}
                  width={54}
                  height={34}
                  rx={7}
                  fill={mode === m ? '#1d2330' : '#fff7cc'}
                  stroke="#3b3000"
                />
                <text
                  x={DMM.x + 41 + i * 62}
                  y={DMM.y + 99}
                  textAnchor="middle"
                  fontSize={16}
                  fontWeight={800}
                  fill={mode === m ? '#ffd43b' : '#3b3000'}
                >
                  {m === 'V' ? 'V ⎓' : 'Ω'}
                </text>
              </g>
            ))}
            <text x={JACK.black[0]} y={DMM.y + 76} textAnchor="middle" fontSize={11} fontWeight={800} fill="#3b3000">
              COM
            </text>
            <text x={JACK.red[0]} y={DMM.y + 76} textAnchor="middle" fontSize={11} fontWeight={800} fill="#3b3000">
              VΩ
            </text>
            <circle cx={JACK.black[0]} cy={JACK.black[1]} r={10} fill="#1d1d1d" />
            <circle cx={JACK.red[0]} cy={JACK.red[1]} r={10} fill="#c62828" />
          </g>
          {(['black', 'red'] as Probe[]).map((w) => {
            const [tx, ty] = probePos(w);
            const [jx, jy] = JACK[w];
            const sag = Math.max(jy, ty) + 60;
            const col = w === 'red' ? '#d32f2f' : '#222';
            return (
              <g key={w}>
                <path
                  d={`M ${jx} ${jy} C ${jx} ${sag}, ${tx} ${sag}, ${tx} ${ty + 22}`}
                  fill="none"
                  stroke={col}
                  strokeWidth={4}
                  pointerEvents="none"
                />
                <g className="sb-probe-tip" onPointerDown={(e) => startProbeDrag(w, e)} style={{ cursor: 'grab' }}>
                  <rect x={tx - 6} y={ty + 4} width={12} height={22} rx={4} fill={col} />
                  <polygon points={`${tx - 3},${ty + 4} ${tx + 3},${ty + 4} ${tx},${ty - 4}`} fill="#c0c0c0" />
                  <circle cx={tx} cy={ty + 12} r={18} fill="transparent" />
                </g>
              </g>
            );
          })}
        </svg>

        <div className="sb-status muted small">
          {tool === 'select'
            ? 'Select / move: click a part to edit it, drag it to move it, or drag one leg end to move just that leg. Click a selected switch to flip it.'
            : pending
              ? `Placing a ${PART_INFO[tool].name.toLowerCase()}: now click the hole for the second leg (Esc cancels).`
              : `Placing a ${PART_INFO[tool].name.toLowerCase()}: click the hole for the first leg${POLARISED.includes(tool) ? ' (the + / anode leg)' : ''}.`}
          {hoverHole && (
            <span className="sb-probe">
              {' '}
              Hole {holeName(hoverHole)}
              {hasSource ? `: ${result.holeVolts(hoverHole.id).toFixed(2)} V` : ''}
            </span>
          )}
        </div>

        <section className="card sb-diagram-card">
          <h3>Circuit diagram (live)</h3>
          <p className="muted small">
            Each horizontal line is one node: every hole joined to it by a strip or wire. Nodes are labelled with their voltage,
            highest at the top.
          </p>
          <SandboxDiagram parts={parts} result={result} />
        </section>
      </div>

      <aside className="bench-side">
        {result.warnings.map((w, i) => (
          <div key={i} className="alert warn" role="button" tabIndex={0} onClick={() => setSelected(w.partId)}>
            {w.text}
          </div>
        ))}
        {toast && <div className="alert ok">{toast}</div>}

        <section className="card">
          <h3>Multimeter</h3>
          <div className="sb-dmm-readout mono">{dmmText}</div>
          <p className="small muted">{dmmNote}</p>
          {(probes.red || probes.black) && (
            <p className="small">
              Red probe: {probes.red ? holeName(HOLE_BY_ID.get(probes.red)!) : 'not placed'}. Black probe:{' '}
              {probes.black ? holeName(HOLE_BY_ID.get(probes.black)!) : 'not placed'}.{' '}
              <button className="link" onClick={() => setProbes({ red: null, black: null })}>
                Put probes away
              </button>
            </p>
          )}
        </section>

        {!sel ? (
          <section className="card">
            <h3>Breadboard sandbox</h3>
            <p className="small">
              Build any DC circuit. Pick a part in the tray, then click two holes for its legs. Holes a-e in a column are
              connected, so are f-j, and each + and − rail along its whole length. Hover a hole to see which holes join it and its
              voltage.
            </p>
            <p className="small muted">
              {parts.length
                ? `${parts.length} part${parts.length > 1 ? 's' : ''} on the board.`
                : 'The board is empty. Try an example from the Examples menu.'}
            </p>
          </section>
        ) : (
          <section className="card sb-inspector">
            <h3>
              {sel.label || 'Wire'} <span className="muted small">{PART_INFO[sel.kind].name}</span>
            </h3>

            {sel.kind === 'resistor' && (
              <div className="sb-field">
                <label>
                  Resistance (Ω){' '}
                  <input
                    type="number"
                    min={1}
                    step="any"
                    value={sel.value}
                    onChange={(e) => update(sel.id, { value: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </label>
                <div className="sb-chips">
                  {[100, 220, 330, 470, 1000, 2200, 4700, 10000].map((v) => (
                    <button
                      key={v}
                      className={`chip-btn ${sel.value === v ? 'on' : ''}`}
                      onClick={() => update(sel.id, { value: v })}
                    >
                      {eng(v)}Ω
                    </button>
                  ))}
                </div>
              </div>
            )}
            {sel.kind === 'pot' && (
              <div className="sb-field">
                <label>
                  Wiper {Math.round((sel.wiper ?? 0.5) * 100)}% ({eng(sel.value * (sel.wiper ?? 0.5))}Ω)
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={sel.wiper ?? 0.5}
                    onChange={(e) => update(sel.id, { wiper: Number(e.target.value) })}
                  />
                </label>
                <div className="sb-chips">
                  {[1000, 5000, 10000, 100000].map((v) => (
                    <button
                      key={v}
                      className={`chip-btn ${sel.value === v ? 'on' : ''}`}
                      onClick={() => update(sel.id, { value: v })}
                    >
                      {eng(v)}Ω pot
                    </button>
                  ))}
                </div>
              </div>
            )}
            {sel.kind === 'battery' && (
              <div className="sb-chips">
                {[1.5, 3, 4.5, 6, 9, 12].map((v) => (
                  <button
                    key={v}
                    className={`chip-btn ${sel.value === v ? 'on' : ''}`}
                    onClick={() => update(sel.id, { value: v })}
                  >
                    {v} V
                  </button>
                ))}
              </div>
            )}
            {sel.kind === 'supply' && (
              <div className="sb-field">
                <label>
                  Output {sel.value.toFixed(2)} V
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={0.05}
                    value={sel.value}
                    onChange={(e) => update(sel.id, { value: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Set exactly (V){' '}
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.01}
                    value={sel.value}
                    onChange={(e) => update(sel.id, { value: Math.min(30, Math.max(0, Number(e.target.value) || 0)) })}
                  />
                </label>
              </div>
            )}
            {sel.kind === 'led' && (
              <div className="sb-chips">
                {(['red', 'yellow', 'green', 'blue'] as LedColor[]).map((c) => (
                  <button
                    key={c}
                    className={`chip-btn ${ledColor === c ? 'on' : ''}`}
                    onClick={() => update(sel.id, { color: c })}
                  >
                    {c}
                  </button>
                ))}
                {sel.broken && (
                  <button className="btn primary" onClick={() => update(sel.id, { broken: false })}>
                    Replace LED
                  </button>
                )}
              </div>
            )}
            {sel.kind === 'switch' && (
              <button className="btn primary" onClick={() => update(sel.id, { closed: !sel.closed })}>
                Turn {sel.closed ? 'OFF (open)' : 'ON (closed)'}
              </button>
            )}
            {sel.kind === 'wire' && (
              <div className="sb-chips">
                {Object.entries(WIRE_FILL).map(([c, fill]) => (
                  <button
                    key={c}
                    className={`swatch ${sel.color === c ? 'on' : ''}`}
                    style={{ background: fill }}
                    title={c}
                    onClick={() => update(sel.id, { color: c })}
                  />
                ))}
              </div>
            )}

            {r && sel.kind !== 'wire' && sel.kind !== 'switch' && (
              <table className="table sb-readings">
                <tbody>
                  {(sel.kind === 'voltmeter' || sel.kind === 'ammeter') && (
                    <tr>
                      <td>Reading</td>
                      <td className="mono">
                        <b>
                          {sel.kind === 'voltmeter'
                            ? `${(r.reading ?? 0).toFixed(3)} V`
                            : `${((r.reading ?? 0) * 1000).toFixed(2)} mA`}
                        </b>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>Voltage across (+ leg to other)</td>
                    <td className="mono">{eng(r.volts)}V</td>
                  </tr>
                  <tr>
                    <td>{sel.kind === 'battery' || sel.kind === 'supply' ? 'Current supplied' : 'Current through'}</td>
                    <td className="mono">{eng(r.amps)}A</td>
                  </tr>
                  <tr>
                    <td>Power</td>
                    <td className="mono">{eng(r.watts)}W</td>
                  </tr>
                </tbody>
              </table>
            )}

            <div className="toolbar-buttons">
              {sel.kind !== 'wire' && (
                <button className="btn" onClick={() => update(sel.id, { a: sel.b, b: sel.a })} title="Swap its two legs">
                  Flip
                </button>
              )}
              <button
                className="btn danger"
                onClick={() => {
                  setParts((ps) => ps.filter((p) => p.id !== sel.id));
                  setSelected(null);
                }}
              >
                Delete
              </button>
            </div>
          </section>
        )}

        <section className="card small">
          <h3>Limits</h3>
          <ul className="sb-limits">
            <li>LEDs burn out above 30 mA: always use a series resistor.</li>
            <li>Resistors are rated 0.25 W.</li>
            <li>A battery or supply with + joined straight to − is a short.</li>
            <li>Ammeters go in series, voltmeters across a part.</li>
            <li>Measure resistance only with the power removed.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
