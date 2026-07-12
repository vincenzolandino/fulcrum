// Shared hand-built test world for engine tests. Other test files import from
// here — keep it small and stable.
//
// Three nations (GER, POL, FRA) on a five-region strip with one cycle:
//
//   fra-paris — ger-rhineland — ger-berlin — pol-danzig — pol-warsaw
//                                    └──────────────────────┘
//   (berlin borders both danzig and warsaw; all adjacency symmetric)
//
// Numbers are chosen so power math asserts cleanly:
//   landPower(GER)  = 2 × (0.80 × 0.75 × (1 + 0.15·2 + 0.10·1)) × 10 = 16.8
//   totalPower(GER) = 16.8 + 200/100 + 400/100                       = 22.8
//   landPower(POL)  = 0.70 × 0.50 × 1.0 × 10 = 3.5;  totalPower(POL) = 4.0
//   landPower(FRA)  = 2 × (0.75 × 0.65) × 10 = 9.75; totalPower(FRA) = 14.75
//
// Diplomatic setup: FRA guarantees POL (declareWar guarantee-join tests).
// Relations: GER–POL −20, GER–FRA −30, POL–FRA +40. Player nation is POL.
// GER has a 40-point spy network in POL. pol-danzig starts entrenched at 2.
// Tension starts at 20, turn at 0, no wars, no flags.

import type {
  AIPersonality,
  Army,
  GameState,
  Nation,
  NationId,
  Region,
  RegionId,
  Rng,
  TechTrack,
} from '../src/engine/types';

// Static region data (terrain/adjacency/yields). GameState only carries
// RegionState; modules that need static geometry in tests can use this map.
export const TEST_REGIONS: Record<RegionId, Region> = {
  'fra-paris': {
    id: 'fra-paris', name: 'Paris', terrain: 'urban',
    adjacent: ['ger-rhineland'], coastal: false,
    ic: 40, resources: { oil: 0, steel: 5, food: 10 }, vp: 10,
  },
  'ger-rhineland': {
    id: 'ger-rhineland', name: 'Rhineland', terrain: 'plains',
    adjacent: ['fra-paris', 'ger-berlin'], coastal: false,
    ic: 35, resources: { oil: 0, steel: 20, food: 5 }, vp: 5,
  },
  'ger-berlin': {
    id: 'ger-berlin', name: 'Berlin', terrain: 'urban',
    adjacent: ['ger-rhineland', 'pol-danzig', 'pol-warsaw'], coastal: false,
    ic: 45, resources: { oil: 0, steel: 10, food: 10 }, vp: 10,
  },
  'pol-danzig': {
    id: 'pol-danzig', name: 'Danzig', terrain: 'plains',
    adjacent: ['ger-berlin', 'pol-warsaw'], coastal: true,
    ic: 10, resources: { oil: 0, steel: 5, food: 5 }, vp: 3,
  },
  'pol-warsaw': {
    id: 'pol-warsaw', name: 'Warsaw', terrain: 'urban',
    adjacent: ['pol-danzig', 'ger-berlin'], coastal: false,
    ic: 15, resources: { oil: 0, steel: 5, food: 15 }, vp: 8,
  },
};

const techOf = (armor: number, doctrine: number): Record<TechTrack, number> => ({
  armor, air: 0, naval: 0, industry: 1, doctrine, secret: 0,
});

const army = (id: string, name: string, strength: number, equipment: number, location: RegionId): Army => ({
  id, name, strength, equipment, experience: 0, location, posture: 'hold', moveTarget: null,
});

const ai = (aggression: number, focus: AIPersonality['focus']): AIPersonality => ({
  aggression, riskTolerance: 0.5, ideologyZeal: 0.5, opportunism: 0.5, focus,
});

const baseNation = (): Omit<
  Nation,
  'id' | 'name' | 'adjective' | 'color' | 'capital' | 'government' | 'faction'
  | 'armies' | 'navy' | 'air' | 'manpower' | 'ic' | 'stability' | 'warSupport'
  | 'relations' | 'guarantees' | 'spyNetworks' | 'tech' | 'leader' | 'ai'
> => ({
  alive: true,
  puppetOf: null,
  stockpile: { oil: 50, steel: 50, food: 50 },
  icAllocation: { army: 0.4, air: 0.2, navy: 0.1, civilian: 0.3 },
  pacts: [],
  claims: [],
  research: { track: null, progress: 0 },
});

/** Fresh, unfrozen state each call — tweak it in a test, then deepFreeze it. */
export function makeTestState(): GameState {
  const GER: Nation = {
    ...baseNation(),
    id: 'GER', name: 'Germany', adjective: 'German', color: '#a05252',
    capital: 'ger-berlin', government: 'fascist', faction: 'axis',
    ic: 130, manpower: 1000,
    armies: [
      army('ger-1', '1. Armee', 80, 75, 'ger-berlin'),
      army('ger-2', '2. Armee', 80, 75, 'ger-rhineland'),
    ],
    navy: 200, air: 400,
    stability: 70, warSupport: 50,
    relations: { POL: -20, FRA: -30 },
    guarantees: [],
    spyNetworks: { POL: 40 },
    tech: techOf(2, 1),
    leader: 'hitler',
    ai: ai(0.9, 'expansion'),
  };
  const POL: Nation = {
    ...baseNation(),
    id: 'POL', name: 'Poland', adjective: 'Polish', color: '#6b6b5f',
    capital: 'pol-warsaw', government: 'authoritarian', faction: 'neutral',
    ic: 20, manpower: 300,
    armies: [army('pol-1', 'Armia Warszawa', 70, 50, 'pol-warsaw')],
    navy: 0, air: 50,
    stability: 60, warSupport: 40,
    relations: { GER: -20, FRA: 40 },
    guarantees: [],
    spyNetworks: {},
    tech: techOf(0, 0),
    leader: 'beck',
    ai: ai(0.2, 'defense'),
  };
  const FRA: Nation = {
    ...baseNation(),
    id: 'FRA', name: 'France', adjective: 'French', color: '#4a6fa5',
    capital: 'fra-paris', government: 'democracy', faction: 'allies',
    ic: 70, manpower: 800,
    armies: [
      army('fra-1', '1re Armée', 75, 65, 'fra-paris'),
      army('fra-2', '2e Armée', 75, 65, 'fra-paris'),
    ],
    navy: 300, air: 200,
    stability: 55, warSupport: 30,
    relations: { GER: -30, POL: 40 },
    guarantees: ['POL'], // FRA guarantees POL — declareWar join tests rely on this
    spyNetworks: {},
    tech: techOf(0, 0),
    leader: 'daladier',
    ai: ai(0.3, 'defense'),
  };

  return {
    seed: 1,
    turn: 0,
    playerNation: 'POL',
    nations: { GER, POL, FRA },
    regions: {
      'fra-paris': { owner: 'FRA', controller: 'FRA', entrenchment: 0 },
      'ger-rhineland': { owner: 'GER', controller: 'GER', entrenchment: 0 },
      'ger-berlin': { owner: 'GER', controller: 'GER', entrenchment: 0 },
      'pol-danzig': { owner: 'POL', controller: 'POL', entrenchment: 2 },
      'pol-warsaw': { owner: 'POL', controller: 'POL', entrenchment: 0 },
    },
    wars: [],
    tension: 20,
    flags: {},
    firedEvents: [],
    queuedEvents: [],
    pendingChoices: [],
    missions: [],
    activeBattles: [],
    chronicle: [],
    reports: [],
    gameOver: null,
  };
}

/**
 * Deterministic Rng for tests: `next()` returns the given values, cycling.
 * pick/chance/int are derived from next() exactly like the real makeRng, so a
 * pinned value maps predictably (e.g. fixedRng([0.4]).chance(0.5) === true).
 * Unlike makeRng, chance() ALWAYS consumes a value, even for p<=0 / p>=1.
 */
export function fixedRng(values: number[]): Rng {
  if (values.length === 0) throw new Error('fixedRng needs at least one value');
  let i = 0;
  const next = (): number => values[i++ % values.length];
  return {
    next,
    pick<T>(arr: T[]): T {
      if (arr.length === 0) throw new Error('fixedRng.pick on empty array');
      return arr[Math.min(arr.length - 1, Math.floor(next() * arr.length))];
    },
    chance(p: number): boolean {
      return next() < p;
    },
    int(lo: number, hi: number): number {
      return Math.min(hi, lo + Math.floor(next() * (hi - lo + 1)));
    },
  };
}

/**
 * Recursively Object.freeze. Engine tests freeze their input state to prove
 * engine functions never mutate it (frozen writes throw in strict mode).
 */
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

/** Convenience: a fresh fixture state, deep-frozen. */
export const frozenTestState = (mutate?: (s: GameState) => void): GameState => {
  const s = makeTestState();
  if (mutate) mutate(s);
  return deepFreeze(s);
};

// Re-export the id type so fixture consumers don't need a second import line.
export type { NationId };
