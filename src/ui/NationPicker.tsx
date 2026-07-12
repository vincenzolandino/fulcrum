// Nation selection screen: every 1938 nation grouped by faction, with the
// stats that matter before the first turn (IC, armies, stability), a
// difficulty tag (majors run a full campaign, minors are hard mode), and a
// seed input for reproducible campaigns. Map-less by design; the map arrives
// once a campaign starts.

import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Faction, Nation } from '../engine/types';
import { MAJOR_IDS, NATIONS_1938 } from '../data/nations';
import { useStore } from '../store';

const FACTION_ORDER: Faction[] = ['axis', 'allies', 'comintern', 'neutral'];

const FACTION_LABELS: Record<Faction, string> = {
  axis: 'The Axis',
  allies: 'The Allies',
  comintern: 'The Comintern',
  neutral: 'The Neutrals',
};

const FACTION_COLOR: Record<Faction, string> = {
  axis: 'var(--axis)',
  allies: 'var(--allies)',
  comintern: 'var(--comintern)',
  neutral: 'var(--neutral)',
};

const BLURB =
  'January 1938. Austria trembles, Spain burns, and Japanese columns push up the ' +
  'Yangtze. The powers are rearming and every chancellery knows it. Take charge of ' +
  'any nation and steer it through the eleven years that decide the century. ' +
  'Every border, every pact, every leader can turn out differently this time.';

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100%',
    padding: '32px 24px 64px',
    maxWidth: 1100,
    margin: '0 auto',
  },
  title: {
    fontSize: 34,
    margin: 0,
    letterSpacing: '0.06em',
    color: 'var(--paper)',
  },
  subtitle: {
    margin: '4px 0 20px',
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-doc)',
    letterSpacing: '0.04em',
  },
  blurb: {
    padding: '14px 18px',
    marginBottom: 20,
    maxWidth: 760,
    fontSize: 13.5,
    lineHeight: 1.55,
    boxShadow: '0 2px 0 rgba(0,0,0,0.35)',
  },
  seedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
    color: 'var(--text-dim)',
  },
  seedInput: {
    width: 140,
    background: 'var(--bg-raised)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '5px 8px',
    fontFamily: 'var(--font-doc)',
  },
  factionHeader: {
    margin: '28px 0 10px',
    fontSize: 17,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
    gap: 10,
  },
  card: {
    textAlign: 'left',
    background: 'var(--bg-raised)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '10px 12px',
    color: 'var(--text)',
    display: 'block',
    width: '100%',
  },
  cardName: { fontSize: 15, fontWeight: 600, marginBottom: 2 },
  tag: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontFamily: 'var(--font-doc)',
  },
  statRow: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
    fontSize: 12,
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-doc)',
  },
};

function NationCard({ nation, onPick }: { nation: Nation; onPick: () => void }) {
  const major = MAJOR_IDS.includes(nation.id);
  return (
    <button
      type="button"
      aria-label={`Play ${nation.name}`}
      onClick={onPick}
      style={{ ...styles.card, borderLeft: `4px solid ${nation.color}` }}
    >
      <div style={styles.cardName}>{nation.name}</div>
      <span style={{ ...styles.tag, color: major ? 'var(--accent)' : 'var(--danger)' }}>
        {major ? 'Full campaign' : 'Hard mode'}
      </span>
      <div style={styles.statRow}>
        <span>IC {Math.round(nation.ic)}</span>
        <span>Armies {nation.armies.length}</span>
        <span>Stability {nation.stability}</span>
      </div>
    </button>
  );
}

export default function NationPicker() {
  const newGame = useStore((s) => s.newGame);
  const [seedText, setSeedText] = useState('');

  const parseSeed = (): number | undefined => {
    const trimmed = seedText.trim();
    if (trimmed === '') return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? Math.abs(Math.trunc(n)) : undefined;
  };

  const byFaction = (faction: Faction): Nation[] =>
    Object.values(NATIONS_1938)
      .filter((n) => n.faction === faction)
      .sort((a, b) => b.ic - a.ic || a.name.localeCompare(b.name));

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Fulcrum: 1938–1948</h1>
      <p style={styles.subtitle}>A decade balanced on a point. Choose where you stand.</p>

      <div className="doc" style={styles.blurb}>{BLURB}</div>

      <div style={styles.seedRow}>
        <label htmlFor="seed-input">Campaign seed</label>
        <input
          id="seed-input"
          aria-label="Campaign seed"
          type="number"
          placeholder="random"
          value={seedText}
          onChange={(e) => setSeedText(e.target.value)}
          style={styles.seedInput}
        />
        <span style={{ fontSize: 12 }}>Same seed, same decisions, same war.</span>
      </div>

      {FACTION_ORDER.map((faction) => {
        const members = byFaction(faction);
        if (members.length === 0) return null;
        return (
          <section key={faction} aria-label={FACTION_LABELS[faction]}>
            <h2 style={{ ...styles.factionHeader, color: FACTION_COLOR[faction] }}>
              {FACTION_LABELS[faction]}
            </h2>
            <div style={styles.grid}>
              {members.map((n) => (
                <NationCard key={n.id} nation={n} onPick={() => newGame(n.id, parseSeed())} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
