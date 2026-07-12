// The research directorate: pick one of the six tracks, watch the progress
// bar climb. Flavor names come from data/techs.ts; gates (secret track,
// max level) mirror the store's own setResearch guards so disabled buttons
// tell the truth.

import type { CSSProperties } from 'react';
import type { TechTrack } from '../engine/types';
import { SECRET_REQUIRES_INDUSTRY, TECH_MAX } from '../engine/balance';
import { TECH_INFO } from '../data/techs';
import { useStore } from '../store';

const TRACKS: TechTrack[] = ['armor', 'air', 'naval', 'industry', 'doctrine', 'secret'];

const styles: Record<string, CSSProperties> = {
  heading: { margin: '0 0 10px', fontSize: 16 },
  card: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '9px 11px',
    marginBottom: 8,
  },
  cardActive: { borderColor: 'var(--accent)' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { fontFamily: 'var(--font-doc)', fontSize: 13.5 },
  level: { fontFamily: 'var(--font-doc)', fontSize: 12, color: 'var(--accent)' },
  flavor: { fontSize: 11, color: 'var(--text-dim)', margin: '3px 0 6px' },
  meterShell: {
    height: 7,
    background: 'var(--bg-raised)',
    border: '1px solid var(--border)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 7,
  },
  btn: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 2,
    padding: '3px 10px',
    fontSize: 11.5,
  },
  btnDisabled: {
    color: 'var(--text-dim)',
    borderColor: 'var(--border)',
    cursor: 'not-allowed',
  },
  gateNote: { fontSize: 10.5, color: 'var(--danger)', marginTop: 4 },
  halt: {
    background: 'transparent',
    color: 'var(--text-dim)',
    border: '1px solid var(--border)',
    borderRadius: 2,
    padding: '4px 10px',
    fontSize: 11.5,
    marginBottom: 10,
  },
};

export default function ResearchPanel() {
  const game = useStore((s) => s.game);
  const setResearch = useStore((s) => s.setResearch);
  if (game === null) return null;
  const me = game.nations[game.playerNation];
  if (me === undefined) return null;

  const current = me.research.track;

  return (
    <section aria-label="Research">
      <h2 style={styles.heading}>Research Directorate</h2>
      {current !== null && (
        <button type="button" style={styles.halt} onClick={() => setResearch(null)}>
          Halt research
        </button>
      )}
      {TRACKS.map((track) => {
        const info = TECH_INFO[track];
        const level = me.tech[track];
        const maxed = level >= TECH_MAX;
        const gated = track === 'secret' && me.tech.industry < SECRET_REQUIRES_INDUSTRY;
        const isActive = current === track;
        const disabled = maxed || gated || isActive;
        const nextName = maxed ? 'Programme complete' : info.levels[level];
        return (
          <div key={track} style={{ ...styles.card, ...(isActive ? styles.cardActive : undefined) }}>
            <div style={styles.head}>
              <span style={styles.name}>{info.name}</span>
              <span style={styles.level}>Level {level} / {TECH_MAX}</span>
            </div>
            <div style={styles.flavor}>
              {level > 0 && <>Current: {info.levels[level - 1]}. </>}
              Next: {nextName}
            </div>
            {isActive && (
              <div
                style={styles.meterShell}
                role="meter"
                aria-label={`${info.name} progress`}
                aria-valuenow={Math.round(me.research.progress)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100, me.research.progress))}%`,
                    height: '100%',
                    background: 'var(--accent)',
                  }}
                />
              </div>
            )}
            <button
              type="button"
              style={{ ...styles.btn, ...(disabled ? styles.btnDisabled : undefined) }}
              disabled={disabled}
              onClick={() => setResearch(track)}
            >
              {isActive ? 'Researching' : maxed ? 'Complete' : `Research ${info.name}`}
            </button>
            {gated && !maxed && (
              <div style={styles.gateNote}>
                Requires Industrial Base level {SECRET_REQUIRES_INDUSTRY}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
