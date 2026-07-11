// Diplomatic drift and world-tension decay, run once per turn. Event-driven
// diplomacy (declarations of war, pacts, guarantees) lives in effects.ts;
// this module handles the slow ambient forces: factions pull together,
// clashing ideologies grind relations down, active wars freeze opposed pairs
// at the floor, and a world with no great power at war slowly exhales.

import type { GameState, Nation, NationId, Rng } from './types';
import {
  DRIFT_IDEOLOGY_CLASH,
  DRIFT_SAME_FACTION,
  DRIFT_WAR_ALLY,
  TENSION_DECAY,
} from './balance';

/** The great powers. A war involving any of them keeps world tension pinned. */
export const MAJORS: NationId[] = ['GER', 'FRA', 'UK', 'SOV', 'ITA', 'JAP', 'USA'];

// Data-range invariants from the type contract (relations -100..100,
// tension 0..100), not balance knobs.
const RELATION_MIN = -100;
const RELATION_MAX = 100;
const TENSION_MIN = 0;

const clampRelation = (v: number): number =>
  Math.min(RELATION_MAX, Math.max(RELATION_MIN, v));

const opposedInWar = (s: GameState, a: NationId, b: NationId): boolean =>
  s.wars.some(
    (w) =>
      (w.attackers.includes(a) && w.defenders.includes(b)) ||
      (w.attackers.includes(b) && w.defenders.includes(a)),
  );

const onSharedWarSide = (s: GameState, a: NationId, b: NationId): boolean =>
  s.wars.some(
    (w) =>
      (w.attackers.includes(a) && w.attackers.includes(b)) ||
      (w.defenders.includes(a) && w.defenders.includes(b)),
  );

const ideologyClash = (a: Nation, b: Nation): boolean =>
  (a.government === 'fascist' && b.government === 'democracy') ||
  (b.government === 'fascist' && a.government === 'democracy');

/**
 * Relation drift per pair of living nations, then tension decay.
 *
 * Per turn: same (non-neutral) faction +DRIFT_SAME_FACTION, fascist vs
 * democracy DRIFT_IDEOLOGY_CLASH, fighting on the same side of a war
 * +DRIFT_WAR_ALLY (contributions stack); pairs opposed in a war are locked at
 * -100. Tension decays by TENSION_DECAY when no war involves a major power —
 * a great power at war with anyone keeps the world on edge.
 *
 * The rng parameter is part of the phase signature; drift is deterministic.
 */
export function runDiplomacy(state: GameState, _rng: Rng): GameState {
  const alive = Object.values(state.nations).filter((n) => n.alive);

  // Collect relation rewrites, mirrored onto both sides of each pair.
  const changes: Record<NationId, Record<NationId, number>> = {};
  const setPair = (a: NationId, b: NationId, v: number): void => {
    (changes[a] ??= {})[b] = v;
    (changes[b] ??= {})[a] = v;
  };

  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const na = alive[i];
      const nb = alive[j];
      const cur = na.relations[nb.id] ?? 0;

      if (opposedInWar(state, na.id, nb.id)) {
        // Open war locks the pair at the floor.
        if (cur !== RELATION_MIN || (nb.relations[na.id] ?? 0) !== RELATION_MIN) {
          setPair(na.id, nb.id, RELATION_MIN);
        }
        continue;
      }

      let delta = 0;
      if (na.faction !== 'neutral' && na.faction === nb.faction) delta += DRIFT_SAME_FACTION;
      if (ideologyClash(na, nb)) delta += DRIFT_IDEOLOGY_CLASH;
      if (onSharedWarSide(state, na.id, nb.id)) delta += DRIFT_WAR_ALLY;

      if (delta !== 0) {
        const v = clampRelation(cur + delta);
        if (v !== cur || (nb.relations[na.id] ?? 0) !== v) setPair(na.id, nb.id, v);
      }
    }
  }

  let nations = state.nations;
  const changedIds = Object.keys(changes);
  if (changedIds.length > 0) {
    nations = { ...state.nations };
    for (const id of changedIds) {
      nations[id] = { ...nations[id], relations: { ...nations[id].relations, ...changes[id] } };
    }
  }

  const majorAtWar = state.wars.some(
    (w) =>
      w.attackers.some((n) => MAJORS.includes(n)) ||
      w.defenders.some((n) => MAJORS.includes(n)),
  );
  const tension = majorAtWar
    ? state.tension
    : Math.max(TENSION_MIN, state.tension - TENSION_DECAY);

  if (nations === state.nations && tension === state.tension) return state;
  return { ...state, nations, tension };
}
