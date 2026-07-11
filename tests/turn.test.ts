// Turn pipeline tests: the multi-turn smoke run on real data with state
// invariants, determinism, transient-flag hygiene, report pruning, war-dead
// accumulation, and game-over/epilogue behavior.

import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/engine/types';
import { resolveTurn, warDeadFlag } from '../src/engine/turn';
import { buildInitialState } from '../src/engine/setup';
import { FINAL_TURN } from '../src/engine/balance';

// ---------------------------------------------------------------------------
// walkState invariant helper: no NaN/Infinity anywhere, relations within
// [-100, 100], percentages within [0, 100], every region's owner/controller a
// known nation and the controller alive (the engine reassigns control on
// annexation and capitulation, so a dead controller is always a bug).
// ---------------------------------------------------------------------------

function collectNonFinite(value: unknown, path: string, out: string[]): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) out.push(`${path} = ${value}`);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [k, v] of Object.entries(value)) collectNonFinite(v, `${path}.${k}`, out);
}

function walkState(s: GameState): string[] {
  const problems: string[] = [];
  collectNonFinite(s, 'state', problems);

  if (s.tension < 0 || s.tension > 100) problems.push(`tension = ${s.tension}`);

  for (const n of Object.values(s.nations)) {
    for (const [other, v] of Object.entries(n.relations)) {
      if (v < -100 || v > 100) problems.push(`relations ${n.id}->${other} = ${v}`);
    }
    if (n.stability < 0 || n.stability > 100) problems.push(`stability ${n.id} = ${n.stability}`);
    if (n.warSupport < 0 || n.warSupport > 100) problems.push(`warSupport ${n.id} = ${n.warSupport}`);
    for (const a of n.armies) {
      if (a.strength < 0 || a.strength > 100) problems.push(`army ${a.id} strength = ${a.strength}`);
      if (a.equipment < 0 || a.equipment > 100) problems.push(`army ${a.id} equipment = ${a.equipment}`);
    }
  }

  for (const [rid, rs] of Object.entries(s.regions)) {
    if (!s.nations[rs.owner]) problems.push(`region ${rid} owner ${rs.owner} unknown`);
    const controller = s.nations[rs.controller];
    if (!controller) problems.push(`region ${rid} controller ${rs.controller} unknown`);
    else if (!controller.alive) problems.push(`region ${rid} controlled by dead ${rs.controller}`);
    if (rs.entrenchment < 0 || rs.entrenchment > 5) problems.push(`region ${rid} entrenchment = ${rs.entrenchment}`);
  }
  return problems;
}

describe('resolveTurn: 12-turn smoke on real data', () => {
  it('resolves 12 AI-driven turns as Poland without exceptions and holds invariants', () => {
    let s = buildInitialState('POL', 42);
    for (let i = 0; i < 12; i++) {
      if (s.gameOver !== null) break; // Poland may not survive 12 turns of this
      const before = s.turn;
      s = resolveTurn(s, { aiControlsPlayer: true });
      expect(s.turn).toBe(before + 1);
      expect(walkState(s)).toEqual([]);
    }
    expect(s.turn).toBeGreaterThanOrEqual(1);
  });

  it('is deterministic: the same seed resolves to the same state', () => {
    const run = (): GameState => {
      let s = buildInitialState('POL', 42);
      for (let i = 0; i < 8 && s.gameOver === null; i++) {
        s = resolveTurn(s, { aiControlsPlayer: true });
      }
      return s;
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  it('never mutates the input state', () => {
    const s0 = buildInitialState('POL', 42);
    const snapshot = JSON.stringify(s0);
    resolveTurn(s0, { aiControlsPlayer: true });
    expect(JSON.stringify(s0)).toBe(snapshot);
  });
});

describe('resolveTurn: Germany goes to war', () => {
  it('sees GER declare at least one war by turn 24 in most seeds', () => {
    const seeds = [7, 42, 1938];
    let declared = 0;
    for (const seed of seeds) {
      let s = buildInitialState('POL', seed);
      let sawGermanWar = false;
      for (let i = 0; i < 24 && !sawGermanWar && s.gameOver === null; i++) {
        s = resolveTurn(s, { aiControlsPlayer: true });
        sawGermanWar = s.wars.some((w) => w.attackers.includes('GER'));
      }
      if (sawGermanWar) declared += 1;
    }
    expect(declared).toBeGreaterThanOrEqual(2);
  });
});

describe('resolveTurn: flag and report hygiene', () => {
  it('clears transient flags but preserves the war-dead ledger and permanent flags', () => {
    const s0 = buildInitialState('POL', 5);
    s0.flags['_lost_FAKE'] = 3; // stale transient from a previous turn
    s0.flags[warDeadFlag('GER')] = 10; // cumulative ledger must survive
    s0.flags['MUNICH_HELD'] = true; // permanent flag must survive
    const out = resolveTurn(s0, { aiControlsPlayer: true });
    expect(out.flags['_lost_FAKE']).toBeUndefined();
    expect(out.flags[warDeadFlag('GER')]).toBeGreaterThanOrEqual(10);
    expect(out.flags['MUNICH_HELD']).toBe(true);
  });

  it('accumulates war dead from regions lost once fighting starts', () => {
    // Japan and China are at war from the start; within a few turns China
    // loses ground and the ledger starts counting.
    let s = buildInitialState('POL', 42);
    for (let i = 0; i < 8 && s.gameOver === null; i++) {
      s = resolveTurn(s, { aiControlsPlayer: true });
    }
    const total = Object.entries(s.flags)
      .filter(([k, v]) => k.startsWith('_wardead_') && typeof v === 'number')
      .reduce((sum, [, v]) => sum + (v as number), 0);
    expect(total).toBeGreaterThan(0);
  });

  it('prunes reports to the resolved turn only', () => {
    const s0 = buildInitialState('POL', 9);
    s0.reports = [
      { kind: 'domestic', title: 'Old news', body: 'From a previous month.', turn: -1 },
    ];
    const out = resolveTurn(s0, { aiControlsPlayer: true });
    expect(out.reports.every((r) => r.turn === s0.turn)).toBe(true);
  });
});

describe('resolveTurn: game over and epilogue', () => {
  it('ends the game at the final turn and fills in the epilogue', () => {
    const s0: GameState = { ...buildInitialState('POL', 11), turn: FINAL_TURN };
    const out = resolveTurn(s0, { aiControlsPlayer: true });
    expect(out.gameOver).not.toBeNull();
    expect(out.gameOver?.verdict).toBeTruthy();
    expect(Number.isFinite(out.gameOver?.score)).toBe(true);
    expect(out.gameOver?.epilogue.length).toBeGreaterThan(100);
    expect(out.gameOver?.epilogue).toContain(out.gameOver?.verdict ?? '');
  });

  it('returns a finished game unchanged', () => {
    const s0 = buildInitialState('POL', 11);
    const over: GameState = {
      ...s0,
      gameOver: { verdict: 'Defeat', score: 0, epilogue: 'It is over.' },
    };
    expect(resolveTurn(over, { aiControlsPlayer: true })).toBe(over);
  });
});
