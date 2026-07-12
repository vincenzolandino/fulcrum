// Headless balance harness. Plays AI-only campaigns from a neutral vantage
// (Switzerland, so the player nation does nothing) and reports when the war's
// landmark events fire across seeds. Run: npm run sim [seeds]
//
// It answers the pacing question the balance pass exists to tune: does the
// pre-war period breathe through 1938, do the major wars land near their
// historical months, and is the war resolved by 1948.

import { buildInitialState } from '../src/engine/setup';
import { resolveTurn } from '../src/engine/turn';
import { formatDate } from '../src/engine/types';
import { FINAL_TURN } from '../src/engine/balance';
import type { GameState, NationId } from '../src/engine/types';

// Minimal Node globals — this harness runs under tsx, not in the browser
// bundle, and the project deliberately carries no @types/node.
declare const process: { argv: string[] };
declare const console: { log: (...args: unknown[]) => void };

const SEEDS = Number.parseInt(process.argv[2] ?? '24', 10);

// A war between two nations exists this turn.
const atWar = (s: GameState, a: NationId, b: NationId): boolean =>
  s.wars.some(
    (w) =>
      (w.attackers.includes(a) && w.defenders.includes(b)) ||
      (w.attackers.includes(b) && w.defenders.includes(a)),
  );

const dead = (s: GameState, id: NationId): boolean => !s.nations[id]?.alive;

interface Milestones {
  gerPol: number | null; // Germany-Poland war
  gerFra: number | null; // Germany-France war
  gerSov: number | null; // Barbarossa
  japUsa: number | null; // Pacific war
  fraFell: number | null; // France dead or exiled
  firstMajorWar: number | null; // first war among the great powers
  endTurn: number;
}

const MAJORS: NationId[] = ['GER', 'FRA', 'UK', 'SOV', 'ITA', 'JAP', 'USA'];

function runOne(seed: number): Milestones {
  let s = buildInitialState('SUI', seed);
  const m: Milestones = {
    gerPol: null, gerFra: null, gerSov: null, japUsa: null,
    fraFell: null, firstMajorWar: null, endTurn: FINAL_TURN,
  };
  for (let t = 0; t < FINAL_TURN; t++) {
    s = resolveTurn(s, { aiControlsPlayer: true });
    const turn = s.turn;
    if (m.gerPol === null && atWar(s, 'GER', 'POL')) m.gerPol = turn;
    if (m.gerFra === null && atWar(s, 'GER', 'FRA')) m.gerFra = turn;
    if (m.gerSov === null && atWar(s, 'GER', 'SOV')) m.gerSov = turn;
    if (m.japUsa === null && atWar(s, 'JAP', 'USA')) m.japUsa = turn;
    if (m.fraFell === null && (dead(s, 'FRA') || s.flags.EXILE_FRA === true)) m.fraFell = turn;
    if (m.firstMajorWar === null) {
      for (let i = 0; i < MAJORS.length; i++) {
        for (let j = i + 1; j < MAJORS.length; j++) {
          if (atWar(s, MAJORS[i], MAJORS[j])) { m.firstMajorWar = turn; break; }
        }
        if (m.firstMajorWar !== null) break;
      }
    }
    if (s.gameOver !== null) { m.endTurn = turn; break; }
  }
  return m;
}

// One instrumented run to see the tension curve and who holds what.
function tensionCurve(seed: number): string {
  let s = buildInitialState('SUI', seed);
  const marks: string[] = [];
  for (let t = 0; t < 30; t++) {
    s = resolveTurn(s, { aiControlsPlayer: true });
    if ([2, 6, 9, 12, 15, 18, 21, 24].includes(s.turn)) {
      marks.push(`${formatDate(s.turn).slice(0, 3)}${String(1938 + Math.floor(s.turn / 12)).slice(2)}=${Math.round(s.tension)}`);
    }
  }
  const ger = s.nations.GER;
  return `tension ${marks.join(' ')} | GER holds Austria=${s.regions['aus-austria']?.controller === 'GER'} Sudeten=${s.regions['cze-sudetenland']?.controller === 'GER'}`;
}

const results: Milestones[] = [];
for (let i = 0; i < SEEDS; i++) results.push(runOne(1000 + i * 7));
console.log(`\nprobe: ${tensionCurve(1000)}`);

const pct = (pred: (m: Milestones) => boolean): string =>
  `${Math.round((results.filter(pred).length / results.length) * 100)}%`;

const median = (get: (m: Milestones) => number | null): string => {
  const xs = results.map(get).filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (xs.length === 0) return '—';
  const mid = xs[Math.floor(xs.length / 2)];
  return formatDate(mid);
};

console.log(`\nFulcrum balance report — ${SEEDS} AI-only campaigns\n${'='.repeat(52)}`);
console.log(`First great-power war   median ${median((m) => m.firstMajorWar)}   (target: 1939)`);
console.log(`Germany–Poland war      ${pct((m) => m.gerPol !== null && m.gerPol <= 23)} by end 1939   median ${median((m) => m.gerPol)}`);
console.log(`Germany–France war      ${pct((m) => m.gerFra !== null)} ever   median ${median((m) => m.gerFra)}`);
console.log(`France falls            ${pct((m) => m.fraFell !== null && m.fraFell <= 47)} by end 1941   median ${median((m) => m.fraFell)}`);
console.log(`Barbarossa (GER–SOV)    ${pct((m) => m.gerSov !== null)} ever   median ${median((m) => m.gerSov)}`);
console.log(`Pacific (JAP–USA)       ${pct((m) => m.japUsa !== null)} ever   median ${median((m) => m.japUsa)}`);
console.log(`Game resolved by 1948   ${pct((m) => m.endTurn < FINAL_TURN)}`);
console.log(`Median campaign end     ${median((m) => m.endTurn)}\n`);
