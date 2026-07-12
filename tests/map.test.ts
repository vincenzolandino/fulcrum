// Map geometry integrity: every region defined in src/data/regions.ts has a
// drawable SVG path and a label position inside the 1400x900 viewBox, the
// paths are closed simple polygons (M/L/Z only), and no stray geometry
// references regions that do not exist.

import { describe, expect, it } from 'vitest';
import { REGION_IDS } from '../src/data/regions';
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  REGION_LABEL_POS,
  REGION_PATHS,
  REGION_POLYGONS,
} from '../src/ui/mapGeometry';

describe('map geometry', () => {
  it('gives every region a non-empty path starting with M', () => {
    for (const id of REGION_IDS) {
      const path = REGION_PATHS[id];
      expect(path, `path for ${id}`).toBeTypeOf('string');
      expect(path.length, `path for ${id} is empty`).toBeGreaterThan(0);
      expect(path.startsWith('M'), `path for ${id} must start with M`).toBe(true);
    }
  });

  it('paths parse as closed polygons using only M/L/Z commands', () => {
    // "M x y L x y L x y ... Z" with at least three vertices.
    const shape = /^M-?\d+(\.\d+)? -?\d+(\.\d+)?( L-?\d+(\.\d+)? -?\d+(\.\d+)?){2,} Z$/;
    for (const id of REGION_IDS) {
      expect(REGION_PATHS[id], `path for ${id} must be M/L/Z closed`).toMatch(shape);
    }
  });

  it('gives every region a label position inside the viewBox', () => {
    for (const id of REGION_IDS) {
      const pos = REGION_LABEL_POS[id];
      expect(pos, `label pos for ${id}`).toBeDefined();
      const [x, y] = pos;
      expect(Number.isFinite(x), `label x for ${id}`).toBe(true);
      expect(Number.isFinite(y), `label y for ${id}`).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(MAP_WIDTH);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(MAP_HEIGHT);
    }
  });

  it('has no geometry for unknown regions', () => {
    const known = new Set<string>(REGION_IDS);
    for (const id of Object.keys(REGION_PATHS)) {
      expect(known.has(id), `stray path ${id}`).toBe(true);
    }
    for (const id of Object.keys(REGION_LABEL_POS)) {
      expect(known.has(id), `stray label pos ${id}`).toBe(true);
    }
  });

  it('keeps every polygon vertex inside the viewBox', () => {
    for (const id of REGION_IDS) {
      for (const [x, y] of REGION_POLYGONS[id]) {
        expect(x, `${id} vertex x`).toBeGreaterThanOrEqual(0);
        expect(x, `${id} vertex x`).toBeLessThanOrEqual(MAP_WIDTH);
        expect(y, `${id} vertex y`).toBeGreaterThanOrEqual(0);
        expect(y, `${id} vertex y`).toBeLessThanOrEqual(MAP_HEIGHT);
      }
    }
  });
});
