// The foreign ministry ledger: every living nation, sorted warmest first,
// with guarantee and improve-relations actions from the store. Pacts and
// standing guarantees show inline so the table reads as one sheet.

import type { CSSProperties } from 'react';
import type { Nation } from '../engine/types';
import { improvedRelationsFlag, useStore } from '../store';

const styles: Record<string, CSSProperties> = {
  heading: { margin: '0 0 10px', fontSize: 16 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: {
    textAlign: 'left',
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'var(--text-dim)',
    padding: '4px 4px',
    borderBottom: '1px solid var(--border)',
  },
  td: { padding: '5px 4px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' },
  swatch: {
    width: 9,
    height: 9,
    borderRadius: 2,
    display: 'inline-block',
    marginRight: 6,
  },
  faction: { fontSize: 10, color: 'var(--text-dim)' },
  tag: { fontSize: 10, color: 'var(--accent)' },
  btn: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 2,
    padding: '2px 7px',
    fontSize: 10.5,
    marginRight: 4,
  },
  btnDisabled: {
    color: 'var(--text-dim)',
    borderColor: 'var(--border)',
    cursor: 'not-allowed',
  },
};

const relColor = (v: number): string =>
  v > 20 ? 'var(--ok)' : v < -20 ? 'var(--danger)' : 'var(--text)';

export default function DiplomacyPanel() {
  const game = useStore((s) => s.game);
  const improveRelations = useStore((s) => s.improveRelations);
  const guarantee = useStore((s) => s.guarantee);
  if (game === null) return null;
  const me = game.nations[game.playerNation];
  if (me === undefined) return null;

  const rel = (n: Nation): number => me.relations[n.id] ?? 0;
  const others = Object.values(game.nations)
    .filter((n) => n.alive && n.id !== game.playerNation)
    .sort((a, b) => rel(b) - rel(a) || a.name.localeCompare(b.name));

  return (
    <section aria-label="Diplomacy">
      <h2 style={styles.heading}>Foreign Ministry</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Nation</th>
            <th style={styles.th}>Rel.</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {others.map((n) => {
            const guaranteed = me.guarantees.includes(n.id);
            const improved = game.flags[improvedRelationsFlag(n.id)] === true;
            const pacts = me.pacts.filter((p) => p.with === n.id).map((p) => p.kind);
            return (
              <tr key={n.id}>
                <td style={styles.td}>
                  <span style={{ ...styles.swatch, background: n.color }} />
                  {n.name}
                  <div style={styles.faction}>
                    {n.faction}
                    {pacts.length > 0 && <span style={styles.tag}> · {pacts.join(', ')}</span>}
                    {guaranteed && <span style={styles.tag}> · guaranteed</span>}
                  </div>
                </td>
                <td style={{ ...styles.td, fontFamily: 'var(--font-doc)', color: relColor(rel(n)) }}>
                  {Math.round(rel(n))}
                </td>
                <td style={styles.td}>
                  <button
                    type="button"
                    aria-label={`Improve relations with ${n.name}`}
                    style={{ ...styles.btn, ...(improved ? styles.btnDisabled : undefined) }}
                    disabled={improved}
                    onClick={() => improveRelations(n.id)}
                  >
                    Improve
                  </button>
                  <button
                    type="button"
                    aria-label={`Guarantee ${n.name}`}
                    style={{ ...styles.btn, ...(guaranteed ? styles.btnDisabled : undefined) }}
                    disabled={guaranteed}
                    onClick={() => guarantee(n.id)}
                  >
                    Guarantee
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
