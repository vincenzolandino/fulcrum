// Integrity tests over the merged event content (Task 13). Every id a pack
// references — nations, regions, leaders, events — must resolve against the
// data modules, and every event must obey the content contract from the plan.

import { describe, expect, it } from 'vitest';
import type { Condition, GameEvent } from '../src/engine/types';
import {
  ALL_EVENTS,
  PREWAR_EVENTS,
  GERMANY_EVENTS,
  POLAND_EVENTS,
  USSR_EVENTS,
  UK_EVENTS,
  FRANCE_EVENTS,
  ITALY_EVENTS,
  JAPAN_EVENTS,
  USA_EVENTS,
  PACIFIC_EVENTS,
  ENDGAME_EVENTS,
  COVERT_EVENTS,
  GENERIC_EVENTS,
} from '../src/data/events';
import { EVENT_ID_PREFIX, type EventPack } from '../src/data/events/registry';
import { NATION_IDS } from '../src/data/nations';
import { REGION_IDS } from '../src/data/regions';
import { LEADERS, SUCCESSIONS } from '../src/data/leaders';

const NATIONS = new Set(NATION_IDS);
const REGIONS_SET = new Set(REGION_IDS);
const LEADER_IDS = new Set(Object.keys(LEADERS));
const EVENT_IDS = new Set(ALL_EVENTS.map((e) => e.id));

const PACKS: Record<EventPack, GameEvent[]> = {
  prewar: PREWAR_EVENTS,
  germany: GERMANY_EVENTS,
  poland: POLAND_EVENTS,
  ussr: USSR_EVENTS,
  uk: UK_EVENTS,
  france: FRANCE_EVENTS,
  italy: ITALY_EVENTS,
  japan: JAPAN_EVENTS,
  usa: USA_EVENTS,
  pacific: PACIFIC_EVENTS,
  endgame: ENDGAME_EVENTS,
  covertOps: COVERT_EVENTS,
  generic: GENERIC_EVENTS,
};

// Engine-convention ids exempt from the pack-prefix rule (registry.ts):
// 'surrender-<NATIONID>' (events.ts) and '<nationid>-succession-<leaderId>'
// (leaders.ts succEvent) live in whichever pack owns the nation.
const isSurrenderId = (id: string): boolean => {
  const m = /^surrender-([A-Z]+)$/.exec(id);
  return m !== null && NATIONS.has(m[1]);
};
const isSuccessionId = (id: string): boolean => {
  const m = /^([a-z]+)-succession-(.+)$/.exec(id);
  return m !== null && NATIONS.has(m[1].toUpperCase()) && LEADER_IDS.has(m[2]);
};

// ---------------------------------------------------------------------------
// Reference walker: per DSL node type ('t'), which keys carry which id kind.
// Precise per key name so plain strings (titles, flag keys, report bodies)
// are never misread as ids.
// ---------------------------------------------------------------------------

type IdKind = 'nation' | 'nationOrPlayer' | 'region' | 'leader' | 'event';
type KeySpec = Record<string, IdKind>;

const NODE_KEYS: Record<string, KeySpec> = {
  // Conditions
  atWar: { a: 'nation', b: 'nation' },
  alive: { nation: 'nation' },
  isPlayer: { nation: 'nation' },
  faction: { nation: 'nation' },
  controls: { nation: 'nation', region: 'region' },
  leaderIs: { nation: 'nation', leader: 'leader' },
  strengthRatio: { a: 'nation', b: 'nation' },
  eventFired: { id: 'event' },
  eventNotFired: { id: 'event' },
  // Shared shapes (condition + effect variants carry the same id keys)
  relations: { a: 'nation', b: 'nation' },
  stability: { nation: 'nation' },
  warSupport: { nation: 'nation' },
  spyNetwork: { owner: 'nation', target: 'nation' },
  tech: { nation: 'nation' },
  // Effects
  declareWar: { attacker: 'nation', defender: 'nation' },
  peace: { a: 'nation', b: 'nation' },
  annex: { nation: 'nation', by: 'nation' },
  puppet: { nation: 'nation', by: 'nation' },
  cedeRegion: { region: 'region', to: 'nation' },
  setController: { region: 'region', to: 'nation' },
  joinFaction: { nation: 'nation' },
  guarantee: { by: 'nation', of: 'nation' },
  pact: { a: 'nation', b: 'nation' },
  breakPact: { a: 'nation', b: 'nation' },
  addClaim: { nation: 'nation', region: 'region' },
  ic: { nation: 'nation' },
  manpower: { nation: 'nation' },
  navy: { nation: 'nation' },
  air: { nation: 'nation' },
  armyStrength: { nation: 'nation' },
  newArmy: { nation: 'nation', location: 'region' },
  disbandArmy: { nation: 'nation' },
  setLeader: { nation: 'nation', leader: 'leader' },
  killLeader: { nation: 'nation' },
  setAI: { nation: 'nation' },
  report: { to: 'nationOrPlayer' },
  queueEvent: { id: 'event' },
};

const checkId = (kind: IdKind, value: unknown, path: string, errors: string[]): void => {
  if (typeof value !== 'string') {
    errors.push(`${path}: expected string id, got ${typeof value}`);
    return;
  }
  switch (kind) {
    case 'nation':
      if (!NATIONS.has(value)) errors.push(`${path}: unknown nation '${value}'`);
      break;
    case 'nationOrPlayer':
      if (value !== 'player' && !NATIONS.has(value)) errors.push(`${path}: unknown nation '${value}'`);
      break;
    case 'region':
      if (!REGIONS_SET.has(value)) errors.push(`${path}: unknown region '${value}'`);
      break;
    case 'leader':
      if (!LEADER_IDS.has(value)) errors.push(`${path}: unknown leader '${value}'`);
      break;
    case 'event':
      if (!EVENT_IDS.has(value)) errors.push(`${path}: unknown event id '${value}'`);
      break;
  }
};

/** Recursively walk any DSL value, validating id-bearing keys per node type. */
const walk = (node: unknown, path: string, errors: string[]): void => {
  if (Array.isArray(node)) {
    node.forEach((item, i) => walk(item, `${path}[${i}]`, errors));
    return;
  }
  if (node === null || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  const t = typeof obj.t === 'string' ? obj.t : null;
  const spec = t ? NODE_KEYS[t] : undefined;
  if (spec) {
    for (const [key, kind] of Object.entries(spec)) {
      if (obj[key] === undefined) continue; // optional keys (e.g. atWar.b)
      checkId(kind, obj[key], `${path}.${key}`, errors);
    }
  }
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) walk(value, `${path}.${key}`, errors);
  }
};

/** True if the condition tree contains a substantive (non-calendar) leaf. */
const hasWorldStateCondition = (c: Condition): boolean => {
  switch (c.t) {
    case 'always':
    case 'turnAtLeast':
    case 'turnBefore':
      return false;
    case 'and':
    case 'or':
      return c.c.some(hasWorldStateCondition);
    case 'not':
      return hasWorldStateCondition(c.c);
    default:
      return true;
  }
};

// ---------------------------------------------------------------------------

describe('event content integrity', () => {
  it('has a substantial merged event list', () => {
    expect(ALL_EVENTS.length).toBeGreaterThanOrEqual(120);
  });

  it('event ids are unique across all packs', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const e of ALL_EVENTS) {
      if (seen.has(e.id)) dupes.push(e.id);
      seen.add(e.id);
    }
    expect(dupes).toEqual([]);
  });

  it('every id carries its pack prefix (surrender/succession convention exempt)', () => {
    const errors: string[] = [];
    for (const [pack, events] of Object.entries(PACKS) as [EventPack, GameEvent[]][]) {
      const prefix = EVENT_ID_PREFIX[pack];
      for (const e of events) {
        if (isSurrenderId(e.id) || isSuccessionId(e.id)) continue;
        if (!e.id.startsWith(prefix)) errors.push(`${pack}: '${e.id}' lacks prefix '${prefix}'`);
      }
    }
    expect(errors).toEqual([]);
  });

  it('every nation/region/leader/event reference resolves', () => {
    const errors: string[] = [];
    for (const e of ALL_EVENTS) {
      if (e.nation !== 'global' && !NATIONS.has(e.nation)) {
        errors.push(`${e.id}.nation: unknown nation '${e.nation}'`);
      }
      walk(e.fires, `${e.id}.fires`, errors);
      walk(e.choices, `${e.id}.choices`, errors);
    }
    expect(errors).toEqual([]);
  });

  it('every event has 1-5 choices, each with a non-empty label', () => {
    const errors: string[] = [];
    for (const e of ALL_EVENTS) {
      if (e.choices.length < 1 || e.choices.length > 5) {
        errors.push(`${e.id}: ${e.choices.length} choices`);
      }
      e.choices.forEach((c, i) => {
        if (typeof c.label !== 'string' || c.label.trim().length === 0) {
          errors.push(`${e.id}.choices[${i}]: empty label`);
        }
      });
    }
    expect(errors).toEqual([]);
  });

  it('event text is 200-1200 characters', () => {
    const errors: string[] = [];
    for (const e of ALL_EVENTS) {
      const len = e.text.length;
      if (len < 200 || len > 1200) errors.push(`${e.id}: text length ${len}`);
    }
    expect(errors).toEqual([]);
  });

  it('no calendar-only triggers: every fires tree has a world-state condition', () => {
    const offenders = ALL_EVENTS.filter((e) => !hasWorldStateCondition(e.fires)).map((e) => e.id);
    expect(offenders).toEqual([]);
  });

  it('aiWeights, where given, are positive', () => {
    const errors: string[] = [];
    for (const e of ALL_EVENTS) {
      e.choices.forEach((c, i) => {
        if (c.aiWeight !== undefined && !(c.aiWeight > 0)) {
          errors.push(`${e.id}.choices[${i}]: aiWeight ${c.aiWeight}`);
        }
      });
    }
    expect(errors).toEqual([]);
  });

  it('every SUCCESSIONS eventId exists in ALL_EVENTS', () => {
    const missing: string[] = [];
    for (const [nation, options] of Object.entries(SUCCESSIONS)) {
      for (const opt of options) {
        if (opt.eventId && !EVENT_IDS.has(opt.eventId)) {
          missing.push(`${nation}/${opt.leader}: '${opt.eventId}'`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
