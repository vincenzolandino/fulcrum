// UI flavor for the six tech tracks. The mechanical modifiers are encoded in
// the engine formulas (balance.ts); this file supplies names and per-level
// labels only. levels[0] is the name of level 1, levels[4] of level 5.

import type { TechTrack } from '../engine/types';

export const TECH_INFO: Record<TechTrack, { name: string; levels: string[] }> = {
  armor: {
    name: 'Armoured Warfare',
    levels: [
      'Tankettes & Cavalry Tanks',
      'Medium Tank Designs',
      'Combined-Arms Divisions',
      'Heavy Breakthrough Armour',
      'Universal Battle Tanks',
    ],
  },
  air: {
    name: 'Air Power',
    levels: [
      'Biplane Squadrons',
      'All-Metal Monoplanes',
      'Strategic Bomber Fleets',
      'Long-Range Escort Fighters',
      'Jet Aircraft',
    ],
  },
  naval: {
    name: 'Naval Arms',
    levels: [
      'Coastal Defence Fleets',
      'Cruiser Squadrons',
      'Carrier Task Forces',
      'Fleet Train & Logistics',
      'Oceanic Supremacy',
    ],
  },
  industry: {
    name: 'Industrial Base',
    levels: [
      'Machine-Tool Programs',
      'Mass Production Lines',
      'War Economy Conversion',
      'Total Mobilisation',
      'Continuous-Flow Plants',
    ],
  },
  doctrine: {
    name: 'Military Doctrine',
    levels: [
      'Great War Methods',
      'Motorised Staff Work',
      'Deep Operations',
      'Combined Offensives',
      'Integrated Command',
    ],
  },
  secret: {
    name: 'Secret Weapons',
    levels: [
      'Research Bureaus',
      'Uranium Committee',
      'Reactor Pile',
      'Weapon Assembly',
      'The Atomic Bomb',
    ],
  },
};
