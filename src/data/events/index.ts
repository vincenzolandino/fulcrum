// Aggregation of the 13 event packs (Task 13 merge). The engine and the UI
// import ALL_EVENTS from here and nowhere else; the per-pack arrays stay
// exported for the integrity tests, which check id prefixes per pack.

import type { GameEvent } from '../../engine/types';

import { PREWAR_EVENTS } from './prewar';
import { GERMANY_EVENTS } from './germany';
import { POLAND_EVENTS } from './poland';
import { USSR_EVENTS } from './ussr';
import { UK_EVENTS } from './uk';
import { FRANCE_EVENTS } from './france';
import { ITALY_EVENTS } from './italy';
import { JAPAN_EVENTS } from './japan';
import { USA_EVENTS } from './usa';
import { PACIFIC_EVENTS } from './pacific';
import { ENDGAME_EVENTS } from './endgame';
import { COVERT_EVENTS } from './covertOps';
import { GENERIC_EVENTS } from './generic';

export {
  PREWAR_EVENTS,
  GERMANY_EVENTS,
  POLAND_EVENTS,
  USSR_EVENTS,
  UK_EVENTS,
  FRANCE_EVENTS,
  ITALY_EVENTS,
  JAPAN_EVENTS,
  USA_EVENTS,
  PACIFIC_EVENTS,
  ENDGAME_EVENTS,
  COVERT_EVENTS,
  GENERIC_EVENTS,
};

export const ALL_EVENTS: GameEvent[] = [
  ...PREWAR_EVENTS,
  ...GERMANY_EVENTS,
  ...POLAND_EVENTS,
  ...USSR_EVENTS,
  ...UK_EVENTS,
  ...FRANCE_EVENTS,
  ...ITALY_EVENTS,
  ...JAPAN_EVENTS,
  ...USA_EVENTS,
  ...PACIFIC_EVENTS,
  ...ENDGAME_EVENTS,
  ...COVERT_EVENTS,
  ...GENERIC_EVENTS,
];
