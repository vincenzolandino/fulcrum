// Iconic battles: detects when a catalog entry's trigger fires, tracks it as
// an ActiveIconicBattle for up to its maxDuration, and narrates each phase
// as a 'battle'-kind report the UI renders as a full-screen spotlight
// instead of an ordinary front dispatch. See src/data/iconicBattles.ts for
// the catalog and src/engine/combat.ts for how the intensity bonus and
// front-report suppression apply while a battle is active.
//
// Two entry points, both pure:
//   applyIconicBattleFlags — pipeline step BEFORE combat: stamps this turn's
//     intensity flag for every active battle's region.
//   runIconicBattles — pipeline step AFTER events: detects new triggers and
//     advances/resolves battles already in progress, using this turn's
//     combat outcome (already resolved earlier in the pipeline) to decide.
//
// Flag conventions (transient, '_'-prefixed, cleared by turn.ts each turn):
//   _iconicbattle_{region}      the active intensity multiplier for {region}
//                               this turn (combat.ts reads it, this module
//                               writes it before combat runs).
//   _iconicdmg_{region}_atk/def this turn's attacker/defender strength
//                               losses in {region} (combat.ts writes them
//                               only when the intensity flag is set; this
//                               module reads them back to narrate the phase).

import type { ActiveIconicBattle, GameState, IconicBattle, NationId, Rng } from './types';
import { evalCondition } from './conditions';
import { ICONIC_BATTLES } from '../data/iconicBattles';

export const iconicBattleFlag = (region: string): string => `_iconicbattle_${region}`;
export const iconicDamageFlag = (region: string, side: 'atk' | 'def'): string =>
  `_iconicdmg_${region}_${side}`;

const byId = new Map(ICONIC_BATTLES.map((b) => [b.id, b]));

/** Pipeline step before combat: stamp the intensity flag for every battle still active. */
export function applyIconicBattleFlags(state: GameState): GameState {
  if (state.activeBattles.length === 0) return state;
  const flags = { ...state.flags };
  let changed = false;
  for (const active of state.activeBattles) {
    const battle = byId.get(active.battleId);
    if (!battle) continue;
    flags[iconicBattleFlag(active.region)] = battle.intensityBonus;
    changed = true;
  }
  return changed ? { ...state, flags } : state;
}

function damageLine(state: GameState, region: string): string {
  const atk = state.flags[iconicDamageFlag(region, 'atk')];
  const def = state.flags[iconicDamageFlag(region, 'def')];
  if (typeof atk !== 'number' && typeof def !== 'number') return '';
  const atkStr = typeof atk === 'number' ? atk.toFixed(1) : '0.0';
  const defStr = typeof def === 'number' ? def.toFixed(1) : '0.0';
  return ` Losses this month: attacker ${atkStr}, defender ${defStr} strength.`;
}

function pushBattleReport(state: GameState, title: string, body: string): GameState {
  return { ...state, reports: [...state.reports, { kind: 'battle', title, body, turn: state.turn }] };
}

/** True once the region's controller belongs to the battle's attacking side. */
function attackerHasTaken(state: GameState, battle: IconicBattle): boolean {
  const controller = state.regions[battle.region]?.controller;
  return controller !== undefined && battle.attacker.includes(controller as NationId);
}

/**
 * Advance or resolve one already-active battle. Returns the new state and
 * the record to keep for next turn — null once the battle is resolved (won,
 * held, or timed out), so the caller drops it from activeBattles.
 */
function advanceOne(
  state: GameState,
  active: ActiveIconicBattle,
): { state: GameState; next: ActiveIconicBattle | null } {
  const battle = byId.get(active.battleId);
  if (!battle) return { state, next: null }; // unknown id — drop it defensively

  const resolve = (text: string): { state: GameState; next: ActiveIconicBattle | null } => {
    const s = pushBattleReport(state, battle.name, `${text}${damageLine(state, battle.region)}`);
    return {
      state: { ...s, chronicle: [...s.chronicle, { turn: s.turn, text, divergence: true }] },
      next: null,
    };
  };

  if (attackerHasTaken(state, battle)) return resolve(battle.resolutionText.attackerWins);

  const elapsed = state.turn - active.startTurn;
  if (elapsed >= battle.maxDuration - 1) return resolve(battle.resolutionText.timedOut);

  const nextPhase = Math.min(active.phase + 1, battle.phases.length - 1);
  const phase = battle.phases[nextPhase];
  const s = pushBattleReport(state, `${battle.name}: ${phase.name}`, `${phase.text}${damageLine(state, battle.region)}`);
  return { state: s, next: { ...active, phase: nextPhase } };
}

/** Pipeline step after events: advance battles in progress, then detect new ones. */
export function runIconicBattles(state: GameState, _rng: Rng): GameState {
  let s = state;

  const carriedOver: ActiveIconicBattle[] = [];
  for (const active of state.activeBattles) {
    const result = advanceOne(s, active);
    s = result.state;
    if (result.next !== null) carriedOver.push(result.next);
  }
  s = { ...s, activeBattles: carriedOver };

  for (const battle of ICONIC_BATTLES) {
    if (s.firedEvents.includes(battle.id)) continue;
    if (!evalCondition(battle.trigger, s, _rng)) continue;
    s = {
      ...s,
      firedEvents: [...s.firedEvents, battle.id],
      activeBattles: [...s.activeBattles, { battleId: battle.id, region: battle.region, phase: 0, startTurn: s.turn }],
    };
    const phase = battle.phases[0];
    s = pushBattleReport(s, `${battle.name}: ${phase.name}`, phase.text);
    s = { ...s, chronicle: [...s.chronicle, { turn: s.turn, text: `${battle.name} has begun.`, divergence: true }] };
  }

  return s;
}
