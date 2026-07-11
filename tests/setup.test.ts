import { describe, expect, it } from 'vitest';
import { buildInitialState } from '../src/engine/setup';
import { NATIONS_1938, NATION_IDS } from '../src/data/nations';
import { INITIAL_CONTROL, REGION_IDS } from '../src/data/regions';

describe('buildInitialState', () => {
  it('sets the game-flow scalars for January 1938', () => {
    const s = buildInitialState('POL', 42);
    expect(s.seed).toBe(42);
    expect(s.turn).toBe(0);
    expect(s.playerNation).toBe('POL');
    expect(s.tension).toBe(15); // Anschluss brewing
    expect(s.gameOver).toBeNull();
    expect(s.flags).toEqual({});
    expect(s.firedEvents).toEqual([]);
    expect(s.queuedEvents).toEqual([]);
    expect(s.pendingChoices).toEqual([]);
    expect(s.missions).toEqual([]);
    expect(s.chronicle).toEqual([]);
    expect(s.reports).toEqual([]);
  });

  it('throws on an unknown nation id', () => {
    expect(() => buildInitialState('ATLANTIS', 1)).toThrow(/unknown nation/);
  });

  it('every region starts owned and controlled per INITIAL_CONTROL, entrenchment 0', () => {
    const s = buildInitialState('GER', 1);
    expect(Object.keys(s.regions).sort()).toEqual([...REGION_IDS].sort());
    for (const rid of REGION_IDS) {
      expect(s.regions[rid]).toEqual({
        owner: INITIAL_CONTROL[rid],
        controller: INITIAL_CONTROL[rid],
        entrenchment: 0,
      });
    }
  });

  it('every nation is present and alive', () => {
    const s = buildInitialState('GER', 1);
    expect(Object.keys(s.nations).sort()).toEqual([...NATION_IDS].sort());
    for (const id of NATION_IDS) expect(s.nations[id].alive).toBe(true);
  });

  it('creates the Sino-Japanese war and no other war', () => {
    const s = buildInitialState('UK', 7);
    expect(s.wars).toHaveLength(1);
    const war = s.wars[0];
    expect(war.attackers).toContain('JAP');
    expect(war.attackers).toContain('MAN'); // Manchukuo marches with Japan
    expect(war.defenders).toEqual(['CHI']);
    expect(war.startTurn).toBe(-6); // July 1937

    // Belligerents sit at the wartime relations floor, mirrored both ways...
    expect(s.nations.JAP.relations.CHI).toBe(-100);
    expect(s.nations.CHI.relations.JAP).toBe(-100);
    // ...without mutating the data module (history seeds JAP-CHI at -80).
    expect(NATIONS_1938.JAP.relations.CHI).toBe(-80);
  });

  it('computes initial ic with the economy formula (stability and supply factors)', () => {
    const s = buildInitialState('GER', 1);
    // GER: 130 region ic, but East Prussia (10) sits cut off behind the
    // Polish Corridor → 120 × (0.5 + 70/200) = 102.
    expect(s.nations.GER.ic).toBeCloseTo(102, 10);
    // POL: all 24 ic connected × (0.5 + 65/200) = 19.8.
    expect(s.nations.POL.ic).toBeCloseTo(19.8, 10);
    // USA: the Philippines (3) are unreachable from the mainland network →
    // 182 × (0.5 + 80/200) = 163.8.
    expect(s.nations.USA.ic).toBeCloseTo(163.8, 10);
  });

  it('deep-copies data: two games never share objects with each other or with src/data', () => {
    const a = buildInitialState('GER', 1);
    const b = buildInitialState('POL', 2);

    expect(a.nations.GER).not.toBe(b.nations.GER);
    expect(a.nations.GER.armies[0]).not.toBe(b.nations.GER.armies[0]);
    expect(a.nations.GER).not.toBe(NATIONS_1938.GER);
    expect(a.regions['ger-berlin']).not.toBe(b.regions['ger-berlin']);
    expect(a.wars[0]).not.toBe(b.wars[0]);

    // Vandalize game A everywhere a shared reference could hide.
    a.nations.GER.armies[0].strength = 1;
    a.nations.GER.relations.POL = 99;
    a.nations.GER.claims.push('fra-paris');
    a.nations.GER.tech.armor = 5;
    a.nations.GER.stockpile.oil = 0;
    a.regions['ger-berlin'].controller = 'POL';
    a.wars[0].attackers.push('GER');

    // The data module is untouched...
    expect(NATIONS_1938.GER.armies[0].strength).toBe(80);
    expect(NATIONS_1938.GER.relations.POL).toBe(-20);
    expect(NATIONS_1938.GER.claims).toEqual(['aus-austria', 'cze-sudetenland', 'pol-danzig']);
    expect(NATIONS_1938.GER.tech.armor).toBe(2);
    // ...and so is game B.
    expect(b.nations.GER.armies[0].strength).toBe(80);
    expect(b.nations.GER.stockpile.oil).toBe(30);
    expect(b.regions['ger-berlin'].controller).toBe('GER');
    expect(b.wars[0].attackers).toEqual(['JAP', 'MAN']);
  });
});
