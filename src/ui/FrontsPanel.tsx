// The player's order of battle. Each army card offers a posture select and a
// Redeploy button that arms a map-click target mode: the next region clicked
// on the map (observed through store.selectedRegion) becomes the army's
// moveTarget, validated by the store's adjacency rule.

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Posture, RegionId } from '../engine/types';
import { REGIONS } from '../data/regions';
import { useStore } from '../store';

const POSTURES: { id: Posture; label: string }[] = [
  { id: 'allout', label: 'All-out attack' },
  { id: 'offensive', label: 'Offensive' },
  { id: 'hold', label: 'Hold' },
  { id: 'elastic', label: 'Elastic defence' },
  { id: 'retreat', label: 'Retreat' },
];

const regionName = (id: RegionId): string => REGIONS[id]?.name ?? id;

const styles: Record<string, CSSProperties> = {
  heading: { margin: '0 0 10px', fontSize: 16 },
  card: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '9px 11px',
    marginBottom: 8,
  },
  name: { fontFamily: 'var(--font-doc)', fontSize: 13.5 },
  where: { color: 'var(--text-dim)', fontSize: 11.5, marginTop: 1 },
  stats: { display: 'flex', gap: 12, margin: '6px 0', fontSize: 11.5 },
  statLabel: { color: 'var(--text-dim)', marginRight: 3 },
  controls: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  select: {
    background: 'var(--bg-raised)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 2,
    padding: '3px 4px',
    fontSize: 12,
  },
  btn: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 2,
    padding: '3px 9px',
    fontSize: 11.5,
  },
  cancelBtn: {
    background: 'transparent',
    color: 'var(--text-dim)',
    border: '1px solid var(--border)',
    borderRadius: 2,
    padding: '3px 9px',
    fontSize: 11.5,
  },
  moveNote: { color: 'var(--accent)', fontSize: 11.5, marginTop: 5 },
  arming: { color: 'var(--accent)', fontSize: 11.5, fontFamily: 'var(--font-doc)' },
  note: {
    marginTop: 8,
    padding: '6px 9px',
    border: '1px dashed var(--border)',
    borderRadius: 2,
    fontSize: 11.5,
    color: 'var(--text-dim)',
  },
  empty: { color: 'var(--text-dim)', fontFamily: 'var(--font-doc)', fontSize: 13 },
};

export default function FrontsPanel() {
  const game = useStore((s) => s.game);
  const setPosture = useStore((s) => s.setPosture);
  const moveArmy = useStore((s) => s.moveArmy);
  const selectedRegion = useStore((s) => s.selectedRegion);

  // Armed redeploy: remember which army waits for a map click and which
  // region was already selected at arming time, so only a fresh click counts.
  const [arming, setArming] = useState<{ armyId: string; ignore: RegionId | null } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (arming === null || selectedRegion === null || selectedRegion === arming.ignore) return;
    moveArmy(arming.armyId, selectedRegion);
    const g = useStore.getState().game;
    const army = g?.nations[g.playerNation]?.armies.find((a) => a.id === arming.armyId);
    const where = regionName(selectedRegion);
    if (army === undefined) setNote(null);
    else if (army.moveTarget === selectedRegion) setNote(`Orders cut: ${army.name} redeploys to ${where} next month.`);
    else if (army.location === selectedRegion) setNote(`${army.name} already stands at ${where}; redeploy order cancelled.`);
    else setNote(`${where} is not adjacent to ${army.name}. Orders refused.`);
    setArming(null);
  }, [selectedRegion, arming, moveArmy]);

  if (game === null) return null;
  const me = game.nations[game.playerNation];
  if (me === undefined) return null;

  return (
    <section aria-label="Fronts">
      <h2 style={styles.heading}>Order of Battle</h2>
      {me.armies.length === 0 && <p style={styles.empty}>No field armies remain under our flag.</p>}
      {me.armies.map((army) => {
        const armed = arming !== null && arming.armyId === army.id;
        return (
          <div key={army.id} style={styles.card}>
            <div style={styles.name}>{army.name}</div>
            <div style={styles.where}>at {regionName(army.location)}</div>
            <div style={styles.stats}>
              <span><span style={styles.statLabel}>STR</span>{Math.round(army.strength)}</span>
              <span><span style={styles.statLabel}>EQP</span>{Math.round(army.equipment)}</span>
              <span><span style={styles.statLabel}>EXP</span>{Math.round(army.experience)}</span>
            </div>
            <div style={styles.controls}>
              <select
                aria-label={`Posture for ${army.name}`}
                style={styles.select}
                value={army.posture}
                onChange={(e) => setPosture(army.id, e.target.value as Posture)}
              >
                {POSTURES.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              {armed ? (
                <>
                  <span style={styles.arming}>Click a region on the map…</span>
                  <button type="button" style={styles.cancelBtn} onClick={() => setArming(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  style={styles.btn}
                  onClick={() => {
                    setNote(null);
                    setArming({ armyId: army.id, ignore: selectedRegion });
                  }}
                >
                  Redeploy {army.name}
                </button>
              )}
            </div>
            {army.moveTarget !== null && (
              <div style={styles.moveNote}>
                Redeploying to {regionName(army.moveTarget)}{' '}
                <button
                  type="button"
                  style={styles.cancelBtn}
                  onClick={() => moveArmy(army.id, army.location)}
                >
                  Hold instead
                </button>
              </div>
            )}
          </div>
        );
      })}
      {note !== null && <div style={styles.note}>{note}</div>}
    </section>
  );
}
