// This turn's dispatches, grouped by kind. Each group carries a stamped
// two-letter badge, war-room style; no images, no icon fonts.

import type { CSSProperties } from 'react';
import type { Report, ReportKind } from '../engine/types';
import { useStore } from '../store';

// 'battle' is deliberately absent: iconic-battle dispatches get their own
// full-screen BattleSpotlight overlay instead of a line here, so they never
// appear twice.
const KIND_ORDER: ReportKind[] = ['front', 'diplomatic', 'domestic', 'intel', 'covert', 'research'];

const KIND_META: Record<ReportKind, { label: string; badge: string; color: string }> = {
  front: { label: 'Front dispatches', badge: 'FR', color: 'var(--danger)' },
  diplomatic: { label: 'Diplomatic cables', badge: 'DI', color: 'var(--allies)' },
  domestic: { label: 'Domestic affairs', badge: 'DO', color: 'var(--neutral)' },
  intel: { label: 'Intelligence', badge: 'IN', color: 'var(--accent)' },
  covert: { label: 'Covert operations', badge: 'CV', color: 'var(--comintern)' },
  research: { label: 'Research bureau', badge: 'RS', color: 'var(--ok)' },
  battle: { label: 'Battle dispatches', badge: 'BT', color: 'var(--danger)' },
};

const styles: Record<string, CSSProperties> = {
  heading: { margin: '0 0 10px', fontSize: 16 },
  groupHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    margin: '14px 0 6px',
  },
  badge: {
    display: 'inline-block',
    width: 24,
    height: 18,
    lineHeight: '18px',
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.1em',
    fontFamily: 'var(--font-doc)',
    border: '1px solid currentColor',
    borderRadius: 2,
  },
  groupLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: 'var(--text-dim)',
  },
  report: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '8px 10px',
    fontSize: 12.5,
    marginBottom: 6,
  },
  reportTitle: { fontFamily: 'var(--font-doc)', fontSize: 13 },
  reportBody: { color: 'var(--text-dim)', marginTop: 2, lineHeight: 1.45 },
  empty: { color: 'var(--text-dim)', fontFamily: 'var(--font-doc)', fontSize: 13 },
};

export default function ReportsPanel() {
  const game = useStore((s) => s.game);
  if (game === null) return null;

  const groups = new Map<ReportKind, Report[]>();
  for (const r of game.reports) {
    const list = groups.get(r.kind);
    if (list === undefined) groups.set(r.kind, [r]);
    else list.push(r);
  }

  return (
    <section aria-label="Reports">
      <h2 style={styles.heading}>Dispatches</h2>
      {game.reports.length === 0 && (
        <p style={styles.empty}>No dispatches this month. The wires are quiet.</p>
      )}
      {KIND_ORDER.filter((kind) => groups.has(kind)).map((kind) => {
        const meta = KIND_META[kind];
        return (
          <div key={kind}>
            <div style={styles.groupHead}>
              <span aria-hidden style={{ ...styles.badge, color: meta.color }}>{meta.badge}</span>
              <span style={styles.groupLabel}>{meta.label}</span>
            </div>
            {(groups.get(kind) ?? []).map((r, i) => (
              <div key={`${r.title}-${i}`} style={styles.report}>
                <div style={styles.reportTitle}>{r.title}</div>
                <div style={styles.reportBody}>{r.body}</div>
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
