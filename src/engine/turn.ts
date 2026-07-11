// The turn pipeline: one resolveTurn call advances the world a month. All
// randomness for the whole resolution flows through a single Rng derived from
// (seed, turn) via turnRng, so the same save resolves identically every time.
//
// Order (per the implementation plan): clear transient flags → apply army
// redeployment arrivals → AI → combat → (war-dead tally, entrenchment growth)
// → economy → research → covert → politics → diplomacy drift → events →
// successions → chronicle → report pruning → game-over check (+ epilogue) →
// turn + 1.
//
// Flag conventions owned or consumed here:
//   '_'-prefixed flags are transient and cleared at the start of every
//   resolution — EXCEPT '_wardead_{id}', which the plan names as the
//   cumulative war-dead ledger; it survives the sweep (documented exception).
//   '_lost_{id}'    regions lost this turn (combat writes, politics + the
//                   war-dead tally read).
//   '_capitulated_{id}'  politics writes, events consumes.
//   'LEADER_DEAD_{id}'   raised by the killLeader effect; the succession
//                   sweeps below consume it (see runSuccessionSweep).

import type { Flags, GameState, NationId, Rng } from './types';
import { turnRng } from './rng';
import { runAI } from './ai';
import { runCombat } from './combat';
import { runEconomy } from './economy';
import { runResearch } from './research';
import { runCovert, succession } from './covert';
import { runPolitics } from './politics';
import { runDiplomacy } from './diplomacy';
import { autoResolvePendingChoices, runEvents } from './events';
import { runChronicle } from './chronicle';
import { checkGameOver } from './victory';
import { buildEpilogue } from './epilogue';
import { leaderDeadFlag } from './effects';
import { ENTRENCH_MAX } from './balance';
import { ALL_EVENTS } from '../data/events/index';

const TRANSIENT_PREFIX = '_';
const LOST_PREFIX = '_lost_';
const WAR_DEAD_PREFIX = '_wardead_';

/** Cumulative war dead per nation, in thousands. Persists across turns. */
export const warDeadFlag = (nation: NationId): string => `${WAR_DEAD_PREFIX}${nation}`;

// War-dead proxy: thousands of dead credited to a nation per region it lost
// this turn. Combat's real casualty numbers never leave combat.ts (which this
// task must not edit), so regions lost stand in as a rough measure — enough
// for the epilogue's reckoning, not a simulation input. A local named
// constant, not in balance.ts, so the Task 14 balance pass can lift it.
const WAR_DEAD_PER_REGION_LOST = 25;

// ---------------------------------------------------------------------------
// Pipeline helper steps (each pure: input state is never mutated).
// ---------------------------------------------------------------------------

/** Drop every transient ('_'-prefixed) flag except the war-dead ledger. */
function clearTransientFlags(state: GameState): GameState {
  const flags: Flags = {};
  let changed = false;
  for (const [key, value] of Object.entries(state.flags)) {
    if (key.startsWith(TRANSIENT_PREFIX) && !key.startsWith(WAR_DEAD_PREFIX)) {
      changed = true;
      continue;
    }
    flags[key] = value;
  }
  return changed ? { ...state, flags } : state;
}

/**
 * Redeploying armies arrive: location becomes moveTarget, moveTarget clears.
 * The type contract says "redeploy arrives next turn", and no engine module
 * implements the arrival, so the pipeline applies it here at the start of
 * resolution — an order set on turn T takes effect during turn T+1, before
 * the AI re-plans. A stale target pointing at a region missing from the state
 * is dropped without moving.
 */
function applyRedeployArrivals(state: GameState): GameState {
  let nations = state.nations;
  let changed = false;
  for (const [id, n] of Object.entries(state.nations)) {
    if (!n.armies.some((a) => a.moveTarget !== null)) continue;
    if (!changed) {
      nations = { ...state.nations };
      changed = true;
    }
    nations[id] = {
      ...n,
      armies: n.armies.map((a) => {
        if (a.moveTarget === null) return a;
        if (state.regions[a.moveTarget] === undefined) return { ...a, moveTarget: null };
        return { ...a, location: a.moveTarget, moveTarget: null };
      }),
    };
  }
  return changed ? { ...state, nations } : state;
}

/** Fold this turn's '_lost_{id}' counts into the permanent war-dead ledger. */
function accumulateWarDead(state: GameState): GameState {
  let flags = state.flags;
  let changed = false;
  for (const [key, value] of Object.entries(state.flags)) {
    if (!key.startsWith(LOST_PREFIX) || typeof value !== 'number' || value <= 0) continue;
    if (!changed) {
      flags = { ...state.flags };
      changed = true;
    }
    const ledger = warDeadFlag(key.slice(LOST_PREFIX.length));
    const current = flags[ledger];
    flags[ledger] = (typeof current === 'number' ? current : 0) + value * WAR_DEAD_PER_REGION_LOST;
  }
  return changed ? { ...state, flags } : state;
}

/**
 * Entrenchment grows +1 (to ENTRENCH_MAX) in every region whose controller
 * has at least one army standing there on 'hold' with no redeploy order. The
 * plan's entrenchment rule ("+1/turn on hold, reset on move/attack/capture")
 * has no owner among the existing modules — combat.ts implements only the
 * capture reset — so growth lives here in the pipeline.
 */
function growEntrenchment(state: GameState): GameState {
  const holding = new Set<string>();
  for (const n of Object.values(state.nations)) {
    if (!n.alive) continue;
    for (const a of n.armies) {
      if (a.posture === 'hold' && a.moveTarget === null) holding.add(`${n.id}|${a.location}`);
    }
  }
  if (holding.size === 0) return state;
  let regions = state.regions;
  let changed = false;
  for (const [rid, rs] of Object.entries(state.regions)) {
    if (rs.entrenchment >= ENTRENCH_MAX) continue;
    if (!holding.has(`${rs.controller}|${rid}`)) continue;
    if (!changed) {
      regions = { ...state.regions };
      changed = true;
    }
    regions[rid] = { ...rs, entrenchment: rs.entrenchment + 1 };
  }
  return changed ? { ...state, regions } : state;
}

/**
 * Consume LEADER_DEAD_{id} flags: run succession for every living nation so
 * flagged, then reset the flags to false.
 *
 * Why the reset: the killLeader effect only raises the flag ("triggers
 * succession in covert.ts"), and covert.succession itself re-raises it, so a
 * still-true flag is indistinguishable from a fresh death. The pipeline
 * therefore treats the flag as a one-turn signal: it sweeps (a) at the start
 * of resolution, catching killLeader effects the player triggered via
 * resolveChoice between turns; (b) right after runCovert, where covert
 * assassinations have already run their own succession synchronously, so the
 * flags are merely cleared (sweep=false); and (c) right after the events
 * phase, catching killLeader effects from event choices. Event content keys
 * off the permanent '{LEADER}_DEAD' flags (e.g. HITLER_DEAD), which
 * succession sets and nothing clears.
 */
function runSuccessionSweep(state: GameState, rng: Rng, sweep: boolean): GameState {
  let s = state;
  for (const id of Object.keys(state.nations).sort()) {
    if (s.flags[leaderDeadFlag(id)] !== true) continue;
    if (sweep && s.nations[id]?.alive === true) {
      s = succession(s, id, rng);
    }
    s = { ...s, flags: { ...s.flags, [leaderDeadFlag(id)]: false } };
  }
  return s;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function resolveTurn(
  state: GameState,
  opts?: { aiControlsPlayer?: boolean },
): GameState {
  if (state.gameOver !== null) return state; // the war is over; the ledger is closed
  const aiControlsPlayer = opts?.aiControlsPlayer ?? false;
  const rng = turnRng(state.seed, state.turn);

  let s = clearTransientFlags(state);
  s = runSuccessionSweep(s, rng, true); // deaths from player choices between turns
  s = applyRedeployArrivals(s);
  s = runAI(s, rng, { includePlayer: aiControlsPlayer });
  s = runCombat(s, rng);
  s = accumulateWarDead(s);
  s = growEntrenchment(s);
  s = runEconomy(s, rng);
  s = runResearch(s, rng);
  s = runCovert(s, rng);
  s = runSuccessionSweep(s, rng, false); // covert handled its own; clear the signals
  s = runPolitics(s, rng);
  s = runDiplomacy(s, rng);
  s = runEvents(s, rng, ALL_EVENTS);
  if (aiControlsPlayer) s = autoResolvePendingChoices(s, rng, ALL_EVENTS);
  s = runSuccessionSweep(s, rng, true); // deaths decreed by this turn's events
  s = runChronicle(s);

  // Report pruning: the player's inbox holds only this turn's dispatches.
  if (s.reports.some((r) => r.turn !== s.turn)) {
    s = { ...s, reports: s.reports.filter((r) => r.turn === s.turn) };
  }

  s = checkGameOver(s);
  if (s.gameOver !== null && s.gameOver.epilogue === '') {
    s = { ...s, gameOver: { ...s.gameOver, epilogue: buildEpilogue(s) } };
  }

  return { ...s, turn: s.turn + 1 };
}
