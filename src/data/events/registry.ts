// ---------------------------------------------------------------------------
// Content flag registry — the coordination contract for the 13 event packs.
//
// Every cross-pack flag lives here. Pack agents MUST reference flags through
// FLAGS (or the dynamic-flag builders below) instead of retyping string
// literals, so a typo in one pack cannot silently break another pack's
// trigger. This file is deliberately dependency-light: it imports only types
// from the engine contract and defines no game content of its own.
//
// How flags flow between packs (setter → reader), for orientation:
//   prewar sets ANSCHLUSS_DONE / MUNICH_* / PACT_MR → germany + poland + ussr
//   read them; usa sets EMBARGO_JAPAN → japan's Pearl Harbor decision fires
//   on it; france sets VICHY or FRANCE_FIGHTS_ON on capitulation → uk +
//   endgame branch on the outcome; covertOps reads the engine's
//   COVERT_BLOWBACK_* / *_DEAD flags; endgame reads ATOMIC_* and sets
//   ATOMIC_USED. When your pack needs a new cross-pack flag, add it here
//   first, then use it.
// ---------------------------------------------------------------------------

import type { NationId } from '../../engine/types';

/**
 * Named cross-pack flags. Value === key by construction, so
 * `{ t: 'flag', key: FLAGS.PACT_MR }` reads exactly the string another pack
 * wrote with `{ t: 'flag', key: FLAGS.PACT_MR, value: true }`.
 */
export const FLAGS = {
  /** prewar: Austria annexed (Anschluss resolved in Germany's favor). */
  ANSCHLUSS_DONE: 'ANSCHLUSS_DONE',
  /** prewar: UK/France appeased at Munich; Sudetenland ceded without war. */
  MUNICH_CONCEDED: 'MUNICH_CONCEDED',
  /** prewar: Munich broke down — Czech crisis went to war in 1938. */
  MUNICH_WAR: 'MUNICH_WAR',
  /** prewar: Pact of Steel signed (GER–ITA alliance formalized). */
  PACT_STEEL: 'PACT_STEEL',
  /** prewar/poland: Warsaw yielded Danzig to the ultimatum. */
  DANZIG_CONCEDED: 'DANZIG_CONCEDED',
  /** poland: Warsaw refused the ultimatum and stands. */
  POLAND_STANDS: 'POLAND_STANDS',
  /** prewar: Molotov–Ribbentrop signed (GER–SOV non-aggression, Poland split). */
  PACT_MR: 'PACT_MR',
  /** prewar/ussr: the Soviet–Finnish Winter War has begun. */
  WINTER_WAR: 'WINTER_WAR',
  /** germany: Barbarossa launched — Germany turned east. */
  BARBAROSSA: 'BARBAROSSA',
  /** france: on capitulation, the government fights on from Algiers. */
  FRANCE_FIGHTS_ON: 'FRANCE_FIGHTS_ON',
  /** france: on capitulation, an armistice regime forms at Vichy. */
  VICHY: 'VICHY',
  /** france: French government-in-exile established (see EXILE_<id> builder). */
  EXILE_FRA: 'EXILE_FRA',
  /** poland: Polish government-in-exile established. */
  EXILE_POL: 'EXILE_POL',
  /** usa: oil/steel embargo imposed on Japan — japan's Pearl Harbor decision
   *  fires on THIS flag, never on a date. */
  EMBARGO_JAPAN: 'EMBARGO_JAPAN',
  /** japan: the strike on the US Pacific fleet has happened. */
  PEARL_HARBOR: 'PEARL_HARBOR',
  /** usa/uk: Lend-Lease aid is flowing. */
  LEND_LEASE: 'LEND_LEASE',
  /** engine (covert succession): Germany's incumbent leader 'hitler' died.
   *  Raised automatically as {LEADER}_DEAD; covertOps aftermath chain keys on it. */
  HITLER_DEAD: 'HITLER_DEAD',
  /** engine (covert succession): 'stalin' died. Same convention as above. */
  STALIN_DEAD: 'STALIN_DEAD',
  /** endgame: an atomic weapon has been used in anger (any nation). */
  ATOMIC_USED: 'ATOMIC_USED',
  /** italy: the King dismissed Mussolini (switch-sides / collapse branch). */
  KING_DEPOSES_MUSSOLINI: 'KING_DEPOSES_MUSSOLINI',
  /** uk: Churchill has replaced Chamberlain as Prime Minister. */
  CHURCHILL_PM: 'CHURCHILL_PM',
  /** any pack: unleashes AI covert aggression (ai.ts checks this before AI
   *  assassinations; default off so the player is the schemer). */
  AI_COVERT_AGGRESSIVE: 'AI_COVERT_AGGRESSIVE',
} as const;

export type FlagName = keyof typeof FLAGS;

// Compile-time guarantee that every FLAGS value equals its key.
type _SelfKeyed = { [K in FlagName]: (typeof FLAGS)[K] extends K ? true : never }[FlagName];
export const _FLAGS_SELF_KEYED: _SelfKeyed = true;

// ---------------------------------------------------------------------------
// Dynamic flag families (built per nation/leader at runtime by the engine).
// The builders below mirror the canonical engine helpers named in each doc
// comment — kept local so this registry never drags engine modules (and
// their import graphs) into content files. Do not change a template here
// without changing its engine counterpart.
// ---------------------------------------------------------------------------

/** ATOMIC_<id> — research.ts (atomicFlag): secret tech level 5 reached.
 *  e.g. ATOMIC_USA, ATOMIC_GER. endgame's atomic-use choice fires on these. */
export const atomicFlag = (nation: NationId): string => `ATOMIC_${nation}`;

/** CAPITULATED_<id> — events.ts (capitulationRecordFlag): permanent record
 *  that a nation capitulated. Its surrender event has already been queued. */
export const capitulatedFlag = (nation: NationId): string => `CAPITULATED_${nation}`;

/** EXILE_<id> — victory.ts (exileFlag): a government-in-exile exists; the
 *  nation is dead on the map but not defeated for victory purposes. */
export const exileFlag = (nation: NationId): string => `EXILE_${nation}`;

/** LEADER_DEAD_<id> — effects.ts (leaderDeadFlag): raised by the killLeader
 *  effect for nation <id>; turn.ts consumes it to run succession. The engine
 *  also raises <LEADER>_DEAD (uppercased leader id — hence FLAGS.HITLER_DEAD). */
export const leaderDeadFlag = (nation: NationId): string => `LEADER_DEAD_${nation}`;

/** COVERT_BLOWBACK_<owner>_<target> — covert.ts (blowbackFlag): a covert
 *  operation by <owner> against <target> failed publicly. covertOps blowback
 *  events hook these. */
export const blowbackFlag = (owner: NationId, target: NationId): string =>
  `COVERT_BLOWBACK_${owner}_${target}`;

// Transient engine flags — prefixed '_', cleared by turn.ts at the start of
// every resolution (only the '_wardead_<id>' ledger survives). They describe
// what happened THIS turn and are engine-owned:
//   _lost_<id>          regions lost this turn (combat writes)
//   _capitulated_<id>   capitulation this turn (politics writes, events consumes)
//   _sabotage_<id>      nation under sabotage IC penalty (covert writes)
//   _nooil_<id> / _nofood_<id> / _blockade_<id>   economy shortage markers
//   _peaceseek_<id>     AI is suing for peace this turn (ai writes)
// Content MAY read them in `fires` conditions for same-turn reactions but
// MUST NEVER set one and MUST NEVER treat one as persistent state.

// ---------------------------------------------------------------------------
// Event id namespaces. Every event id in a pack starts with that pack's
// prefix (integrity tests enforce this), so ids never collide across the 13
// parallel agents. EXCEPTION: surrender events use the engine convention
// 'surrender-<NATIONID>' exactly (events.ts surrenderEventId — e.g.
// 'surrender-FRA', 'surrender-GER'); they live in whichever pack owns that
// nation but keep the surrender- id, not the pack prefix.
// ---------------------------------------------------------------------------

export const EVENT_ID_PREFIX = {
  prewar: 'pre-',
  germany: 'ger-',
  poland: 'pol-',
  ussr: 'sov-',
  uk: 'uk-',
  france: 'fra-',
  italy: 'ita-',
  japan: 'jap-',
  usa: 'usa-',
  pacific: 'pac-',
  endgame: 'end-',
  covertOps: 'cov-',
  generic: 'gen-',
} as const;

export type EventPack = keyof typeof EVENT_ID_PREFIX;

/** Id convention for a nation's surrender event (mirrors engine/events.ts). */
export const surrenderEventId = (nation: NationId): string => `surrender-${nation}`;

// ---------------------------------------------------------------------------
// CONTENT VOICE RULES (binding for every pack — from the implementation plan)
//
// 1. Period documentary voice. Write event text like a 1940s newsreel or
//    dispatch: concrete, dated, restrained. No modern idiom, no hindsight.
// 2. Length: every event `text` is 40–150 words. Choices stay terse; put
//    nuance in `detail`.
// 3. No swastika references — in text, titles, or choice labels.
// 4. No calendar-only triggers. Every `fires` condition includes at least one
//    world-state condition (flag, atWar, relations, tension, controls, ...).
//    `turnAtLeast` is allowed only as a floor alongside such a condition.
// 5. Atrocities are acknowledged through chronicle entries (the
//    { t: 'chronicle' } effect), never gamified as mechanics, choices, or
//    bonuses.
// 6. Events are pure serializable data: no closures, no functions, no Date,
//    no Math.random. Ids, nations, regions, leaders, and flags must all be
//    real — integrity tests check every reference.
// ---------------------------------------------------------------------------
