// The iconic-battle catalog: named historical set-pieces that get a
// multi-turn cinematic treatment instead of resolving as an ordinary front
// report. See src/engine/iconicBattles.ts for how a catalog entry becomes an
// ActiveIconicBattle and drives combat.ts's intensity bonus.
//
// Pure serializable data, same DSL conventions as objectives.ts and
// historyTimeline.ts: `trigger` is a Condition, never a closure. Every
// trigger anchors on real world state (a flag, a war, who controls what);
// `turnAtLeast` appears only as a floor alongside those, never alone.
//
// V1 ships the three battles the feedback pass asked for by name. The
// catalog is plain data, so adding more (Stalingrad, Kursk) later costs an
// entry here, not engine work.

import type { Condition, IconicBattle, NationId, RegionId } from '../engine/types';

const controls = (nation: NationId, region: RegionId): Condition =>
  ({ t: 'controls', nation, region });
const atWar = (a: NationId, b?: NationId): Condition =>
  b === undefined ? { t: 'atWar', a } : { t: 'atWar', a, b };
const and = (...c: Condition[]): Condition => ({ t: 'and', c });
const or = (...c: Condition[]): Condition => ({ t: 'or', c });
const flag = (key: string): Condition => ({ t: 'flag', key });
const turnAtLeast = (n: number): Condition => ({ t: 'turnAtLeast', n });

export const ICONIC_BATTLES: IconicBattle[] = [
  {
    id: 'iconic-barbarossa',
    name: 'Operation Barbarossa',
    // Germany's own war-council event sets BARBAROSSA the turn it commits to
    // the invasion; atWar is the belt-and-braces check that it actually
    // followed through.
    trigger: and(flag('BARBAROSSA'), atWar('GER', 'SOV')),
    region: 'sov-moscow',
    attacker: ['GER'],
    defender: ['SOV'],
    maxDuration: 6,
    intensityBonus: 1.4,
    phases: [
      {
        name: 'The Frontier Breaks',
        text: 'Three army groups go over the line at first light, armor leading, the Soviet forward divisions caught still deploying. The advance in the first days is measured in tens of kilometres, not one.',
      },
      {
        name: 'The Drive on Moscow',
        text: 'The panzer spearheads are deep in Soviet territory now, the pockets behind them full of prisoners the rear echelons cannot process fast enough. Moscow is a name on every staff map, closer each week than doctrine assumed it would be.',
      },
      {
        name: 'Mud and Winter',
        text: 'The roads have turned to mire and then to ice. Supply columns that outran their timetable in July are stuck fast in November, and the divisions at the point of the spear are running on captured stores and stubbornness.',
      },
    ],
    resolutionText: {
      attackerWins:
        'Moscow has fallen. Whatever the campaign was supposed to prove about the limits of German arms, this is not that campaign — the Soviet capital is in enemy hands and the government has gone east.',
      defenderHolds:
        'Moscow holds. German spearheads have been fought to a standstill within sight of the city\'s towers, the offensive\'s timetable broken against a defence the planners did not budget for.',
      timedOut:
        'The offensive culminates without a verdict. Neither side can call this decided — the front simply stops where the year ran out, and both armies dig in for a winter nobody prepared for.',
    },
  },
  {
    id: 'iconic-dday',
    name: 'The Return to France',
    // The Western Allies coming back across the Channel — plausible only once
    // there is a Western Ally actually at war with Germany, an Eastern Front
    // is already open (the historical strategic precondition), and enough
    // time has passed to build the invasion fleet in the first place.
    trigger: and(
      controls('GER', 'fra-north'),
      or(atWar('UK', 'GER'), atWar('USA', 'GER')),
      atWar('GER', 'SOV'),
      turnAtLeast(60),
    ),
    region: 'fra-north',
    attacker: ['UK', 'USA'],
    defender: ['GER'],
    maxDuration: 4,
    intensityBonus: 1.4,
    phases: [
      {
        name: 'The Landings',
        text: 'Before dawn the invasion fleet stands off the Channel coast, and by first light the beaches are a single continuous line of fire. The lodgement by nightfall is a few miles deep and desperately thin, but it is ashore.',
      },
      {
        name: 'The Breakout',
        text: 'Weeks of hedgerow fighting have bled both sides white for a few hundred yards at a time. Now the line gives, all at once, and armored columns that spent a month measuring ground in fields are suddenly measuring it in miles.',
      },
      {
        name: 'The Falaise Pocket',
        text: 'What is left of the German position in Normandy is being encircled rather than defeated in the field — divisions that cannot disengage in time are being ground to nothing in a shrinking pocket under constant air attack.',
      },
    ],
    resolutionText: {
      attackerWins:
        'The beachhead has become a breakout. Allied armor is loose in the French interior, and the German position in the west is coming apart faster than the retreat can organize.',
      defenderHolds:
        'The landings have been contained. The lodgement holds a strip of Norman coastline and nothing more — the line has bent and not broken, and the invasion has not become the breakout it needed to be.',
      timedOut:
        'The battle for Normandy grinds past any clean reckoning. Neither thrown back into the sea nor loose in France, the front settles into a bloody stalemate among the hedgerows.',
    },
  },
  {
    id: 'iconic-bulge',
    name: 'The Ardennes Offensive',
    // A German counterstroke into Allied-held Belgium only makes sense once
    // the Western Allies actually hold the ground to be counterattacked.
    trigger: and(
      or(controls('UK', 'bel-brussels'), controls('USA', 'bel-brussels'), controls('FRA', 'bel-brussels')),
      atWar('GER', 'SOV'),
      atWar('GER', 'UK'),
      turnAtLeast(70),
    ),
    region: 'bel-brussels',
    attacker: ['GER'],
    defender: ['UK', 'USA', 'FRA'],
    maxDuration: 3,
    intensityBonus: 1.35,
    phases: [
      {
        name: 'The Ardennes Offensive',
        text: 'Under cloud cover that grounds the Allied air forces, German divisions come out of the Ardennes forest in strength nobody on the Allied side of the line believed the Reich still had to spend.',
      },
      {
        name: 'The Salient Deepens',
        text: 'The front has bent into a deep westward bulge, road junctions holding out as isolated islands behind the German spearheads. The advance is running on fuel captured from Allied depots, and the drivers know it.',
      },
      {
        name: 'The Weather Clears',
        text: 'The cloud breaks, and the Allied air forces come back into the sky in force. The columns that moved freely under cover for a week are now targets on open roads, and the salient\'s momentum is bleeding out fast.',
      },
    ],
    resolutionText: {
      attackerWins:
        'The line has broken. German armor is loose behind what was the Allied front, and the west is closer to a general collapse than at any point since the landings.',
      defenderHolds:
        'The salient holds at its shoulders. The German drive has spent itself against positions that would not give and fuel that ran out before the objective did.',
      timedOut:
        'The offensive burns out in the snow — neither broken through nor thrown back, just a jagged scar across the Ardennes and two armies too exhausted to finish what the weather started.',
    },
  },
];
