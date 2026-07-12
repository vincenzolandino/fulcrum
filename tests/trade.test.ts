// Trade tests: shortage/surplus helpers, the per-turn pact transfer, one-time
// aid requests, standing pact proposals, and the world market.

import { describe, expect, it } from 'vitest';
import {
  buyOnMarket,
  canSpare,
  isShort,
  marketCost,
  proposeTradePact,
  requestAid,
  runTrade,
  willingToHelp,
} from '../src/engine/trade';
import { fixedRng, frozenTestState, makeTestState } from './fixtures';
import { AID_REQUEST_AMOUNT, TRADE_PACT_TRANSFER, TRADE_SHORTAGE_THRESHOLD } from '../src/engine/balance';

const rng = () => fixedRng([0]);

describe('isShort / canSpare / willingToHelp', () => {
  it('isShort is true below the threshold, false at or above it', () => {
    const s = makeTestState();
    s.nations.POL.stockpile.oil = TRADE_SHORTAGE_THRESHOLD - 1;
    expect(isShort(s.nations.POL, 'oil')).toBe(true);
    s.nations.POL.stockpile.oil = TRADE_SHORTAGE_THRESHOLD;
    expect(isShort(s.nations.POL, 'oil')).toBe(false);
  });

  it('canSpare requires staying at or above the threshold after giving', () => {
    const s = makeTestState();
    s.nations.FRA.stockpile.oil = TRADE_SHORTAGE_THRESHOLD + 8;
    expect(canSpare(s.nations.FRA, 'oil', 8)).toBe(true); // lands exactly at the floor
    expect(canSpare(s.nations.FRA, 'oil', 9)).toBe(false);
  });

  it('willingToHelp: same faction always qualifies; otherwise relations must clear the gate', () => {
    const s = makeTestState();
    // POL (neutral) asking FRA (allies): different factions, but relations 40 clears the gate.
    expect(willingToHelp(s.nations.FRA, s.nations.POL)).toBe(true);
    // POL asking GER: different factions, relations -20 misses the gate.
    expect(willingToHelp(s.nations.GER, s.nations.POL)).toBe(false);
  });
});

describe('runTrade: standing pact transfer', () => {
  it('pulls TRADE_PACT_TRANSFER from a partner that can spare it', () => {
    const s = frozenTestState((st) => {
      st.nations.POL.stockpile.oil = 5; // short
      st.nations.POL.pacts = [{ with: 'FRA', kind: 'trade' }];
      st.nations.FRA.pacts = [{ with: 'POL', kind: 'trade' }];
    });
    const out = runTrade(s, rng());
    expect(out.nations.POL.stockpile.oil).toBe(5 + TRADE_PACT_TRANSFER);
    expect(out.nations.FRA.stockpile.oil).toBe(50 - TRADE_PACT_TRANSFER);
  });

  it('does not transfer if the partner would go short itself', () => {
    const s = frozenTestState((st) => {
      st.nations.POL.stockpile.oil = 5;
      st.nations.FRA.stockpile.oil = TRADE_SHORTAGE_THRESHOLD + TRADE_PACT_TRANSFER - 1; // one short of enough
      st.nations.POL.pacts = [{ with: 'FRA', kind: 'trade' }];
      st.nations.FRA.pacts = [{ with: 'POL', kind: 'trade' }];
    });
    const out = runTrade(s, rng());
    expect(out).toBe(s); // untouched — no partner could help
  });

  it('does nothing for a nation with no trade pacts, or none short', () => {
    const s = frozenTestState((st) => {
      st.nations.POL.stockpile.oil = 5; // short, but no pact
    });
    expect(runTrade(s, rng())).toBe(s);
    const s2 = frozenTestState((st) => {
      st.nations.POL.pacts = [{ with: 'FRA', kind: 'trade' }];
      st.nations.FRA.pacts = [{ with: 'POL', kind: 'trade' }];
    }); // nobody short
    expect(runTrade(s2, rng())).toBe(s2);
  });
});

describe('requestAid', () => {
  it('grants the request and reports it when a willing, well-stocked target is asked', () => {
    const s = frozenTestState((st) => {
      st.playerNation = 'POL';
      st.nations.POL.stockpile.oil = 5;
    });
    const out = requestAid(s, 'POL', 'FRA', 'oil');
    expect(out.nations.POL.stockpile.oil).toBe(5 + AID_REQUEST_AMOUNT);
    expect(out.nations.FRA.stockpile.oil).toBe(50 - AID_REQUEST_AMOUNT);
    expect(out.reports).toHaveLength(1);
    expect(out.reports[0].body).toContain('agrees to ship');
  });

  it('refuses with a reported reason when the target is not friendly enough', () => {
    const s = frozenTestState((st) => {
      st.playerNation = 'POL';
      st.nations.POL.stockpile.oil = 5;
    });
    const out = requestAid(s, 'POL', 'GER', 'oil');
    expect(out.nations.POL.stockpile.oil).toBe(5); // unchanged
    expect(out.reports).toHaveLength(1);
    expect(out.reports[0].body).toContain('declines');
  });

  it('refuses with a reported reason when the target cannot spare it', () => {
    const s = frozenTestState((st) => {
      st.playerNation = 'POL';
      st.nations.POL.stockpile.oil = 5;
      st.nations.FRA.stockpile.oil = TRADE_SHORTAGE_THRESHOLD; // nothing to spare
    });
    const out = requestAid(s, 'POL', 'FRA', 'oil');
    expect(out.nations.POL.stockpile.oil).toBe(5);
    expect(out.reports[0].body).toContain('cannot spare');
  });

  it('is a no-op with no report when the asker is not actually short', () => {
    const s = frozenTestState((st) => {
      st.playerNation = 'POL';
    });
    expect(requestAid(s, 'POL', 'FRA', 'oil')).toBe(s);
  });

  it('drops the report when the asker is not the player (no AI inbox)', () => {
    const s = frozenTestState((st) => {
      st.playerNation = 'POL';
      st.nations.FRA.stockpile.oil = 5; // FRA is short, asking POL
      st.nations.FRA.relations.POL = 40;
    });
    const out = requestAid(s, 'FRA', 'POL', 'oil');
    expect(out.nations.FRA.stockpile.oil).toBe(5 + AID_REQUEST_AMOUNT); // still resolves
    expect(out.reports).toHaveLength(0); // just no mail for it
  });
});

describe('proposeTradePact', () => {
  it('adds a symmetric trade pact and reports acceptance', () => {
    const s = frozenTestState((st) => {
      st.playerNation = 'POL';
    });
    const out = proposeTradePact(s, 'POL', 'FRA');
    expect(out.nations.POL.pacts).toContainEqual({ with: 'FRA', kind: 'trade' });
    expect(out.nations.FRA.pacts).toContainEqual({ with: 'POL', kind: 'trade' });
    expect(out.reports[0].body).toContain('agrees');
  });

  it('refuses and reports when the target is not friendly enough', () => {
    const s = frozenTestState((st) => {
      st.playerNation = 'POL';
    });
    const out = proposeTradePact(s, 'POL', 'GER');
    expect(out.nations.POL.pacts).toEqual([]);
    expect(out.reports[0].body).toContain('sees no advantage');
  });

  it('is a no-op if the pact already exists', () => {
    const s = frozenTestState((st) => {
      st.nations.POL.pacts = [{ with: 'FRA', kind: 'trade' }];
      st.nations.FRA.pacts = [{ with: 'POL', kind: 'trade' }];
    });
    expect(proposeTradePact(s, 'POL', 'FRA')).toBe(s);
  });
});

describe('world market', () => {
  it('marketCost grows geometrically per unit within one purchase', () => {
    expect(marketCost(1)).toBe(3); // MARKET_BASE_COST
    expect(marketCost(2)).toBe(7); // ceil(3 + 3×1.15) = ceil(6.45)
  });

  it('buyOnMarket spends ic and adds stockpile, refusing if unaffordable', () => {
    const s = frozenTestState((st) => {
      st.nations.POL.ic = 20;
    });
    const out = buyOnMarket(s, 'POL', 'oil', 3);
    const cost = marketCost(3);
    expect(out.nations.POL.ic).toBe(20 - cost);
    expect(out.nations.POL.stockpile.oil).toBe(50 + 3);

    const poor = frozenTestState((st) => {
      st.nations.POL.ic = 1;
    });
    expect(buyOnMarket(poor, 'POL', 'oil', 3)).toBe(poor); // can't afford it
  });

  it('caps a single purchase at MARKET_MAX_PER_TURN', () => {
    const s = frozenTestState((st) => {
      st.nations.POL.ic = 100000; // rich enough to afford anything short of the cap
    });
    const out = buyOnMarket(s, 'POL', 'steel', 5000);
    expect(out.nations.POL.stockpile.steel).toBe(90); // 50 + MARKET_MAX_PER_TURN (40), not 5000
  });
});
