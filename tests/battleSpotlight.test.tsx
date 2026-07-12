// BattleSpotlight component: renders a full-screen card for this turn's
// 'battle'-kind reports, splits "Name: Phase" into a name/title pair,
// dismiss cycles to the next report, and it defers to a pending decision.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import BattleSpotlight from '../src/ui/BattleSpotlight';
import { useStore } from '../src/store';
import { buildInitialState } from '../src/engine/setup';
import type { GameState } from '../src/engine/types';

beforeEach(() => {
  act(() => {
    const game = buildInitialState('GER', 7);
    useStore.setState({ game, screen: 'game', selectedRegion: null });
  });
});

afterEach(cleanup);

const withReports = (reports: GameState['reports'], pendingChoices: GameState['pendingChoices'] = []) => {
  act(() => {
    const g = useStore.getState().game!;
    useStore.setState({ game: { ...g, reports, pendingChoices } });
  });
};

describe('BattleSpotlight', () => {
  it('renders nothing when there is no battle report this turn', () => {
    withReports([]);
    render(<BattleSpotlight />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows a full-screen card split into battle name and phase title', () => {
    const turn = useStore.getState().game!.turn;
    withReports([
      { kind: 'battle', title: 'Operation Barbarossa: The Frontier Breaks', body: 'The line goes over at dawn.', turn },
    ]);
    render(<BattleSpotlight />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Operation Barbarossa')).toBeTruthy();
    expect(screen.getByText('The Frontier Breaks')).toBeTruthy();
    expect(screen.getByText('The line goes over at dawn.')).toBeTruthy();
  });

  it('Continue advances to the next battle report, then dismisses entirely', () => {
    const turn = useStore.getState().game!.turn;
    withReports([
      { kind: 'battle', title: 'Battle One: Phase A', body: 'First body.', turn },
      { kind: 'battle', title: 'Battle Two: Phase B', body: 'Second body.', turn },
    ]);
    render(<BattleSpotlight />);
    expect(screen.getByText('First body.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Second body.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('ignores reports from a previous turn', () => {
    withReports([{ kind: 'battle', title: 'Stale: Phase', body: 'Old news.', turn: -5 }]);
    render(<BattleSpotlight />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('defers to a pending decision instead of showing the spotlight', () => {
    const turn = useStore.getState().game!.turn;
    withReports(
      [{ kind: 'battle', title: 'Battle: Phase', body: 'Body.', turn }],
      [{ eventId: 'some-event' }],
    );
    render(<BattleSpotlight />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
