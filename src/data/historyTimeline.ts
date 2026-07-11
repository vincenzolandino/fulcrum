// Real-history milestones for the Chronicle. Each entry carries the turn it
// happened on in our timeline (turn 0 = January 1938), a period-voice text,
// and a `matches` Condition that tests whether the in-game world tracked
// history at that moment. chronicle.ts logs a convergence when `matches`
// holds ("As in our history: ...") and a divergence when it does not ("Here
// history turned: ...").
//
// Pure serializable data: the helpers below only build plain Condition
// objects (same pattern as objectives.ts). No closures in content.

import type { Condition, Faction, NationId, RegionId } from '../engine/types';

export interface HistoryMilestone {
  turn: number;
  text: string;
  matches: Condition;
}

/** turn for a calendar date; month is 1-12. Turn 0 = January 1938. */
const t = (year: number, month: number): number => (year - 1938) * 12 + (month - 1);

const controls = (nation: NationId, region: RegionId): Condition =>
  ({ t: 'controls', nation, region });
const atWar = (a: NationId, b?: NationId): Condition =>
  b === undefined ? { t: 'atWar', a } : { t: 'atWar', a, b };
const alive = (nation: NationId): Condition => ({ t: 'alive', nation });
const not = (c: Condition): Condition => ({ t: 'not', c });
const and = (...c: Condition[]): Condition => ({ t: 'and', c });
const or = (...c: Condition[]): Condition => ({ t: 'or', c });
const inFaction = (nation: NationId, is: Faction): Condition => ({ t: 'faction', nation, is });
const relationsAtLeast = (a: NationId, b: NationId, atLeast: number): Condition =>
  ({ t: 'relations', a, b, atLeast });
const flag = (key: string): Condition => ({ t: 'flag', key });
const always: Condition = { t: 'always' };

export const HISTORY_TIMELINE: HistoryMilestone[] = [
  {
    turn: t(1938, 3), // 2
    text: 'German troops crossed into Austria unopposed and the Anschluss folded the republic into the Reich.',
    matches: controls('GER', 'aus-austria'),
  },
  {
    turn: t(1938, 9), // 8
    text: 'at Munich, Britain and France handed the Sudetenland to Germany and called it peace for our time.',
    matches: and(controls('GER', 'cze-sudetenland'), not(atWar('GER', 'CZE'))),
  },
  {
    turn: t(1938, 11), // 10
    text: 'across Germany, synagogues burned and Jewish shops were smashed in a night of state-directed violence the world would remember as Kristallnacht.',
    matches: always, // an atrocity acknowledged, not simulated
  },
  {
    turn: t(1939, 3), // 14
    text: 'German columns entered Prague, and what Munich had left of Czechoslovakia was extinguished.',
    matches: or(controls('GER', 'cze-prague'), not(alive('CZE'))),
  },
  {
    turn: t(1939, 4), // 15
    text: 'Italian troops seized Albania in a week of one-sided fighting.',
    matches: or(controls('ITA', 'alb-albania'), not(alive('ALB'))),
  },
  {
    turn: t(1939, 5), // 16
    text: 'Germany and Italy bound themselves together in the Pact of Steel.',
    matches: or(inFaction('ITA', 'axis'), relationsAtLeast('GER', 'ITA', 60)),
  },
  {
    turn: t(1939, 8), // 19
    text: 'Berlin and Moscow stunned the world with a non-aggression pact, secret protocols and all.',
    matches: relationsAtLeast('GER', 'SOV', -20),
  },
  {
    turn: t(1939, 9), // 20
    text: 'German armies poured across the Polish frontier at dawn on the first of September.',
    matches: or(atWar('GER', 'POL'), not(alive('POL'))),
  },
  {
    turn: t(1939, 9), // 20
    text: 'Britain and France declared war on Germany, and the European war began.',
    matches: and(atWar('UK', 'GER'), atWar('FRA', 'GER')),
  },
  {
    turn: t(1939, 10), // 21
    text: 'the Red Army occupied eastern Poland under the secret protocol.',
    matches: or(controls('SOV', 'pol-east'), atWar('SOV', 'POL')),
  },
  {
    turn: t(1939, 12), // 23
    text: 'Soviet divisions attacked Finland, and the Winter War began in the snow.',
    matches: or(atWar('SOV', 'FIN'), controls('SOV', 'fin-karelia')),
  },
  {
    turn: t(1940, 4), // 27
    text: 'Germany overran Denmark in a morning and landed troops along the Norwegian coast.',
    matches: or(controls('GER', 'den-copenhagen'), controls('GER', 'nor-oslo'), atWar('GER', 'NOR')),
  },
  {
    turn: t(1940, 5), // 28
    text: 'the German offensive in the West opened through the Low Countries and the Ardennes.',
    matches: or(
      controls('GER', 'bel-brussels'),
      controls('GER', 'ned-amsterdam'),
      atWar('GER', 'BEL'),
      atWar('GER', 'NED'),
    ),
  },
  {
    turn: t(1940, 6), // 29
    text: 'Paris fell, and France signed an armistice in the railway carriage at Compiègne.',
    matches: controls('GER', 'fra-paris'),
  },
  {
    turn: t(1940, 8), // 31
    text: 'the Luftwaffe and the Royal Air Force fought for the sky over southern England.',
    matches: atWar('GER', 'UK'),
  },
  {
    turn: t(1940, 9), // 32
    text: 'Japan joined Germany and Italy in the Tripartite Pact.',
    matches: or(inFaction('JAP', 'axis'), relationsAtLeast('JAP', 'GER', 60)),
  },
  {
    turn: t(1940, 10), // 33
    text: 'Italy invaded Greece out of Albania, and found the mountains full of fight.',
    matches: or(atWar('ITA', 'GRE'), controls('ITA', 'gre-athens')),
  },
  {
    turn: t(1941, 3), // 38
    text: 'the United States began arming Britain under Lend-Lease, neutrality in name only.',
    matches: relationsAtLeast('USA', 'UK', 50),
  },
  {
    turn: t(1941, 6), // 41
    text: 'three million men crossed the Soviet frontier at first light. Barbarossa had begun.',
    matches: atWar('GER', 'SOV'),
  },
  {
    turn: t(1941, 9), // 44
    text: 'German spearheads stood deep in Russia, besieging Leningrad and driving on Moscow and Kiev.',
    matches: or(
      controls('GER', 'sov-byelorussia'),
      controls('GER', 'sov-ukraine'),
      controls('GER', 'sov-leningrad'),
    ),
  },
  {
    turn: t(1941, 12), // 47
    text: 'Japanese carriers struck Pearl Harbor on a Sunday morning, and America came into the war.',
    matches: atWar('JAP', 'USA'),
  },
  {
    turn: t(1942, 2), // 49
    text: 'Singapore surrendered — the worst capitulation in the history of British arms.',
    matches: controls('JAP', 'uk-malaya'),
  },
  {
    turn: t(1942, 6), // 53
    text: 'American dive bombers found the Japanese carriers at Midway and turned the Pacific war in an afternoon.',
    matches: and(atWar('JAP', 'USA'), not(controls('JAP', 'usa-hawaii'))),
  },
  {
    turn: t(1943, 2), // 61
    text: 'the Sixth Army surrendered in the rubble of Stalingrad, and the German tide in the East broke.',
    matches: and(
      atWar('GER', 'SOV'),
      not(controls('GER', 'sov-moscow')),
      not(controls('GER', 'sov-caucasus')),
    ),
  },
  {
    turn: t(1943, 7), // 66
    text: 'Allied troops landed in Sicily, and Mussolini\'s government began to come apart.',
    matches: or(
      controls('UK', 'ita-sicily'),
      controls('USA', 'ita-sicily'),
      not(alive('ITA')),
    ),
  },
  {
    turn: t(1944, 6), // 77
    text: 'Allied armies stormed the Normandy beaches and opened the second front in the West.',
    matches: or(
      controls('UK', 'fra-north'),
      controls('USA', 'fra-north'),
      controls('FRA', 'fra-north'),
    ),
  },
  {
    turn: t(1944, 8), // 79
    text: 'Paris was liberated, and de Gaulle walked down the Champs-Élysées.',
    matches: not(controls('GER', 'fra-paris')),
  },
  {
    turn: t(1945, 5), // 88
    text: 'Berlin fell to the Red Army and Germany surrendered unconditionally. The war in Europe was over.',
    matches: or(not(controls('GER', 'ger-berlin')), not(alive('GER'))),
  },
  {
    turn: t(1945, 8), // 91
    text: 'a single bomb erased Hiroshima, and the atomic age opened in fire.',
    matches: and(flag('ATOMIC_USA'), atWar('USA', 'JAP')),
  },
  {
    turn: t(1945, 9), // 92
    text: 'Japan surrendered aboard the Missouri in Tokyo Bay. The Second World War was over.',
    matches: or(not(atWar('JAP')), not(alive('JAP'))),
  },
];
