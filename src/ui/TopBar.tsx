// The war-room ribbon across the top of the game screen: date, national
// vitals, world tension, the End Turn control, and the save menu. Reads
// straight from the store; issues only endTurn.

import type { CSSProperties } from 'react';
import { formatDate } from '../engine/types';
import { useStore } from '../store';
import SaveLoad from './SaveLoad';

const styles: Record<string, CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    padding: '8px 14px',
    background: 'var(--bg-raised)',
    borderBottom: '1px solid var(--border)',
    flexWrap: 'wrap',
  },
  nation: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: 'var(--font-doc)',
    fontSize: 15,
    color: 'var(--paper)',
  },
  swatch: { width: 12, height: 12, borderRadius: 2, display: 'inline-block' },
  stat: { display: 'flex', flexDirection: 'column', minWidth: 46 },
  statLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'var(--text-dim)',
  },
  statValue: { fontSize: 14, fontFamily: 'var(--font-doc)' },
  meterShell: {
    width: 110,
    height: 8,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  endTurn: {
    marginLeft: 'auto',
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    borderRadius: 3,
    padding: '8px 18px',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: '0.04em',
  },
  pendingNote: { color: 'var(--danger)', fontSize: 12, fontFamily: 'var(--font-doc)' },
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={styles.stat}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  );
}

function TensionMeter({ tension }: { tension: number }) {
  const color = tension < 40 ? 'var(--ok)' : tension < 70 ? 'var(--accent)' : 'var(--danger)';
  return (
    <div style={styles.stat} title={`World tension ${Math.round(tension)} of 100`}>
      <span style={styles.statLabel}>Tension</span>
      <div style={styles.meterShell} role="meter" aria-label="World tension" aria-valuenow={Math.round(tension)} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${Math.max(0, Math.min(100, tension))}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

export default function TopBar() {
  const game = useStore((s) => s.game);
  const endTurn = useStore((s) => s.endTurn);
  if (game === null) return null;

  const me = game.nations[game.playerNation];
  const pending = game.pendingChoices.length;
  const blocked = pending > 0 || game.gameOver !== null;

  return (
    <header style={styles.bar}>
      <div style={styles.nation}>
        <span style={{ ...styles.swatch, background: me.color }} />
        {me.name}
      </div>
      <Stat label="Date" value={formatDate(game.turn)} />
      <Stat label="IC" value={Math.round(me.ic)} />
      <Stat label="Oil" value={Math.floor(me.stockpile.oil)} />
      <Stat label="Steel" value={Math.floor(me.stockpile.steel)} />
      <Stat label="Food" value={Math.floor(me.stockpile.food)} />
      <Stat label="Stability" value={Math.round(me.stability)} />
      <Stat label="War Support" value={Math.round(me.warSupport)} />
      <TensionMeter tension={game.tension} />
      <button
        type="button"
        style={{ ...styles.endTurn, opacity: blocked ? 0.45 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}
        disabled={blocked}
        onClick={endTurn}
      >
        End Turn
      </button>
      {pending > 0 && (
        <span style={styles.pendingNote}>
          {pending === 1 ? '1 decision awaits' : `${pending} decisions await`}
        </span>
      )}
      <SaveLoad />
    </header>
  );
}
