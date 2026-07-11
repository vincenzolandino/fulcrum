// Domestic drift: war support and stability per turn, hunger, and the
// capitulation check. Runs after combat has stamped its transient
// '_lost_{nation}' flags; turn.ts consumes the '_capitulated_{nation}' flags
// this module raises and clears both at the start of the next resolution.

import type { Flags, GameState, NationId, RegionId, Rng } from './types';
import { REGIONS } from '../data/regions';
import {
  CAPITULATION_STABILITY,
  CAPITULATION_VP_FACTOR,
  LOW_WS_STABILITY_DRAIN,
  LOW_WS_THRESHOLD,
  NO_FOOD_STABILITY_DRAIN,
  PEACE_STABILITY_GAIN,
  PEACE_WS_DRIFT,
  WAR_SUPPORT_DRAIN,
  WAR_SUPPORT_LOSING,
  WAR_SUPPORT_WINNING,
} from './balance';

// Transient flag-key conventions shared with combat.ts (writer of _lost_) and
// turn.ts (reader of _capitulated_, clearer of both).
/** combat.ts records regions lost per nation this turn under this key. */
export const lostRegionsFlag = (nation: NationId): string => `_lost_${nation}`;
/** runPolitics marks capitulation here; turn.ts queues the surrender event. */
export const capitulatedFlag = (nation: NationId): string => `_capitulated_${nation}`;

// Scale invariants of the type contract (0-100 percentages, their midpoint),
// not balance knobs.
const PCT_MIN = 0;
const PCT_MAX = 100;
const WS_NEUTRAL = 50; // peacetime war support drifts toward the midpoint

// "Losing badly" means at least this many regions lost in a single turn. The
// plan fixes it at 2 in prose; balance.ts names only the WAR_SUPPORT_LOSING
// penalty it gates, so the threshold lives here beside its only use.
const LOSING_BADLY_REGIONS = 2;

const clampPct = (v: number): number => Math.min(PCT_MAX, Math.max(PCT_MIN, v));

const vpOf = (rid: RegionId): number => REGIONS[rid]?.vp ?? 0;

const atWar = (s: GameState, id: NationId): boolean =>
  s.wars.some((w) => w.attackers.includes(id) || w.defenders.includes(id));

/** Net victory points captured: foreign VP held minus own core VP lost. */
function netCapturedVp(s: GameState, id: NationId): number {
  let net = 0;
  for (const [rid, rs] of Object.entries(s.regions)) {
    if (rs.controller === id && rs.owner !== id) net += vpOf(rid);
    else if (rs.owner === id && rs.controller !== id) net -= vpOf(rid);
  }
  return net;
}

/**
 * Per living nation, per turn:
 * - At war: warSupport -WAR_SUPPORT_DRAIN, +WAR_SUPPORT_WINNING when winning
 *   (positive net VP captured), WAR_SUPPORT_LOSING when losing badly
 *   ('_lost_{id}' >= LOSING_BADLY_REGIONS). If the updated warSupport is
 *   under LOW_WS_THRESHOLD, stability drains by LOW_WS_STABILITY_DRAIN.
 * - At peace: stability +PEACE_STABILITY_GAIN, warSupport drifts toward
 *   WS_NEUTRAL by PEACE_WS_DRIFT without overshooting.
 * - Empty food stockpile: stability -NO_FOOD_STABILITY_DRAIN.
 * - Capitulation: at war, capital held by someone else, AND (held core VP <
 *   CAPITULATION_VP_FACTOR x total core VP OR updated stability <
 *   CAPITULATION_STABILITY) → '_capitulated_{id}' = true. Core regions are
 *   those whose RegionState.owner is the nation.
 *
 * The rng parameter is part of the phase signature; drift is deterministic.
 */
export function runPolitics(state: GameState, _rng: Rng): GameState {
  const nations = { ...state.nations };
  let nationsChanged = false;
  const raisedFlags: Flags = {};

  for (const n of Object.values(state.nations)) {
    if (!n.alive) continue;

    let stability = n.stability;
    let warSupport = n.warSupport;
    const fighting = atWar(state, n.id);

    if (fighting) {
      let delta = -WAR_SUPPORT_DRAIN;
      if (netCapturedVp(state, n.id) > 0) delta += WAR_SUPPORT_WINNING;
      const lost = state.flags[lostRegionsFlag(n.id)];
      if (typeof lost === 'number' && lost >= LOSING_BADLY_REGIONS) delta += WAR_SUPPORT_LOSING;
      warSupport = clampPct(warSupport + delta);
      // Judged on this turn's updated mood: a home front that just slipped
      // under the threshold starts hurting immediately.
      if (warSupport < LOW_WS_THRESHOLD) stability -= LOW_WS_STABILITY_DRAIN;
    } else {
      stability += PEACE_STABILITY_GAIN;
      warSupport =
        warSupport > WS_NEUTRAL
          ? Math.max(WS_NEUTRAL, warSupport - PEACE_WS_DRIFT)
          : Math.min(WS_NEUTRAL, warSupport + PEACE_WS_DRIFT);
    }

    if (n.stockpile.food <= 0) stability -= NO_FOOD_STABILITY_DRAIN;
    stability = clampPct(stability);

    // Capitulation: capital in enemy hands and either the core is overrun or
    // the state is crumbling. Checked against this turn's updated stability.
    if (fighting) {
      const capital = state.regions[n.capital];
      if (capital !== undefined && capital.controller !== n.id) {
        let coreTotal = 0;
        let coreHeld = 0;
        for (const [rid, rs] of Object.entries(state.regions)) {
          if (rs.owner !== n.id) continue;
          const vp = vpOf(rid);
          coreTotal += vp;
          if (rs.controller === n.id) coreHeld += vp;
        }
        if (coreHeld < CAPITULATION_VP_FACTOR * coreTotal || stability < CAPITULATION_STABILITY) {
          raisedFlags[capitulatedFlag(n.id)] = true;
        }
      }
    }

    if (stability !== n.stability || warSupport !== n.warSupport) {
      nations[n.id] = { ...n, stability, warSupport };
      nationsChanged = true;
    }
  }

  const flagsChanged = Object.keys(raisedFlags).length > 0;
  if (!nationsChanged && !flagsChanged) return state;
  return {
    ...state,
    nations: nationsChanged ? nations : state.nations,
    flags: flagsChanged ? { ...state.flags, ...raisedFlags } : state.flags,
  };
}
