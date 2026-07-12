// Japan event pack: the Empire's strategic decision points, 1938-1948.
// Pure data against the Condition/Effect DSL in engine/types.ts. Cross-pack
// flags come from the registry; flags prefixed JAP_ below are internal to
// this pack (other packs may read them but nothing depends on them yet).
//
// Sequencing notes: the China war exists from turn 0 (setup encodes it), so
// the China events anchor on atWar. The Pearl Harbor decision fires on the
// registry's EMBARGO_JAPAN flag, never on a date, and waits one evaluation
// pass for the cabinet crisis (jap-konoe-falls) to resolve first when Konoe
// still governs.

import type { GameEvent } from '../../engine/types';
import { FLAGS, capitulatedFlag } from './registry';

// Pack-internal flags (set here; readable by anyone).
const JAP_YANGTZE_OFFENSIVE = 'JAP_YANGTZE_OFFENSIVE';
const JAP_CHINA_SETTLEMENT = 'JAP_CHINA_SETTLEMENT';
const JAP_MOBILIZATION = 'JAP_MOBILIZATION';
const JAP_FLEET_PRIORITY = 'JAP_FLEET_PRIORITY';
const JAP_NORTH_CHECKED = 'JAP_NORTH_CHECKED';
const JAP_ARMY_REINED = 'JAP_ARMY_REINED';
const JAP_STRIKE_NORTH = 'JAP_STRIKE_NORTH';
const JAP_STRIKE_SOUTH = 'JAP_STRIKE_SOUTH';
const JAP_TONKIN_BASES = 'JAP_TONKIN_BASES';
const JAP_SPARES_USA = 'JAP_SPARES_USA';
const JAP_STANDS_DOWN = 'JAP_STANDS_DOWN';
const JAP_FLEET_SPENT = 'JAP_FLEET_SPENT';
const JAP_PERIMETER_DOCTRINE = 'JAP_PERIMETER_DOCTRINE';
const JAP_WESTERN_STRATEGY = 'JAP_WESTERN_STRATEGY';
const JAP_INNER_SPHERE = 'JAP_INNER_SPHERE';
const JAP_SOVIET_MEDIATION = 'JAP_SOVIET_MEDIATION';
const JAP_SEEKS_TERMS = 'JAP_SEEKS_TERMS';
const JAP_FIGHTS_ON = 'JAP_FIGHTS_ON';
const JAP_SURRENDERED = 'JAP_SURRENDERED';
const JAP_RESCRIPT_SUPPRESSED = 'JAP_RESCRIPT_SUPPRESSED';

export const JAPAN_EVENTS: GameEvent[] = [
  // -------------------------------------------------------------------------
  // China escalation: the founding continental choice.
  // -------------------------------------------------------------------------
  {
    id: 'jap-china-incident',
    title: 'The China Incident Widens',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'JAP', b: 'CHI' },
        { t: 'turnAtLeast', n: 1 },
      ],
    },
    once: true,
    priority: 6,
    text:
      'Liaison conference minutes, Imperial General Headquarters and the Cabinet. The China Incident ' +
      'has outgrown its name. Shanghai is taken at a cost of forty thousand casualties, yet the ' +
      'Nationalist government has withdrawn up the Yangtze and declines the decision the Army promised. ' +
      'General Staff Operations proposes a general offensive into the interior to break resistance ' +
      'within the year. The Navy Ministry objects that the divisions, fuel, and shipping so committed ' +
      'cannot be quickly recovered. Separately, Ambassador Trautmann of Germany conveys that Chungking ' +
      'may treat on terms recognizing the northern position. A prolonged continental war appeared in no ' +
      'prewar estimate. The conference must now set the scale of the commitment.',
    choices: [
      {
        label: 'General offensive up the Yangtze',
        detail: 'Break Chinese resistance in the interior. The Incident becomes the war.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: JAP_YANGTZE_OFFENSIVE, value: true },
          { t: 'newArmy', nation: 'JAP', name: 'Central China Expeditionary Army', location: 'man-manchuria', strength: 75, equipment: 60 },
          { t: 'manpower', nation: 'JAP', delta: -300 },
          { t: 'warSupport', nation: 'JAP', delta: 5 },
          { t: 'tension', delta: 2 },
          {
            t: 'chronicle',
            text: 'The armies drove up the Yangtze. What was done to the cities along the river, and at Nanking above all, entered the permanent record of the century.',
          },
        ],
      },
      {
        label: 'Limited operations',
        detail: 'Hold the coast and the north. Let blockade and time do the rest.',
        aiWeight: 1,
        effects: [
          { t: 'stability', nation: 'JAP', delta: 3 },
          { t: 'warSupport', nation: 'JAP', delta: -3 },
          {
            t: 'chronicle',
            text: 'Tokyo capped the China commitment at the coast, declining the drive inland that history records. The interior war became a siege instead of a pursuit.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Accept the Trautmann mediation',
        detail: 'A settlement through Berlin: the north conceded to Japan, the war concluded.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: JAP_CHINA_SETTLEMENT, value: true },
          { t: 'peace', a: 'JAP', b: 'CHI' },
          { t: 'peace', a: 'MAN', b: 'CHI' },
          { t: 'cedeRegion', region: 'chi-north', to: 'JAP' },
          { t: 'relations', a: 'JAP', b: 'CHI', delta: 20 },
          { t: 'relations', a: 'JAP', b: 'GER', delta: 5 },
          { t: 'warSupport', nation: 'JAP', delta: -8 },
          { t: 'stability', nation: 'JAP', delta: -4 },
          {
            t: 'chronicle',
            text: 'The Trautmann mediation succeeded where in our history it failed. Japan took the north by treaty and stopped, and the eight-year war in China did not happen here.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'CHI',
            kind: 'diplomatic',
            title: 'Settlement Through Berlin',
            body: 'The German ambassador has brokered terms: North China passes under Japanese administration and hostilities cease. Chungking retains the interior and the south.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The home front is conscripted.
  // -------------------------------------------------------------------------
  {
    id: 'jap-mobilization-law',
    title: 'The National Mobilization Law',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'JAP', b: 'CHI' },
        { t: 'eventFired', id: 'jap-china-incident' },
      ],
    },
    once: true,
    priority: 4,
    text:
      'Memorandum for the Diet steering committee. The government lays before the House the National ' +
      'Mobilization Law, granting the Cabinet authority to conscript labor, ration materials, direct ' +
      'industry, and control the press by ordinance, without further recourse to the Diet. The Army ' +
      'insists the China commitment cannot be sustained on a peacetime economy. The business ' +
      'federations warn of confiscation by another name; the parties see their last prerogatives ' +
      'passing to the ministries. The vote will carry if the government wants it carried. The question ' +
      'before the government is whether it should.',
    choices: [
      {
        label: 'Enact the law',
        detail: 'The economy passes to the ministries. The Diet becomes an audience.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: JAP_MOBILIZATION, value: true },
          { t: 'ic', nation: 'JAP', delta: 6 },
          { t: 'stability', nation: 'JAP', delta: -3 },
        ],
      },
      {
        label: 'Shelve the bill',
        detail: 'Fight the war on the peacetime economy and keep the Diet whole.',
        aiWeight: 1,
        effects: [
          { t: 'stability', nation: 'JAP', delta: 2 },
          {
            t: 'chronicle',
            text: 'The mobilization law died in committee. Japan fought on a peacetime economy, and the ministries never acquired the wartime powers they historically held.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Interservice steel: the Army's war or the Navy's insurance.
  // -------------------------------------------------------------------------
  {
    id: 'jap-steel-allocation',
    title: 'Steel for the Army or the Fleet',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'JAP' },
        { t: 'eventFired', id: 'jap-mobilization-law' },
        { t: 'turnAtLeast', n: 8 },
      ],
    },
    once: true,
    priority: 3,
    text:
      'Minutes, Cabinet Planning Board, steel allocation conference. Imports of scrap and ore no ' +
      'longer cover the combined programs of the services. The Army demands priority for new divisions ' +
      'and arsenals to finish the continental commitment. The Navy Staff answers that the fleet is the ' +
      'only guarantee against the powers whose embargoes the Army\'s war invites, and asks for the ' +
      'replenishment program in full. The Board can satisfy one service completely, or neither. The ' +
      'figures admit no third arithmetic, though a division of the shortage will doubtless be proposed.',
    choices: [
      {
        label: 'The fleet program in full',
        detail: 'Carriers and heavy hulls against the powers. The Army waits.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: JAP_FLEET_PRIORITY, value: true },
          { t: 'navy', nation: 'JAP', delta: 60 },
        ],
      },
      {
        label: 'The Army\'s divisions first',
        detail: 'Finish the war on the continent before inviting one at sea.',
        aiWeight: 2,
        effects: [
          { t: 'newArmy', nation: 'JAP', name: 'Sixth Area Army', location: 'jap-home', strength: 70, equipment: 60 },
          { t: 'manpower', nation: 'JAP', delta: -200 },
        ],
      },
      {
        label: 'Divide the shortage',
        detail: 'Both services get half of what they asked and all of the grievance.',
        aiWeight: 2,
        effects: [
          { t: 'navy', nation: 'JAP', delta: 25 },
          { t: 'armyStrength', nation: 'JAP', delta: 4 },
          { t: 'stability', nation: 'JAP', delta: -2 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Strike-north probe: the Kwantung Army finds the Red Army on the Khalkha.
  // -------------------------------------------------------------------------
  {
    id: 'jap-khalkhin-gol',
    title: 'Incident on the Khalkha',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'SOV' },
        { t: 'not', c: { t: 'atWar', a: 'JAP', b: 'SOV' } },
        { t: 'relations', a: 'JAP', b: 'SOV', below: -30 },
        {
          t: 'or',
          c: [
            { t: 'controls', nation: 'MAN', region: 'man-manchuria' },
            { t: 'controls', nation: 'JAP', region: 'man-manchuria' },
          ],
        },
        { t: 'turnAtLeast', n: 16 },
      ],
    },
    once: true,
    priority: 6,
    text:
      'The Kwantung Army reports an engagement of division scale on the Khalkha river, on the disputed ' +
      'border between Manchukuo and Outer Mongolia. Soviet and Mongolian forces under a general named ' +
      'Zhukov have massed armor and aircraft in a quantity the local command did not anticipate and ' +
      'cannot presently match; forward regiments of Sixth Army are cut off and being reduced by ' +
      'artillery. The Kwantung Army requests authority to widen the action. The General Staff notes it ' +
      'never authorized the original probe. Whether this remains an incident or becomes the northern ' +
      'war is now Tokyo\'s decision, not Hsinking\'s.',
    choices: [
      {
        label: 'Contain and settle',
        detail: 'Take the lesson, sign the ceasefire, and let the border commission argue.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: JAP_NORTH_CHECKED, value: true },
          { t: 'armyStrength', nation: 'JAP', delta: -6 },
          { t: 'relations', a: 'JAP', b: 'SOV', delta: 5 },
          { t: 'warSupport', nation: 'JAP', delta: -2 },
          {
            t: 'report',
            to: 'SOV',
            kind: 'front',
            title: 'Border Action on the Khalkha',
            body: 'Group commander Zhukov reports the Japanese incursion encircled and destroyed. Tokyo has requested a ceasefire through the embassy. The eastern frontier holds.',
          },
        ],
      },
      {
        label: 'Widen the action',
        detail: 'The northern war, now, while Moscow watches Europe.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: JAP_STRIKE_NORTH, value: true },
          { t: 'declareWar', attacker: 'JAP', defender: 'SOV' },
          { t: 'declareWar', attacker: 'JAP', defender: 'MON' },
          { t: 'warSupport', nation: 'JAP', delta: -3 },
          {
            t: 'chronicle',
            text: 'The border incident on the Khalkha was not contained. Japan went north against the Soviet Union in open war, a road our history saw surveyed and then abandoned.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'SOV',
            kind: 'front',
            title: 'War in the Far East',
            body: 'Japanese forces have crossed the frontier in strength beyond any incident. The Far Eastern Front is at war.',
          },
        ],
      },
      {
        label: 'Break the Kwantung command',
        detail: 'Court-martial the officers who started it. Tokyo commands the field armies, or no one does.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: JAP_ARMY_REINED, value: true },
          { t: 'stability', nation: 'JAP', delta: -3 },
          { t: 'relations', a: 'JAP', b: 'SOV', delta: 10 },
          {
            t: 'chronicle',
            text: 'Tokyo court-martialed the Kwantung Army staff over the Khalkha defeat. For the first time in a decade the government commanded its own army, at the price of the army\'s loyalty.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The grand deliberation: north or south.
  // -------------------------------------------------------------------------
  {
    id: 'jap-strike-direction',
    title: 'North or South',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'eventFired', id: 'jap-khalkhin-gol' },
        { t: 'not', c: { t: 'atWar', a: 'JAP', b: 'SOV' } },
        { t: 'not', c: { t: 'atWar', a: 'JAP', b: 'USA' } },
        {
          t: 'or',
          c: [
            { t: 'flag', key: capitulatedFlag('FRA') },
            { t: 'flag', key: FLAGS.VICHY },
            { t: 'flag', key: FLAGS.BARBAROSSA },
            { t: 'tension', atLeast: 60 },
          ],
        },
      ],
    },
    once: true,
    priority: 8,
    text:
      'Liaison conference, Imperial General Headquarters and the government. The Army General Staff ' +
      'presents the northern solution: the Soviet Far East, taken while Moscow is engaged in Europe, ' +
      'ends the encirclement and the Communist question together. The Navy presents the southern: the ' +
      'oil of the Indies, the tin and rubber of Malaya, the rice of Indochina, without which neither ' +
      'the fleet nor the home islands sustain a long war under embargo. Each service concedes the ' +
      'other\'s operation is possible; neither concedes it is wise. The Kwantung Army\'s ledger from ' +
      'the Khalkha argues one way. The tankers\' manifests argue the other. A national decision is ' +
      'required, and it will bind both services.',
    choices: [
      {
        label: 'The southern advance',
        detail: 'The resources area. A navy\'s war against the sea empires.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: JAP_STRIKE_SOUTH, value: true },
          { t: 'addClaim', nation: 'JAP', region: 'ned-east-indies' },
          { t: 'addClaim', nation: 'JAP', region: 'uk-malaya' },
          { t: 'addClaim', nation: 'JAP', region: 'fra-indochina' },
          { t: 'navy', nation: 'JAP', delta: 40 },
          { t: 'warSupport', nation: 'JAP', delta: 2 },
        ],
      },
      {
        label: 'The northern advance',
        detail: 'The Soviet Far East while the Red Army faces west. An army\'s war.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: JAP_STRIKE_NORTH, value: true },
          { t: 'addClaim', nation: 'JAP', region: 'sov-fareast' },
          { t: 'armyStrength', nation: 'JAP', delta: 5 },
          {
            t: 'chronicle',
            text: 'The Empire fixed its ambitions north, toward the Soviet maritime provinces, and turned its back on the southern resources area. The Pacific war of our history was not chosen here.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Decide nothing yet',
        detail: 'Ride the China war and wait on Europe. The services keep their own plans.',
        aiWeight: 1,
        effects: [
          { t: 'stability', nation: 'JAP', delta: 2 },
          { t: 'warSupport', nation: 'JAP', delta: -3 },
          {
            t: 'chronicle',
            text: 'The liaison conference adjourned without a national decision, and the Empire drifted, each service preparing its own war. History records no such patience in Tokyo.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // First southward step: Indochina, and the eyes of Washington.
  // -------------------------------------------------------------------------
  {
    id: 'jap-indochina',
    title: 'The Road Through Indochina',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: JAP_STRIKE_SOUTH },
        {
          t: 'or',
          c: [
            { t: 'flag', key: FLAGS.VICHY },
            { t: 'flag', key: capitulatedFlag('FRA') },
          ],
        },
        { t: 'controls', nation: 'FRA', region: 'fra-indochina' },
        { t: 'not', c: { t: 'atWar', a: 'JAP', b: 'USA' } },
      ],
    },
    once: true,
    priority: 7,
    text:
      'Cable, Foreign Ministry, to the mission accredited to the French government. France, having ' +
      'capitulated in Europe, retains its colonial administration in Indochina with no fleet to ' +
      'sustain it. The route inland from Haiphong carries the larger part of the war material reaching ' +
      'Chungking; closing it may accomplish what four years of campaigning has not. The Army proposes ' +
      'occupation of the colony entire, as the anchorage and airfields of any southern operation. The ' +
      'Foreign Ministry warns that Washington reads each southward step as the opening of a larger ' +
      'program, and that in this case Washington reads correctly.',
    choices: [
      {
        label: 'Occupy the colony entire',
        detail: 'Airfields, anchorages, and the road to Malaya. Washington will answer.',
        aiWeight: 4,
        effects: [
          { t: 'setController', region: 'fra-indochina', to: 'JAP' },
          { t: 'relations', a: 'JAP', b: 'USA', delta: -25 },
          { t: 'relations', a: 'JAP', b: 'UK', delta: -15 },
          { t: 'tension', delta: 4 },
          {
            t: 'report',
            to: 'USA',
            kind: 'diplomatic',
            title: 'Japanese Forces Enter Indochina',
            body: 'Japanese troops have occupied French Indochina by arrangement imposed on the colonial administration. The State Department regards the southern resources area as the evident next object.',
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'diplomatic',
            title: 'Japan on the Border of Malaya',
            body: 'With Indochina under Japanese occupation, Japanese air power now ranges over the approaches to Singapore. The Chiefs of Staff have ordered a review of the Malaya defenses.',
          },
        ],
      },
      {
        label: 'Bases in Tonkin only',
        detail: 'Close the Chungking road, keep the southern colony French for now.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: JAP_TONKIN_BASES, value: true },
          { t: 'relations', a: 'JAP', b: 'USA', delta: -10 },
          { t: 'relations', a: 'JAP', b: 'FRA', delta: -10 },
          { t: 'tension', delta: 2 },
        ],
      },
      {
        label: 'Stay the Army\'s hand',
        detail: 'No southward step while America watches. The Chungking road stays open.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'JAP', b: 'USA', delta: 5 },
          { t: 'warSupport', nation: 'JAP', delta: -2 },
          {
            t: 'chronicle',
            text: 'Japan left Indochina untouched, and the supply road to Chungking stayed open. The embargo spiral of 1941 lost its first link here.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The embargo breaks the Konoe government.
  // -------------------------------------------------------------------------
  {
    id: 'jap-konoe-falls',
    title: 'The Konoe Cabinet Falls',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.EMBARGO_JAPAN },
        { t: 'leaderIs', nation: 'JAP', leader: 'konoe' },
        { t: 'not', c: { t: 'atWar', a: 'JAP', b: 'USA' } },
      ],
    },
    once: true,
    priority: 9,
    text:
      'The American embargo has done what four years of the China war could not: it has fixed a clock ' +
      'to every deliberation in Tokyo. Prince Konoe has sought a Pacific meeting with the President ' +
      'and been refused; the Foreign Ministry reports Washington\'s terms unchanged, withdrawal from ' +
      'China first. The Army will not withdraw. The Prince submits that he cannot form a policy ' +
      'between an immovable ally and an immovable adversary, and offers the resignation of his ' +
      'government. The court must name a successor, and the choice of the man will be the choice of ' +
      'the road.',
    choices: [
      {
        label: 'General Tōjō forms a government',
        detail: 'The Army\'s man. The deadlock is resolved in the direction of war.',
        aiWeight: 4,
        effects: [
          { t: 'setLeader', nation: 'JAP', leader: 'tojo' },
          { t: 'setAI', nation: 'JAP', patch: { aggression: 0.95, ideologyZeal: 0.9, riskTolerance: 0.85 } },
          { t: 'warSupport', nation: 'JAP', delta: 5 },
        ],
      },
      {
        label: 'Admiral Yonai forms a government',
        detail: 'The treaty school. A government that thinks the American war is lost before it starts.',
        aiWeight: 1,
        effects: [
          { t: 'setLeader', nation: 'JAP', leader: 'yonai' },
          { t: 'setAI', nation: 'JAP', patch: { aggression: 0.35, riskTolerance: 0.3, focus: 'defense' } },
          { t: 'relations', a: 'JAP', b: 'USA', delta: 10 },
          { t: 'warSupport', nation: 'JAP', delta: -5 },
          {
            t: 'chronicle',
            text: 'The court reached past the Army and gave the government to Admiral Yonai, the man who had said a war against America and Britain is a war Japan loses. In our history the summons went to Tōjō.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Konoe stays on to bargain',
        detail: 'No successor. The Prince keeps talking while the oil runs down.',
        aiWeight: 1,
        effects: [
          { t: 'stability', nation: 'JAP', delta: -4 },
          { t: 'relations', a: 'JAP', b: 'USA', delta: 5 },
          {
            t: 'chronicle',
            text: 'Konoe withdrew his resignation and bargained on, a premier without a policy at the head of services without patience. History had already replaced him by this point.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // THE decision: the answer to the oil embargo. Fires on the flag, not a
  // date; defers one pass while the Konoe cabinet crisis resolves.
  // -------------------------------------------------------------------------
  {
    id: 'jap-oil-embargo-response',
    title: 'The Oil Clock',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.EMBARGO_JAPAN },
        { t: 'not', c: { t: 'atWar', a: 'JAP', b: 'USA' } },
        {
          t: 'or',
          c: [
            { t: 'eventFired', id: 'jap-konoe-falls' },
            { t: 'not', c: { t: 'leaderIs', nation: 'JAP', leader: 'konoe' } },
          ],
        },
      ],
    },
    once: true,
    priority: 9,
    text:
      'Navy Ministry appreciation for the liaison conference, marked most secret. The embargo has ' +
      'stopped oil, scrap iron, and machine tools. Fleet stocks stand at eighteen months of war ' +
      'consumption, less at economic rates; every month of talking is a month of steaming lost. The ' +
      'Naval General Staff submits that if war is to come it must come at once, opened by a blow that ' +
      'leaves the American fleet on the bottom at its moorings while the southern operation takes the ' +
      'oil of the Indies. The Foreign Ministry submits the alternative in one sentence: the terms are ' +
      'withdrawal from China. There is no third estimate. The conference sits beneath the oil clock ' +
      'and must choose.',
    choices: [
      {
        label: 'Strike the Pacific Fleet',
        detail: 'Hawaii, Malaya, and the Indies in one dawn. The southern operation under a broken American fleet.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: FLAGS.PEARL_HARBOR, value: true },
          { t: 'declareWar', attacker: 'JAP', defender: 'USA' },
          { t: 'declareWar', attacker: 'JAP', defender: 'UK' },
          { t: 'declareWar', attacker: 'JAP', defender: 'NED' },
          { t: 'navy', nation: 'USA', delta: -150 },
          { t: 'warSupport', nation: 'JAP', delta: 10 },
          {
            t: 'chronicle',
            text: 'Carrier aircraft of the Combined Fleet struck the American fleet at its Hawaiian anchorage before any declaration was delivered. The Pacific war had begun.',
          },
          {
            t: 'report',
            to: 'USA',
            kind: 'front',
            title: 'Air Raid on Pearl Harbor',
            body: 'Carrier aircraft have attacked the Pacific Fleet at anchor. The battle line has taken severe losses; the carriers were not in port. This is not a drill.',
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'front',
            title: 'War in the East',
            body: 'Japanese landings are reported on the Malayan coast and Japanese aircraft are over Singapore. The Eastern Fleet is engaged. The Empire is at war with Japan.',
          },
          {
            t: 'report',
            to: 'NED',
            kind: 'front',
            title: 'The Indies Under Attack',
            body: 'Japan has opened hostilities against the Netherlands East Indies. The colonial government has ordered the oil installations prepared for demolition.',
          },
        ],
      },
      {
        label: 'Strike south, spare America',
        detail: 'Malaya and the Indies only. Gamble that Washington will not fight for Dutch oil.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: JAP_SPARES_USA, value: true },
          { t: 'declareWar', attacker: 'JAP', defender: 'UK' },
          { t: 'declareWar', attacker: 'JAP', defender: 'NED' },
          { t: 'warSupport', nation: 'JAP', delta: 5 },
          {
            t: 'chronicle',
            text: 'Japan struck the European empires and left the Americans untouched, wagering that no president could carry a declaration of war for the Dutch Indies through Congress. Our history saw that wager studied and rejected.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'USA',
            kind: 'diplomatic',
            title: 'Japan Attacks British and Dutch Possessions',
            body: 'Japan has opened war on Malaya and the East Indies while conspicuously avoiding American territory and the Philippines. The question of intervention passes to Congress.',
          },
        ],
      },
      {
        label: 'Accept Washington\'s terms',
        detail: 'Withdrawal from China. The oil flows, the Army does not forgive.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: JAP_STANDS_DOWN, value: true },
          { t: 'relations', a: 'JAP', b: 'USA', delta: 30 },
          { t: 'relations', a: 'JAP', b: 'CHI', delta: 15 },
          { t: 'warSupport', nation: 'JAP', delta: -12 },
          { t: 'stability', nation: 'JAP', delta: -8 },
          { t: 'tension', delta: -5 },
          {
            t: 'chronicle',
            text: 'Japan chose the ledger over the sword, conceding the continental position to restore its oil. No government in our history survived proposing it; this one has chosen to try.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Midway-style gamble: forcing the decisive battle while a margin remains.
  // -------------------------------------------------------------------------
  {
    id: 'jap-decisive-battle',
    title: 'The Decisive Battle',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.PEARL_HARBOR },
        { t: 'atWar', a: 'JAP', b: 'USA' },
        { t: 'turnAtLeast', n: 50 },
      ],
    },
    once: true,
    priority: 8,
    text:
      'Combined Fleet staff study, presented aboard the flagship. American carrier forces raid the ' +
      'perimeter and withdraw before the battle line can engage; the enemy declines a decision while ' +
      'his shipyards work. Intelligence places the American carriers at four, perhaps five, with new ' +
      'construction expected in numbers Japan cannot answer. The staff solution is to seize an outpost ' +
      'the enemy must contest, and destroy his carriers when they come to contest it. The Naval ' +
      'General Staff calls the plan a gamble taken against an enemy who may be reading our signals. ' +
      'The staff does not dispute the word. The margin that exists this year will not exist next year.',
    choices: [
      {
        label: 'Seek the decisive battle',
        detail: 'Commit the Combined Fleet against the island outpost and whatever answers.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: JAP_FLEET_SPENT, value: true },
          { t: 'navy', nation: 'JAP', delta: -150 },
          { t: 'navy', nation: 'USA', delta: -70 },
          { t: 'warSupport', nation: 'JAP', delta: -6 },
          {
            t: 'chronicle',
            text: 'The Combined Fleet forced its decisive battle in the central Pacific and lost the core of its carrier force in an afternoon. The initiative in the ocean war changed hands and did not return.',
          },
          {
            t: 'report',
            to: 'USA',
            kind: 'front',
            title: 'Fleet Action in the Central Pacific',
            body: 'Carrier forces engaged the Japanese striking fleet near the island outposts. Enemy carrier losses are assessed as severe; our own losses are heavy but replaceable. The enemy has withdrawn west.',
          },
        ],
      },
      {
        label: 'Stand on the perimeter',
        detail: 'Husband the carriers behind the island barrier and make the enemy come to them.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: JAP_PERIMETER_DOCTRINE, value: true },
          { t: 'warSupport', nation: 'JAP', delta: -3 },
          {
            t: 'chronicle',
            text: 'The Combined Fleet declined the decisive battle it historically sought, holding its carriers behind the island barrier and ceding the tempo to American construction.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Turn against the Indian Ocean',
        detail: 'Strike west at the British instead. The American problem is deferred, not solved.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: JAP_WESTERN_STRATEGY, value: true },
          { t: 'navy', nation: 'JAP', delta: -30 },
          { t: 'navy', nation: 'UK', delta: -70 },
          {
            t: 'chronicle',
            text: 'The Combined Fleet turned west into the Indian Ocean against the British, the strategy our history saw tried once and dropped. The reckoning with the American fleet was postponed to a poorer hour.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'front',
            title: 'The Eastern Fleet Driven West',
            body: 'Japanese carrier forces have swept the Indian Ocean. The Eastern Fleet has withdrawn toward Africa with serious losses. The sea road to India is contested.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Contraction: the perimeter as drawn cannot be held.
  // -------------------------------------------------------------------------
  {
    id: 'jap-absolute-defense-sphere',
    title: 'The Absolute National Defense Sphere',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'JAP', b: 'USA' },
        {
          t: 'or',
          c: [
            { t: 'flag', key: JAP_FLEET_SPENT },
            { t: 'warSupport', nation: 'JAP', below: 45 },
          ],
        },
        { t: 'turnAtLeast', n: 55 },
      ],
    },
    once: true,
    priority: 5,
    text:
      'Imperial General Headquarters, revision of the war plan. The outer perimeter as drawn cannot ' +
      'be garrisoned, supplied, or covered by the fleet remaining. The staff proposes an absolute ' +
      'national defense sphere on the inner line, holding what shipping can actually reach and ' +
      'writing off the garrisons beyond it. The Army objects to abandoning soldiers on islands most ' +
      'ministers could not place on a map; the Navy observes that the alternative abandons the ' +
      'fleet\'s fuel as well. The sphere can be drawn where it can be held, or where pride requires. ' +
      'The two lines are not the same.',
    choices: [
      {
        label: 'Draw the inner sphere',
        detail: 'Concentrate on what shipping can sustain. The outer garrisons are written off.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: JAP_INNER_SPHERE, value: true },
          { t: 'armyStrength', nation: 'JAP', delta: 6 },
          { t: 'stability', nation: 'JAP', delta: 2 },
          { t: 'warSupport', nation: 'JAP', delta: -3 },
        ],
      },
      {
        label: 'Hold every island',
        detail: 'No soldier of the Empire is written off. The shipping ledger says otherwise.',
        aiWeight: 1,
        effects: [
          { t: 'warSupport', nation: 'JAP', delta: 3 },
          { t: 'manpower', nation: 'JAP', delta: -400 },
          { t: 'armyStrength', nation: 'JAP', delta: -6 },
          {
            t: 'chronicle',
            text: 'The perimeter was held everywhere on paper and nowhere in force. The garrisons the inner sphere would have written off starved at their posts instead, and the sphere contracted anyway.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The peace party stirs when the arithmetic turns terminal.
  // -------------------------------------------------------------------------
  {
    id: 'jap-peace-faction',
    title: 'The Peace Party Stirs',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'JAP', b: 'USA' },
        { t: 'warSupport', nation: 'JAP', below: 30 },
        {
          t: 'or',
          c: [
            { t: 'stability', nation: 'JAP', below: 40 },
            { t: 'flag', key: FLAGS.ATOMIC_USED },
          ],
        },
      ],
    },
    once: true,
    priority: 7,
    text:
      'Memorandum by the Lord Keeper of the Privy Seal, circulated to the senior statesmen. The war ' +
      'can no longer be brought to a favorable conclusion by military means; each conference now ' +
      'discusses only the tempo of loss. The former premiers counsel an approach to Moscow, which ' +
      'remains neutral and may consent to broker terms. The Army answers that the national polity is ' +
      'preserved on the battlefield or not at all, and speaks of a decisive battle for the homeland. ' +
      'To sound the enemy is to risk the government to the Army\'s anger; to say nothing is to choose ' +
      'the ruin the figures already describe.',
    choices: [
      {
        label: 'Approach Moscow for mediation',
        detail: 'The neutral channel. Terms through the one great power not yet at our throat.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: JAP_SOVIET_MEDIATION, value: true },
          { t: 'relations', a: 'JAP', b: 'SOV', delta: 10 },
          { t: 'warSupport', nation: 'JAP', delta: 2 },
          {
            t: 'report',
            to: 'SOV',
            kind: 'diplomatic',
            title: 'Tokyo Requests Mediation',
            body: 'The Japanese ambassador has asked the Soviet government to broker peace terms with the Anglo-American powers. The request has been received and, for the present, left unanswered.',
          },
        ],
      },
      {
        label: 'Form a peace cabinet',
        detail: 'Admiral Yonai takes the government with a mandate to seek terms directly.',
        available: { t: 'not', c: { t: 'leaderIs', nation: 'JAP', leader: 'yonai' } },
        aiWeight: 1,
        effects: [
          { t: 'setLeader', nation: 'JAP', leader: 'yonai' },
          { t: 'setAI', nation: 'JAP', patch: { aggression: 0.2, riskTolerance: 0.2, focus: 'defense' } },
          { t: 'flag', key: JAP_SEEKS_TERMS, value: true },
          { t: 'relations', a: 'JAP', b: 'USA', delta: 10 },
          {
            t: 'chronicle',
            text: 'Tokyo formed an open peace cabinet under Admiral Yonai while its armies still stood in the field, a step our history never saw taken before the end.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Silence the peace party',
        detail: 'The Kempeitai visits the senior statesmen. The war continues.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: JAP_FIGHTS_ON, value: true },
          { t: 'stability', nation: 'JAP', delta: -5 },
          { t: 'warSupport', nation: 'JAP', delta: 4 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The end. Fires on the engine's capitulation flag.
  // -------------------------------------------------------------------------
  {
    id: 'surrender-JAP',
    title: 'The Voice of the Crane',
    nation: 'JAP',
    fires: { t: 'flag', key: capitulatedFlag('JAP') },
    once: true,
    priority: 9,
    text:
      'At noon the broadcast carries a voice never before heard on the radio, reading in court ' +
      'language a rescript that does not contain the word surrender. The war situation, it says, has ' +
      'developed not necessarily to Japan\'s advantage, and the unendurable must now be endured. In ' +
      'the ministries the burning of files has gone on for three days. Officers of the Guards ' +
      'attempted in the night to seize the recording and failed. The armies abroad, millions under ' +
      'arms and undefeated in their own accounting, are ordered to lay down their weapons by a voice ' +
      'from the palace that most of them had never heard speak.',
    choices: [
      {
        label: 'Endure the unendurable',
        detail: 'The rescript is broadcast. The war ends on the enemy\'s terms.',
        aiWeight: 5,
        effects: [
          { t: 'flag', key: JAP_SURRENDERED, value: true },
          { t: 'peace', a: 'JAP', b: 'USA' },
          { t: 'peace', a: 'JAP', b: 'UK' },
          { t: 'peace', a: 'JAP', b: 'CHI' },
          { t: 'peace', a: 'JAP', b: 'SOV' },
          { t: 'peace', a: 'JAP', b: 'NED' },
          { t: 'peace', a: 'JAP', b: 'ANZ' },
          { t: 'peace', a: 'JAP', b: 'FRA' },
          { t: 'disbandArmy', nation: 'JAP', count: 20 },
          { t: 'navy', nation: 'JAP', delta: -1000 },
          { t: 'air', nation: 'JAP', delta: -1000 },
          { t: 'tension', delta: -10 },
          {
            t: 'chronicle',
            text: 'The imperial rescript was broadcast and the armies of the Empire laid down their arms. The war in the Pacific was over.',
          },
          {
            t: 'chronicle',
            text: 'The accounting of what the occupied territories had endured, from Nanking to Manila and across the camps and railways of the southern area, entered the permanent record of the century.',
          },
          {
            t: 'report',
            to: 'player',
            kind: 'front',
            title: 'Japan Surrenders',
            body: 'Japanese forces have been ordered by imperial rescript to cease resistance on every front. Occupation authorities assume control of the home islands pending a settlement.',
          },
        ],
      },
      {
        label: 'The army refuses',
        detail: 'The recording is seized. No rescript airs. The homeland battle begins.',
        available: { t: 'leaderIs', nation: 'JAP', leader: 'tojo' },
        aiWeight: 1,
        effects: [
          { t: 'flag', key: JAP_RESCRIPT_SUPPRESSED, value: true },
          { t: 'stability', nation: 'JAP', delta: -20 },
          { t: 'warSupport', nation: 'JAP', delta: -10 },
          {
            t: 'chronicle',
            text: 'The recording was seized before it could air, and no rescript ended the war. Japan was reduced position by position, past the point where a state remained to surrender.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Succession events, keyed to the leaders.ts succession table. Queued by
  // the engine when the sitting premier dies; the fires condition gates on
  // the permanent {LEADER}_DEAD flags so a normal cabinet change never
  // triggers them spontaneously.
  // -------------------------------------------------------------------------
  {
    id: 'jap-succession-tojo',
    title: 'The Razor Forms a Government',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'JAP', leader: 'tojo' },
        { t: 'or', c: [{ t: 'flag', key: 'KONOE_DEAD' }, { t: 'flag', key: 'YONAI_DEAD' }] },
      ],
    },
    once: true,
    priority: 8,
    text:
      'The War Minister receives the imperial mandate and forms his cabinet within the day, keeping ' +
      'the Army portfolio in his own hands. The programs of national mobilization pass from committee ' +
      'to decree. Regional commands are reminded, in language without ornament, that policy is now ' +
      'made in Tokyo and nowhere else. The newspapers are given their theme: one hundred million ' +
      'people, one will. Foreign observers who called the late government divided will not make that ' +
      'complaint of this one.',
    choices: [
      {
        label: 'Total mobilization',
        detail: 'Every ministry, every prefecture, every quota raised.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: JAP_MOBILIZATION, value: true },
          { t: 'warSupport', nation: 'JAP', delta: 6 },
          { t: 'stability', nation: 'JAP', delta: -3 },
        ],
      },
      {
        label: 'Discipline the field armies first',
        detail: 'Tokyo commands. The theaters obey. Then the quotas.',
        aiWeight: 1,
        effects: [
          { t: 'armyStrength', nation: 'JAP', delta: 3 },
          { t: 'stability', nation: 'JAP', delta: 2 },
        ],
      },
    ],
  },
  {
    id: 'jap-succession-yonai',
    title: 'The Admiral\'s Cabinet',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'JAP', leader: 'yonai' },
        { t: 'or', c: [{ t: 'flag', key: 'KONOE_DEAD' }, { t: 'flag', key: 'TOJO_DEAD' }] },
      ],
    },
    once: true,
    priority: 8,
    text:
      'The mandate falls to the admiral of the treaty school, a man the army did not want and could ' +
      'not prevent. His cabinet speaks softly and counts hulls. The continental faction is told that ' +
      'the Empire\'s commitments will be reviewed against the Empire\'s means, a sentence that takes ' +
      'a day to decode and lands like a broadside. In Washington and London the appointment is read ' +
      'as an opening. In certain regimental messes it is read as a provocation.',
    choices: [
      {
        label: 'Match commitments to means',
        detail: 'The review proceeds. What cannot be supplied will not be held.',
        aiWeight: 2,
        effects: [
          { t: 'stability', nation: 'JAP', delta: 4 },
          { t: 'warSupport', nation: 'JAP', delta: -4 },
        ],
      },
      {
        label: 'An opening to the Anglo-Saxons',
        detail: 'Quiet soundings through the embassies while the review runs.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'JAP', b: 'USA', delta: 10 },
          { t: 'relations', a: 'JAP', b: 'UK', delta: 8 },
        ],
      },
    ],
  },
];
