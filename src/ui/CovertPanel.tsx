// The intelligence service: network bars per target, the mission launcher
// with an odds preview computed from the same balance constants the engine
// resolves against, and the docket of missions underway.

import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { CovertMission, Nation } from '../engine/types';
import {
  NETWORK_BUILD_GAIN,
  NETWORK_BUILD_TURNS,
  NETWORK_DETECTION_CHANCE,
  OP_BASE_ODDS,
  OP_NETWORK_ODDS_DIVISOR,
  OP_NETWORK_REQUIREMENTS,
} from '../engine/balance';
import { useStore } from '../store';

type MissionType = CovertMission['type'];

const MISSION_TYPES: { id: MissionType; label: string }[] = [
  { id: 'buildNetwork', label: 'Build network' },
  { id: 'stealIntel', label: 'Steal intelligence' },
  { id: 'sabotage', label: 'Sabotage industry' },
  { id: 'coup', label: 'Sponsor coup' },
  { id: 'assassinate', label: 'Assassinate leader' },
];

// Mirrors covert.ts's private COUP_ZEAL_ODDS_FACTOR for the preview only.
// The engine remains the source of truth at resolution time; if the balance
// pass lifts that constant into balance.ts, import it here instead.
const COUP_ZEAL_ODDS_FACTOR = 0.2;

/** Success odds as the engine will compute them; null for buildNetwork. */
function previewOdds(type: MissionType, network: number, target: Nation): number | null {
  if (type === 'buildNetwork') return null;
  let odds = OP_BASE_ODDS[type] + network / OP_NETWORK_ODDS_DIVISOR;
  if (type === 'coup') odds -= target.ai.ideologyZeal * COUP_ZEAL_ODDS_FACTOR;
  return Math.max(0, Math.min(1, odds));
}

const styles: Record<string, CSSProperties> = {
  heading: { margin: '0 0 10px', fontSize: 16 },
  subHead: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: 'var(--text-dim)',
    margin: '14px 0 6px',
  },
  launcher: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '10px 11px',
  },
  select: {
    width: '100%',
    background: 'var(--bg-raised)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 2,
    padding: '4px 5px',
    fontSize: 12,
    marginBottom: 7,
  },
  preview: { fontSize: 11.5, color: 'var(--text-dim)', margin: '2px 0 8px', lineHeight: 1.45 },
  odds: { color: 'var(--accent)', fontFamily: 'var(--font-doc)' },
  blocked: { color: 'var(--danger)' },
  launch: {
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    borderRadius: 3,
    padding: '6px 14px',
    fontWeight: 700,
    fontSize: 12,
  },
  launchDisabled: { opacity: 0.45, cursor: 'not-allowed' },
  netRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 11.5 },
  netName: { width: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  netShell: {
    flex: 1,
    height: 7,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  netValue: { width: 26, textAlign: 'right', fontFamily: 'var(--font-doc)' },
  mission: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '6px 9px',
    marginBottom: 5,
    fontSize: 11.5,
  },
  empty: { color: 'var(--text-dim)', fontSize: 11.5 },
};

export default function CovertPanel() {
  const game = useStore((s) => s.game);
  const startCovert = useStore((s) => s.startCovert);
  const [target, setTarget] = useState<string>('');
  const [type, setType] = useState<MissionType>('buildNetwork');

  if (game === null) return null;
  const me = game.nations[game.playerNation];
  if (me === undefined) return null;

  const candidates = Object.values(game.nations)
    .filter((n) => n.alive && n.id !== game.playerNation)
    .sort((a, b) => a.name.localeCompare(b.name));

  const targetNation = target === '' ? undefined : game.nations[target];
  const network = targetNation === undefined ? 0 : me.spyNetworks[targetNation.id] ?? 0;
  const requirement = type === 'buildNetwork' ? 0 : OP_NETWORK_REQUIREMENTS[type];
  const busy =
    targetNation !== undefined &&
    game.missions.some((m) => m.owner === game.playerNation && m.target === targetNation.id);
  const short = targetNation !== undefined && network < requirement;
  const canLaunch = targetNation !== undefined && !busy && !short;
  const odds = targetNation === undefined ? null : previewOdds(type, network, targetNation);

  const networks = Object.entries(me.spyNetworks)
    .filter(([id, v]) => v > 0 && game.nations[id]?.alive === true)
    .sort((a, b) => b[1] - a[1]);

  const myMissions = game.missions.filter((m) => m.owner === game.playerNation);
  const typeLabel = (t: MissionType): string =>
    MISSION_TYPES.find((m) => m.id === t)?.label ?? t;

  return (
    <section aria-label="Covert operations">
      <h2 style={styles.heading}>Intelligence Service</h2>

      <div style={styles.launcher}>
        <select
          aria-label="Covert target"
          style={styles.select}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          <option value="">Select a target nation</option>
          {candidates.map((n) => (
            <option key={n.id} value={n.id}>{n.name}</option>
          ))}
        </select>
        <select
          aria-label="Covert operation"
          style={styles.select}
          value={type}
          onChange={(e) => setType(e.target.value as MissionType)}
        >
          {MISSION_TYPES.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <div style={styles.preview}>
          {targetNation === undefined && 'Pick a target to see the estimate.'}
          {targetNation !== undefined && type === 'buildNetwork' && (
            <>
              {NETWORK_BUILD_TURNS} months to establish; network +{NETWORK_BUILD_GAIN}.{' '}
              Detection risk <span style={styles.odds}>{Math.round(NETWORK_DETECTION_CHANCE * 100)}%</span>.
            </>
          )}
          {targetNation !== undefined && type !== 'buildNetwork' && (
            <>
              Network in {targetNation.name}: {Math.round(network)} (requires {requirement}).{' '}
              {odds !== null && (
                <>Estimated odds <span style={styles.odds}>{Math.round(odds * 100)}%</span>.</>
              )}
              {short && <div style={styles.blocked}>Our network there is too thin for this operation.</div>}
            </>
          )}
          {busy && <div style={styles.blocked}>A mission against this target is already underway.</div>}
        </div>
        <button
          type="button"
          style={{ ...styles.launch, ...(canLaunch ? undefined : styles.launchDisabled) }}
          disabled={!canLaunch}
          onClick={() => {
            if (targetNation !== undefined) startCovert(targetNation.id, type);
          }}
        >
          Launch mission
        </button>
      </div>

      <div style={styles.subHead}>Networks</div>
      {networks.length === 0 && <p style={styles.empty}>No networks established abroad.</p>}
      {networks.map(([id, value]) => (
        <div key={id} style={styles.netRow}>
          <span style={styles.netName}>{game.nations[id]?.name ?? id}</span>
          <div
            style={styles.netShell}
            role="meter"
            aria-label={`Network in ${game.nations[id]?.name ?? id}`}
            aria-valuenow={Math.round(value)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(100, value))}%`,
                height: '100%',
                background: 'var(--accent)',
              }}
            />
          </div>
          <span style={styles.netValue}>{Math.round(value)}</span>
        </div>
      ))}

      <div style={styles.subHead}>Missions underway</div>
      {myMissions.length === 0 && <p style={styles.empty}>No missions underway.</p>}
      {myMissions.map((m) => (
        <div key={m.id} style={styles.mission}>
          {typeLabel(m.type)} in {game.nations[m.target]?.name ?? m.target}
          {' · '}
          {m.turnsLeft <= 1 ? 'resolves this month' : `${m.turnsLeft} months remain`}
        </div>
      ))}
    </section>
  );
}
