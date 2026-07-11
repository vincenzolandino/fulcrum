import { describe, expect, it } from 'vitest';
import {
  blockadeFlag,
  computeIc,
  isSupplied,
  noFoodFlag,
  noOilFlag,
  runEconomy,
  supplyFactor,
} from '../src/engine/economy';
import type { Army, GameState, RegionId, Rng } from '../src/engine/types';
import { deepFreeze, fixedRng, frozenTestState, makeTestState } from './fixtures';

// Economy never draws randomness; any pinned rng will do.
const rng = (): Rng => fixedRng([0.5]);

const mkArmy = (id: string, strength: number, equipment: number, location: RegionId): Army => ({
  id,
  name: id,
  strength,
  equipment,
  experience: 0,
  location,
  posture: 'hold',
  moveTarget: null,
});

// POL rebased onto real-map regions with clean numbers: capital ger-rhineland
// (real ic 20) plus fra-alsace (real ic 10, adjacent), stability 50 →
// stabilityFactor 0.75. Real geometry is what economy.ts reads (REGIONS), so
// tests use real region ids and override control in the state.
const polTwoRegions = (mutate?: (s: GameState) => void): GameState => {
  const s = makeTestState();
  s.nations.POL.capital = 'ger-rhineland';
  s.nations.POL.stability = 50;
  s.regions = {
    'ger-rhineland': { owner: 'POL', controller: 'POL', entrenchment: 0 },
    'fra-alsace': { owner: 'POL', controller: 'POL', entrenchment: 0 },
  };
  if (mutate) mutate(s);
  return deepFreeze(s);
};

// POL with one region, ger-ruhr (real ic 40, steel 30), stability 100 →
// ic exactly 40. Two armies with distinct gaps for production tests.
const prodState = (mutate?: (s: GameState) => void): GameState => {
  const s = makeTestState();
  const pol = s.nations.POL;
  pol.capital = 'ger-ruhr';
  pol.stability = 100;
  pol.icAllocation = { army: 0.5, air: 0.25, navy: 0.25, civilian: 0 };
  pol.armies = [mkArmy('p1', 60, 50, 'ger-ruhr'), mkArmy('p2', 100, 90, 'ger-ruhr')];
  pol.manpower = 300;
  s.regions = { 'ger-ruhr': { owner: 'POL', controller: 'POL', entrenchment: 0 } };
  if (mutate) mutate(s);
  return deepFreeze(s);
};

describe('supply (BFS from capital through friendly control)', () => {
  it('regions connected to the capital are supplied; cut-off ones are not', () => {
    const s = polTwoRegions((st) => {
      // pol-warsaw is POL-controlled but none of its real neighbours are
      // friendly or even present → disconnected from the capital network.
      st.regions['pol-warsaw'] = { owner: 'POL', controller: 'POL', entrenchment: 0 };
    });
    expect(isSupplied(s, 'POL', 'ger-rhineland')).toBe(true); // the capital itself
    expect(isSupplied(s, 'POL', 'fra-alsace')).toBe(true);
    expect(isSupplied(s, 'POL', 'pol-warsaw')).toBe(false);
    expect(supplyFactor(s, 'POL', 'fra-alsace')).toBe(1);
    expect(supplyFactor(s, 'POL', 'pol-warsaw')).toBe(0.5); // UNSUPPLIED_FACTOR
  });

  it('lost capital means nothing is supplied', () => {
    const s = polTwoRegions((st) => {
      st.regions['ger-rhineland'] = { owner: 'POL', controller: 'GER', entrenchment: 0 };
    });
    expect(isSupplied(s, 'POL', 'ger-rhineland')).toBe(false);
    expect(isSupplied(s, 'POL', 'fra-alsace')).toBe(false);
  });

  // Bridge geometry: pol-warsaw (capital) — pol-east — sov-byelorussia, with
  // the middle region controlled by FRA. Reachability of the far region then
  // hinges entirely on whether FRA counts as friendly.
  const bridge = (mutate?: (s: GameState) => void): GameState => {
    const s = makeTestState();
    s.regions = {
      'pol-warsaw': { owner: 'POL', controller: 'POL', entrenchment: 0 },
      'pol-east': { owner: 'POL', controller: 'FRA', entrenchment: 0 },
      'sov-byelorussia': { owner: 'POL', controller: 'POL', entrenchment: 0 },
    };
    if (mutate) mutate(s);
    return deepFreeze(s);
  };

  it('does not route supply through an unrelated neutral/foreign controller', () => {
    const s = bridge(); // POL neutral, FRA allies, no war
    expect(isSupplied(s, 'POL', 'sov-byelorussia')).toBe(false);
  });

  it('routes supply through a war ally', () => {
    const s = bridge((st) => {
      st.wars = [{ id: 'w', attackers: ['GER'], defenders: ['POL', 'FRA'], startTurn: 0 }];
    });
    expect(isSupplied(s, 'POL', 'sov-byelorussia')).toBe(true);
  });

  it('routes supply through a same-faction ally', () => {
    const s = bridge((st) => {
      st.nations.POL.faction = 'allies';
    });
    expect(isSupplied(s, 'POL', 'sov-byelorussia')).toBe(true);
  });

  it('routes supply through a puppet relationship', () => {
    const s = bridge((st) => {
      st.nations.POL.puppetOf = 'FRA';
    });
    expect(isSupplied(s, 'POL', 'sov-byelorussia')).toBe(true);
  });
});

describe('ic recompute', () => {
  it('ic = Σ region ic × stabilityFactor: 30 × 0.75 = 22.5', () => {
    const s = polTwoRegions();
    const out = runEconomy(s, rng());
    expect(out.nations.POL.ic).toBeCloseTo(22.5, 10);
    expect(computeIc(s, 'POL')).toBeCloseTo(22.5, 10);
  });

  it('disconnected regions contribute no ic', () => {
    const s = polTwoRegions((st) => {
      st.regions['pol-warsaw'] = { owner: 'POL', controller: 'POL', entrenchment: 0 };
    });
    // pol-warsaw (real ic 15) is cut off → still 30 × 0.75, not 45 × 0.75.
    expect(runEconomy(s, rng()).nations.POL.ic).toBeCloseTo(22.5, 10);
  });

  it('applies the permanent ic modifier flag from { t: "ic" } effects', () => {
    const s = polTwoRegions((st) => {
      st.flags = { IC_MOD_POL: -10 };
    });
    expect(runEconomy(s, rng()).nations.POL.ic).toBeCloseTo(12.5, 10);
  });
});

describe('resources', () => {
  it('adds controlled-region income and subtracts consumption', () => {
    // Fixture POL: pol-warsaw (steel 5, food 12) + pol-danzig (food 6); one
    // army on hold (food 1, no oil), air 50 → oil (50+0)/200 = 0.25.
    const s = frozenTestState();
    const out = runEconomy(s, rng());
    expect(out.nations.POL.stockpile.oil).toBeCloseTo(49.75, 10);
    expect(out.nations.POL.stockpile.steel).toBeCloseTo(55, 10);
    expect(out.nations.POL.stockpile.food).toBeCloseTo(67, 10);
  });

  it('attacking postures burn oil per army', () => {
    const s = frozenTestState((st) => {
      st.nations.POL.armies[0].posture = 'offensive';
    });
    const out = runEconomy(s, rng());
    expect(out.nations.POL.stockpile.oil).toBeCloseTo(48.75, 10); // 50 − 1 − 0.25
  });

  it('applies the blockade factor from _blockade_{id} to resource income', () => {
    const s = frozenTestState((st) => {
      st.flags[blockadeFlag('POL')] = 0.5;
    });
    const out = runEconomy(s, rng());
    expect(out.nations.POL.stockpile.steel).toBeCloseTo(52.5, 10); // 50 + 5×0.5
    expect(out.nations.POL.stockpile.food).toBeCloseTo(58, 10); // 50 + 18×0.5 − 1
  });

  it('clamps stockpiles to the 0..999 band', () => {
    const s = prodState((st) => {
      st.nations.POL.stockpile.steel = 998; // +30 steel income from the Ruhr
    });
    expect(runEconomy(s, rng()).nations.POL.stockpile.steel).toBe(999);
  });
});

describe('shortages', () => {
  it('oil at zero sets the _nooil_ flag and reports to the player', () => {
    const s = frozenTestState((st) => {
      st.nations.POL.stockpile.oil = 0; // no oil income in Poland
      st.nations.POL.armies[0].posture = 'offensive';
    });
    const out = runEconomy(s, rng());
    expect(out.flags[noOilFlag('POL')]).toBe(true);
    expect(out.flags[noFoodFlag('POL')]).toBeUndefined();
    expect(out.reports.some((r) => r.kind === 'domestic' && /fuel/i.test(r.title))).toBe(true);
  });

  it('food at zero sets the _nofood_ flag, drains stability, and reports', () => {
    const s = frozenTestState((st) => {
      // POL loses control of everything: no income, but the army still eats.
      st.regions['pol-warsaw'] = { owner: 'POL', controller: 'GER', entrenchment: 0 };
      st.regions['pol-danzig'] = { owner: 'POL', controller: 'GER', entrenchment: 2 };
      st.nations.POL.stockpile.food = 0;
    });
    const out = runEconomy(s, rng());
    expect(out.flags[noFoodFlag('POL')]).toBe(true);
    // 60 − 2 (famine) + 0.2 (civilian alloc 0.3 ≥ threshold) = 58.2
    expect(out.nations.POL.stability).toBeCloseTo(58.2, 10);
    expect(out.reports.some((r) => r.kind === 'domestic' && /food/i.test(r.title))).toBe(true);
  });

  it('no shortage flags or reports when stockpiles hold', () => {
    const out = runEconomy(frozenTestState(), rng());
    expect(out.flags[noOilFlag('POL')]).toBeUndefined();
    expect(out.flags[noFoodFlag('POL')]).toBeUndefined();
    expect(out.reports).toEqual([]);
  });

  it('AI shortages are flagged but not reported to the player', () => {
    const s = frozenTestState((st) => {
      st.nations.GER.stockpile.oil = 0; // GER holds no oil regions
    });
    const out = runEconomy(s, rng());
    expect(out.flags[noOilFlag('GER')]).toBe(true); // air+navy burn 3/turn
    expect(out.reports).toEqual([]); // player is POL
  });
});

describe('production', () => {
  // prodState: ic = 40 × 1.0 = 40; alloc army 0.5 → equipment pool
  // 40×0.5×0.35 = 7, strength pool 40×0.5×0.25 = 5; air/navy pools
  // 40×0.25×0.3 = 3 each.
  it('replenishes equipment neediest-first', () => {
    const out = runEconomy(prodState(), rng());
    const [p1, p2] = out.nations.POL.armies;
    expect(p1.equipment).toBeCloseTo(57, 10); // 50 + all 7 points
    expect(p2.equipment).toBeCloseTo(90, 10); // untouched
  });

  it('water-fills equipment: the lowest armies equalize before rising together', () => {
    const s = prodState((st) => {
      st.nations.POL.armies[0].equipment = 50;
      st.nations.POL.armies[1].equipment = 52;
    });
    const out = runEconomy(s, rng());
    // 2 points lift 50→52, remaining 5 split evenly → both 54.5.
    expect(out.nations.POL.armies[0].equipment).toBeCloseTo(54.5, 10);
    expect(out.nations.POL.armies[1].equipment).toBeCloseTo(54.5, 10);
  });

  it('replenishes strength from manpower 1:1', () => {
    const out = runEconomy(prodState(), rng());
    expect(out.nations.POL.armies[0].strength).toBeCloseTo(65, 10); // 60 + 5
    expect(out.nations.POL.armies[1].strength).toBeCloseTo(100, 10);
    expect(out.nations.POL.manpower).toBeCloseTo(295, 10); // 300 − 5
  });

  it('manpower floors strength production', () => {
    const s = prodState((st) => {
      st.nations.POL.manpower = 2; // pool would be 5, only 2 available
    });
    const out = runEconomy(s, rng());
    expect(out.nations.POL.armies[0].strength).toBeCloseTo(62, 10);
    expect(out.nations.POL.manpower).toBe(0);
  });

  it('does not charge manpower for strength lost to the 100 cap', () => {
    const s = prodState((st) => {
      st.nations.POL.armies = [mkArmy('p1', 99, 100, 'ger-ruhr'), mkArmy('p2', 100, 100, 'ger-ruhr')];
    });
    const out = runEconomy(s, rng());
    expect(out.nations.POL.armies[0].strength).toBe(100); // only 1 point fits
    expect(out.nations.POL.manpower).toBeCloseTo(299, 10); // 300 − 1, not − 5
  });

  it('adds air and navy points from their allocation shares', () => {
    const out = runEconomy(prodState(), rng());
    expect(out.nations.POL.air).toBeCloseTo(53, 10); // 50 + 3
    expect(out.nations.POL.navy).toBeCloseTo(3, 10); // 0 + 3
  });

  it('civilian allocation ≥ 0.3 grants the stability bonus; below it does not', () => {
    const invest = prodState((st) => {
      st.nations.POL.icAllocation = { army: 0.3, air: 0.1, navy: 0.1, civilian: 0.5 };
      st.nations.POL.stability = 50;
    });
    expect(runEconomy(invest, rng()).nations.POL.stability).toBeCloseTo(50.2, 10);

    const noInvest = prodState((st) => {
      st.nations.POL.stability = 50; // alloc.civilian is 0 here
    });
    expect(runEconomy(noInvest, rng()).nations.POL.stability).toBeCloseTo(50, 10);
  });
});

describe('housekeeping', () => {
  it('skips dead nations entirely', () => {
    const s = frozenTestState((st) => {
      st.nations.POL.alive = false;
    });
    const out = runEconomy(s, rng());
    expect(out.nations.POL).toBe(s.nations.POL); // untouched, same reference
  });

  it('never mutates the input state', () => {
    const s = frozenTestState(); // deep-frozen: any write would throw
    const out = runEconomy(s, rng());
    expect(out).not.toBe(s);
    expect(s.nations.POL.stockpile.food).toBe(50);
    expect(s.nations.POL.ic).toBe(20);
  });
});
