// The decision desk. When history forces a choice, it lands here as a paper
// document over a darkened room. One event at a time, highest priority first;
// keys 1-5 select a choice. Availability on a choice is checked against the
// live game via the DSL before it renders as pickable.

import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useStore } from '../store';
import { ALL_EVENTS } from '../data/events/index';
import { getEvent } from '../engine/events';
import { evalCondition } from '../engine/conditions';
import { makeRng } from '../engine/rng';
import { formatDate } from '../engine/types';

const styles: Record<string, CSSProperties> = {
  scrim: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(8,8,10,0.72)',
    display: 'grid',
    placeItems: 'center',
    padding: 20,
    zIndex: 50,
  },
  doc: {
    maxWidth: 560,
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '26px 30px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
  },
  stamp: {
    fontSize: 10,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'var(--comintern)',
    fontFamily: 'var(--font-doc)',
  },
  date: {
    float: 'right',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--ink)',
    opacity: 0.6,
    fontFamily: 'var(--font-doc)',
  },
  title: { margin: '10px 0 12px', fontSize: 21, lineHeight: 1.2 },
  text: { fontSize: 14, lineHeight: 1.62, margin: '0 0 20px', whiteSpace: 'pre-wrap' },
  choice: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    marginTop: 9,
    padding: '11px 14px',
    background: 'transparent',
    border: '1px solid var(--ink)',
    borderRadius: 2,
    color: 'var(--ink)',
    fontFamily: 'var(--font-doc)',
    fontSize: 13.5,
    lineHeight: 1.4,
  },
  choiceDisabled: { opacity: 0.4, cursor: 'not-allowed', borderStyle: 'dashed' },
  key: {
    display: 'inline-block',
    minWidth: 16,
    marginRight: 8,
    fontWeight: 700,
    opacity: 0.55,
  },
  detail: { display: 'block', marginTop: 3, fontSize: 12, opacity: 0.7 },
};

export default function EventModal() {
  const game = useStore((s) => s.game);
  const chooseEvent = useStore((s) => s.chooseEvent);

  const pending = game !== null && game.pendingChoices.length > 0 ? game.pendingChoices[0] : null;
  const ev = pending !== null ? getEvent(ALL_EVENTS, pending.eventId) : undefined;

  useEffect(() => {
    if (game === null || ev === undefined) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number.parseInt(e.key, 10);
      if (!Number.isNaN(n) && n >= 1 && n <= ev.choices.length) {
        const choice = ev.choices[n - 1];
        const ok =
          choice.available === undefined ||
          evalCondition(choice.available, game, makeRng(game.seed ^ game.turn));
        if (ok) chooseEvent(ev.id, n - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, ev, chooseEvent]);

  if (game === null || pending === null || ev === undefined) return null;

  // A fixed rng so availability rendering is stable within a turn.
  const rng = makeRng(game.seed ^ game.turn);

  return (
    <div style={styles.scrim} role="dialog" aria-modal="true" aria-label={ev.title}>
      <div className="doc" style={styles.doc}>
        <span style={styles.date}>{formatDate(game.turn)}</span>
        <span style={styles.stamp}>Decision required</span>
        <h1 style={styles.title}>{ev.title}</h1>
        <p style={styles.text}>{ev.text}</p>
        {ev.choices.map((c, i) => {
          const available =
            c.available === undefined || evalCondition(c.available, game, rng);
          return (
            <button
              key={c.label}
              type="button"
              disabled={!available}
              style={{ ...styles.choice, ...(available ? undefined : styles.choiceDisabled) }}
              onClick={() => available && chooseEvent(ev.id, i)}
            >
              <span style={styles.key}>{i + 1}.</span>
              {c.label}
              {c.detail !== undefined && <span style={styles.detail}>{c.detail}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
