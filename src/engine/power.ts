// Military power math. Used by the AI, the strengthRatio condition, and combat.
// Pure calculations over a Nation; no state, no randomness.

import type { Nation } from './types';
import { POWER_ARMOR_BONUS, POWER_ARMY_SCALE, POWER_DOCTRINE_BONUS } from './balance';

// The type contract stores strength/equipment/navy/air on 0–100 / 0–1000 point
// scales; this divisor normalizes them. A scale definition, not a tunable.
const SCALE = 100;

/**
 * landPower(n) = Σ armies (strength/100 × equipment/100
 *   × (1 + POWER_ARMOR_BONUS·tech.armor + POWER_DOCTRINE_BONUS·tech.doctrine))
 *   × POWER_ARMY_SCALE
 */
export function landPower(n: Nation): number {
  const techMod = 1 + POWER_ARMOR_BONUS * n.tech.armor + POWER_DOCTRINE_BONUS * n.tech.doctrine;
  let sum = 0;
  for (const a of n.armies) {
    sum += (a.strength / SCALE) * (a.equipment / SCALE) * techMod;
  }
  return sum * POWER_ARMY_SCALE;
}

/** totalPower(n) = landPower + navy/100 + air/100 */
export function totalPower(n: Nation): number {
  return landPower(n) + n.navy / SCALE + n.air / SCALE;
}
