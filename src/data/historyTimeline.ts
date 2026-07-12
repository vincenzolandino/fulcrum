// Real-history milestones for the Chronicle. Each entry carries the turn it
// happened on in our timeline (turn 0 = January 1938), a period-voice text,
// a `matches` Condition that tests whether the in-game world tracked history
// at that moment, and an `otherwise` list of alternate-outcome branches used
// when it did not. chronicle.ts logs a convergence when `matches` holds ("As
// in our history: ...") and, on a miss, evaluates `otherwise` in order and
// logs the first branch whose `when` condition holds ("Here history turned:
// ..."), so the entry always says what happened in THIS game, never just
// what didn't.
//
// Every `otherwise` list ends with an `{ t: 'always' }` catch-all so a world
// state nobody anticipated still gets an honest line instead of nothing.
//
// Pure serializable data: the helpers below only build plain Condition
// objects (same pattern as objectives.ts). No closures in content.

import type { Condition, Faction, HistoryMilestone, NationId, RegionId } from '../engine/types';

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

/** Every milestone's final `otherwise` branch: an honest, non-specific line. */
const CATCHALL = { text: 'the record breaks from what we knew here — see this month’s dispatches for what happened instead.', when: always };

export const HISTORY_TIMELINE: HistoryMilestone[] = [
  {
    turn: t(1938, 3), // 2
    text: 'German troops crossed into Austria unopposed and the Anschluss folded the republic into the Reich.',
    matches: controls('GER', 'aus-austria'),
    otherwise: [
      { text: 'Vienna refused the ultimatum outright, and Austrian units stood to their positions on the German frontier rather than open the gates.', when: flag('PRE_AUSTRIA_RESISTS') },
      { text: 'the ultimatum to Vienna had not yet been sent — the chancellery still stood free, watching Berlin for its next move.', when: always },
    ],
  },
  {
    turn: t(1938, 9), // 8
    text: 'at Munich, Britain and France handed the Sudetenland to Germany and called it peace for our time.',
    matches: and(controls('GER', 'cze-sudetenland'), not(atWar('GER', 'CZE'))),
    otherwise: [
      { text: 'Prague refused the ultimatum, and German units crossed into the Sudeten fortifications under fire rather than by conference.', when: atWar('GER', 'CZE') },
      { text: 'Czechoslovakia had already gone under before the Sudeten question was ever settled at a conference table.', when: not(alive('CZE')) },
      { text: 'the Sudeten crisis was still unresolved — Berlin’s demand sat unanswered as autumn closed in.', when: always },
    ],
  },
  {
    turn: t(1938, 11), // 10
    text: 'across Germany, synagogues burned and Jewish shops were smashed in a night of state-directed violence the world would remember as Kristallnacht.',
    matches: always, // an atrocity acknowledged, not simulated; this entry can never diverge
    otherwise: [CATCHALL],
  },
  {
    turn: t(1939, 3), // 14
    text: 'German columns entered Prague, and what Munich had left of Czechoslovakia was extinguished.',
    matches: or(controls('GER', 'cze-prague'), not(alive('CZE'))),
    otherwise: [
      { text: 'the war over the Sudetenland was still grinding on into the spring, Czech units holding out well past Munich’s timetable.', when: atWar('GER', 'CZE') },
      { text: 'Prague remained free — Czechoslovakia had not been dismembered on Berlin’s schedule after all.', when: alive('CZE') },
      { text: 'what became of rump Czechoslovakia this spring is unclear from the record we hold.', when: always },
    ],
  },
  {
    turn: t(1939, 4), // 15
    text: 'Italian troops seized Albania in a week of one-sided fighting.',
    matches: or(controls('ITA', 'alb-albania'), not(alive('ALB'))),
    otherwise: [
      { text: 'Rome held off the Albanian adventure, leaving Tirana to its own king a season longer than our history allowed.', when: alive('ALB') },
      { text: 'Albania’s fate this spring went unrecorded on our side of the ledger.', when: always },
    ],
  },
  {
    turn: t(1939, 5), // 16
    text: 'Germany and Italy bound themselves together in the Pact of Steel.',
    matches: or(inFaction('ITA', 'axis'), relationsAtLeast('GER', 'ITA', 60)),
    otherwise: [
      { text: 'Rome kept its distance from Berlin, the Axis still an understanding rather than a signed alliance.', when: always },
    ],
  },
  {
    turn: t(1939, 8), // 19
    text: 'Berlin and Moscow stunned the world with a non-aggression pact, secret protocols and all.',
    matches: relationsAtLeast('GER', 'SOV', -20),
    otherwise: [
      { text: 'Germany and the Soviet Union were already at daggers drawn, and no bargain over Poland was ever struck between them.', when: atWar('GER', 'SOV') },
      { text: 'Berlin and Moscow stayed cold and unsigned — the partition Molotov and Ribbentrop arranged in our history never happened here.', when: always },
    ],
  },
  {
    turn: t(1939, 9), // 20
    text: 'German armies poured across the Polish frontier at dawn on the first of September.',
    matches: or(atWar('GER', 'POL'), not(alive('POL'))),
    otherwise: [
      { text: 'Warsaw yielded Danzig to the ultimatum, and the frontier stayed quiet a while longer for the concession.', when: flag('DANZIG_CONCEDED') },
      { text: 'Poland stood on the Danzig question and the frontier held, armed and watchful, into the autumn.', when: alive('POL') },
      { text: 'the German-Polish frontier had not yet broken into open war.', when: always },
    ],
  },
  {
    turn: t(1939, 9), // 20
    text: 'Britain and France declared war on Germany, and the European war began.',
    matches: and(atWar('UK', 'GER'), atWar('FRA', 'GER')),
    otherwise: [
      { text: 'London stood on its guarantee alone — Paris had not yet followed Britain’s declaration.', when: atWar('UK', 'GER') },
      { text: 'Paris was at war with Berlin without London beside it, the guarantee honoured on only one side of the Channel.', when: atWar('FRA', 'GER') },
      { text: 'neither London nor Paris had yet answered Germany’s move with a declaration of their own.', when: always },
    ],
  },
  {
    turn: t(1939, 10), // 21
    text: 'the Red Army occupied eastern Poland under the secret protocol.',
    matches: or(controls('SOV', 'pol-east'), atWar('SOV', 'POL')),
    otherwise: [
      { text: 'Moscow held back from the partition — eastern Poland stayed outside Soviet hands this autumn.', when: always },
    ],
  },
  {
    turn: t(1939, 12), // 23
    text: 'Soviet divisions attacked Finland, and the Winter War began in the snow.',
    matches: or(atWar('SOV', 'FIN'), controls('SOV', 'fin-karelia')),
    otherwise: [
      { text: 'Moscow left Helsinki’s answer on the table rather than force the Karelian question by arms.', when: always },
    ],
  },
  {
    turn: t(1940, 4), // 27
    text: 'Germany overran Denmark in a morning and landed troops along the Norwegian coast.',
    matches: or(controls('GER', 'den-copenhagen'), controls('GER', 'nor-oslo'), atWar('GER', 'NOR')),
    otherwise: [
      { text: 'Scandinavia stayed untouched this spring — Berlin’s attention was still fixed elsewhere.', when: always },
    ],
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
    otherwise: [
      { text: 'the Low Countries stood untouched — the storm that broke over Belgium and Holland in our history had not yet come.', when: always },
    ],
  },
  {
    turn: t(1940, 6), // 29
    text: 'Paris fell, and France signed an armistice in the railway carriage at Compiègne.',
    matches: controls('GER', 'fra-paris'),
    otherwise: [
      { text: 'Paris was under attack but had not yet fallen — the French line was bending, not broken.', when: atWar('GER', 'FRA') },
      { text: 'France had not been invaded by this point; the front that would decide her fate hadn’t opened yet.', when: always },
    ],
  },
  {
    turn: t(1940, 8), // 31
    text: 'the Luftwaffe and the Royal Air Force fought for the sky over southern England.',
    matches: atWar('GER', 'UK'),
    otherwise: [
      { text: 'Britain and Germany were not at war this summer — the fight for the Channel skies our history remembers never happened.', when: always },
    ],
  },
  {
    turn: t(1940, 9), // 32
    text: 'Japan joined Germany and Italy in the Tripartite Pact.',
    matches: or(inFaction('JAP', 'axis'), relationsAtLeast('JAP', 'GER', 60)),
    otherwise: [
      { text: 'Tokyo stayed unaligned, watching Europe’s war from a distance rather than binding itself to Berlin and Rome.', when: always },
    ],
  },
  {
    turn: t(1940, 10), // 33
    text: 'Italy invaded Greece out of Albania, and found the mountains full of fight.',
    matches: or(atWar('ITA', 'GRE'), controls('ITA', 'gre-athens')),
    otherwise: [
      { text: 'Rome left Greece alone this autumn — the Epirus adventure of our history was never launched.', when: always },
    ],
  },
  {
    turn: t(1941, 3), // 38
    text: 'the United States began arming Britain under Lend-Lease, neutrality in name only.',
    matches: relationsAtLeast('USA', 'UK', 50),
    otherwise: [
      { text: 'Washington was already a belligerent by this point, Lend-Lease overtaken by outright American entry into the war.', when: atWar('USA', 'GER') },
      { text: 'American opinion had not yet swung this far toward London — the arsenal-of-democracy policy of our history was still just a debate in Congress.', when: always },
    ],
  },
  {
    turn: t(1941, 6), // 41
    text: 'three million men crossed the Soviet frontier at first light. Barbarossa had begun.',
    matches: atWar('GER', 'SOV'),
    otherwise: [
      { text: 'the Molotov–Ribbentrop line held — Germany and the Soviet Union remained at uneasy peace this summer, the invasion our history knew never launched.', when: always },
    ],
  },
  {
    turn: t(1941, 9), // 44
    text: 'German spearheads stood deep in Russia, besieging Leningrad and driving on Moscow and Kiev.',
    matches: or(
      controls('GER', 'sov-byelorussia'),
      controls('GER', 'sov-ukraine'),
      controls('GER', 'sov-leningrad'),
    ),
    otherwise: [
      { text: 'the Eastern Front was open but the German advance had gone nowhere near as far as it did in our history — the frontier fighting was still close to the old border.', when: atWar('GER', 'SOV') },
      { text: 'there was no Eastern Front this autumn to speak of.', when: always },
    ],
  },
  {
    turn: t(1941, 12), // 47
    text: 'Japanese carriers struck Pearl Harbor on a Sunday morning, and America came into the war.',
    matches: atWar('JAP', 'USA'),
    otherwise: [
      { text: 'the Pacific stayed quiet between Tokyo and Washington — the strike our history remembers as Pearl Harbor was never launched.', when: always },
    ],
  },
  {
    turn: t(1942, 2), // 49
    text: 'Singapore surrendered — the worst capitulation in the history of British arms.',
    matches: controls('JAP', 'uk-malaya'),
    otherwise: [
      { text: 'Malaya held — the fortress at Singapore never faced the reckoning it did in our history.', when: always },
    ],
  },
  {
    turn: t(1942, 6), // 53
    text: 'American dive bombers found the Japanese carriers at Midway and turned the Pacific war in an afternoon.',
    matches: and(atWar('JAP', 'USA'), not(controls('JAP', 'usa-hawaii'))),
    otherwise: [
      { text: 'Hawaii itself had fallen to Japan by this point — the Pacific war had gone far worse for Washington than the Midway turn our history recorded.', when: and(atWar('JAP', 'USA'), controls('JAP', 'usa-hawaii')) },
      { text: 'Japan and America were not yet at war, so no carrier battle in the mid-Pacific was there to be fought.', when: always },
    ],
  },
  {
    turn: t(1943, 2), // 61
    text: 'the Sixth Army surrendered in the rubble of Stalingrad, and the German tide in the East broke.',
    matches: and(
      atWar('GER', 'SOV'),
      not(controls('GER', 'sov-moscow')),
      not(controls('GER', 'sov-caucasus')),
    ),
    otherwise: [
      { text: 'German spearheads still held Moscow or the Caucasus oil country this winter — the East had not yet turned the way it did in our history.', when: atWar('GER', 'SOV') },
      { text: 'the Eastern Front our history remembers as the war’s turning point did not exist by this date.', when: always },
    ],
  },
  {
    turn: t(1943, 7), // 66
    text: 'Allied troops landed in Sicily, and Mussolini\'s government began to come apart.',
    matches: or(
      controls('UK', 'ita-sicily'),
      controls('USA', 'ita-sicily'),
      not(alive('ITA')),
    ),
    otherwise: [
      { text: 'Italy still stood untouched by Allied landings — Sicily remained Italian soil.', when: always },
    ],
  },
  {
    turn: t(1944, 6), // 77
    text: 'Allied armies stormed the Normandy beaches and opened the second front in the West.',
    matches: or(
      controls('UK', 'fra-north'),
      controls('USA', 'fra-north'),
      controls('FRA', 'fra-north'),
    ),
    otherwise: [
      { text: 'France was not under German occupation to be liberated, so no Channel crossing in the style of our D-Day was ever needed.', when: not(controls('GER', 'fra-north')) },
      { text: 'the Western Allies had not yet returned to the continent — the second front our history opened in Normandy still lay in the future, if it was coming at all.', when: always },
    ],
  },
  {
    turn: t(1944, 8), // 79
    text: 'Paris was liberated, and de Gaulle walked down the Champs-Élysées.',
    matches: not(controls('GER', 'fra-paris')),
    otherwise: [
      { text: 'Paris remained under the occupation, the liberation our history dates to this August still unrealized.', when: always },
    ],
  },
  {
    turn: t(1945, 5), // 88
    text: 'Berlin fell to the Red Army and Germany surrendered unconditionally. The war in Europe was over.',
    matches: or(not(controls('GER', 'ger-berlin')), not(alive('GER'))),
    otherwise: [
      { text: 'Berlin still stood as the seat of a German government that had not yet been broken — the war in Europe our history closed by this spring was still open here.', when: always },
    ],
  },
  {
    turn: t(1945, 8), // 91
    text: 'a single bomb erased Hiroshima, and the atomic age opened in fire.',
    matches: and(flag('ATOMIC_USA'), atWar('USA', 'JAP')),
    otherwise: [
      { text: 'a different power had reached the bomb first, and the atomic age opened somewhere other than over Hiroshima.', when: flag('ATOMIC_USED') },
      { text: 'no atomic weapon had been used by this point — the reckoning our history dates to this August had not yet arrived, or never would.', when: always },
    ],
  },
  {
    turn: t(1945, 9), // 92
    text: 'Japan surrendered aboard the Missouri in Tokyo Bay. The Second World War was over.',
    matches: or(not(atWar('JAP')), not(alive('JAP'))),
    otherwise: [
      { text: 'Japan was still at war and unbeaten — the surrender our history signed this September never came, not on this date.', when: always },
    ],
  },
];
