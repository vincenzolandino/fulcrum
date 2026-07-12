// Italy event pack: the Kingdom's road into, through, and out of the Axis
// war, 1938-1948. Pure data against the Condition/Effect DSL in
// engine/types.ts. Cross-pack flags come from the registry; flags prefixed
// ITA_ below are internal to this pack (other packs may read them).

import type { GameEvent } from '../../engine/types';
import { FLAGS, capitulatedFlag, leaderDeadFlag } from './registry';

// Pack-internal flags (set here; readable by anyone).
const ITA_SPAIN_COMMITMENT = 'ITA_SPAIN_COMMITMENT';
const ITA_NON_BELLIGERENT = 'ITA_NON_BELLIGERENT';
const ITA_DISTANCING = 'ITA_DISTANCING';
const ITA_AWAITS_AXIS_ARMOR = 'ITA_AWAITS_AXIS_ARMOR';
const ITA_GREECE_POSTPONED = 'ITA_GREECE_POSTPONED';
const ITA_DUCE_CLINGS = 'ITA_DUCE_CLINGS';
const ITA_CO_BELLIGERENT = 'ITA_CO_BELLIGERENT';
const ITA_FIGHTS_ON = 'ITA_FIGHTS_ON';
const ITA_SURRENDERED = 'ITA_SURRENDERED';
const ITA_PEACE_FEELER = 'ITA_PEACE_FEELER';
const ITA_CIANO_WESTWARD = 'ITA_CIANO_WESTWARD';

export const ITALY_EVENTS: GameEvent[] = [
  // -------------------------------------------------------------------------
  // Albania: the protectorate becomes a possession.
  // -------------------------------------------------------------------------
  {
    id: 'ita-albania',
    title: 'The Adriatic Question',
    nation: 'ITA',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'ALB' },
        { t: 'leaderIs', nation: 'ITA', leader: 'mussolini' },
        {
          t: 'or',
          c: [
            { t: 'flag', key: FLAGS.MUNICH_CONCEDED },
            { t: 'flag', key: FLAGS.MUNICH_WAR },
            { t: 'tension', atLeast: 25 },
          ],
        },
        { t: 'turnAtLeast', n: 12 },
      ],
    },
    once: true,
    priority: 5,
    text:
      'Memorandum of the Foreign Ministry, Palazzo Chigi, submitted for the Duce\'s decision. King ' +
      'Zog\'s treasury lives on Italian loans; his gendarmerie drills under Italian officers; the ' +
      'harbor works at Durazzo are ours in everything but flag. Count Ciano submits that the ' +
      'protectorate is ripe to become a possession: landings at the four ports, a motorized column ' +
      'to Tirana, the crown offered to the House of Savoy within the week. The general staff expects ' +
      'no organized resistance beyond a morning. What Belgrade and Athens will conclude about our ' +
      'further intentions is a separate ledger.',
    choices: [
      {
        label: 'Land at the four ports',
        detail: 'Durazzo, Valona, San Giovanni, Santi Quaranta. The kingdom joins the Empire.',
        aiWeight: 4,
        effects: [
          { t: 'annex', nation: 'ALB', by: 'ITA' },
          { t: 'relations', a: 'ITA', b: 'YUG', delta: -10 },
          { t: 'relations', a: 'ITA', b: 'GRE', delta: -15 },
          {
            t: 'chronicle',
            text: 'Italian troops crossed the Adriatic and the crown of Albania passed to the House of Savoy.',
          },
          {
            t: 'report',
            to: 'GRE',
            kind: 'diplomatic',
            title: 'Italian Landings in Albania',
            body: 'Italian forces have occupied the Albanian ports and the capital. The Epirus frontier is now an Italian frontier.',
          },
          {
            t: 'report',
            to: 'YUG',
            kind: 'diplomatic',
            title: 'Italy Annexes Albania',
            body: 'The Albanian kingdom has been extinguished by Italian arms. Italian garrisons now stand along the southern frontier.',
          },
        ],
      },
      {
        label: 'The client costs less than the colony',
        detail: 'Keep Zog on his throne and in our debt. The loans buy what a landing would.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'ITA', b: 'ALB', delta: 10 },
          { t: 'stability', nation: 'ITA', delta: 1 },
          {
            t: 'chronicle',
            text: 'Rome kept Albania a client rather than a province. The Adriatic landings of April 1939 never came.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Spain: the legionaries and the bill.
  // -------------------------------------------------------------------------
  {
    id: 'ita-spanish-legions',
    title: 'The Legions in Spain',
    nation: 'ITA',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'ITA', leader: 'mussolini' },
        { t: 'alive', nation: 'ESP' },
        { t: 'not', c: { t: 'atWar', a: 'ITA' } },
        { t: 'turnAtLeast', n: 4 },
      ],
    },
    once: true,
    priority: 3,
    text:
      'Accounting of the War Ministry on the Spanish commitment, forwarded to Palazzo Venezia. The ' +
      'volunteer corps stands at some forty thousand men with air squadrons in proportion; the ' +
      'campaign has consumed fuel, foreign exchange, and shipping that the services had counted on ' +
      'for their own programs. General Franco\'s victory approaches but does not arrive. To withdraw ' +
      'now recovers men and money and forfeits the political harvest; to remain purchases Spanish ' +
      'gratitude at prices the Treasury itemizes each quarter. The Ministry requests a directive ' +
      'that will hold until the war there ends.',
    choices: [
      {
        label: 'See the crusade through',
        detail: 'The corps stays until Madrid falls. Gratitude is collected at the peace.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: ITA_SPAIN_COMMITMENT, value: true },
          { t: 'relations', a: 'ITA', b: 'ESP', delta: 15 },
          { t: 'manpower', nation: 'ITA', delta: -40 },
          { t: 'stability', nation: 'ITA', delta: -2 },
        ],
      },
      {
        label: 'Bring the legions home',
        detail: 'The army trains on what Spain taught it. Franco finishes his own war.',
        aiWeight: 2,
        effects: [
          { t: 'relations', a: 'ITA', b: 'ESP', delta: -15 },
          { t: 'armyStrength', nation: 'ITA', delta: 4 },
          {
            t: 'chronicle',
            text: 'Rome recalled its volunteers from Spain before the war there was won. Madrid took note, and remembered.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Non-belligerence versus early entry: the September choice.
  // -------------------------------------------------------------------------
  {
    id: 'ita-non-belligerence',
    title: 'The Alliance Presents Its Bill',
    nation: 'ITA',
    fires: {
      t: 'and',
      c: [
        { t: 'faction', nation: 'ITA', is: 'axis' },
        { t: 'not', c: { t: 'atWar', a: 'ITA' } },
        {
          t: 'or',
          c: [
            { t: 'atWar', a: 'GER', b: 'POL' },
            { t: 'atWar', a: 'GER', b: 'FRA' },
            { t: 'atWar', a: 'GER', b: 'UK' },
          ],
        },
      ],
    },
    once: true,
    priority: 8,
    text:
      'Minute of the Supreme General Staff for the Council of Ministers. Germany is at war and ' +
      'invokes the spirit of the alliance. The Staff\'s readiness memorandum is unchanged from the ' +
      'spring: ammunition for sixty days, artillery of the last war, a fleet without radar or ' +
      'carriers, and no year before 1943 in which these deficits close. Berlin has been given the ' +
      'list of raw materials the Kingdom would require in order to march; it runs to seventeen ' +
      'million tons and was composed to be refused. The Council may proclaim non-belligerence, ' +
      'march regardless, or begin the quiet walk away from the alliance.',
    choices: [
      {
        label: 'Declare non-belligerence',
        detail: 'Not neutrality, not war. The alliance waits upon events, and upon the depots.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: ITA_NON_BELLIGERENT, value: true },
          { t: 'stability', nation: 'ITA', delta: 3 },
          { t: 'relations', a: 'ITA', b: 'GER', delta: -8 },
          { t: 'relations', a: 'ITA', b: 'UK', delta: 5 },
          { t: 'relations', a: 'ITA', b: 'FRA', delta: 5 },
          {
            t: 'chronicle',
            text: 'Italy proclaimed itself non-belligerent. The Pact of Steel would wait upon events.',
          },
          {
            t: 'report',
            to: 'GER',
            kind: 'diplomatic',
            title: 'Rome Will Not March',
            body: 'The Italian government has declared non-belligerence, citing material deficiencies. The alliance holds on paper; the frontier stays quiet.',
          },
        ],
      },
      {
        label: 'March with Germany now',
        detail: 'The war will be short and the table set once. Sixty days of stocks must serve.',
        available: {
          t: 'and',
          c: [
            { t: 'atWar', a: 'GER', b: 'FRA' },
            { t: 'atWar', a: 'GER', b: 'UK' },
          ],
        },
        aiWeight: 1,
        effects: [
          { t: 'declareWar', attacker: 'ITA', defender: 'FRA' },
          { t: 'declareWar', attacker: 'ITA', defender: 'UK' },
          { t: 'warSupport', nation: 'ITA', delta: 5 },
          {
            t: 'chronicle',
            text: 'Italy went to war in the first autumn, a year before its stocks, its fleet, or its army were ready.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'FRA',
            kind: 'front',
            title: 'Italy Enters the War',
            body: 'Italy has declared war in concert with Germany. The Alpine frontier and the Mediterranean lanes are active fronts as of this morning.',
          },
        ],
      },
      {
        label: 'Loosen the German tie',
        detail: 'The alliance was signed for a war in 1943. This is not that war.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: ITA_DISTANCING, value: true },
          { t: 'relations', a: 'ITA', b: 'GER', delta: -25 },
          { t: 'relations', a: 'ITA', b: 'UK', delta: 12 },
          { t: 'relations', a: 'ITA', b: 'FRA', delta: 12 },
          {
            t: 'chronicle',
            text: 'Rome edged away from Berlin at the first shot, and the Axis began to look like a line on old paper.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The hour of decision: entry as France falls.
  // -------------------------------------------------------------------------
  {
    id: 'ita-hour-of-decision',
    title: 'The Hour of Decision',
    nation: 'ITA',
    fires: {
      t: 'and',
      c: [
        { t: 'faction', nation: 'ITA', is: 'axis' },
        { t: 'atWar', a: 'GER', b: 'FRA' },
        {
          t: 'or',
          c: [
            { t: 'controls', nation: 'GER', region: 'fra-paris' },
            { t: 'controls', nation: 'GER', region: 'fra-north' },
          ],
        },
        { t: 'not', c: { t: 'atWar', a: 'ITA', b: 'FRA' } },
        { t: 'not', c: { t: 'atWar', a: 'ITA', b: 'UK' } },
      ],
    },
    once: true,
    priority: 8,
    text:
      'From the Duce\'s office to the Chief of the Supreme General Staff. The German columns are ' +
      'across the Somme; Paris is uncovered; the French government has begun burning files. The ' +
      'question of intervention, deferred since September, will not wait upon the fleet program or ' +
      'the Libyan depots. To enter now is to sit at the table when France is divided; to wait is to ' +
      'watch a German peace made over our heads. The Marshal is reminded that the Army holds stocks ' +
      'for sixty days of operations. The declaration wants nothing but a date.',
    choices: [
      {
        label: 'Declare war on France and Britain',
        detail: 'A few thousand dead buys a seat at the table. The parallel war begins.',
        aiWeight: 5,
        effects: [
          { t: 'declareWar', attacker: 'ITA', defender: 'FRA' },
          { t: 'declareWar', attacker: 'ITA', defender: 'UK' },
          { t: 'warSupport', nation: 'ITA', delta: 8 },
          {
            t: 'chronicle',
            text: 'Italy declared war on a falling France and on Britain, and the Mediterranean became a theater of war.',
          },
          {
            t: 'report',
            to: 'FRA',
            kind: 'front',
            title: 'Italy Declares War',
            body: 'Italy has entered the war against France and Britain. Italian formations are reported moving to the Alpine passes.',
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'diplomatic',
            title: 'Rome Joins the War',
            body: 'The Italian declaration closes the middle sea. Malta, Egypt, and the convoy routes to Suez are now contested.',
          },
        ],
      },
      {
        label: 'Against France alone',
        detail: 'Take the Alpine account and leave London out of it, if London permits.',
        aiWeight: 1,
        effects: [
          { t: 'declareWar', attacker: 'ITA', defender: 'FRA' },
          { t: 'warSupport', nation: 'ITA', delta: 4 },
          {
            t: 'chronicle',
            text: 'Rome struck at France but not at Britain, wagering that London would let the account stand.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'FRA',
            kind: 'front',
            title: 'Italian Attack in the Alps',
            body: 'Italy has declared war on France alone. Fighting has opened on the Alpine frontier.',
          },
        ],
      },
      {
        label: 'Keep out of it',
        detail: 'Let Germany win a German peace. Italy\'s war can wait for Italy\'s readiness.',
        aiWeight: 1,
        effects: [
          { t: 'stability', nation: 'ITA', delta: 3 },
          { t: 'relations', a: 'ITA', b: 'UK', delta: 8 },
          { t: 'relations', a: 'ITA', b: 'USA', delta: 5 },
          { t: 'relations', a: 'ITA', b: 'GER', delta: -10 },
          {
            t: 'chronicle',
            text: 'Italy watched France fall and kept its peace. The parallel war was never fought.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // North Africa: the road to Suez.
  // -------------------------------------------------------------------------
  {
    id: 'ita-north-africa',
    title: 'The Road to Suez',
    nation: 'ITA',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'ITA', b: 'UK' },
        { t: 'controls', nation: 'ITA', region: 'ita-libya' },
        { t: 'alive', nation: 'EGY' },
        { t: 'not', c: { t: 'atWar', a: 'ITA', b: 'EGY' } },
      ],
    },
    once: true,
    priority: 7,
    text:
      'Appreciation of Marshal Graziani\'s headquarters, Cyrenaica, transmitted to Rome. The British ' +
      'garrison in Egypt is counted at two divisions and improvisation; the Canal is the artery of ' +
      'their empire and lies four hundred miles beyond the wire. Against this the Tenth Army lists ' +
      'its wants: water columns, motor transport, medium tanks that do not exist in Africa. Rome ' +
      'answers that numbers are their own transport. The Marshal is instructed that inaction is the ' +
      'one report the capital will not accept, and asks in reply for the order in writing.',
    choices: [
      {
        label: 'Advance into Egypt',
        detail: 'Cross the wire and take the coast road. The Canal is the object of the war.',
        aiWeight: 4,
        effects: [
          { t: 'declareWar', attacker: 'ITA', defender: 'EGY' },
          { t: 'newArmy', nation: 'ITA', name: 'Tenth Army', location: 'ita-libya', strength: 70, equipment: 50 },
          { t: 'warSupport', nation: 'ITA', delta: 3 },
          {
            t: 'chronicle',
            text: 'The Tenth Army crossed the wire into Egypt and dug in along the coast road, waiting for its trucks.',
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'front',
            title: 'Italian Advance into Egypt',
            body: 'Italian columns have crossed the Libyan frontier toward Sidi Barrani. The approaches to Alexandria and the Canal are threatened.',
          },
          {
            t: 'report',
            to: 'EGY',
            kind: 'front',
            title: 'Invasion from the Western Desert',
            body: 'Italian forces have entered Egyptian territory along the coast road. The Kingdom finds itself a battlefield of other empires.',
          },
        ],
      },
      {
        label: 'Ask Berlin for armor first',
        detail: 'No advance without tanks and transport. Let the Germans pay the alliance\'s freight.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: ITA_AWAITS_AXIS_ARMOR, value: true },
          { t: 'relations', a: 'ITA', b: 'GER', delta: 8 },
          { t: 'armyStrength', nation: 'ITA', delta: 3 },
          {
            t: 'report',
            to: 'GER',
            kind: 'diplomatic',
            title: 'Rome Requests a Mechanized Corps',
            body: 'The Italian command asks for German armor and transport for the Egyptian front before any advance beyond the wire.',
          },
        ],
      },
      {
        label: 'Stand on the defensive in Libya',
        detail: 'Hold the colony, spend nothing. The desert defends whoever refuses to cross it.',
        aiWeight: 1,
        effects: [
          { t: 'stability', nation: 'ITA', delta: 2 },
          {
            t: 'chronicle',
            text: 'Italy never marched on the Canal. The desert war of the history books did not open.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The Greek adventure.
  // -------------------------------------------------------------------------
  {
    id: 'ita-greece',
    title: 'The Greek Adventure',
    nation: 'ITA',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'ITA' },
        { t: 'controls', nation: 'ITA', region: 'alb-albania' },
        { t: 'alive', nation: 'GRE' },
        { t: 'faction', nation: 'GRE', is: 'neutral' },
        { t: 'not', c: { t: 'atWar', a: 'ITA', b: 'GRE' } },
      ],
    },
    once: true,
    priority: 6,
    text:
      'Record of the conference at Palazzo Venezia; present the Duce, Count Ciano, the service ' +
      'chiefs. The German entry into Romania was learned in Rome from the newspapers; it is proposed ' +
      'to answer accomplished fact with accomplished fact. From Albania, eight divisions would cross ' +
      'into Epirus and reach Athens before winter closes the passes. Marshal Badoglio asks for ' +
      'twenty divisions and three months of preparation; Count Ciano promises that the Greek front ' +
      'collapses in a fortnight and that London can do nothing in time. The rains have already begun ' +
      'in the Pindus.',
    choices: [
      {
        label: 'March on Athens',
        detail: 'Eight divisions, now, in the rain. The fact is announced when it is accomplished.',
        aiWeight: 4,
        effects: [
          { t: 'declareWar', attacker: 'ITA', defender: 'GRE' },
          { t: 'warSupport', nation: 'ITA', delta: 2 },
          {
            t: 'chronicle',
            text: 'Italian divisions crossed the Epirus frontier in the autumn rain.',
          },
          {
            t: 'report',
            to: 'GRE',
            kind: 'front',
            title: 'Italian Attack from Albania',
            body: 'Italian forces have crossed the frontier into Epirus following a rejected ultimatum. The army is mobilizing to meet them in the mountains.',
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'diplomatic',
            title: 'Greece Attacked',
            body: 'Italy has invaded Greece from Albania. Athens has appealed for assistance under the guarantee of its independence.',
          },
        ],
      },
      {
        label: 'Wait for spring and full depots',
        detail: 'Badoglio\'s twenty divisions or nothing. The plan returns with the good weather.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: ITA_GREECE_POSTPONED, value: true },
          { t: 'armyStrength', nation: 'ITA', delta: 5 },
          { t: 'queueEvent', id: 'ita-greece-spring', delay: 5 },
        ],
      },
      {
        label: 'Abandon the design',
        detail: 'Greece is a mountain range pretending to be a country. There is no prize in it.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'ITA', b: 'GRE', delta: 15 },
          {
            t: 'chronicle',
            text: 'The Greek adventure was struck from the agenda. The Pindus front never opened.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // The postponed Greek plan returns.
  {
    id: 'ita-greece-spring',
    title: 'Spring and the Epirus File',
    nation: 'ITA',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: ITA_GREECE_POSTPONED },
        { t: 'alive', nation: 'GRE' },
        { t: 'faction', nation: 'GRE', is: 'neutral' },
        { t: 'not', c: { t: 'atWar', a: 'ITA', b: 'GRE' } },
        { t: 'atWar', a: 'ITA' },
      ],
    },
    once: true,
    priority: 5,
    text:
      'Second appreciation on the Greek question, prepared as directed. The depots are fuller and ' +
      'the divisions in Albania have wintered under training. The same months have served Athens: ' +
      'the Greek army has mobilized by classes, British officers have surveyed the ports, and the ' +
      'Epirus frontier is now entrenched. The plan remains executable; its price has been repriced. ' +
      'The Staff submits the file without recommendation and notes only that surprise, once spent, ' +
      'is not restored.',
    choices: [
      {
        label: 'Execute the plan',
        detail: 'A readier army against a readier defender. The passes decide it.',
        available: {
          t: 'and',
          c: [
            { t: 'alive', nation: 'GRE' },
            { t: 'controls', nation: 'ITA', region: 'alb-albania' },
            { t: 'not', c: { t: 'atWar', a: 'ITA', b: 'GRE' } },
          ],
        },
        aiWeight: 3,
        effects: [
          { t: 'declareWar', attacker: 'ITA', defender: 'GRE' },
          {
            t: 'chronicle',
            text: 'The Italian attack on Greece came in the spring, with a readier army, against a defender who had used the winter too.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'GRE',
            kind: 'front',
            title: 'Italian Offensive in Epirus',
            body: 'The long-expected Italian attack has opened from Albania. The frontier divisions are engaged in the mountain passes.',
          },
        ],
      },
      {
        label: 'File it for good',
        detail: 'The moment passed with the autumn. The divisions are needed elsewhere.',
        aiWeight: 2,
        effects: [
          { t: 'relations', a: 'ITA', b: 'GRE', delta: 10 },
          {
            t: 'chronicle',
            text: 'The Greek plan went back into the drawer and stayed there.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Yugoslavia: joining the carve-up.
  // -------------------------------------------------------------------------
  {
    id: 'ita-yugoslav-hour',
    title: 'The Partition of Yugoslavia',
    nation: 'ITA',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'GER', b: 'YUG' },
        { t: 'faction', nation: 'ITA', is: 'axis' },
        { t: 'alive', nation: 'YUG' },
        { t: 'not', c: { t: 'atWar', a: 'ITA', b: 'YUG' } },
      ],
    },
    once: true,
    priority: 5,
    text:
      'Telegram from the Royal Embassy, Berlin, most immediate. German operations against Yugoslavia ' +
      'have opened and the campaign is expected to be short. The partition of the carcass is being ' +
      'drafted while the guns are still firing: Croatia to be detached, the frontiers redrawn, the ' +
      'Adriatic littoral assigned to whoever stands upon it when the shooting stops. The Embassy ' +
      'observes that claims presented after an armistice weigh less than divisions present before ' +
      'one, and requests instructions.',
    choices: [
      {
        label: 'Claim the Adriatic shore',
        detail: 'The Second Army crosses at once. Dalmatia is occupied, not requested.',
        aiWeight: 4,
        effects: [
          { t: 'declareWar', attacker: 'ITA', defender: 'YUG' },
          { t: 'addClaim', nation: 'ITA', region: 'yug-belgrade' },
          {
            t: 'chronicle',
            text: 'Italy joined the dismemberment of Yugoslavia for the sake of the Dalmatian coast.',
          },
          {
            t: 'report',
            to: 'YUG',
            kind: 'front',
            title: 'Italian Attack in the West',
            body: 'Italian forces have crossed the Julian frontier and are moving on the coast while German columns advance from the north.',
          },
        ],
      },
      {
        label: 'Let Germany carry it alone',
        detail: 'No Italian dead for a Balkan frontier Berlin will draw anyway.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'ITA', b: 'GER', delta: -10 },
          {
            t: 'chronicle',
            text: 'Rome stood aside from the Yugoslav partition, and the Adriatic prize passed it by.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The King deposes Mussolini: the switch-sides hinge.
  // -------------------------------------------------------------------------
  {
    id: 'ita-king-deposes',
    title: 'The Quirinal at Half Past Five',
    nation: 'ITA',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'ITA', leader: 'mussolini' },
        { t: 'atWar', a: 'ITA' },
        {
          t: 'or',
          c: [
            { t: 'not', c: { t: 'controls', nation: 'ITA', region: 'ita-sicily' } },
            {
              t: 'and',
              c: [
                { t: 'warSupport', nation: 'ITA', below: 25 },
                { t: 'stability', nation: 'ITA', below: 45 },
              ],
            },
          ],
        },
      ],
    },
    once: true,
    priority: 9,
    text:
      'Minute prepared for His Majesty, not circulated. The war stands on Italian soil and the ' +
      'capital knows it; the ministries answer the telephone with yesterday\'s assurances. The Grand ' +
      'Council of Fascism has carried, nineteen votes to eight, a motion restoring command of the ' +
      'armed forces to the Crown. The Duce is summoned to the Quirinal at seventeen thirty; a ' +
      'carabinieri detachment and an ambulance wait in the courtyard. Whether the monarchy still ' +
      'commands the instruments of the state, and whether the regime will fight for its founder, ' +
      'will be established within the hour.',
    choices: [
      {
        label: 'The King acts',
        detail: 'Arrest at the door of the audience room. Marshal Badoglio forms a government.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: FLAGS.KING_DEPOSES_MUSSOLINI, value: true },
          { t: 'setLeader', nation: 'ITA', leader: 'badoglio' },
          { t: 'setAI', nation: 'ITA', patch: { aggression: 0.2, ideologyZeal: 0.1, focus: 'defense' } },
          { t: 'stability', nation: 'ITA', delta: 4 },
          { t: 'warSupport', nation: 'ITA', delta: -4 },
          { t: 'queueEvent', id: 'ita-armistice', delay: 1 },
          {
            t: 'chronicle',
            text: 'The King dismissed Mussolini and Marshal Badoglio formed a government. Twenty years of the regime ended in an afternoon.',
          },
          {
            t: 'report',
            to: 'GER',
            kind: 'intel',
            title: 'Upheaval in Rome',
            body: 'Mussolini has been removed and arrested on the King\'s order. The Badoglio government declares the war continues. It is not believed.',
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'diplomatic',
            title: 'The Duce Falls',
            body: 'The Italian head of government has been deposed by the Crown. Soundings toward an armistice are expected through Lisbon or Madrid.',
          },
        ],
      },
      {
        label: 'The Duce breaks the Council',
        detail: 'The militia holds the ministries. The vote is treated as treason, not verdict.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: ITA_DUCE_CLINGS, value: true },
          { t: 'stability', nation: 'ITA', delta: -10 },
          { t: 'warSupport', nation: 'ITA', delta: -3 },
          {
            t: 'chronicle',
            text: 'The Grand Council\'s revolt was broken and Mussolini kept his war. The monarchy had tested its strength and found it wanting.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The armistice: Italy changes sides, slips out, or fights on.
  // -------------------------------------------------------------------------
  {
    id: 'ita-armistice',
    title: 'The Armistice of Cassibile',
    nation: 'ITA',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.KING_DEPOSES_MUSSOLINI },
        { t: 'leaderIs', nation: 'ITA', leader: 'badoglio' },
        { t: 'atWar', a: 'ITA' },
      ],
    },
    once: true,
    priority: 9,
    text:
      'Most secret. General Castellano reports from Lisbon: the Allied terms are short, hard, and ' +
      'not open to amendment; military surrender now, the political account settled later. Meanwhile ' +
      'German divisions cross the Brenner daily, styled as reinforcements and deployed like an ' +
      'occupation, and the garrison of Rome is watched by the guests it hosts. The government can ' +
      'sign and turn its arms; it can sign and scatter; or it can refuse and fight on beside an ally ' +
      'that already treats the Kingdom as ground to be held. Every road out is now guarded. The King ' +
      'asks which one the government proposes to take.',
    choices: [
      {
        label: 'Sign, and change sides',
        detail: 'Armistice with the Allies, co-belligerence to follow. The Germans will answer in hours.',
        available: {
          t: 'and',
          c: [
            { t: 'alive', nation: 'GER' },
            { t: 'atWar', a: 'ITA' },
          ],
        },
        aiWeight: 3,
        effects: [
          { t: 'breakPact', a: 'ITA', b: 'GER' },
          { t: 'peace', a: 'ITA', b: 'UK' },
          { t: 'peace', a: 'ITA', b: 'USA' },
          { t: 'peace', a: 'ITA', b: 'FRA' },
          { t: 'peace', a: 'ITA', b: 'SOV' },
          { t: 'joinFaction', nation: 'ITA', faction: 'allies' },
          { t: 'flag', key: ITA_CO_BELLIGERENT, value: true },
          { t: 'declareWar', attacker: 'GER', defender: 'ITA' },
          {
            t: 'chronicle',
            text: 'Italy announced its armistice and the German army seized the peninsula from the Alps southward. Italians now fought on both sides of the line.',
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'diplomatic',
            title: 'Italy Comes Over',
            body: 'The Italian armistice is signed and announced. The Badoglio government offers its remaining forces as co-belligerents against Germany.',
          },
          {
            t: 'report',
            to: 'GER',
            kind: 'front',
            title: 'Italian Defection',
            body: 'Rome has capitulated to the Allies. Contingency orders for the disarmament of Italian formations and the occupation of the peninsula are in execution.',
          },
        ],
      },
      {
        label: 'Slip out of the war',
        detail: 'Peace without a new master. Neutrality, if any belligerent will honor it.',
        available: { t: 'atWar', a: 'ITA' },
        aiWeight: 2,
        effects: [
          { t: 'peace', a: 'ITA', b: 'UK' },
          { t: 'peace', a: 'ITA', b: 'USA' },
          { t: 'peace', a: 'ITA', b: 'FRA' },
          { t: 'peace', a: 'ITA', b: 'SOV' },
          { t: 'joinFaction', nation: 'ITA', faction: 'neutral' },
          { t: 'relations', a: 'ITA', b: 'GER', delta: -40 },
          { t: 'stability', nation: 'ITA', delta: 5 },
          {
            t: 'chronicle',
            text: 'Italy left the war as a neutral, neither occupied nor co-belligerent; a narrow exit that history did not offer.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Hold to the alliance',
        detail: 'The Marshal fights the war he inherited. Terms can wait for a better front.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: ITA_FIGHTS_ON, value: true },
          { t: 'stability', nation: 'ITA', delta: -8 },
          {
            t: 'chronicle',
            text: 'Badoglio, against every expectation in every capital, kept Italy in the Axis war.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Succession events, keyed to the leaders.ts succession table. The Badoglio
  // event is guarded against the King-deposes path, which tells that story
  // itself through ita-king-deposes and ita-armistice.
  // -------------------------------------------------------------------------
  {
    id: 'ita-succession-badoglio',
    title: 'The Marshal Takes the Government',
    nation: 'ITA',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'ITA', leader: 'badoglio' },
        { t: 'not', c: { t: 'flag', key: FLAGS.KING_DEPOSES_MUSSOLINI } },
      ],
    },
    once: true,
    priority: 8,
    text:
      'Rome radio interrupts its schedule at dawn. The head of the government is dead; His Majesty ' +
      'has charged Marshal Badoglio with the formation of a ministry of soldiers and functionaries. ' +
      'The Party militia is confined to barracks and the prefects are instructed that public order ' +
      'is now an army matter. Foreign observers note what the proclamation does not say: no word of ' +
      'the alliance, no word of the war, and the old Marshal has never believed in either.',
    choices: [
      {
        label: 'Order above all',
        detail: 'The state is steadied before any question of policy is opened.',
        aiWeight: 3,
        effects: [
          { t: 'stability', nation: 'ITA', delta: 5 },
        ],
      },
      {
        label: 'Sound out the West',
        detail: 'Quiet inquiries through Lisbon. Nothing signed, nothing yet deniable enough to matter.',
        available: { t: 'atWar', a: 'ITA' },
        aiWeight: 2,
        effects: [
          { t: 'flag', key: ITA_PEACE_FEELER, value: true },
          { t: 'relations', a: 'ITA', b: 'UK', delta: 15 },
          { t: 'relations', a: 'ITA', b: 'USA', delta: 10 },
          {
            t: 'report',
            to: 'UK',
            kind: 'diplomatic',
            title: 'A Feeler from Rome',
            body: 'Intermediaries in Lisbon carry word that the new Italian government would discuss its exit from the war. The approach is unsigned.',
          },
        ],
      },
    ],
  },
  {
    id: 'ita-succession-ciano',
    title: 'The Son-in-Law Succeeds',
    nation: 'ITA',
    fires: { t: 'leaderIs', nation: 'ITA', leader: 'ciano' },
    once: true,
    priority: 8,
    text:
      'The Grand Council, meeting through the night, confirms Count Ciano in the succession. The ' +
      'son-in-law inherits the movement, the ministries, and a war ledger he has annotated for years ' +
      'in a diary he believes secret. Berlin sends correct condolences and reads the appointment ' +
      'correctly: the new Duce admires German power and does not trust it. In London it is asked ' +
      'whether the change is a door, and how far it might be made to open.',
    choices: [
      {
        label: 'Continuity proclaimed',
        detail: 'The regime\'s course does not change with its portrait.',
        aiWeight: 2,
        effects: [
          { t: 'stability', nation: 'ITA', delta: 3 },
          { t: 'relations', a: 'ITA', b: 'GER', delta: 5 },
        ],
      },
      {
        label: 'The westward tilt',
        detail: 'Correct with Berlin, warm with London. Italy\'s options are quietly reopened.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: ITA_CIANO_WESTWARD, value: true },
          { t: 'relations', a: 'ITA', b: 'GER', delta: -15 },
          { t: 'relations', a: 'ITA', b: 'UK', delta: 12 },
          { t: 'relations', a: 'ITA', b: 'USA', delta: 8 },
          {
            t: 'chronicle',
            text: 'Under Ciano, Rome edged out of Berlin\'s shadow and back toward the Western courts it had never stopped courting.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The end. Fires on the engine's capitulation flag.
  // -------------------------------------------------------------------------
  {
    id: 'surrender-ITA',
    title: 'The Surrender of Italy',
    nation: 'ITA',
    fires: { t: 'flag', key: capitulatedFlag('ITA') },
    once: true,
    priority: 9,
    text:
      'The delegation is flown to a captured airfield and signs in a tent between two rows of parked ' +
      'fighters. The instrument provides for the cessation of hostilities, the surrender of the ' +
      'fleet at a port of the victors\' choosing, and the passage of the Kingdom\'s territory to ' +
      'military administration as the front moves across it. There is no ceremony and no photograph ' +
      'the censors will release. The war that was to remake the Mediterranean ends with the ' +
      'Mediterranean in other hands, and the question of what Italy now is passes to men who did ' +
      'not choose the war and cannot refuse the peace.',
    choices: [
      {
        label: 'Sign the instrument',
        detail: 'Hostilities cease on every front. The fleet sails into internment.',
        aiWeight: 5,
        effects: [
          { t: 'flag', key: ITA_SURRENDERED, value: true },
          { t: 'peace', a: 'ITA', b: 'UK' },
          { t: 'peace', a: 'ITA', b: 'USA' },
          { t: 'peace', a: 'ITA', b: 'FRA' },
          { t: 'peace', a: 'ITA', b: 'SOV' },
          { t: 'peace', a: 'ITA', b: 'GRE' },
          { t: 'peace', a: 'ITA', b: 'GER' },
          { t: 'disbandArmy', nation: 'ITA', count: 12 },
          { t: 'navy', nation: 'ITA', delta: -1000 },
          { t: 'air', nation: 'ITA', delta: -1000 },
          { t: 'tension', delta: -5 },
          {
            t: 'chronicle',
            text: 'Italy capitulated. The fleet steamed into internment under the guns of its former enemies, and the war moved on past Rome.',
          },
          {
            t: 'report',
            to: 'player',
            kind: 'front',
            title: 'Italy Capitulates',
            body: 'Italian forces have ceased operations on all fronts. The fleet is under escort to internment and the peninsula passes under occupation administration.',
          },
        ],
      },
      {
        label: 'The republic in the north',
        detail: 'A rescued Duce, a government at Salo, and a state that exists at German pleasure.',
        available: {
          t: 'and',
          c: [
            { t: 'alive', nation: 'GER' },
            { t: 'not', c: { t: 'flag', key: leaderDeadFlag('ITA') } },
          ],
        },
        aiWeight: 1,
        effects: [
          { t: 'puppet', nation: 'ITA', by: 'GER' },
          { t: 'setLeader', nation: 'ITA', leader: 'mussolini' },
          { t: 'stability', nation: 'ITA', delta: -15 },
          { t: 'warSupport', nation: 'ITA', delta: -10 },
          {
            t: 'chronicle',
            text: 'A republican government under German protection proclaimed itself in the north, and Italy\'s war became a civil war.',
          },
        ],
      },
    ],
  },
];
