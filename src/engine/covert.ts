// Covert operations and leadership succession. Spy networks are built over
// several turns; operations (stealIntel, sabotage, coup, assassinate) resolve
// in a single turn against network-gated odds. Assassination flows into the
// weighted succession tables in data/leaders.ts. Pure: every change is a
// structural copy, all randomness comes through the Rng argument.
//
// Rng draw order per resolved mission (tests pin against this):
//   buildNetwork              → 1 draw: chance(NETWORK_DETECTION_CHANCE)
//   stealIntel / sabotage     → 1 draw: chance(odds)
//   coup                      → chance(odds), then (on success, if a
//                               succession table exists) 1 draw: weighted pick
//   assassinate               → chance(odds), then (on success, if a
//                               succession table exists) 1 draw: weighted pick

import type {
  CovertMission,
  Effect,
  GameState,
  Nation,
  NationId,
  Rng,
  TechTrack,
} from './types';
import {
  COUP_STABILITY,
  NETWORK_BUILD_GAIN,
  NETWORK_BUILD_TURNS,
  NETWORK_DETECTION_CHANCE,
  NETWORK_DETECTION_LOSS,
  NETWORK_DETECTION_RELATIONS,
  OP_BASE_ODDS,
  OP_FAILURE_NETWORK_LOSS,
  OP_FAILURE_RELATIONS,
  OP_FAILURE_TENSION,
  OP_NETWORK_ODDS_DIVISOR,
  OP_NETWORK_REQUIREMENTS,
  SABOTAGE_DURATION,
  SABOTAGE_IC_FACTOR,
} from './balance';
import { applyEffects, leaderDeadFlag } from './effects';
import { LEADERS, SUCCESSIONS } from '../data/leaders';
import type { SuccessionOption } from '../data/leaders';

// The plan's coup odds read `0.35 + zealPenalty`: ideologically zealous regimes
// resist coups. balance.ts carries no constant for the penalty yet and is
// outside this task's file list, so the factor lives here until the balance
// pass relocates it. odds −= target.ai.ideologyZeal × COUP_ZEAL_ODDS_FACTOR.
const COUP_ZEAL_ODDS_FACTOR = 0.2;

// ---- Flag-key conventions (other modules import these helpers) ----

/**
 * Transient sabotage counter: value = remaining turns of the ic penalty.
 * economy.ts should multiply the target's ic by SABOTAGE_IC_FACTOR while this
 * is > 0 and decrement it. Until economy.ts exists, covert applies the first
 * turn's hit directly at resolution time (see resolveSabotage).
 */
export const sabotageFlag = (target: NationId): string => `_sabotage_${target}`;

/** Set on a failed operation; event packs hook aftermath events on it. */
export const blowbackFlag = (owner: NationId, target: NationId): string =>
  `COVERT_BLOWBACK_${owner}_${target}`;

/** Per-leader death record, e.g. HITLER_DEAD. Event packs condition on these. */
export const leaderKilledFlag = (leader: string): string => `${leader.toUpperCase()}_DEAD`;

// ---------------------------------------------------------------------------
// startMission — validation + enqueue. Returns the input state unchanged when
// the mission is not allowed (missing/dead nations, self-target, a mission
// already running for this owner→target pair, or network below the operation's
// threshold). buildNetwork has no threshold; everything else uses
// OP_NETWORK_REQUIREMENTS from balance.ts.
// ---------------------------------------------------------------------------
export function startMission(
  state: GameState,
  owner: NationId,
  target: NationId,
  type: CovertMission['type'],
): GameState {
  const o = state.nations[owner];
  const t = state.nations[target];
  if (!o || !t || owner === target || !o.alive || !t.alive) return state;
  if (state.missions.some((m) => m.owner === owner && m.target === target)) return state;
  if (type !== 'buildNetwork') {
    const network = o.spyNetworks[target] ?? 0;
    if (network < OP_NETWORK_REQUIREMENTS[type]) return state;
  }
  const mission: CovertMission = {
    id: `mission-${owner}-${target}-${type}-t${state.turn}`,
    owner,
    target,
    type,
    turnsLeft: type === 'buildNetwork' ? NETWORK_BUILD_TURNS : 1,
  };
  return { ...state, missions: [...state.missions, mission] };
}

// ---------------------------------------------------------------------------
// runCovert — tick every mission down one turn; missions reaching zero resolve
// this turn, in launch order. Operations (turnsLeft 1) therefore resolve the
// same turn they are started; buildNetwork resolves on its third tick.
// ---------------------------------------------------------------------------
export function runCovert(state: GameState, rng: Rng): GameState {
  if (state.missions.length === 0) return state;
  const remaining: CovertMission[] = [];
  const due: CovertMission[] = [];
  for (const m of state.missions) {
    const turnsLeft = m.turnsLeft - 1;
    if (turnsLeft <= 0) due.push({ ...m, turnsLeft: 0 });
    else remaining.push({ ...m, turnsLeft });
  }
  let s: GameState = { ...state, missions: remaining };
  for (const m of due) s = resolveMission(s, m, rng);
  return s;
}

function resolveMission(s: GameState, m: CovertMission, rng: Rng): GameState {
  const owner = s.nations[m.owner];
  const target = s.nations[m.target];
  // The world moved on underneath the mission — agents go home quietly.
  if (!owner || !target || !owner.alive || !target.alive) return s;

  if (m.type === 'buildNetwork') return resolveBuildNetwork(s, m, rng);

  const network = owner.spyNetworks[m.target] ?? 0;
  let odds = OP_BASE_ODDS[m.type] + network / OP_NETWORK_ODDS_DIVISOR;
  if (m.type === 'coup') odds -= target.ai.ideologyZeal * COUP_ZEAL_ODDS_FACTOR;

  if (!rng.chance(odds)) return failOperation(s, m, rng);

  switch (m.type) {
    case 'stealIntel':
      return resolveStealIntel(s, m, rng);
    case 'sabotage':
      return resolveSabotage(s, m, rng);
    case 'coup':
      return resolveCoup(s, m, rng);
    case 'assassinate':
      return resolveAssassinate(s, m, rng);
  }
}

// ---- buildNetwork: gain lands first, then the detection roll may claw back ----

function resolveBuildNetwork(s: GameState, m: CovertMission, rng: Rng): GameState {
  const targetName = s.nations[m.target].name;
  let out = applyEffects(
    [{ t: 'spyNetwork', owner: m.owner, target: m.target, delta: NETWORK_BUILD_GAIN }],
    s,
    rng,
  );
  if (rng.chance(NETWORK_DETECTION_CHANCE)) {
    return applyEffects(
      [
        { t: 'spyNetwork', owner: m.owner, target: m.target, delta: -NETWORK_DETECTION_LOSS },
        { t: 'relations', a: m.owner, b: m.target, delta: NETWORK_DETECTION_RELATIONS },
        {
          t: 'report', to: m.owner, kind: 'covert',
          title: `Network compromised in ${targetName}`,
          body: `Counterintelligence in ${targetName} rolled up part of our apparatus. Survivors are lying low; relations have soured.`,
        },
        {
          t: 'report', to: m.target, kind: 'covert',
          title: 'Foreign agents arrested',
          body: `Our security services broke a ${s.nations[m.owner].adjective} spy ring operating on our soil.`,
        },
      ],
      out,
      rng,
    );
  }
  return applyEffects(
    [
      {
        t: 'report', to: m.owner, kind: 'covert',
        title: `Network expanded in ${targetName}`,
        body: `Our residency in ${targetName} has grown quietly. New assets are in place and undetected.`,
      },
    ],
    out,
    rng,
  );
}

// ---- stealIntel: a covert report with the target's military ledger ----

const TECH_TRACKS: TechTrack[] = ['armor', 'air', 'naval', 'industry', 'doctrine', 'secret'];

function intelSnapshot(target: Nation): string {
  const count = target.armies.length;
  const avg = (f: (a: Nation['armies'][number]) => number): number =>
    count === 0 ? 0 : Math.round(target.armies.reduce((sum, a) => sum + f(a), 0) / count);
  const tech = TECH_TRACKS.map((tr) => `${tr} ${target.tech[tr]}`).join(', ');
  return (
    `${target.name}: ${count} armies (avg strength ${avg((a) => a.strength)}, ` +
    `equipment ${avg((a) => a.equipment)}), air ${target.air}, navy ${target.navy}. ` +
    `Tech: ${tech}. Stability ${target.stability}, war support ${target.warSupport}.`
  );
}

function resolveStealIntel(s: GameState, m: CovertMission, rng: Rng): GameState {
  const target = s.nations[m.target];
  return applyEffects(
    [
      {
        t: 'report', to: m.owner, kind: 'covert',
        title: `Intelligence dossier: ${target.name}`,
        body: intelSnapshot(target),
      },
    ],
    s,
    rng,
  );
}

// ---- sabotage: countdown flag for economy.ts + this turn's ic hit ----

function resolveSabotage(s: GameState, m: CovertMission, rng: Rng): GameState {
  const targetName = s.nations[m.target].name;
  let out = applyEffects(
    [
      { t: 'flag', key: sabotageFlag(m.target), value: SABOTAGE_DURATION },
      {
        t: 'report', to: m.owner, kind: 'covert',
        title: `Sabotage in ${targetName}`,
        body: `Our agents wrecked plant and rail in ${targetName}. Their industry will run below capacity while repairs drag on.`,
      },
    ],
    s,
    rng,
  );
  // economy.ts does not exist yet, so the first turn's ic hit is applied here
  // directly. Once economy.ts lands, it should read sabotageFlag(target),
  // multiply ic by SABOTAGE_IC_FACTOR while the counter is > 0, decrement it,
  // and this direct patch should move there.
  const t = out.nations[m.target];
  return {
    ...out,
    nations: { ...out.nations, [m.target]: { ...t, ic: t.ic * SABOTAGE_IC_FACTOR } },
  };
}

// ---- coup: government flips to the instigator's, faction cut to neutral ----

function resolveCoup(s: GameState, m: CovertMission, rng: Rng): GameState {
  const owner = s.nations[m.owner];
  const t = s.nations[m.target];
  let out: GameState = {
    ...s,
    nations: {
      ...s.nations,
      [m.target]: {
        ...t,
        government: owner.government,
        faction: 'neutral',
        stability: COUP_STABILITY,
      },
    },
  };
  // A friendly strongman takes over, drawn from the succession table when the
  // data defines one. The old leader is deposed, not dead — no death flags.
  const table = SUCCESSIONS[m.target];
  if (table && table.length > 0) {
    const choice = weightedPick(table, rng);
    const effects: Effect[] = [
      { t: 'setLeader', nation: m.target, leader: choice.leader },
      { t: 'setAI', nation: m.target, patch: choice.aiPatch },
    ];
    if (choice.eventId) effects.push({ t: 'queueEvent', id: choice.eventId, delay: 0 });
    out = applyEffects(effects, out, rng);
  }
  return applyEffects(
    [
      {
        t: 'chronicle',
        text: `A coup backed by ${owner.adjective} agents topples the government of ${t.name}.`,
        divergence: true,
      },
      {
        t: 'report', to: m.owner, kind: 'covert',
        title: `Coup d'état in ${t.name}`,
        body: `The government of ${t.name} has fallen to officers friendly to our cause. The new regime stands apart from the old alignments — for now.`,
      },
    ],
    out,
    rng,
  );
}

// ---- assassinate: the deed, then the succession machinery ----

function resolveAssassinate(s: GameState, m: CovertMission, rng: Rng): GameState {
  const target = s.nations[m.target];
  const deadName = LEADERS[target.leader]?.name ?? target.leader;
  const out = succession(s, m.target, rng);
  return applyEffects(
    [
      {
        t: 'report', to: m.owner, kind: 'covert',
        title: `Operation complete: ${deadName}`,
        body: `${deadName} of ${target.name} is dead. Our hand in the affair remains unproven.`,
      },
    ],
    out,
    rng,
  );
}

// ---- failure: blown network, diplomatic incident, world takes notice ----

function failOperation(s: GameState, m: CovertMission, rng: Rng): GameState {
  const targetName = s.nations[m.target].name;
  return applyEffects(
    [
      { t: 'spyNetwork', owner: m.owner, target: m.target, delta: -OP_FAILURE_NETWORK_LOSS },
      { t: 'relations', a: m.owner, b: m.target, delta: OP_FAILURE_RELATIONS },
      { t: 'tension', delta: OP_FAILURE_TENSION },
      { t: 'flag', key: blowbackFlag(m.owner, m.target), value: true },
      {
        t: 'report', to: m.owner, kind: 'covert',
        title: `Operation blown in ${targetName}`,
        body: `The operation in ${targetName} failed. Agents were taken, names were named, and the affair is in the foreign press.`,
      },
    ],
    s,
    rng,
  );
}

// ---------------------------------------------------------------------------
// succession — the incumbent of `nation` is dead. Record the death flags
// (LEADER_DEAD_{nation}, {LEADER}_DEAD — hence HITLER_DEAD when Germany's
// hitler dies), pick an heir from data/leaders.ts SUCCESSIONS by weight, apply
// the heir's AI patch, queue the succession event when the table names one,
// and log a chronicle divergence. Nations without a table get an anonymous
// caretaker successor so leaderIs conditions stop matching a dead man.
// Consumes one rng draw when a succession table exists, none otherwise.
// ---------------------------------------------------------------------------
export function succession(state: GameState, nation: NationId, rng: Rng): GameState {
  const n = state.nations[nation];
  if (!n || !n.alive) return state;
  const dead = n.leader;
  const deadName = LEADERS[dead]?.name ?? dead;

  const s = applyEffects(
    [
      { t: 'flag', key: leaderDeadFlag(nation), value: true },
      { t: 'flag', key: leaderKilledFlag(dead), value: true },
    ],
    state,
    rng,
  );

  const table = SUCCESSIONS[nation];
  if (!table || table.length === 0) {
    return applyEffects(
      [
        { t: 'setLeader', nation, leader: `${nation.toLowerCase()}-successor` },
        {
          t: 'chronicle',
          text: `${deadName} of ${n.name} is dead. A hastily assembled successor government takes charge.`,
          divergence: true,
        },
      ],
      s,
      rng,
    );
  }

  const choice = weightedPick(table, rng);
  const heirName = LEADERS[choice.leader]?.name ?? choice.leader;
  const effects: Effect[] = [
    { t: 'setLeader', nation, leader: choice.leader },
    { t: 'setAI', nation, patch: choice.aiPatch },
    {
      t: 'chronicle',
      text: `${deadName} of ${n.name} is dead. ${heirName} takes power.`,
      divergence: true,
    },
  ];
  if (choice.eventId) effects.push({ t: 'queueEvent', id: choice.eventId, delay: 0 });
  return applyEffects(effects, s, rng);
}

/** One rng.next() draw; walks the cumulative weights. */
function weightedPick(options: SuccessionOption[], rng: Rng): SuccessionOption {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let r = rng.next() * total;
  for (const o of options) {
    r -= o.weight;
    if (r < 0) return o;
  }
  return options[options.length - 1];
}
