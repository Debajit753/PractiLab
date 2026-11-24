# PractiLab: Product Requirements Document

**Version:** 0.1 (draft for review)
**Date:** 24 Nov 2026
**Working name:** PractiLab (placeholder, easy to change)

---

## 1. Summary

PractiLab is a website where engineering students do practicals online, the way they would in a college lab. They start with BEEE (Basic Electrical and Electronics Engineering), and later move on to Computer Networks and CS. Each practical shows a realistic trainer kit on screen, like the real "Verification of KCL and KVL" box. Students drag wires between sockets, turn knobs, flip switches, change values on resistance boxes and read analog meters whose needles move. A circuit simulator runs behind the panel, so every reading is calculated from the circuit the student actually wired.

There is also a free **Sandbox** mode with a breadboard, where students build any circuit from a parts tray.

## 2. Problem

- Lab time in college is short, kits are shared by groups of 3 to 5, and many students only watch.
- Students can't practise before a lab, or repeat it before a viva or exam.
- Kits break, meters are faulty and fuses blow, so readings often don't match theory and nobody knows why.
- Existing virtual labs often look nothing like the real kit, so the practice doesn't carry over.

## 3. Users

| User | Need |
|---|---|
| 1st year B.Tech student (main user) | Practise each BEEE practical before and after the lab, fill the observation table, understand the result, prepare for viva |
| Student revising for an exam | Quickly redo a practical and check the expected readings |
| Teacher (later phase) | Demonstrate in class on a projector, assign practicals |

## 4. Goals and non-goals

**Goals for v1**
1. Realistic kit panels for 6 BEEE practicals, wired by the student.
2. Accurate readings from a real circuit solver, not hard-coded answers.
3. A full lab-manual flow for each practical: aim, apparatus, theory, procedure, observation table, calculation, result, viva questions.
4. A free breadboard Sandbox.
5. Runs locally and offline on a laptop, with no accounts and no cloud.

**Not in v1**
- Logins, cloud saving, teacher dashboards, grading.
- AC circuits, oscilloscope, transistor and op-amp practicals.
- Computer Networks and CS labs (planned for later phases, see section 11).
- Mobile phone layout (tablet and laptop only in v1).

## 5. Site structure

```
Home
├── BEEE Lab                 (v1)
│   ├── KCL and KVL
│   ├── Thevenin's Theorem
│   ├── Norton's Theorem
│   ├── Superposition Theorem
│   ├── Maximum Power Transfer
│   ├── PN Junction Diode V-I Characteristics
│   └── Sandbox (breadboard)
├── Computer Networks Lab    (later, shown as "Coming soon")
└── CS Lab                   (later, shown as "Coming soon")
```

Each practical page has three tabs:

1. **Theory:** aim, apparatus, theory, formulas and circuit diagram.
2. **Workbench:** the interactive kit, with the procedure steps alongside.
3. **Observations and Result:** observation table, calculations, theory vs measured comparison, result, and viva questions.

## 6. The workbench (core experience)

### 6.1 Kit panel elements

Every kit is built from the same reusable parts, styled to look like the real trainer boxes.

| Element | Behaviour |
|---|---|
| **Banana sockets** (red, black, yellow, blue) | Click or drag from one socket to another to add a wire. A socket can take several wires. |
| **Wires (patch cords)** | Drawn as curved cables. Student picks a colour. Click a wire to select it, then press Delete or right-click to remove it. "Clear all wires" button. |
| **Fixed resistors** printed on the panel | Values are shown in Ω, matching the real kit. |
| **Dashed links** between sockets | Show where the student must put a wire (or the ammeter) to complete the path, exactly like the real kit. |
| **DC power supply** with SET VOLTS knob | Drag or scroll to rotate the knob. The output changes smoothly over the kit's range, e.g. 0 to 5 V. |
| **Mains ON/OFF toggle switch** and **mains LED** | Nothing works until the switch is ON. The LED glows when it is on. |
| **Analog voltmeter and milliammeter** | The needle moves with a short, damped swing. The student reads the scale like a real meter. Optional digital readout toggle as a "help" mode. |
| **Decade resistance box** | Rotary dials for ×1, ×10, ×100 and ×1000 Ω. Used for load resistors (Max Power, Thevenin). |
| **Potentiometer / rheostat** | A knob with its value shown. |
| **SPDT switches** | Used in Superposition to swap a source for a short. |

### 6.2 Realistic behaviour

- **Wrong polarity:** the meter needle kicks below zero and a warning appears ("Reverse the meter leads").
- **Over-range:** the needle pins at full scale and a warning appears.
- **Ammeter connected across the supply (short):** a "Fuse blown" message appears, the supply cuts out, and the student must fix the wiring and press Reset.
- **Open circuit:** meters read zero. A "Check my wiring" button points out the problem in simple words.
- **Optional real-world error:** a setting adds ±1 to 2% meter error so readings feel like a real lab. It is off by default.

### 6.3 Guidance

- The procedure steps sit next to the kit. Steps tick off on their own when the student wires a step correctly.
- **Hint** shows which sockets to connect next. **Show solution** wires the whole kit (it is marked in the results as "solution used").
- **Record reading** button: copies the current meter readings into the next row of the observation table.

## 7. v1 practicals

### 7.1 KCL and KVL (copy of the kit in the photo)

**Panel:** 0 to 5 V DC output with SET VOLTS knob, input sockets, voltmeter 0 to 5 V, milliammeter 0 to 50 mA, mains switch and LED.
**Circuit:** two parallel branches across the input. Branch A is R1 = 50 Ω in series with R2 = 100 Ω (yellow sockets). Branch B is R3 = 220 Ω in series with R4 = 330 Ω (blue sockets). The branches meet at the mA meter, which returns to the negative input.

**Expected values at 5 V:**

| Quantity | Value |
|---|---|
| Branch A current, I1 = 5 / 150 | 33.3 mA |
| Branch B current, I2 = 5 / 550 | 9.09 mA |
| Total current, I = I1 + I2 (KCL) | 42.4 mA (inside the 50 mA meter range) |
| V(R1) + V(R2) = 1.67 + 3.33 | 5.00 V (KVL, loop A) |
| V(R3) + V(R4) = 2.00 + 3.00 | 5.00 V (KVL, loop B) |

**Observation table:** supply V, I1, I2, I, I1 + I2, and V(R1), V(R2), V(R3), V(R4) and their loop sums, for 3 to 5 different supply settings.

### 7.2 Thevenin's Theorem

**Panel:** 0 to 15 V supply, R1 = 1 kΩ, R2 = 1 kΩ, R3 = 470 Ω, load RL on a decade box, voltmeter 0 to 15 V, milliammeter 0 to 20 mA.
**Steps:** measure IL with RL connected. Remove RL and measure Vth across the open terminals. Short the source and measure Rth with the built-in ohmmeter. Compare IL with Vth / (Rth + RL).

### 7.3 Norton's Theorem

Same panel as Thevenin. The student shorts the load terminals through the mA meter to measure IN, then finds RN and checks IL = IN × RN / (RN + RL).

### 7.4 Superposition Theorem

**Panel:** two supplies V1 and V2 (0 to 15 V each), a T-network with R1, R2 and R3 = 1 kΩ each, two SPDT switches to replace each source with a short, and a milliammeter in the middle branch.
**Steps:** measure I with both sources on, then with only V1, then with only V2. Check that I = I' + I''.

### 7.5 Maximum Power Transfer

**Panel:** 0 to 10 V supply, internal resistance Rs = 1 kΩ, load RL on a decade box, voltmeter and milliammeter.
**Steps:** sweep RL from 100 Ω to 2 kΩ and record V and I. The site plots P = V × I against RL live, and the student sees the peak at RL = Rs.

### 7.6 PN Junction Diode V-I Characteristics

**Panel:** forward supply 0 to 2 V (fine knob), reverse supply 0 to 30 V, series resistor 1 kΩ, a diode selector (Silicon 1N4007 or Germanium OA79), a voltmeter with 0 to 2 V and 0 to 30 V ranges, and a meter with mA (forward) and µA (reverse) ranges.
**Steps:** forward bias, then reverse bias. The V-I graph draws itself as readings are recorded. The site shows the knee voltage (about 0.7 V for Si, 0.3 V for Ge) and the reverse leakage current.

## 8. Sandbox (free breadboard)

- A breadboard with rails, plus a parts tray: DC supply, battery, resistor, potentiometer, decade box, diode, LED, switch, voltmeter, ammeter and wire.
- Drag parts onto the board. Double-click a part to change its value.
- The same solver runs live. LEDs light up when current flows, and the meters respond.
- Save and load circuits in the browser (localStorage) and export them as a file.

## 9. Lab record and results

- Observation tables can be filled by hand or with **Record reading**.
- Calculations are shown step by step with the student's own numbers.
- The theory vs measured table shows the % error.
- Graphs appear where the practical needs one (Max Power, Diode).
- Viva section: 8 to 10 common questions per practical, with answers hidden until clicked.
- **Export:** download the completed practical (aim, table, graph, result) as a PDF to print for the lab file.
- Progress is saved in the browser, so a half-done practical is still there next time.

## 10. Technical approach

| Area | Choice |
|---|---|
| Framework | React + Vite + TypeScript, run locally with `npm run dev` |
| Drawing | SVG for the kit panels, wires, knobs and meters (sharp at any zoom, easy to click) |
| State | Zustand store: components, wires, knob positions, switch states |
| Circuit solver | Own Modified Nodal Analysis (MNA) solver for DC circuits. For the diode, a Newton-Raphson loop on the Shockley equation. Meters are modelled with a realistic internal resistance. |
| Graphs | Small SVG plot component (no heavy chart library) |
| Kit definitions | Each practical is one data file: panel layout, sockets, hidden internal wiring, ranges, procedure, expected values and viva. Adding a new practical means adding a file, not new code. |
| Tests | Vitest unit tests for the solver, checked against hand-calculated answers for every practical |
| Storage | Browser localStorage only. No server, no accounts. |
| PDF export | Browser print to PDF from a print-styled results page |

## 11. Phases

| Phase | Scope |
|---|---|
| **1** | Project setup, solver with tests, reusable kit parts, and the **KCL and KVL** practical complete end to end |
| **2** | Thevenin, Norton, Superposition, Max Power and PN Diode practicals |
| **3** | Sandbox breadboard |
| **4** | Computer Networks lab, for example IP addressing and subnetting, building a small network and sending packets, and watching ARP, routing and TCP handshake step by step |
| **5** | CS lab (topics to be decided) |
| Later | Accounts, teacher dashboard, AC circuits, oscilloscope, transistor and op-amp kits, mobile layout |

## 12. Success criteria for v1

1. A student who has never seen the kit can finish KCL and KVL in under 15 minutes using only the on-screen procedure.
2. Every reading matches a hand calculation to within 0.5% (with the error setting off).
3. Wrong wiring never crashes the page. It always gives a meter response or a clear message.
4. Each practical loads in under 2 seconds on a normal laptop and works with no internet.
5. The exported PDF is good enough to attach to a lab record file.

## 13. Open questions

1. **Name:** keep "PractiLab" or choose another name?
2. **Syllabus:** which university's BEEE lab manual should the theory, procedure and viva text follow (for example AKTU or another)? Kit values for practicals 7.2 to 7.6 are typical trainer values and can be changed to match your college kits.
3. **Look:** copy the grey box style from the photo for every kit, or give each kit its own colour?
4. **Language:** English only, or English and Hindi?
