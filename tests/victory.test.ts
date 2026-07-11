// checkGameOver + scoreObjectives + verdict tiers.
// Fixture player is POL. POL objectives (src/data/objectives.ts): repel the
// invasion 30 (alive + warsaw), Danzig Polish 25, eastern marches 20
// (pol-east, absent from the fixture map), republic survives 20 (alive).
// Fixture regions and data VP: fra-paris 10, ger-rhineland 4, ger-berlin 10,
// pol-danzig 4, pol-warsaw 8 → world 36, POL start 12, GER start 14.

import { describe, expect, it } from 'vitest';
import {
  VERDICT_DEFEAT_MIN,
  VERDICT_SURVIVAL_MIN,
  VERDICT_TRIUMPH_MIN,
  VERDICT_VICTORY_MIN,
  checkGameOver,
  exileFlag,
  scoreObjectives,
  verdictFor,
} from '../src/engine/victory';
import { FINAL_TURN } from '../src/engine/balance';
import type { GameState } from '../src/engine/types';
import { frozenTestState } from './fixtures';

describe('verdictFor tier boundaries', () => {
  it('grades each tier at its inclusive minimum and one point below', () => {
    expect(verdictFor(VERDICT_TRIUMPH_MIN)).toBe('Triumph');
    expect(verdictFor(VERDICT_TRIUMPH_MIN - 1)).toBe('Victory');
    expect(verdictFor(VERDICT_VICTORY_MIN)).toBe('Victory');
    expect(verdictFor(VERDICT_VICTORY_MIN - 1)).toBe('Survival');
    expect(verdictFor(VERDICT_SURVIVAL_MIN)).toBe('Survival');
    expect(verdictFor(VERDICT_SURVIVAL_MIN - 1)).toBe('Defeat');
    expect(verdictFor(VERDICT_DEFEAT_MIN)).toBe('Defeat');
    expect(verdictFor(VERDICT_DEFEAT_MIN - 1)).toBe('Catastrophe');
  });

  it('tiers are ordered', () => {
    expect(VERDICT_TRIUMPH_MIN).toBeGreaterThan(VERDICT_VICTORY_MIN);
    expect(VERDICT_VICTORY_MIN).toBeGreaterThan(VERDICT_SURVIVAL_MIN);
    expect(VERDICT_SURVIVAL_MIN).toBeGreaterThan(VERDICT_DEFEAT_MIN);
  });
});

describe('scoreObjectives', () => {
  it('sums satisfied objective points with a zero VP swing at the start', () => {
    // POL: repel 30 + Danzig 25 + survives 20 = 75; VP share unchanged.
    expect(scoreObjectives(frozenTestState(), 'POL')).toEqual({ score: 75, verdict: 'Victory' });
  });

  it('scores another nation on the same state', () => {
    // GER: only "the Reich endures" (10) passes on the untouched fixture.
    expect(scoreObjectives(frozenTestState(), 'GER')).toEqual({ score: 10, verdict: 'Defeat' });
  });

  it('adds the VP share swing in percentage points', () => {
    const state = frozenTestState((s) => {
      s.regions['fra-paris'] = { owner: 'FRA', controller: 'GER', entrenchment: 0 };
    });
    // GER: master of Europe 40 + Reich endures 10 = 50 points.
    // VP: held 24 vs start 14 over world 36 → +27.78 → round(77.78) = 78.
    expect(scoreObjectives(state, 'GER')).toEqual({ score: 78, verdict: 'Victory' });
  });

  it('losses score negative swings down to Catastrophe', () => {
    const state = frozenTestState((s) => {
      s.nations.POL.alive = false;
      s.regions['pol-danzig'] = { owner: 'GER', controller: 'GER', entrenchment: 0 };
      s.regions['pol-warsaw'] = { owner: 'GER', controller: 'GER', entrenchment: 0 };
    });
    // No objectives pass; VP swing (0 - 12) / 36 x 100 = -33.33 → -33.
    expect(scoreObjectives(state, 'POL')).toEqual({ score: -33, verdict: 'Catastrophe' });
  });
});

describe('checkGameOver', () => {
  it('returns the state untouched while the game is live', () => {
    const state = frozenTestState();
    expect(checkGameOver(state)).toBe(state);
  });

  it('ends the game at the final turn with score and verdict, epilogue empty', () => {
    const out = checkGameOver(frozenTestState((s) => { s.turn = FINAL_TURN; }));
    expect(out.gameOver).toEqual({ verdict: 'Victory', score: 75, epilogue: '' });
  });

  it('does not end one turn before the final turn', () => {
    const state = frozenTestState((s) => { s.turn = FINAL_TURN - 1; });
    expect(checkGameOver(state)).toBe(state);
  });

  it('ends when the player nation dies without exile', () => {
    const out = checkGameOver(
      frozenTestState((s) => {
        s.nations.POL.alive = false;
        s.regions['pol-danzig'] = { owner: 'GER', controller: 'GER', entrenchment: 0 };
        s.regions['pol-warsaw'] = { owner: 'GER', controller: 'GER', entrenchment: 0 };
      }),
    );
    expect(out.gameOver).toEqual({ verdict: 'Catastrophe', score: -33, epilogue: '' });
  });

  it('a government in exile keeps the game alive', () => {
    const state = frozenTestState((s) => {
      s.nations.POL.alive = false;
      s.flags[exileFlag('POL')] = true;
    });
    expect(checkGameOver(state)).toBe(state);
  });

  it('ends on total victory when no hostile major lives', () => {
    const out = checkGameOver(
      frozenTestState((s) => {
        s.playerNation = 'GER'; // axis
        s.nations.FRA.alive = false; // the only hostile major in the fixture
        s.regions['fra-paris'] = { owner: 'FRA', controller: 'GER', entrenchment: 0 };
      }),
    );
    expect(out.gameOver).toEqual({ verdict: 'Victory', score: 78, epilogue: '' });
  });

  it('no total victory while a hostile-faction major lives', () => {
    const state = frozenTestState((s) => { s.playerNation = 'GER'; }); // FRA (allies) alive
    expect(checkGameOver(state)).toBe(state);
  });

  it('a major at war with the player blocks total victory regardless of faction', () => {
    const state = frozenTestState((s) => {
      s.playerNation = 'GER';
      s.nations.FRA.faction = 'neutral';
      s.wars.push({ id: 'w', attackers: ['FRA'], defenders: ['GER'], startTurn: 0 });
    });
    expect(checkGameOver(state)).toBe(state);
  });

  it('neutral-faction players never win by total victory', () => {
    const state = frozenTestState((s) => {
      s.nations.GER.alive = false;
      s.nations.FRA.alive = false; // no major left at all, but POL is neutral
    });
    expect(checkGameOver(state)).toBe(state);
  });

  it('fills the score of an endGame verdict without overwriting it', () => {
    const out = checkGameOver(
      frozenTestState((s) => {
        s.gameOver = { verdict: 'Armistice', score: 0, epilogue: '' };
      }),
    );
    expect(out.gameOver).toEqual({ verdict: 'Armistice', score: 75, epilogue: '' });
  });

  it('computes a verdict for an endGame effect that left it blank', () => {
    const out = checkGameOver(
      frozenTestState((s) => {
        s.gameOver = { verdict: '', score: 0, epilogue: '' };
      }),
    );
    expect(out.gameOver).toEqual({ verdict: 'Victory', score: 75, epilogue: '' });
  });

  it('is idempotent once the game is over', () => {
    const once = checkGameOver(frozenTestState((s) => { s.turn = FINAL_TURN; }));
    const twice = checkGameOver(once);
    expect(twice).toBe(once);
  });

  it('never mutates the input state', () => {
    const input = frozenTestState((s) => { s.turn = FINAL_TURN; }); // frozen: writes throw
    const out = checkGameOver(input);
    expect(out).not.toBe(input);
    expect(input.gameOver).toBeNull();
  });
});
