// The split ledger: what history did, against what your war did. Convergences
// read plain; divergences are stamped in gold. Entries come from the running
// chronicle the engine writes each turn, newest first.

import type { CSSProperties } from 'react';
import type { ChronicleEntry } from '../engine/types';
import { formatDate } from '../engine/types';
import { useStore } from '../store';

const styles: Record<string, CSSProperties> = {
  heading: { margin: '0 0 4px', fontSize: 16 },
  sub: { margin: '0 0 12px', fontSize: 11.5, color: 'var(--text-dim)', lineHeight: 1.4 },
  entry: {
    borderLeft: '2px solid var(--border)',
    padding: '6px 0 6px 10px',
    marginBottom: 8,
  },
  entryDiverge: { borderLeftColor: 'var(--accent)' },
  date: {
    fontFamily: 'var(--font-doc)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'var(--text-dim)',
  },
  tag: {
    display: 'inline-block',
    marginLeft: 8,
    fontSize: 9,
    letterSpacing: '0.1em',
    color: 'var(--accent)',
  },
  text: { fontSize: 12.5, lineHeight: 1.5, marginTop: 3 },
  textDiverge: { color: 'var(--paper)' },
  empty: { color: 'var(--text-dim)', fontFamily: 'var(--font-doc)', fontSize: 13 },
};

export default function ChroniclePanel() {
  const game = useStore((s) => s.game);
  if (game === null) return null;

  const entries: ChronicleEntry[] = [...game.chronicle].reverse();
  const divergences = entries.filter((e) => e.divergence).length;

  return (
    <section aria-label="Chronicle">
      <h2 style={styles.heading}>The Chronicle</h2>
      <p style={styles.sub}>
        {divergences === 0
          ? 'So far your war tracks the history we know.'
          : `${divergences} ${divergences === 1 ? 'point' : 'points'} where your war left the record behind.`}
      </p>
      {entries.length === 0 && (
        <p style={styles.empty}>The ledger is still blank. History has not yet turned.</p>
      )}
      {entries.map((e, i) => (
        <div
          key={`${e.turn}-${i}`}
          style={{ ...styles.entry, ...(e.divergence ? styles.entryDiverge : undefined) }}
        >
          <span style={styles.date}>{formatDate(e.turn)}</span>
          {e.divergence && <span style={styles.tag}>DIVERGENCE</span>}
          <div style={{ ...styles.text, ...(e.divergence ? styles.textDiverge : undefined) }}>
            {e.text}
          </div>
        </div>
      ))}
    </section>
  );
}
