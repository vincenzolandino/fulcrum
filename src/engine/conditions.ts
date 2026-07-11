// Condition DSL evaluator. Content files describe triggers as serializable
// Condition objects; this module interprets them against a GameState.
// Pure and read-only: the only side effect is consuming the rng for
// { t: 'random' } conditions.

import type { Condition, GameState, Nation, NationId, Rng } from './types';
import { totalPower } from './power';

// atLeast is inclusive, below is exclusive; an absent bound always passes.
const inRange = (v: number, atLeast?: number, below?: number): boolean =>
  (atLeast === undefined || v >= atLeast) && (below === undefined || v < below);

const nationOf = (state: GameState, id: NationId): Nation | undefined => state.nations[id];

export function evalCondition(c: Condition, state: GameState, rng: Rng): boolean {
  switch (c.t) {
    case 'always':
      return true;
    case 'never':
      return false;
    case 'and':
      return c.c.every((sub) => evalCondition(sub, state, rng));
    case 'or':
      return c.c.some((sub) => evalCondition(sub, state, rng));
    case 'not':
      return !evalCondition(c.c, state, rng);
    case 'flag': {
      const raw = state.flags[c.key];
      const want = c.is === undefined ? true : c.is;
      // An unset flag counts as false, so { is: false } matches never-set flags.
      return (raw === undefined ? false : raw) === want;
    }
    case 'turnAtLeast':
      return state.turn >= c.n;
    case 'turnBefore':
      return state.turn < c.n;
    case 'random':
      return rng.chance(c.p);
    case 'atWar': {
      const { a, b } = c;
      if (b !== undefined) {
        return state.wars.some(
          (w) =>
            (w.attackers.includes(a) && w.defenders.includes(b)) ||
            (w.defenders.includes(a) && w.attackers.includes(b)),
        );
      }
      return state.wars.some((w) => w.attackers.includes(a) || w.defenders.includes(a));
    }
    case 'alive':
      return nationOf(state, c.nation)?.alive === true;
    case 'isPlayer':
      return state.playerNation === c.nation;
    case 'faction':
      return nationOf(state, c.nation)?.faction === c.is;
    case 'controls':
      return state.regions[c.region]?.controller === c.nation;
    case 'leaderIs':
      return nationOf(state, c.nation)?.leader === c.leader;
    case 'relations':
      // Unknown pairs read as 0 (indifference).
      return inRange(nationOf(state, c.a)?.relations[c.b] ?? 0, c.atLeast, c.below);
    case 'stability': {
      const n = nationOf(state, c.nation);
      return n !== undefined && inRange(n.stability, c.atLeast, c.below);
    }
    case 'warSupport': {
      const n = nationOf(state, c.nation);
      return n !== undefined && inRange(n.warSupport, c.atLeast, c.below);
    }
    case 'strengthRatio': {
      const a = nationOf(state, c.a);
      const b = nationOf(state, c.b);
      if (!a || !b) return false;
      // Written multiplicatively so a powerless b never divides by zero.
      return totalPower(a) >= c.atLeast * totalPower(b);
    }
    case 'spyNetwork':
      return (nationOf(state, c.owner)?.spyNetworks[c.target] ?? 0) >= c.atLeast;
    case 'tech':
      return (nationOf(state, c.nation)?.tech[c.track] ?? 0) >= c.atLeast;
    case 'tension':
      return inRange(state.tension, c.atLeast, c.below);
    case 'eventFired':
      return state.firedEvents.includes(c.id);
    case 'eventNotFired':
      return !state.firedEvents.includes(c.id);
  }
}
