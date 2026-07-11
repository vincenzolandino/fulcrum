import type { Rng } from './types';

// mulberry32 — small, fast, deterministic. All engine randomness flows through here.
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    pick<T>(arr: T[]): T {
      if (arr.length === 0) throw new Error('rng.pick on empty array');
      return arr[Math.floor(next() * arr.length)];
    },
    chance(p: number): boolean {
      if (p <= 0) return false;
      if (p >= 1) return true;
      return next() < p;
    },
    int(lo: number, hi: number): number {
      return lo + Math.floor(next() * (hi - lo + 1));
    },
  };
}

// Deterministic per-turn rng derivation: same seed + same turn = same stream.
export const hashSeed = (a: number, b: number): number => (a ^ Math.imul(b, 2654435761)) >>> 0;

export const turnRng = (seed: number, turn: number): Rng => makeRng(hashSeed(seed, turn + 1));
