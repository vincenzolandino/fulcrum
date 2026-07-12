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

  it('gives every milestone at least one otherwise branch, ending in an always catch-all', () => {
    for (const m of HISTORY_TIMELINE) {
      expect(m.otherwise.length).toBeGreaterThanOrEqual(1);
      for (const branch of m.otherwise) {
        expect(branch.text.length).toBeGreaterThan(10);
        // Every branch's text must describe THIS timeline, not restate the
        // real-history sentence it's standing in for.
        expect(branch.text).not.toBe(m.text);
      }
      expect(m.otherwise[m.otherwise.length - 1].when).toEqual({ t: 'always' });
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

  it('logs a divergence when the game left the historical path, describing what happened instead', () => {
    // March 1938 with Austria still independent: history turned here. The
    // milestone's own real-history sentence must never appear — only the
    // matched otherwise branch describing THIS timeline.
    const milestone = HISTORY_TIMELINE.find((m) => m.turn === ANSCHLUSS_TURN)!;
    const out = runChronicle(deepFreeze(stateAtTurn(ANSCHLUSS_TURN)));
    expect(out.chronicle).toHaveLength(1);
    expect(out.chronicle[0].divergence).toBe(true);
    expect(out.chronicle[0].text.startsWith(DIVERGENCE_PREFIX)).toBe(true);
    expect(out.chronicle[0].text).not.toContain(milestone.text);
    expect(out.chronicle[0].text).toContain(milestone.otherwise[milestone.otherwise.length - 1].text);
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
