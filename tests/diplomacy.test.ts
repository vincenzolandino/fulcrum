// runDiplomacy: relation drift per pair, war floor lock, tension decay.
// Fixture relations: GER-POL -20, GER-FRA -30, POL-FRA +40; tension 20.
// Governments: GER fascist, POL authoritarian, FRA democracy.
// Factions: GER axis, POL neutral, FRA allies.

import { describe, expect, it } from 'vitest';
import { MAJORS, runDiplomacy } from '../src/engine/diplomacy';
import {
  DRIFT_IDEOLOGY_CLASH,
  DRIFT_SAME_FACTION,
  DRIFT_WAR_ALLY,
  TENSION_DECAY,
} from '../src/engine/balance';
import type { War } from '../src/engine/types';
import { fixedRng, frozenTestState } from './fixtures';

const rng = () => fixedRng([0.5]);

const war = (attackers: string[], defenders: string[]): War => ({
  id: `war-${attackers[0]}-${defenders[0]}`,
  attackers,
  defenders,
  startTurn: 0,
});

describe('MAJORS', () => {
  it('lists the seven great powers', () => {
    expect(MAJORS).toEqual(['GER', 'FRA', 'UK', 'SOV', 'ITA', 'JAP', 'USA']);
  });
});

describe('runDiplomacy relation drift', () => {
  it('fascist-democracy pairs drift by the ideology clash, mirrored', () => {
    const out = runDiplomacy(frozenTestState(), rng());
    expect(out.nations.GER.relations.FRA).toBe(-30 + DRIFT_IDEOLOGY_CLASH); // -30.5
    expect(out.nations.FRA.relations.GER).toBe(-30.5);
  });

  it('pairs with no faction, ideology, or war tie do not move', () => {
    const out = runDiplomacy(frozenTestState(), rng());
    expect(out.nations.GER.relations.POL).toBe(-20); // fascist vs authoritarian: no clash
    expect(out.nations.POL.relations.FRA).toBe(40);
  });

  it('same non-neutral faction drifts up by DRIFT_SAME_FACTION', () => {
    const out = runDiplomacy(
      frozenTestState((s) => {
        s.nations.POL.faction = 'axis';
      }),
      rng(),
    );
    expect(out.nations.GER.relations.POL).toBe(-20 + DRIFT_SAME_FACTION); // -19
    expect(out.nations.POL.relations.GER).toBe(-19);
  });

  it('a shared neutral faction earns no bonus', () => {
    const out = runDiplomacy(
      frozenTestState((s) => {
        s.nations.GER.faction = 'neutral'; // GER and POL now both neutral
      }),
      rng(),
    );
    expect(out.nations.GER.relations.POL).toBe(-20);
  });

  it('fighting on the same side adds DRIFT_WAR_ALLY', () => {
    const out = runDiplomacy(
      frozenTestState((s) => {
        s.wars.push(war(['GER', 'POL'], ['FRA']));
      }),
      rng(),
    );
    expect(out.nations.GER.relations.POL).toBe(-20 + DRIFT_WAR_ALLY); // -18
    expect(out.nations.POL.relations.GER).toBe(-18);
  });

  it('faction and war-ally contributions stack', () => {
    const out = runDiplomacy(
      frozenTestState((s) => {
        s.nations.POL.faction = 'axis';
        s.wars.push(war(['GER', 'POL'], ['FRA']));
      }),
      rng(),
    );
    expect(out.nations.GER.relations.POL).toBe(-20 + DRIFT_SAME_FACTION + DRIFT_WAR_ALLY); // -17
  });

  it('drift caps at +100', () => {
    const out = runDiplomacy(
      frozenTestState((s) => {
        s.nations.POL.faction = 'axis';
        s.nations.GER.relations.POL = 99.5;
        s.nations.POL.relations.GER = 99.5;
      }),
      rng(),
    );
    expect(out.nations.GER.relations.POL).toBe(100);
    expect(out.nations.POL.relations.GER).toBe(100);

    const capped = runDiplomacy(
      frozenTestState((s) => {
        s.nations.POL.faction = 'axis';
        s.nations.GER.relations.POL = 100;
        s.nations.POL.relations.GER = 100;
      }),
      rng(),
    );
    expect(capped.nations.GER.relations.POL).toBe(100);
  });

  it('pairs at war are locked to -100 regardless of prior value', () => {
    const out = runDiplomacy(
      frozenTestState((s) => {
        s.wars.push(war(['GER'], ['POL'])); // hand-built war, relations still -20
      }),
      rng(),
    );
    expect(out.nations.GER.relations.POL).toBe(-100);
    expect(out.nations.POL.relations.GER).toBe(-100);
  });

  it('opposed pairs in a coalition war all lock to -100', () => {
    const out = runDiplomacy(
      frozenTestState((s) => {
        s.wars.push(war(['GER', 'POL'], ['FRA']));
      }),
      rng(),
    );
    expect(out.nations.GER.relations.FRA).toBe(-100);
    expect(out.nations.POL.relations.FRA).toBe(-100);
    expect(out.nations.FRA.relations.GER).toBe(-100);
    expect(out.nations.FRA.relations.POL).toBe(-100);
  });

  it('dead nations neither drift nor lock', () => {
    const out = runDiplomacy(
      frozenTestState((s) => {
        s.nations.GER.alive = false;
      }),
      rng(),
    );
    expect(out.nations.GER.relations.FRA).toBe(-30); // clash pair, but GER is dead
    expect(out.nations.FRA.relations.GER).toBe(-30);
  });
});

describe('runDiplomacy tension', () => {
  it('decays by TENSION_DECAY when no war involves a major', () => {
    const out = runDiplomacy(frozenTestState(), rng());
    expect(out.tension).toBe(20 - TENSION_DECAY); // 19
  });

  it('does not decay while a major is at war', () => {
    const out = runDiplomacy(
      frozenTestState((s) => {
        s.wars.push(war(['GER'], ['POL']));
      }),
      rng(),
    );
    expect(out.tension).toBe(20);
  });

  it('still decays during minor-only wars', () => {
    const out = runDiplomacy(
      frozenTestState((s) => {
        s.wars.push(war(['POL'], ['LIT'])); // neither participant is a major
      }),
      rng(),
    );
    expect(out.tension).toBe(20 - TENSION_DECAY);
  });

  it('does not decay below zero', () => {
    const out = runDiplomacy(
      frozenTestState((s) => {
        s.tension = 0;
      }),
      rng(),
    );
    expect(out.tension).toBe(0);
  });
});

describe('runDiplomacy purity', () => {
  it('never mutates the input state', () => {
    const input = frozenTestState((s) => {
      s.wars.push(war(['GER'], ['POL']));
    });
    const out = runDiplomacy(input, rng()); // frozen input: any mutation throws
    expect(out).not.toBe(input);
    expect(input.nations.GER.relations.POL).toBe(-20);
    expect(input.nations.GER.relations.FRA).toBe(-30);
    expect(input.tension).toBe(20);
  });

  it('untouched nations keep their object identity', () => {
    const input = frozenTestState((s) => {
      // Kill the drift sources so only GER/FRA (clash) move.
      s.nations.POL.government = 'authoritarian';
    });
    const out = runDiplomacy(input, rng());
    expect(out.nations.POL).toBe(input.nations.POL);
    expect(out.nations.GER).not.toBe(input.nations.GER);
  });
});
