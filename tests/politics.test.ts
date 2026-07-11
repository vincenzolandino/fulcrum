// runPolitics: war-support/stability drift, hunger, capitulation.
// Fixture: GER stab 70 ws 50, POL stab 60 ws 40, FRA stab 55 ws 30; no wars.
// Region VP comes from src/data/regions.ts: pol-warsaw 8, pol-danzig 4,
// pol-east 2, sov-leningrad 7, aus-austria 5.

import { describe, expect, it } from 'vitest';
import { capitulatedFlag, lostRegionsFlag, runPolitics } from '../src/engine/politics';
import {
  CAPITULATION_STABILITY,
  LOW_WS_STABILITY_DRAIN,
  NO_FOOD_STABILITY_DRAIN,
  PEACE_STABILITY_GAIN,
  PEACE_WS_DRIFT,
  WAR_SUPPORT_DRAIN,
  WAR_SUPPORT_LOSING,
  WAR_SUPPORT_WINNING,
} from '../src/engine/balance';
import type { GameState, War } from '../src/engine/types';
import { fixedRng, frozenTestState } from './fixtures';

const rng = () => fixedRng([0.5]);

const gerPolWar: War = { id: 'war-GER-POL', attackers: ['GER'], defenders: ['POL'], startTurn: 0 };

const atWar = (mutate?: (s: GameState) => void) =>
  frozenTestState((s) => {
    s.wars.push(gerPolWar);
    if (mutate) mutate(s);
  });

describe('runPolitics at peace', () => {
  it('stability rises and war support drifts toward 50', () => {
    const out = runPolitics(frozenTestState(), rng());
    expect(out.nations.POL.stability).toBe(60 + PEACE_STABILITY_GAIN); // 61
    expect(out.nations.POL.warSupport).toBe(40 + PEACE_WS_DRIFT); // 42
    expect(out.nations.FRA.stability).toBe(55 + PEACE_STABILITY_GAIN); // 56
    expect(out.nations.FRA.warSupport).toBe(30 + PEACE_WS_DRIFT); // 32
    expect(out.nations.GER.stability).toBe(70 + PEACE_STABILITY_GAIN); // 71
    expect(out.nations.GER.warSupport).toBe(50); // already at the midpoint
  });

  it('war support drift never overshoots 50', () => {
    const up = runPolitics(frozenTestState((s) => { s.nations.POL.warSupport = 49; }), rng());
    expect(up.nations.POL.warSupport).toBe(50);
    const down = runPolitics(frozenTestState((s) => { s.nations.POL.warSupport = 51; }), rng());
    expect(down.nations.POL.warSupport).toBe(50);
  });

  it('stability caps at 100', () => {
    const out = runPolitics(frozenTestState((s) => { s.nations.GER.stability = 100; }), rng());
    expect(out.nations.GER.stability).toBe(100);
  });
});

describe('runPolitics at war', () => {
  it('drains war support by the baseline when neither winning nor losing badly', () => {
    const out = runPolitics(atWar(), rng());
    expect(out.nations.GER.warSupport).toBe(50 - WAR_SUPPORT_DRAIN); // 49
    expect(out.nations.POL.warSupport).toBe(40 - WAR_SUPPORT_DRAIN); // 39
    expect(out.nations.GER.stability).toBe(70); // no peace gain, no drains
    expect(out.nations.POL.stability).toBe(60);
  });

  it('positive net captured VP counts as winning', () => {
    const out = runPolitics(
      atWar((s) => {
        s.regions['pol-danzig'] = { owner: 'POL', controller: 'GER', entrenchment: 0 };
      }),
      rng(),
    );
    // GER holds 4 foreign VP, lost none: -1 + 2 = +1.
    expect(out.nations.GER.warSupport).toBe(50 - WAR_SUPPORT_DRAIN + WAR_SUPPORT_WINNING); // 51
    // POL lost 4 VP: not winning, just the baseline drain.
    expect(out.nations.POL.warSupport).toBe(39);
  });

  it('captures cancelled by equal losses are not winning', () => {
    const out = runPolitics(
      atWar((s) => {
        s.regions['pol-danzig'] = { owner: 'POL', controller: 'GER', entrenchment: 0 }; // GER +4
        s.regions['ger-rhineland'] = { owner: 'GER', controller: 'POL', entrenchment: 0 }; // GER -4
      }),
      rng(),
    );
    expect(out.nations.GER.warSupport).toBe(49); // net 0: baseline only
  });

  it('losing two or more regions this turn is losing badly', () => {
    const out = runPolitics(
      atWar((s) => {
        s.flags[lostRegionsFlag('POL')] = 2;
      }),
      rng(),
    );
    expect(out.nations.POL.warSupport).toBe(40 - WAR_SUPPORT_DRAIN + WAR_SUPPORT_LOSING); // 36
  });

  it('losing a single region is not losing badly', () => {
    const out = runPolitics(
      atWar((s) => {
        s.flags[lostRegionsFlag('POL')] = 1;
      }),
      rng(),
    );
    expect(out.nations.POL.warSupport).toBe(39);
  });

  it('stability drains when updated war support falls under the threshold', () => {
    // 30 → 29 after the baseline drain: under 30, so stability drains.
    const under = runPolitics(atWar((s) => { s.nations.POL.warSupport = 30; }), rng());
    expect(under.nations.POL.warSupport).toBe(29);
    expect(under.nations.POL.stability).toBe(60 - LOW_WS_STABILITY_DRAIN); // 59
    // 31 → 30 exactly: not under the threshold, no drain.
    const at = runPolitics(atWar((s) => { s.nations.POL.warSupport = 31; }), rng());
    expect(at.nations.POL.warSupport).toBe(30);
    expect(at.nations.POL.stability).toBe(60);
  });
});

describe('runPolitics hunger', () => {
  it('an empty food stockpile drains stability at peace', () => {
    const out = runPolitics(frozenTestState((s) => { s.nations.POL.stockpile.food = 0; }), rng());
    expect(out.nations.POL.stability).toBe(60 + PEACE_STABILITY_GAIN - NO_FOOD_STABILITY_DRAIN); // 59
  });

  it('an empty food stockpile drains stability at war', () => {
    const out = runPolitics(atWar((s) => { s.nations.POL.stockpile.food = 0; }), rng());
    expect(out.nations.POL.stability).toBe(60 - NO_FOOD_STABILITY_DRAIN); // 58
  });
});

describe('runPolitics capitulation', () => {
  it('capital lost with core VP under the factor raises the flag', () => {
    // POL core: warsaw 8 + danzig 4 = 12; held: danzig 4 < 0.35 x 12 = 4.2.
    const out = runPolitics(
      atWar((s) => {
        s.regions['pol-warsaw'] = { owner: 'POL', controller: 'GER', entrenchment: 0 };
      }),
      rng(),
    );
    expect(out.flags[capitulatedFlag('POL')]).toBe(true);
  });

  it('does not fire while the capital is held, however dire the rest', () => {
    const out = runPolitics(
      atWar((s) => {
        s.regions['pol-danzig'] = { owner: 'POL', controller: 'GER', entrenchment: 0 };
        s.nations.POL.stability = 5; // crumbling, but Warsaw stands
      }),
      rng(),
    );
    expect(out.flags[capitulatedFlag('POL')]).toBeUndefined();
  });

  it('does not fire at peace even with the capital occupied', () => {
    const out = runPolitics(
      frozenTestState((s) => {
        s.regions['pol-warsaw'] = { owner: 'POL', controller: 'GER', entrenchment: 0 };
      }),
      rng(),
    );
    expect(out.flags[capitulatedFlag('POL')]).toBeUndefined();
  });

  it('holds on when enough core VP remains and stability is sound', () => {
    // Core: warsaw 8 + danzig 4 + pol-east 2 = 14; held: 4 + 2 = 6 ≥ 4.9.
    const out = runPolitics(
      atWar((s) => {
        s.regions['pol-warsaw'] = { owner: 'POL', controller: 'GER', entrenchment: 0 };
        s.regions['pol-east'] = { owner: 'POL', controller: 'POL', entrenchment: 0 };
      }),
      rng(),
    );
    expect(out.flags[capitulatedFlag('POL')]).toBeUndefined();
  });

  it('held VP exactly at the factor boundary does not capitulate', () => {
    // Core: leningrad 7 (held) + warsaw 8 + austria 5 = 20; 7 < 0.35 x 20 = 7 is false.
    const boundary = (stability: number) =>
      atWar((s) => {
        s.regions['pol-warsaw'] = { owner: 'POL', controller: 'GER', entrenchment: 0 };
        s.regions['pol-danzig'] = { owner: 'GER', controller: 'GER', entrenchment: 0 };
        s.regions['sov-leningrad'] = { owner: 'POL', controller: 'POL', entrenchment: 0 };
        s.regions['aus-austria'] = { owner: 'POL', controller: 'GER', entrenchment: 0 };
        s.nations.POL.stability = stability;
      });
    const out = runPolitics(boundary(60), rng());
    expect(out.flags[capitulatedFlag('POL')]).toBeUndefined();
    // Same map, but the state is crumbling: the stability branch fires.
    const crumbling = runPolitics(boundary(CAPITULATION_STABILITY - 1), rng());
    expect(crumbling.flags[capitulatedFlag('POL')]).toBe(true);
  });

  it('stability exactly at the capitulation floor holds; one below falls', () => {
    // VP branch false: core 14, held 6 (see the pol-east case above).
    const withStability = (stability: number) =>
      atWar((s) => {
        s.regions['pol-warsaw'] = { owner: 'POL', controller: 'GER', entrenchment: 0 };
        s.regions['pol-east'] = { owner: 'POL', controller: 'POL', entrenchment: 0 };
        s.nations.POL.stability = stability;
      });
    const holds = runPolitics(withStability(CAPITULATION_STABILITY), rng());
    expect(holds.flags[capitulatedFlag('POL')]).toBeUndefined();
    const falls = runPolitics(withStability(CAPITULATION_STABILITY - 1), rng());
    expect(falls.flags[capitulatedFlag('POL')]).toBe(true);
  });
});

describe('runPolitics housekeeping', () => {
  it('skips dead nations entirely', () => {
    const out = runPolitics(frozenTestState((s) => { s.nations.GER.alive = false; }), rng());
    expect(out.nations.GER.stability).toBe(70);
    expect(out.nations.GER.warSupport).toBe(50);
  });

  it('never mutates the input state', () => {
    const input = atWar((s) => {
      s.regions['pol-warsaw'] = { owner: 'POL', controller: 'GER', entrenchment: 0 };
    });
    const out = runPolitics(input, rng()); // frozen input: any mutation throws
    expect(out).not.toBe(input);
    expect(input.nations.POL.warSupport).toBe(40);
    expect(input.flags[capitulatedFlag('POL')]).toBeUndefined();
  });
});
