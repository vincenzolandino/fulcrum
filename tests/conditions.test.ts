import { describe, expect, it } from 'vitest';
import { evalCondition } from '../src/engine/conditions';
import { landPower, totalPower } from '../src/engine/power';
import type { Condition, GameState, Rng } from '../src/engine/types';
import { deepFreeze, fixedRng, frozenTestState, makeTestState } from './fixtures';

// Default rng for conditions that never touch randomness.
const rng = (): Rng => fixedRng([0.5]);

const evalOn = (c: Condition, state: GameState, r: Rng = rng()): boolean => evalCondition(c, state, r);

describe('power math', () => {
  it('landPower applies strength × equipment × tech bonuses × scale', () => {
    const s = frozenTestState();
    // GER: 2 armies × (0.80 × 0.75 × (1 + 0.15·2 + 0.10·1)) × 10 = 16.8
    expect(landPower(s.nations.GER)).toBeCloseTo(16.8, 10);
    // POL: 0.70 × 0.50 × 1.0 × 10 = 3.5 (no armor/doctrine tech)
    expect(landPower(s.nations.POL)).toBeCloseTo(3.5, 10);
    // FRA: 2 × (0.75 × 0.65) × 10 = 9.75
    expect(landPower(s.nations.FRA)).toBeCloseTo(9.75, 10);
  });

  it('landPower of a nation with no armies is 0', () => {
    const s = frozenTestState((st) => {
      st.nations.POL.armies = [];
    });
    expect(landPower(s.nations.POL)).toBe(0);
  });

  it('totalPower adds navy/100 and air/100', () => {
    const s = frozenTestState();
    expect(totalPower(s.nations.GER)).toBeCloseTo(22.8, 10); // 16.8 + 2 + 4
    expect(totalPower(s.nations.POL)).toBeCloseTo(4.0, 10); // 3.5 + 0 + 0.5
    expect(totalPower(s.nations.FRA)).toBeCloseTo(14.75, 10); // 9.75 + 3 + 2
  });
});

describe('evalCondition', () => {
  it('always / never', () => {
    const s = frozenTestState();
    expect(evalOn({ t: 'always' }, s)).toBe(true);
    expect(evalOn({ t: 'never' }, s)).toBe(false);
  });

  it('and / or / not, including nesting', () => {
    const s = frozenTestState();
    expect(evalOn({ t: 'and', c: [{ t: 'always' }, { t: 'always' }] }, s)).toBe(true);
    expect(evalOn({ t: 'and', c: [{ t: 'always' }, { t: 'never' }] }, s)).toBe(false);
    expect(evalOn({ t: 'and', c: [] }, s)).toBe(true); // vacuous truth
    expect(evalOn({ t: 'or', c: [{ t: 'never' }, { t: 'always' }] }, s)).toBe(true);
    expect(evalOn({ t: 'or', c: [{ t: 'never' }] }, s)).toBe(false);
    expect(evalOn({ t: 'or', c: [] }, s)).toBe(false);
    expect(evalOn({ t: 'not', c: { t: 'never' } }, s)).toBe(true);
    expect(
      evalOn({ t: 'not', c: { t: 'and', c: [{ t: 'always' }, { t: 'never' }] } }, s),
    ).toBe(true);
  });

  it('flag: defaults to is:true, compares numbers/strings, unset counts as false', () => {
    const s = frozenTestState((st) => {
      st.flags = { MUNICH: true, PURGE_LEVEL: 2, MOOD: 'grim' };
    });
    expect(evalOn({ t: 'flag', key: 'MUNICH' }, s)).toBe(true);
    expect(evalOn({ t: 'flag', key: 'MUNICH', is: true }, s)).toBe(true);
    expect(evalOn({ t: 'flag', key: 'MUNICH', is: false }, s)).toBe(false);
    expect(evalOn({ t: 'flag', key: 'PURGE_LEVEL', is: 2 }, s)).toBe(true);
    expect(evalOn({ t: 'flag', key: 'PURGE_LEVEL', is: 3 }, s)).toBe(false);
    expect(evalOn({ t: 'flag', key: 'MOOD', is: 'grim' }, s)).toBe(true);
    expect(evalOn({ t: 'flag', key: 'NOPE' }, s)).toBe(false); // unset, want true
    expect(evalOn({ t: 'flag', key: 'NOPE', is: false }, s)).toBe(true); // unset == false
  });

  it('turnAtLeast / turnBefore', () => {
    const s = frozenTestState((st) => {
      st.turn = 12;
    });
    expect(evalOn({ t: 'turnAtLeast', n: 12 }, s)).toBe(true);
    expect(evalOn({ t: 'turnAtLeast', n: 13 }, s)).toBe(false);
    expect(evalOn({ t: 'turnBefore', n: 13 }, s)).toBe(true);
    expect(evalOn({ t: 'turnBefore', n: 12 }, s)).toBe(false);
  });

  it('random consumes the rng', () => {
    const s = frozenTestState();
    expect(evalOn({ t: 'random', p: 0.5 }, s, fixedRng([0.4]))).toBe(true); // 0.4 < 0.5
    expect(evalOn({ t: 'random', p: 0.3 }, s, fixedRng([0.4]))).toBe(false); // 0.4 >= 0.3
  });

  it('atWar: any war, and specific opposing pair', () => {
    const s = frozenTestState((st) => {
      st.wars = [{ id: 'w1', attackers: ['GER'], defenders: ['POL', 'FRA'], startTurn: 0 }];
    });
    expect(evalOn({ t: 'atWar', a: 'GER' }, s)).toBe(true);
    expect(evalOn({ t: 'atWar', a: 'FRA' }, s)).toBe(true);
    expect(evalOn({ t: 'atWar', a: 'GER', b: 'POL' }, s)).toBe(true);
    expect(evalOn({ t: 'atWar', a: 'POL', b: 'GER' }, s)).toBe(true); // order-agnostic
    expect(evalOn({ t: 'atWar', a: 'POL', b: 'FRA' }, s)).toBe(false); // same side
    const peace = frozenTestState();
    expect(evalOn({ t: 'atWar', a: 'GER' }, peace)).toBe(false);
  });

  it('alive', () => {
    const s = frozenTestState((st) => {
      st.nations.POL.alive = false;
    });
    expect(evalOn({ t: 'alive', nation: 'GER' }, s)).toBe(true);
    expect(evalOn({ t: 'alive', nation: 'POL' }, s)).toBe(false);
    expect(evalOn({ t: 'alive', nation: 'XXX' }, s)).toBe(false); // unknown id
  });

  it('isPlayer', () => {
    const s = frozenTestState();
    expect(evalOn({ t: 'isPlayer', nation: 'POL' }, s)).toBe(true);
    expect(evalOn({ t: 'isPlayer', nation: 'GER' }, s)).toBe(false);
  });

  it('faction', () => {
    const s = frozenTestState();
    expect(evalOn({ t: 'faction', nation: 'GER', is: 'axis' }, s)).toBe(true);
    expect(evalOn({ t: 'faction', nation: 'GER', is: 'allies' }, s)).toBe(false);
    expect(evalOn({ t: 'faction', nation: 'POL', is: 'neutral' }, s)).toBe(true);
  });

  it('controls', () => {
    const s = frozenTestState((st) => {
      st.regions['pol-danzig'].controller = 'GER'; // occupied, still POL-owned
    });
    expect(evalOn({ t: 'controls', nation: 'GER', region: 'pol-danzig' }, s)).toBe(true);
    expect(evalOn({ t: 'controls', nation: 'POL', region: 'pol-danzig' }, s)).toBe(false);
    expect(evalOn({ t: 'controls', nation: 'POL', region: 'pol-warsaw' }, s)).toBe(true);
    expect(evalOn({ t: 'controls', nation: 'POL', region: 'no-such-region' }, s)).toBe(false);
  });

  it('leaderIs', () => {
    const s = frozenTestState();
    expect(evalOn({ t: 'leaderIs', nation: 'GER', leader: 'hitler' }, s)).toBe(true);
    expect(evalOn({ t: 'leaderIs', nation: 'GER', leader: 'goering' }, s)).toBe(false);
  });

  it('relations: atLeast / below / both bounds; unknown pair reads 0', () => {
    const s = frozenTestState(); // GER–POL = −20
    expect(evalOn({ t: 'relations', a: 'GER', b: 'POL', atLeast: -20 }, s)).toBe(true);
    expect(evalOn({ t: 'relations', a: 'GER', b: 'POL', atLeast: 0 }, s)).toBe(false);
    expect(evalOn({ t: 'relations', a: 'GER', b: 'POL', below: 0 }, s)).toBe(true);
    expect(evalOn({ t: 'relations', a: 'GER', b: 'POL', below: -20 }, s)).toBe(false);
    expect(evalOn({ t: 'relations', a: 'GER', b: 'POL', atLeast: -30, below: 0 }, s)).toBe(true);
    expect(evalOn({ t: 'relations', a: 'POL', b: 'XXX', atLeast: 0 }, s)).toBe(true); // 0 >= 0
    expect(evalOn({ t: 'relations', a: 'POL', b: 'XXX', below: 0 }, s)).toBe(false);
  });

  it('stability bounds', () => {
    const s = frozenTestState(); // POL stability 60
    expect(evalOn({ t: 'stability', nation: 'POL', atLeast: 60 }, s)).toBe(true);
    expect(evalOn({ t: 'stability', nation: 'POL', atLeast: 61 }, s)).toBe(false);
    expect(evalOn({ t: 'stability', nation: 'POL', below: 60 }, s)).toBe(false);
    expect(evalOn({ t: 'stability', nation: 'POL', below: 61 }, s)).toBe(true);
  });

  it('warSupport bounds', () => {
    const s = frozenTestState(); // FRA warSupport 30
    expect(evalOn({ t: 'warSupport', nation: 'FRA', atLeast: 30 }, s)).toBe(true);
    expect(evalOn({ t: 'warSupport', nation: 'FRA', atLeast: 31 }, s)).toBe(false);
    expect(evalOn({ t: 'warSupport', nation: 'FRA', below: 31 }, s)).toBe(true);
  });

  it('strengthRatio uses totalPower (GER 22.8 vs POL 4.0)', () => {
    const s = frozenTestState();
    expect(evalOn({ t: 'strengthRatio', a: 'GER', b: 'POL', atLeast: 5 }, s)).toBe(true);
    expect(evalOn({ t: 'strengthRatio', a: 'GER', b: 'POL', atLeast: 6 }, s)).toBe(false);
    expect(evalOn({ t: 'strengthRatio', a: 'POL', b: 'GER', atLeast: 1 }, s)).toBe(false);
    // a's power >= atLeast × 0 is always satisfied against a powerless foe
    const disarmed = frozenTestState((st) => {
      st.nations.POL.armies = [];
      st.nations.POL.air = 0;
    });
    expect(evalOn({ t: 'strengthRatio', a: 'GER', b: 'POL', atLeast: 99 }, disarmed)).toBe(true);
  });

  it('spyNetwork: unset network reads 0', () => {
    const s = frozenTestState(); // GER→POL network 40
    expect(evalOn({ t: 'spyNetwork', owner: 'GER', target: 'POL', atLeast: 40 }, s)).toBe(true);
    expect(evalOn({ t: 'spyNetwork', owner: 'GER', target: 'POL', atLeast: 41 }, s)).toBe(false);
    expect(evalOn({ t: 'spyNetwork', owner: 'POL', target: 'GER', atLeast: 1 }, s)).toBe(false);
  });

  it('tech', () => {
    const s = frozenTestState(); // GER armor 2
    expect(evalOn({ t: 'tech', nation: 'GER', track: 'armor', atLeast: 2 }, s)).toBe(true);
    expect(evalOn({ t: 'tech', nation: 'GER', track: 'armor', atLeast: 3 }, s)).toBe(false);
    expect(evalOn({ t: 'tech', nation: 'POL', track: 'secret', atLeast: 1 }, s)).toBe(false);
  });

  it('tension bounds', () => {
    const s = frozenTestState(); // tension 20
    expect(evalOn({ t: 'tension', atLeast: 20 }, s)).toBe(true);
    expect(evalOn({ t: 'tension', atLeast: 21 }, s)).toBe(false);
    expect(evalOn({ t: 'tension', below: 20 }, s)).toBe(false);
    expect(evalOn({ t: 'tension', below: 21 }, s)).toBe(true);
    expect(evalOn({ t: 'tension', atLeast: 10, below: 30 }, s)).toBe(true);
  });

  it('eventFired / eventNotFired', () => {
    const s = frozenTestState((st) => {
      st.firedEvents = ['munich'];
    });
    expect(evalOn({ t: 'eventFired', id: 'munich' }, s)).toBe(true);
    expect(evalOn({ t: 'eventFired', id: 'anschluss' }, s)).toBe(false);
    expect(evalOn({ t: 'eventNotFired', id: 'munich' }, s)).toBe(false);
    expect(evalOn({ t: 'eventNotFired', id: 'anschluss' }, s)).toBe(true);
  });

  it('never mutates the state it reads (deep-frozen fixture)', () => {
    const s = deepFreeze(makeTestState());
    const conditions: Condition[] = [
      { t: 'and', c: [{ t: 'alive', nation: 'GER' }, { t: 'tension', atLeast: 0 }] },
      { t: 'strengthRatio', a: 'GER', b: 'FRA', atLeast: 1 },
      { t: 'random', p: 0.5 },
    ];
    for (const c of conditions) evalOn(c, s, fixedRng([0.1]));
    expect(s.tension).toBe(20); // still intact; frozen writes would have thrown
  });
});
