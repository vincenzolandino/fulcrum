// Chronicle tests: timeline data integrity, convergence vs divergence logging,
// and purity of runChronicle.

import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/engine/types';
import {
  CONVERGENCE_PREFIX,
  DIVERGENCE_PREFIX,
  runChronicle,
} from '../src/engine/chronicle';
import { HISTORY_TIMELINE } from '../src/data/historyTimeline';
import { buildInitialState } from '../src/engine/setup';
import { FINAL_TURN } from '../src/engine/balance';
import { deepFreeze } from './fixtures';

const ANSCHLUSS_TURN = 2; // March 1938
const HIROSHIMA_TURN = 91; // August 1945

const stateAtTurn = (turn: number): GameState => ({
  ...buildInitialState('POL', 7),
  turn,
});

describe('HISTORY_TIMELINE data integrity', () => {
  it('spans roughly 25+ milestones from the Anschluss to the war\'s end', () => {
    expect(HISTORY_TIMELINE.length).toBeGreaterThanOrEqual(25);
    const turns = HISTORY_TIMELINE.map((m) => m.turn);
    expect(Math.min(...turns)).toBe(ANSCHLUSS_TURN);
    expect(Math.max(...turns)).toBeGreaterThanOrEqual(HIROSHIMA_TURN);
  });

  it('keeps every milestone inside the campaign and gives each one text and a condition', () => {
    for (const m of HISTORY_TIMELINE) {
      expect(m.turn).toBeGreaterThanOrEqual(0);
      expect(m.turn).toBeLessThanOrEqual(FINAL_TURN);
      expect(m.text.length).toBeGreaterThan(10);
      expect(m.matches).toBeDefined();
      expect(typeof m.matches.t).toBe('string');
    }
  });

  it('is sorted by turn', () => {
    for (let i = 1; i < HISTORY_TIMELINE.length; i++) {
      expect(HISTORY_TIMELINE[i].turn).toBeGreaterThanOrEqual(HISTORY_TIMELINE[i - 1].turn);
    }
  });
});

describe('runChronicle', () => {
  it('logs a convergence when the game tracked history (Anschluss)', () => {
    const s = stateAtTurn(ANSCHLUSS_TURN);
    s.regions['aus-austria'] = { ...s.regions['aus-austria'], controller: 'GER' };
    const out = runChronicle(deepFreeze(s));
    expect(out.chronicle).toHaveLength(1);
    expect(out.chronicle[0].divergence).toBe(false);
    expect(out.chronicle[0].text.startsWith(CONVERGENCE_PREFIX)).toBe(true);
    expect(out.chronicle[0].turn).toBe(ANSCHLUSS_TURN);
  });

  it('logs a divergence when the game left the historical path', () => {
    // March 1938 with Austria still independent: history turned here.
    const out = runChronicle(deepFreeze(stateAtTurn(ANSCHLUSS_TURN)));
    expect(out.chronicle).toHaveLength(1);
    expect(out.chronicle[0].divergence).toBe(true);
    expect(out.chronicle[0].text.startsWith(DIVERGENCE_PREFIX)).toBe(true);
  });

  it('returns the state unchanged on turns without a milestone', () => {
    const s = deepFreeze(stateAtTurn(1));
    const out = runChronicle(s);
    expect(out).toBe(s);
  });

  it('logs every milestone dated to the same turn (September 1939)', () => {
    const september1939 = 20;
    const due = HISTORY_TIMELINE.filter((m) => m.turn === september1939);
    expect(due.length).toBeGreaterThanOrEqual(2); // invasion of Poland + Allied DoW
    const out = runChronicle(stateAtTurn(september1939));
    expect(out.chronicle).toHaveLength(due.length);
  });

  it('appends to an existing chronicle without touching prior entries', () => {
    const s = stateAtTurn(ANSCHLUSS_TURN);
    s.chronicle = [{ turn: 0, text: 'Prologue.', divergence: false }];
    const out = runChronicle(s);
    expect(out.chronicle[0]).toEqual({ turn: 0, text: 'Prologue.', divergence: false });
    expect(out.chronicle).toHaveLength(2);
  });
});
