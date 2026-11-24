import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KitControls } from '../../engine/circuit';
import type { KitDef, Pt, SocketColor, Wire } from '../../kits/types';
import { Knob, Led, Toggle } from './Controls';
import { DecadeBox, DiodeSymbol, RangeSwitch, SpdtSwitch } from './Fixtures';
import { Meter } from './Meter';
import { MeterSymbol, Plug, ResistorZigzag, Screw, SharedDefs, SocketVisual, Trace, WIRE_COLORS, wirePath } from './parts';

interface Props {
  kit: KitDef;
  wires: Wire[];
  /** Meter values in the units of each meter's selected range. */
  meterValues: Record<string, number>;
  showDigital: boolean;
  /** Draw LED panel meters instead of moving-coil meters. */
  digital: boolean;
  controls: KitControls;
  /** Mains on and fuse intact. */
  powered: boolean;
  hintSockets: string[];
  /** A suggested cord, drawn as a flashing ghost. */
  ghost?: [string, string] | null;
  selectedWire: string | null;
  colorFor: (socket: string) => SocketColor;
  onSelectWire: (id: string | null) => void;
  onAddWire: (a: string, b: string) => void;
  onRemoveWire: (id: string) => void;
  onMains: (on: boolean) => void;
  onKnob: (id: string, v: number) => void;
  onDecade: (id: string, ohms: number) => void;
  onSwitch: (id: string, pos: 'a' | 'b') => void;
  onRange: (meterId: string, index: number) => void;
}

const SNAP = 28;

export function KitPanel(p: Props) {
  const { kit } = p;
  const svgRef = useRef<SVGSVGElement>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [cursor, setCursor] = useState<Pt | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const dragStart = useRef<{ x: number; y: number; dragging: boolean } | null>(null);

  const sockets = useMemo(() => new Map(kit.sockets.map((s) => [s.id, s])), [kit]);

  const toSvg = useCallback((clientX: number, clientY: number): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = svg.getScreenCTM();
    if (!m) return [0, 0];
    const r = pt.matrixTransform(m.inverse());
    return [r.x, r.y];
  }, []);

  const socketAt = (x: number, y: number) => {
    let best: string | null = null;
    let bestD = SNAP;
    for (const s of kit.sockets) {
      const d = Math.hypot(s.x - x, s.y - y);
      if (d < bestD) {
        bestD = d;
        best = s.id;
      }
    }
    return best;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPending(null);
        p.onSelectWire(null);
      }
      const target = e.target as HTMLElement;
      if ((e.key === 'Delete' || e.key === 'Backspace') && p.selectedWire && target.tagName !== 'INPUT') {
        e.preventDefault();
        p.onRemoveWire(p.selectedWire);
        p.onSelectWire(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [p]);

  const onSocketDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    p.onSelectWire(null);
    if (pending && pending !== id) {
      p.onAddWire(pending, id);
      setPending(null);
      setCursor(null);
      dragStart.current = null;
      return;
    }
    setPending(id);
    const [x, y] = toSvg(e.clientX, e.clientY);
    setCursor([x, y]);
    dragStart.current = { x, y, dragging: true };
  };

  const onMove = (e: React.PointerEvent) => {
    if (!pending) return;
    const [x, y] = toSvg(e.clientX, e.clientY);
    setCursor([x, y]);
  };

  const onUp = (e: React.PointerEvent) => {
    const start = dragStart.current;
    if (!pending || !start?.dragging) return;
    start.dragging = false;
    const [x, y] = toSvg(e.clientX, e.clientY);
    const target = socketAt(x, y);
    if (target && target !== pending) {
      p.onAddWire(pending, target);
      setPending(null);
      setCursor(null);
      return;
    }
    const moved = Math.hypot(x - start.x, y - start.y);
    if (moved > 12 && !target) {
      // dropped on empty panel: cancel
      setPending(null);
      setCursor(null);
    }
    // otherwise: a click on a socket, wait for the second click
  };

  const pendingSocket = pending ? sockets.get(pending) : null;
  const pendingColor = pending ? p.colorFor(pending) : 'red';
  const { width: W, height: H } = kit;

  return (
    <svg
      ref={svgRef}
      className="kit-panel"
      viewBox={`0 0 ${W} ${H}`}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerDown={() => {
        setPending(null);
        setCursor(null);
        p.onSelectWire(null);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <SharedDefs />
      {/* cabinet and face plate */}
      <rect x={0} y={0} width={W} height={H} rx={14} fill="url(#frameGrad)" />
      <rect x={8} y={8} width={W - 16} height={H - 16} rx={10} fill="none" stroke="#868b8f" strokeWidth={3} />
      <rect x={38} y={38} width={W - 76} height={H - 76} fill={kit.face ?? '#efe8d2'} stroke="#7d8184" strokeWidth={3} />
      <Screw x={72} y={70} />
      <Screw x={W - 72} y={70} />
      <Screw x={72} y={H - 70} />
      <Screw x={W - 72} y={H - 70} />

      {kit.title.map((t, i) => (
        <text
          key={i}
          x={W / 2}
          y={88 + i * 36}
          textAnchor="middle"
          fontSize={i === 0 ? 28 : 26}
          fontWeight={800}
          fill="#d7262b"
          fontFamily="Arial"
        >
          {t}
        </text>
      ))}

      {kit.traces.map((t, i) => (
        <Trace key={i} t={t} />
      ))}
      {(kit.boxes ?? []).map((b, i) => (
        <g key={`box${i}`}>
          <rect
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx={8}
            fill="none"
            stroke="#6b6b6b"
            strokeWidth={2}
            strokeDasharray="10 7"
          />
          {b.label && (
            <text
              x={b.x + b.w / 2}
              y={b.y + 26}
              textAnchor="middle"
              fontSize={16}
              fontWeight={800}
              fill="#3c3c3c"
              fontFamily="Arial"
            >
              {b.label}
            </text>
          )}
        </g>
      ))}
      {kit.resistors.map((r) => (
        <ResistorZigzag key={r.id} from={r.from} to={r.to} />
      ))}
      {(kit.pots ?? []).map((pt) => {
        const [x1, y1] = pt.from;
        const [x2, y2] = pt.to;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        return (
          <g key={pt.id}>
            <ResistorZigzag from={pt.from} to={pt.to} />
            <line
              x1={mx - 26}
              y1={my + 20}
              x2={mx + 22}
              y2={my - 18}
              stroke="#1c1c1c"
              strokeWidth={2.4}
              markerEnd="url(#arrowHead)"
            />
          </g>
        );
      })}
      {(kit.diodes ?? []).map((d) => (
        <DiodeSymbol key={d.id} def={d} />
      ))}
      {(kit.dots ?? []).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={5} fill="#1c1c1c" />
      ))}
      {kit.texts.map((t, i) => (
        <text
          key={i}
          x={t.x}
          y={t.y}
          textAnchor={t.anchor ?? 'middle'}
          fontSize={t.size ?? 16}
          fontWeight={t.weight ?? 400}
          fill={t.color ?? '#1c1c1c'}
          fontFamily="Arial"
        >
          {t.text}
        </text>
      ))}
      {kit.symbols.map((s, i) => (
        <MeterSymbol key={i} s={s} />
      ))}

      {kit.meters.map((m) => {
        const ri = Math.min(p.controls.ranges[m.id] ?? 0, m.ranges.length - 1);
        return (
          <g key={m.id}>
            <Meter
              def={m}
              range={m.ranges[ri]}
              value={p.meterValues[m.id] ?? 0}
              showDigital={p.showDigital}
              digital={p.digital}
            />
            {m.ranges.length > 1 && <RangeSwitch meter={m} index={ri} onChange={(i) => p.onRange(m.id, i)} panelWidth={W} />}
          </g>
        );
      })}

      <Led x={kit.mains.led[0]} y={kit.mains.led[1]} on={p.powered} />
      <Toggle x={kit.mains.toggle[0]} y={kit.mains.toggle[1]} on={p.controls.mains} onChange={p.onMains} />
      {kit.knobs.map((k) => (
        <g key={k.id}>
          <Knob
            x={k.x}
            y={k.y}
            value={p.controls.knobs[k.id] ?? 0}
            max={k.max}
            step={k.step}
            onChange={(v) => p.onKnob(k.id, v)}
            toSvg={toSvg}
          />
          {k.label.map((line, i) => (
            <text
              key={i}
              x={k.x}
              y={k.y + 80 + i * 22}
              textAnchor="middle"
              fontSize={17}
              fontWeight={700}
              fill="#1c1c1c"
              fontFamily="Arial"
            >
              {line}
            </text>
          ))}
          {k.readout && (
            <g>
              <rect
                x={k.x - 52}
                y={k.y + 66 + k.label.length * 22}
                width={104}
                height={26}
                rx={4}
                fill="#0c1a0e"
                stroke="#3b6b41"
              />
              <text
                x={k.x}
                y={k.y + 85 + k.label.length * 22}
                textAnchor="middle"
                fontSize={16}
                fill="#7dff8a"
                fontFamily="Consolas, 'Courier New', monospace"
              >
                {Math.round(p.controls.knobs[k.id] ?? 0)} {k.readout}
              </text>
            </g>
          )}
        </g>
      ))}
      {(kit.decades ?? []).map((d) => (
        <DecadeBox key={d.id} def={d} value={p.controls.decades[d.id] ?? d.initial} onChange={(v) => p.onDecade(d.id, v)} />
      ))}
      {(kit.switches ?? []).map((sw) => (
        <SpdtSwitch
          key={sw.id}
          def={sw}
          pos={p.controls.switches[sw.id] ?? sw.initial}
          onChange={(pos) => p.onSwitch(sw.id, pos)}
        />
      ))}

      {kit.sockets.map((s) => (
        <SocketVisual key={s.id} x={s.x} y={s.y} color={s.color} />
      ))}

      {/* cords */}
      <g filter="url(#wireShadow)">
        {p.wires.map((w) => {
          const a = sockets.get(w.a);
          const b = sockets.get(w.b);
          if (!a || !b) return null;
          const d = wirePath([a.x, a.y], [b.x, b.y]);
          const c = WIRE_COLORS[w.color];
          const sel = p.selectedWire === w.id;
          return (
            <g
              key={w.id}
              className="wire"
              onPointerDown={(e) => {
                e.stopPropagation();
                if (e.button === 2) {
                  p.onRemoveWire(w.id);
                  return;
                }
                p.onSelectWire(sel ? null : w.id);
              }}
              onDoubleClick={() => p.onRemoveWire(w.id)}
            >
              <path d={d} fill="none" stroke="transparent" strokeWidth={22} />
              {sel && <path d={d} fill="none" stroke="#fff" strokeWidth={16} strokeOpacity={0.9} />}
              <path d={d} fill="none" stroke={c.edge} strokeWidth={9} strokeLinecap="round" />
              <path d={d} fill="none" stroke={c.body} strokeWidth={6} strokeLinecap="round" />
            </g>
          );
        })}
      </g>
      {p.wires.map((w) => {
        const a = sockets.get(w.a);
        const b = sockets.get(w.b);
        if (!a || !b) return null;
        return (
          <g key={`plug-${w.id}`}>
            <Plug x={a.x} y={a.y} color={w.color} />
            <Plug x={b.x} y={b.y} color={w.color} />
          </g>
        );
      })}

      {p.ghost &&
        (() => {
          const a = sockets.get(p.ghost[0]);
          const b = sockets.get(p.ghost[1]);
          if (!a || !b) return null;
          return (
            <path
              className="ghost-cord"
              d={wirePath([a.x, a.y], [b.x, b.y])}
              fill="none"
              stroke="#ff8f00"
              strokeWidth={7}
              strokeDasharray="12 8"
              strokeLinecap="round"
              pointerEvents="none"
            />
          );
        })()}

      {pendingSocket && cursor && (
        <path
          d={wirePath([pendingSocket.x, pendingSocket.y], cursor)}
          fill="none"
          stroke={WIRE_COLORS[pendingColor].body}
          strokeWidth={6}
          strokeDasharray="10 6"
          strokeLinecap="round"
          pointerEvents="none"
          opacity={0.85}
        />
      )}

      {/* socket hit targets and highlights, on top of everything */}
      {kit.sockets.map((s) => {
        const isHint = p.hintSockets.includes(s.id);
        const isPending = pending === s.id;
        const isHover = hover === s.id;
        return (
          <g key={`hit-${s.id}`}>
            {isHint && <circle className="hint-ring" cx={s.x} cy={s.y} r={28} fill="none" stroke="#ff8f00" strokeWidth={5} />}
            {(isPending || isHover) && (
              <circle
                cx={s.x}
                cy={s.y}
                r={27}
                fill="none"
                stroke={isPending ? '#00b894' : '#ffffff'}
                strokeWidth={4}
                className={isPending ? 'pending-ring' : undefined}
              />
            )}
            <circle
              cx={s.x}
              cy={s.y}
              r={24}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onPointerDown={(e) => onSocketDown(s.id, e)}
              onPointerEnter={() => setHover(s.id)}
              onPointerLeave={() => setHover((h) => (h === s.id ? null : h))}
            >
              <title>{s.name}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
