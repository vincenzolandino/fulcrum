import { describe, it, expect } from 'vitest';
import { makeRng, hashSeed, turnRng } from '../src/engine/rng';

describe('makeRng', () => {
  it('same seed produces identical sequences', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds produce different sequences', () => {
    const a = makeRng(1);
    const b = makeRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() stays in [0, 1)', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(1,6) stays in bounds and hits both ends', () => {
    const rng = makeRng(11);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.has(1)).toBe(true);
    expect(seen.has(6)).toBe(true);
  });

  it('chance(0) is always false, chance(1) always true', () => {
    const rng = makeRng(3);
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('pick returns elements from the array', () => {
    const rng = makeRng(5);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
  });

  it('turnRng is deterministic per seed+turn and differs across turns', () => {
    expect(turnRng(42, 3).next()).toBe(turnRng(42, 3).next());
    expect(turnRng(42, 3).next()).not.toBe(turnRng(42, 4).next());
    expect(hashSeed(1, 2)).toBe(hashSeed(1, 2));
  });
});
