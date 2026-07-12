// The zustand store: the only stateful layer between the pure engine and the
// React shell. Player order actions rewrite `game` immutably (new GameState
// objects, engine-style structural copies) BEFORE resolution; endTurn() then
// hands the ordered state to resolveTurn. All persistence (localStorage,
// Date.now for default seeds and save timestamps) lives here, outside the
// engine, so the engine stays pure and deterministic.
//
// Save format: localStorage key 'fulcrum-save-{slot}' holds
// { v: 1, savedAt: epoch-ms, game: GameState }. Slot 0 is the autosave,
// written after every endTurn. Slots 1-3 are manual. importJSON accepts
// either the envelope or a bare GameState.

import { create } from 'zustand';
import type {
  Army,
  CovertMission,
  GameState,
  NationId,
  Posture,
  RegionId,
  TechTrack,
} from './engine/types';
import { buildInitialState } from './engine/setup';
import { resolveTurn } from './engine/turn';
import { resolveChoice } from './engine/events';
import { applyEffects } from './engine/effects';
import { startMission } from './engine/covert';
import { buyOnMarket, proposeTradePact, requestAid, type Resource } from './engine/trade';
import { hashSeed, turnRng } from './engine/rng';
import { SECRET_REQUIRES_INDUSTRY, TECH_MAX } from './engine/balance';
import { ALL_EVENTS } from './data/events/index';
import { REGIONS } from './data/regions';

// ---------------------------------------------------------------------------
// UI-level tunables. These are store policy, not simulation formulas, so they
// live here rather than in balance.ts (which this task must not edit). The
// Task 14 balance pass may lift IMPROVE_RELATIONS_DELTA into balance.ts.
// ---------------------------------------------------------------------------

/** Diplomatic outreach: +5 relations, both directions, once per target per turn. */
const IMPROVE_RELATIONS_DELTA = 5;

export const AUTOSAVE_SLOT = 0;
export const MANUAL_SLOTS = [1, 2, 3] as const;
const SAVE_VERSION = 1;
const SAVE_KEY_PREFIX = 'fulcrum-save-';

export const saveKey = (slot: number): string => `${SAVE_KEY_PREFIX}${slot}`;

/**
 * Once-per-turn latch for improveRelations. The '_' prefix marks it transient:
 * turn.ts clears all such flags at the start of the next resolution, so the
 * action becomes available again each new turn without any store bookkeeping.
 */
export const improvedRelationsFlag = (target: NationId): string => `_improved_${target}`;

// ---------------------------------------------------------------------------
// localStorage plumbing (every touch wrapped in try/catch; storage may be
// absent, full, or blocked by the browser)
// ---------------------------------------------------------------------------

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

interface SaveFile {
  v: number;
  savedAt: number;
  game: GameState;
}

function isGameState(v: unknown): v is GameState {
  if (typeof v !== 'object' || v === null) return false;
  const g = v as Record<string, unknown>;
  return (
    typeof g.seed === 'number' &&
    typeof g.turn === 'number' &&
    typeof g.playerNation === 'string' &&
    typeof g.nations === 'object' && g.nations !== null &&
    typeof g.regions === 'object' && g.regions !== null &&
    Array.isArray(g.wars) &&
    Array.isArray(g.pendingChoices) &&
    Array.isArray(g.firedEvents)
  );
}

function encodeSave(game: GameState): string {
  const file: SaveFile = { v: SAVE_VERSION, savedAt: Date.now(), game };
  return JSON.stringify(file);
}

/** Accepts a { v, savedAt, game } envelope or a bare GameState JSON. */
function decodeSave(raw: string): GameState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isGameState(parsed)) return parsed;
    if (typeof parsed === 'object' && parsed !== null) {
      const maybe = (parsed as Record<string, unknown>).game;
      if (isGameState(maybe)) return maybe;
    }
    return null;
  } catch {
    return null;
  }
}

function writeSlot(slot: number, game: GameState): boolean {
  const s = storage();
  if (s === null) return false;
  try {
    s.setItem(saveKey(slot), encodeSave(game));
    return true;
  } catch {
    return false;
  }
}

function readSlot(slot: number): GameState | null {
  const s = storage();
  if (s === null) return null;
  try {
    const raw = s.getItem(saveKey(slot));
    return raw === null ? null : decodeSave(raw);
  } catch {
    return null;
  }
}

/** Peek at a slot for the SaveLoad menu without loading it. */
export function slotSummary(slot: number): { turn: number; nation: NationId } | null {
  const game = readSlot(slot);
  return game === null ? null : { turn: game.turn, nation: game.playerNation };
}

// ---------------------------------------------------------------------------
// Default seed. Date.now() is allowed here (the store sits outside the
// engine); the hash folds in the nation id so two games started the same
// millisecond as different nations still diverge.
// ---------------------------------------------------------------------------

function defaultSeed(nation: NationId): number {
  let acc = 0;
  for (let i = 0; i < nation.length; i += 1) acc = (acc * 31 + nation.charCodeAt(i)) >>> 0;
  return hashSeed(Date.now() >>> 0, acc);
}

// ---------------------------------------------------------------------------
// Immutable player-order helpers
// ---------------------------------------------------------------------------

/** Rewrite one of the player's armies; null when the army does not exist. */
function withPlayerArmy(
  game: GameState,
  armyId: string,
  patch: (a: Army) => Army,
): GameState | null {
  const me = game.nations[game.playerNation];
  if (!me) return null;
  const idx = me.armies.findIndex((a) => a.id === armyId);
  if (idx === -1) return null;
  const armies = me.armies.slice();
  armies[idx] = patch(armies[idx]);
  return {
    ...game,
    nations: { ...game.nations, [game.playerNation]: { ...me, armies } },
  };
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

export type Screen = 'picker' | 'game' | 'end';

export interface FulcrumStore {
  game: GameState | null;
  screen: Screen;
  selectedRegion: RegionId | null;

  newGame: (nation: NationId, seed?: number) => void;
  reset: () => void;
  endTurn: () => void;
  chooseEvent: (eventId: string, choiceIndex: number) => void;

  setSelectedRegion: (region: RegionId | null) => void;
  setPosture: (armyId: string, posture: Posture) => void;
  moveArmy: (armyId: string, region: RegionId) => void;
  setAllocation: (alloc: { army: number; air: number; navy: number; civilian: number }) => void;
  setResearch: (track: TechTrack | null) => void;
  startCovert: (target: NationId, type: CovertMission['type']) => void;
  improveRelations: (target: NationId) => void;
  guarantee: (target: NationId) => void;
  requestAid: (target: NationId, resource: Resource) => void;
  proposeTradePact: (target: NationId) => void;
  buyOnMarket: (resource: Resource, units: number) => void;

  saveSlot: (slot: number) => boolean;
  loadSlot: (slot: number) => boolean;
  exportJSON: () => string | null;
  importJSON: (text: string) => boolean;
}

/** True when the player may still issue orders on this game. */
const orderable = (game: GameState | null): game is GameState =>
  game !== null && game.gameOver === null;

export const useStore = create<FulcrumStore>()((set, get) => ({
  game: null,
  screen: 'picker',
  selectedRegion: null,

  newGame: (nation, seed) => {
    const s = seed === undefined ? defaultSeed(nation) : seed >>> 0;
    set({ game: buildInitialState(nation, s), screen: 'game', selectedRegion: null });
  },

  reset: () => set({ game: null, screen: 'picker', selectedRegion: null }),

  endTurn: () => {
    const { game } = get();
    // Pending decisions block resolution; the TopBar disables the button too.
    if (!orderable(game) || game.pendingChoices.length > 0) return;
    const next = resolveTurn(game);
    writeSlot(AUTOSAVE_SLOT, next); // autosave; failure is non-fatal
    set({ game: next, screen: next.gameOver !== null ? 'end' : 'game' });
  },

  chooseEvent: (eventId, choiceIndex) => {
    const { game } = get();
    if (!orderable(game)) return;
    const next = resolveChoice(game, eventId, choiceIndex, turnRng(game.seed, game.turn), ALL_EVENTS);
    set({ game: next, screen: next.gameOver !== null ? 'end' : 'game' });
  },

  setSelectedRegion: (region) => set({ selectedRegion: region }),

  setPosture: (armyId, posture) => {
    const { game } = get();
    if (!orderable(game)) return;
    const next = withPlayerArmy(game, armyId, (a) =>
      a.posture === posture ? a : { ...a, posture },
    );
    if (next !== null) set({ game: next });
  },

  moveArmy: (armyId, region) => {
    const { game } = get();
    if (!orderable(game)) return;
    const me = game.nations[game.playerNation];
    const army = me?.armies.find((a) => a.id === armyId);
    if (!army) return;
    // Ordering the army to its own region cancels a pending redeploy.
    if (region === army.location) {
      const next = withPlayerArmy(game, armyId, (a) => ({ ...a, moveTarget: null }));
      if (next !== null) set({ game: next });
      return;
    }
    // One adjacent step per turn, same as the AI's redeploy rule; the engine's
    // arrival pass would happily teleport, so the store is the gatekeeper.
    if (game.regions[region] === undefined) return;
    if (!(REGIONS[army.location]?.adjacent ?? []).includes(region)) return;
    const next = withPlayerArmy(game, armyId, (a) => ({ ...a, moveTarget: region }));
    if (next !== null) set({ game: next });
  },

  setAllocation: (alloc) => {
    const { game } = get();
    if (!orderable(game)) return;
    const me = game.nations[game.playerNation];
    if (!me) return;
    const army = Math.max(0, alloc.army);
    const air = Math.max(0, alloc.air);
    const navy = Math.max(0, alloc.navy);
    const civilian = Math.max(0, alloc.civilian);
    const sum = army + air + navy + civilian;
    if (sum <= 0) return;
    // Normalized so the contract's sums-to-1 invariant holds whatever the UI sends.
    const icAllocation = { army: army / sum, air: air / sum, navy: navy / sum, civilian: civilian / sum };
    set({
      game: {
        ...game,
        nations: { ...game.nations, [game.playerNation]: { ...me, icAllocation } },
      },
    });
  },

  setResearch: (track) => {
    const { game } = get();
    if (!orderable(game)) return;
    const me = game.nations[game.playerNation];
    if (!me || me.research.track === track) return;
    if (track !== null) {
      if (me.tech[track] >= TECH_MAX) return;
      if (track === 'secret' && me.tech.industry < SECRET_REQUIRES_INDUSTRY) return;
    }
    // Switching tracks abandons accumulated progress; it belongs to the old track.
    set({
      game: {
        ...game,
        nations: {
          ...game.nations,
          [game.playerNation]: { ...me, research: { track, progress: 0 } },
        },
      },
    });
  },

  startCovert: (target, type) => {
    const { game } = get();
    if (!orderable(game)) return;
    // startMission validates (network thresholds, liveness, one mission per
    // target) and returns the input state unchanged when refused.
    const next = startMission(game, game.playerNation, target, type);
    if (next !== game) set({ game: next });
  },

  improveRelations: (target) => {
    const { game } = get();
    if (!orderable(game)) return;
    const me = game.playerNation;
    const t = game.nations[target];
    if (target === me || !t || !t.alive) return;
    if (game.flags[improvedRelationsFlag(target)] === true) return; // once per target per turn
    const next = applyEffects(
      [{ t: 'relations', a: me, b: target, delta: IMPROVE_RELATIONS_DELTA }],
      game,
      turnRng(game.seed, game.turn),
    );
    set({
      game: { ...next, flags: { ...next.flags, [improvedRelationsFlag(target)]: true } },
    });
  },

  guarantee: (target) => {
    const { game } = get();
    if (!orderable(game)) return;
    const me = game.nations[game.playerNation];
    const t = game.nations[target];
    if (target === game.playerNation || !me || !t || !t.alive) return;
    if (me.guarantees.includes(target)) return;
    const next = applyEffects(
      [{ t: 'guarantee', by: game.playerNation, of: target }],
      game,
      turnRng(game.seed, game.turn),
    );
    set({ game: next });
  },

  requestAid: (target, resource) => {
    const { game } = get();
    if (!orderable(game)) return;
    const next = requestAid(game, game.playerNation, target, resource);
    if (next !== game) set({ game: next });
  },

  proposeTradePact: (target) => {
    const { game } = get();
    if (!orderable(game)) return;
    const next = proposeTradePact(game, game.playerNation, target);
    if (next !== game) set({ game: next });
  },

  buyOnMarket: (resource, units) => {
    const { game } = get();
    if (!orderable(game)) return;
    const next = buyOnMarket(game, game.playerNation, resource, units);
    if (next !== game) set({ game: next });
  },

  saveSlot: (slot) => {
    const { game } = get();
    if (game === null) return false;
    return writeSlot(slot, game);
  },

  loadSlot: (slot) => {
    const game = readSlot(slot);
    if (game === null) return false;
    set({ game, screen: game.gameOver !== null ? 'end' : 'game', selectedRegion: null });
    return true;
  },

  exportJSON: () => {
    const { game } = get();
    return game === null ? null : encodeSave(game);
  },

  importJSON: (text) => {
    const game = decodeSave(text);
    if (game === null) return false;
    set({ game, screen: game.gameOver !== null ? 'end' : 'game', selectedRegion: null });
    return true;
  },
}));
