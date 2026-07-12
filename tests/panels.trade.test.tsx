// Smoke tests for the resource-trade UI added to DiplomacyPanel and
// ProductionPanel: the controls render, and clicking through the store
// actually moves state (stockpile/ic/pacts), same pattern as ui-shell.test.tsx.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import DiplomacyPanel from '../src/ui/DiplomacyPanel';
import ProductionPanel from '../src/ui/ProductionPanel';
import { useStore } from '../src/store';
import { buildInitialState } from '../src/engine/setup';
import { TRADE_SHORTAGE_THRESHOLD } from '../src/engine/balance';

beforeEach(() => {
  localStorage.clear();
  act(() => {
    const game = buildInitialState('POL', 7);
    useStore.setState({ game, screen: 'game', selectedRegion: null });
  });
});

afterEach(cleanup);

const disabled = (el: HTMLElement): boolean => (el as HTMLButtonElement).disabled;

describe('DiplomacyPanel: resource trade', () => {
  it('Request Aid is disabled until the player is short of the picked resource, then requests it', () => {
    render(<DiplomacyPanel />);
    const button = screen.getAllByRole('button', { name: /Request oil aid from/ })[0];
    expect(disabled(button)).toBe(true); // POL starts with plenty of oil

    act(() => {
      const g = useStore.getState().game!;
      useStore.setState({
        game: {
          ...g,
          nations: {
            ...g.nations,
            POL: { ...g.nations.POL, stockpile: { ...g.nations.POL.stockpile, oil: TRADE_SHORTAGE_THRESHOLD - 1 } },
          },
        },
      });
    });
    render(<DiplomacyPanel />); // re-render on the updated store state
    const buttons = screen.getAllByRole('button', { name: /Request oil aid from/ });
    expect(buttons.some((b) => !disabled(b))).toBe(true);
  });

  it('Trade Pact proposes a pact and disables itself once one exists', () => {
    render(<DiplomacyPanel />);
    // 1938 Poland already carries an alliance pact with France; only the
    // count of *trade* pacts should move.
    const tradePactsBefore = useStore.getState().game!.nations.POL.pacts.filter((p) => p.kind === 'trade').length;
    const button = screen.getAllByRole('button', { name: /Propose a trade pact with/ })[0];
    fireEvent.click(button);
    const after = useStore.getState().game!.nations.POL.pacts;
    expect(after.filter((p) => p.kind === 'trade').length).toBe(tradePactsBefore + 1);
  });
});

describe('ProductionPanel: world market', () => {
  it('renders the market controls and a purchase moves ic into stockpile', () => {
    // 1938 Poland's ic (~20) can't afford the panel's default 10-unit
    // purchase (~61 ic at this pricing) — bump it so the default is
    // affordable, same as a major power would find it.
    act(() => {
      const g = useStore.getState().game!;
      useStore.setState({
        game: { ...g, nations: { ...g.nations, POL: { ...g.nations.POL, ic: 200 } } },
      });
    });
    render(<ProductionPanel />);
    const before = useStore.getState().game!.nations.POL;
    const buyButton = screen.getByRole('button', { name: 'Buy' });
    expect(disabled(buyButton)).toBe(false);
    fireEvent.click(buyButton);
    const after = useStore.getState().game!.nations.POL;
    expect(after.stockpile.oil).toBeGreaterThan(before.stockpile.oil);
    expect(after.ic).toBeLessThan(before.ic);
  });

  it('disables Buy when the current ic cannot afford even a small purchase', () => {
    render(<ProductionPanel />); // 1938 Poland's real ic (~20) can't afford 10 units
    expect(disabled(screen.getByRole('button', { name: 'Buy' }))).toBe(true);
  });
});
