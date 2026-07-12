// The map's action panel. Clicking a region on the map used to do nothing
// but highlight it — the actual redeploy flow lived entirely in the Fronts
// tab and required arming an army there first, then clicking the map second.
// This panel inverts that: click a region, see who holds it and who's
// garrisoned there, and act on it directly — move a nearby army in to
// reinforce, attack from an adjacent army via posture (attacking is posture,
// not movement: an army only fights a hostile region it stands next to, per
// combat.ts), or declare war outright on a valid neutral target, with a
// preview of who that pulls in.

import type { CSSProperties } from 'react';
import type { Posture } from '../engine/types';
import { REGIONS } from '../data/regions';
import { atWar, canDeclareWar, coalitionOf, useStore } from '../store';

const POSTURES: { id: Posture; label: string }[] = [
  { id: 'allout', label: 'All-out attack' },
  { id: 'offensive', label: 'Offensive' },
  { id: 'hold', label: 'Hold' },
  { id: 'elastic', label: 'Elastic defence' },
  { id: 'retreat', label: 'Retreat' },
];

const styles: Record<string, CSSProperties> = {
  wrap: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    width: 300,
    maxHeight: 'calc(100% - 20px)',
    overflowY: 'auto',
    background: 'var(--bg-raised)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
    padding: '12px 14px',
    fontSize: 12.5,
    zIndex: 10,
  },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontFamily: 'var(--font-doc)', fontSize: 15, margin: 0 },
  sub: { color: 'var(--text-dim)', fontSize: 11, marginTop: 2 },
  closeBtn: {
    background: 'transparent',
    color: 'var(--text-dim)',
    border: 'none',
    fontSize: 15,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 2,
  },
  section: { marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' },
  sectionHead: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'var(--text-dim)',
    marginBottom: 6,
  },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 5 },
  rowName: { flex: 1, minWidth: 0 },
  dim: { color: 'var(--text-dim)' },
  select: {
    background: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 2,
    fontSize: 11,
    padding: '2px 3px',
  },
  btn: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 2,
    padding: '3px 8px',
    fontSize: 11,
    whiteSpace: 'nowrap',
  },
  dangerBtn: {
    display: 'block',
    width: '100%',
    background: 'transparent',
    color: 'var(--danger)',
    border: '1px solid var(--danger)',
    borderRadius: 2,
    padding: '7px 10px',
    fontSize: 12,
    marginTop: 4,
  },
  coalitionNote: { color: 'var(--text-dim)', fontSize: 11, marginBottom: 6, lineHeight: 1.4 },
  emptyNote: { color: 'var(--text-dim)', fontSize: 11.5 },
};

export default function RegionPopover() {
  const game = useStore((s) => s.game);
  const selectedRegion = useStore((s) => s.selectedRegion);
  const setSelectedRegion = useStore((s) => s.setSelectedRegion);
  const setPosture = useStore((s) => s.setPosture);
  const moveArmy = useStore((s) => s.moveArmy);
  const declareWar = useStore((s) => s.declareWar);

  if (game === null || selectedRegion === null) return null;
  const rs = game.regions[selectedRegion];
  const region = REGIONS[selectedRegion];
  if (!rs || !region) return null;

  const controller = game.nations[rs.controller];
  const me = game.nations[game.playerNation];
  const isMine = rs.controller === game.playerNation;
  const hostile = !isMine && atWar(game, game.playerNation, rs.controller);
  const declarable = canDeclareWar(game, rs.controller);

  const garrison = Object.values(game.nations).flatMap((n) =>
    n.armies.filter((a) => a.location === selectedRegion).map((army) => ({ army, nation: n })),
  );

  const nearby = (me?.armies ?? []).filter((a) => region.adjacent.includes(a.location));
  const coalition = declarable ? coalitionOf(game, rs.controller) : [];

  return (
    <div className="doc" style={styles.wrap} role="dialog" aria-label={region.name}>
      <div style={styles.head}>
        <div>
          <h3 style={styles.title}>{region.name}</h3>
          <div style={styles.sub}>
            {region.terrain} · IC {region.ic} · {controller?.name ?? rs.controller}
          </div>
        </div>
        <button
          type="button"
          style={styles.closeBtn}
          aria-label="Close region panel"
          onClick={() => setSelectedRegion(null)}
        >
          ×
        </button>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHead}>Garrison</div>
        {garrison.length === 0 && <div style={styles.emptyNote}>No field armies present.</div>}
        {garrison.map(({ army, nation }) => (
          <div key={army.id} style={styles.row}>
            <span style={styles.rowName}>
              {nation.name}: {army.name}{' '}
              <span style={styles.dim}>
                (STR {Math.round(army.strength)} EQP {Math.round(army.equipment)})
              </span>
            </span>
            {nation.id === game.playerNation && (
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
            )}
          </div>
        ))}
      </div>

      {hostile && nearby.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHead}>Attack from here</div>
          {nearby.map((a) => (
            <div key={a.id} style={styles.row}>
              <span style={styles.rowName}>
                {a.name} <span style={styles.dim}>at {REGIONS[a.location]?.name ?? a.location}</span>
              </span>
              <button type="button" style={styles.btn} onClick={() => setPosture(a.id, 'offensive')}>
                Attack
              </button>
            </div>
          ))}
        </div>
      )}

      {!hostile && nearby.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHead}>Move a nearby army here</div>
          {nearby.map((a) => (
            <div key={a.id} style={styles.row}>
              <span style={styles.rowName}>
                {a.name} <span style={styles.dim}>at {REGIONS[a.location]?.name ?? a.location}</span>
              </span>
              <button type="button" style={styles.btn} onClick={() => moveArmy(a.id, selectedRegion)}>
                Move in
              </button>
            </div>
          ))}
        </div>
      )}

      {!isMine && !hostile && declarable && (
        <div style={styles.section}>
          <div style={styles.sectionHead}>Declare War</div>
          {coalition.length > 0 && (
            <div style={styles.coalitionNote}>
              {controller?.name ?? rs.controller}&rsquo;s allies will join the defence:{' '}
              {coalition.map((id) => game.nations[id]?.name ?? id).join(', ')}.
            </div>
          )}
          <button type="button" style={styles.dangerBtn} onClick={() => declareWar(rs.controller)}>
            Declare War on {controller?.name ?? rs.controller}
          </button>
        </div>
      )}
    </div>
  );
}
