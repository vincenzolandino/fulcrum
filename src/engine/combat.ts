// Land battle resolution: battle discovery per war, attack/defense math,
// capture and retreat, casualties, the amphibious gate, and the per-war naval
// blockade check. Pure: never mutates the input state; every change happens on
// structural copies. All randomness flows through the injected Rng (one draw
// per resolved battle), and every tunable number comes from balance.ts.
//
// Cross-module flag conventions (transient "_"-prefixed flags are cleared by
// turn.ts at the start of each resolution):
//   _lost_{nation}     — regions lost by {nation} this turn (number)
//   _blockade_{nation} — {nation} is naval-blockaded this turn (boolean)
//   _nooil_{nation}    — set by economy.ts when the oil stockpile hit zero;
//                        combat reads it and degrades equipment/air.

import type {
  Army,
  GameState,
  Nation,
  NationId,
  RegionId,
  Rng,
  War,
} from './types';
import { REGIONS } from '../data/regions';
import { blockadeFlag, noOilFlag, supplyFactor } from './economy';
import {
  AIR_SUPERIORITY_MOD,
  AIR_SUPERIORITY_RATIO,
  ALLOUT_CASUALTY_MULT,
  AMPHIBIOUS_ATTACK_FACTOR,
  AMPHIBIOUS_NAVAL_RATIO,
  ATTACK_POSTURE_MOD,
  BLOCKADE_NAVAL_RATIO,
  CAPTURE_EXTRA_DEF_LOSS,
  CAPTURE_RATIO,
  CASUALTY_BASE,
  CASUALTY_MAX,
  CASUALTY_MIN,
  COMBAT_RNG_HI,
  COMBAT_RNG_LO,
  DEFENSE_POSTURE_MOD,
  ENTRENCH_BONUS,
  EQUIPMENT_LOSS_RATIO,
  EXPERIENCE_PER_BATTLE,
  GARRISON_POWER,
  NO_OIL_AIR_FACTOR,
  NO_OIL_EQUIPMENT_FACTOR,
  POWER_ARMOR_BONUS,
  POWER_ARMY_SCALE,
  POWER_DOCTRINE_BONUS,
  TERRAIN_DEFENSE_MOD,
} from './balance';

// ---------------------------------------------------------------------------
// Flag-key helpers (shared conventions; see header comment).
// ---------------------------------------------------------------------------

export const lostFlag = (nation: NationId): string => `_lost_${nation}`;
// Blockade and no-oil keys are owned by economy.ts; re-exported for callers
// that reason about combat outcomes.
export { blockadeFlag, noOilFlag };

// ---------------------------------------------------------------------------
// Sea edges. The map data lists strait/sea-lane pairs as normal adjacency and
// carries no per-edge type, so the crossings that count as amphibious are
// mirrored here from the annotated strait pairs in src/data/regions.ts. An
// attack across one of these edges is an amphibious assault: it needs faction
// naval superiority (AMPHIBIOUS_NAVAL_RATIO) and fights at
// AMPHIBIOUS_ATTACK_FACTOR.
// ---------------------------------------------------------------------------

const SEA_EDGE_PAIRS: [RegionId, RegionId][] = [
  ['uk-southeast', 'fra-north'], // Dover strait
  ['uk-southeast', 'bel-brussels'], // Dover strait
  ['uk-scotland', 'ire-dublin'], // North Channel
  ['fra-algeria', 'ita-sicily'], // Sicily-Tunis strait
  ['ita-south', 'ita-sicily'], // Messina strait
  ['jap-korea', 'jap-home'], // Tsushima strait
  ['jap-home', 'jap-tokyo'], // Inland Sea
  ['jap-tokyo', 'usa-hawaii'], // Pacific island chain
  ['jap-home', 'usa-philippines'], // Pacific island chain
  ['usa-philippines', 'ned-east-indies'],
  ['ned-east-indies', 'uk-malaya'],
  ['ned-east-indies', 'anz-sydney'],
  ['usa-west', 'usa-hawaii'],
];

const edgeKey = (a: RegionId, b: RegionId): string => (a < b ? `${a}|${b}` : `${b}|${a}`);
const SEA_EDGES: Set<string> = new Set(SEA_EDGE_PAIRS.map(([a, b]) => edgeKey(a, b)));

/** True when the adjacency between two regions is a sea crossing. */
export const isSeaEdge = (a: RegionId, b: RegionId): boolean => SEA_EDGES.has(edgeKey(a, b));

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

const isNoOil = (state: GameState, nation: NationId): boolean => !!state.flags[noOilFlag(nation)];

// Strength/equipment/navy/air live on 0-100 / 0-1000 point scales; this
// divisor normalizes them. A scale definition (see power.ts), not a tunable.
const SCALE = 100;

/**
 * Per-army term of landPower (power.ts), with the no-oil equipment penalty
 * applied when the owner ran dry this turn:
 * strength/100 × equipment/100 × (1 + armor·0.15 + doctrine·0.10) × 10.
 */
function armyPower(a: Army, n: Nation, noOil: boolean): number {
  const equipment = noOil ? a.equipment * NO_OIL_EQUIPMENT_FACTOR : a.equipment;
  const techMod = 1 + POWER_ARMOR_BONUS * n.tech.armor + POWER_DOCTRINE_BONUS * n.tech.doctrine;
  return (a.strength / SCALE) * (equipment / SCALE) * techMod * POWER_ARMY_SCALE;
}

const aliveMembers = (state: GameState, ids: NationId[]): NationId[] =>
  ids.filter((id) => state.nations[id]?.alive);

const sideNavy = (state: GameState, side: NationId[]): number =>
  side.reduce((sum, id) => sum + (state.nations[id]?.navy ?? 0), 0);

const sideAir = (state: GameState, side: NationId[]): number =>
  side.reduce((sum, id) => {
    const n = state.nations[id];
    if (!n) return sum;
    return sum + n.air * (isNoOil(state, id) ? NO_OIL_AIR_FACTOR : 1);
  }, 0);

// ---------------------------------------------------------------------------
// Battle discovery
// ---------------------------------------------------------------------------

interface Participant {
  nation: Nation;
  army: Army;
  /** Full contribution to the battle total (attack or defense side). */
  power: number;
}

/** Armies of `side` in regions adjacent to `regionId` with an attack posture. */
function adjacentAttackers(
  state: GameState,
  side: NationId[],
  regionId: RegionId,
): { nation: Nation; army: Army; sea: boolean }[] {
  const region = REGIONS[regionId];
  if (!region) return [];
  const adjacent = new Set(region.adjacent);
  const out: { nation: Nation; army: Army; sea: boolean }[] = [];
  for (const nid of side) {
    const nation = state.nations[nid];
    if (!nation) continue;
    for (const army of nation.armies) {
      if (!(army.posture in ATTACK_POSTURE_MOD)) continue;
      if (!adjacent.has(army.location)) continue;
      out.push({ nation, army, sea: isSeaEdge(army.location, regionId) });
    }
  }
  return out;
}

/** Enemy-controlled regions adjacent to attack-postured armies, sorted by id. */
function discoverBattles(state: GameState, att: NationId[], def: NationId[]): RegionId[] {
  const out: RegionId[] = [];
  for (const regionId of Object.keys(state.regions).sort()) {
    if (!REGIONS[regionId]) continue;
    const controller = state.regions[regionId].controller;
    let hostile: NationId[] | null = null;
    if (att.includes(controller)) hostile = def;
    else if (def.includes(controller)) hostile = att;
    if (!hostile) continue;
    if (adjacentAttackers(state, hostile, regionId).length > 0) out.push(regionId);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Blockade: per war, compare side navy totals; at ratio ≥ BLOCKADE_NAVAL_RATIO
// every member of the weaker side is flagged. economy.ts consumes the flag.
// ---------------------------------------------------------------------------

function applyBlockade(work: GameState, att: NationId[], def: NationId[]): void {
  const navyAtt = sideNavy(work, att);
  const navyDef = sideNavy(work, def);
  if (navyAtt > 0 && navyAtt >= BLOCKADE_NAVAL_RATIO * navyDef) {
    for (const id of def) work.flags[blockadeFlag(id)] = true;
  } else if (navyDef > 0 && navyDef >= BLOCKADE_NAVAL_RATIO * navyAtt) {
    for (const id of att) work.flags[blockadeFlag(id)] = true;
  }
}

// ---------------------------------------------------------------------------
// Battle resolution
// ---------------------------------------------------------------------------

/** Strength/equipment casualties plus the battle's experience tick. */
function applyLosses(army: Army, loss: number): void {
  army.strength = Math.max(0, army.strength - loss);
  army.equipment = Math.max(0, army.equipment - loss * EQUIPMENT_LOSS_RATIO);
  army.experience = Math.min(100, army.experience + EXPERIENCE_PER_BATTLE);
}

/**
 * Retreat to the adjacent region controlled by the defending side with the
 * fewest adjacent enemy-controlled regions; ties break by region id. With no
 * candidate the army is destroyed (marked at strength 0; swept by the caller).
 */
function retreatArmy(
  work: GameState,
  army: Army,
  from: RegionId,
  atkSide: NationId[],
  defSide: NationId[],
): void {
  const candidates = (REGIONS[from]?.adjacent ?? []).filter((rid) => {
    const rs = work.regions[rid];
    return rs !== undefined && REGIONS[rid] !== undefined && defSide.includes(rs.controller);
  });
  if (candidates.length === 0) {
    army.strength = 0; // nowhere to go — the formation disintegrates
    return;
  }
  const enemyCount = (rid: RegionId): number =>
    REGIONS[rid].adjacent.reduce((n, nb) => {
      const rs = work.regions[nb];
      return n + (rs !== undefined && atkSide.includes(rs.controller) ? 1 : 0);
    }, 0);
  candidates.sort((a, b) => enemyCount(a) - enemyCount(b) || (a < b ? -1 : 1));
  army.location = candidates[0];
}

function resolveBattle(work: GameState, war: War, regionId: RegionId, rng: Rng): void {
  const rs = work.regions[regionId];
  const region = REGIONS[regionId];
  if (!rs || !region) return;

  // Re-derive the sides from the current controller: an earlier battle this
  // turn may already have flipped the region.
  const att = aliveMembers(work, war.attackers);
  const def = aliveMembers(work, war.defenders);
  let atkSide: NationId[];
  let defSide: NationId[];
  if (att.includes(rs.controller)) {
    atkSide = def;
    defSide = att;
  } else if (def.includes(rs.controller)) {
    atkSide = att;
    defSide = def;
  } else {
    return; // stale battle — the region changed hands
  }
  const controller = rs.controller;

  // Air modifier: side air totals in this war; superiority ≥ ratio → ±mod.
  const airAtk = sideAir(work, atkSide);
  const airDef = sideAir(work, defSide);
  let atkAirMod = 1;
  let defAirMod = 1;
  if (airAtk > 0 && airAtk >= AIR_SUPERIORITY_RATIO * airDef) {
    atkAirMod = 1 + AIR_SUPERIORITY_MOD;
    defAirMod = 1 - AIR_SUPERIORITY_MOD;
  } else if (airDef > 0 && airDef >= AIR_SUPERIORITY_RATIO * airAtk) {
    atkAirMod = 1 - AIR_SUPERIORITY_MOD;
    defAirMod = 1 + AIR_SUPERIORITY_MOD;
  }

  // Amphibious gate: sea crossings need side naval superiority.
  const navyAtk = sideNavy(work, atkSide);
  const navyDef = sideNavy(work, defSide);
  const amphibiousAllowed = navyAtk > 0 && navyAtk >= AMPHIBIOUS_NAVAL_RATIO * navyDef;

  // Attacker contributions.
  const attackers: Participant[] = [];
  for (const { nation, army, sea } of adjacentAttackers(work, atkSide, regionId)) {
    if (sea && !amphibiousAllowed) continue;
    let power =
      armyPower(army, nation, isNoOil(work, nation.id)) *
      ATTACK_POSTURE_MOD[army.posture] *
      supplyFactor(work, nation.id, army.location) *
      atkAirMod;
    if (sea) power *= AMPHIBIOUS_ATTACK_FACTOR;
    attackers.push({ nation, army, power });
  }
  if (attackers.length === 0) return; // e.g. a pure amphibious attempt without the navy
  const attack = attackers.reduce((s, p) => s + p.power, 0);

  // Defender contributions: defending-side armies stationed in the region.
  const defenders: Participant[] = [];
  for (const nid of defSide) {
    const nation = work.nations[nid];
    for (const army of nation.armies) {
      if (army.location !== regionId) continue;
      const mod = army.posture in DEFENSE_POSTURE_MOD ? DEFENSE_POSTURE_MOD[army.posture] : 1;
      defenders.push({ nation, army, power: armyPower(army, nation, isNoOil(work, nid)) * mod });
    }
  }
  const terrainMod = region.terrain in TERRAIN_DEFENSE_MOD ? TERRAIN_DEFENSE_MOD[region.terrain] : 1;
  const defense =
    (defenders.reduce((s, p) => s + p.power, 0) + GARRISON_POWER) *
    terrainMod *
    (1 + rs.entrenchment * ENTRENCH_BONUS) *
    supplyFactor(work, controller, regionId) *
    defAirMod;

  // One rng draw per resolved battle, mapped onto the combat band.
  const roll = COMBAT_RNG_LO + rng.next() * (COMBAT_RNG_HI - COMBAT_RNG_LO);
  const effRatio = (attack / defense) * roll;
  const captured = effRatio >= CAPTURE_RATIO;

  const defLoss = clamp(CASUALTY_BASE * effRatio, CASUALTY_MIN, CASUALTY_MAX)
    + (captured ? CAPTURE_EXTRA_DEF_LOSS : 0);
  const atkLoss = clamp(CASUALTY_BASE / effRatio, CASUALTY_MIN, CASUALTY_MAX);

  // Attacker casualties, spread proportionally to contribution; allout armies
  // take double their share.
  let atkLossTotal = 0;
  for (const p of attackers) {
    const share = attack > 0 ? p.power / attack : 1 / attackers.length;
    const loss = atkLoss * share * (p.army.posture === 'allout' ? ALLOUT_CASUALTY_MULT : 1);
    applyLosses(p.army, loss);
    atkLossTotal += loss;
  }

  // Defender casualties, spread proportionally to contribution.
  const defPowerTotal = defenders.reduce((s, p) => s + p.power, 0);
  let defLossTotal = 0;
  for (const p of defenders) {
    const share = defPowerTotal > 0 ? p.power / defPowerTotal : 1 / defenders.length;
    applyLosses(p.army, defLoss * share);
    defLossTotal += defLoss * share;
  }

  if (captured) {
    // Controller flips to the strongest attacking nation (by contributed
    // power; ties break by nation id). Entrenchment resets on capture.
    const byNation = new Map<NationId, number>();
    for (const p of attackers) byNation.set(p.nation.id, (byNation.get(p.nation.id) ?? 0) + p.power);
    const winner = [...byNation.entries()].sort(
      (a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1),
    )[0][0];
    rs.controller = winner;
    rs.entrenchment = 0;

    const key = lostFlag(controller);
    const prev = work.flags[key];
    work.flags[key] = (typeof prev === 'number' ? prev : 0) + 1;

    // Surviving defenders fall back.
    for (const p of defenders) {
      if (p.army.strength > 0) retreatArmy(work, p.army, regionId, atkSide, defSide);
    }
  }

  // Sweep destroyed formations (casualties or failed retreats).
  for (const p of [...attackers, ...defenders]) {
    if (p.army.strength <= 0) {
      p.nation.armies = p.nation.armies.filter((a) => a.id !== p.army.id);
    }
  }

  // Front report for battles involving the player.
  const player = work.playerNation;
  const playerInvolved =
    controller === player ||
    attackers.some((p) => p.nation.id === player) ||
    defenders.some((p) => p.nation.id === player);
  if (playerInvolved) {
    const atkNames = [...new Set(attackers.map((p) => p.nation.name))].sort().join(', ');
    const defName = work.nations[controller]?.name ?? controller;
    const outcome = captured
      ? `${region.name} has fallen to ${work.nations[rs.controller]?.name ?? rs.controller}.`
      : `The ${defName} defence held.`;
    work.reports.push({
      kind: 'front',
      title: `Battle of ${region.name}`,
      body:
        `${atkNames} attacked ${region.name}. ${outcome} ` +
        `Attacker losses ${atkLossTotal.toFixed(1)}, defender losses ${defLossTotal.toFixed(1)} strength.`,
      turn: work.turn,
    });
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Resolve one turn of combat: for every active war, the naval blockade check,
 * then every battle (enemy-controlled regions adjacent to attack-postured
 * hostile armies), in region-id order. Returns a new state.
 */
export function runCombat(state: GameState, rng: Rng): GameState {
  // Working copy: clone every container combat may touch. The input state and
  // everything it references stay untouched.
  const nations: Record<NationId, Nation> = {};
  for (const [id, n] of Object.entries(state.nations)) {
    nations[id] = { ...n, armies: n.armies.map((a) => ({ ...a })) };
  }
  const regions: typeof state.regions = {};
  for (const [id, r] of Object.entries(state.regions)) regions[id] = { ...r };
  const work: GameState = {
    ...state,
    nations,
    regions,
    flags: { ...state.flags },
    reports: [...state.reports],
  };

  for (const war of work.wars) {
    const att = aliveMembers(work, war.attackers);
    const def = aliveMembers(work, war.defenders);
    if (att.length === 0 || def.length === 0) continue;
    applyBlockade(work, att, def);
    for (const regionId of discoverBattles(work, att, def)) {
      resolveBattle(work, war, regionId, rng);
    }
  }
  return work;
}
