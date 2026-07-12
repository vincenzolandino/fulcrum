// War production: the four-way IC allocation sliders and the stockpile
// ledger. Moving one slider holds its new value and rescales the other three
// proportionally, so the shares always sum to 1; the store normalizes again
// as a belt-and-braces invariant.

import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Resource } from '../engine/trade';
import { marketCost } from '../engine/trade';
import { MARKET_MAX_PER_TURN } from '../engine/balance';
import { useStore } from '../store';

type AllocKey = 'army' | 'air' | 'navy' | 'civilian';
const MARKET_RESOURCES: Resource[] = ['oil', 'steel', 'food'];

const ALLOC_KEYS: AllocKey[] = ['army', 'air', 'navy', 'civilian'];

const ALLOC_META: Record<AllocKey, { label: string; hint: string }> = {
  army: { label: 'Army', hint: 'Replenishes equipment and strength' },
  air: { label: 'Air', hint: 'Builds air power' },
  navy: { label: 'Navy', hint: 'Builds the fleet' },
  civilian: { label: 'Civilian', hint: 'Research speed and public order' },
};

const styles: Record<string, CSSProperties> = {
  heading: { margin: '0 0 10px', fontSize: 16 },
  row: { marginBottom: 12 },
  rowHead: { display: 'flex', justifyContent: 'space-between', fontSize: 12.5 },
  pct: { fontFamily: 'var(--font-doc)', color: 'var(--accent)' },
  hint: { fontSize: 10.5, color: 'var(--text-dim)', marginBottom: 3 },
  slider: { width: '100%' },
  stockHead: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: 'var(--text-dim)',
    margin: '16px 0 6px',
  },
  stockGrid: { display: 'flex', gap: 10 },
  stockCell: {
    flex: 1,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '7px 9px',
    textAlign: 'center',
  },
  stockLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'var(--text-dim)',
  },
  stockValue: { fontFamily: 'var(--font-doc)', fontSize: 15 },
  marketHead: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: 'var(--text-dim)',
    margin: '16px 0 6px',
  },
  marketHint: { fontSize: 10.5, color: 'var(--text-dim)', marginBottom: 6 },
  marketRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  select: {
    background: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    fontSize: 12,
    padding: '4px 6px',
  },
  numberInput: {
    background: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    fontSize: 12,
    padding: '4px 6px',
    width: 64,
  },
  cost: { fontFamily: 'var(--font-doc)', fontSize: 12, color: 'var(--accent)' },
  buyBtn: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 2,
    padding: '4px 10px',
    fontSize: 12,
  },
  buyBtnDisabled: { color: 'var(--text-dim)', border: '1px solid var(--border)', cursor: 'not-allowed' },
};

export default function ProductionPanel() {
  const game = useStore((s) => s.game);
  const setAllocation = useStore((s) => s.setAllocation);
  const buyOnMarket = useStore((s) => s.buyOnMarket);
  const [marketResource, setMarketResource] = useState<Resource>('oil');
  const [marketUnits, setMarketUnits] = useState(10);
  if (game === null) return null;
  const me = game.nations[game.playerNation];
  if (me === undefined) return null;

  const alloc = me.icAllocation;
  const cappedUnits = Math.min(Math.max(0, Math.floor(marketUnits)), MARKET_MAX_PER_TURN);
  const cost = marketCost(cappedUnits);
  const canAfford = cappedUnits > 0 && me.ic >= cost;

  const onSlide = (key: AllocKey, pct: number): void => {
    const v = Math.max(0, Math.min(100, pct)) / 100;
    const others = ALLOC_KEYS.filter((k) => k !== key);
    const othersSum = others.reduce((sum, k) => sum + alloc[k], 0);
    const remaining = 1 - v;
    const next = { ...alloc, [key]: v };
    for (const k of others) {
      next[k] = othersSum > 0 ? (alloc[k] * remaining) / othersSum : remaining / others.length;
    }
    setAllocation(next);
  };

  return (
    <section aria-label="Production">
      <h2 style={styles.heading}>War Production</h2>
      {ALLOC_KEYS.map((key) => (
        <div key={key} style={styles.row}>
          <div style={styles.rowHead}>
            <span>{ALLOC_META[key].label}</span>
            <span style={styles.pct}>{Math.round(alloc[key] * 100)}%</span>
          </div>
          <div style={styles.hint}>{ALLOC_META[key].hint}</div>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            aria-label={`${ALLOC_META[key].label} allocation`}
            style={styles.slider}
            value={Math.round(alloc[key] * 100)}
            onChange={(e) => onSlide(key, Number(e.target.value))}
          />
        </div>
      ))}
      <div style={styles.stockHead}>Stockpile</div>
      <div style={styles.stockGrid}>
        <div style={styles.stockCell}>
          <div style={styles.stockLabel}>IC</div>
          <div style={styles.stockValue}>{Math.round(me.ic)}</div>
        </div>
        <div style={styles.stockCell}>
          <div style={styles.stockLabel}>Oil</div>
          <div style={styles.stockValue}>{Math.floor(me.stockpile.oil)}</div>
        </div>
        <div style={styles.stockCell}>
          <div style={styles.stockLabel}>Steel</div>
          <div style={styles.stockValue}>{Math.floor(me.stockpile.steel)}</div>
        </div>
        <div style={styles.stockCell}>
          <div style={styles.stockLabel}>Food</div>
          <div style={styles.stockValue}>{Math.floor(me.stockpile.food)}</div>
        </div>
      </div>

      <div style={styles.marketHead}>World Market</div>
      <div style={styles.marketHint}>
        Buy resources with this month&rsquo;s IC. The price climbs the more you buy in one purchase
        and resets next turn — the safety valve when no one will trade with you.
      </div>
      <div style={styles.marketRow}>
        <select
          aria-label="Resource to buy"
          style={styles.select}
          value={marketResource}
          onChange={(e) => setMarketResource(e.target.value as Resource)}
        >
          {MARKET_RESOURCES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          type="number"
          aria-label="Units to buy"
          style={styles.numberInput}
          min={0}
          max={MARKET_MAX_PER_TURN}
          value={marketUnits}
          onChange={(e) => setMarketUnits(Number(e.target.value))}
        />
        <span style={styles.cost}>Cost: {cost} IC</span>
        <button
          type="button"
          style={{ ...styles.buyBtn, ...(canAfford ? undefined : styles.buyBtnDisabled) }}
          disabled={!canAfford}
          onClick={() => buyOnMarket(marketResource, cappedUnits)}
        >
          Buy
        </button>
      </div>
    </section>
  );
}
