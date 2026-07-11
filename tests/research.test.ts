import { describe, expect, it } from 'vitest';
import { atomicFlag, runResearch } from '../src/engine/research';
import type { GameState, Rng } from '../src/engine/types';
import { fixedRng, frozenTestState } from './fixtures';

// Research never draws randomness; any pinned rng will do.
const rng = (): Rng => fixedRng([0.5]);

// POL researching armor with clean numbers: ic 40, civilian allocation 0.5 →
// progress gain = 5 + 40 × 0.5 × 0.15 = 8 per turn.
const researching = (progress: number, mutate?: (s: GameState) => void): GameState =>
  frozenTestState((st) => {
    st.nations.POL.ic = 40;
    st.nations.POL.icAllocation = { army: 0.3, air: 0.1, navy: 0.1, civilian: 0.5 };
    st.nations.POL.research = { track: 'armor', progress };
    if (mutate) mutate(st);
  });

describe('runResearch', () => {
  it('progress += base + ic × alloc.civilian × rate: 0 → 8', () => {
    const out = runResearch(researching(0), rng());
    expect(out.nations.POL.research).toEqual({ track: 'armor', progress: 8 });
    expect(out.nations.POL.tech.armor).toBe(0); // no level yet
  });

  it('levels up at 100 and resets progress', () => {
    const out = runResearch(researching(93), rng()); // 93 + 8 = 101 ≥ 100
    expect(out.nations.POL.tech.armor).toBe(1);
    expect(out.nations.POL.research).toEqual({ track: 'armor', progress: 0 });
  });

  it('levels up on exactly 100', () => {
    const out = runResearch(researching(92), rng()); // 92 + 8 = 100
    expect(out.nations.POL.tech.armor).toBe(1);
    expect(out.nations.POL.research.progress).toBe(0);
  });

  it('a maxed track gains nothing further', () => {
    const s = researching(50, (st) => {
      st.nations.POL.tech.armor = 5;
    });
    const out = runResearch(s, rng());
    expect(out.nations.POL.tech.armor).toBe(5);
    expect(out.nations.POL.research.progress).toBe(50); // untouched
  });

  it('a nation with no track selected is untouched', () => {
    const s = frozenTestState(); // fixture research.track is null
    const out = runResearch(s, rng());
    expect(out.nations.POL).toBe(s.nations.POL);
  });

  it('gates the secret track on industry ≥ 2', () => {
    // Fixture POL industry is 1 → no progress at all.
    const gated = researching(0, (st) => {
      st.nations.POL.research = { track: 'secret', progress: 0 };
    });
    expect(runResearch(gated, rng()).nations.POL.research.progress).toBe(0);

    // With industry 2 the same nation progresses normally.
    const open = researching(0, (st) => {
      st.nations.POL.research = { track: 'secret', progress: 0 };
      st.nations.POL.tech.industry = 2;
    });
    expect(runResearch(open, rng()).nations.POL.research.progress).toBeCloseTo(8, 10);
  });

  it('secret level 5 sets the ATOMIC_{id} flag', () => {
    const s = researching(0, (st) => {
      st.nations.GER.ic = 130;
      st.nations.GER.tech.industry = 2;
      st.nations.GER.tech.secret = 4;
      st.nations.GER.research = { track: 'secret', progress: 99 };
    });
    const out = runResearch(s, rng());
    expect(out.nations.GER.tech.secret).toBe(5);
    expect(out.flags[atomicFlag('GER')]).toBe(true);
    // GER is not the player (POL is) → no research report lands.
    expect(out.reports.filter((r) => r.kind === 'research')).toEqual([]);
  });

  it('reports a completed level to the player', () => {
    const out = runResearch(researching(93), rng());
    const research = out.reports.filter((r) => r.kind === 'research');
    expect(research).toHaveLength(1);
    expect(research[0].turn).toBe(0);
    expect(research[0].title).toContain('Armoured Warfare');
  });

  it('skips dead nations', () => {
    const s = researching(93, (st) => {
      st.nations.POL.alive = false;
    });
    const out = runResearch(s, rng());
    expect(out.nations.POL.tech.armor).toBe(0);
    expect(out.nations.POL.research.progress).toBe(93);
  });

  it('never mutates the input state', () => {
    const s = researching(93); // deep-frozen: any write would throw
    const out = runResearch(s, rng());
    expect(out).not.toBe(s);
    expect(s.nations.POL.research.progress).toBe(93);
    expect(s.nations.POL.tech.armor).toBe(0);
  });
});
