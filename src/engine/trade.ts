// Resource trade: standing trade pacts, one-time aid requests, and the world
// market. A nation "short" of a resource (below TRADE_SHORTAGE_THRESHOLD) can
// recover it three ways: a per-turn pull from a trade-pact partner (this
// module's pipeline step, runTrade), a one-time request that a friendly or
// same-faction nation may grant if it can spare the amount, or an
// always-available market purchase that spends this turn's ic at a rate that
// worsens the more is bought in one action. No nation is ever permanently
// locked out of a resource — the market is the fallback of last resort for a
// friendless nation, at a price.
//
// Pure: every function returns a new GameState (or the same reference,
// unchanged, on refusal) and never mutates its input.

import type { GameState, Nation, NationId, Rng } from './types';
import {
  AID_RELATIONS_GATE,
  MARKET_BASE_COST,
  MARKET_COST_GROWTH,
  MARKET_MAX_PER_TURN,
  STOCKPILE_MAX,
  TRADE_PACT_TRANSFER,
  TRADE_SHORTAGE_THRESHOLD,
  AID_REQUEST_AMOUNT,
} from './balance';

export type Resource = 'oil' | 'steel' | 'food';
export const RESOURCES: Resource[] = ['oil', 'steel', 'food'];

const STOCKPILE_MIN = 0;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** True when `n` is short enough of `resource` to receive help. */
export const isShort = (n: Nation, resource: Resource): boolean =>
  n.stockpile[resource] < TRADE_SHORTAGE_THRESHOLD;

/** True when `n` can give up `amount` of `resource` without going short itself. */
export const canSpare = (n: Nation, resource: Resource, amount: number): boolean =>
  n.stockpile[resource] - amount >= TRADE_SHORTAGE_THRESHOLD;

/** Friendly enough, or the same faction, for `giver` to help `asker`. */
export const willingToHelp = (giver: Nation, asker: Nation): boolean =>
  (giver.faction !== 'neutral' && giver.faction === asker.faction) ||
  (giver.relations[asker.id] ?? 0) >= AID_RELATIONS_GATE;

function withStockpile(state: GameState, id: NationId, resource: Resource, delta: number): GameState {
  const n = state.nations[id];
  if (!n) return state;
  const value = clamp(n.stockpile[resource] + delta, STOCKPILE_MIN, STOCKPILE_MAX);
  return { ...state, nations: { ...state.nations, [id]: { ...n, stockpile: { ...n.stockpile, [resource]: value } } } };
}

/** No AI inbox is modeled (matches the { t: 'report' } effect's own rule: AI
 * mail is dropped), so a reply only reaches state.reports when the asker is
 * the player — the only case any of this module's callers use it for. */
function reply(state: GameState, askerId: NationId, title: string, body: string): GameState {
  if (askerId !== state.playerNation) return state;
  return { ...state, reports: [...state.reports, { kind: 'diplomatic', title, body, turn: state.turn }] };
}

// ---------------------------------------------------------------------------
// Standing trade pacts — pipeline step, runs once per turn.
// ---------------------------------------------------------------------------

/**
 * For every living nation short of a resource, pull TRADE_PACT_TRANSFER units
 * from the first trade-pact partner (in pact order) that can spare it. At
 * most one partner helps per resource per turn — the point is steady relief,
 * not draining every ally at once.
 */
export function runTrade(state: GameState, _rng: Rng): GameState {
  const nations: Record<NationId, Nation> = { ...state.nations };
  let changed = false;

  for (const id of Object.keys(state.nations).sort()) {
    const recipient = nations[id];
    if (!recipient.alive) continue;
    const partners = recipient.pacts.filter((p) => p.kind === 'trade').map((p) => p.with);
    if (partners.length === 0) continue;

    for (const resource of RESOURCES) {
      if (!isShort(nations[id], resource)) continue;
      for (const partnerId of partners) {
        const giver = nations[partnerId];
        if (!giver?.alive || !canSpare(giver, resource, TRADE_PACT_TRANSFER)) continue;
        nations[partnerId] = {
          ...giver,
          stockpile: { ...giver.stockpile, [resource]: giver.stockpile[resource] - TRADE_PACT_TRANSFER },
        };
        const r = nations[id];
        nations[id] = {
          ...r,
          stockpile: {
            ...r.stockpile,
            [resource]: Math.min(STOCKPILE_MAX, r.stockpile[resource] + TRADE_PACT_TRANSFER),
          },
        };
        changed = true;
        break;
      }
    }
  }

  return changed ? { ...state, nations } : state;
}

// ---------------------------------------------------------------------------
// One-time aid request.
// ---------------------------------------------------------------------------

/**
 * Ask `targetId` for a one-time shipment of `resource`. Refused (state
 * returned unchanged aside from a report to the player explaining why) if
 * the target isn't friendly or same-faction enough, or can't spare the
 * amount without going short itself.
 */
export function requestAid(
  state: GameState,
  askerId: NationId,
  targetId: NationId,
  resource: Resource,
): GameState {
  const asker = state.nations[askerId];
  const target = state.nations[targetId];
  if (!asker?.alive || !target?.alive || askerId === targetId) return state;
  if (!isShort(asker, resource)) return state; // nothing to ask for

  const title = `${target.name} answers`;
  if (!willingToHelp(target, asker)) {
    return reply(state, askerId, title, `${target.name} declines. Relations do not run deep enough for a shipment of ${resource}.`);
  }
  if (!canSpare(target, resource, AID_REQUEST_AMOUNT)) {
    return reply(state, askerId, title, `${target.name} regrets it cannot spare the ${resource} — the stores are thin at home too.`);
  }

  const given = withStockpile(state, targetId, resource, -AID_REQUEST_AMOUNT);
  const received = withStockpile(given, askerId, resource, AID_REQUEST_AMOUNT);
  return reply(received, askerId, title, `${target.name} agrees to ship ${AID_REQUEST_AMOUNT} units of ${resource}.`);
}

// ---------------------------------------------------------------------------
// Standing trade pact proposal.
// ---------------------------------------------------------------------------

/** Propose a standing `trade` pact with `targetId`; the same friendliness gate as aid. */
export function proposeTradePact(state: GameState, askerId: NationId, targetId: NationId): GameState {
  const asker = state.nations[askerId];
  const target = state.nations[targetId];
  if (!asker?.alive || !target?.alive || askerId === targetId) return state;
  if (asker.pacts.some((p) => p.with === targetId && p.kind === 'trade')) return state; // already exists

  const title = `${target.name} answers`;
  if (!willingToHelp(target, asker)) {
    return reply(state, askerId, title, `${target.name} sees no advantage in a standing trade arrangement just now.`);
  }

  const pact = { with: targetId, kind: 'trade' as const };
  const next: GameState = {
    ...state,
    nations: {
      ...state.nations,
      [askerId]: { ...asker, pacts: [...asker.pacts, pact] },
      [targetId]: { ...target, pacts: [...target.pacts, { with: askerId, kind: 'trade' as const }] },
    },
  };
  return reply(next, askerId, title, `${target.name} agrees to a standing trade arrangement.`);
}

// ---------------------------------------------------------------------------
// World market — always available, no diplomacy required.
// ---------------------------------------------------------------------------

/** IC cost to buy `units` of a resource in one purchase (geometric growth per unit). */
export function marketCost(units: number): number {
  let cost = 0;
  let rate = MARKET_BASE_COST;
  for (let i = 0; i < units; i++) {
    cost += rate;
    rate *= 1 + MARKET_COST_GROWTH;
  }
  return Math.ceil(cost);
}

/**
 * Spend this turn's ic to buy `resource` on the world market. `units` is
 * capped at MARKET_MAX_PER_TURN; refused (state unchanged) if the nation
 * can't afford even the capped amount.
 */
export function buyOnMarket(state: GameState, nationId: NationId, resource: Resource, units: number): GameState {
  const n = state.nations[nationId];
  if (!n || units <= 0) return state;
  const capped = Math.min(Math.floor(units), MARKET_MAX_PER_TURN);
  const cost = marketCost(capped);
  if (n.ic < cost) return state;
  return {
    ...state,
    nations: {
      ...state.nations,
      [nationId]: {
        ...n,
        ic: n.ic - cost,
        stockpile: { ...n.stockpile, [resource]: Math.min(STOCKPILE_MAX, n.stockpile[resource] + capped) },
      },
    },
  };
}
