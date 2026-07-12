// buildInitialState: assembles the January 1938 GameState from src/data.
// Everything is deep-copied so two games never share objects with each other
// or with the data modules. Pure and deterministic — no randomness needed to
// lay out the world as it stood.

import type { GameState, Nation, NationId, RegionId, RegionState, War } from './types';
import { NATIONS_1938 } from '../data/nations';
import { INITIAL_CONTROL } from '../data/regions';
import { computeIc } from './economy';

// Initial-condition data (world state of January 1938), not formula tunables.
const INITIAL_TENSION = 15; // the Anschluss is brewing
const SINO_JAPANESE_START_TURN = -6; // July 1937, six months before turn 0
const WAR_RELATIONS_FLOOR = -100; // relations scale bound from the type contract

const copyNation = (n: Nation): Nation => ({
  ...n,
  stockpile: { ...n.stockpile },
  icAllocation: { ...n.icAllocation },
  armies: n.armies.map((a) => ({ ...a })),
  relations: { ...n.relations },
  guarantees: [...n.guarantees],
  pacts: n.pacts.map((p) => ({ ...p })),
  claims: [...n.claims],
  spyNetworks: { ...n.spyNetworks },
  tech: { ...n.tech },
  research: { ...n.research },
  ai: { ...n.ai },
});

export function buildInitialState(playerNation: NationId, seed: number): GameState {
  if (!NATIONS_1938[playerNation]) {
    throw new Error(`buildInitialState: unknown nation '${playerNation}'`);
  }

  const nations: Record<NationId, Nation> = {};
  for (const [id, n] of Object.entries(NATIONS_1938)) nations[id] = copyNation(n);

  const regions: Record<RegionId, RegionState> = {};
  for (const [rid, owner] of Object.entries(INITIAL_CONTROL)) {
    regions[rid] = { owner, controller: owner, entrenchment: 0 };
  }

  // The Second Sino-Japanese War has been burning since July 1937. Manchukuo
  // marches with its master (puppet + alliance pact with Japan).
  const sinoJapaneseWar: War = {
    id: 'war-JAP-CHI-t-6',
    attackers: ['JAP', 'MAN'],
    defenders: ['CHI'],
    startTurn: SINO_JAPANESE_START_TURN,
  };
  // Belligerents sit at the wartime relations floor (declareWar convention).
  for (const a of sinoJapaneseWar.attackers) {
    for (const d of sinoJapaneseWar.defenders) {
      if (!nations[a] || !nations[d]) continue;
      nations[a].relations[d] = WAR_RELATIONS_FLOOR;
      nations[d].relations[a] = WAR_RELATIONS_FLOOR;
    }
  }

  const state: GameState = {
    seed,
    turn: 0,
    playerNation,
    nations,
    regions,
    wars: [sinoJapaneseWar],
    tension: INITIAL_TENSION,
    flags: {},
    firedEvents: [],
    queuedEvents: [],
    pendingChoices: [],
    missions: [],
    activeBattles: [],
    chronicle: [],
    reports: [],
    gameOver: null,
  };

  // Initial ic per nation via the same stability- and supply-scaled formula
  // economy.ts applies every turn, so turn 0 is consistent with every later
  // turn. (These are freshly built local objects; no input is mutated.)
  for (const id of Object.keys(nations)) {
    nations[id].ic = computeIc(state, id);
  }

  return state;
}
