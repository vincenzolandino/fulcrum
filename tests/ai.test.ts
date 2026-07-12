// Tests for src/engine/ai.ts — the 7-step per-nation AI loop.
//
// Adjacency comes from the real map (src/data/regions.ts); these tests use
// real region ids whose edges are stable data facts:
//   ger-berlin <-> pol-danzig, ger-ruhr <-> ger-berlin,
//   pol-danzig <-> pol-warsaw, fra-paris <-> fra-north.
// The shared fixture (tests/fixtures.ts) uses the same ids, so it composes.

import { describe, expect, it } from 'vitest';
import type {
  AIPersonality,
  Army,
  GameState,
  Nation,
  NationId,
  RegionId,
  TechTrack,
} from '../src/engine/types';
import { runAI } from '../src/engine/ai';
import { AI_ALLOCATION, NETWORK_BUILD_TURNS } from '../src/engine/balance';
import { deepFreeze, fixedRng, frozenTestState, makeTestState } from './fixtures';

const rng = () => fixedRng([0.5]);

// ---------------------------------------------------------------------------
// Minimal custom-world builders (real map ids, tiny nation set).

const zeroTech = (): Record<TechTrack, number> => ({
  armor: 0, air: 0, naval: 0, industry: 0, doctrine: 0, secret: 0,
});

const mkArmy = (id: string, strength: number, equipment: number, location: RegionId): Army => ({
  id, name: id, strength, equipment, experience: 0, location, posture: 'hold', moveTarget: null,
});

const mkAi = (aggression: number): AIPersonality => ({
  aggression, riskTolerance: 0.5, ideologyZeal: 0.5, opportunism: 0.5, focus: 'expansion',
});

function mkNation(partial: Partial<Nation> & { id: NationId; capital: RegionId }): Nation {
  return {
    name: partial.id, adjective: partial.id, color: '#000000',
    government: 'authoritarian', faction: 'neutral',
    alive: true, puppetOf: null,
    ic: 50, stockpile: { oil: 50, steel: 50, food: 50 },
    icAllocation: { army: 0.4, air: 0.2, navy: 0.1, civilian: 0.3 },
    armies: [], navy: 0, air: 0, manpower: 500,
    stability: 60, warSupport: 50,
    relations: {}, guarantees: [], pacts: [], claims: [],
    spyNetworks: {}, tech: zeroTech(),
    research: { track: null, progress: 0 },
    leader: 'nobody', ai: mkAi(0.5),
    ...partial,
  };
}

/**
 * GER (ger-berlin) at war with POL (pol-danzig); the two regions are adjacent
 * on the real map. POL is the player and includePlayer=false, so only GER
 * acts. Extra regions/armies bolt on via the mutate callback.
 */
function duelState(
  gerArmies: Army[],
  gerAggression: number,
  mutate?: (s: GameState) => void,
): GameState {
  const s: GameState = {
    seed: 1, turn: 0, playerNation: 'POL',
    nations: {
      GER: mkNation({
        id: 'GER', capital: 'ger-berlin', government: 'fascist', faction: 'axis',
        armies: gerArmies, ai: mkAi(gerAggression), relations: { POL: -100 },
      }),
      POL: mkNation({
        id: 'POL', capital: 'pol-danzig',
        armies: [mkArmy('pol-1', 50, 50, 'pol-danzig')], // power 2.5 exactly
        relations: { GER: -100 },
      }),
    },
    regions: {
      'ger-berlin': { owner: 'GER', controller: 'GER', entrenchment: 0 },
      'pol-danzig': { owner: 'POL', controller: 'POL', entrenchment: 0 },
    },
    wars: [{ id: 'w1', attackers: ['GER'], defenders: ['POL'], startTurn: 0 }],
    tension: 20, flags: {}, firedEvents: [], queuedEvents: [], pendingChoices: [],
    missions: [], chronicle: [], reports: [], gameOver: null,
  };
  if (mutate) mutate(s);
  return deepFreeze(s);
}

const gerArmy = (s: GameState, id: string): Army => {
  const a = s.nations['GER'].armies.find((x) => x.id === id);
  if (!a) throw new Error(`missing army ${id}`);
  return a;
};

// ---------------------------------------------------------------------------

describe('step 1: posture per front at exact ratio boundaries', () => {
  // POL defender power is exactly 2.5 (50 str × 50 eq, tech 0).
  it('ratio exactly 1.3 → offensive', () => {
    // 65 × 50 → power 3.25; 3.25 / 2.5 = 1.3 exactly.
    const s = duelState([mkArmy('g1', 65, 50, 'ger-berlin')], 0.9);
    const out = runAI(s, rng(), { includePlayer: false });
    expect(gerArmy(out, 'g1').posture).toBe('offensive');
  });

  it('just below 1.3 → hold', () => {
    // 64 × 50 → power 3.2; ratio 1.28.
    const s = duelState([mkArmy('g1', 64, 50, 'ger-berlin')], 0.9);
    const out = runAI(s, rng(), { includePlayer: false });
    expect(gerArmy(out, 'g1').posture).toBe('hold');
  });

  it('ratio exactly 2.0 with aggression > 0.6 → allout', () => {
    // 100 × 50 → power 5.0; ratio 2.0.
    const s = duelState([mkArmy('g1', 100, 50, 'ger-berlin')], 0.9);
    const out = runAI(s, rng(), { includePlayer: false });
    expect(gerArmy(out, 'g1').posture).toBe('allout');
  });

  it('ratio 2.0 with aggression not above 0.6 → offensive', () => {
    const s = duelState([mkArmy('g1', 100, 50, 'ger-berlin')], 0.6);
    const out = runAI(s, rng(), { includePlayer: false });
    expect(gerArmy(out, 'g1').posture).toBe('offensive');
  });

  it('just below 2.0 with high aggression → offensive, not allout', () => {
    // 99 × 50 → power 4.95; ratio 1.98.
    const s = duelState([mkArmy('g1', 99, 50, 'ger-berlin')], 0.9);
    const out = runAI(s, rng(), { includePlayer: false });
    expect(gerArmy(out, 'g1').posture).toBe('offensive');
  });

  it('ratio exactly 0.7 → elastic; just above → hold', () => {
    // 70 × 25 → power 1.75; ratio 0.7 exactly.
    const low = duelState([mkArmy('g1', 70, 25, 'ger-berlin')], 0.9);
    expect(gerArmy(runAI(low, rng(), { includePlayer: false }), 'g1').posture).toBe('elastic');
    // 75 × 25 → power 1.875; ratio 0.75.
    const mid = duelState([mkArmy('g1', 75, 25, 'ger-berlin')], 0.9);
    expect(gerArmy(runAI(mid, rng(), { includePlayer: false }), 'g1').posture).toBe('hold');
  });

  it('adjacent own armies count toward the local ratio', () => {
    // Berlin army alone is 2.5 (ratio 1.0 → hold), but a second army in the
    // adjacent Ruhr adds 2.5 more → ratio 2.0 → allout at aggression 0.9.
    const s = duelState(
      [mkArmy('g1', 50, 50, 'ger-berlin'), mkArmy('g2', 50, 50, 'ger-ruhr')],
      0.9,
      (st) => {
        st.regions['ger-ruhr'] = { owner: 'GER', controller: 'GER', entrenchment: 0 };
      },
    );
    const out = runAI(s, rng(), { includePlayer: false });
    expect(gerArmy(out, 'g1').posture).toBe('allout');
  });

  it('does not touch the player nation when includePlayer is false', () => {
    const s = duelState([mkArmy('g1', 65, 50, 'ger-berlin')], 0.9);
    const out = runAI(s, rng(), { includePlayer: false });
    expect(out.nations['POL'].armies[0].posture).toBe('hold');
    expect(out.nations['POL'].icAllocation).toEqual(s.nations['POL'].icAllocation);
  });
});

describe('step 2: redeploy and capital garrison', () => {
  it('moves an idle rear army one BFS step toward the nearest front', () => {
    const s = duelState(
      [mkArmy('g-front', 80, 75, 'ger-berlin'), mkArmy('g-rear', 80, 75, 'ger-ruhr')],
      0.9,
      (st) => {
        st.regions['ger-ruhr'] = { owner: 'GER', controller: 'GER', entrenchment: 0 };
      },
    );
    const out = runAI(s, rng(), { includePlayer: false });
    expect(gerArmy(out, 'g-rear').moveTarget).toBe('ger-berlin');
    expect(gerArmy(out, 'g-front').moveTarget).toBeNull(); // front army stands
  });

  it('never marches the last army out of the capital', () => {
    // Capital moved to the rear Ruhr; its sole army must stay put.
    const s = duelState([mkArmy('g-only', 80, 75, 'ger-ruhr')], 0.9, (st) => {
      st.regions['ger-ruhr'] = { owner: 'GER', controller: 'GER', entrenchment: 0 };
      st.nations['GER'] = { ...st.nations['GER'], capital: 'ger-ruhr' };
    });
    const out = runAI(s, rng(), { includePlayer: false });
    expect(gerArmy(out, 'g-only').moveTarget).toBeNull();
  });

  it('with two armies in the capital, exactly one redeploys', () => {
    const s = duelState(
      [mkArmy('g-a', 80, 75, 'ger-ruhr'), mkArmy('g-b', 80, 75, 'ger-ruhr')],
      0.9,
      (st) => {
        st.regions['ger-ruhr'] = { owner: 'GER', controller: 'GER', entrenchment: 0 };
        st.nations['GER'] = { ...st.nations['GER'], capital: 'ger-ruhr' };
      },
    );
    const out = runAI(s, rng(), { includePlayer: false });
    const targets = [gerArmy(out, 'g-a').moveTarget, gerArmy(out, 'g-b').moveTarget];
    expect(targets.filter((t) => t === 'ger-berlin')).toHaveLength(1);
    expect(targets.filter((t) => t === null)).toHaveLength(1);
  });
});

describe('step 3: ambition-driven declarations of war', () => {
  // Fixture powers: GER 22.8, POL 4.0, FRA 14.75; FRA guarantees POL.
  // GER threshold = max(1.1, 2.2 − 0.9 − 0.4×0.5) = 1.1.
  // GER vs POL+FRA: 22.8 / 18.75 ≈ 1.216 ≥ 1.1 → war.
  // Tension 40 clears GER's DoW tension gate (58 − 0.9×34 = 27.4); the claim is
  // pol-warsaw, an unscripted region the generic AI may pursue directly.
  it('GER declares on its claim, and the guarantor joins the defenders', () => {
    const s = frozenTestState((st) => {
      st.tension = 40;
      st.nations['GER'] = { ...st.nations['GER'], claims: ['pol-warsaw'] };
    });
    const out = runAI(s, rng(), { includePlayer: false });
    expect(out.wars).toHaveLength(1);
    expect(out.wars[0].attackers).toContain('GER');
    expect(out.wars[0].defenders).toContain('POL');
    expect(out.wars[0].defenders).toContain('FRA'); // guarantee honored via applyEffects
    expect(out.nations['GER'].relations['POL']).toBe(-100);
  });

  it('POL never initiates: same favorable ratio, cautious personality', () => {
    // POL boosted to power ~30.5 vs GER 22.8 → ratio ≈ 1.34, which clears the
    // aggressive threshold (1.1) but not POL's own (2.2 − 0.2 − 0.2 = 1.8).
    // Tension 55 clears the DoW tension gate for both personalities (cautious
    // gate 58 − 0.2×34 = 51.2, aggressive 27.4), so only the power threshold
    // separates them — the point of the test.
    const boost = (st: GameState) => {
      st.tension = 55;
      st.nations['POL'] = {
        ...st.nations['POL'],
        claims: ['ger-berlin'],
        armies: [
          mkArmy('p1', 100, 100, 'pol-warsaw'),
          mkArmy('p2', 100, 100, 'pol-warsaw'),
          mkArmy('p3', 100, 100, 'pol-warsaw'),
        ],
      };
    };
    const cautious = frozenTestState(boost);
    expect(runAI(cautious, rng(), { includePlayer: true }).wars).toHaveLength(0);

    // Identical world, aggressive personality → the same ratio now suffices.
    const aggressive = frozenTestState((st) => {
      boost(st);
      st.nations['POL'] = {
        ...st.nations['POL'],
        ai: { ...st.nations['POL'].ai, aggression: 0.9, opportunism: 0.5 },
      };
    });
    expect(runAI(aggressive, rng(), { includePlayer: true }).wars).toHaveLength(1);
  });

  it('democracies do not start offensive wars below the tension gate', () => {
    const asDemocracy = (tension: number) =>
      frozenTestState((st) => {
        st.tension = tension;
        st.nations['GER'] = {
          ...st.nations['GER'],
          government: 'democracy',
          claims: ['pol-warsaw'],
        };
      });
    expect(runAI(asDemocracy(49), rng(), { includePlayer: false }).wars).toHaveLength(0);
    expect(runAI(asDemocracy(60), rng(), { includePlayer: false }).wars).toHaveLength(1);
  });
});

describe('step 4: democracy guarantees and faction gravity', () => {
  const withUK = (tension: number, gerClaims: RegionId[]) => (st: GameState) => {
    st.tension = tension;
    // Aggression 0 keeps GER below its DoW threshold so only diplomacy moves.
    st.nations['GER'] = {
      ...st.nations['GER'],
      claims: gerClaims,
      ai: { ...st.nations['GER'].ai, aggression: 0 },
    };
    st.nations['UK'] = mkNation({
      id: 'UK', capital: 'uk-london', government: 'democracy', faction: 'allies',
    });
  };

  it('UK guarantees POL when tension ≥ 40 and GER holds a claim on it', () => {
    const s = frozenTestState(withUK(45, ['pol-danzig']));
    const out = runAI(s, rng(), { includePlayer: false });
    expect(out.nations['UK'].guarantees).toContain('POL');
  });

  it('no guarantee below the tension gate or without a claim', () => {
    const calm = frozenTestState(withUK(35, ['pol-danzig']));
    expect(runAI(calm, rng(), { includePlayer: false }).nations['UK'].guarantees).toEqual([]);
    const unclaimed = frozenTestState(withUK(45, []));
    expect(runAI(unclaimed, rng(), { includePlayer: false }).nations['UK'].guarantees).toEqual([]);
  });

  it('fascist neutrals gravitate to the axis at high tension and relations', () => {
    const s = frozenTestState((st) => {
      st.tension = 65;
      st.nations['POL'] = {
        ...st.nations['POL'],
        government: 'fascist',
        relations: { ...st.nations['POL'].relations, GER: 70 },
      };
      st.nations['GER'] = {
        ...st.nations['GER'],
        relations: { ...st.nations['GER'].relations, POL: 70 },
      };
    });
    const out = runAI(s, rng(), { includePlayer: true });
    expect(out.nations['POL'].faction).toBe('axis');
  });
});

describe('step 5: allocation and research by focus', () => {
  it('allocation matches the focus table', () => {
    const s = frozenTestState();
    const out = runAI(s, rng(), { includePlayer: false });
    expect(out.nations['GER'].icAllocation).toEqual(AI_ALLOCATION['expansion']);
    expect(out.nations['FRA'].icAllocation).toEqual(AI_ALLOCATION['defense']);
    // Player untouched with includePlayer=false…
    expect(out.nations['POL'].icAllocation).toEqual({ army: 0.4, air: 0.2, navy: 0.1, civilian: 0.3 });
    // …but steered when the sim drives the player too (POL focus: defense).
    const auto = runAI(s, rng(), { includePlayer: true });
    expect(auto.nations['POL'].icAllocation).toEqual(AI_ALLOCATION['defense']);
  });

  it('picks research by focus priority; the secret club switches at high tension', () => {
    const s = frozenTestState((st) => {
      st.tension = 75;
      st.nations['GER'] = {
        ...st.nations['GER'],
        tech: { ...st.nations['GER'].tech, industry: 2 },
      };
    });
    const out = runAI(s, rng(), { includePlayer: false });
    expect(out.nations['GER'].research.track).toBe('secret'); // club + tension ≥ 70 + industry ≥ 2
    expect(out.nations['FRA'].research.track).toBe('industry'); // defense focus priority

    // Below the industry gate the club nation follows its normal priority.
    const early = frozenTestState((st) => {
      st.tension = 75; // industry stays 1 in the fixture
    });
    const out2 = runAI(early, rng(), { includePlayer: false });
    expect(out2.nations['GER'].research.track).toBe('armor'); // expansion priority head
  });
});

describe('step 6: covert missions for opportunist majors', () => {
  it('builds a network in the coldest rival', () => {
    const s = frozenTestState((st) => {
      st.nations['GER'] = {
        ...st.nations['GER'],
        ai: { ...st.nations['GER'].ai, opportunism: 0.9 },
      };
    });
    const out = runAI(s, rng(), { includePlayer: false });
    const m = out.missions.find((x) => x.owner === 'GER');
    expect(m).toBeDefined();
    expect(m?.type).toBe('buildNetwork');
    expect(m?.target).toBe('FRA'); // GER relations: FRA −30 < POL −20
    expect(m?.turnsLeft).toBe(NETWORK_BUILD_TURNS);
  });

  it('never assassinates unless AI_COVERT_AGGRESSIVE is set', () => {
    const base = (st: GameState) => {
      st.wars = [{ id: 'w1', attackers: ['GER'], defenders: ['POL'], startTurn: 0 }];
      st.nations['GER'] = {
        ...st.nations['GER'],
        spyNetworks: { POL: 80 },
        ai: { ...st.nations['GER'].ai, opportunism: 0.9 },
      };
    };
    const tame = frozenTestState(base);
    const tameOut = runAI(tame, rng(), { includePlayer: false });
    expect(tameOut.missions.every((m) => m.type !== 'assassinate')).toBe(true);

    const unleashed = frozenTestState((st) => {
      base(st);
      st.flags['AI_COVERT_AGGRESSIVE'] = true;
    });
    const out = runAI(unleashed, rng(), { includePlayer: false });
    const m = out.missions.find((x) => x.owner === 'GER');
    expect(m?.type).toBe('assassinate');
    expect(m?.target).toBe('POL');
  });

  it('unopportunistic majors run no missions', () => {
    const s = frozenTestState(); // GER opportunism 0.5 is not > 0.5
    const out = runAI(s, rng(), { includePlayer: false });
    expect(out.missions).toHaveLength(0);
  });
});

describe('step 7: peace feelers when losing badly', () => {
  it('sets the transient flag and reports to the enemy war leader', () => {
    const s = frozenTestState((st) => {
      st.playerNation = 'GER'; // so the report to the war leader is delivered
      st.wars = [{ id: 'w1', attackers: ['GER'], defenders: ['FRA'], startTurn: 0 }];
      st.regions['fra-north'] = { owner: 'FRA', controller: 'GER', entrenchment: 0 };
      st.nations['FRA'] = { ...st.nations['FRA'], warSupport: 20 };
    });
    const out = runAI(s, rng(), { includePlayer: false });
    expect(out.flags['_peaceseek_FRA']).toBe(true);
    expect(out.reports.some((r) => r.kind === 'diplomatic' && r.title.includes('France'))).toBe(true);
  });

  it('no feelers while the capital is safe or morale holds', () => {
    const safeCapital = frozenTestState((st) => {
      st.playerNation = 'GER';
      st.wars = [{ id: 'w1', attackers: ['GER'], defenders: ['FRA'], startTurn: 0 }];
      st.nations['FRA'] = { ...st.nations['FRA'], warSupport: 20 }; // paris untouched
    });
    expect(runAI(safeCapital, rng(), { includePlayer: false }).flags['_peaceseek_FRA']).toBeUndefined();

    const highMorale = frozenTestState((st) => {
      st.playerNation = 'GER';
      st.wars = [{ id: 'w1', attackers: ['GER'], defenders: ['FRA'], startTurn: 0 }];
      st.regions['fra-north'] = { owner: 'FRA', controller: 'GER', entrenchment: 0 };
      st.nations['FRA'] = { ...st.nations['FRA'], warSupport: 40 };
    });
    expect(runAI(highMorale, rng(), { includePlayer: false }).flags['_peaceseek_FRA']).toBeUndefined();
  });
});

describe('puppets act only defensively', () => {
  it('copies the master faction and joins its wars, but starts none itself', () => {
    const s = frozenTestState((st) => {
      st.wars = [{ id: 'w1', attackers: ['GER'], defenders: ['FRA'], startTurn: 0 }];
      st.nations['POL'] = {
        ...st.nations['POL'],
        puppetOf: 'GER',
        claims: ['ger-berlin'], // must be ignored: puppets have no ambitions
      };
    });
    const out = runAI(s, rng(), { includePlayer: true });
    expect(out.nations['POL'].faction).toBe('axis');
    expect(out.wars).toHaveLength(1);
    expect(out.wars[0].attackers).toContain('POL');
    expect(out.nations['POL'].relations['FRA']).toBe(-100);
  });

  it('puppet front postures are capped at defensive stances', () => {
    // Overwhelming local superiority would mean allout; a puppet holds.
    const s = duelState([mkArmy('g1', 100, 100, 'ger-berlin')], 0.9, (st) => {
      st.nations['GER'] = { ...st.nations['GER'], puppetOf: 'POL' };
      st.wars = [{ id: 'w1', attackers: ['GER'], defenders: ['POL'], startTurn: 0 }];
    });
    // Master POL is at war *with* the puppet here, which is degenerate but
    // exercises the defensive cap without extra nations.
    const out = runAI(s, rng(), { includePlayer: false });
    expect(gerArmy(out, 'g1').posture).toBe('hold');
  });
});

describe('purity and determinism', () => {
  it('never mutates the input state (deep-frozen throughout)', () => {
    const s = frozenTestState((st) => {
      st.nations['GER'] = {
        ...st.nations['GER'],
        claims: ['pol-danzig'],
        ai: { ...st.nations['GER'].ai, opportunism: 0.9 },
      };
      st.tension = 75;
    });
    expect(() => runAI(s, rng(), { includePlayer: true })).not.toThrow();
  });

  it('same input → same output', () => {
    const build = () =>
      frozenTestState((st) => {
        st.nations['GER'] = { ...st.nations['GER'], claims: ['pol-danzig'] };
      });
    const a = runAI(build(), rng(), { includePlayer: true });
    const b = runAI(build(), rng(), { includePlayer: true });
    expect(a).toEqual(b);
  });
});
