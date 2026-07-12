// The newsreel card. When an iconic battle (Barbarossa, D-Day, the Bulge)
// advances a phase or resolves, its 'battle'-kind report gets a full-screen
// cinematic treatment here instead of an ordinary line in the Reports tab —
// dark, high-contrast, distinct from EventModal's paper-document look since
// nothing here is a decision, only history landing. Dismiss-only; dismissal
// is local component state, reset each turn since a new turn's reports
// naturally replace the old ones. Yields to EventModal: a pending decision
// takes the screen first, since it blocks Turn until answered and this does
// not.

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useStore } from '../store';
import { formatDate } from '../engine/types';

const styles: Record<string, CSSProperties> = {
  scrim: {
    position: 'fixed',
    inset: 0,
    background: 'radial-gradient(ellipse at center, rgba(30,10,10,0.88) 0%, rgba(5,5,7,0.96) 70%)',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    zIndex: 40, // below EventModal (50)
  },
  card: {
    maxWidth: 620,
    width: '100%',
    maxHeight: '85vh',
    overflowY: 'auto',
    padding: '30px 34px',
    background: 'var(--bg-raised)',
    border: '1px solid var(--danger)',
    borderRadius: 3,
    boxShadow: '0 0 60px rgba(179,64,63,0.25), 0 8px 40px rgba(0,0,0,0.7)',
    color: 'var(--text)',
  },
  date: {
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-doc)',
  },
  battleName: {
    fontSize: 11,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'var(--danger)',
    marginTop: 10,
  },
  title: {
    margin: '6px 0 18px',
    fontSize: 26,
    lineHeight: 1.15,
    fontFamily: 'var(--font-doc)',
  },
  text: { fontSize: 14.5, lineHeight: 1.68, margin: '0 0 22px', whiteSpace: 'pre-wrap' },
  rule: { border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 18px' },
  dismiss: {
    background: 'transparent',
    color: 'var(--danger)',
    border: '1px solid var(--danger)',
    borderRadius: 2,
    padding: '8px 18px',
    fontFamily: 'var(--font-doc)',
    fontSize: 12.5,
  },
};

/** Splits "Operation Barbarossa: The Frontier Breaks" into name + phase, if there's a colon. */
function splitTitle(title: string): { name: string; phase: string | null } {
  const i = title.indexOf(':');
  if (i === -1) return { name: title, phase: null };
  return { name: title.slice(0, i).trim(), phase: title.slice(i + 1).trim() };
}

export default function BattleSpotlight() {
  const game = useStore((s) => s.game);
  const [dismissedIndex, setDismissedIndex] = useState(-1);

  const turn = game?.turn ?? -1;
  useEffect(() => setDismissedIndex(-1), [turn]);

  if (game === null || game.pendingChoices.length > 0) return null;

  const battleReports = game.reports.filter((r) => r.kind === 'battle' && r.turn === game.turn);
  const report = battleReports[dismissedIndex + 1];
  if (report === undefined) return null;

  const { name, phase } = splitTitle(report.title);

  return (
    <div style={styles.scrim} role="dialog" aria-modal="true" aria-label={report.title}>
      <div style={styles.card}>
        <span style={styles.date}>{formatDate(game.turn)}</span>
        <div style={styles.battleName}>{name}</div>
        <h1 style={styles.title}>{phase ?? name}</h1>
        <p style={styles.text}>{report.body}</p>
        <hr style={styles.rule} />
        <button type="button" style={styles.dismiss} onClick={() => setDismissedIndex(dismissedIndex + 1)}>
          Continue
        </button>
      </div>
    </div>
  );
}
