// RegionPopover: the map's click-to-act panel. Covers the info display, the
// garrison posture control, the friendly/hostile action split (move-in vs
// attack-from-adjacent), and the declare-war flow with its coalition
// preview — the whole point being that clicking a region on the map now
// does something, instead of only drawing a highlight.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import RegionPopover from '../src/ui/RegionPopover';
import { useStore } from '../src/store';
import { buildInitialState } from '../src/engine/setup';

beforeEach(() => {
  const game = buildInitialState('GER', 42);
  useStore.setState({ game, screen: 'game', selectedRegion: null });
});

afterEach(cleanup);

const select = (region: string) => useStore.setState({ selectedRegion: region });

describe('RegionPopover', () => {
  it('renders nothing with no region selected', () => {
    render(<RegionPopover />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows region info and garrison, with a posture selector for the player\'s own armies', () => {
    select('ger-berlin'); // GER-controlled, GER has at least one army there
    render(<RegionPopover />);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getAllByText(/Germany/).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/Posture for/).length).toBeGreaterThan(0);
  });

  it('close button clears the selection', () => {
    select('ger-berlin');
    render(<RegionPopover />);
    fireEvent.click(screen.getByRole('button', { name: 'Close region panel' }));
    expect(useStore.getState().selectedRegion).toBeNull();
  });

  it('offers to move a nearby army in when the region is not hostile, and moving it works', () => {
    select('pol-danzig'); // POL-controlled, neutral vs GER — not at war
    render(<RegionPopover />);
    const moveButtons = screen.getAllByRole('button', { name: 'Move in' });
    expect(moveButtons.length).toBeGreaterThan(0);
    fireEvent.click(moveButtons[0]);
    const g = useStore.getState().game!;
    expect(g.nations.GER.armies.some((a) => a.moveTarget === 'pol-danzig')).toBe(true);
  });

  it('switches to Attack once at war, and setting posture to offensive from there', () => {
    const g = useStore.getState().game!;
    useStore.setState({
      game: { ...g, wars: [{ id: 'w', attackers: ['GER'], defenders: ['POL'], startTurn: 0 }] },
    });
    select('pol-danzig');
    render(<RegionPopover />);
    expect(screen.queryByRole('button', { name: 'Move in' })).toBeNull();
    const attackButtons = screen.getAllByRole('button', { name: 'Attack' });
    expect(attackButtons.length).toBeGreaterThan(0);
    fireEvent.click(attackButtons[0]);
    const after = useStore.getState().game!;
    expect(after.nations.GER.armies.some((a) => a.posture === 'offensive')).toBe(true);
  });

  it('offers Declare War on a valid neutral target with a coalition preview, and it fires', () => {
    select('pol-danzig');
    render(<RegionPopover />);
    expect(screen.getByText(/allies will join the defence/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Declare War on Poland' }));
    const g = useStore.getState().game!;
    expect(g.wars.some((w) => w.attackers.includes('GER') && w.defenders.includes('POL'))).toBe(true);
  });

  it('hides Declare War against a same-faction nation', () => {
    select('ita-rome'); // Italy, also Axis — GER's own faction
    render(<RegionPopover />);
    expect(screen.queryByRole('button', { name: /Declare War/ })).toBeNull();
  });
});
