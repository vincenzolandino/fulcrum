// The strategic map: an SVG briefing-room view of the world. Fill is the
// controlling nation's colour, stroke the controller's faction accent;
// regions whose controller is fighting an active war get a slow animated
// dashed front-line stroke, the selected region a gold outline, and the
// player's armies stack up as small counted chips at each region's label
// position. Wheel zooms toward the cursor and dragging pans, both via plain
// viewBox math (no library). Hover shows name, terrain and IC via <title>.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { Faction, GameState, NationId, RegionId } from '../engine/types';
import { REGIONS } from '../data/regions';
import { MAP_HEIGHT, MAP_WIDTH, REGION_LABEL_POS, REGION_PATHS } from './mapGeometry';

export interface MapViewProps {
  state: GameState;
  selected: RegionId | null;
  onSelect: (region: RegionId) => void;
  playerNation: NationId;
}

const FACTION_STROKE: Record<Faction, string> = {
  axis: 'var(--axis)',
  allies: 'var(--allies)',
  comintern: 'var(--comintern)',
  neutral: 'var(--neutral)',
};

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const HOME_VIEW: ViewBox = { x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT };
const ASPECT = MAP_HEIGHT / MAP_WIDTH;
const MIN_VIEW_W = MAP_WIDTH / 8; // deepest zoom-in
const MAX_VIEW_W = MAP_WIDTH * 1.6; // furthest zoom-out
const DRAG_THRESHOLD_PX = 4; // screen px before a press counts as a pan, not a click

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

const styles: Record<string, CSSProperties> = {
  frame: {
    width: '100%',
    height: '100%',
    minHeight: 320,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    overflow: 'hidden',
    position: 'relative',
  },
  svg: {
    width: '100%',
    height: '100%',
    display: 'block',
    touchAction: 'none',
    userSelect: 'none',
  },
};

export default function MapView({ state, selected, onSelect, playerNation }: MapViewProps) {
  const [view, setView] = useState<ViewBox>(HOME_VIEW);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // The wheel listener is attached natively: React registers onWheel
  // passively at the root, so preventDefault (needed to stop page scroll)
  // only works on a listener we add ourselves with { passive: false }.
  const viewRef = useRef(view);
  viewRef.current = view;
  useEffect(() => {
    const svg = svgRef.current;
    if (svg === null) return undefined;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const cur = viewRef.current;
      const factor = Math.exp(e.deltaY * 0.0015);
      const w = clamp(cur.w * factor, MIN_VIEW_W, MAX_VIEW_W);
      if (w === cur.w) return;
      const h = w * ASPECT;
      // Keep the map point under the cursor fixed while the box rescales.
      const fx = (e.clientX - rect.left) / rect.width;
      const fy = (e.clientY - rect.top) / rect.height;
      setView({
        x: cur.x + fx * (cur.w - w),
        y: cur.y + fy * (cur.h - h),
        w,
        h,
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  // Drag-to-pan. `moved` outlives pointerup so the click that follows a drag
  // can tell itself apart from a genuine selection click.
  const drag = useRef({ active: false, moved: false, px: 0, py: 0 });

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (e.button !== 0) return;
    drag.current = { active: true, moved: false, px: e.clientX, py: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>): void => {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.px;
    const dy = e.clientY - drag.current.py;
    if (!drag.current.moved && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD_PX) return;
    drag.current.moved = true;
    drag.current.px = e.clientX;
    drag.current.py = e.clientY;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const cur = viewRef.current;
    const scale = cur.w / rect.width;
    setView({ ...cur, x: cur.x - dx * scale, y: cur.y - dy * scale });
  };

  const onPointerUp = (): void => {
    drag.current.active = false;
  };

  // Every belligerent of every active war; their regions carry front strokes.
  const warNations = useMemo(() => {
    const set = new Set<NationId>();
    for (const war of state.wars) {
      for (const n of war.attackers) set.add(n);
      for (const n of war.defenders) set.add(n);
    }
    return set;
  }, [state.wars]);

  // The player's armies, counted per region, for the map chips.
  const armyCounts = useMemo(() => {
    const counts = new Map<RegionId, number>();
    const me = state.nations[playerNation];
    for (const army of me?.armies ?? []) {
      counts.set(army.location, (counts.get(army.location) ?? 0) + 1);
    }
    return counts;
  }, [state.nations, playerNation]);

  const me = state.nations[playerNation];
  const regionIds = Object.keys(state.regions).filter((id) => REGION_PATHS[id] !== undefined);

  return (
    <div style={styles.frame}>
      <style>{`
        @keyframes fulcrum-front-march { to { stroke-dashoffset: -20; } }
        .fulcrum-region { cursor: pointer; }
        .fulcrum-region:hover { filter: brightness(1.3); }
        .fulcrum-front {
          stroke-dasharray: 6 4;
          animation: fulcrum-front-march 1.6s linear infinite;
          pointer-events: none;
        }
      `}</style>
      <svg
        ref={svgRef}
        style={styles.svg}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Strategic map"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Base region fills, coloured by controller, edged by faction. */}
        {regionIds.map((id) => {
          const rs = state.regions[id];
          const controller = state.nations[rs.controller];
          const region = REGIONS[id];
          const fill = controller !== undefined ? controller.color : 'var(--neutral)';
          const faction: Faction = controller !== undefined ? controller.faction : 'neutral';
          return (
            <path
              key={id}
              className="fulcrum-region"
              d={REGION_PATHS[id]}
              fill={fill}
              fillOpacity={0.85}
              stroke={FACTION_STROKE[faction]}
              strokeWidth={1.4}
              strokeLinejoin="round"
              onClick={() => {
                if (drag.current.moved) return; // that was a pan, not a pick
                onSelect(id);
              }}
            >
              <title>
                {region !== undefined
                  ? `${region.name}\n${region.terrain} terrain, IC ${region.ic}`
                  : id}
              </title>
            </path>
          );
        })}

        {/* Animated front lines on regions held by nations at war. */}
        {regionIds
          .filter((id) => warNations.has(state.regions[id].controller))
          .map((id) => (
            <path
              key={`front-${id}`}
              className="fulcrum-front"
              d={REGION_PATHS[id]}
              fill="none"
              stroke="var(--danger)"
              strokeWidth={1.6}
              strokeOpacity={0.8}
            />
          ))}

        {/* Selected region highlight. */}
        {selected !== null && REGION_PATHS[selected] !== undefined && (
          <path
            d={REGION_PATHS[selected]}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={3}
            strokeLinejoin="round"
            pointerEvents="none"
          />
        )}

        {/* Player army chips at label positions. */}
        {[...armyCounts.entries()]
          .filter(([id]) => REGION_LABEL_POS[id] !== undefined)
          .map(([id, count]) => {
            const [cx, cy] = REGION_LABEL_POS[id];
            return (
              <g key={`chip-${id}`} pointerEvents="none">
                <rect
                  x={cx - 11}
                  y={cy - 9}
                  width={22}
                  height={16}
                  rx={3}
                  fill="var(--bg)"
                  fillOpacity={0.9}
                  stroke={me !== undefined ? me.color : 'var(--paper)'}
                  strokeWidth={1.5}
                />
                <text
                  x={cx}
                  y={cy + 3}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="var(--font-doc)"
                  fill="var(--paper)"
                >
                  {count}
                </text>
              </g>
            );
          })}
      </svg>
    </div>
  );
}
