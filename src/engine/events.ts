// Event engine: trigger evaluation, queueing, player routing, AI auto-choice,
// and the capitulation convention. Content lives in src/data/events; this
// module only interprets it. Pure: never mutates the input state, and all
// randomness flows through the Rng argument.
//
// Rng draw contract (tests pin against this): evaluating an event's `fires`
// or a choice's `available` consumes rng only for { t: 'random' } conditions;
// an AI auto-resolve consumes exactly one extra rng.next() draw for the
// weighted choice pick when two or more choices are available (zero or one
// available choice → no draw).
//
// Player routing: an event goes to `pendingChoices` (for the human to answer)
// when `event.nation === state.playerNation`, or when `event.nation ===
// 'global'` and the player is involved. Involvement check (documented per the
// plan's "implement a reasonable check" note): a global event involves the
// player iff any effect in any of its choices
//   (a) names the player nation directly (any nation-bearing field),
//   (b) names a nation the player is currently at war with,
//   (c) targets a region the player owns or controls, or
//   (d) is a report addressed to 'player'.
// At most MAX_PLAYER_EVENTS_PER_TURN events may sit in pendingChoices; extras
// are deferred (trigger-driven events simply stay eligible next turn; due
// queued events are re-queued for the next turn). Everything else
// auto-resolves via an aiWeight-weighted pick among available choices.
//
// Capitulation convention: politics.ts raises the transient
// '_capitulated_{id}' flag. runEvents consumes it here: it stamps the
// permanent CAPITULATED_{id} flag, then queues the event 'surrender-{id}' if
// the content defines one (fired through the normal queued-event path this
// same call), else annexes the nation to the strongest living enemy in its
// wars and logs a chronicle divergence.

import type {
  Effect,
  EventChoice,
  GameEvent,
  GameState,
  NationId,
  RegionId,
  Rng,
} from './types';
import { evalCondition } from './conditions';
import { applyEffects } from './effects';
import { totalPower } from './power';
import { capitulatedFlag } from './politics';
import { MAX_PLAYER_EVENTS_PER_TURN } from './balance';

/** Permanent record of a capitulation (the '_capitulated_' flag is transient). */
export const capitulationRecordFlag = (nation: NationId): string => `CAPITULATED_${nation}`;

/** Id convention for a nation's surrender event in the content packs. */
export const surrenderEventId = (nation: NationId): string => `surrender-${nation}`;

export const getEvent = (events: GameEvent[], id: string): GameEvent | undefined =>
  events.find((e) => e.id === id);

// ---------------------------------------------------------------------------
// Involvement check helpers
// ---------------------------------------------------------------------------

/** Every nation id an effect names, regardless of role. */
function effectNations(e: Effect): NationId[] {
  switch (e.t) {
    case 'relations':
    case 'peace':
    case 'pact':
    case 'breakPact':
      return [e.a, e.b];
    case 'stability':
    case 'warSupport':
    case 'joinFaction':
    case 'addClaim':
    case 'ic':
    case 'manpower':
    case 'navy':
    case 'air':
    case 'armyStrength':
    case 'newArmy':
    case 'disbandArmy':
    case 'setLeader':
    case 'killLeader':
    case 'tech':
    case 'setAI':
      return [e.nation];
    case 'declareWar':
      return [e.attacker, e.defender];
    case 'annex':
    case 'puppet':
      return [e.nation, e.by];
    case 'cedeRegion':
    case 'setController':
      return [e.to];
    case 'guarantee':
      return [e.by, e.of];
    case 'spyNetwork':
      return [e.owner, e.target];
    case 'report':
      return e.to === 'player' ? [] : [e.to];
    default:
      return [];
  }
}

/** Region ids an effect targets. */
function effectRegions(e: Effect): RegionId[] {
  switch (e.t) {
    case 'cedeRegion':
    case 'setController':
      return [e.region];
    case 'addClaim':
      return [e.region];
    case 'newArmy':
      return [e.location];
    default:
      return [];
  }
}

function playerWarEnemies(s: GameState): Set<NationId> {
  const out = new Set<NationId>();
  for (const w of s.wars) {
    if (w.attackers.includes(s.playerNation)) for (const d of w.defenders) out.add(d);
    if (w.defenders.includes(s.playerNation)) for (const a of w.attackers) out.add(a);
  }
  out.delete(s.playerNation);
  return out;
}

/** See the involvement rules in the module header. */
function globalInvolvesPlayer(ev: GameEvent, s: GameState): boolean {
  const player = s.playerNation;
  const enemies = playerWarEnemies(s);
  for (const c of ev.choices) {
    for (const e of c.effects) {
      if (e.t === 'report' && e.to === 'player') return true;
      for (const nid of effectNations(e)) {
        if (nid === player || enemies.has(nid)) return true;
      }
      for (const rid of effectRegions(e)) {
        const rs = s.regions[rid];
        if (rs !== undefined && (rs.owner === player || rs.controller === player)) return true;
      }
    }
  }
  return false;
}

function shouldRouteToPlayer(ev: GameEvent, s: GameState): boolean {
  if (ev.nation === s.playerNation) return true;
  return ev.nation === 'global' && globalInvolvesPlayer(ev, s);
}

// ---------------------------------------------------------------------------
// Choice selection and firing
// ---------------------------------------------------------------------------

/**
 * aiWeight-weighted pick among available choices (default weight 1). Null when
 * no choice is available. One rng.next() draw when 2+ choices are available.
 */
function pickChoice(choices: EventChoice[], s: GameState, rng: Rng): EventChoice | null {
  const avail = choices.filter(
    (c) => c.available === undefined || evalCondition(c.available, s, rng),
  );
  if (avail.length === 0) return null;
  if (avail.length === 1) return avail[0];
  const total = avail.reduce((sum, c) => sum + (c.aiWeight ?? 1), 0);
  if (total <= 0) return avail[0];
  let r = rng.next() * total;
  for (const c of avail) {
    r -= c.aiWeight ?? 1;
    if (r < 0) return c;
  }
  return avail[avail.length - 1];
}

const markFired = (s: GameState, id: string): GameState =>
  s.firedEvents.includes(id) ? s : { ...s, firedEvents: [...s.firedEvents, id] };

const isPending = (s: GameState, id: string): boolean =>
  s.pendingChoices.some((p) => p.eventId === id);

/** Apply the AI's weighted choice. No available choice → the moment passes. */
function autoResolve(s: GameState, ev: GameEvent, rng: Rng): GameState {
  const choice = pickChoice(ev.choices, s, rng);
  if (choice === null) return s;
  return markFired(applyEffects(choice.effects, s, rng), ev.id);
}

// ---------------------------------------------------------------------------
// Capitulations (see module header)
// ---------------------------------------------------------------------------

function strongestEnemy(s: GameState, id: NationId): NationId | null {
  const enemies = new Set<NationId>();
  for (const w of s.wars) {
    if (w.attackers.includes(id)) for (const d of w.defenders) enemies.add(d);
    if (w.defenders.includes(id)) for (const a of w.attackers) enemies.add(a);
  }
  enemies.delete(id);
  const alive = [...enemies].filter((e) => s.nations[e]?.alive === true);
  if (alive.length === 0) return null;
  alive.sort(
    (a, b) => totalPower(s.nations[b]) - totalPower(s.nations[a]) || a.localeCompare(b),
  );
  return alive[0];
}

function processCapitulations(state: GameState, rng: Rng, events: GameEvent[]): GameState {
  let s = state;
  for (const id of Object.keys(state.nations).sort()) {
    if (s.flags[capitulatedFlag(id)] !== true) continue;
    const n = s.nations[id];
    if (!n || !n.alive) continue;

    if (s.flags[capitulationRecordFlag(id)] !== true) {
      s = { ...s, flags: { ...s.flags, [capitulationRecordFlag(id)]: true } };
    }

    const surrender = getEvent(events, surrenderEventId(id));
    const usable =
      surrender !== undefined &&
      !(surrender.once && s.firedEvents.includes(surrender.id)) &&
      !isPending(s, surrender.id) &&
      !s.queuedEvents.some((q) => q.id === surrender.id);
    if (usable && surrender !== undefined) {
      // Queue for this turn; the queued-event step of this same runEvents call
      // fires it (routing to the player or auto-resolving as usual).
      s = { ...s, queuedEvents: [...s.queuedEvents, { id: surrender.id, fireTurn: s.turn }] };
      continue;
    }

    // No surrender event: the state simply collapses into its strongest enemy.
    const enemy = strongestEnemy(s, id);
    if (enemy === null) continue; // no living enemy to collapse into — flag expires
    s = applyEffects(
      [
        { t: 'annex', nation: id, by: enemy },
        {
          t: 'chronicle',
          text: `${n.name} has capitulated. Its territory passes under ${s.nations[enemy].adjective} occupation.`,
          divergence: true,
        },
        {
          t: 'report',
          to: 'player',
          kind: 'diplomatic',
          title: `${n.name} capitulates`,
          body: `The government of ${n.name} has surrendered unconditionally. ${s.nations[enemy].name} occupies what remains.`,
        },
      ],
      s,
      rng,
    );
  }
  return s;
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/**
 * One events phase: capitulations, then due queued events (fire when due
 * regardless of their `fires` condition, but still respecting choice
 * availability), then triggered events in priority-desc order (ties break by
 * event id so resolution stays deterministic).
 */
export function runEvents(state: GameState, rng: Rng, events: GameEvent[]): GameState {
  let s = processCapitulations(state, rng, events);

  // Player-modal budget for this phase; carried-over pendings count against it.
  let budget = Math.max(0, MAX_PLAYER_EVENTS_PER_TURN - s.pendingChoices.length);

  // ---- queued events due this turn ----
  const due = s.queuedEvents.filter((q) => q.fireTurn <= s.turn);
  if (due.length > 0) {
    s = { ...s, queuedEvents: s.queuedEvents.filter((q) => q.fireTurn > s.turn) };
    for (const q of due) {
      const ev = getEvent(events, q.id);
      if (ev === undefined) continue; // unknown id — content bug, drop silently
      if (ev.once && s.firedEvents.includes(ev.id)) continue;
      if (isPending(s, ev.id)) continue;
      if (shouldRouteToPlayer(ev, s)) {
        if (budget > 0) {
          s = { ...s, pendingChoices: [...s.pendingChoices, { eventId: ev.id }] };
          budget -= 1;
        } else {
          // Modal cap hit: a queued event keeps its place in the queue.
          s = { ...s, queuedEvents: [...s.queuedEvents, { id: ev.id, fireTurn: s.turn + 1 }] };
        }
      } else {
        s = autoResolve(s, ev, rng);
      }
    }
  }

  // ---- trigger-driven events, priority desc ----
  const ordered = [...events].sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id),
  );
  for (const ev of ordered) {
    if (ev.once && s.firedEvents.includes(ev.id)) continue;
    if (isPending(s, ev.id)) continue;
    if (!evalCondition(ev.fires, s, rng)) continue;
    if (shouldRouteToPlayer(ev, s)) {
      if (budget <= 0) continue; // deferred: stays eligible next turn
      s = { ...s, pendingChoices: [...s.pendingChoices, { eventId: ev.id }] };
      budget -= 1;
    } else {
      s = autoResolve(s, ev, rng);
    }
  }
  return s;
}

/**
 * The player answers a pending event. Applies the chosen choice's effects,
 * marks the event fired, and removes it from pendingChoices. Unknown event,
 * bad index, or an unavailable choice returns the state unchanged.
 */
export function resolveChoice(
  state: GameState,
  eventId: string,
  choiceIndex: number,
  rng: Rng,
  events: GameEvent[],
): GameState {
  const ev = getEvent(events, eventId);
  if (ev === undefined) return state;
  const choice = ev.choices[choiceIndex];
  if (choice === undefined) return state;
  if (choice.available !== undefined && !evalCondition(choice.available, state, rng)) {
    return state;
  }
  let s: GameState = {
    ...state,
    pendingChoices: state.pendingChoices.filter((p) => p.eventId !== eventId),
  };
  s = markFired(s, eventId);
  return applyEffects(choice.effects, s, rng);
}

/**
 * Auto-resolve every pending player choice by aiWeight — used by turn.ts when
 * the AI controls the player (headless sim). Pendings with no available choice
 * are dropped unresolved (they may re-trigger next turn).
 */
export function autoResolvePendingChoices(
  state: GameState,
  rng: Rng,
  events: GameEvent[],
): GameState {
  let s = state;
  for (const p of state.pendingChoices) {
    s = { ...s, pendingChoices: s.pendingChoices.filter((x) => x.eventId !== p.eventId) };
    const ev = getEvent(events, p.eventId);
    if (ev === undefined) continue;
    const choice = pickChoice(ev.choices, s, rng);
    if (choice === null) continue;
    s = markFired(applyEffects(choice.effects, s, rng), ev.id);
  }
  return s;
}
