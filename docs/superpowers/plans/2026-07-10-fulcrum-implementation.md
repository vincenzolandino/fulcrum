# Fulcrum: 1938–1948 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-player, turn-based WWII grand strategy browser game where the player picks any 1938 nation and a systemic simulation carries every decision's consequences through 1948.

**Architecture:** Pure-function engine over an immutable `GameState`, resolved by a deterministic turn pipeline with a seeded RNG. All content (nations, regions, events, leaders, techs) is serializable data interpreted by a Condition/Effect DSL, so content scales without engine changes. React UI is a thin shell over a reducer store.

**Tech Stack:** React 18, TypeScript (strict), Vite, Vitest, Zustand (vanilla store + React binding). No backend. localStorage saves. Static deploy.

---

## Non-negotiable engineering rules

1. **Engine is pure.** No engine module imports React or touches DOM/localStorage. Every engine function is `(state, args, rng) => newState` or a pure calculation. Structural sharing via shallow copies; no mutation of input state.
2. **Determinism.** All randomness flows through the seeded RNG in `engine/rng.ts`. Same seed + same decisions = same game. Never `Math.random()`, never `Date.now()` inside the engine.
3. **Content is data.** Events, conditions, and effects are JSON-serializable objects (no closures in content files). The engine interprets them. Content agents only write data files and never touch `src/engine/`.
4. **Every engine module ships with Vitest tests in the same PR/commit.** Data files ship with integrity tests.
5. **Balance constants live in `src/engine/balance.ts`** — one file, named exports, commented. No magic numbers inside formulas.
6. TDD for engine math: write the failing test with concrete numbers first, then implement.

## File structure (root = /Volumes/Schumacher/WWII Game)

```
package.json  vite.config.ts  tsconfig.json  index.html  netlify.toml
src/
  main.tsx  App.tsx  store.ts  theme.css
  engine/
    types.ts        # ALL shared types (contract, defined below)
    rng.ts          # mulberry32 seeded RNG
    balance.ts      # every tunable constant
    conditions.ts   # Condition DSL evaluator
    effects.ts      # Effect DSL applier
    setup.ts        # buildInitialState(playerNation, seed) from data
    economy.ts      # production, resources, supply
    combat.ts       # land battle + naval balance + capture
    research.ts     # tech progression
    diplomacy.ts    # relations drift, tension, faction gravity, guarantees
    ai.ts           # AI personalities, ambitions, postures, DoW logic
    covert.ts       # spy networks, operations, succession
    events.ts       # trigger evaluation, queueing, AI auto-choice
    politics.ts     # stability/war-support drift, capitulation, surrender
    chronicle.ts    # divergence tracking vs real timeline
    victory.ts      # objective scoring, game-over checks
    epilogue.ts     # end-of-game text assembly
    turn.ts         # the pipeline: orchestrates all of the above
  data/
    regions.ts      # ~60 regions, adjacency, terrain, yields
    nations.ts      # ~40 nations, 1938 setup
    leaders.ts      # leaders + succession tables
    techs.ts        # 6 tracks × 5 levels, modifiers
    objectives.ts   # per-nation victory objectives
    historyTimeline.ts # real-history milestones for Chronicle
    events/
      index.ts      # aggregates all packs, exports ALL_EVENTS
      prewar.ts germany.ts poland.ts ussr.ts uk.ts france.ts italy.ts
      japan.ts usa.ts pacific.ts endgame.ts covertOps.ts generic.ts
  ui/
    NationPicker.tsx MapView.tsx mapGeometry.ts TopBar.tsx SidePanel.tsx
    ReportsPanel.tsx FrontsPanel.tsx ProductionPanel.tsx ResearchPanel.tsx
    DiplomacyPanel.tsx CovertPanel.tsx ChroniclePanel.tsx
    EventModal.tsx EndScreen.tsx SaveLoad.tsx
scripts/
  sim.ts            # headless autoplay harness (npx tsx scripts/sim.ts)
tests/              # vitest; mirrors engine modules + data integrity
```

## The type contract (`src/engine/types.ts`)

Every task codes against these exact names. Defined once here; Task 1 transcribes verbatim.

```ts
export type NationId = string;   // 'GER','POL','SOV','UK','FRA','ITA','JAP','USA',...
export type RegionId = string;   // 'ger-rhineland','pol-warsaw',...
export type LeaderId = string;   // 'hitler','stalin',...
export type Faction = 'axis' | 'allies' | 'comintern' | 'neutral';
export type TechTrack = 'armor' | 'air' | 'naval' | 'industry' | 'doctrine' | 'secret';
export type Posture = 'allout' | 'offensive' | 'hold' | 'elastic' | 'retreat';
export type Terrain = 'plains' | 'forest' | 'mountain' | 'urban' | 'desert' | 'jungle' | 'island';
export type Government = 'fascist' | 'communist' | 'democracy' | 'monarchy' | 'authoritarian';

export interface Region {            // static, from data
  id: RegionId; name: string; terrain: Terrain;
  adjacent: RegionId[];              // symmetric
  coastal: boolean;
  ic: number;                        // industry yield
  resources: { oil: number; steel: number; food: number };
  vp: number;                        // victory-point weight, 0–10
}
export interface RegionState {       // dynamic
  owner: NationId;                   // de jure at game start
  controller: NationId;              // current military control
  entrenchment: number;              // 0–5, grows on 'hold'
}
export interface Army {
  id: string; name: string;
  strength: number;                  // 0–100
  equipment: number;                 // 0–100
  experience: number;                // 0–100
  location: RegionId;
  posture: Posture;
  moveTarget: RegionId | null;       // redeploy arrives next turn
}
export interface Pact { with: NationId; kind: 'nap' | 'alliance' | 'trade'; }
export interface AIPersonality {
  aggression: number; riskTolerance: number;   // 0–1
  ideologyZeal: number; opportunism: number;   // 0–1
  focus: 'expansion' | 'defense' | 'consolidation';
}
export interface Nation {
  id: NationId; name: string; adjective: string; color: string;
  capital: RegionId; government: Government; faction: Faction;
  alive: boolean; puppetOf: NationId | null;
  ic: number;                        // computed each turn from regions
  stockpile: { oil: number; steel: number; food: number };
  icAllocation: { army: number; air: number; navy: number; civilian: number }; // sums to 1
  armies: Army[]; navy: number; air: number;   // navy/air: 0–1000 pts
  manpower: number;                  // thousands
  stability: number; warSupport: number;       // 0–100
  relations: Record<NationId, number>;         // -100..100
  guarantees: NationId[]; pacts: Pact[]; claims: RegionId[];
  spyNetworks: Record<NationId, number>;       // 0–100
  tech: Record<TechTrack, number>;             // 0–5
  research: { track: TechTrack | null; progress: number }; // progress 0–100
  leader: LeaderId;
  ai: AIPersonality;
}
export interface War { id: string; attackers: NationId[]; defenders: NationId[]; startTurn: number; }
export type Flags = Record<string, boolean | number | string>;

// ---------- Condition DSL (serializable) ----------
export type Condition =
  | { t: 'always' } | { t: 'never' }
  | { t: 'and'; c: Condition[] } | { t: 'or'; c: Condition[] } | { t: 'not'; c: Condition }
  | { t: 'flag'; key: string; is?: boolean | number | string }        // default is: true
  | { t: 'turnAtLeast'; n: number } | { t: 'turnBefore'; n: number }
  | { t: 'random'; p: number }                                        // uses rng
  | { t: 'atWar'; a: NationId; b?: NationId }
  | { t: 'alive'; nation: NationId }
  | { t: 'isPlayer'; nation: NationId }
  | { t: 'faction'; nation: NationId; is: Faction }
  | { t: 'controls'; nation: NationId; region: RegionId }
  | { t: 'leaderIs'; nation: NationId; leader: LeaderId }
  | { t: 'relations'; a: NationId; b: NationId; atLeast?: number; below?: number }
  | { t: 'stability'; nation: NationId; atLeast?: number; below?: number }
  | { t: 'warSupport'; nation: NationId; atLeast?: number; below?: number }
  | { t: 'strengthRatio'; a: NationId; b: NationId; atLeast: number } // total mil power a/b
  | { t: 'spyNetwork'; owner: NationId; target: NationId; atLeast: number }
  | { t: 'tech'; nation: NationId; track: TechTrack; atLeast: number }
  | { t: 'tension'; atLeast?: number; below?: number }
  | { t: 'eventFired'; id: string } | { t: 'eventNotFired'; id: string };

// ---------- Effect DSL (serializable) ----------
export type Effect =
  | { t: 'flag'; key: string; value: boolean | number | string }
  | { t: 'addFlag'; key: string; delta: number }
  | { t: 'relations'; a: NationId; b: NationId; delta: number }
  | { t: 'stability'; nation: NationId; delta: number }
  | { t: 'warSupport'; nation: NationId; delta: number }
  | { t: 'tension'; delta: number }
  | { t: 'declareWar'; attacker: NationId; defender: NationId }
  | { t: 'peace'; a: NationId; b: NationId }
  | { t: 'annex'; nation: NationId; by: NationId }
  | { t: 'puppet'; nation: NationId; by: NationId }
  | { t: 'cedeRegion'; region: RegionId; to: NationId }        // owner+controller
  | { t: 'setController'; region: RegionId; to: NationId }
  | { t: 'joinFaction'; nation: NationId; faction: Faction }
  | { t: 'guarantee'; by: NationId; of: NationId }
  | { t: 'pact'; a: NationId; b: NationId; kind: Pact['kind'] }
  | { t: 'breakPact'; a: NationId; b: NationId }
  | { t: 'addClaim'; nation: NationId; region: RegionId }
  | { t: 'ic'; nation: NationId; delta: number }               // permanent modifier via flag
  | { t: 'manpower'; nation: NationId; delta: number }
  | { t: 'navy'; nation: NationId; delta: number } | { t: 'air'; nation: NationId; delta: number }
  | { t: 'armyStrength'; nation: NationId; delta: number }     // spread across armies
  | { t: 'newArmy'; nation: NationId; name: string; location: RegionId; strength: number; equipment: number }
  | { t: 'disbandArmy'; nation: NationId; count: number }
  | { t: 'setLeader'; nation: NationId; leader: LeaderId }
  | { t: 'killLeader'; nation: NationId }                      // triggers succession in covert.ts
  | { t: 'spyNetwork'; owner: NationId; target: NationId; delta: number }
  | { t: 'tech'; nation: NationId; track: TechTrack; delta: number }
  | { t: 'setAI'; nation: NationId; patch: Partial<AIPersonality> }
  | { t: 'chronicle'; text: string; divergence?: boolean }
  | { t: 'report'; to: NationId | 'player'; kind: ReportKind; title: string; body: string }
  | { t: 'queueEvent'; id: string; delay: number }             // fires after N turns
  | { t: 'endGame'; verdict: string };

export type ReportKind = 'intel' | 'front' | 'diplomatic' | 'domestic' | 'covert' | 'research';
export interface Report { kind: ReportKind; title: string; body: string; turn: number; }

export interface EventChoice {
  label: string; detail?: string;
  available?: Condition;
  effects: Effect[];
  aiWeight?: number;                 // relative weight for AI auto-choice, default 1
}
export interface GameEvent {
  id: string; title: string;
  nation: NationId | 'global';       // whose decision; 'global' → player sees if involved, else auto
  fires: Condition;
  once: boolean;                     // default true
  priority: number;                  // higher first, max 3 player modals per turn
  text: string;                      // period voice, 40–150 words
  choices: EventChoice[];            // 1–5
}

export interface ChronicleEntry {
  turn: number; text: string; divergence: boolean;
}
export interface CovertMission {
  id: string; owner: NationId; target: NationId;
  type: 'assassinate' | 'coup' | 'sabotage' | 'stealIntel' | 'buildNetwork';
  turnsLeft: number;
}
export interface GameOverState { verdict: string; score: number; epilogue: string; }
export interface GameState {
  seed: number; turn: number;        // turn 0 = Jan 1938; date derived: y=1938+((turn)/12|0), m=turn%12
  playerNation: NationId;
  nations: Record<NationId, Nation>;
  regions: Record<RegionId, RegionState>;
  wars: War[];
  tension: number;                   // 0–100 world tension
  flags: Flags;
  firedEvents: string[];
  queuedEvents: { id: string; fireTurn: number }[];
  pendingChoices: { eventId: string }[];   // awaiting player this turn
  missions: CovertMission[];
  chronicle: ChronicleEntry[];
  reports: Report[];                 // player's current-turn reports
  gameOver: GameOverState | null;
}
export interface Rng { next(): number; pick<T>(arr: T[]): T; chance(p: number): boolean; int(lo: number, hi: number): number; }
```

Helper (also in types.ts): `export const dateOf = (turn: number) => ({ year: 1938 + Math.floor(turn / 12), month: turn % 12 });` month 0 = January. Display via `MONTH_NAMES`.

## Locked formulas (implement exactly; constants in balance.ts)

**RNG (rng.ts):** mulberry32. `makeRng(seed)` returns `Rng`. Turn resolution uses `makeRng(hash(seed, turn))` with `hash(a,b) = (a ^ (b * 2654435761)) >>> 0`.

**Military power (used by AI + conditions):**
`landPower(n) = Σ armies (strength/100 × equipment/100 × (1 + 0.15·tech.armor + 0.10·tech.doctrine)) × 10`
`totalPower(n) = landPower + navy/100 + air/100`

**Economy (economy.ts), per turn:**
- `nation.ic = Σ controlled region ic × stabilityFactor × supplyFactor`, where `stabilityFactor = 0.5 + stability/200`.
- Resource income = Σ controlled region resources; consumption: each army consumes `OIL_PER_ARMY=1` when posture ∈ {allout, offensive}, `FOOD_PER_ARMY=1` always; air/navy consume oil `= (air+navy)/200`. Stockpile clamps at 0..999.
- Oil at 0 → all armies' effective equipment ×0.6, air ×0.5 that turn (flag it in reports). Food at 0 → stability −2/turn.
- Production: `army` share replenishes equipment (`+ic·alloc.army·0.35` points spread across armies, neediest first) and strength from manpower (`+ic·alloc.army·0.25`, costs manpower 1:1); `air`/`navy` shares add `ic·alloc·0.3` points; `civilian` share adds research speed (below) and +0.2 stability/turn if ≥0.3.

**Supply (economy.ts):** BFS from capital through friendly-controlled regions. Armies in unconnected regions: `supplyFactor 0.5`, else 1.0. Region ic counts only if connected.

**Research (research.ts):** `progress += (5 + ic × alloc.civilian × 0.15)` per turn; at 100 → level+1 (max 5), progress resets. `secret` track requires `tech.industry ≥ 2` to start, and level 5 sets flag `ATOMIC_{nationId}` = true.

**Combat (combat.ts), per war, per battle:** A battle exists for each enemy-controlled region R adjacent to attacker armies with posture allout/offensive.
- `attack = Σ adjacent hostile armies' power × postureMod (allout 1.3, offensive 1.0) × supplyFactor × airMod`
- `defense = (Σ armies in R power × postureMod (hold 1.2, elastic 1.0, retreat 0.6, offensive 0.9, allout 0.8) + GARRISON=0.5) × terrainMod × (1 + entrenchment×0.08) × supplyFactor × airMod`
- `terrainMod`: plains 1.0, desert 1.0, forest 1.25, urban 1.5, mountain 1.6, jungle 1.4, island 1.3.
- `airMod = 1 ± 0.15` by faction air-power ratio in that war (>1.5 → attacker/defender side bonus).
- `effRatio = (attack/defense) × rng in [0.8, 1.2]`.
- Outcome: if `effRatio ≥ 1.25` region captured: controller flips to strongest attacker, defenders retreat to adjacent friendly region with fewest enemies (destroyed if none), entrenchment resets. Casualties (strength points): `defLoss = clamp(9·effRatio, 3, 30) (+8 if captured)`, `atkLoss = clamp(9/effRatio, 3, 30)`. Equipment losses = 60% of strength losses. Experience +3 both sides (cap 100). `allout` doubles attacker casualties taken.
- Amphibious: attacking a coastal region with no land adjacency requires faction naval ratio ≥ 1.5 in that war; attack ×0.6.
- Naval: per war, faction navy totals give `blockade`: if ratio ≥ 2, blocked side's overseas resource income ×0.5 (islands: also food −20%).
- Capitulation check after battles (politics.ts): nation with capital lost AND (controlled core VP < 35% of start OR stability < 15) → capitulates: sets flag `CAPITULATED_{id}`, fires that nation's surrender event if defined, else auto-annex by strongest enemy.

**Entrenchment:** +1/turn on hold (max 5), reset on move/attack/capture.

**Diplomacy drift (diplomacy.ts), per turn:** same-faction +1 (cap 100); at-war −100 floor lock; fascist↔democracy −0.5; shared war ally +2. Tension: +8 per DoW on a nation, +5 per annexation, +2 per ultimatum event (via effects), −1/turn decay when no war among majors. Democracies won't join wars offensively while `tension < 50` (AI rule).

**Politics drift:** at war: warSupport −1/turn baseline, +2 if winning (net VP captured this war), −3 if losing badly (lost ≥2 regions this turn). stability −1 if warSupport < 30. Peace: stability +1 (cap), warSupport drifts toward 50 by 2/turn.

**Covert (covert.ts):** `buildNetwork` mission: 3 turns, then target network +15 (cap 100), detection roll `chance(0.15)` → network −25 and relations −10. Operations require network thresholds: stealIntel 30, sabotage 40 (target: pick enemy nation, −10% ic that turn ×3 turns via flag), coup 60 (success: government flips, faction → instigator-aligned neutral, stability 30), assassinate 70. Success odds: `stealIntel 0.8, sabotage 0.6, coup 0.35 + zealPenalty, assassinate 0.25`, each `+ network/400`. Failure: network −30, relations −20, tension +3, flag `COVERT_BLOWBACK_{owner}_{target}` (event hooks). Assassination success → `killLeader` → succession table in leaders.ts picks next leader + AI patch + 'succession' event fires.

**AI (ai.ts), each turn each AI nation:** 
1. Recompute posture per front: for each war, compare local power on each front region; favorable (≥1.3) → offensive (≥2 and aggression >0.6 → allout), even → hold, weak (≤0.7) → elastic.
2. Redeploy: move idle armies toward nearest front (BFS), garrison capital with ≥1 army.
3. Ambitions: nations have `claims`; if not at war, for each claim region: `ratio = totalPower(self)/Σ totalPower(defender+guarantors+allies)`; if `ratio ≥ threshold` where `threshold = 2.2 − aggression − 0.4·opportunism (min 1.1)` → declare war (fires generic ultimatum event first if one is defined for that claim). ideologyZeal > 0.7 fascists prefer claims on ideological enemies.
4. Faction gravity: fascist neutrals with relations(GER) ≥ 60 and tension ≥ 60 → join axis (etc. for comintern). Democracies guarantee threatened minors when tension ≥ 40 (threatened = shares border with a major of hostile ideology holding claims on it).
5. Allocation & research: expansion focus → army 0.5/air 0.2/navy 0.1/civ 0.2; defense → 0.4/0.15/0.05/0.4; consolidation → 0.3/0.1/0.1/0.5. Research priority: armor→air→doctrine for expansion; industry→doctrine→air for others; USA/UK/GER/SOV switch to `secret` when `tension ≥ 70` and industry ≥ 2.
6. Covert: majors with opportunism > 0.5 build networks in rivals; AI assassination only if flag `AI_COVERT_AGGRESSIVE` (set by events; default off so the player is the schemer).
7. Peace AI: if losing badly (capital threatened, warSupport < 25) AI offers peace via event to war leader (white peace or concessions).

**Events (events.ts):** After systems resolve, evaluate ALL_EVENTS where `!once || !fired`. Fire order: priority desc. `nation === playerNation` or (`global` and player in `involved` set — computed as: player at war with/adjacent to affected) → push to `pendingChoices` (max 3/turn, rest defer to next turn). AI events auto-resolve: pick choice by `aiWeight` (weighted rng among `available` choices). `queueEvent` inserts into `queuedEvents` with `fireTurn = turn + delay`; queued events fire unconditionally when due (respecting `available` on choices).

**Chronicle (chronicle.ts):** `historyTimeline.ts` = array `{ turn, text, matches: Condition }`. Each turn, for entries at this turn: evaluate `matches`; if true → entry logged as convergent (`divergence:false`, "As in our history: …"), if false → logged as divergence ("Here history turned: …" + actual). Effects with `{t:'chronicle'}` log directly. Epilogue (epilogue.ts): assembles from final state: player verdict vs objectives (objectives.ts scoring), per-faction outcome paragraph, top 8 divergences, casualty/region tallies. Pure string assembly from templates, no LLM.

**Victory (victory.ts):** Game ends at turn 131 (Dec 1948) or when player nation dead (capitulated without exile) or player faction totally victorious (no hostile major alive) or `endGame` effect. Score = Σ objective points (objectives.ts: each `{ id, text, points, check: Condition }`) + VP share delta vs start. Verdict tiers: Triumph / Victory / Survival / Defeat / Catastrophe.

## Data requirements

- **regions.ts:** ~60 regions. Europe fine (Germany 6, France 5, USSR 10, Poland 3, UK 3, Italy 4, Balkans 6, Iberia 2, Scandinavia 4, Benelux 2, Central Europe 4), rest coarse (Pacific 6, Asia 6, Africa 4, Middle East 3, Americas 4). Every region: terrain, ic (world total ≈ 1000, USA ≈ 180, GER ≈ 130, SOV ≈ 120, UK ≈ 100+empire, FRA ≈ 70), resources (oil concentrated: Ploiesti, Baku, Texas, Dutch East Indies, Middle East), vp, symmetric adjacency, coastal flags. Sea adjacency via `coastal` + amphibious rule; strait pairs (Dover, Sicily, Japan–Korea, Japan–Home Islands→Pacific) listed as normal adjacency.
- **nations.ts:** ~40 nations with 1938 armies (GER 8 armies avg str 80/eq 75; FRA 7/75/65; SOV 12/70/50 (purge: doctrine 0, stability 55); POL 4/70/50; UK 4/80/70 + navy 900; USA 4/60/40, navy 800, isolation flag; JAP 8/75/65, navy 700; ITA 6/65/55; CHI 10/40/25; minors 1–3 armies). Relations matrix seeds from history (GER–SOV −40, GER–UK −30, etc.). Claims: GER on Austria/Sudetenland/Danzig; ITA on Albania/Greece-adjacent; JAP on Chinese coast; SOV on East Poland/Baltics/Finland (Karelia); HUN on Transylvania. AI personalities per nation (GER aggression 0.9 zeal 0.9; SOV 0.5/0.7 opportunism 0.8; USA aggression 0.1 until events flip focus).
- **leaders.ts:** leaders for all majors + succession tables. GER: hitler → [goering (aggression 0.7, zeal 0.7), himmler (0.95, 1.0), beck-junta (0.3, 0.2, focus defense, opens peace events)] weighted 40/25/35. SOV: stalin → molotov/zhukov-junta. Each succession entry: leader, AI patch, event id to fire.
- **techs.ts:** per track per level: name + modifier description (modifiers are already encoded in formulas; this file feeds UI + flavor).
- **objectives.ts:** 3–5 objectives per playable major, 2 generic for minors (survive; keep all core regions).
- **historyTimeline.ts:** ~25 milestones (Anschluss 3/38 … Hiroshima 8/45, war end).
- **events/:** ~150 events per the content matrix below.

## Event content matrix (target ≈150)

| Pack | Count | Must include |
|---|---|---|
| prewar.ts | 18 | Anschluss (GER choice + player-Austria resist option), Munich (multi-party: GER demand, UK/FRA appease-or-stand, CZE submit-or-fight), Danzig ultimatum, Molotov–Ribbentrop (fires only if GER–SOV relations > −60 and both see benefit; splits Poland claims), Pact of Steel, Winter War trigger |
| germany.ts | 15 | war-economy choices, generals' plot (arms when stability<40 or war going badly), Kriegsmarine vs Luftwaffe priority, Barbarossa decision event (AI Germany weighs UK status/strengthRatio), succession events |
| poland.ts | 10 | September posture (fight/fortify/concede Danzig), French pressure, government-in-exile, resistance, Bzura counterattack (if repelled first German push) |
| ussr.ts | 12 | purge continuation vs rehabilitation (doctrine recovery), envoy-to-Berlin covert hooks, Winter War conduct, Barbarossa warnings (Sorge intel via spyNetwork), relocate industry east |
| uk.ts | 12 | appeasement line, Churchill succession when war sours, Mers-el-Kébir, Battle of Britain posture, Lend-Lease ask, empire strain |
| france.ts | 10 | extend Maginot vs armor doctrine (De Gaulle), early war option 1938, Vichy vs Fights-On-from-Algiers choice on capitulation |
| italy.ts | 10 | non-belligerence vs early entry, Greece adventure, switch-sides when losing |
| japan.ts | 12 | China escalation, strike-north vs strike-south, oil embargo response (Pearl Harbor decision fires on embargo flag, not date), Midway-style gamble |
| usa.ts | 10 | isolation erosion ladder (tension-gated), Lend-Lease, embargo choice, Manhattan Project priority, war entry |
| pacific.ts | 8 | island campaign posture, China front events |
| endgame.ts | 12 | unconditional surrender vs negotiated peace, atomic use choice (any nation with ATOMIC flag), partition events, war-end epilogue triggers |
| covertOps.ts | 12 | assassination aftermaths per major (Hitler dead → succession crisis chain of 3), blowback events, coup outcomes |
| generic.ts | 19 | parameterized minor-nation templates: border crisis, great-power backing offer, partisan uprising, join-faction ultimatum, trade demand, mobilization choice |

Content agent rules: period documentary voice, 40–150 words per event text, no swastika references, every event data-valid against DSL (ids checked by integrity tests), no calendar-only triggers (always at least one world-state condition; `turnAtLeast` allowed as floor only), atrocities acknowledged via chronicle entries not mechanics.

## Tasks

### Task 0: Scaffold
Files: package.json, vite.config.ts, tsconfig.json (strict), index.html, netlify.toml, src/main.tsx, src/App.tsx (placeholder), src/theme.css, tests/smoke.test.ts.
Steps: `npm create vite` equivalent by hand (react-ts), add vitest + @testing-library/react + zustand + tsx. `npm test` and `npm run build` pass. Commit.
Theme: dark charcoal `#1a1a1e`, paper panels `#e8e2d0` with typewriter-adjacent font stack (`'Courier Prime', 'Courier New', monospace` for documents; system sans for chrome), faction colors: axis `#8a3b3b`, allies `#3b5a8a`, comintern `#7a3b3b`→use `#a05252` axis / `#4a6fa5` allies / `#b3403f` comintern / neutral `#6b6b5f`.

### Task 1: types + rng + balance
Files: src/engine/types.ts (verbatim from contract), src/engine/rng.ts, src/engine/balance.ts, tests/rng.test.ts.
Test first: same seed → identical 100-draw sequence; different seeds differ; `int(1,6)` within bounds over 1000 draws; `chance(0)`=false, `chance(1)`=true. mulberry32 implementation. Commit.

### Task 2: conditions + effects interpreters
Files: src/engine/conditions.ts (`evalCondition(c, state, rng): boolean`), src/engine/effects.ts (`applyEffects(effects, state, rng): GameState`), tests for both.
Tests: build a minimal 3-nation fixture state (helper in tests/fixtures.ts — GER/POL/FRA, 5 regions); assert each condition variant; assert effects produce new state without mutating input (deep-freeze fixture); declareWar creates/merges War + sets relations −100 + tension; annex transfers regions, marks dead, moves armies off. killLeader without succession table falls back gracefully. Commit per module.

### Task 3: data — regions + nations + leaders + techs + objectives
Files: src/data/regions.ts, nations.ts, leaders.ts, techs.ts, objectives.ts, tests/data.test.ts.
Integrity tests (write first): adjacency symmetric; all nation capitals exist and are owned by them; all claims/guarantees/relations reference existing ids; region owners are real nations; every playable major has objectives + leader + succession entries; ic totals within ±10% of targets; colors unique enough (no exact dupes). Commit.

### Task 4: setup + economy + research
Files: src/engine/setup.ts (`buildInitialState`), src/engine/economy.ts, src/engine/research.ts, tests for each.
Economy tests with concrete numbers: nation with 2 regions (ic 10+20), stability 50 → ic = 30×0.75 = 22.5; cut capital connection → disconnected region excluded and army supplyFactor 0.5; oil-zero air penalty applied. Research: known progress arithmetic; secret gated on industry≥2. Commit per module.

### Task 5: combat
Files: src/engine/combat.ts, tests/combat.test.ts.
Tests with concrete numbers first: single army 80str/75eq/tech0 attacking plains region defended by 40str/50eq hold entrench 2 → compute exact attack/defense per formulas with rng pinned (inject rng returning 1.0) → assert capture true and exact casualties. Mountain defense holds same odds. Retreat-path selection deterministic. Amphibious gate. Blockade math. Commit.

### Task 6: diplomacy + politics + victory
Files: src/engine/diplomacy.ts, politics.ts, victory.ts, tests.
Tests: drift values exact; capitulation triggers on capital+VP rule; verdict tiers at boundary scores. Commit per module.

### Task 7: covert
Files: src/engine/covert.ts, tests/covert.test.ts.
Tests: mission lifecycle turns; success path applies succession (fixture table); failure sets blowback flag + relations; odds respect network bonus (pin rng). Commit.

### Task 8: AI
Files: src/engine/ai.ts, tests/ai.test.ts.
Tests: posture flips at ratio boundaries; DoW threshold respects aggression math (GER personality with overwhelming ratio → declares on claim; POL never initiates); democracies guarantee under tension rule; allocation per focus. Commit.

### Task 9: events engine + turn pipeline
Files: src/engine/events.ts, src/engine/turn.ts (`resolveTurn(state, playerOrders): GameState` — orders applied by store before calling; pipeline order: AI → combat → economy → research → covert → politics → diplomacy drift → events → chronicle → reports → victory), src/engine/chronicle.ts, src/engine/epilogue.ts, tests.
Tests: event fires once; priority ordering; player vs AI routing; queueEvent delay; full-turn smoke: initial state resolves 12 turns without player input, no exceptions, war eventually declared by GER when ratio met. Chronicle convergence/divergence with pinned fixtures. Commit per module.

### Task 10: store + App shell + NationPicker + TopBar + SaveLoad
Files: src/store.ts (zustand: state, dispatch(playerOrder), endTurn(), newGame(nation, seed), save/load slots, autosave each turn), src/App.tsx (screen router: picker → game → end), src/ui/NationPicker.tsx (map-less list grouped by faction with 1938 stats + difficulty tag: majors "Full campaign", minors "Hard mode"), TopBar.tsx (date, resources, stability/warSupport, tension meter, End Turn), SaveLoad.tsx (3 slots + export/import JSON). Component smoke tests with Testing Library. Commit per component.

### Task 11: map
Files: src/ui/mapGeometry.ts (region → SVG path, 1400×900 viewBox, stylized-angular low-poly aesthetic; hand-plausible shapes, Europe occupies left 60%), src/ui/MapView.tsx (fill = controller color, player highlight, war borders pulsing stroke, click → region detail popover: armies, terrain, ic, owner; army chips on regions with player armies). Geometry test: every region in regions.ts has a path; paths parse. Commit.

### Task 12: panels
Files: ReportsPanel (turn reports grouped by kind), FrontsPanel (armies list: posture select, redeploy via map click-target mode), ProductionPanel (allocation sliders sum-to-1), ResearchPanel (track picker + progress), DiplomacyPanel (relations table, pacts, guarantee/improve actions cost civilian IC), CovertPanel (networks per target, mission launcher with odds preview), ChroniclePanel (split timeline: real vs yours, divergences highlighted), EventModal (period-document styling, choices with detail), EndScreen (verdict, score, epilogue, chronicle export). SidePanel tab shell. Smoke tests. Commit per panel batch.

### Task 13: event content (fan-out, 13 packs per matrix)
Files: src/data/events/*.ts, src/data/historyTimeline.ts.
Each pack agent receives: the DSL types, nation/region/leader/flag id lists, pack spec row, voice rules. Integrity tests extended: every referenced id valid; every event has ≥1 choice; text length bounds; no `turnAtLeast`-only triggers. After merge: verification agents review each pack for historical plausibility + DSL correctness. Commit per pack.

### Task 14: simulation harness + balance
Files: scripts/sim.ts (headless: N seeds × AI-only full campaigns; outputs milestone table: %GER-POL war by end '39, %France fallen by end '41, %war over by '48, avg war dead), tests/sim.test.ts (thresholds: ≥60%, ≥50%, ≥75%). Tune balance.ts until green. Commit.

### Task 15: verification + polish
Run the game in the browser (preview_start), play 15+ turns as Poland and as Germany, verify: picker → campaign → events fire → combat flips regions → save/load roundtrip → end screen renders. Fix what breaks. Lighthouse-level sanity on bundle. README.md with run instructions. Final commit.

## Self-review notes
- Spec coverage: turn loop (T9/10), simulation model (T3–8), flashpoints (T9/13), covert+succession (T7/13), AI personalities+cascade (T8, setAI effects), Chronicle+epilogue (T9), victory nation-specific (T6/T3 objectives), tone rules (T13 content rules), stack (T0/10), saves (T10), map (T11), balance/hours (T14). No gaps found.
- Type consistency: all module signatures reference types.ts names above.
- Known deferral: LLM game-master layer explicitly out of scope (spec: "bolt on later").
