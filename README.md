# PractiLab

A virtual lab where engineering students do their practicals on screen, on trainer kits that look and behave like the real ones in a college lab. Students wire the kit with patch cords, turn knobs, flip switches and read the meters. Every reading comes from a live circuit simulation of exactly what they wired.

Runs entirely in the browser. No accounts, no server, no internet needed after install.

## What's inside

### BEEE Lab: six practicals

| Practical | Kit | What the student does |
|---|---|---|
| KCL and KVL | 50 / 100 / 220 / 330 Ω network, 0-5 V supply | Two procedures with a KCL / KVL switch: measures branch currents to check I = I1 + I2, and resistor voltages to check Vs = VR1 + VR2 |
| Thevenin's theorem | Network, RL potentiometer, Thevenin's equivalent circuit section | Finds Vth and Rth, sweeps RL, then builds the equivalent and checks IL' = IL |
| Norton's theorem | Same trainer | Measures IN and RN, checks IL = IN·RN / (RN + RL) |
| Superposition | Two supplies with changeover switches | Measures I1, I2, I3 for each source alone and both together |
| Maximum power transfer | Source with Rs, decade box load | Sweeps RL, plots P against RL, finds the peak and 50% efficiency |
| PN junction diode | 0-3 V and 0-30 V supplies, forward and reverse bias diodes | Plots forward and reverse V-I curves, finds cut-in voltage and dynamic resistance |

Each practical has three tabs:

- **Theory:** aim, apparatus, theory, circuit diagram, formulas, expected readings, precautions, and a link to the matching [Virtual Labs](https://www.vlab.co.in/) experiment.
- **Workbench:** the interactive kit with a step-by-step procedure that ticks itself off, hints, a "show next cord" guide, a **Next step** button that does the current step for the student (cords, knobs and readings), digital or analog meters, and a Record button that fills the observation table.
- **Observations and Result:** editable tables, theory vs measured % error, graphs, an automatic result, viva questions, and Save as PDF.

### Breadboard Sandbox

A free breadboard for building any DC circuit: wires, resistors (with colour bands), potentiometers, diodes, LEDs, switches, batteries, a DC supply, voltmeters and ammeters.

- Place a part by clicking two holes. Drag a part, or one of its legs, to move it.
- A multimeter with red and black probes measures volts, or ohms with the power removed.
- A live circuit diagram is drawn from what is on the board.
- Realistic faults: LEDs burn out without a resistor, resistors overheat, and shorted supplies are flagged.
- Undo, examples, autosave, and save/open circuit files (`.json`).

## Getting started

Needs [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173).

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm test` | Run the circuit-solver and kit tests (Vitest) |
| `npm run typecheck` | TypeScript check only |
| `npm run format` | Format the code with Prettier |

The built `dist/` folder is a plain static site and can be hosted anywhere (GitHub Pages, Netlify, a college server).

## How it works

- **Circuit solver** (`src/engine/solver.ts`): Modified Nodal Analysis for DC circuits, with Newton-Raphson for diodes and LEDs.
- **Kits are data** (`src/kits/`): sockets, printed tracks, resistors, knobs, supplies and meters. `src/engine/circuit.ts` turns a kit plus the student's cords into a circuit, solves it, and works out what each meter is measuring.
- **Practicals are data** (`src/practicals/`): procedure steps, tables, formulas, results and viva questions for each kit.
- **Drawing** (`src/components/panel/`): the kit panel, meters, knobs, switches and cords as SVG.
- **Sandbox** (`src/sandbox/`): breadboard model, part drawings, multimeter and live diagram.

To add a practical: write a kit in `src/kits/`, a practical in `src/practicals/`, list it in `src/practicals/catalog.ts`, and add tests in `src/engine/`.

## Project layout

```
src/
  engine/        circuit solver, kit analysis, tests
  kits/          trainer kit definitions
  practicals/    practical content and catalogue
  components/    workbench, theory and observation tabs, kit drawing, schematics
  sandbox/       breadboard sandbox
  store.ts       per-practical state, saved in the browser
  App.tsx        pages and routing
PRD.md           product requirements and roadmap
```

## Roadmap

- Computer Networks lab
- CS lab
- More BEEE kits (AC circuits, transistors, op-amps)

See `PRD.md` for details.

## Credits

Experiment methods and observation-table layouts follow the Virtual Labs (MoE, Government of India) experiments from IIT Roorkee (Basic Electrical Science) and IIT Kharagpur (Basic Electronics). Kit layouts are modelled on common college trainer kits.
