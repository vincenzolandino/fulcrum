# Fulcrum: 1938–1948 — Design Spec

Approved by Vincenzo, 2026-07-10. Architecture choice: systemic engine with authored flashpoints (Option A), designed so an LLM game-master layer can bolt on later.

## Concept

Single-player, turn-based grand strategy in the browser. The player picks any of ~40 nations in January 1938 and plays monthly turns through December 1948. A living simulation runs every other nation. History happens around the player unless they bend it; once bent, the simulation carries consequences forward. Outcomes are emergent, not scripted.

## Core loop

One turn = one calendar month. ~130 turns per campaign, 4–10 hours of play.

Per turn:
1. **Reports** — intel briefs, front updates, diplomatic cables in period voice.
2. **Decisions** — industry allocation, army movement between fronts, military posture per front (All-Out Attack / Offensive / Hold / Elastic Defense / Retreat), diplomacy, covert operations, research direction.
3. **Flashpoints** — authored events that fired this turn present choices.
4. **Resolution** — simulation resolves battles, economies, AI-nation decisions; hands the player the new world state.

No unit micromanagement. Player commands at the Churchill level: fronts, priorities, gambles.

## Simulation model

Per nation:
- **Economy**: industry capacity (IC), resources (oil, steel, food), trade links.
- **Military**: armies rated by strength / equipment / doctrine, assigned to fronts; navy fleet rating; air force rating.
- **Politics**: government type, stability, war support, faction alignment (Axis / Allies / Comintern / Neutral).
- **Diplomacy**: relations matrix, guarantees, pacts, territorial claims.
- **Intel**: spy networks per target nation, covert ops menu.
- **Research**: six tracks — armor, air, naval, industry, doctrine, secret weapons (ends in atomic bomb).
- **Leaders**: named historical figures with traits; removal/death changes AI behavior (succession simulation).

Map: stylized SVG regions. Fine-grained Europe (~35 regions), coarser Pacific/Africa/Asia/Americas (~25 regions). Combat resolves region-by-region from strength, equipment, doctrine, terrain, supply, morale, with a seeded deterministic RNG (reproducible campaigns).

## Flashpoints

~150 hand-authored decision events, triggered by world-state conditions, never by calendar date alone. Each: 2–5 choices, consequences feed the simulation. Dynamic preconditions (Molotov-Ribbentrop fires only if both parties still see benefit). Generic parameterized event templates cover minor nations (border crisis, foreign backing, partisans, coup).

Covert ops: build spy networks over months; operations (assassination, coup support, sabotage, intel theft) with success/exposure odds and real blowback. Killing Hitler triggers succession (Göring / Himmler / army junta), each a different AI personality.

## AI

Each AI nation runs a strategic personality (aggression, risk tolerance, ideology, opportunism) plus goal scripts re-evaluated every turn against world state. Flags (e.g., HITLER_DEAD, POLAND_STANDS, FRANCE_FIGHTS_ON) cascade into AI re-planning.

## The Chronicle

Running split timeline: the player's history vs. real history, divergences highlighted. At game end, generates a written alternate-history epilogue ("history's judgment") from the campaign record. Victory is nation-specific and scored against the starting position — survival is triumph for Poland; stalemate is defeat for Germany.

## Tone

Documentary, not pulp. Period-voice text. Atrocities acknowledged in the Chronicle as consequences, never gamified as mechanics. No swastika iconography.

## Stack

- React + TypeScript + Vite. No backend. Static deploy (Netlify-ready).
- State: single reducer over an immutable GameState; seeded RNG.
- Saves: localStorage slots + JSON export/import.
- Content (nations, events, techs, leaders) in data files, fully separated from engine code.
- Desktop browser first.

## Build order

1. Engine core: state model, turn loop, economy, seeded RNG.
2. Map UI + front/army management.
3. Combat resolution.
4. Diplomacy + AI personalities.
5. Event system + flashpoint content library.
6. Covert ops.
7. Chronicle + epilogue generator.
8. Balance pass + polish.

Content authoring (events, nation data) fans out to parallel agents with historical verification.
