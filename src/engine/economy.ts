// Economy: supply, ic recompute, resource income/consumption, and production.
// Runs once per turn for every living nation. Pure: returns a new GameState
// and never mutates the input. Static region geometry comes from src/data;
// every tunable comes from balance.ts.
//
// Flag conventions shared with combat.ts / politics.ts / turn.ts (leading
// underscore = transient; turn.ts clears them at the start of each resolution):
//   _blockade_{id}  read here; combat's naval phase sets it to the numeric
//                   factor applied to this nation's resource income
//                   (missing → no blockade, i.e. factor 1).
//   _nooil_{id}     set here when the oil stockpile bottoms out; combat
//                   consumes it for the effective-equipment and air penalties.
//   _nofood_{id}    set here when food bottoms out. The stability drain is
//                   applied here (the plan lists it under economy); the flag
//                   is for politics/event hooks, which must not re-apply it.

import type { GameState, Nation, NationId, RegionId, Report, Rng } from './types';
import { REGIONS } from '../data/regions';
import { icModFlag } from './effects';
import {
  AIRNAVY_OIL_DIVISOR,
  BLOCKADE_RESOURCE_FACTOR,
  CIVILIAN_STABILITY_GAIN,
  CIVILIAN_STABILITY_THRESHOLD,
  FOOD_PER_ARMY,
  NO_FOOD_STABILITY_DRAIN,
  OIL_PER_ARMY,
  PROD_AIRNAVY_RATE,
  PROD_EQUIPMENT_RATE,
  PROD_STRENGTH_RATE,
  STABILITY_IC_BASE,
  STOCKPILE_MAX,
  UNSUPPLIED_FACTOR,
} from './balance';

// Scale definitions from the type contract (0-100 percentages, 0-1000 points),
// not balance knobs.
const PCT_SCALE = 100;
const PCT_MIN = 0;
const PCT_MAX = 100;
const NAVY_AIR_MIN = 0;
const NAVY_AIR_MAX = 1000;
const STOCKPILE_MIN = 0;

export const noOilFlag = (nation: NationId): string => `_nooil_${nation}`;
export const noFoodFlag = (nation: NationId): string => `_nofood_${nation}`;
export const blockadeFlag = (nation: NationId): string => `_blockade_${nation}`;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * A region whose controller is `controller` is traversable/usable for
 * `nation`'s supply when the controller is: the nation itself, either side of
 * a puppet relationship, a same-(non-neutral)-faction ally, or a war ally
 * (same side in any current war).
 */
function isFriendlyController(state: GameState, nation: NationId, controller: NationId): boolean {
  if (controller === nation) return true;
  const c = state.nations[controller];
  const n = state.nations[nation];
  if (!c || !n) return false;
  if (c.puppetOf === nation || n.puppetOf === controller) return true;
  if (c.faction !== 'neutral' && c.faction === n.faction) return true;
  return state.wars.some(
    (w) =>
      (w.attackers.includes(nation) && w.attackers.includes(controller)) ||
      (w.defenders.includes(nation) && w.defenders.includes(controller)),
  );
}

/** BFS from the capital through friendly-controlled regions. */
function suppliedSet(state: GameState, nation: NationId): Set<RegionId> {
  const supplied = new Set<RegionId>();
  const n = state.nations[nation];
  if (!n) return supplied;
  const capState = state.regions[n.capital];
  if (!capState || !isFriendlyController(state, nation, capState.controller)) return supplied;
  supplied.add(n.capital);
  const queue: RegionId[] = [n.capital];
  while (queue.length > 0) {
    const cur = queue.shift() as RegionId;
    const geo = REGIONS[cur];
    if (!geo) continue;
    for (const adj of geo.adjacent) {
      if (supplied.has(adj)) continue;
      const rs = state.regions[adj];
      if (!rs || !isFriendlyController(state, nation, rs.controller)) continue;
      supplied.add(adj);
      queue.push(adj);
    }
  }
  return supplied;
}

/** Is this region connected to the nation's capital through friendly territory? */
export function isSupplied(state: GameState, nation: NationId, region: RegionId): boolean {
  return suppliedSet(state, nation).has(region);
}

/** 1.0 when connected, UNSUPPLIED_FACTOR when cut off. Combat consumes this. */
export function supplyFactor(state: GameState, nation: NationId, region: RegionId): number {
  return isSupplied(state, nation, region) ? 1 : UNSUPPLIED_FACTOR;
}

/**
 * nation.ic = Σ connected controlled region ic × stabilityFactor, plus the
 * permanent modifier accumulated by { t: 'ic' } effects (icModFlag), floored
 * at 0. stabilityFactor = STABILITY_IC_BASE + (stability/100)×(1 −
 * STABILITY_IC_BASE) — i.e. 0.5 + stability/200 with the default base.
 * Disconnected regions contribute no ic (plan: "Region ic counts only if
 * connected"). Also used by setup.ts for turn-0 values.
 */
export function computeIc(state: GameState, nation: NationId): number {
  const n = state.nations[nation];
  if (!n) return 0;
  const supplied = suppliedSet(state, nation);
  let sum = 0;
  for (const [rid, rs] of Object.entries(state.regions)) {
    if (rs.controller !== nation || !supplied.has(rid)) continue;
    sum += REGIONS[rid]?.ic ?? 0;
  }
  const stabilityFactor = STABILITY_IC_BASE + (n.stability / PCT_SCALE) * (1 - STABILITY_IC_BASE);
  const modRaw = state.flags[icModFlag(nation)];
  const mod = typeof modRaw === 'number' ? modRaw : 0;
  return Math.max(0, sum * stabilityFactor + mod);
}

/**
 * Spread `pool` points across `levels`, neediest first (water-filling): the
 * lowest values are raised together until they meet the next tier or the cap.
 * Returns the new levels plus how many points were actually absorbed (points
 * beyond the cap are lost; the caller charges manpower only for `used`).
 */
function waterFill(levels: number[], pool: number, cap: number): { levels: number[]; used: number } {
  const out = [...levels];
  const total = Math.max(0, pool);
  let remaining = total;
  const EPS = 1e-9;
  while (remaining > EPS) {
    let min = Infinity;
    for (const v of out) if (v < min) min = v;
    if (min >= cap - EPS) break;
    const group: number[] = [];
    let next = cap;
    for (let i = 0; i < out.length; i++) {
      if (out[i] - min < EPS) group.push(i);
      else if (out[i] < next) next = out[i];
    }
    const target = Math.min(next, cap);
    const grant = Math.min((target - min) * group.length, remaining);
    const per = grant / group.length;
    for (const i of group) out[i] += per;
    remaining -= grant;
  }
  return { levels: out, used: total - remaining };
}

export function runEconomy(state: GameState, _rng: Rng): GameState {
  const nations: Record<NationId, Nation> = { ...state.nations };
  const flags = { ...state.flags };
  const reports: Report[] = [];

  for (const id of Object.keys(state.nations)) {
    const n = state.nations[id];
    if (!n.alive) continue;

    const supplied = suppliedSet(state, id);

    // ---- ic recompute + raw resource income from controlled regions ----
    let icSum = 0;
    const income = { oil: 0, steel: 0, food: 0 };
    for (const [rid, rs] of Object.entries(state.regions)) {
      if (rs.controller !== id) continue;
      const geo = REGIONS[rid];
      if (!geo) continue;
      if (supplied.has(rid)) icSum += geo.ic;
      income.oil += geo.resources.oil;
      income.steel += geo.resources.steel;
      income.food += geo.resources.food;
    }
    const stabilityFactor = STABILITY_IC_BASE + (n.stability / PCT_SCALE) * (1 - STABILITY_IC_BASE);
    const modRaw = flags[icModFlag(id)];
    const icMod = typeof modRaw === 'number' ? modRaw : 0;
    const ic = Math.max(0, icSum * stabilityFactor + icMod);

    // ---- income (blockade-scaled) minus consumption ----
    const blockadeRaw = flags[blockadeFlag(id)];
    const blockade =
      typeof blockadeRaw === 'number' ? blockadeRaw : blockadeRaw === true ? BLOCKADE_RESOURCE_FACTOR : 1;
    const attackingArmies = n.armies.filter((a) => a.posture === 'allout' || a.posture === 'offensive').length;
    const oilUse = attackingArmies * OIL_PER_ARMY + (n.air + n.navy) / AIRNAVY_OIL_DIVISOR;
    const foodUse = n.armies.length * FOOD_PER_ARMY;
    const stockpile = {
      oil: clamp(n.stockpile.oil + income.oil * blockade - oilUse, STOCKPILE_MIN, STOCKPILE_MAX),
      steel: clamp(n.stockpile.steel + income.steel * blockade, STOCKPILE_MIN, STOCKPILE_MAX),
      food: clamp(n.stockpile.food + income.food * blockade - foodUse, STOCKPILE_MIN, STOCKPILE_MAX),
    };

    // ---- shortage flags (combat/politics/events consume) ----
    const noOil = stockpile.oil <= 0 && oilUse > 0;
    const noFood = stockpile.food <= 0 && foodUse > 0;
    if (noOil) flags[noOilFlag(id)] = true;
    if (noFood) flags[noFoodFlag(id)] = true;
    if (id === state.playerNation) {
      if (noOil) {
        reports.push({
          kind: 'domestic',
          title: 'Fuel reserves exhausted',
          body: `${n.name} has run dry of oil. Motorised formations fight at reduced effectiveness and the air arm is grounded for want of fuel.`,
          turn: state.turn,
        });
      }
      if (noFood) {
        reports.push({
          kind: 'domestic',
          title: 'Food shortage',
          body: `The granaries of ${n.name} are empty. Rationing tightens and public order deteriorates.`,
          turn: state.turn,
        });
      }
    }

    // ---- production (uses the freshly recomputed ic) ----
    let armies = n.armies;
    let manpower = n.manpower;
    const armyIc = ic * n.icAllocation.army;
    if (armies.length > 0) {
      const eq = waterFill(armies.map((a) => a.equipment), armyIc * PROD_EQUIPMENT_RATE, PCT_MAX);
      // Strength replenishment costs manpower 1:1, so manpower floors the pool.
      const st = waterFill(armies.map((a) => a.strength), Math.min(armyIc * PROD_STRENGTH_RATE, manpower), PCT_MAX);
      manpower = Math.max(0, manpower - st.used);
      armies = armies.map((a, i) => ({ ...a, equipment: eq.levels[i], strength: st.levels[i] }));
    }
    const air = clamp(n.air + ic * n.icAllocation.air * PROD_AIRNAVY_RATE, NAVY_AIR_MIN, NAVY_AIR_MAX);
    const navy = clamp(n.navy + ic * n.icAllocation.navy * PROD_AIRNAVY_RATE, NAVY_AIR_MIN, NAVY_AIR_MAX);
    let stability = n.stability;
    if (n.icAllocation.civilian >= CIVILIAN_STABILITY_THRESHOLD) stability += CIVILIAN_STABILITY_GAIN;
    if (noFood) stability -= NO_FOOD_STABILITY_DRAIN;
    stability = clamp(stability, PCT_MIN, PCT_MAX);

    nations[id] = { ...n, ic, stockpile, armies, manpower, air, navy, stability };
  }

  return {
    ...state,
    nations,
    flags,
    reports: reports.length > 0 ? [...state.reports, ...reports] : state.reports,
  };
}
