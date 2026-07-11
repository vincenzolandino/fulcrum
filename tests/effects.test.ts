import { describe, expect, it } from 'vitest';
import { applyEffects, icModFlag, leaderDeadFlag } from '../src/engine/effects';
import type { Effect, GameState, Rng } from '../src/engine/types';
import { deepFreeze, fixedRng, frozenTestState, makeTestState } from './fixtures';

const rng = (): Rng => fixedRng([0.5]);

const apply = (state: GameState, ...effects: Effect[]): GameState =>
  applyEffects(effects, state, rng());

// Fixture reminders: tension 20, GER–POL −20, GER–FRA −30, POL–FRA +40,
// FRA guarantees POL, player is POL, turn 0, no wars.

describe('applyEffects: state hygiene', () => {
  it('returns a new state and never mutates the frozen input', () => {
    const s = frozenTestState();
    const out = apply(
      s,
      { t: 'stability', nation: 'POL', delta: 10 },
      { t: 'tension', delta: 5 },
    );
    expect(out).not.toBe(s);
    expect(out.nations.POL.stability).toBe(70);
    expect(out.tension).toBe(25);
    // input untouched (frozen writes would have thrown already)
    expect(s.nations.POL.stability).toBe(60);
    expect(s.tension).toBe(20);
  });

  it('composes effects left to right', () => {
    const out = apply(
      frozenTestState(),
      { t: 'stability', nation: 'POL', delta: 10 },
      { t: 'stability', nation: 'POL', delta: 15 },
    );
    expect(out.nations.POL.stability).toBe(85);
  });

  it('empty effect list is a no-op', () => {
    const s = frozenTestState();
    expect(applyEffects([], s, rng())).toBe(s);
  });
});

describe('flags and scalars', () => {
  it('flag sets boolean/number/string values', () => {
    const out = apply(
      frozenTestState(),
      { t: 'flag', key: 'MUNICH', value: true },
      { t: 'flag', key: 'PURGE_LEVEL', value: 2 },
      { t: 'flag', key: 'MOOD', value: 'grim' },
    );
    expect(out.flags.MUNICH).toBe(true);
    expect(out.flags.PURGE_LEVEL).toBe(2);
    expect(out.flags.MOOD).toBe('grim');
  });

  it('addFlag treats unset as 0 and accumulates', () => {
    const out = apply(
      frozenTestState(),
      { t: 'addFlag', key: 'ESCALATION', delta: 3 },
      { t: 'addFlag', key: 'ESCALATION', delta: -1 },
    );
    expect(out.flags.ESCALATION).toBe(2);
  });

  it('relations applies delta symmetrically and clamps to −100..100', () => {
    const out = apply(frozenTestState(), { t: 'relations', a: 'GER', b: 'POL', delta: -30 });
    expect(out.nations.GER.relations.POL).toBe(-50);
    expect(out.nations.POL.relations.GER).toBe(-50);
    const floor = apply(frozenTestState(), { t: 'relations', a: 'GER', b: 'POL', delta: -200 });
    expect(floor.nations.GER.relations.POL).toBe(-100);
    const ceil = apply(frozenTestState(), { t: 'relations', a: 'POL', b: 'FRA', delta: 90 });
    expect(ceil.nations.POL.relations.FRA).toBe(100);
    expect(ceil.nations.FRA.relations.POL).toBe(100);
  });

  it('stability and warSupport clamp to 0..100', () => {
    const out = apply(
      frozenTestState(),
      { t: 'stability', nation: 'POL', delta: 50 },
      { t: 'warSupport', nation: 'FRA', delta: -80 },
    );
    expect(out.nations.POL.stability).toBe(100); // 60 + 50 clamped
    expect(out.nations.FRA.warSupport).toBe(0); // 30 − 80 clamped
  });

  it('tension clamps to 0..100', () => {
    expect(apply(frozenTestState(), { t: 'tension', delta: 10 }).tension).toBe(30);
    expect(apply(frozenTestState(), { t: 'tension', delta: 90 }).tension).toBe(100);
    expect(apply(frozenTestState(), { t: 'tension', delta: -50 }).tension).toBe(0);
  });
});

describe('declareWar', () => {
  const dow: Effect = { t: 'declareWar', attacker: 'GER', defender: 'POL' };

  it('creates a war, pulls in the guarantor, sets −100 relations, raises tension', () => {
    const s = frozenTestState();
    const out = apply(s, dow);
    expect(out.wars).toHaveLength(1);
    expect(out.wars[0].attackers).toEqual(['GER']);
    expect(out.wars[0].defenders).toEqual(['POL', 'FRA']); // FRA joins via guarantee
    expect(out.wars[0].startTurn).toBe(0);
    expect(out.nations.GER.relations.POL).toBe(-100);
    expect(out.nations.POL.relations.GER).toBe(-100);
    expect(out.nations.GER.relations.FRA).toBe(-100);
    expect(out.nations.FRA.relations.GER).toBe(-100);
    expect(out.nations.POL.relations.FRA).toBe(40); // co-belligerents unaffected
    expect(out.tension).toBe(28); // 20 + TENSION_PER_DOW
    expect(s.wars).toHaveLength(0); // input untouched
  });

  it('defender alliance-pact partners join the defenders', () => {
    const s = frozenTestState((st) => {
      st.nations.FRA.guarantees = []; // isolate the pact path
      st.nations.POL.pacts = [{ with: 'FRA', kind: 'alliance' }];
      st.nations.FRA.pacts = [{ with: 'POL', kind: 'alliance' }];
    });
    const out = apply(s, dow);
    expect(out.wars[0].defenders).toEqual(['POL', 'FRA']);
  });

  it('attacker alliance-pact partners join the attackers', () => {
    const s = frozenTestState((st) => {
      st.nations.FRA.guarantees = [];
      st.nations.GER.pacts = [{ with: 'FRA', kind: 'alliance' }];
      st.nations.FRA.pacts = [{ with: 'GER', kind: 'alliance' }];
    });
    const out = apply(s, dow);
    expect(out.wars[0].attackers).toEqual(['GER', 'FRA']);
    expect(out.wars[0].defenders).toEqual(['POL']);
  });

  it('a nation never joins against its own faction', () => {
    const s = frozenTestState((st) => {
      st.nations.FRA.faction = 'axis'; // guarantor shares the attacker faction
    });
    const out = apply(s, dow);
    expect(out.wars[0].defenders).toEqual(['POL']); // FRA stays out
  });

  it('non-alliance pacts (nap/trade) do not drag partners in', () => {
    const s = frozenTestState((st) => {
      st.nations.FRA.guarantees = [];
      st.nations.POL.pacts = [{ with: 'FRA', kind: 'nap' }];
      st.nations.FRA.pacts = [{ with: 'POL', kind: 'nap' }];
    });
    const out = apply(s, dow);
    expect(out.wars[0].defenders).toEqual(['POL']);
  });

  it('merges into an existing war involving a principal', () => {
    const s = frozenTestState((st) => {
      st.wars = [{ id: 'w0', attackers: ['GER'], defenders: ['POL'], startTurn: 0 }];
    });
    const out = apply(s, { t: 'declareWar', attacker: 'FRA', defender: 'GER' });
    expect(out.wars).toHaveLength(1); // no second war
    expect(out.wars[0].attackers).toEqual(['GER']);
    expect(out.wars[0].defenders).toEqual(['POL', 'FRA']);
    expect(out.nations.FRA.relations.GER).toBe(-100);
    expect(out.tension).toBe(28);
  });

  it('is a no-op when the pair is already at war', () => {
    const s = frozenTestState((st) => {
      st.wars = [{ id: 'w0', attackers: ['GER'], defenders: ['POL', 'FRA'], startTurn: 0 }];
    });
    const out = apply(s, dow);
    expect(out.wars).toHaveLength(1);
    expect(out.tension).toBe(20); // no fresh DoW tension
  });
});

describe('peace / annex / puppet', () => {
  it('peace removes one belligerent from a multi-party war', () => {
    const s = frozenTestState((st) => {
      st.wars = [{ id: 'w0', attackers: ['GER'], defenders: ['POL', 'FRA'], startTurn: 0 }];
    });
    const out = apply(s, { t: 'peace', a: 'GER', b: 'FRA' });
    expect(out.wars).toHaveLength(1);
    expect(out.wars[0].defenders).toEqual(['POL']);
  });

  it('peace dissolves a one-on-one war entirely', () => {
    const s = frozenTestState((st) => {
      st.wars = [{ id: 'w0', attackers: ['GER'], defenders: ['POL'], startTurn: 0 }];
    });
    const out = apply(s, { t: 'peace', a: 'POL', b: 'GER' }); // order-agnostic
    expect(out.wars).toHaveLength(0);
  });

  it('annex transfers region ownership+control, marks the nation dead, clears armies, exits wars, raises tension', () => {
    const s = frozenTestState((st) => {
      st.wars = [{ id: 'w0', attackers: ['GER'], defenders: ['POL'], startTurn: 0 }];
    });
    const out = apply(s, { t: 'annex', nation: 'POL', by: 'GER' });
    expect(out.regions['pol-warsaw'].controller).toBe('GER');
    expect(out.regions['pol-warsaw'].owner).toBe('GER');
    expect(out.regions['pol-danzig'].controller).toBe('GER');
    expect(out.regions['pol-danzig'].owner).toBe('GER');
    expect(out.regions['pol-danzig'].entrenchment).toBe(0); // reset on control change
    expect(out.regions['fra-paris'].controller).toBe('FRA'); // untouched
    expect(out.nations.POL.alive).toBe(false);
    expect(out.nations.POL.armies).toEqual([]);
    expect(out.wars).toHaveLength(0); // sole defender gone → war dissolves
    expect(out.tension).toBe(25); // 20 + TENSION_PER_ANNEX
    // input untouched
    expect(s.nations.POL.alive).toBe(true);
    expect(s.regions['pol-warsaw'].controller).toBe('POL');
  });

  it('puppet sets puppetOf, aligns faction, and ends wars between the pair', () => {
    const s = frozenTestState((st) => {
      st.wars = [{ id: 'w0', attackers: ['GER'], defenders: ['POL'], startTurn: 0 }];
    });
    const out = apply(s, { t: 'puppet', nation: 'POL', by: 'GER' });
    expect(out.nations.POL.puppetOf).toBe('GER');
    expect(out.nations.POL.faction).toBe('axis');
    expect(out.nations.POL.alive).toBe(true); // puppets live on
    expect(out.wars).toHaveLength(0);
  });
});

describe('regions, factions, pacts, claims', () => {
  it('cedeRegion moves owner and controller and resets entrenchment', () => {
    const out = apply(frozenTestState(), { t: 'cedeRegion', region: 'pol-danzig', to: 'GER' });
    expect(out.regions['pol-danzig'].owner).toBe('GER');
    expect(out.regions['pol-danzig'].controller).toBe('GER');
    expect(out.regions['pol-danzig'].entrenchment).toBe(0); // was 2
  });

  it('setController changes control only, owner stays', () => {
    const out = apply(frozenTestState(), { t: 'setController', region: 'pol-danzig', to: 'GER' });
    expect(out.regions['pol-danzig'].controller).toBe('GER');
    expect(out.regions['pol-danzig'].owner).toBe('POL');
    expect(out.regions['pol-danzig'].entrenchment).toBe(0); // reset on control change
  });

  it('joinFaction', () => {
    const out = apply(frozenTestState(), { t: 'joinFaction', nation: 'POL', faction: 'allies' });
    expect(out.nations.POL.faction).toBe('allies');
  });

  it('guarantee adds once (idempotent)', () => {
    const out = apply(
      frozenTestState(),
      { t: 'guarantee', by: 'GER', of: 'POL' },
      { t: 'guarantee', by: 'GER', of: 'POL' },
    );
    expect(out.nations.GER.guarantees).toEqual(['POL']);
  });

  it('pact registers on both sides and dedupes; breakPact removes all pacts of the pair', () => {
    const pacted = apply(
      frozenTestState(),
      { t: 'pact', a: 'POL', b: 'FRA', kind: 'trade' },
      { t: 'pact', a: 'POL', b: 'FRA', kind: 'trade' },
      { t: 'pact', a: 'POL', b: 'FRA', kind: 'nap' },
    );
    expect(pacted.nations.POL.pacts).toEqual([
      { with: 'FRA', kind: 'trade' },
      { with: 'FRA', kind: 'nap' },
    ]);
    expect(pacted.nations.FRA.pacts).toEqual([
      { with: 'POL', kind: 'trade' },
      { with: 'POL', kind: 'nap' },
    ]);
    const broken = apply(deepFreeze(pacted), { t: 'breakPact', a: 'FRA', b: 'POL' });
    expect(broken.nations.POL.pacts).toEqual([]);
    expect(broken.nations.FRA.pacts).toEqual([]);
  });

  it('addClaim dedupes', () => {
    const out = apply(
      frozenTestState(),
      { t: 'addClaim', nation: 'GER', region: 'pol-danzig' },
      { t: 'addClaim', nation: 'GER', region: 'pol-danzig' },
    );
    expect(out.nations.GER.claims).toEqual(['pol-danzig']);
  });
});

describe('economy and military effects', () => {
  it('ic bumps current ic and accumulates the permanent modifier flag', () => {
    const out = apply(frozenTestState(), { t: 'ic', nation: 'GER', delta: 20 });
    expect(out.nations.GER.ic).toBe(150);
    expect(out.flags[icModFlag('GER')]).toBe(20);
    const out2 = apply(deepFreeze(out), { t: 'ic', nation: 'GER', delta: -5 });
    expect(out2.flags[icModFlag('GER')]).toBe(15);
    expect(out2.nations.GER.ic).toBe(145);
  });

  it('manpower clamps at 0', () => {
    const out = apply(frozenTestState(), { t: 'manpower', nation: 'POL', delta: -400 });
    expect(out.nations.POL.manpower).toBe(0); // 300 − 400
    const up = apply(frozenTestState(), { t: 'manpower', nation: 'POL', delta: 50 });
    expect(up.nations.POL.manpower).toBe(350);
  });

  it('navy and air clamp to 0..1000', () => {
    const out = apply(
      frozenTestState(),
      { t: 'navy', nation: 'GER', delta: 900 },
      { t: 'air', nation: 'GER', delta: -500 },
    );
    expect(out.nations.GER.navy).toBe(1000); // 200 + 900
    expect(out.nations.GER.air).toBe(0); // 400 − 500
  });

  it('armyStrength spreads the delta evenly and clamps per army', () => {
    const down = apply(frozenTestState(), { t: 'armyStrength', nation: 'GER', delta: -40 });
    expect(down.nations.GER.armies.map((a) => a.strength)).toEqual([60, 60]); // −20 each
    const up = apply(frozenTestState(), { t: 'armyStrength', nation: 'GER', delta: 60 });
    expect(up.nations.GER.armies.map((a) => a.strength)).toEqual([100, 100]); // 80+30 → clamp
    const none = apply(
      frozenTestState((st) => {
        st.nations.POL.armies = [];
      }),
      { t: 'armyStrength', nation: 'POL', delta: 10 },
    );
    expect(none.nations.POL.armies).toEqual([]);
  });

  it('newArmy appends with defaults and unique ids', () => {
    const out = apply(
      frozenTestState(),
      { t: 'newArmy', nation: 'POL', name: 'Armia Poznań', location: 'pol-danzig', strength: 60, equipment: 50 },
      { t: 'newArmy', nation: 'POL', name: 'Armia Kraków', location: 'pol-warsaw', strength: 55, equipment: 45 },
    );
    expect(out.nations.POL.armies).toHaveLength(3);
    const [, a, b] = out.nations.POL.armies;
    expect(a.name).toBe('Armia Poznań');
    expect(a.location).toBe('pol-danzig');
    expect(a.strength).toBe(60);
    expect(a.equipment).toBe(50);
    expect(a.experience).toBe(0);
    expect(a.posture).toBe('hold');
    expect(a.moveTarget).toBeNull();
    expect(a.id).not.toBe(b.id);
  });

  it('disbandArmy removes the weakest first', () => {
    const s = frozenTestState((st) => {
      st.nations.GER.armies[1].strength = 30; // ger-2 is now the weakest
    });
    const out = apply(s, { t: 'disbandArmy', nation: 'GER', count: 1 });
    expect(out.nations.GER.armies).toHaveLength(1);
    expect(out.nations.GER.armies[0].id).toBe('ger-1');
    const all = apply(s, { t: 'disbandArmy', nation: 'GER', count: 5 });
    expect(all.nations.GER.armies).toEqual([]);
  });

  it('spyNetwork clamps 0..100 and starts unset targets at 0', () => {
    const out = apply(frozenTestState(), { t: 'spyNetwork', owner: 'GER', target: 'POL', delta: 70 });
    expect(out.nations.GER.spyNetworks.POL).toBe(100); // 40 + 70 clamped
    const fresh = apply(frozenTestState(), { t: 'spyNetwork', owner: 'POL', target: 'GER', delta: 20 });
    expect(fresh.nations.POL.spyNetworks.GER).toBe(20);
  });

  it('tech clamps 0..TECH_MAX', () => {
    const out = apply(frozenTestState(), { t: 'tech', nation: 'GER', track: 'armor', delta: 1 });
    expect(out.nations.GER.tech.armor).toBe(3);
    const capped = apply(frozenTestState(), { t: 'tech', nation: 'GER', track: 'armor', delta: 10 });
    expect(capped.nations.GER.tech.armor).toBe(5);
    const floor = apply(frozenTestState(), { t: 'tech', nation: 'GER', track: 'doctrine', delta: -9 });
    expect(floor.nations.GER.tech.doctrine).toBe(0);
  });
});

describe('leaders, AI, narrative effects', () => {
  it('setLeader', () => {
    const out = apply(frozenTestState(), { t: 'setLeader', nation: 'POL', leader: 'sikorski' });
    expect(out.nations.POL.leader).toBe('sikorski');
  });

  it('killLeader without a succession table sets the flag and leaves the seat for covert.succession', () => {
    const out = apply(frozenTestState(), { t: 'killLeader', nation: 'GER' });
    expect(out.flags[leaderDeadFlag('GER')]).toBe(true);
    expect(out.nations.GER.leader).toBe('hitler'); // replacement is covert.ts's job
  });

  it('setAI merges the patch, preserving other traits', () => {
    const out = apply(frozenTestState(), { t: 'setAI', nation: 'GER', patch: { aggression: 0.2, focus: 'defense' } });
    expect(out.nations.GER.ai.aggression).toBe(0.2);
    expect(out.nations.GER.ai.focus).toBe('defense');
    expect(out.nations.GER.ai.riskTolerance).toBe(0.5); // untouched
  });

  it('chronicle appends an entry stamped with the current turn', () => {
    const s = frozenTestState((st) => {
      st.turn = 7;
    });
    const out = apply(
      s,
      { t: 'chronicle', text: 'Here history turned.', divergence: true },
      { t: 'chronicle', text: 'As in our history.' },
    );
    expect(out.chronicle).toEqual([
      { turn: 7, text: 'Here history turned.', divergence: true },
      { turn: 7, text: 'As in our history.', divergence: false },
    ]);
  });

  it("report reaches the player via 'player' or their nation id; other nations' reports are dropped", () => {
    const out = apply(
      frozenTestState(),
      { t: 'report', to: 'player', kind: 'intel', title: 'A', body: 'a' },
      { t: 'report', to: 'POL', kind: 'front', title: 'B', body: 'b' }, // POL is the player
      { t: 'report', to: 'GER', kind: 'covert', title: 'C', body: 'c' },
    );
    expect(out.reports).toEqual([
      { kind: 'intel', title: 'A', body: 'a', turn: 0 },
      { kind: 'front', title: 'B', body: 'b', turn: 0 },
    ]);
  });

  it('queueEvent schedules relative to the current turn', () => {
    const s = frozenTestState((st) => {
      st.turn = 5;
    });
    const out = apply(s, { t: 'queueEvent', id: 'winter-war', delay: 3 });
    expect(out.queuedEvents).toEqual([{ id: 'winter-war', fireTurn: 8 }]);
  });

  it('endGame sets gameOver once; the first verdict sticks', () => {
    const out = apply(
      frozenTestState(),
      { t: 'endGame', verdict: 'Defeat' },
      { t: 'endGame', verdict: 'Triumph' },
    );
    expect(out.gameOver).toEqual({ verdict: 'Defeat', score: 0, epilogue: '' });
  });
});

describe('robustness', () => {
  it('effects on unknown nations are safe no-ops', () => {
    const s = frozenTestState();
    const out = apply(
      s,
      { t: 'stability', nation: 'XXX', delta: 10 },
      { t: 'relations', a: 'XXX', b: 'GER', delta: 10 },
      { t: 'armyStrength', nation: 'XXX', delta: 10 },
    );
    expect(out.nations.GER.relations.POL).toBe(-20);
    expect(Object.keys(out.nations)).toEqual(['GER', 'POL', 'FRA']);
  });

  it('a full mixed batch leaves the frozen source state intact', () => {
    const s = frozenTestState();
    const snapshot = JSON.stringify(makeTestState());
    apply(
      s,
      { t: 'declareWar', attacker: 'GER', defender: 'POL' },
      { t: 'setController', region: 'pol-danzig', to: 'GER' },
      { t: 'armyStrength', nation: 'POL', delta: -20 },
      { t: 'annex', nation: 'POL', by: 'GER' },
      { t: 'chronicle', text: 'Poland is gone.', divergence: true },
    );
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
