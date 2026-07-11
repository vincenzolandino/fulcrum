// Effect DSL applier. Content files describe consequences as serializable
// Effect objects; this module interprets them. Pure: never mutates the input
// state — every change is a structural copy. Gameplay tunables come from
// balance.ts; the numeric bounds defined below are data-range invariants
// fixed by the type contract in types.ts (relations −100..100, percentage
// scales 0..100, navy/air 0..1000), not balance knobs.

import type {
  Army,
  Effect,
  GameState,
  Nation,
  NationId,
  Report,
  Rng,
  War,
} from './types';
import { TECH_MAX, TENSION_PER_ANNEX, TENSION_PER_DOW } from './balance';

const RELATION_MIN = -100;
const RELATION_MAX = 100;
const PCT_MIN = 0;
const PCT_MAX = 100; // stability, warSupport, spy networks, army strength/equipment, tension
const NAVY_AIR_MIN = 0;
const NAVY_AIR_MAX = 1000;

// Flag-key conventions shared with other engine modules.
/** Permanent ic modifier accumulated by { t: 'ic' } effects; economy.ts reads it. */
export const icModFlag = (nation: NationId): string => `IC_MOD_${nation}`;
/** Set by { t: 'killLeader' }; covert.ts succession consumes it and installs the heir. */
export const leaderDeadFlag = (nation: NationId): string => `LEADER_DEAD_${nation}`;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

const union = (a: NationId[], b: NationId[]): NationId[] => [
  ...a,
  ...b.filter((x) => !a.includes(x)),
];

function withNation(s: GameState, id: NationId, patch: Partial<Nation>): GameState {
  const n = s.nations[id];
  if (!n) return s;
  return { ...s, nations: { ...s.nations, [id]: { ...n, ...patch } } };
}

/** Set relations to an absolute value, mirrored on both nations, clamped. */
function setRelations(s: GameState, a: NationId, b: NationId, value: number): GameState {
  if (a === b) return s;
  const na = s.nations[a];
  const nb = s.nations[b];
  if (!na || !nb) return s;
  const v = clamp(value, RELATION_MIN, RELATION_MAX);
  return {
    ...s,
    nations: {
      ...s.nations,
      [a]: { ...na, relations: { ...na.relations, [b]: v } },
      [b]: { ...nb, relations: { ...nb.relations, [a]: v } },
    },
  };
}

const withTension = (s: GameState, delta: number): GameState => ({
  ...s,
  tension: clamp(s.tension + delta, PCT_MIN, PCT_MAX),
});

// ---------------------------------------------------------------------------
// declareWar: creates or merges a War. The defender's guarantors and
// alliance-pact partners join the defenders; the attacker's alliance-pact
// partners join the attackers. Relations between every opposing pair go to
// −100 and tension rises by TENSION_PER_DOW. A nation never joins against its
// own (non-neutral) faction, and the dead do not answer the call.
// ---------------------------------------------------------------------------
function doDeclareWar(s: GameState, attacker: NationId, defender: NationId): GameState {
  if (attacker === defender || !s.nations[attacker] || !s.nations[defender]) return s;

  const alreadyOpposed = s.wars.some(
    (w) =>
      (w.attackers.includes(attacker) && w.defenders.includes(defender)) ||
      (w.attackers.includes(defender) && w.defenders.includes(attacker)),
  );
  if (alreadyOpposed) return s;

  const willJoin = (candidate: NationId, against: NationId[]): boolean => {
    const n = s.nations[candidate];
    if (!n || !n.alive) return false;
    if (n.faction === 'neutral') return true; // no faction loyalty to violate
    return !against.some((o) => s.nations[o]?.faction === n.faction);
  };
  const partners = (id: NationId): NationId[] =>
    (s.nations[id]?.pacts ?? []).filter((p) => p.kind === 'alliance').map((p) => p.with);
  const guarantors = (id: NationId): NationId[] =>
    Object.values(s.nations)
      .filter((n) => n.guarantees.includes(id))
      .map((n) => n.id);

  // Attacker's side first (they initiate together)...
  const atkSide: NationId[] = [attacker];
  for (const p of partners(attacker)) {
    if (p !== defender && !atkSide.includes(p) && willJoin(p, [defender])) atkSide.push(p);
  }
  // ...then the defensive coalition, minus anyone already marching with the attacker.
  const defSide: NationId[] = [defender];
  for (const p of [...guarantors(defender), ...partners(defender)]) {
    if (!defSide.includes(p) && !atkSide.includes(p) && willJoin(p, atkSide)) defSide.push(p);
  }

  // Merge into the first existing war involving either principal, else create.
  const idx = s.wars.findIndex(
    (w) =>
      w.attackers.includes(attacker) ||
      w.defenders.includes(attacker) ||
      w.attackers.includes(defender) ||
      w.defenders.includes(defender),
  );

  let war: War;
  let wars: War[];
  if (idx >= 0) {
    const w = s.wars[idx];
    if (w.defenders.includes(defender)) {
      // Attacker piles onto the existing aggressors.
      war = { ...w, attackers: union(w.attackers, atkSide.filter((n) => !w.defenders.includes(n))) };
    } else if (w.attackers.includes(defender)) {
      // Attacking an existing aggressor means joining its victims.
      war = { ...w, defenders: union(w.defenders, atkSide.filter((n) => !w.attackers.includes(n))) };
    } else if (w.attackers.includes(attacker)) {
      // Attacker already leads a war; the defender's coalition joins the other side.
      war = { ...w, defenders: union(w.defenders, defSide.filter((n) => !w.attackers.includes(n))) };
    } else {
      // Attacker is a defender elsewhere; its new enemy joins the aggressors there.
      war = { ...w, attackers: union(w.attackers, defSide.filter((n) => !w.defenders.includes(n))) };
    }
    wars = s.wars.map((x, i) => (i === idx ? war : x));
  } else {
    war = {
      id: `war-${attacker}-${defender}-t${s.turn}`,
      attackers: atkSide,
      defenders: defSide,
      startTurn: s.turn,
    };
    wars = [...s.wars, war];
  }

  let out: GameState = withTension({ ...s, wars }, TENSION_PER_DOW);
  for (const x of war.attackers) {
    for (const y of war.defenders) out = setRelations(out, x, y, RELATION_MIN);
  }
  return out;
}

// peace between a and b: in each war where they oppose each other, the party
// whose side has other members exits (b preferred); a lone pair dissolves the war.
function doPeace(s: GameState, a: NationId, b: NationId): GameState {
  const wars: War[] = [];
  for (const w of s.wars) {
    const aAtk = w.attackers.includes(a);
    const bAtk = w.attackers.includes(b);
    const opposed = (aAtk && w.defenders.includes(b)) || (bAtk && w.defenders.includes(a));
    if (!opposed) {
      wars.push(w);
      continue;
    }
    const bSide = bAtk ? w.attackers : w.defenders;
    const aSide = aAtk ? w.attackers : w.defenders;
    if (bSide.length > 1) {
      wars.push(
        bAtk
          ? { ...w, attackers: w.attackers.filter((n) => n !== b) }
          : { ...w, defenders: w.defenders.filter((n) => n !== b) },
      );
    } else if (aSide.length > 1) {
      wars.push(
        aAtk
          ? { ...w, attackers: w.attackers.filter((n) => n !== a) }
          : { ...w, defenders: w.defenders.filter((n) => n !== a) },
      );
    }
    // Both alone → the war ends; drop it.
  }
  return { ...s, wars };
}

// annex: `by` absorbs `nation` — regions (owner and control), death, army
// dissolution, removal from all wars, and the world takes notice (tension).
function doAnnex(s: GameState, nation: NationId, by: NationId): GameState {
  const target = s.nations[nation];
  if (!target || nation === by || !s.nations[by]) return s;

  const regions = { ...s.regions };
  for (const [rid, rs] of Object.entries(s.regions)) {
    if (rs.owner === nation || rs.controller === nation) {
      regions[rid] = {
        owner: rs.owner === nation ? by : rs.owner,
        controller: rs.controller === nation ? by : rs.controller,
        // Entrenchment belonged to the old garrison; reset where control flips.
        entrenchment: rs.controller === nation ? 0 : rs.entrenchment,
      };
    }
  }
  const nations = {
    ...s.nations,
    [nation]: { ...target, alive: false, armies: [] as Army[], puppetOf: null },
  };
  const wars = s.wars
    .map((w) => ({
      ...w,
      attackers: w.attackers.filter((n) => n !== nation),
      defenders: w.defenders.filter((n) => n !== nation),
    }))
    .filter((w) => w.attackers.length > 0 && w.defenders.length > 0);

  return withTension({ ...s, regions, nations, wars }, TENSION_PER_ANNEX);
}

// ---------------------------------------------------------------------------

function applyEffect(state: GameState, e: Effect, _rng: Rng): GameState {
  switch (e.t) {
    case 'flag':
      return { ...state, flags: { ...state.flags, [e.key]: e.value } };
    case 'addFlag': {
      const cur = state.flags[e.key];
      const base = typeof cur === 'number' ? cur : 0;
      return { ...state, flags: { ...state.flags, [e.key]: base + e.delta } };
    }
    case 'relations': {
      const cur = state.nations[e.a]?.relations[e.b] ?? 0;
      return setRelations(state, e.a, e.b, cur + e.delta);
    }
    case 'stability': {
      const n = state.nations[e.nation];
      if (!n) return state;
      return withNation(state, e.nation, { stability: clamp(n.stability + e.delta, PCT_MIN, PCT_MAX) });
    }
    case 'warSupport': {
      const n = state.nations[e.nation];
      if (!n) return state;
      return withNation(state, e.nation, { warSupport: clamp(n.warSupport + e.delta, PCT_MIN, PCT_MAX) });
    }
    case 'tension':
      return withTension(state, e.delta);
    case 'declareWar':
      return doDeclareWar(state, e.attacker, e.defender);
    case 'peace':
      return doPeace(state, e.a, e.b);
    case 'annex':
      return doAnnex(state, e.nation, e.by);
    case 'puppet': {
      const master = state.nations[e.by];
      const n = state.nations[e.nation];
      if (!n || !master || e.nation === e.by) return state;
      // Puppets leave any war against their new master and align factions.
      const pacified = doPeace(state, e.nation, e.by);
      return withNation(pacified, e.nation, { puppetOf: e.by, faction: master.faction });
    }
    case 'cedeRegion': {
      const r = state.regions[e.region];
      if (!r || !state.nations[e.to]) return state;
      return {
        ...state,
        regions: { ...state.regions, [e.region]: { owner: e.to, controller: e.to, entrenchment: 0 } },
      };
    }
    case 'setController': {
      const r = state.regions[e.region];
      if (!r || !state.nations[e.to] || r.controller === e.to) return state;
      return {
        ...state,
        regions: { ...state.regions, [e.region]: { ...r, controller: e.to, entrenchment: 0 } },
      };
    }
    case 'joinFaction':
      return withNation(state, e.nation, { faction: e.faction });
    case 'guarantee': {
      const n = state.nations[e.by];
      if (!n || n.guarantees.includes(e.of)) return state;
      return withNation(state, e.by, { guarantees: [...n.guarantees, e.of] });
    }
    case 'pact': {
      const na = state.nations[e.a];
      const nb = state.nations[e.b];
      if (!na || !nb || e.a === e.b) return state;
      const add = (n: Nation, other: NationId): Nation =>
        n.pacts.some((p) => p.with === other && p.kind === e.kind)
          ? n
          : { ...n, pacts: [...n.pacts, { with: other, kind: e.kind }] };
      return {
        ...state,
        nations: { ...state.nations, [e.a]: add(na, e.b), [e.b]: add(nb, e.a) },
      };
    }
    case 'breakPact': {
      const na = state.nations[e.a];
      const nb = state.nations[e.b];
      if (!na || !nb || e.a === e.b) return state;
      return {
        ...state,
        nations: {
          ...state.nations,
          [e.a]: { ...na, pacts: na.pacts.filter((p) => p.with !== e.b) },
          [e.b]: { ...nb, pacts: nb.pacts.filter((p) => p.with !== e.a) },
        },
      };
    }
    case 'addClaim': {
      const n = state.nations[e.nation];
      if (!n || n.claims.includes(e.region)) return state;
      return withNation(state, e.nation, { claims: [...n.claims, e.region] });
    }
    case 'ic': {
      // nation.ic is recomputed each turn, so persist the modifier in a flag
      // (economy.ts reads icModFlag) and also bump the live value for this turn.
      const n = state.nations[e.nation];
      if (!n) return state;
      const key = icModFlag(e.nation);
      const cur = state.flags[key];
      const base = typeof cur === 'number' ? cur : 0;
      const patched = withNation(state, e.nation, { ic: Math.max(0, n.ic + e.delta) });
      return { ...patched, flags: { ...patched.flags, [key]: base + e.delta } };
    }
    case 'manpower': {
      const n = state.nations[e.nation];
      if (!n) return state;
      return withNation(state, e.nation, { manpower: Math.max(0, n.manpower + e.delta) });
    }
    case 'navy': {
      const n = state.nations[e.nation];
      if (!n) return state;
      return withNation(state, e.nation, { navy: clamp(n.navy + e.delta, NAVY_AIR_MIN, NAVY_AIR_MAX) });
    }
    case 'air': {
      const n = state.nations[e.nation];
      if (!n) return state;
      return withNation(state, e.nation, { air: clamp(n.air + e.delta, NAVY_AIR_MIN, NAVY_AIR_MAX) });
    }
    case 'armyStrength': {
      const n = state.nations[e.nation];
      if (!n || n.armies.length === 0) return state;
      const per = e.delta / n.armies.length; // spread evenly across armies
      const armies = n.armies.map((a) => ({
        ...a,
        strength: clamp(a.strength + per, PCT_MIN, PCT_MAX),
      }));
      return withNation(state, e.nation, { armies });
    }
    case 'newArmy': {
      const n = state.nations[e.nation];
      if (!n) return state;
      const army: Army = {
        // Unique within a nation: army count changes with every add, and the
        // turn stamp separates raisings across turns.
        id: `${e.nation}-army-t${state.turn}-${n.armies.length + 1}`,
        name: e.name,
        strength: clamp(e.strength, PCT_MIN, PCT_MAX),
        equipment: clamp(e.equipment, PCT_MIN, PCT_MAX),
        experience: 0,
        location: e.location,
        posture: 'hold',
        moveTarget: null,
      };
      return withNation(state, e.nation, { armies: [...n.armies, army] });
    }
    case 'disbandArmy': {
      const n = state.nations[e.nation];
      if (!n || n.armies.length === 0) return state;
      // Weakest first — demobilization strips the depleted formations.
      const doomed = new Set(
        [...n.armies]
          .sort((x, y) => x.strength - y.strength)
          .slice(0, e.count)
          .map((a) => a.id),
      );
      return withNation(state, e.nation, { armies: n.armies.filter((a) => !doomed.has(a.id)) });
    }
    case 'setLeader':
      return withNation(state, e.nation, { leader: e.leader });
    case 'killLeader': {
      // Succession is covert.ts's job (leaders.ts tables + succession event).
      // Here we only flag the death; the incumbent stays nominally in place
      // until succession resolves, so leaderIs conditions keep working.
      if (!state.nations[e.nation]) return state;
      return { ...state, flags: { ...state.flags, [leaderDeadFlag(e.nation)]: true } };
    }
    case 'spyNetwork': {
      const n = state.nations[e.owner];
      if (!n || !state.nations[e.target]) return state;
      const cur = n.spyNetworks[e.target] ?? 0;
      return withNation(state, e.owner, {
        spyNetworks: { ...n.spyNetworks, [e.target]: clamp(cur + e.delta, PCT_MIN, PCT_MAX) },
      });
    }
    case 'tech': {
      const n = state.nations[e.nation];
      if (!n) return state;
      return withNation(state, e.nation, {
        tech: { ...n.tech, [e.track]: clamp(n.tech[e.track] + e.delta, 0, TECH_MAX) },
      });
    }
    case 'setAI': {
      const n = state.nations[e.nation];
      if (!n) return state;
      return withNation(state, e.nation, { ai: { ...n.ai, ...e.patch } });
    }
    case 'chronicle':
      return {
        ...state,
        chronicle: [
          ...state.chronicle,
          { turn: state.turn, text: e.text, divergence: e.divergence ?? false },
        ],
      };
    case 'report': {
      if (e.to !== 'player' && e.to !== state.playerNation) return state; // AI mail is dropped
      const report: Report = { kind: e.kind, title: e.title, body: e.body, turn: state.turn };
      return { ...state, reports: [...state.reports, report] };
    }
    case 'queueEvent':
      return {
        ...state,
        queuedEvents: [...state.queuedEvents, { id: e.id, fireTurn: state.turn + e.delay }],
      };
    case 'endGame':
      // First verdict sticks; victory.ts fills score and epilogue afterwards.
      if (state.gameOver) return state;
      return { ...state, gameOver: { verdict: e.verdict, score: 0, epilogue: '' } };
  }
}

export function applyEffects(effects: Effect[], state: GameState, rng: Rng): GameState {
  let s = state;
  for (const e of effects) s = applyEffect(s, e, rng);
  return s;
}
