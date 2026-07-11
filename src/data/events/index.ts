// STUB — the Task 13 content merge replaces this file with the aggregation of
// every event pack (prewar, germany, poland, ussr, uk, france, italy, japan,
// usa, pacific, endgame, covertOps, generic):
//
//   import { PREWAR_EVENTS } from './prewar';
//   ...
//   export const ALL_EVENTS: GameEvent[] = [...PREWAR_EVENTS, ...];
//
// Until then the engine runs with an empty event list; turn.ts and the tests
// import ALL_EVENTS from here and must keep working unchanged when the packs
// land.

import type { GameEvent } from '../../engine/types';

export const ALL_EVENTS: GameEvent[] = [];
