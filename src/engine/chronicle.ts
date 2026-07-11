// The Chronicle: divergence tracking against the real timeline. Each turn,
// every historyTimeline.ts milestone dated to this turn is tested against the
// game state: if the world tracked history the entry logs as a convergence
// ("As in our history: ..."), otherwise as a divergence ("Here history
// turned: ..."). Event effects with { t: 'chronicle' } log directly through
// effects.ts and do not pass through here.
//
// Pure and deterministic: milestone conditions are evaluated with a
// never-random rng (a { t: 'random' } condition in a milestone would make the
// historical record itself nondeterministic, so it always reads false).

import type { ChronicleEntry, GameState, Rng } from './types';
import { evalCondition } from './conditions';
import { HISTORY_TIMELINE } from '../data/historyTimeline';

const NEVER_RNG: Rng = {
  next: () => 0,
  pick<T>(arr: T[]): T {
    return arr[0];
  },
  chance: () => false,
  int: (lo: number, _hi: number) => lo,
};

export const CONVERGENCE_PREFIX = 'As in our history: ';
export const DIVERGENCE_PREFIX = 'Here history turned: in the world we knew, ';

export function runChronicle(state: GameState): GameState {
  const due = HISTORY_TIMELINE.filter((m) => m.turn === state.turn);
  if (due.length === 0) return state;

  const entries: ChronicleEntry[] = due.map((m) =>
    evalCondition(m.matches, state, NEVER_RNG)
      ? { turn: state.turn, text: `${CONVERGENCE_PREFIX}${m.text}`, divergence: false }
      : { turn: state.turn, text: `${DIVERGENCE_PREFIX}${m.text}`, divergence: true },
  );
  return { ...state, chronicle: [...state.chronicle, ...entries] };
}
