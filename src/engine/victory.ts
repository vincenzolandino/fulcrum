// End-of-game detection and objective scoring. checkGameOver runs last in the
// turn pipeline; scoreObjectives grades a nation against its objectives.ts
// entries plus its victory-point share swing since 1938.

import type { GameState, NationId, Rng } from './types';
import { evalCondition } from './conditions';
import { FINAL_TURN } from './balance';
import { MAJORS } from './diplomacy';
import { OBJECTIVES } from '../data/objectives';
import { INITIAL_CONTROL, REGIONS } from '../data/regions';

// Verdict tiers. These are scoring presentation, not simulation balance, so
// they live here rather than in balance.ts. Each bound is an inclusive
// minimum score; anything under VERDICT_DEFEAT_MIN is a Catastrophe.
export const VERDICT_TRIUMPH_MIN = 90;
export const VERDICT_VICTORY_MIN = 55;
export const VERDICT_SURVIVAL_MIN = 25;
export const VERDICT_DEFEAT_MIN = 0;
/** VP share delta is scored in percentage points of the world's total VP. */
export const VP_SHARE_SCALE = 100;

/** A capitulated player nation survives in exile while this flag is truthy. */
export const exileFlag = (nation: NationId): string => `EXILE_${nation}`;

// Deterministic scoring rng: 'random' conditions read false, so grading the
// same final state always yields the same score.
const NEVER_RNG: Rng = {
  next: () => 0,
  pick<T>(arr: T[]): T {
    return arr[0];
  },
  chance: () => false,
  int: (lo: number, _hi: number) => lo,
};

export function verdictFor(score: number): string {
  if (score >= VERDICT_TRIUMPH_MIN) return 'Triumph';
  if (score >= VERDICT_VICTORY_MIN) return 'Victory';
  if (score >= VERDICT_SURVIVAL_MIN) return 'Survival';
  if (score >= VERDICT_DEFEAT_MIN) return 'Defeat';
  return 'Catastrophe';
}

/**
 * Score = Σ points of the nation's satisfied objectives + the swing in its
 * share of world victory points since the 1938 start (in percentage points,
 * over the regions present in this state), rounded to the nearest integer.
 */
export function scoreObjectives(
  state: GameState,
  nation: NationId,
): { score: number; verdict: string } {
  let points = 0;
  for (const o of OBJECTIVES) {
    if (o.nation === nation && evalCondition(o.check, state, NEVER_RNG)) points += o.points;
  }

  let worldVp = 0;
  let heldVp = 0;
  let startVp = 0;
  for (const [rid, rs] of Object.entries(state.regions)) {
    const vp = REGIONS[rid]?.vp ?? 0;
    worldVp += vp;
    if (rs.controller === nation) heldVp += vp;
    if ((INITIAL_CONTROL[rid] ?? rs.owner) === nation) startVp += vp;
  }
  const shareDelta = worldVp > 0 ? ((heldVp - startVp) / worldVp) * VP_SHARE_SCALE : 0;

  const score = Math.round(points + shareDelta);
  return { score, verdict: verdictFor(score) };
}

// A major is hostile to the player when it is directly opposed to the player
// in a war, or when both belong to (different) non-neutral factions.
function hostileMajorAlive(state: GameState): boolean {
  const player = state.nations[state.playerNation];
  if (!player) return false;
  return MAJORS.some((m) => {
    if (m === player.id) return false;
    const n = state.nations[m];
    if (!n || !n.alive) return false;
    if (player.faction !== 'neutral' && n.faction !== 'neutral' && n.faction !== player.faction) {
      return true;
    }
    return state.wars.some(
      (w) =>
        (w.attackers.includes(m) && w.defenders.includes(player.id)) ||
        (w.defenders.includes(m) && w.attackers.includes(player.id)),
    );
  });
}

/**
 * The game ends when: an endGame effect already set gameOver (its verdict
 * sticks; the score is filled in here), the final turn is reached, the player
 * nation is dead without the EXILE_{id} flag, or the player's faction is
 * totally victorious (no hostile major alive). Neutral-faction players have
 * no side to be victorious for, so they play to the final turn instead.
 *
 * The epilogue is intentionally left as an empty string: composing it needs
 * epilogue.ts, and turn.ts owns that step right after this check (which keeps
 * victory.ts free of the dependency).
 */
export function checkGameOver(state: GameState): GameState {
  if (state.gameOver !== null) {
    const { score, verdict } = scoreObjectives(state, state.playerNation);
    const finalVerdict = state.gameOver.verdict !== '' ? state.gameOver.verdict : verdict;
    if (state.gameOver.score === score && state.gameOver.verdict === finalVerdict) return state;
    return { ...state, gameOver: { ...state.gameOver, score, verdict: finalVerdict } };
  }

  const player = state.nations[state.playerNation];
  const playerDead =
    player === undefined || (!player.alive && !state.flags[exileFlag(state.playerNation)]);
  const finalTurn = state.turn >= FINAL_TURN;
  const totalVictory =
    player !== undefined &&
    player.alive &&
    player.faction !== 'neutral' &&
    !hostileMajorAlive(state);

  if (!playerDead && !finalTurn && !totalVictory) return state;

  const { score, verdict } = scoreObjectives(state, state.playerNation);
  return { ...state, gameOver: { verdict, score, epilogue: '' } };
}
