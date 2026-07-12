// Store tests: game lifecycle (newGame -> endTurn), player orders applied
// immutably before resolution, once-per-turn diplomacy latch, and the full
// save/load/export/import surface against a localStorage mock.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { improvedRelationsFlag, saveKey, useStore } from '../src/store';
import { REGIONS } from '../src/data/regions';
import { SECRET_REQUIRES_INDUSTRY } from '../src/engine/balance';

// ---- localStorage mock (deterministic, inspectable) ----
class LocalStorageMock implements Storage {
  private map = new Map<string, string>();
  get length(): number { return this.map.size; }
  clear(): void { this.map.clear(); }
  getItem(key: string): string | null { return this.map.get(key) ?? null; }
  setItem(key: string, value: string): void { this.map.set(key, String(value)); }
  removeItem(key: string): void { this.map.delete(key); }
  key(index: number): string | null { return [...this.map.keys()][index] ?? null; }
}

const storageMock = new LocalStorageMock();
vi.stubGlobal('localStorage', storageMock);

const resetStore = (): void => {
  useStore.setState({ game: null, screen: 'picker', selectedRegion: null });
};

const game = () => {
  const g = useStore.getState().game;
  if (g === null) throw new Error('expected a game');
  return g;
};

// Advance one month the way a player does: settle any decisions the world
// raised, then end the turn. endTurn() intentionally blocks while a decision
// is pending, so a bare endTurn() no longer advances once real events fire.
const advance = (): void => {
  let guard = 0;
  while (guard++ < 40) {
    const g = useStore.getState().game;
    if (g === null || g.pendingChoices.length === 0) break;
    useStore.getState().chooseEvent(g.pendingChoices[0].eventId, 0);
  }
  const g = useStore.getState().game;
  if (g !== null && g.gameOver === null) useStore.getState().endTurn();
};

beforeEach(() => {
  storageMock.clear();
  resetStore();
});

describe('newGame / endTurn', () => {
  it('newGame builds turn-0 state on the requested seed and enters the game screen', () => {
    useStore.getState().newGame('GER', 42);
    const g = game();
    expect(g.turn).toBe(0);
    expect(g.seed).toBe(42);
    expect(g.playerNation).toBe('GER');
    expect(useStore.getState().screen).toBe('game');
  });

  it('newGame without a seed picks a numeric default', () => {
    useStore.getState().newGame('POL');
    const g = game();
    expect(Number.isFinite(g.seed)).toBe(true);
    expect(g.seed).toBeGreaterThanOrEqual(0);
  });

  it('endTurn advances the turn without mutating the previous state, and autosaves to slot 0', () => {
    useStore.getState().newGame('GER', 42);
    const before = game();
    useStore.getState().endTurn();
    const after = game();
    expect(after.turn).toBe(1);
    expect(after).not.toBe(before);
    expect(before.turn).toBe(0); // input state untouched

    const raw = storageMock.getItem(saveKey(0));
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as { v: number; game: { turn: number } };
    expect(parsed.v).toBe(1);
    expect(parsed.game.turn).toBe(1);
  });

  it('endTurn is blocked while decisions are pending', () => {
    useStore.getState().newGame('GER', 42);
    useStore.setState({ game: { ...game(), pendingChoices: [{ eventId: 'evt-x' }] } });
    useStore.getState().endTurn();
    expect(game().turn).toBe(0);
  });

  it('same seed and same actions give an identical world', () => {
    const run = (): string => {
      resetStore();
      useStore.getState().newGame('GER', 1938);
      useStore.getState().endTurn();
      useStore.getState().endTurn();
      useStore.getState().endTurn();
      return JSON.stringify(game());
    };
    expect(run()).toBe(run());
  });

  it('chooseEvent on an unknown event leaves the state untouched', () => {
    useStore.getState().newGame('GER', 42);
    const before = game();
    useStore.getState().chooseEvent('no-such-event', 0);
    expect(game()).toBe(before);
  });
});

describe('player orders', () => {
  it('setPosture rewrites only the targeted army, immutably', () => {
    useStore.getState().newGame('GER', 42);
    const before = game();
    const armyId = before.nations.GER.armies[0].id;
    useStore.getState().setPosture(armyId, 'offensive');
    const after = game();
    expect(after.nations.GER.armies[0].posture).toBe('offensive');
    expect(before.nations.GER.armies[0].posture).toBe('hold');
    expect(after.nations.GER.armies[1]).toBe(before.nations.GER.armies[1]);
  });

  it('moveArmy accepts one adjacent step and rejects teleports', () => {
    useStore.getState().newGame('GER', 42);
    const army = game().nations.GER.armies[0];
    const neighbour = REGIONS[army.location].adjacent[0];
    useStore.getState().moveArmy(army.id, 'usa-west'); // the far side of the world
    expect(game().nations.GER.armies[0].moveTarget).toBeNull();
    useStore.getState().moveArmy(army.id, neighbour);
    expect(game().nations.GER.armies[0].moveTarget).toBe(neighbour);
    // Re-targeting the army's own region cancels the order.
    useStore.getState().moveArmy(army.id, army.location);
    expect(game().nations.GER.armies[0].moveTarget).toBeNull();
  });

  it('setAllocation normalizes to sum 1', () => {
    useStore.getState().newGame('GER', 42);
    useStore.getState().setAllocation({ army: 2, air: 1, navy: 1, civilian: 0 });
    const alloc = game().nations.GER.icAllocation;
    expect(alloc.army).toBeCloseTo(0.5);
    expect(alloc.air).toBeCloseTo(0.25);
    expect(alloc.navy).toBeCloseTo(0.25);
    expect(alloc.civilian).toBeCloseTo(0);
    expect(alloc.army + alloc.air + alloc.navy + alloc.civilian).toBeCloseTo(1);
  });

  it('setResearch sets the track and gates the secret track on industry', () => {
    useStore.getState().newGame('POL', 42);
    expect(game().nations.POL.tech.industry).toBeLessThan(SECRET_REQUIRES_INDUSTRY);
    useStore.getState().setResearch('secret');
    expect(game().nations.POL.research.track).toBeNull(); // refused
    useStore.getState().setResearch('armor');
    expect(game().nations.POL.research.track).toBe('armor');

    resetStore();
    useStore.getState().newGame('GER', 42);
    useStore.getState().setResearch('secret'); // GER industry 2 clears the gate
    expect(game().nations.GER.research.track).toBe('secret');
  });

  it('startCovert enqueues a mission through the engine validator', () => {
    useStore.getState().newGame('GER', 42);
    useStore.getState().startCovert('POL', 'buildNetwork');
    expect(game().missions).toHaveLength(1);
    expect(game().missions[0]).toMatchObject({ owner: 'GER', target: 'POL', type: 'buildNetwork' });
    // Below the network threshold, an operation is refused.
    useStore.getState().startCovert('POL', 'assassinate');
    expect(game().missions).toHaveLength(1);
  });

  it('improveRelations gives +5 both ways, once per target per turn', () => {
    useStore.getState().newGame('GER', 42);
    const before = game().nations.GER.relations.POL ?? 0;
    useStore.getState().improveRelations('POL');
    const g1 = game();
    expect(g1.nations.GER.relations.POL).toBe(Math.min(100, before + 5));
    expect(g1.nations.POL.relations.GER).toBe(Math.min(100, before + 5));
    expect(g1.flags[improvedRelationsFlag('POL')]).toBe(true);
    // Latched for the rest of the turn.
    useStore.getState().improveRelations('POL');
    expect(game().nations.GER.relations.POL).toBe(Math.min(100, before + 5));
    // The latch is a transient flag; resolution clears it for the next turn.
    useStore.getState().endTurn();
    expect(game().flags[improvedRelationsFlag('POL')]).toBeUndefined();
  });

  it('guarantee adds the target once', () => {
    useStore.getState().newGame('UK', 42);
    useStore.getState().guarantee('POL');
    expect(game().nations.UK.guarantees).toContain('POL');
    const count = game().nations.UK.guarantees.length;
    useStore.getState().guarantee('POL');
    expect(game().nations.UK.guarantees).toHaveLength(count);
  });
});

describe('save / load / export / import', () => {
  it('saveSlot then loadSlot roundtrips the exact game state', () => {
    useStore.getState().newGame('POL', 7);
    advance();
    const saved = game();
    expect(useStore.getState().saveSlot(1)).toBe(true);
    advance();
    expect(game().turn).toBe(2);
    expect(useStore.getState().loadSlot(1)).toBe(true);
    expect(game().turn).toBe(1);
    expect(game().playerNation).toBe('POL');
    expect(JSON.stringify(game())).toBe(JSON.stringify(saved));
    expect(useStore.getState().screen).toBe('game');
  });

  it('loadSlot on an empty slot fails without touching the game', () => {
    useStore.getState().newGame('GER', 42);
    const before = game();
    expect(useStore.getState().loadSlot(3)).toBe(false);
    expect(game()).toBe(before);
  });

  it('exportJSON / importJSON roundtrips, and import rejects garbage', () => {
    useStore.getState().newGame('FRA', 11);
    advance();
    const exported = useStore.getState().exportJSON();
    expect(exported).not.toBeNull();
    advance();
    expect(game().turn).toBe(2);
    expect(useStore.getState().importJSON(exported as string)).toBe(true);
    expect(game().turn).toBe(1);
    expect(game().playerNation).toBe('FRA');

    expect(useStore.getState().importJSON('not even json')).toBe(false);
    expect(useStore.getState().importJSON('{"foo": 1}')).toBe(false);
    expect(game().turn).toBe(1); // failures leave the game alone
  });

  it('saveSlot with no game fails; exportJSON with no game is null', () => {
    expect(useStore.getState().saveSlot(1)).toBe(false);
    expect(useStore.getState().exportJSON()).toBeNull();
  });

  it('survives a throwing localStorage', () => {
    const broken = {
      getItem: () => { throw new Error('quota'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('quota'); },
      clear: () => { throw new Error('quota'); },
      key: () => null,
      length: 0,
    } as unknown as Storage;
    vi.stubGlobal('localStorage', broken);
    try {
      useStore.getState().newGame('GER', 42);
      expect(() => useStore.getState().endTurn()).not.toThrow(); // autosave failure is non-fatal
      expect(game().turn).toBe(1);
      expect(useStore.getState().saveSlot(1)).toBe(false);
      expect(useStore.getState().loadSlot(1)).toBe(false);
    } finally {
      vi.stubGlobal('localStorage', storageMock);
    }
  });
});
