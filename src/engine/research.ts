// Tech progression. Each turn a nation's chosen track gains progress from a
// base rate plus civilian-allocated industry; at 100 the track levels up and
// progress resets. The secret track is gated behind industrial maturity and
// its final level arms the bomb. Pure: never mutates the input state.

import type { GameState, Nation, NationId, Report, Rng } from './types';
import { TECH_INFO } from '../data/techs';
import { RESEARCH_BASE, RESEARCH_IC_RATE, SECRET_REQUIRES_INDUSTRY, TECH_MAX } from './balance';

// Progress runs 0-100 per the type contract; a scale definition, not a tunable.
const PROGRESS_DONE = 100;

/** Set when a nation completes secret level 5. Event content keys off this. */
export const atomicFlag = (nation: NationId): string => `ATOMIC_${nation}`;

export function runResearch(state: GameState, _rng: Rng): GameState {
  const nations: Record<NationId, Nation> = { ...state.nations };
  let flags = state.flags;
  const reports: Report[] = [];

  for (const id of Object.keys(state.nations)) {
    const n = state.nations[id];
    const track = n.research.track;
    if (!n.alive || track === null) continue;
    if (n.tech[track] >= TECH_MAX) continue; // nothing left to learn on this track
    if (track === 'secret' && n.tech.industry < SECRET_REQUIRES_INDUSTRY) continue; // industrial gate

    const progress = n.research.progress + RESEARCH_BASE + n.ic * n.icAllocation.civilian * RESEARCH_IC_RATE;
    if (progress < PROGRESS_DONE) {
      nations[id] = { ...n, research: { track, progress } };
      continue;
    }

    const level = Math.min(TECH_MAX, n.tech[track] + 1);
    nations[id] = {
      ...n,
      tech: { ...n.tech, [track]: level },
      research: { track, progress: 0 },
    };
    if (track === 'secret' && level === TECH_MAX) {
      flags = { ...flags, [atomicFlag(id)]: true };
    }
    if (id === state.playerNation) {
      const info = TECH_INFO[track];
      reports.push({
        kind: 'research',
        title: `${info.name}: ${info.levels[level - 1]}`,
        body: `Our research bureaus report a breakthrough. ${info.name} advances to level ${level} — ${info.levels[level - 1]}.`,
        turn: state.turn,
      });
    }
  }

  return {
    ...state,
    nations,
    flags,
    reports: reports.length > 0 ? [...state.reports, ...reports] : state.reports,
  };
}
