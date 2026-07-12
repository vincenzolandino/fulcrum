# Feedback Pass: Chronicle, Trade, Battle Spotlights — Design Spec

Approved by Vincenzo, 2026-07-12. Third piece of player feedback — a stylized-map replacement — is deliberately out of scope here; it gets its own spec once these three ship.

## Context

After playing live campaigns, feedback surfaced four issues. This spec covers three of them, chosen to build first because they're smaller and don't require the map rework the fourth depends on:

1. Resource shortages (ran out of oil, no way back) have no recovery path.
2. Chronicle divergence entries don't say what happened instead of history.
3. Iconic battles (D-Day, the Bulge, Barbarossa) resolve as a routine one-line front report instead of feeling grand.

The map itself ("this doesn't look like anything") is deferred to its own spec.

## 1. Chronicle divergence fix

**The bug.** `runChronicle()` in `src/engine/chronicle.ts` reuses one sentence, `HistoryMilestone.text`, for both outcomes. Convergence reads `"As in our history: " + text`. Divergence reads `"Here history turned: in the world we knew, " + text` — the same sentence describing what *actually* happened historically, never what happened in the player's game. The player only ever learns that something changed, not what.

**The fix.** Extend `HistoryMilestone` with an ordered list of alternate-outcome branches:

```ts
export interface HistoryMilestone {
  turn: number;
  text: string;              // unchanged: the real-history sentence, used on convergence
  matches: Condition;
  otherwise: { text: string; when: Condition }[]; // NEW, evaluated in order on divergence
}
```

`runChronicle()` change: on divergence, evaluate `otherwise` in order and use the first branch whose `when` condition is true, instead of reusing `text`. Every milestone gets a final catch-all branch with `when: { t: 'always' }` reading something honest like *"the record breaks from what we knew here — see this month's dispatches for what actually happened,"* so an unanticipated world state never produces a false or confusing line. Each of the 25 milestones gets 2-4 authored `otherwise` branches covering the most likely alternate paths (e.g., for the Anschluss milestone: Austria still independent, Austria annexed by force after resistance, Austria seized by a different power, on top of the catch-all).

This is pure content authoring plus one small, well-contained engine change — no new state, no new UI.

## 2. Resource trade & market

**Trade pacts, made real.** `Pact.kind` already includes `'trade'` in the type system; it's flavor-only today (one seeded GER-ITA trade pact does nothing mechanically). New engine step in the turn pipeline (`src/engine/trade.ts`) reads every nation's active trade pacts each turn: a modest fixed transfer of whichever resource the recipient is short on (stockpile below a low threshold) flows from a partner that has surplus of it, capped so it can't be farmed infinitely and gated off if the giver is itself short.

**Requesting aid.** New Diplomacy panel action, "Request aid," lets the player ask a specific nation for a one-time shipment of a named resource. Resolves immediately: the AI grants or refuses based on relations, faction alignment, and whether it can spare the amount without going short itself (reuses the same surplus check as trade pacts). Refusal gives a short in-voice reason via the report system, not a silent no.

**Proposing a trade pact.** New Diplomacy panel action, "Propose trade pact," adds a `trade` pact (AI accepts/declines on the same relations+surplus basis) so the flow becomes standing instead of one-off.

**Market of last resort.** New Production panel action, "Buy on the world market," spends IC to add oil/steel/food to stockpile at an exchange rate that worsens the more is bought in a single turn (diminishing returns, resets each turn) — available to every nation regardless of diplomacy, so no one is ever permanently locked out of a resource, just paying more for it the harder they lean on it.

AI nations use the same three levers for themselves via existing AI turn logic (an AI nation short on a resource may request aid from a friendly surplus nation, or fall back to the market if desperate) — this reuses the surplus/grant logic, not new AI personality work.

## 3. Iconic battle spotlights

**Catalog.** New data file `src/data/iconicBattles.ts`:

```ts
export interface IconicBattle {
  id: string;
  name: string;
  trigger: Condition;        // world-state condition, evaluated once per turn like an event
  regions: RegionId[];       // the battle's ground, using existing regions
  attacker: NationId[];      // one or more nations on the attacking side, e.g. Western Allies
  defender: NationId[];
  phases: { name: string; text: string }[]; // ~3, shown in order as the battle progresses
  maxDuration: number;       // turns; battle times out into an inconclusive resolution
  intensityBonus: number;    // combat multiplier while active, e.g. 1.3
  resolutionText: { attackerWins: string; defenderHolds: string; timedOut: string };
}
```

An iconic battle fires at most once per campaign: its `id` is pushed into the existing `firedEvents: string[]` on `GameState` the same turn it starts, reusing the events engine's fired-once convention rather than adding parallel tracking.

V1 ships three: **Operation Barbarossa** (trigger: the `BARBAROSSA` flag Germany's own event chain already sets, plus `atWar(GER, SOV)`), **D-Day** (trigger: a Western Allied major at war with Germany, Germany still controls `fra-north`, the GER-SOV war already underway, turn past a historical floor), **Battle of the Bulge** (trigger: Germany at war on the Western front, `allout` posture into `bel-brussels` or `fra-north` in winter, GER-SOV war ongoing). Framework is pure data, so later additions (Stalingrad, Kursk) cost a catalog entry, not engine work.

**Engine.** New `activeBattles: ActiveIconicBattle[]` on `GameState` (`{ battleId, startTurn, phase, region }`). New engine step in the turn pipeline, after events: check untriggered catalog entries' `trigger` conditions; start a new active battle on match (respects a fired-once guard, same convention as events). Each turn an active battle exists, its phase advances (capped at `phases.length - 1`); resolution fires early if the contested region's controller flips, or forced at `maxDuration`. While active, `combat.ts` reads a transient flag (`_iconicbattle_{region}`, same convention as the existing `_nooil_`/`_blockade_` flags) and applies `intensityBonus` to both attack and defense in that region — no change to the shared formulas everyone else's combat uses. `combat.ts`'s normal front-report emission is suppressed for regions with an active battle; the spotlight phase report carries the casualty/stakes information instead, so the player isn't told the same thing twice.

**UI.** New `BattleSpotlight.tsx` — full-screen overlay in the same family as `EventModal` but read-only and dismiss-only (no choices), shown when an active battle's phase advances or resolves this turn. Distinct per-battle visual treatment (a color wash keyed to the battle — grey-blue for the Eastern winter, steel for the Channel crossing), large title, phase name, period-voice narrative, and the turn's casualty/stakes readout. Queued the same way pending events are, so it never competes with a genuine decision for the player's attention on the same turn.

## Testing

Chronicle: unit tests on `runChronicle()` with fixture milestones covering match / no-match-with-a-specific-branch / no-match-catch-all. Trade: unit tests on the new trade step (surplus transfer math, cap, refusal-when-giver-would-go-short) and the two new store actions. Iconic battles: unit tests on trigger detection, phase advance, early resolution on control flip, timeout resolution, and that `combat.ts`'s intensity bonus and report suppression apply only inside an active battle's region. A sim-harness check (extending `scripts/sim.ts`) confirms Barbarossa and D-Day fire in a meaningful share of AI-only campaigns that reach the relevant war state.

## Explicitly out of scope here

The map replacement (real geography or globe). Battles beyond the three named. Naval/air-only set-pieces (Midway, Battle of Britain) — the engine's combat model is region-based; representing an air- or navy-only battle is a bigger design question saved for later.
