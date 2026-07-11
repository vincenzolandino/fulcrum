// Integrity tests for the 1938 world data (Task 3).
// These run against src/data/* and validate cross-references, adjacency,
// economic totals, and setup invariants the engine depends on.

import { describe, expect, it } from 'vitest';
import type { Condition, NationId, RegionId } from '../src/engine/types';
import { REGIONS, REGION_IDS, INITIAL_CONTROL } from '../src/data/regions';
import { NATIONS_1938, NATION_IDS, MAJOR_IDS } from '../src/data/nations';
import { LEADERS, SUCCESSIONS } from '../src/data/leaders';
import { TECH_INFO } from '../src/data/techs';
import { OBJECTIVES } from '../src/data/objectives';

const MAJORS: NationId[] = ['GER', 'FRA', 'UK', 'SOV', 'ITA', 'JAP', 'USA', 'POL', 'CHI'];

describe('regions', () => {
  it('REGION_IDS matches the REGIONS record', () => {
    expect(new Set(REGION_IDS)).toEqual(new Set(Object.keys(REGIONS)));
    expect(REGION_IDS.length).toBe(new Set(REGION_IDS).size);
  });

  it('every adjacent id exists', () => {
    for (const r of Object.values(REGIONS)) {
      for (const adj of r.adjacent) {
        expect(REGIONS[adj], `${r.id} lists unknown neighbor ${adj}`).toBeDefined();
        expect(adj).not.toBe(r.id);
      }
    }
  });

  it('adjacency is symmetric and free of duplicates', () => {
    for (const r of Object.values(REGIONS)) {
      expect(new Set(r.adjacent).size, `${r.id} has duplicate neighbors`).toBe(r.adjacent.length);
      for (const adj of r.adjacent) {
        expect(
          REGIONS[adj].adjacent.includes(r.id),
          `${r.id} -> ${adj} is not symmetric`,
        ).toBe(true);
      }
    }
  });

  it('the world graph is fully connected (straits and land bridges included)', () => {
    const seen = new Set<RegionId>();
    const queue: RegionId[] = ['ger-berlin'];
    seen.add('ger-berlin');
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const adj of REGIONS[cur].adjacent) {
        if (!seen.has(adj)) {
          seen.add(adj);
          queue.push(adj);
        }
      }
    }
    const unreachable = REGION_IDS.filter((id) => !seen.has(id));
    expect(unreachable, `unreachable regions: ${unreachable.join(', ')}`).toEqual([]);
  });

  it('region fields are within bounds', () => {
    for (const r of Object.values(REGIONS)) {
      expect(r.vp).toBeGreaterThanOrEqual(0);
      expect(r.vp).toBeLessThanOrEqual(10);
      expect(r.ic).toBeGreaterThanOrEqual(0);
      expect(r.resources.oil).toBeGreaterThanOrEqual(0);
      expect(r.resources.steel).toBeGreaterThanOrEqual(0);
      expect(r.resources.food).toBeGreaterThanOrEqual(0);
    }
  });

  it('world IC is within 900-1100 and majors hit their targets (±10%)', () => {
    const total = Object.values(REGIONS).reduce((s, r) => s + r.ic, 0);
    expect(total).toBeGreaterThanOrEqual(900);
    expect(total).toBeLessThanOrEqual(1100);

    const icOf = (nation: NationId): number =>
      Object.entries(INITIAL_CONTROL)
        .filter(([, owner]) => owner === nation)
        .reduce((s, [rid]) => s + REGIONS[rid].ic, 0);

    const within = (value: number, target: number) => {
      expect(value).toBeGreaterThanOrEqual(target * 0.9);
      expect(value).toBeLessThanOrEqual(target * 1.1);
    };
    within(icOf('USA'), 180);
    within(icOf('GER'), 130);
    within(icOf('SOV'), 120);
    within(icOf('FRA'), 70);
    within(icOf('UK') + icOf('IND'), 100); // UK + empire puppet
  });

  it('INITIAL_CONTROL covers every region and owners are real nations', () => {
    expect(new Set(Object.keys(INITIAL_CONTROL))).toEqual(new Set(REGION_IDS));
    for (const owner of Object.values(INITIAL_CONTROL)) {
      expect(NATION_IDS.includes(owner), `unknown region owner ${owner}`).toBe(true);
    }
  });
});

describe('nations', () => {
  it('NATION_IDS matches the record and has the locked 43 ids', () => {
    expect(new Set(NATION_IDS)).toEqual(new Set(Object.keys(NATIONS_1938)));
    expect(NATION_IDS.length).toBe(43);
    for (const id of MAJORS) expect(NATION_IDS).toContain(id);
    expect(new Set(MAJOR_IDS)).toEqual(new Set(MAJORS));
  });

  it('capitals exist and are initially controlled by their nation', () => {
    for (const n of Object.values(NATIONS_1938)) {
      expect(REGIONS[n.capital], `${n.id} capital ${n.capital} missing`).toBeDefined();
      expect(INITIAL_CONTROL[n.capital], `${n.id} does not hold its capital`).toBe(n.id);
    }
  });

  it('puppet assignments are exactly MAN->JAP, MON->SOV, IND->UK', () => {
    for (const n of Object.values(NATIONS_1938)) {
      if (n.id === 'MAN') expect(n.puppetOf).toBe('JAP');
      else if (n.id === 'MON') expect(n.puppetOf).toBe('SOV');
      else if (n.id === 'IND') expect(n.puppetOf).toBe('UK');
      else expect(n.puppetOf, `${n.id} should not be a puppet`).toBeNull();
    }
  });

  it('claims reference existing regions; guarantees/relations/spyNetworks/pacts reference existing nations', () => {
    for (const n of Object.values(NATIONS_1938)) {
      for (const claim of n.claims) {
        expect(REGIONS[claim], `${n.id} claims unknown region ${claim}`).toBeDefined();
      }
      for (const g of n.guarantees) {
        expect(NATION_IDS.includes(g), `${n.id} guarantees unknown nation ${g}`).toBe(true);
      }
      for (const other of Object.keys(n.relations)) {
        expect(NATION_IDS.includes(other), `${n.id} has relations with unknown ${other}`).toBe(true);
        expect(n.relations[other]).toBeGreaterThanOrEqual(-100);
        expect(n.relations[other]).toBeLessThanOrEqual(100);
      }
      for (const target of Object.keys(n.spyNetworks)) {
        expect(NATION_IDS.includes(target), `${n.id} spies on unknown ${target}`).toBe(true);
      }
      for (const p of n.pacts) {
        expect(NATION_IDS.includes(p.with), `${n.id} pact with unknown ${p.with}`).toBe(true);
      }
    }
  });

  it('relations seeds are symmetric', () => {
    for (const n of Object.values(NATIONS_1938)) {
      for (const [other, value] of Object.entries(n.relations)) {
        expect(
          NATIONS_1938[other].relations[n.id],
          `relations ${n.id}<->${other} not mirrored`,
        ).toBe(value);
      }
    }
  });

  it('icAllocation sums to 1 (±0.01) with each share in [0,1]', () => {
    for (const n of Object.values(NATIONS_1938)) {
      const { army, air, navy, civilian } = n.icAllocation;
      for (const share of [army, air, navy, civilian]) {
        expect(share).toBeGreaterThanOrEqual(0);
        expect(share).toBeLessThanOrEqual(1);
      }
      expect(Math.abs(army + air + navy + civilian - 1), `${n.id} allocation`).toBeLessThanOrEqual(0.01);
    }
  });

  it('army ids are unique across all nations', () => {
    const ids = Object.values(NATIONS_1938).flatMap((n) => n.armies.map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every army sits in a region controlled by its nation or an ally', () => {
    const friendly = (owner: NationId, controller: NationId): boolean => {
      if (owner === controller) return true;
      const a = NATIONS_1938[owner];
      const b = NATIONS_1938[controller];
      if (a.puppetOf === controller || b.puppetOf === owner) return true;
      return a.faction !== 'neutral' && a.faction === b.faction;
    };
    for (const n of Object.values(NATIONS_1938)) {
      for (const army of n.armies) {
        const controller = INITIAL_CONTROL[army.location];
        expect(controller, `${army.id} placed in unknown region ${army.location}`).toBeDefined();
        expect(
          friendly(n.id, controller),
          `${army.id} placed in hostile/neutral ${army.location} (${controller})`,
        ).toBe(true);
      }
    }
  });

  it('army stats and national gauges are within bounds', () => {
    for (const n of Object.values(NATIONS_1938)) {
      for (const a of n.armies) {
        expect(a.strength).toBeGreaterThanOrEqual(0);
        expect(a.strength).toBeLessThanOrEqual(100);
        expect(a.equipment).toBeGreaterThanOrEqual(0);
        expect(a.equipment).toBeLessThanOrEqual(100);
        expect(a.experience).toBeGreaterThanOrEqual(0);
        expect(a.experience).toBeLessThanOrEqual(100);
        expect(a.moveTarget).toBeNull();
      }
      expect(n.stability).toBeGreaterThanOrEqual(0);
      expect(n.stability).toBeLessThanOrEqual(100);
      expect(n.warSupport).toBeGreaterThanOrEqual(0);
      expect(n.warSupport).toBeLessThanOrEqual(100);
      expect(n.navy).toBeGreaterThanOrEqual(0);
      expect(n.navy).toBeLessThanOrEqual(1000);
      expect(n.air).toBeGreaterThanOrEqual(0);
      expect(n.air).toBeLessThanOrEqual(1000);
      for (const v of Object.values(n.stockpile)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(999);
      }
      for (const level of Object.values(n.tech)) {
        expect(level).toBeGreaterThanOrEqual(0);
        expect(level).toBeLessThanOrEqual(5);
      }
      expect(n.alive).toBe(true);
    }
  });

  it('nation colors are unique', () => {
    const colors = Object.values(NATIONS_1938).map((n) => n.color.toLowerCase());
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('historical setup spot checks', () => {
    expect(NATIONS_1938.GER.armies.length).toBe(8);
    expect(NATIONS_1938.SOV.armies.length).toBe(12);
    expect(NATIONS_1938.SOV.tech.doctrine).toBe(0); // the purges
    expect(NATIONS_1938.SOV.stability).toBe(55);
    expect(NATIONS_1938.UK.navy).toBe(900);
    expect(NATIONS_1938.USA.navy).toBe(800);
    expect(NATIONS_1938.USA.warSupport).toBe(20); // isolationism
    expect(NATIONS_1938.USA.ai.aggression).toBeCloseTo(0.1);
    expect(NATIONS_1938.JAP.navy).toBe(700);
    expect(NATIONS_1938.GER.ai.aggression).toBeCloseTo(0.9);
    expect(NATIONS_1938.GER.ai.focus).toBe('expansion');
    expect(NATIONS_1938.USA.ai.focus).toBe('consolidation');
    // Claims per the plan
    expect(NATIONS_1938.GER.claims).toEqual(
      expect.arrayContaining(['aus-austria', 'cze-sudetenland', 'pol-danzig']),
    );
    expect(NATIONS_1938.ITA.claims).toContain('alb-albania');
    expect(NATIONS_1938.HUN.claims).toContain('rom-transylvania');
    expect(NATIONS_1938.SOV.claims).toEqual(
      expect.arrayContaining(['pol-east', 'fin-karelia', 'est-tallinn', 'lat-riga', 'lit-kaunas']),
    );
    expect(NATIONS_1938.JAP.claims.some((c) => c.startsWith('chi-'))).toBe(true);
  });
});

describe('leaders', () => {
  it('every nation has a valid 1938 leader', () => {
    for (const n of Object.values(NATIONS_1938)) {
      const leader = LEADERS[n.leader];
      expect(leader, `${n.id} leader ${n.leader} missing from LEADERS`).toBeDefined();
      expect(leader.nation).toBe(n.id);
      expect(leader.name.length).toBeGreaterThan(0);
      expect(leader.bio.length).toBeGreaterThan(0);
    }
  });

  it('every LEADERS entry is internally consistent', () => {
    for (const [id, leader] of Object.entries(LEADERS)) {
      expect(leader.id).toBe(id);
      expect(NATION_IDS.includes(leader.nation)).toBe(true);
    }
  });

  it('all majors have succession tables with valid leaders and weights', () => {
    for (const major of MAJORS) {
      const table = SUCCESSIONS[major];
      expect(table, `${major} has no succession table`).toBeDefined();
      expect(table.length).toBeGreaterThanOrEqual(2);
      for (const opt of table) {
        const leader = LEADERS[opt.leader];
        expect(leader, `${major} successor ${opt.leader} missing`).toBeDefined();
        expect(leader.nation).toBe(major);
        expect(opt.weight).toBeGreaterThan(0);
        expect(opt.leader).not.toBe(NATIONS_1938[major].leader);
      }
    }
  });

  it('GER succession matches the locked spec', () => {
    const ger = SUCCESSIONS.GER;
    const byLeader = Object.fromEntries(ger.map((o) => [o.leader, o]));
    expect(byLeader.goering.weight).toBe(40);
    expect(byLeader.himmler.weight).toBe(25);
    expect(byLeader['beck-junta'].weight).toBe(35);
    expect(byLeader['beck-junta'].aiPatch.focus).toBe('defense');
    expect(byLeader.goering.eventId).toBe('ger-succession-goering');
  });

  it('succession tables only exist for known nations', () => {
    for (const nation of Object.keys(SUCCESSIONS)) {
      expect(NATION_IDS.includes(nation)).toBe(true);
    }
  });
});

describe('techs', () => {
  it('covers all six tracks with 5 level names each', () => {
    const tracks = ['armor', 'air', 'naval', 'industry', 'doctrine', 'secret'] as const;
    for (const track of tracks) {
      expect(TECH_INFO[track]).toBeDefined();
      expect(TECH_INFO[track].name.length).toBeGreaterThan(0);
      expect(TECH_INFO[track].levels.length).toBe(5);
      for (const level of TECH_INFO[track].levels) expect(level.length).toBeGreaterThan(0);
    }
  });
});

describe('objectives', () => {
  const validateCondition = (c: Condition, ctx: string): void => {
    const anyC = c as Record<string, unknown>;
    if ('nation' in anyC) {
      expect(NATION_IDS.includes(anyC.nation as string), `${ctx}: unknown nation ${anyC.nation}`).toBe(true);
    }
    for (const key of ['a', 'b', 'owner', 'target'] as const) {
      if (key in anyC && typeof anyC[key] === 'string') {
        expect(NATION_IDS.includes(anyC[key] as string), `${ctx}: unknown nation ${anyC[key]}`).toBe(true);
      }
    }
    if ('region' in anyC) {
      expect(REGIONS[anyC.region as string], `${ctx}: unknown region ${anyC.region}`).toBeDefined();
    }
    if (c.t === 'and' || c.t === 'or') for (const sub of c.c) validateCondition(sub, ctx);
    if (c.t === 'not') validateCondition(c.c, ctx);
  };

  it('objective ids are unique and reference real nations', () => {
    const ids = OBJECTIVES.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const o of OBJECTIVES) {
      expect(NATION_IDS.includes(o.nation), `objective ${o.id} unknown nation`).toBe(true);
    }
  });

  it('checks only reference existing nations and regions', () => {
    for (const o of OBJECTIVES) validateCondition(o.check, o.id);
  });

  it('points are 10-40', () => {
    for (const o of OBJECTIVES) {
      expect(o.points).toBeGreaterThanOrEqual(10);
      expect(o.points).toBeLessThanOrEqual(40);
    }
  });

  it('majors have >=3 objectives, every other nation >=2', () => {
    for (const id of NATION_IDS) {
      const count = OBJECTIVES.filter((o) => o.nation === id).length;
      if (MAJORS.includes(id)) expect(count, `${id} objectives`).toBeGreaterThanOrEqual(3);
      else expect(count, `${id} objectives`).toBeGreaterThanOrEqual(2);
    }
  });

  it('includes the named Polish objectives', () => {
    const pol = OBJECTIVES.filter((o) => o.nation === 'POL');
    expect(pol.some((o) => o.text.includes('Warsaw') || o.id.includes('warsaw'))).toBe(true);
    expect(pol.some((o) => o.text.includes('Danzig') || o.id.includes('danzig'))).toBe(true);
  });
});
