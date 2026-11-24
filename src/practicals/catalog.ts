import { diode } from './diode';
import { kclKvl } from './kclKvl';
import { maxPower } from './maxPower';
import { superposition } from './superposition';
import { norton, thevenin } from './theveninNorton';
import type { PracticalDef } from './types';

export interface CatalogItem {
  id: string;
  title: string;
  blurb: string;
  practical?: PracticalDef;
  /** Link for items that are not practicals (e.g. the sandbox). */
  href?: string;
  phase?: string;
}

export const beeeCatalog: CatalogItem[] = [
  {
    id: 'kcl-kvl',
    title: 'KCL and KVL',
    blurb: "Verify Kirchhoff's current and voltage laws on a two-branch DC circuit.",
    practical: kclKvl,
  },
  { id: 'thevenin', title: "Thevenin's Theorem", blurb: 'Find Vth and Rth, then check the load current.', practical: thevenin },
  { id: 'norton', title: "Norton's Theorem", blurb: 'Measure the short-circuit current IN and RN.', practical: norton },
  {
    id: 'superposition',
    title: 'Superposition Theorem',
    blurb: 'Two sources, one at a time, then both together.',
    practical: superposition,
  },
  {
    id: 'max-power',
    title: 'Maximum Power Transfer',
    blurb: 'Sweep the load on a decade box and find the peak.',
    practical: maxPower,
  },
  {
    id: 'pn-diode',
    title: 'PN Junction Diode',
    blurb: 'Forward and reverse V-I characteristics, plotted live.',
    practical: diode,
  },
  {
    id: 'sandbox',
    title: 'Sandbox',
    blurb: 'A free breadboard: build any DC circuit from a parts tray.',
    href: '#/beee/sandbox',
  },
];

export const subjects = [
  {
    id: 'beee',
    title: 'BEEE Lab',
    blurb: 'Basic Electrical and Electronics Engineering practicals on realistic trainer kits.',
    ready: true,
  },
  {
    id: 'networks',
    title: 'Computer Networks Lab',
    blurb: 'IP addressing, subnetting, routing and packets, step by step.',
    ready: false,
  },
  { id: 'cs', title: 'CS Lab', blurb: 'Hands-on computer science practicals.', ready: false },
];
