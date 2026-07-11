// End-of-game epilogue: pure string assembly from the final state. No LLM, no
// randomness — grading the same final state always yields the same text.
// Sections: the player's verdict against their objectives, one outcome
// paragraph per faction from victory-point holdings versus 1938, the first
// eight chronicle divergences (the forks that shaped this world), and the
// war-dead reckoning accumulated by turn.ts in the '_wardead_{id}' flags.

import type { Faction, GameState, NationId, Rng } from './types';
import { formatDate } from './types';
import { evalCondition } from './conditions';
import { scoreObjectives } from './victory';
import { OBJECTIVES } from '../data/objectives';
import { INITIAL_CONTROL, REGIONS } from '../data/regions';

/** Divergence entries quoted in the epilogue: the first N forks. */
export const EPILOGUE_DIVERGENCE_LIMIT = 8;

/** turn.ts accumulates cumulative war dead (thousands) under this key. */
export const WAR_DEAD_FLAG_PREFIX = '_wardead_';

// Deterministic rng for scoring conditions (same convention as victory.ts).
const NEVER_RNG: Rng = {
  next: () => 0,
  pick<T>(arr: T[]): T {
    return arr[0];
  },
  chance: () => false,
  int: (lo: number, _hi: number) => lo,
};

const FACTION_LABELS: Record<Faction, string> = {
  axis: 'The Axis',
  allies: 'The Allies',
  comintern: 'The Comintern',
  neutral: 'The uncommitted nations',
};

const FACTIONS: Faction[] = ['axis', 'allies', 'comintern', 'neutral'];

/** thousands → readable count. */
const fmtThousands = (k: number): string =>
  k >= 1000 ? `${(k / 1000).toFixed(1)} million` : `${Math.round(k)} thousand`;

/**
 * Victory points held per faction. `current` uses today's controllers;
 * otherwise the 1938 initial control map. Faction membership is read at game
 * end in both cases (a nation that later joined the Axis counts its 1938
 * holdings toward the Axis's start) — a deliberate simplification that keeps
 * the comparison about territory, not defections.
 */
function factionVp(state: GameState, current: boolean): Record<Faction, number> {
  const out: Record<Faction, number> = { axis: 0, allies: 0, comintern: 0, neutral: 0 };
  for (const [rid, rs] of Object.entries(state.regions)) {
    const vp = REGIONS[rid]?.vp ?? 0;
    const holder: NationId = current ? rs.controller : INITIAL_CONTROL[rid] ?? rs.owner;
    const faction = state.nations[holder]?.faction ?? 'neutral';
    out[faction] += vp;
  }
  return out;
}

function factionSentence(faction: Faction, now: number, start: number, world: number): string {
  const label = FACTION_LABELS[faction];
  const delta = now - start;
  const holding = `${label} end${faction === 'neutral' ? '' : 's'} the decade holding ${now} of the world's ${world} victory points`;
  let fate: string;
  if (delta >= 20) fate = 'an empire built in ten years of iron';
  else if (delta > 0) fate = 'ground gained and paid for';
  else if (delta === 0) fate = 'exactly what it began with';
  else if (delta > -20) fate = 'diminished, but standing';
  else fate = 'a power broken on the wheel of the decade';
  const swing = delta === 0 ? 'unchanged since 1938' : delta > 0 ? `up ${delta} since 1938` : `down ${-delta} since 1938`;
  return `${holding}, ${swing} — ${fate}.`;
}

export function buildEpilogue(state: GameState): string {
  const player = state.nations[state.playerNation];
  const playerName = player?.name ?? state.playerNation;
  const { score, verdict } = scoreObjectives(state, state.playerNation);
  const finalVerdict =
    state.gameOver !== null && state.gameOver.verdict !== '' ? state.gameOver.verdict : verdict;

  const paragraphs: string[] = [];

  // ---- Verdict header ----
  paragraphs.push(
    `${formatDate(state.turn)}. The ledger closes on ${playerName}. ` +
      `The verdict of the decade: ${finalVerdict}, at a score of ${score}.`,
  );

  // ---- Objectives ----
  const mine = OBJECTIVES.filter((o) => o.nation === state.playerNation);
  if (mine.length > 0) {
    const met = mine.filter((o) => evalCondition(o.check, state, NEVER_RNG));
    const list =
      met.length > 0 ? ` Achieved: ${met.map((o) => o.text).join(' ')}` : '';
    paragraphs.push(
      `Of ${mine.length} national objectives, ${met.length} ${met.length === 1 ? 'was' : 'were'} achieved.${list}`,
    );
  }

  // ---- Faction outcomes ----
  const now = factionVp(state, true);
  const start = factionVp(state, false);
  const world = Object.values(now).reduce((sum, v) => sum + v, 0);
  for (const f of FACTIONS) {
    if (now[f] === 0 && start[f] === 0) continue; // a camp that never held ground
    paragraphs.push(factionSentence(f, now[f], start[f], world));
  }

  // ---- Divergences ----
  const forks = state.chronicle
    .filter((e) => e.divergence)
    .slice(0, EPILOGUE_DIVERGENCE_LIMIT);
  if (forks.length > 0) {
    const lines = forks.map((e) => `• ${formatDate(e.turn)} — ${e.text}`);
    paragraphs.push(`Where this world left ours:\n${lines.join('\n')}`);
  } else {
    paragraphs.push('History ran close to the course we know. The forks were few, and small.');
  }

  // ---- War dead ----
  const tolls: [NationId, number][] = [];
  for (const [key, value] of Object.entries(state.flags)) {
    if (!key.startsWith(WAR_DEAD_FLAG_PREFIX) || typeof value !== 'number' || value <= 0) continue;
    tolls.push([key.slice(WAR_DEAD_FLAG_PREFIX.length), value]);
  }
  const total = tolls.reduce((sum, [, v]) => sum + v, 0);
  if (total > 0) {
    tolls.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const worst = tolls
      .slice(0, 3)
      .map(([id, v]) => `${state.nations[id]?.name ?? id} (${fmtThousands(v)})`)
      .join(', ');
    paragraphs.push(
      `The butcher's bill, by the reckonings available, runs to some ${fmtThousands(total)} soldiers. ` +
        `The heaviest tolls fell on ${worst}.`,
    );
  } else {
    paragraphs.push(
      'By the reckonings available, the decade closes without a great slaughter — a mercy our own history was not granted.',
    );
  }

  return paragraphs.join('\n\n');
}
