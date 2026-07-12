// Iconic battle tests: catalog data integrity, the pre-combat intensity
// flag, and the trigger → phase-advance → resolve lifecycle (win, hold-out
// timeout). Combat's own use of the intensity flag (attacker boost, report
// suppression, damage-flag exposure) is covered in combat.test.ts.

import { describe, expect, it } from 'vitest';
import {
  applyIconicBattleFlags,
  iconicBattleFlag,
  iconicDamageFlag,
  runIconicBattles,
} from '../src/engine/iconicBattles';
import { ICONIC_BATTLES } from '../src/data/iconicBattles';
import { NATION_IDS } from '../src/data/nations';
import { REGION_IDS, REGIONS, INITIAL_CONTROL } from '../src/data/regions';
import { evalCondition } from '../src/engine/conditions';
import type { GameState, NationId, RegionId } from '../src/engine/types';
import { fixedRng } from './fixtures';

const rng = () => fixedRng([0]);

// ---------------------------------------------------------------------------
// Data integrity
// ---------------------------------------------------------------------------

describe('ICONIC_BATTLES data integrity', () => {
  it('ships exactly the three named battles', () => {
    expect(ICONIC_BATTLES.map((b) => b.id).sort()).toEqual([
      'iconic-barbarossa',
      'iconic-bulge',
      'iconic-dday',
    ]);
  });

  it('every battle references real regions and nations, and has well-formed phases', () => {
    for (const b of ICONIC_BATTLES) {
      expect(REGION_IDS).toContain(b.region);
      for (const id of b.attacker) expect(NATION_IDS).toContain(id);
      for (const id of b.defender) expect(NATION_IDS).toContain(id);
      expect(b.attacker.some((a) => b.defender.includes(a))).toBe(false); // no overlap
      expect(b.phases.length).toBeGreaterThanOrEqual(2);
      for (const p of b.phases) {
        expect(p.name.length).toBeGreaterThan(0);
        expect(p.text.length).toBeGreaterThan(40);
      }
      expect(b.maxDuration).toBeGreaterThanOrEqual(b.phases.length);
      expect(b.intensityBonus).toBeGreaterThan(1);
      expect(b.resolutionText.attackerWins.length).toBeGreaterThan(20);
      expect(b.resolutionText.defenderHolds.length).toBeGreaterThan(20);
      expect(b.resolutionText.timedOut.length).toBeGreaterThan(20);
      // No calendar-only triggers: a bare turnAtLeast at the root (rather
      // than wrapped in and()/or() alongside real world-state conditions)
      // would mean the battle fires on a date alone.
      expect(b.trigger.t).not.toBe('turnAtLeast');
    }
  });

  it('ids are unique and prefixed "iconic-"', () => {
    const ids = ICONIC_BATTLES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id.startsWith('iconic-')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Minimal real-map state builder (nations kept sparse; regions are the real map).
// ---------------------------------------------------------------------------

const TECH0 = { armor: 0, air: 0, naval: 0, industry: 0, doctrine: 0, secret: 0 };

function mkNation(id: NationId, capital: RegionId) {
  return {
    id, name: id, adjective: id, color: '#888888', capital,
    government: 'authoritarian' as const, faction: 'neutral' as const,
    alive: true, puppetOf: null, ic: 50,
    stockpile: { oil: 50, steel: 50, food: 50 },
    icAllocation: { army: 0.4, air: 0.2, navy: 0.1, civilian: 0.3 },
    armies: [], navy: 0, air: 0, manpower: 500, stability: 60, warSupport: 50,
    relations: {}, guarantees: [], pacts: [], claims: [], spyNetworks: {},
    tech: { ...TECH0 }, research: { track: null, progress: 0 }, leader: `${id}-leader`,
    ai: { aggression: 0.5, riskTolerance: 0.5, ideologyZeal: 0.5, opportunism: 0.5, focus: 'defense' as const },
  };
}

/** A full real-map state with just GER/SOV present, at war, BARBAROSSA set — the Barbarossa trigger's exact precondition. */
function barbarossaReadyState(turn: number): GameState {
  const regions: GameState['regions'] = {};
  for (const rid of REGION_IDS) {
    regions[rid] = { owner: INITIAL_CONTROL[rid], controller: INITIAL_CONTROL[rid], entrenchment: 0 };
  }
  return {
    seed: 1, turn, playerNation: 'GER',
    nations: { GER: mkNation('GER', 'ger-berlin'), SOV: mkNation('SOV', 'sov-moscow') },
    regions,
    wars: [{ id: 'w-ger-sov', attackers: ['GER'], defenders: ['SOV'], startTurn: turn }],
    tension: 80, flags: { BARBAROSSA: true }, firedEvents: [], queuedEvents: [],
    pendingChoices: [], missions: [], activeBattles: [], chronicle: [], reports: [], gameOver: null,
  };
}

const barbarossa = ICONIC_BATTLES.find((b) => b.id === 'iconic-barbarossa')!;

// ---------------------------------------------------------------------------
// applyIconicBattleFlags
// ---------------------------------------------------------------------------

describe('applyIconicBattleFlags', () => {
  it('is a no-op with no active battles', () => {
    const s = barbarossaReadyState(41);
    expect(applyIconicBattleFlags(s)).toBe(s);
  });

  it('stamps the intensity multiplier for every active battle region', () => {
    const s: GameState = {
      ...barbarossaReadyState(41),
      activeBattles: [{ battleId: 'iconic-barbarossa', region: 'sov-moscow', phase: 0, startTurn: 41 }],
    };
    const out = applyIconicBattleFlags(s);
    expect(out.flags[iconicBattleFlag('sov-moscow')]).toBe(barbarossa.intensityBonus);
  });
});

// ---------------------------------------------------------------------------
// runIconicBattles: trigger → phases → resolution
// ---------------------------------------------------------------------------

describe('runIconicBattles', () => {
  it('fires the Barbarossa trigger, starts the battle, and reports phase 0', () => {
    // Sanity: the trigger really does read as satisfied by this fixture.
    expect(evalCondition(barbarossa.trigger, barbarossaReadyState(41), rng())).toBe(true);

    const out = runIconicBattles(barbarossaReadyState(41), rng());
    expect(out.firedEvents).toContain('iconic-barbarossa');
    expect(out.activeBattles).toEqual([
      { battleId: 'iconic-barbarossa', region: 'sov-moscow', phase: 0, startTurn: 41 },
    ]);
    const reports = out.reports.filter((r) => r.kind === 'battle');
    expect(reports).toHaveLength(1);
    expect(reports[0].title).toContain(barbarossa.phases[0].name);
    expect(out.chronicle.some((c) => c.divergence && c.text.includes(barbarossa.name))).toBe(true);
  });

  it('never fires twice', () => {
    const s: GameState = { ...barbarossaReadyState(41), firedEvents: ['iconic-barbarossa'] };
    const out = runIconicBattles(s, rng());
    expect(out.activeBattles).toHaveLength(0);
    expect(out.reports.filter((r) => r.kind === 'battle')).toHaveLength(0);
  });

  it('advances to the next phase on a later turn while the region still holds', () => {
    const s: GameState = {
      ...barbarossaReadyState(44),
      firedEvents: ['iconic-barbarossa'],
      activeBattles: [{ battleId: 'iconic-barbarossa', region: 'sov-moscow', phase: 0, startTurn: 41 }],
    };
    const out = runIconicBattles(s, rng());
    expect(out.activeBattles).toEqual([
      { battleId: 'iconic-barbarossa', region: 'sov-moscow', phase: 1, startTurn: 41 },
    ]);
    const reports = out.reports.filter((r) => r.kind === 'battle');
    expect(reports[0].title).toContain(barbarossa.phases[1].name);
  });

  it('resolves attackerWins and clears activeBattles once the region flips to the attacker', () => {
    const s: GameState = {
      ...barbarossaReadyState(43),
      firedEvents: ['iconic-barbarossa'],
      activeBattles: [{ battleId: 'iconic-barbarossa', region: 'sov-moscow', phase: 1, startTurn: 41 }],
    };
    s.regions['sov-moscow'] = { owner: 'SOV', controller: 'GER', entrenchment: 0 }; // GER (attacker) has taken it
    const out = runIconicBattles(s, rng());
    expect(out.activeBattles).toHaveLength(0);
    const reports = out.reports.filter((r) => r.kind === 'battle');
    expect(reports).toHaveLength(1);
    expect(reports[0].body).toContain('Moscow has fallen');
    expect(out.chronicle.some((c) => c.text === barbarossa.resolutionText.attackerWins)).toBe(true);
  });

  it('resolves timedOut once maxDuration elapses without a capture', () => {
    const startTurn = 41;
    const s: GameState = {
      ...barbarossaReadyState(startTurn + barbarossa.maxDuration - 1), // elapsed = maxDuration - 1
      firedEvents: ['iconic-barbarossa'],
      activeBattles: [{ battleId: 'iconic-barbarossa', region: 'sov-moscow', phase: 1, startTurn }],
    };
    const out = runIconicBattles(s, rng());
    expect(out.activeBattles).toHaveLength(0);
    const reports = out.reports.filter((r) => r.kind === 'battle');
    expect(reports[0].body).toContain(barbarossa.resolutionText.timedOut.slice(0, 20));
  });

  it('threads the damage line onto a phase report when combat left the flags behind', () => {
    const s: GameState = {
      ...barbarossaReadyState(44),
      firedEvents: ['iconic-barbarossa'],
      activeBattles: [{ battleId: 'iconic-barbarossa', region: 'sov-moscow', phase: 0, startTurn: 41 }],
      flags: {
        ...barbarossaReadyState(44).flags,
        [iconicDamageFlag('sov-moscow', 'atk')]: 12.3,
        [iconicDamageFlag('sov-moscow', 'def')]: 45.6,
      },
    };
    const out = runIconicBattles(s, rng());
    const report = out.reports.find((r) => r.kind === 'battle')!;
    expect(report.body).toContain('attacker 12.3');
    expect(report.body).toContain('defender 45.6');
  });
});
