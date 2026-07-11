// AI for every non-player nation (and the player too, when the headless sim
// asks for it). Implements the plan's 7-step loop each turn, per nation:
//   1. postures per front from local power ratios
//   2. redeploy idle armies toward the nearest front (BFS), garrison capital
//   3. ambition-driven war declarations against claims (DoW threshold formula)
//   4. faction gravity for neutrals + democracy guarantees for threatened minors
//   5. production allocation + research priority by focus
//   6. covert network building for opportunist majors
//   7. peace feelers when losing badly
//
// Dead nations do nothing. Puppet nations act only defensively: they copy the
// master's faction, join the master's wars on the master's side, never launch
// wars/guarantees/covert ops of their own, and their front postures are capped
// at defensive stances (offensive/allout downgraded to hold).
//
// Pure: no mutation of the input state, all randomness through the Rng
// argument (declareWar and friends go through applyEffects so coalition
// joining stays in one place).

import type {
  Army,
  CovertMission,
  Effect,
  GameState,
  Nation,
  NationId,
  Posture,
  RegionId,
  Rng,
  TechTrack,
} from './types';
import { totalPower } from './power';
import { applyEffects } from './effects';
import { REGIONS } from '../data/regions';
import { MAJOR_IDS } from '../data/nations';
import {
  AI_ALLOCATION,
  AI_ALLOUT_AGGRESSION,
  AI_ALLOUT_RATIO,
  AI_DOW_BASE_THRESHOLD,
  AI_DOW_MIN_THRESHOLD,
  AI_DOW_OPPORTUNISM_FACTOR,
  AI_ELASTIC_RATIO,
  AI_FACTION_JOIN_RELATIONS,
  AI_FACTION_JOIN_TENSION,
  AI_OFFENSIVE_RATIO,
  AI_PEACE_WAR_SUPPORT,
  AI_SECRET_TENSION_GATE,
  DEMOCRACY_WAR_TENSION_GATE,
  GUARANTEE_TENSION_GATE,
  NETWORK_BUILD_TURNS,
  OP_NETWORK_REQUIREMENTS,
  POWER_ARMOR_BONUS,
  POWER_ARMY_SCALE,
  POWER_DOCTRINE_BONUS,
  SECRET_REQUIRES_INDUSTRY,
  TECH_MAX,
} from './balance';

// ---------------------------------------------------------------------------
// Local constants.
//
// The two decimals below are behavior thresholds the plan's AI spec hardcodes
// ("ideologyZeal > 0.7 fascists prefer claims on ideological enemies",
// "majors with opportunism > 0.5 build networks in rivals") but which have no
// entry in balance.ts yet. They live here as named constants so the Task 14
// balance pass can lift them into balance.ts without hunting magic numbers.
const FASCIST_ZEAL_CLAIM_PREFERENCE = 0.7;
const COVERT_OPPORTUNISM_GATE = 0.5;
// Nation ids allowed to chase the secret (atomic) track, per the plan spec.
const SECRET_CLUB: NationId[] = ['USA', 'UK', 'GER', 'SOV'];
// Direct-action missions resolve on the next covert tick; only buildNetwork
// has a plan-specified duration (NETWORK_BUILD_TURNS).
const OPERATION_TURNS = 1;
// Type-contract range invariants (0–100 scales), not balance knobs.
const PCT_SCALE = 100;
const NETWORK_MAX = 100;

// Research priorities by focus, per the plan: armor→air→doctrine for
// expansion; industry→doctrine→air for everyone else.
const RESEARCH_PRIORITY: Record<Nation['ai']['focus'], TechTrack[]> = {
  expansion: ['armor', 'air', 'doctrine'],
  defense: ['industry', 'doctrine', 'air'],
  consolidation: ['industry', 'doctrine', 'air'],
};
const FALLBACK_TRACKS: TechTrack[] = ['armor', 'air', 'naval', 'industry', 'doctrine'];

// ---------------------------------------------------------------------------
// Small pure helpers.

const withNation = (s: GameState, id: NationId, patch: Partial<Nation>): GameState => ({
  ...s,
  nations: { ...s.nations, [id]: { ...s.nations[id], ...patch } },
});

/**
 * Per-army contribution to landPower. power.ts only exports the nation-level
 * sum, so this mirrors its per-army term (same balance constants) for the
 * local front ratios.
 */
const armyPower = (a: Army, n: Nation): number =>
  (a.strength / PCT_SCALE) *
  (a.equipment / PCT_SCALE) *
  (1 + POWER_ARMOR_BONUS * n.tech.armor + POWER_DOCTRINE_BONUS * n.tech.doctrine) *
  POWER_ARMY_SCALE;

/** Every nation on the opposite side of any war involving `id`. */
function enemiesOf(s: GameState, id: NationId): Set<NationId> {
  const out = new Set<NationId>();
  for (const w of s.wars) {
    if (w.attackers.includes(id)) for (const d of w.defenders) out.add(d);
    if (w.defenders.includes(id)) for (const a of w.attackers) out.add(a);
  }
  out.delete(id);
  return out;
}

const atWarAny = (s: GameState, id: NationId): boolean =>
  s.wars.some((w) => w.attackers.includes(id) || w.defenders.includes(id));

/** Adjacent region ids that actually exist in this state's region map. */
const adjacentIn = (s: GameState, rid: RegionId): RegionId[] =>
  (REGIONS[rid]?.adjacent ?? []).filter((a) => s.regions[a] !== undefined);

/** True when some region controlled by `a` touches one controlled by `b`. */
function bordersEachOther(s: GameState, a: NationId, b: NationId): boolean {
  for (const [rid, rs] of Object.entries(s.regions)) {
    if (rs.controller !== a) continue;
    if (adjacentIn(s, rid).some((adj) => s.regions[adj].controller === b)) return true;
  }
  return false;
}

/**
 * BFS through own-controlled regions from `from` to the nearest region in
 * `targets`; returns the first step of a shortest path, or null when
 * unreachable. Neighbor expansion is sorted so results are deterministic.
 */
function nextStep(
  s: GameState,
  id: NationId,
  from: RegionId,
  targets: ReadonlySet<RegionId>,
): RegionId | null {
  if (targets.has(from)) return null;
  const parent = new Map<RegionId, RegionId | null>([[from, null]]);
  const queue: RegionId[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift() as RegionId;
    for (const nb of [...adjacentIn(s, cur)].sort()) {
      if (parent.has(nb)) continue;
      if (s.regions[nb].controller !== id) continue;
      parent.set(nb, cur);
      if (targets.has(nb)) {
        let step = nb;
        while (parent.get(step) !== from) step = parent.get(step) as RegionId;
        return step;
      }
      queue.push(nb);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Steps 1 + 2: front postures and redeployment.

function frontPosture(ratio: number, aggression: number, puppet: boolean): Posture {
  let p: Posture;
  if (ratio >= AI_ALLOUT_RATIO && aggression > AI_ALLOUT_AGGRESSION) p = 'allout';
  else if (ratio >= AI_OFFENSIVE_RATIO) p = 'offensive';
  else if (ratio <= AI_ELASTIC_RATIO) p = 'elastic';
  else p = 'hold';
  // Puppets act only defensively: no attacks on the master's behalf.
  if (puppet && (p === 'allout' || p === 'offensive')) p = 'hold';
  return p;
}

function updateMilitary(s: GameState, id: NationId): GameState {
  const n = s.nations[id];
  const enemies = enemiesOf(s, id);
  if (enemies.size === 0 || n.armies.length === 0) return s;

  // Power by location, own and hostile.
  const ownAt = new Map<RegionId, number>();
  for (const a of n.armies) ownAt.set(a.location, (ownAt.get(a.location) ?? 0) + armyPower(a, n));
  const enemyAt = new Map<RegionId, number>();
  for (const eid of enemies) {
    const en = s.nations[eid];
    if (!en?.alive) continue;
    for (const a of en.armies) {
      enemyAt.set(a.location, (enemyAt.get(a.location) ?? 0) + armyPower(a, en));
    }
  }

  // Front regions: ours, touching enemy-controlled ground.
  const fronts = new Set<RegionId>();
  for (const [rid, rs] of Object.entries(s.regions)) {
    if (rs.controller !== id) continue;
    if (adjacentIn(s, rid).some((adj) => enemies.has(s.regions[adj].controller))) fronts.add(rid);
  }

  // Step 1 — posture per front: local = armies in the region + adjacent own
  // armies, versus adjacent enemy armies. No adjacent enemies → open road.
  const posturePerFront = new Map<RegionId, Posture>();
  for (const rid of fronts) {
    const adj = adjacentIn(s, rid);
    const own = (ownAt.get(rid) ?? 0) + adj.reduce((sum, a) => sum + (ownAt.get(a) ?? 0), 0);
    const enemy = adj.reduce((sum, a) => sum + (enemyAt.get(a) ?? 0), 0);
    const ratio = enemy > 0 ? own / enemy : Number.POSITIVE_INFINITY;
    posturePerFront.set(rid, frontPosture(ratio, n.ai.aggression, n.puppetOf !== null));
  }

  // Step 2 — redeploy idle armies (not on a front, not already moving).
  const capital = n.capital;
  const tasked = new Map<string, RegionId>();
  if (fronts.size > 0) {
    const idle = n.armies.filter((a) => !fronts.has(a.location) && a.moveTarget === null);
    let atCapital = n.armies.filter((a) => a.location === capital).length;

    // Garrison rule: an empty own capital pulls the first idle army home.
    if (atCapital === 0 && s.regions[capital]?.controller === id && !fronts.has(capital)) {
      for (const a of idle) {
        const step = nextStep(s, id, a.location, new Set([capital]));
        if (step !== null) {
          tasked.set(a.id, step);
          break;
        }
      }
    }
    for (const a of idle) {
      if (tasked.has(a.id)) continue;
      // Garrison rule: never march the last army out of the capital.
      if (a.location === capital && atCapital <= 1) continue;
      const step = nextStep(s, id, a.location, fronts);
      if (step !== null) {
        tasked.set(a.id, step);
        if (a.location === capital) atCapital -= 1;
      }
    }
  }

  const armies = n.armies.map((a) => {
    const posture = posturePerFront.get(a.location);
    if (posture !== undefined) {
      // On a front: stand (cancel any stale redeploy) and take the posture.
      return a.posture === posture && a.moveTarget === null
        ? a
        : { ...a, posture, moveTarget: null };
    }
    const step = tasked.get(a.id);
    if (step !== undefined) return { ...a, posture: 'hold' as Posture, moveTarget: step };
    return a;
  });
  return withNation(s, id, { armies });
}

// ---------------------------------------------------------------------------
// Step 3: ambitions — declare war on claims when strong enough.

/** Defender + guarantors + alliance partners, alive and not the attacker. */
function defensePower(s: GameState, defender: Nation, attacker: NationId): number {
  const coalition = new Set<NationId>([defender.id]);
  for (const other of Object.values(s.nations)) {
    if (other.guarantees.includes(defender.id)) coalition.add(other.id);
  }
  for (const p of defender.pacts) {
    if (p.kind === 'alliance') coalition.add(p.with);
  }
  coalition.delete(attacker);
  let sum = 0;
  for (const cid of coalition) {
    const c = s.nations[cid];
    if (c?.alive) sum += totalPower(c);
  }
  return sum;
}

function orderedClaims(s: GameState, n: Nation): RegionId[] {
  if (n.government !== 'fascist' || n.ai.ideologyZeal <= FASCIST_ZEAL_CLAIM_PREFERENCE) {
    return n.claims;
  }
  // Zealous fascists go for the ideological enemies first.
  const isEnemyIdeology = (rid: RegionId): boolean => {
    const gov = s.nations[s.regions[rid]?.controller ?? '']?.government;
    return gov === 'democracy' || gov === 'communist';
  };
  return [...n.claims.filter(isEnemyIdeology), ...n.claims.filter((r) => !isEnemyIdeology(r))];
}

function runAmbitions(s: GameState, id: NationId, rng: Rng): GameState {
  const n = s.nations[id];
  if (n.claims.length === 0 || atWarAny(s, id)) return s;
  // Democracies won't start offensive wars while the world stays calm.
  if (n.government === 'democracy' && s.tension < DEMOCRACY_WAR_TENSION_GATE) return s;

  const threshold = Math.max(
    AI_DOW_MIN_THRESHOLD,
    AI_DOW_BASE_THRESHOLD - n.ai.aggression - AI_DOW_OPPORTUNISM_FACTOR * n.ai.opportunism,
  );
  const power = totalPower(n);
  for (const rid of orderedClaims(s, n)) {
    const rs = s.regions[rid];
    const target = rs ? s.nations[rs.controller] : undefined;
    if (!target || !target.alive || target.id === id) continue;
    // Never against one's own faction, one's master, or one's puppet.
    if (target.faction !== 'neutral' && target.faction === n.faction) continue;
    if (n.puppetOf === target.id || target.puppetOf === id) continue;
    if (power >= threshold * defensePower(s, target, id)) {
      // applyEffects keeps guarantor/ally joining in one place. (The plan's
      // "fire a generic ultimatum event first if defined" step belongs to the
      // events engine; ai.ts has no event list and declares directly.)
      return applyEffects([{ t: 'declareWar', attacker: id, defender: target.id }], s, rng);
    }
  }
  return s; // one DoW attempt sweep per turn; nothing met the threshold
}

// ---------------------------------------------------------------------------
// Step 4: faction gravity + democracy guarantees.

/** Threatened: borders a hostile-ideology major that holds a claim on it. */
function isThreatened(s: GameState, c: Nation): boolean {
  for (const mid of MAJOR_IDS) {
    const m = s.nations[mid];
    if (!m?.alive || m.id === c.id) continue;
    if (m.government !== 'fascist' && m.government !== 'communist') continue;
    if (totalPower(c) >= totalPower(m)) continue; // only minors relative to the threat
    if (!m.claims.some((rid) => s.regions[rid]?.controller === c.id)) continue;
    if (bordersEachOther(s, m.id, c.id)) return true;
  }
  return false;
}

function runDiplomacyAI(s: GameState, id: NationId, rng: Rng): GameState {
  const n = s.nations[id];

  // Faction gravity: aligned neutrals slide into their ideological camp.
  if (n.faction === 'neutral' && s.tension >= AI_FACTION_JOIN_TENSION) {
    const drawn = (leaderId: NationId, faction: Nation['faction']): boolean => {
      const leader = s.nations[leaderId];
      return (
        leader !== undefined &&
        leader.alive &&
        leader.faction === faction &&
        leaderId !== id &&
        (n.relations[leaderId] ?? 0) >= AI_FACTION_JOIN_RELATIONS
      );
    };
    if (n.government === 'fascist' && drawn('GER', 'axis')) {
      return applyEffects([{ t: 'joinFaction', nation: id, faction: 'axis' }], s, rng);
    }
    if (n.government === 'communist' && drawn('SOV', 'comintern')) {
      return applyEffects([{ t: 'joinFaction', nation: id, faction: 'comintern' }], s, rng);
    }
  }

  // Democracies guarantee threatened minors once tension crosses the gate.
  if (n.government === 'democracy' && s.tension >= GUARANTEE_TENSION_GATE) {
    const enemies = enemiesOf(s, id);
    const effects: Effect[] = [];
    for (const cid of Object.keys(s.nations).sort()) {
      const c = s.nations[cid];
      if (cid === id || !c.alive || c.puppetOf !== null) continue;
      if (c.faction !== 'neutral' && c.faction !== n.faction) continue;
      if (n.guarantees.includes(cid) || enemies.has(cid)) continue;
      if (isThreatened(s, c)) effects.push({ t: 'guarantee', by: id, of: cid });
    }
    if (effects.length > 0) return applyEffects(effects, s, rng);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Step 5: allocation and research by focus.

function pickResearch(n: Nation, focus: Nation['ai']['focus']): TechTrack | null {
  for (const track of RESEARCH_PRIORITY[focus]) {
    if (n.tech[track] < TECH_MAX) return track;
  }
  for (const track of FALLBACK_TRACKS) {
    if (n.tech[track] < TECH_MAX) return track;
  }
  return null;
}

function runProduction(s: GameState, id: NationId): GameState {
  const n = s.nations[id];
  // Puppets run a garrison economy regardless of their old ambitions.
  const focus = n.puppetOf !== null ? 'defense' : n.ai.focus;
  const alloc = AI_ALLOCATION[focus];

  let research = n.research;
  const wantsSecret =
    n.puppetOf === null &&
    SECRET_CLUB.includes(id) &&
    s.tension >= AI_SECRET_TENSION_GATE &&
    n.tech.industry >= SECRET_REQUIRES_INDUSTRY &&
    n.tech.secret < TECH_MAX;
  if (wantsSecret && research.track !== 'secret') {
    research = { track: 'secret', progress: 0 };
  } else if (research.track === null) {
    const track = pickResearch(n, focus);
    if (track !== null) research = { track, progress: 0 };
  }
  return withNation(s, id, { icAllocation: { ...alloc }, research });
}

// ---------------------------------------------------------------------------
// Step 6: covert — opportunist majors spin up networks; assassinations only
// when events have set the AI_COVERT_AGGRESSIVE flag (the player is meant to
// be the schemer by default).

function startMissionLocal(
  s: GameState,
  owner: NationId,
  target: NationId,
  type: CovertMission['type'],
  turns: number,
): GameState {
  const mission: CovertMission = {
    id: `mission-${owner}-${target}-${type}-t${s.turn}`,
    owner,
    target,
    type,
    turnsLeft: turns,
  };
  return { ...s, missions: [...s.missions, mission] };
}

function runCovertAI(s: GameState, id: NationId): GameState {
  const n = s.nations[id];
  if (!MAJOR_IDS.includes(id) || n.ai.opportunism <= COVERT_OPPORTUNISM_GATE) return s;
  if (s.missions.some((m) => m.owner === id)) return s; // one operation at a time

  if (s.flags['AI_COVERT_AGGRESSIVE']) {
    const marks = [...enemiesOf(s, id)]
      .filter(
        (e) =>
          s.nations[e]?.alive === true &&
          (n.spyNetworks[e] ?? 0) >= OP_NETWORK_REQUIREMENTS['assassinate'],
      )
      .sort();
    if (marks.length > 0) return startMissionLocal(s, id, marks[0], 'assassinate', OPERATION_TURNS);
  }

  // Build a network inside the coldest rival great power.
  const rivals = MAJOR_IDS.filter(
    (r) =>
      r !== id &&
      s.nations[r]?.alive === true &&
      (n.relations[r] ?? 0) < 0 &&
      (n.spyNetworks[r] ?? 0) < NETWORK_MAX,
  ).sort((a, b) => (n.relations[a] ?? 0) - (n.relations[b] ?? 0) || a.localeCompare(b));
  if (rivals.length > 0) return startMissionLocal(s, id, rivals[0], 'buildNetwork', NETWORK_BUILD_TURNS);
  return s;
}

// ---------------------------------------------------------------------------
// Step 7: peace feelers when losing badly. Actual peace terms arrive as
// content events; here the AI raises the transient _peaceseek_ flag and sends
// a diplomatic report to the enemy war leader (delivered only if that leader
// is the player — effects.ts drops AI-to-AI mail).

function capitalThreatened(s: GameState, n: Nation): boolean {
  const cap = s.regions[n.capital];
  if (!cap) return false;
  if (cap.controller !== n.id) return true;
  const enemies = enemiesOf(s, n.id);
  return adjacentIn(s, n.capital).some((adj) => enemies.has(s.regions[adj].controller));
}

function runPeaceAI(s: GameState, id: NationId, rng: Rng): GameState {
  const n = s.nations[id];
  const flagKey = `_peaceseek_${id}`;
  if (s.flags[flagKey] === true) return s;
  if (!atWarAny(s, id)) return s;
  if (n.warSupport >= AI_PEACE_WAR_SUPPORT || !capitalThreatened(s, n)) return s;

  const opposing = [...enemiesOf(s, id)].filter((e) => s.nations[e]?.alive === true);
  if (opposing.length === 0) return s;
  const leader = opposing.sort(
    (a, b) => totalPower(s.nations[b]) - totalPower(s.nations[a]) || a.localeCompare(b),
  )[0];

  const effects: Effect[] = [
    { t: 'flag', key: flagKey, value: true },
    {
      t: 'report',
      to: leader,
      kind: 'diplomatic',
      title: `Peace feelers from ${n.name}`,
      body:
        `Through neutral channels, the ${n.adjective} government signals it is ` +
        `prepared to discuss terms. Its capital is under threat and its people ` +
        `have little appetite left for war.`,
    },
  ];
  return applyEffects(effects, s, rng);
}

// ---------------------------------------------------------------------------
// Puppet synchronization: puppets copy the master's faction and join the
// master's wars on the master's side (via declareWar so relations/tension
// bookkeeping stays consistent).

function runPuppetSync(s: GameState, id: NationId, rng: Rng): GameState {
  const masterId = s.nations[id].puppetOf;
  const master = masterId !== null ? s.nations[masterId] : undefined;
  if (!master?.alive) return s;

  let out = s;
  if (out.nations[id].faction !== master.faction) {
    out = applyEffects([{ t: 'joinFaction', nation: id, faction: master.faction }], out, rng);
  }
  for (const wid of s.wars.map((w) => w.id)) {
    const w = out.wars.find((x) => x.id === wid);
    if (!w || w.attackers.includes(id) || w.defenders.includes(id)) continue;
    const masterSideAtk = w.attackers.includes(master.id);
    if (!masterSideAtk && !w.defenders.includes(master.id)) continue;
    const opposing = (masterSideAtk ? w.defenders : w.attackers)
      .filter((e) => out.nations[e]?.alive === true)
      .sort();
    if (opposing.length === 0) continue;
    // declareWar against an existing belligerent merges the puppet onto the
    // master's side of that war.
    out = applyEffects([{ t: 'declareWar', attacker: id, defender: opposing[0] }], out, rng);
  }
  return out;
}

// ---------------------------------------------------------------------------

function runNation(s: GameState, id: NationId, rng: Rng): GameState {
  const puppet = s.nations[id].puppetOf !== null;
  let out = s;
  if (puppet) out = runPuppetSync(out, id, rng);
  out = updateMilitary(out, id); // steps 1–2
  if (!puppet) {
    out = runAmbitions(out, id, rng); // step 3
    out = runDiplomacyAI(out, id, rng); // step 4
  }
  out = runProduction(out, id); // step 5
  if (!puppet) {
    out = runCovertAI(out, id); // step 6
    out = runPeaceAI(out, id, rng); // step 7
  }
  return out;
}

export function runAI(state: GameState, rng: Rng, opts: { includePlayer: boolean }): GameState {
  if (state.gameOver) return state;
  let s = state;
  for (const id of Object.keys(state.nations).sort()) {
    if (!opts.includePlayer && id === state.playerNation) continue;
    if (!s.nations[id]?.alive) continue; // the dead take no actions
    s = runNation(s, id, rng);
  }
  return s;
}
