// Combat resolution tests. Every battle here is hand-computed from the locked
// formulas in the plan (constants from balance.ts):
//
//   armyPower = strength/100 × equipment/100 × (1 + 0.15·armor + 0.10·doctrine) × 10
//   attack    = Σ attacking armies power × postureMod × supplyFactor × airMod
//   defense   = (Σ defending armies power × postureMod + 0.5)
//               × terrainMod × (1 + entrenchment × 0.08) × supplyFactor × airMod
//   effRatio  = (attack / defense) × roll,  roll = 0.8 + rng.next() × 0.4
//   capture at effRatio ≥ 1.25
//   defLoss = clamp(9·effRatio, 3, 30) (+8 if captured); atkLoss = clamp(9/effRatio, 3, 30)
//   equipment loss = 0.6 × strength loss; experience +3; allout doubles attacker losses
//
// The rng is pinned with fixedRng([0.5]) so the band roll is exactly
// 0.8 + 0.5 × 0.4 = 1.0 — the middle of the band — and effRatio = attack/defense.
//
// States are built over the real map data (src/data/regions.ts), because
// combat reads terrain and adjacency from REGIONS.

import { describe, expect, it } from 'vitest';
import { runCombat, lostFlag, blockadeFlag, noOilFlag } from '../src/engine/combat';
import { iconicBattleFlag, iconicDamageFlag } from '../src/engine/iconicBattles';
import { INITIAL_CONTROL, REGION_IDS } from '../src/data/regions';
import type {
  Army,
  Faction,
  GameState,
  Nation,
  NationId,
  Posture,
  RegionId,
  RegionState,
  TechTrack,
  War,
} from '../src/engine/types';
import { deepFreeze, fixedRng } from './fixtures';

// ---------------------------------------------------------------------------
// Builders: minimal nations over the real region map.
// ---------------------------------------------------------------------------

const TECH0: Record<TechTrack, number> = {
  armor: 0, air: 0, naval: 0, industry: 0, doctrine: 0, secret: 0,
};

const army = (
  id: string,
  strength: number,
  equipment: number,
  location: RegionId,
  posture: Posture,
): Army => ({
  id, name: id, strength, equipment, experience: 0, location, posture, moveTarget: null,
});

interface NationSpec {
  id: NationId;
  capital: RegionId;
  faction: Faction;
  armies?: Army[];
  navy?: number;
  air?: number;
}

const makeNation = (spec: NationSpec): Nation => ({
  id: spec.id,
  name: spec.id,
  adjective: spec.id,
  color: '#888888',
  capital: spec.capital,
  government: 'authoritarian',
  faction: spec.faction,
  alive: true,
  puppetOf: null,
  ic: 50,
  stockpile: { oil: 50, steel: 50, food: 50 },
  icAllocation: { army: 0.4, air: 0.2, navy: 0.1, civilian: 0.3 },
  armies: spec.armies ?? [],
  navy: spec.navy ?? 0,
  air: spec.air ?? 0,
  manpower: 500,
  stability: 60,
  warSupport: 50,
  relations: {},
  guarantees: [],
  pacts: [],
  claims: [],
  spyNetworks: {},
  tech: { ...TECH0 },
  research: { track: null, progress: 0 },
  leader: `${spec.id}-leader`,
  ai: { aggression: 0.5, riskTolerance: 0.5, ideologyZeal: 0.5, opportunism: 0.5, focus: 'defense' },
});

/**
 * Full-map state: every real region present with its 1938 controller. Only the
 * listed nations exist in state.nations; regions controlled by absent nations
 * (DEN, LIT, SOV, ...) exercise the engine's missing-nation guards.
 */
function makeState(specs: NationSpec[], wars: War[], mutate?: (s: GameState) => void): GameState {
  const nations: Record<NationId, Nation> = {};
  for (const sp of specs) nations[sp.id] = makeNation(sp);
  const regions: Record<RegionId, RegionState> = {};
  for (const rid of REGION_IDS) {
    regions[rid] = { owner: INITIAL_CONTROL[rid], controller: INITIAL_CONTROL[rid], entrenchment: 0 };
  }
  const s: GameState = {
    seed: 1,
    turn: 5,
    playerNation: 'POL',
    nations,
    regions,
    wars,
    tension: 30,
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
  mutate?.(s);
  return s;
}

/** rng pinned mid-band: roll = 0.8 + 0.5 × (1.2 − 0.8) = 1.0 exactly. */
const midRng = () => fixedRng([0.5]);

const gerPolWar: War = { id: 'w-ger-pol', attackers: ['GER'], defenders: ['POL'], startTurn: 5 };

/**
 * The canonical hand-computed battle: one German army (80 str / 75 eq, tech 0,
 * offensive) at ger-berlin attacks pol-danzig (plains, entrenchment 2)
 * defended by one Polish army (40 str / 50 eq, hold). Both sides supplied, no
 * air, no navy.
 *
 *   attack   = (0.80 × 0.75 × 1 × 10) × 1.0 × 1.0 × 1.0 = 6
 *   defense  = (0.40 × 0.50 × 10 × 1.2 + 0.5) × 1.0 × 1.16 × 1.0 × 1.0 = 3.364
 *   effRatio = 6 / 3.364 ≈ 1.78359 → captured
 */
function danzigState(mutate?: (s: GameState) => void): GameState {
  return makeState(
    [
      { id: 'GER', capital: 'ger-berlin', faction: 'axis', armies: [army('g1', 80, 75, 'ger-berlin', 'offensive')] },
      { id: 'POL', capital: 'pol-warsaw', faction: 'neutral', armies: [army('p1', 40, 50, 'pol-danzig', 'hold')] },
    ],
    [gerPolWar],
    (s) => {
      s.regions['pol-danzig'].entrenchment = 2;
      mutate?.(s);
    },
  );
}

// ---------------------------------------------------------------------------
// The exact battle
// ---------------------------------------------------------------------------

describe('runCombat — exact battle math', () => {
  it('captures a plains region with the exact spec casualties, without mutating input', () => {
    const state = deepFreeze(danzigState());
    const out = runCombat(state, midRng());

    expect(out).not.toBe(state);
    // Input untouched (deepFreeze would already have thrown on mutation).
    expect(state.regions['pol-danzig'].controller).toBe('POL');
    expect(state.nations.POL.armies[0].strength).toBe(40);

    const effRatio = 6 / 3.364; // ≈ 1.7835909631
    const defLoss = 9 * effRatio + 8; // captured → +8 → ≈ 24.0523186683
    const atkLoss = 9 / effRatio; // = 9 × 3.364 / 6 = 5.046

    // Capture bookkeeping.
    expect(out.regions['pol-danzig'].controller).toBe('GER');
    expect(out.regions['pol-danzig'].entrenchment).toBe(0);
    expect(out.flags[lostFlag('POL')]).toBe(1);
    expect(out.flags[lostFlag('GER')]).toBeUndefined();

    // Defender: exact casualties, retreats to the only friendly neighbour.
    const p1 = out.nations.POL.armies[0];
    expect(p1.strength).toBeCloseTo(40 - defLoss, 8); // ≈ 15.9476813
    expect(p1.equipment).toBeCloseTo(50 - 0.6 * defLoss, 8); // ≈ 35.5686088
    expect(p1.experience).toBe(3);
    expect(p1.location).toBe('pol-warsaw');

    // Attacker: exact casualties, stays in place.
    const g1 = out.nations.GER.armies[0];
    expect(g1.strength).toBeCloseTo(80 - atkLoss, 8); // = 74.954
    expect(g1.equipment).toBeCloseTo(75 - 0.6 * atkLoss, 8); // = 71.9724
    expect(g1.experience).toBe(3);
    expect(g1.location).toBe('ger-berlin');

    // The player (POL) was involved → a front report is filed.
    const fronts = out.reports.filter((r) => r.kind === 'front');
    expect(fronts).toHaveLength(1);
    expect(fronts[0].title).toContain('Danzig');
    expect(fronts[0].turn).toBe(5);
  });

  it('mountain terrain holds against the same odds', () => {
    // Same armies, but the defender sits in cze-sudetenland (mountain, ×1.6).
    //   defense  = (2.4 + 0.5) × 1.6 × 1.16 = 5.3824
    //   effRatio = 6 / 5.3824 ≈ 1.11474 < 1.25 → held
    const state = deepFreeze(makeState(
      [
        { id: 'GER', capital: 'ger-berlin', faction: 'axis', armies: [army('g1', 80, 75, 'ger-saxony', 'offensive')] },
        { id: 'CZE', capital: 'cze-prague', faction: 'neutral', armies: [army('c1', 40, 50, 'cze-sudetenland', 'hold')] },
      ],
      [{ id: 'w-ger-cze', attackers: ['GER'], defenders: ['CZE'], startTurn: 5 }],
      (s) => {
        s.regions['cze-sudetenland'].entrenchment = 2;
      },
    ));
    const out = runCombat(state, midRng());

    const effRatio = 6 / 5.3824; // ≈ 1.1147444
    expect(out.regions['cze-sudetenland'].controller).toBe('CZE');
    expect(out.regions['cze-sudetenland'].entrenchment).toBe(2); // no reset on a failed assault
    expect(out.flags[lostFlag('CZE')]).toBeUndefined();

    const c1 = out.nations.CZE.armies[0];
    expect(c1.location).toBe('cze-sudetenland'); // no retreat
    expect(c1.strength).toBeCloseTo(40 - 9 * effRatio, 8); // ≈ 29.9673008
    const g1 = out.nations.GER.armies[0];
    expect(g1.strength).toBeCloseTo(80 - 9 / effRatio, 8); // = 80 − 8.0736 = 71.9264
  });

  it('the rng band scales effRatio: a top-of-band roll breaks the same mountain', () => {
    // fixedRng([1]) → roll = 0.8 + 1 × 0.4 = 1.2; effRatio = 1.11474 × 1.2 ≈ 1.3377 ≥ 1.25.
    const state = deepFreeze(makeState(
      [
        { id: 'GER', capital: 'ger-berlin', faction: 'axis', armies: [army('g1', 80, 75, 'ger-saxony', 'offensive')] },
        { id: 'CZE', capital: 'cze-prague', faction: 'neutral', armies: [army('c1', 40, 50, 'cze-sudetenland', 'hold')] },
      ],
      [{ id: 'w-ger-cze', attackers: ['GER'], defenders: ['CZE'], startTurn: 5 }],
      (s) => {
        s.regions['cze-sudetenland'].entrenchment = 2;
      },
    ));
    const out = runCombat(state, fixedRng([1]));
    expect(out.regions['cze-sudetenland'].controller).toBe('GER');
    // Survivors fall back to Prague, the only CZE-side neighbour.
    expect(out.nations.CZE.armies[0].location).toBe('cze-prague');
  });
});

// ---------------------------------------------------------------------------
// Retreat pathing
// ---------------------------------------------------------------------------

describe('runCombat — retreat path', () => {
  // A strong German army at ger-saxony takes pol-warsaw (urban) from a weak
  // elastic defender:
  //   attack   = (1.0 × 1.0 × 10) × 1.0 = 10
  //   defense  = (0.6 × 0.3 × 10 × 1.0 + 0.5) × 1.5 = 3.45
  //   effRatio = 10 / 3.45 ≈ 2.899 → captured; defLoss ≈ 26.087 + 8 = 34.087
  //   survivor: 60 − 34.087 ≈ 25.913 > 0 → retreats
  const warsawState = (mutate?: (s: GameState) => void) => makeState(
    [
      { id: 'GER', capital: 'ger-berlin', faction: 'axis', armies: [army('g1', 100, 100, 'ger-saxony', 'offensive')] },
      { id: 'POL', capital: 'pol-warsaw', faction: 'neutral', armies: [army('p1', 60, 30, 'pol-warsaw', 'elastic')] },
      { id: 'CZE', capital: 'cze-prague', faction: 'neutral' },
    ],
    [gerPolWar],
    mutate,
  );

  it('retreats to the friendly region with fewest adjacent enemies', () => {
    const out = runCombat(deepFreeze(warsawState()), midRng());
    expect(out.regions['pol-warsaw'].controller).toBe('GER');
    // Friendly candidates after the fall of Warsaw:
    //   pol-danzig → enemies ger-berlin, ger-prussia, pol-warsaw = 3
    //   pol-east   → enemies pol-warsaw = 1  ← fewest
    // (cze-prague is neutral, not on POL's side → not a candidate)
    expect(out.nations.POL.armies[0].location).toBe('pol-east');
  });

  it('breaks enemy-count ties deterministically by region id', () => {
    const out = runCombat(
      deepFreeze(warsawState((s) => {
        // Hand East Prussia to Poland: candidates and enemy counts become
        //   ger-prussia → enemies pol-warsaw = 1
        //   pol-danzig  → enemies ger-berlin, pol-warsaw = 2
        //   pol-east    → enemies pol-warsaw = 1
        // Tie at 1 → lowest region id wins: 'ger-prussia' < 'pol-east'.
        s.regions['ger-prussia'].controller = 'POL';
      })),
      midRng(),
    );
    expect(out.regions['pol-warsaw'].controller).toBe('GER');
    expect(out.nations.POL.armies[0].location).toBe('ger-prussia');
  });

  it('destroys the defender when no friendly region is adjacent', () => {
    const out = runCombat(
      deepFreeze(warsawState((s) => {
        s.regions['pol-danzig'].controller = 'GER';
        s.regions['pol-east'].controller = 'GER';
      })),
      midRng(),
    );
    expect(out.regions['pol-warsaw'].controller).toBe('GER');
    expect(out.nations.POL.armies).toHaveLength(0);
    expect(out.flags[lostFlag('POL')]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Supply
// ---------------------------------------------------------------------------

describe('runCombat — supply factor', () => {
  it('halves the attack of an army cut off from its capital', () => {
    // German army parked in neutral Lithuania (no friendly path to Berlin):
    //   attack   = 10 × 1.0 × 0.5 = 5
    //   defense  = (0.5 × 0.5 × 10 × 1.2 + 0.5) × 1.25 (forest) = 4.375
    //   effRatio = 5 / 4.375 = 8/7 ≈ 1.1429 < 1.25 → held
    // (supplied, it would be 10 / 4.375 ≈ 2.29 → an easy capture)
    const state = deepFreeze(makeState(
      [
        { id: 'GER', capital: 'ger-berlin', faction: 'axis', armies: [army('g1', 100, 100, 'lit-kaunas', 'offensive')] },
        { id: 'POL', capital: 'pol-warsaw', faction: 'neutral', armies: [army('p2', 50, 50, 'pol-east', 'hold')] },
      ],
      [gerPolWar],
    ));
    const out = runCombat(state, midRng());

    const effRatio = 5 / 4.375;
    expect(out.regions['pol-east'].controller).toBe('POL');
    expect(out.nations.GER.armies[0].strength).toBeCloseTo(100 - 9 / effRatio, 8); // = 92.125
    expect(out.nations.POL.armies[0].strength).toBeCloseTo(50 - 9 * effRatio, 8); // ≈ 39.7142857
  });
});

// ---------------------------------------------------------------------------
// Amphibious assaults
// ---------------------------------------------------------------------------

describe('runCombat — amphibious', () => {
  const sicilyState = (itaNavy: number) => makeState(
    [
      { id: 'ITA', capital: 'ita-rome', faction: 'axis', navy: itaNavy, armies: [army('i1', 90, 90, 'ita-sicily', 'offensive')] },
      { id: 'FRA', capital: 'fra-paris', faction: 'allies', navy: 300 },
    ],
    [{ id: 'w-ita-fra', attackers: ['ITA'], defenders: ['FRA'], startTurn: 5 }],
  );

  it('is blocked entirely without the required naval ratio', () => {
    // ITA 100 vs FRA 300 < 1.5× → the Sicily–Tunis crossing cannot happen.
    const out = runCombat(deepFreeze(sicilyState(100)), midRng());
    expect(out.regions['fra-algeria'].controller).toBe('FRA');
    const i1 = out.nations.ITA.armies[0];
    expect(i1.strength).toBe(90);
    expect(i1.equipment).toBe(90);
    expect(i1.experience).toBe(0);
    expect(out.flags[lostFlag('FRA')]).toBeUndefined();
    expect(out.reports).toHaveLength(0);
  });

  it('lands at ×0.6 attack with naval superiority', () => {
    // ITA 450 ≥ 1.5 × 300 → allowed.
    //   attack   = (0.9 × 0.9 × 10) × 1.0 × 1.0 × 0.6 = 4.86
    //   defense  = garrison only, controller unsupplied (no FRA path to Algeria):
    //              0.5 × 1.0 (desert) × 1.0 × 0.5 = 0.25
    //   effRatio = 4.86 / 0.25 = 19.44 → captured; atkLoss clamps at the floor (3).
    const out = runCombat(deepFreeze(sicilyState(450)), midRng());
    expect(out.regions['fra-algeria'].controller).toBe('ITA');
    expect(out.flags[lostFlag('FRA')]).toBe(1);
    const i1 = out.nations.ITA.armies[0];
    expect(i1.strength).toBeCloseTo(87, 8); // 90 − clamp(9/19.44, 3, 30) = 90 − 3
    expect(i1.equipment).toBeCloseTo(90 - 0.6 * 3, 8); // = 88.2
    expect(i1.experience).toBe(3);
    // 450 vs 300 is below the 2× blockade ratio → no blockade flags.
    expect(out.flags[blockadeFlag('FRA')]).toBeUndefined();
    expect(out.flags[blockadeFlag('ITA')]).toBeUndefined();
    // Player (POL) uninvolved → no front report.
    expect(out.reports).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Blockade
// ---------------------------------------------------------------------------

describe('runCombat — blockade', () => {
  it('flags every member of the weaker side at ratio ≥ 2', () => {
    // UK 900 vs GER 200 + ITA 100 = 300 → 3× ≥ 2× → both Axis members flagged.
    const state = deepFreeze(makeState(
      [
        { id: 'GER', capital: 'ger-berlin', faction: 'axis', navy: 200 },
        { id: 'ITA', capital: 'ita-rome', faction: 'axis', navy: 100 },
        { id: 'UK', capital: 'uk-london', faction: 'allies', navy: 900 },
      ],
      [{ id: 'w-axis-uk', attackers: ['GER', 'ITA'], defenders: ['UK'], startTurn: 5 }],
    ));
    const out = runCombat(state, midRng());
    expect(out.flags[blockadeFlag('GER')]).toBe(true);
    expect(out.flags[blockadeFlag('ITA')]).toBe(true);
    expect(out.flags[blockadeFlag('UK')]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Modifiers
// ---------------------------------------------------------------------------

describe('runCombat — modifiers', () => {
  it('the no-oil flag degrades attacker equipment and can turn capture into repulse', () => {
    // With _nooil_GER: effective equipment 75 × 0.6 = 45.
    //   attack   = 0.8 × 0.45 × 10 = 3.6
    //   effRatio = 3.6 / 3.364 ≈ 1.0702 < 1.25 → held
    const state = deepFreeze(danzigState((s) => {
      s.flags[noOilFlag('GER')] = true;
    }));
    const out = runCombat(state, midRng());

    const effRatio = 3.6 / 3.364;
    expect(out.regions['pol-danzig'].controller).toBe('POL');
    expect(out.nations.POL.armies[0].strength).toBeCloseTo(40 - 9 * effRatio, 8); // ≈ 30.3686088
    expect(out.nations.GER.armies[0].strength).toBeCloseTo(80 - 9 / effRatio, 8); // = 80 − 8.41 = 71.59
    expect(out.flags[noOilFlag('GER')]).toBe(true); // combat leaves the transient flag for turn.ts
  });

  it('allout raises attack ×1.3 and doubles attacker casualties after the clamp', () => {
    //   attack   = 6 × 1.3 = 7.8;  effRatio = 7.8 / 3.364 ≈ 2.31867 → captured
    //   atkLoss  = clamp(9/effRatio) × 2 = (9 × 3.364 / 7.8) × 2 ≈ 7.7630769
    const state = deepFreeze(danzigState((s) => {
      s.nations.GER.armies[0].posture = 'allout';
    }));
    const out = runCombat(state, midRng());

    const effRatio = 7.8 / 3.364;
    expect(out.regions['pol-danzig'].controller).toBe('GER');
    const g1 = out.nations.GER.armies[0];
    expect(g1.strength).toBeCloseTo(80 - (9 / effRatio) * 2, 8); // ≈ 72.2369231
    expect(g1.equipment).toBeCloseTo(75 - 0.6 * (9 / effRatio) * 2, 8); // ≈ 70.3421538
    // Defender losses are unaffected by the attacker's allout posture.
    expect(out.nations.POL.armies[0].strength).toBeCloseTo(40 - (9 * effRatio + 8), 8); // ≈ 11.1319857
  });

  it('air superiority ≥ 1.5× swings ±0.15 on both sides', () => {
    //   GER air 400 vs POL air 100 → attacker ×1.15, defender ×0.85
    //   attack   = 6 × 1.15 = 6.9; defense = 3.364 × 0.85 = 2.8594
    //   effRatio = 6.9 / 2.8594 ≈ 2.41309 → captured
    const state = deepFreeze(danzigState((s) => {
      s.nations.GER.air = 400;
      s.nations.POL.air = 100;
    }));
    const out = runCombat(state, midRng());

    const effRatio = 6.9 / 2.8594;
    expect(out.regions['pol-danzig'].controller).toBe('GER');
    expect(out.nations.POL.armies[0].strength).toBeCloseTo(40 - (9 * effRatio + 8), 8); // ≈ 10.2821576
    expect(out.nations.GER.armies[0].strength).toBeCloseTo(80 - 9 / effRatio, 8); // ≈ 76.2703478
  });
});

describe('runCombat — iconic battle intensity', () => {
  it('boosts only the attacker, suppresses the front report, and exposes casualties via flags', () => {
    //   Same danzigState battle, but with an iconic-battle intensity of 1.5
    //   flagged on pol-danzig. Only attack is scaled (defense unchanged):
    //   attack = 6 × 1.5 = 9; defense = 3.364 (unchanged)
    //   effRatio = 9 / 3.364 ≈ 2.6753863 → captured
    const state = deepFreeze(danzigState((s) => {
      s.flags[iconicBattleFlag('pol-danzig')] = 1.5;
    }));
    const out = runCombat(state, midRng());

    const effRatio = 9 / 3.364;
    const defLoss = 9 * effRatio + 8;
    const atkLoss = 9 / effRatio;

    expect(out.regions['pol-danzig'].controller).toBe('GER');
    expect(out.nations.POL.armies[0].strength).toBeCloseTo(40 - defLoss, 8);
    expect(out.nations.GER.armies[0].strength).toBeCloseTo(80 - atkLoss, 8);

    // No ordinary front report, even though the player (POL) is involved —
    // the spotlight owns this region's narration instead.
    expect(out.reports.filter((r) => r.kind === 'front')).toHaveLength(0);

    // Casualties exposed for iconicBattles.ts to narrate.
    expect(out.flags[iconicDamageFlag('pol-danzig', 'atk')]).toBeCloseTo(atkLoss, 8);
    expect(out.flags[iconicDamageFlag('pol-danzig', 'def')]).toBeCloseTo(defLoss, 8);
  });

  it('without the flag, behaves exactly as the unboosted battle (regression guard)', () => {
    const state = deepFreeze(danzigState());
    const out = runCombat(state, midRng());
    expect(out.flags[iconicDamageFlag('pol-danzig', 'atk')]).toBeUndefined();
    expect(out.reports.filter((r) => r.kind === 'front')).toHaveLength(1);
  });
});
