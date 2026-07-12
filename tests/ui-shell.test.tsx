// Shell smoke tests: the picker lists every 1938 nation with faction groups
// and difficulty tags, picking a nation starts a campaign, the TopBar shows
// the war-room vitals and drives End Turn, and the SaveLoad menu works
// end to end through the DOM.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from '../src/App';
import { useStore } from '../src/store';
import { NATION_IDS, MAJOR_IDS } from '../src/data/nations';

beforeEach(() => {
  localStorage.clear();
  act(() => {
    useStore.setState({ game: null, screen: 'picker', selectedRegion: null });
  });
});

afterEach(cleanup);

// Settle any forced decisions the way the EventModal does, so End Turn is
// unblocked. With the real event library wired in, the opening months raise
// decisions that endTurn() waits on.
const resolvePending = (): void =>
  act(() => {
    for (let i = 0; i < 40; i++) {
      const g = useStore.getState().game;
      if (g === null || g.pendingChoices.length === 0) break;
      useStore.getState().chooseEvent(g.pendingChoices[0].eventId, 0);
    }
  });

describe('NationPicker', () => {
  it('lists 40+ nations grouped by faction with difficulty tags and stats', () => {
    render(<App />);
    const playButtons = screen.getAllByRole('button', { name: /^Play / });
    expect(playButtons.length).toBeGreaterThanOrEqual(40);
    expect(playButtons.length).toBe(NATION_IDS.length);

    for (const header of ['The Axis', 'The Allies', 'The Comintern', 'The Neutrals']) {
      expect(screen.getByText(header)).toBeTruthy();
    }
    expect(screen.getAllByText('Full campaign')).toHaveLength(MAJOR_IDS.length);
    expect(screen.getAllByText('Hard mode')).toHaveLength(NATION_IDS.length - MAJOR_IDS.length);
    expect(screen.getByLabelText('Campaign seed')).toBeTruthy();
    expect(screen.getByText(/January 1938\./)).toBeTruthy(); // the scenario blurb
  });

  it('starts a campaign with the typed seed when a nation is picked', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Campaign seed'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Play Poland' }));
    const g = useStore.getState().game;
    expect(g?.playerNation).toBe('POL');
    expect(g?.seed).toBe(123);
    expect(useStore.getState().screen).toBe('game');
    expect(screen.getByText('January 1938')).toBeTruthy(); // TopBar is up
  });
});

describe('TopBar', () => {
  it('shows date, resources, stability, war support and tension, and End Turn advances the month', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play Germany' }));
    expect(screen.getByText('January 1938')).toBeTruthy();
    for (const label of ['IC', 'Oil', 'Steel', 'Food', 'Stability', 'War Support']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByRole('meter', { name: 'World tension' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    expect(useStore.getState().game?.turn).toBe(1);
    expect(screen.getByText('February 1938')).toBeTruthy();
  });

  it('disables End Turn while a decision is pending', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play Germany' }));
    act(() => {
      const g = useStore.getState().game;
      if (g === null) throw new Error('expected a game');
      useStore.setState({ game: { ...g, pendingChoices: [{ eventId: 'evt-x' }] } });
    });
    const button = screen.getByRole('button', { name: 'End Turn' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText('1 decision awaits')).toBeTruthy();
  });
});

describe('SaveLoad', () => {
  it('saves to and loads from a manual slot through the menu', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play France' }));
    resolvePending();
    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    resolvePending();
    fireEvent.click(screen.getByRole('button', { name: 'Saves' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save to slot 1' }));
    expect(screen.getByText('Saved to slot 1.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'End Turn' }));
    expect(useStore.getState().game?.turn).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: 'Load slot 1' }));
    expect(useStore.getState().game?.turn).toBe(1);
    expect(screen.getByText('Loaded slot 1.')).toBeTruthy();
  });
});

describe('screen router', () => {
  it('routes to the end screen when the game is over, and back to the picker', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Play Germany' }));
    act(() => {
      const g = useStore.getState().game;
      if (g === null) throw new Error('expected a game');
      useStore.setState({
        game: { ...g, gameOver: { verdict: 'Survival', score: 30, epilogue: 'The lights held.' } },
        screen: 'end',
      });
    });
    expect(screen.getByText('Survival')).toBeTruthy();
    expect(screen.getByText('The lights held.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'New campaign' }));
    expect(useStore.getState().screen).toBe('picker');
    expect(screen.getAllByRole('button', { name: /^Play / }).length).toBeGreaterThanOrEqual(40);
  });
});
