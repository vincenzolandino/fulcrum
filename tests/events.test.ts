// Events engine tests: once-only firing, priority ordering, player vs AI
// routing, weighted auto-choice, the queue, the modal cap, and the
// capitulation convention.

import { describe, expect, it } from 'vitest';
import type { Effect, EventChoice, GameEvent, GameState } from '../src/engine/types';
import {
  autoResolvePendingChoices,
  capitulationRecordFlag,
  getEvent,
  resolveChoice,
  runEvents,
} from '../src/engine/events';
import { makeRng } from '../src/engine/rng';
import { MAX_PLAYER_EVENTS_PER_TURN } from '../src/engine/balance';
import { deepFreeze, fixedRng, makeTestState } from './fixtures';

// GameEvent factory with sensible defaults; player nation in fixtures is POL.
const mkEvent = (over: Partial<GameEvent> & { id: string }): GameEvent => ({
  title: over.id,
  nation: 'GER',
  fires: { t: 'always' },
  once: true,
  priority: 0,
  text: 'Fixture event.',
  choices: [{ label: 'Acknowledge', effects: [] }],
  ...over,
});

const choiceWith = (effects: Effect[], over: Partial<EventChoice> = {}): EventChoice => ({
  label: 'Do it',
  effects,
  ...over,
});

const flagEffect = (key: string, value: number | boolean | string = true): Effect => ({
  t: 'flag',
  key,
  value,
});

describe('getEvent', () => {
  it('finds events by id and returns undefined for unknown ids', () => {
    const events = [mkEvent({ id: 'a' }), mkEvent({ id: 'b' })];
    expect(getEvent(events, 'b')?.id).toBe('b');
    expect(getEvent(events, 'zzz')).toBeUndefined();
  });
});

describe('runEvents: firing basics', () => {
  it('fires a once-event exactly once', () => {
    const events = [
      mkEvent({ id: 'e1', choices: [choiceWith([{ t: 'addFlag', key: 'COUNT', delta: 1 }])] }),
    ];
    const s0 = deepFreeze(makeTestState());
    const s1 = runEvents(s0, makeRng(1), events);
    expect(s1.flags.COUNT).toBe(1);
    expect(s1.firedEvents).toContain('e1');
    const s2 = runEvents(s1, makeRng(2), events);
    expect(s2.flags.COUNT).toBe(1); // did not fire again
    expect(s2.firedEvents.filter((id) => id === 'e1')).toHaveLength(1);
  });

  it('re-fires a repeatable (once: false) event on later calls', () => {
    const events = [
      mkEvent({
        id: 'rep',
        once: false,
        choices: [choiceWith([{ t: 'addFlag', key: 'COUNT', delta: 1 }])],
      }),
    ];
    let s = makeTestState();
    s = runEvents(s, makeRng(1), events);
    s = runEvents(s, makeRng(2), events);
    expect(s.flags.COUNT).toBe(2);
  });

  it('fires in priority-descending order', () => {
    const events = [
      mkEvent({ id: 'low', priority: 1, choices: [choiceWith([{ t: 'chronicle', text: 'low' }])] }),
      mkEvent({ id: 'high', priority: 5, choices: [choiceWith([{ t: 'chronicle', text: 'high' }])] }),
    ];
    const out = runEvents(makeTestState(), makeRng(1), events);
    expect(out.chronicle.map((c) => c.text)).toEqual(['high', 'low']);
  });

  it('skips events whose fires condition is false', () => {
    const events = [mkEvent({ id: 'no', fires: { t: 'never' }, choices: [choiceWith([flagEffect('NO')])] })];
    const out = runEvents(makeTestState(), makeRng(1), events);
    expect(out.flags.NO).toBeUndefined();
    expect(out.firedEvents).toHaveLength(0);
  });
});

describe('runEvents: player routing vs AI auto-resolve', () => {
  it('routes the player nation\'s events to pendingChoices without applying effects', () => {
    const events = [mkEvent({ id: 'pol-e', nation: 'POL', choices: [choiceWith([flagEffect('X')])] })];
    const out = runEvents(deepFreeze(makeTestState()), makeRng(1), events);
    expect(out.pendingChoices).toEqual([{ eventId: 'pol-e' }]);
    expect(out.flags.X).toBeUndefined();
    expect(out.firedEvents).not.toContain('pol-e');
  });

  it('does not re-pend an event already awaiting the player', () => {
    const events = [mkEvent({ id: 'pol-e', nation: 'POL' })];
    let s = runEvents(makeTestState(), makeRng(1), events);
    s = runEvents(s, makeRng(2), events);
    expect(s.pendingChoices).toEqual([{ eventId: 'pol-e' }]);
  });

  it('auto-resolves AI events with an aiWeight-weighted pick', () => {
    const events = [
      mkEvent({
        id: 'ger-e',
        nation: 'GER',
        choices: [
          choiceWith([flagEffect('FIRST')], { aiWeight: 1 }),
          choiceWith([flagEffect('SECOND')], { aiWeight: 3 }),
        ],
      }),
    ];
    // total weight 4: draw 0.9 → 3.6 lands in the second choice's band [1, 4)
    const high = runEvents(makeTestState(), fixedRng([0.9]), events);
    expect(high.flags.SECOND).toBe(true);
    expect(high.flags.FIRST).toBeUndefined();
    // draw 0.1 → 0.4 lands in the first choice's band [0, 1)
    const low = runEvents(makeTestState(), fixedRng([0.1]), events);
    expect(low.flags.FIRST).toBe(true);
    expect(low.flags.SECOND).toBeUndefined();
    expect(low.firedEvents).toContain('ger-e');
  });

  it('auto-resolve respects choice availability', () => {
    const events = [
      mkEvent({
        id: 'gated',
        nation: 'GER',
        choices: [
          choiceWith([flagEffect('BLOCKED')], { available: { t: 'never' }, aiWeight: 100 }),
          choiceWith([flagEffect('OPEN')], { aiWeight: 1 }),
        ],
      }),
    ];
    const out = runEvents(makeTestState(), makeRng(1), events);
    expect(out.flags.OPEN).toBe(true);
    expect(out.flags.BLOCKED).toBeUndefined();
  });

  it('routes global events to the player when an effect names a war enemy', () => {
    const s = makeTestState();
    s.wars = [{ id: 'w1', attackers: ['GER'], defenders: ['POL'], startTurn: 0 }];
    const events = [
      mkEvent({
        id: 'glob-enemy',
        nation: 'global',
        choices: [choiceWith([{ t: 'stability', nation: 'GER', delta: -5 }])],
      }),
    ];
    const out = runEvents(s, makeRng(1), events);
    expect(out.pendingChoices).toEqual([{ eventId: 'glob-enemy' }]);
  });

  it('routes global events to the player when an effect targets the player directly', () => {
    const events = [
      mkEvent({
        id: 'glob-player',
        nation: 'global',
        choices: [choiceWith([{ t: 'warSupport', nation: 'POL', delta: 5 }])],
      }),
    ];
    const out = runEvents(makeTestState(), makeRng(1), events);
    expect(out.pendingChoices).toEqual([{ eventId: 'glob-player' }]);
  });

  it('auto-resolves global events that do not involve the player', () => {
    const events = [
      mkEvent({
        id: 'glob-far',
        nation: 'global',
        choices: [choiceWith([{ t: 'stability', nation: 'FRA', delta: -5 }])],
      }),
    ];
    const s = makeTestState(); // POL at war with nobody; FRA untouched by POL
    const out = runEvents(s, makeRng(1), events);
    expect(out.pendingChoices).toHaveLength(0);
    expect(out.firedEvents).toContain('glob-far');
    expect(out.nations.FRA.stability).toBe(makeTestState().nations.FRA.stability - 5);
  });
});

describe('runEvents: player modal cap', () => {
  it('caps pending player events per turn and defers the rest by priority', () => {
    const events = [1, 2, 3, 4].map((n) =>
      mkEvent({ id: `p${n}`, nation: 'POL', priority: n }),
    );
    let s = runEvents(makeTestState(), makeRng(1), events);
    expect(s.pendingChoices.map((p) => p.eventId)).toEqual(['p4', 'p3', 'p2']);
    expect(s.pendingChoices).toHaveLength(MAX_PLAYER_EVENTS_PER_TURN);

    // Still capped while the inbox is full.
    s = runEvents(s, makeRng(2), events);
    expect(s.pendingChoices).toHaveLength(MAX_PLAYER_EVENTS_PER_TURN);

    // Answering one frees a slot for the deferred event.
    s = resolveChoice(s, 'p4', 0, makeRng(3), events);
    s = runEvents(s, makeRng(4), events);
    expect(s.pendingChoices.map((p) => p.eventId)).toContain('p1');
    expect(s.pendingChoices).toHaveLength(MAX_PLAYER_EVENTS_PER_TURN);
  });
});

describe('runEvents: queued events', () => {
  it('honors the queue delay and fires when due despite a never condition', () => {
    const events = [
      mkEvent({ id: 'delayed', fires: { t: 'never' }, choices: [choiceWith([flagEffect('DUE')])] }),
    ];
    const s0 = makeTestState();
    s0.queuedEvents = [{ id: 'delayed', fireTurn: 2 }];

    const early = runEvents(s0, makeRng(1), events);
    expect(early.flags.DUE).toBeUndefined();
    expect(early.queuedEvents).toEqual([{ id: 'delayed', fireTurn: 2 }]);

    const atDue = runEvents({ ...early, turn: 2 }, makeRng(2), events);
    expect(atDue.flags.DUE).toBe(true);
    expect(atDue.queuedEvents).toHaveLength(0);
    expect(atDue.firedEvents).toContain('delayed');
  });

  it('re-queues a due player event for next turn when the modal cap is hit', () => {
    const events = [
      ...[1, 2, 3].map((n) => mkEvent({ id: `p${n}`, nation: 'POL', priority: n })),
      mkEvent({ id: 'q-player', nation: 'POL', fires: { t: 'never' } }),
    ];
    const s0 = makeTestState();
    s0.pendingChoices = [{ eventId: 'p1' }, { eventId: 'p2' }, { eventId: 'p3' }];
    s0.queuedEvents = [{ id: 'q-player', fireTurn: 0 }];
    const out = runEvents(s0, makeRng(1), events);
    expect(out.pendingChoices).toHaveLength(3);
    expect(out.queuedEvents).toEqual([{ id: 'q-player', fireTurn: 1 }]);
  });
});

describe('resolveChoice', () => {
  it('applies effects, marks fired, and removes the pending entry', () => {
    const events = [
      mkEvent({
        id: 'pol-e',
        nation: 'POL',
        choices: [choiceWith([flagEffect('CHOSEN')]), choiceWith([flagEffect('OTHER')])],
      }),
    ];
    const s0 = runEvents(makeTestState(), makeRng(1), events);
    const out = resolveChoice(deepFreeze(s0), 'pol-e', 0, makeRng(2), events);
    expect(out.flags.CHOSEN).toBe(true);
    expect(out.flags.OTHER).toBeUndefined();
    expect(out.firedEvents).toContain('pol-e');
    expect(out.pendingChoices).toHaveLength(0);
  });

  it('is a no-op for unavailable choices, bad indices, and unknown events', () => {
    const events = [
      mkEvent({
        id: 'pol-e',
        nation: 'POL',
        choices: [
          choiceWith([flagEffect('LOCKED')], { available: { t: 'never' } }),
          choiceWith([flagEffect('OK')]),
        ],
      }),
    ];
    const s0 = runEvents(makeTestState(), makeRng(1), events);
    expect(resolveChoice(s0, 'pol-e', 0, makeRng(2), events)).toBe(s0);
    expect(resolveChoice(s0, 'pol-e', 9, makeRng(2), events)).toBe(s0);
    expect(resolveChoice(s0, 'ghost', 0, makeRng(2), events)).toBe(s0);
    const out = resolveChoice(s0, 'pol-e', 1, makeRng(2), events);
    expect(out.flags.OK).toBe(true);
  });
});

describe('autoResolvePendingChoices', () => {
  it('resolves every pending choice by aiWeight and empties the inbox', () => {
    const events = [
      mkEvent({ id: 'a', nation: 'POL', choices: [choiceWith([flagEffect('A')])] }),
      mkEvent({ id: 'b', nation: 'POL', choices: [choiceWith([flagEffect('B')])] }),
    ];
    const s0 = runEvents(makeTestState(), makeRng(1), events);
    expect(s0.pendingChoices).toHaveLength(2);
    const out = autoResolvePendingChoices(s0, makeRng(2), events);
    expect(out.pendingChoices).toHaveLength(0);
    expect(out.flags.A).toBe(true);
    expect(out.flags.B).toBe(true);
    expect(out.firedEvents).toEqual(expect.arrayContaining(['a', 'b']));
  });
});

describe('runEvents: capitulation convention', () => {
  it('annexes a capitulated nation to its strongest enemy when no surrender event exists', () => {
    const s = makeTestState();
    s.wars = [{ id: 'w1', attackers: ['GER'], defenders: ['POL'], startTurn: 0 }];
    s.flags['_capitulated_POL'] = true;
    const out = runEvents(deepFreeze(s), makeRng(1), []);
    expect(out.nations.POL.alive).toBe(false);
    expect(out.regions['pol-warsaw'].controller).toBe('GER');
    expect(out.regions['pol-danzig'].controller).toBe('GER');
    expect(out.flags[capitulationRecordFlag('POL')]).toBe(true);
    const entry = out.chronicle.find((c) => c.text.includes('Poland has capitulated'));
    expect(entry).toBeDefined();
    expect(entry?.divergence).toBe(true);
  });

  it('queues and routes the surrender event instead when the content defines one', () => {
    const s = makeTestState();
    s.wars = [{ id: 'w1', attackers: ['GER'], defenders: ['POL'], startTurn: 0 }];
    s.flags['_capitulated_POL'] = true;
    const events = [
      mkEvent({ id: 'surrender-POL', nation: 'POL', fires: { t: 'never' } }),
    ];
    const out = runEvents(s, makeRng(1), events);
    expect(out.nations.POL.alive).toBe(true); // no auto-annex
    expect(out.pendingChoices).toEqual([{ eventId: 'surrender-POL' }]);
    expect(out.flags[capitulationRecordFlag('POL')]).toBe(true);
  });

  it('does nothing for a capitulated nation with no living enemies', () => {
    const s = makeTestState();
    s.flags['_capitulated_POL'] = true; // no wars at all
    const out = runEvents(s, makeRng(1), []);
    expect(out.nations.POL.alive).toBe(true);
  });
});
