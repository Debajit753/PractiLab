/**
 * DC circuit solver using Modified Nodal Analysis (MNA).
 *
 * Supported elements:
 *  - R: resistor between nodes a and b
 *  - V: ideal voltage source, V(p) - V(n) = v
 *  - I: current source pushing current from a, through the source, out at b
 *  - D: diode (Shockley model), anode a, cathode k, solved with Newton-Raphson
 *
 * Node names are free strings. The ground node is fixed at 0 V. Every node also
 * gets a tiny conductance (GMIN) to ground so floating parts of a circuit stay
 * solvable and simply read 0 V, the way an unconnected section behaves on a kit.
 */

export type Element =
  | { kind: 'R'; id: string; a: string; b: string; ohms: number }
  | { kind: 'V'; id: string; p: string; n: string; volts: number }
  | { kind: 'I'; id: string; a: string; b: string; amps: number }
  | { kind: 'D'; id: string; a: string; k: string; is?: number; n?: number };

export interface Solution {
  /** Voltage of each node relative to ground. */
  voltage: (node: string) => number;
  /**
   * Current through each element, in amps.
   * R: from a to b. V: from p, through the source, to n (negative when the
   * source is delivering power). I: the set value. D: anode to cathode.
   */
  current: (id: string) => number;
  converged: boolean;
}

const GMIN = 1e-12;
const VT = 0.025852; // thermal voltage at 300 K

export function solve(elements: Element[], ground: string): Solution {
  // Index every non-ground node.
  const index = new Map<string, number>();
  const nodeOf = (name: string) => {
    if (name === ground) return -1;
    let i = index.get(name);
    if (i === undefined) {
      i = index.size;
      index.set(name, i);
    }
    return i;
  };
  for (const e of elements) {
    if (e.kind === 'V') {
      nodeOf(e.p);
      nodeOf(e.n);
    } else if (e.kind === 'D') {
      nodeOf(e.a);
      nodeOf(e.k);
    } else {
      nodeOf(e.a);
      nodeOf(e.b);
    }
  }
  const sources = elements.filter((e) => e.kind === 'V') as Extract<Element, { kind: 'V' }>[];
  const nNodes = index.size;
  const size = nNodes + sources.length;
  const diodes = elements.filter((e) => e.kind === 'D') as Extract<Element, { kind: 'D' }>[];

  // Diode operating points (voltage across each diode), updated by Newton-Raphson.
  const vd = new Map<string, number>(diodes.map((d) => [d.id, 0.6]));

  let x = new Array<number>(size).fill(0);
  let converged = true;
  const maxIter = diodes.length ? 200 : 1;

  for (let iter = 0; iter < maxIter; iter++) {
    const A: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0));
    const z = new Array<number>(size).fill(0);

    const stampG = (a: number, b: number, g: number) => {
      if (a >= 0) A[a][a] += g;
      if (b >= 0) A[b][b] += g;
      if (a >= 0 && b >= 0) {
        A[a][b] -= g;
        A[b][a] -= g;
      }
    };
    const stampI = (a: number, b: number, i: number) => {
      // current i leaves node a and enters node b (through the element)
      if (a >= 0) z[a] -= i;
      if (b >= 0) z[b] += i;
    };

    for (let i = 0; i < nNodes; i++) A[i][i] += GMIN;

    for (const e of elements) {
      if (e.kind === 'R') {
        stampG(nodeOf(e.a), nodeOf(e.b), 1 / Math.max(e.ohms, 1e-9));
      } else if (e.kind === 'I') {
        stampI(nodeOf(e.a), nodeOf(e.b), e.amps);
      } else if (e.kind === 'D') {
        const is = e.is ?? 1e-14;
        const nvt = (e.n ?? 1) * VT;
        const v = vd.get(e.id)!;
        const ex = Math.exp(Math.min(v / nvt, 80));
        const id = is * (ex - 1);
        const gd = (is / nvt) * ex + GMIN;
        // Companion model: conductance gd in parallel with current source.
        const ieq = id - gd * v;
        const a = nodeOf(e.a);
        const k = nodeOf(e.k);
        stampG(a, k, gd);
        stampI(a, k, ieq);
      }
    }

    sources.forEach((s, j) => {
      const row = nNodes + j;
      const p = nodeOf(s.p);
      const n = nodeOf(s.n);
      if (p >= 0) {
        A[p][row] += 1;
        A[row][p] += 1;
      }
      if (n >= 0) {
        A[n][row] -= 1;
        A[row][n] -= 1;
      }
      z[row] = s.volts;
    });

    const next = gauss(A, z);
    if (!next) {
      converged = false;
      break;
    }
    x = next;

    if (!diodes.length) break;

    // Update diode voltages with step limiting to keep the exponential stable.
    let maxChange = 0;
    for (const d of diodes) {
      const va = nodeOf(d.a) >= 0 ? x[nodeOf(d.a)] : 0;
      const vk = nodeOf(d.k) >= 0 ? x[nodeOf(d.k)] : 0;
      const target = va - vk;
      const old = vd.get(d.id)!;
      let step = target - old;
      if (step > 0.1) step = 0.1;
      if (step < -1) step = -1;
      vd.set(d.id, old + step);
      maxChange = Math.max(maxChange, Math.abs(target - old));
    }
    if (maxChange < 1e-9) break;
    if (iter === maxIter - 1) converged = false;
  }

  const voltage = (node: string) => {
    const i = index.get(node);
    if (node === ground || i === undefined) return 0;
    return x[i];
  };

  const currents = new Map<string, number>();
  for (const e of elements) {
    if (e.kind === 'R') currents.set(e.id, (voltage(e.a) - voltage(e.b)) / Math.max(e.ohms, 1e-9));
    else if (e.kind === 'I') currents.set(e.id, e.amps);
    else if (e.kind === 'D') {
      const v = voltage(e.a) - voltage(e.k);
      const nvt = (e.n ?? 1) * VT;
      currents.set(e.id, (e.is ?? 1e-14) * (Math.exp(Math.min(v / nvt, 80)) - 1));
    }
  }
  sources.forEach((s, j) => currents.set(s.id, x[nNodes + j] ?? 0));

  return { voltage, current: (id) => currents.get(id) ?? 0, converged };
}

/** Gaussian elimination with partial pivoting. Returns null if singular. */
function gauss(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-18) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = col + 1; r < n; r++) {
      const f = M[r][col] / M[col][col];
      if (f === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  const out = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let c = r + 1; c < n; c++) s -= M[r][c] * out[c];
    out[r] = s / M[r][r];
  }
  return out;
}
