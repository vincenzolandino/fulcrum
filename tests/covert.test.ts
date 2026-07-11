// Covert operations and succession (src/engine/covert.ts).
//
// Uses the shared GER/POL/FRA fixture: playerNation POL, GER holds a 40-point
// network in POL, relations GER–POL −20, tension 20, GER leader 'hitler'.
// Assassination tests run against the REAL succession tables in
// src/data/leaders.ts (GER: goering 40 / himmler 25 / beck-junta 35).
//
// Rng draw order (documented in covert.ts): op = chance(odds) first, then one
// next() draw for the weighted succession pick on coup/assassinate success.

import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/engine/types';
import {
  blowbackFlag,
  runCovert,
  sabotageFlag,
  startMission,
  succession,
} from '../src/engine/covert';
import {
  COUP_STABILITY,
  NETWORK_BUILD_GAIN,
  NETWORK_BUILD_TURNS,
  OP_FAILURE_NETWORK_LOSS,
  OP_FAILURE_TENSION,
  SABOTAGE_DURATION,
  SABOTAGE_IC_FACTOR,
} from '../src/engine/balance';
import { deepFreeze, fixedRng, frozenTestState } from './fixtures';

describe('startMission', () => {
  it('allows buildNetwork with zero network and sets turnsLeft from balance', () => {
    const s = frozenTestState(); // POL has no network anywhere
    const out = startMission(s, 'POL', 'GER', 'buildNetwork');
    expect(out).not.toBe(s);
    expect(s.missions).toHaveLength(0); // input untouched
    expect(out.missions).toHaveLength(1);
    expect(out.missions[0]).toMatchObject({
      owner: 'POL',
      target: 'GER',
      type: 'buildNetwork',
      turnsLeft: NETWORK_BUILD_TURNS,
    });
  });

  it('rejects operations below the network threshold', () => {
    const s = frozenTestState(); // GER network in POL = 40
    expect(startMission(s, 'GER', 'POL', 'coup')).toBe(s); // needs 60
    expect(startMission(s, 'GER', 'POL', 'assassinate')).toBe(s); // needs 70
  });

  it('allows operations at or above the threshold, with turnsLeft 1', () => {
    const s = frozenTestState();
    const intel = startMission(s, 'GER', 'POL', 'stealIntel'); // needs 30
    expect(intel.missions[0]).toMatchObject({ type: 'stealIntel', turnsLeft: 1 });
    const sab = startMission(s, 'GER', 'POL', 'sabotage'); // needs exactly 40
    expect(sab.missions[0]).toMatchObject({ type: 'sabotage', turnsLeft: 1 });
  });

  it('allows only one concurrent mission per owner-target pair', () => {
    const s = frozenTestState();
    const first = deepFreeze(startMission(s, 'GER', 'POL', 'stealIntel'));
    expect(startMission(first, 'GER', 'POL', 'buildNetwork')).toBe(first);
    // A different target is a different pair.
    const second = startMission(first, 'GER', 'FRA', 'buildNetwork');
    expect(second.missions).toHaveLength(2);
  });

  it('rejects self-target and unknown nations', () => {
    const s = frozenTestState();
    expect(startMission(s, 'GER', 'GER', 'buildNetwork')).toBe(s);
    expect(startMission(s, 'GER', 'NOPE', 'buildNetwork')).toBe(s);
    expect(startMission(s, 'NOPE', 'GER', 'buildNetwork')).toBe(s);
  });
});

describe('runCovert — mission lifecycle', () => {
  it('buildNetwork ticks for NETWORK_BUILD_TURNS turns, then applies the gain', () => {
    const rng = fixedRng([0.9]); // ≥ 0.15 → no detection on resolution
    let s = deepFreeze(startMission(frozenTestState(), 'POL', 'GER', 'buildNetwork'));

    s = deepFreeze(runCovert(s, rng)); // tick 1
    expect(s.missions).toHaveLength(1);
    expect(s.missions[0].turnsLeft).toBe(NETWORK_BUILD_TURNS - 1);
    expect(s.nations.POL.spyNetworks.GER ?? 0).toBe(0);

    s = deepFreeze(runCovert(s, rng)); // tick 2
    expect(s.missions[0].turnsLeft).toBe(NETWORK_BUILD_TURNS - 2);

    s = deepFreeze(runCovert(s, rng)); // tick 3 → resolves
    expect(s.missions).toHaveLength(0);
    expect(s.nations.POL.spyNetworks.GER).toBe(NETWORK_BUILD_GAIN);
    expect(s.nations.POL.relations.GER).toBe(-20); // undetected → no penalty
  });

  it('buildNetwork detection claws back network and sours relations', () => {
    const rng = fixedRng([0.1]); // < 0.15 → detected
    let s = deepFreeze(startMission(frozenTestState(), 'POL', 'GER', 'buildNetwork'));
    s = deepFreeze(runCovert(s, rng));
    s = deepFreeze(runCovert(s, rng));
    s = runCovert(s, rng); // resolves: +15 then −25, clamped at 0
    expect(s.nations.POL.spyNetworks.GER).toBe(0);
    expect(s.nations.POL.relations.GER).toBe(-30); // −20 −10, mirrored
    expect(s.nations.GER.relations.POL).toBe(-30);
    // Owner POL is the player → the compromise report lands; GER's copy is dropped.
    expect(s.reports).toHaveLength(1);
    expect(s.reports[0].kind).toBe('covert');
  });

  it('operations resolve on the same turn they are launched', () => {
    const s = deepFreeze(startMission(frozenTestState(), 'GER', 'POL', 'stealIntel'));
    const out = runCovert(s, fixedRng([0.1]));
    expect(out.missions).toHaveLength(0);
  });

  it('returns the state unchanged when no missions exist', () => {
    const s = frozenTestState();
    expect(runCovert(s, fixedRng([0.5]))).toBe(s);
  });
});

describe('operation odds respect the network bonus', () => {
  // GER network in POL = 40 → stealIntel odds 0.8 + 40/400 = 0.9.
  it('succeeds on a roll that base odds alone would lose', () => {
    const s = deepFreeze(startMission(frozenTestState(), 'GER', 'POL', 'stealIntel'));
    const out = runCovert(s, fixedRng([0.85])); // 0.85 < 0.9, but ≥ 0.8 base
    expect(out.flags[blowbackFlag('GER', 'POL')]).toBeUndefined();
    expect(out.nations.GER.spyNetworks.POL).toBe(40); // no failure loss
  });

  it('fails above the boosted odds', () => {
    const s = deepFreeze(startMission(frozenTestState(), 'GER', 'POL', 'stealIntel'));
    const out = runCovert(s, fixedRng([0.95])); // ≥ 0.9
    expect(out.flags[blowbackFlag('GER', 'POL')]).toBe(true);
  });
});

describe('stealIntel', () => {
  it('delivers a covert dossier to a player owner', () => {
    const s = frozenTestState((st) => {
      st.nations.POL.spyNetworks = { GER: 30 };
    });
    const withMission = deepFreeze(startMission(s, 'POL', 'GER', 'stealIntel'));
    const out = runCovert(withMission, fixedRng([0.5])); // odds 0.875
    expect(out.reports).toHaveLength(1);
    expect(out.reports[0].kind).toBe('covert');
    expect(out.reports[0].title).toContain('Germany');
    expect(out.reports[0].body).toContain('2 armies (avg strength 80, equipment 75)');
    expect(out.reports[0].body).toContain('Stability 70, war support 50');
    expect(out.reports[0].body).toContain('armor 2');
  });

  it('drops the report for an AI owner', () => {
    const s = deepFreeze(startMission(frozenTestState(), 'GER', 'POL', 'stealIntel'));
    const out = runCovert(s, fixedRng([0.1])); // success
    expect(out.reports).toHaveLength(0);
  });
});

describe('sabotage', () => {
  it('sets the countdown flag and applies this turn\'s ic hit', () => {
    const s = deepFreeze(startMission(frozenTestState(), 'GER', 'POL', 'sabotage'));
    const out = runCovert(s, fixedRng([0.1])); // odds 0.6 + 0.1 = 0.7 → success
    expect(out.flags[sabotageFlag('POL')]).toBe(SABOTAGE_DURATION);
    expect(out.nations.POL.ic).toBeCloseTo(20 * SABOTAGE_IC_FACTOR, 10); // 18
  });
});

describe('coup', () => {
  const coupState = (): GameState =>
    frozenTestState((st) => {
      st.nations.GER.spyNetworks = { POL: 60 };
      st.nations.POL.faction = 'allies'; // so the flip to neutral is observable
    });
  // odds = 0.35 + 60/400 − 0.5 zeal × 0.2 = 0.40

  it('flips government to the instigator\'s, cuts faction to neutral, resets stability, installs a successor', () => {
    const s = deepFreeze(startMission(coupState(), 'GER', 'POL', 'coup'));
    const out = runCovert(s, fixedRng([0.05, 0.0])); // success; pick → sikorski (weight 60 first)
    const pol = out.nations.POL;
    expect(pol.government).toBe('fascist'); // GER's government
    expect(pol.faction).toBe('neutral');
    expect(pol.stability).toBe(COUP_STABILITY);
    expect(pol.leader).toBe('sikorski');
    expect(pol.ai.focus).toBe('defense'); // sikorski's aiPatch
    expect(out.queuedEvents).toContainEqual({ id: 'pol-succession-sikorski', fireTurn: 0 });
    // Deposed, not dead: no death flags.
    expect(out.flags.LEADER_DEAD_POL).toBeUndefined();
    expect(out.chronicle.some((c) => c.divergence && c.text.includes('coup'))).toBe(true);
  });

  it('is harder against ideologically zealous regimes', () => {
    // Same 0.45 roll: fails at zeal 0.5 (odds 0.40), succeeds at zeal 0 (odds 0.50).
    const zealous = deepFreeze(startMission(coupState(), 'GER', 'POL', 'coup'));
    const failed = runCovert(zealous, fixedRng([0.45]));
    expect(failed.flags[blowbackFlag('GER', 'POL')]).toBe(true);

    const lax = frozenTestState((st) => {
      st.nations.GER.spyNetworks = { POL: 60 };
      st.nations.POL.ai.ideologyZeal = 0;
    });
    const s2 = deepFreeze(startMission(lax, 'GER', 'POL', 'coup'));
    const succeeded = runCovert(s2, fixedRng([0.45, 0.0]));
    expect(succeeded.flags[blowbackFlag('GER', 'POL')]).toBeUndefined();
    expect(succeeded.nations.POL.stability).toBe(COUP_STABILITY);
  });
});

describe('assassination and succession (real GER data)', () => {
  const assassinState = (): GameState =>
    frozenTestState((st) => {
      st.nations.POL.spyNetworks = { GER: 80 };
    });
  // odds = 0.25 + 80/400 = 0.45

  it('success runs GER succession: goering on a low pick roll', () => {
    const s = deepFreeze(startMission(assassinState(), 'POL', 'GER', 'assassinate'));
    const out = runCovert(s, fixedRng([0.1, 0.0])); // success; pick r=0 → goering (first, weight 40)
    const ger = out.nations.GER;
    expect(ger.leader).toBe('goering');
    expect(ger.ai.aggression).toBe(0.7); // aiPatch applied
    expect(ger.ai.ideologyZeal).toBe(0.7);
    expect(ger.ai.riskTolerance).toBe(0.5); // untouched fields preserved
    expect(out.flags.HITLER_DEAD).toBe(true);
    expect(out.flags.LEADER_DEAD_GER).toBe(true);
    expect(out.queuedEvents).toContainEqual({ id: 'ger-succession-goering', fireTurn: 0 });
    expect(out.chronicle.some((c) => c.divergence && c.text.includes('Adolf Hitler'))).toBe(true);
    expect(out.missions).toHaveLength(0);
    expect(out.reports).toHaveLength(1); // POL is the player → covert report lands
  });

  it('weighted pick walks cumulative weights: high roll → beck-junta', () => {
    const s = deepFreeze(startMission(assassinState(), 'POL', 'GER', 'assassinate'));
    const out = runCovert(s, fixedRng([0.1, 0.99])); // r = 99 → past goering 40, himmler 65
    expect(out.nations.GER.leader).toBe('beck-junta');
    expect(out.nations.GER.ai.focus).toBe('defense');
    expect(out.nations.GER.ai.aggression).toBe(0.3);
    expect(out.queuedEvents).toContainEqual({ id: 'ger-succession-beck-junta', fireTurn: 0 });
  });

  it('failure sets blowback, burns network, sours relations, raises tension', () => {
    const s = deepFreeze(startMission(assassinState(), 'POL', 'GER', 'assassinate'));
    const out = runCovert(s, fixedRng([0.9])); // 0.9 ≥ 0.45 → fail
    expect(out.flags[blowbackFlag('POL', 'GER')]).toBe(true);
    expect(out.nations.POL.spyNetworks.GER).toBe(80 - OP_FAILURE_NETWORK_LOSS);
    expect(out.nations.POL.relations.GER).toBe(-40); // −20 −20, mirrored
    expect(out.nations.GER.relations.POL).toBe(-40);
    expect(out.tension).toBe(20 + OP_FAILURE_TENSION);
    expect(out.nations.GER.leader).toBe('hitler'); // he lives
    expect(out.flags.HITLER_DEAD).toBeUndefined();
  });

  it('succession falls back gracefully for a nation without a table', () => {
    const s = frozenTestState((st) => {
      st.nations.XYZ = {
        ...st.nations.POL,
        id: 'XYZ',
        name: 'Xylia',
        leader: 'ruler-x',
        relations: {},
        spyNetworks: {},
      };
    });
    const out = succession(s, 'XYZ', fixedRng([0.5]));
    expect(out.nations.XYZ.leader).toBe('xyz-successor');
    expect(out.flags.LEADER_DEAD_XYZ).toBe(true);
    expect(out.flags['RULER-X_DEAD']).toBe(true);
    expect(out.chronicle.some((c) => c.divergence && c.text.includes('ruler-x'))).toBe(true);
  });

  it('succession is a no-op for dead or missing nations', () => {
    const dead = frozenTestState((st) => {
      st.nations.POL.alive = false;
    });
    expect(succession(dead, 'POL', fixedRng([0.5]))).toBe(dead);
    expect(succession(dead, 'NOPE', fixedRng([0.5]))).toBe(dead);
  });
});
