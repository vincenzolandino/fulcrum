// Pacific theater event pack: the island war and the China front, 1938-1948.
// ~8 events, id prefix 'pac-' (exception: 'surrender-CHI' per the engine
// convention in registry.ts). Pure data against the Condition/Effect DSL in
// engine/types.ts; no functions, no dates as triggers.
//
// Pack-local flags (set here; other packs may read them):
//   PAC_BURMA_ROAD_CLOSED / PAC_BURMA_ROAD_OPEN   London's answer to Tokyo's note
//   PAC_AID_TO_CHINA          American Lend-Lease materiel is reaching Chungking
//   PAC_UNITED_FRONT_BROKEN / PAC_UNITED_FRONT_HOLDS   the KMT-Communist front
//   PAC_CHINA_ENDURES         Chungking rejected terms at the breaking point
//   PAC_USA_LEAPFROG / PAC_USA_FRONTAL   American island-campaign doctrine
//   PAC_JAP_NO_RETREAT / PAC_JAP_INNER_SPHERE   Japanese perimeter doctrine
//   PAC_ICHIGO                the trans-China continental offensive was launched
//
// Cross-pack flags come from registry.ts (LEND_LEASE, PEARL_HARBOR,
// CAPITULATED_CHI, EXILE_CHI via the builders). The China war itself is
// anchored on world state (atWar JAP/CHI, region control), never on which
// pack or AI decision started it.

import type { GameEvent } from '../../engine/types';
import { FLAGS, capitulatedFlag, exileFlag, surrenderEventId } from './registry';

const F_BURMA_ROAD_CLOSED = 'PAC_BURMA_ROAD_CLOSED';
const F_BURMA_ROAD_OPEN = 'PAC_BURMA_ROAD_OPEN';
const F_AID_TO_CHINA = 'PAC_AID_TO_CHINA';
const F_UNITED_FRONT_BROKEN = 'PAC_UNITED_FRONT_BROKEN';
const F_UNITED_FRONT_HOLDS = 'PAC_UNITED_FRONT_HOLDS';
const F_CHINA_ENDURES = 'PAC_CHINA_ENDURES';
const F_USA_LEAPFROG = 'PAC_USA_LEAPFROG';
const F_USA_FRONTAL = 'PAC_USA_FRONTAL';
const F_JAP_NO_RETREAT = 'PAC_JAP_NO_RETREAT';
const F_JAP_INNER_SPHERE = 'PAC_JAP_INNER_SPHERE';
const F_ICHIGO = 'PAC_ICHIGO';

export const PACIFIC_EVENTS: GameEvent[] = [
  // -------------------------------------------------------------------------
  // 1. The Burma Road: London answers Tokyo's note. Fires once the China
  //    coast is closed (Canton lost), making the overland route the lifeline.
  // -------------------------------------------------------------------------
  {
    id: 'pac-burma-road',
    title: 'The Burma Road',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'JAP', b: 'CHI' },
        { t: 'controls', nation: 'JAP', region: 'chi-canton' },
        { t: 'alive', nation: 'UK' },
        { t: 'alive', nation: 'CHI' },
        { t: 'not', c: { t: 'atWar', a: 'UK', b: 'JAP' } },
        { t: 'turnAtLeast', n: 24 },
      ],
    },
    once: true,
    priority: 6,
    text:
      'COLONIAL OFFICE TO GOVERNMENT HOUSE, RANGOON. The Japanese ambassador has presented ' +
      'a note demanding closure of the Yunnan road, over which lorries carry some ten ' +
      'thousand tons of munitions a month from Lashio to Chungking. With the China coast ' +
      'under Japanese guns, the road is the last route to the Chinese government that does ' +
      'not cross Soviet territory. The note hints at consequences for Hong Kong and the ' +
      'Burma frontier should traffic continue. The Chiefs of Staff advise that nothing can ' +
      'be spared east of Suez this year. His Majesty\'s Government must answer within the week.',
    choices: [
      {
        label: 'Close the road for a season',
        detail: 'Yield to the note while the situation elsewhere is dark. Traffic may resume when it brightens.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: F_BURMA_ROAD_CLOSED, value: true },
          { t: 'relations', a: 'UK', b: 'JAP', delta: 8 },
          { t: 'relations', a: 'UK', b: 'CHI', delta: -12 },
          { t: 'stability', nation: 'CHI', delta: -4 },
          { t: 'warSupport', nation: 'CHI', delta: -4 },
          {
            t: 'report', to: 'CHI', kind: 'diplomatic', title: 'London closes the Burma Road',
            body: 'The British government has suspended all munitions traffic on the Yunnan road at Japanese demand. Stocks at Lashio are impounded in place.',
          },
          {
            t: 'report', to: 'JAP', kind: 'diplomatic', title: 'The British yield on Burma',
            body: 'London has accepted the note and closed the Burma Road to war materiel. The Chungking government\'s last land route is severed for now.',
          },
          {
            t: 'chronicle',
            text: 'London closed the Burma Road under Japanese pressure, as it did in the dark summer of our history.',
          },
        ],
      },
      {
        label: 'The road stays open',
        detail: 'Refuse the note and accept the risk to Hong Kong and the Burma frontier.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: F_BURMA_ROAD_OPEN, value: true },
          { t: 'relations', a: 'UK', b: 'JAP', delta: -12 },
          { t: 'relations', a: 'UK', b: 'CHI', delta: 10 },
          { t: 'warSupport', nation: 'CHI', delta: 5 },
          { t: 'tension', delta: 2 },
          {
            t: 'report', to: 'JAP', kind: 'diplomatic', title: 'London rejects the note',
            body: 'The British government has declined to close the Burma Road. Convoys to Chungking continue under escort of the frontier garrison.',
          },
          {
            t: 'chronicle',
            text: 'London refused Tokyo\'s note and kept the Burma Road open. In our history the road closed for a season while Britain stood alone.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. American aid to China once Lend-Lease machinery exists.
  // -------------------------------------------------------------------------
  {
    id: 'pac-china-aid',
    title: 'Aid to Free China',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.LEND_LEASE },
        { t: 'atWar', a: 'JAP', b: 'CHI' },
        { t: 'alive', nation: 'CHI' },
        { t: 'relations', a: 'USA', b: 'JAP', below: -20 },
      ],
    },
    once: true,
    priority: 5,
    text:
      'MEMORANDUM FOR THE PRESIDENT. The Chinese purchasing mission asks that Lend-Lease ' +
      'be extended to Chungking: aircraft, trucks, machine tools, and instructors. China\'s ' +
      'armies replace worn rifles with older ones and have no air force to speak of. The ' +
      'routes are meager, the Burma corridor if it stays open, an airlift over the ' +
      'Himalayan spurs if it does not. War and Navy caution that every ton sent east is a ' +
      'ton withheld from nearer fronts. State replies that a China which collapses releases ' +
      'a million Japanese soldiers for use elsewhere, and that no appropriation buys more ' +
      'divisions cheaper.',
    choices: [
      {
        label: 'Extend Lend-Lease to China',
        detail: 'Materiel, aircraft, and instructors to Chungking by every route that can be kept open.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: F_AID_TO_CHINA, value: true },
          { t: 'ic', nation: 'CHI', delta: 3 },
          { t: 'armyStrength', nation: 'CHI', delta: 6 },
          { t: 'relations', a: 'USA', b: 'CHI', delta: 15 },
          { t: 'relations', a: 'USA', b: 'JAP', delta: -10 },
          { t: 'tension', delta: 2 },
          {
            t: 'report', to: 'CHI', kind: 'diplomatic', title: 'American aid is coming',
            body: 'Washington has declared China eligible for Lend-Lease. Aircraft, vehicles, and instructors are allocated; delivery depends on the routes.',
          },
          {
            t: 'report', to: 'JAP', kind: 'intel', title: 'Lend-Lease extended to Chungking',
            body: 'American war materiel has been allocated to the Chungking government. Tonnage estimates are attached; the trend line matters more than the figure.',
          },
        ],
      },
      {
        label: 'Europe first; China waits',
        detail: 'Every ton to the Atlantic. The China mission is thanked and sent home with promises.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'USA', b: 'CHI', delta: -10 },
          { t: 'warSupport', nation: 'CHI', delta: -6 },
          {
            t: 'chronicle',
            text: 'Washington sent no Lend-Lease east. The airlift over the Hump was never flown, and Free China fought on what it could grow and forge itself.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. Chinese unity: the united front strains (New Fourth Army analog).
  // -------------------------------------------------------------------------
  {
    id: 'pac-united-front',
    title: 'The United Front Strains',
    nation: 'CHI',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'JAP', b: 'CHI' },
        { t: 'alive', nation: 'CHI' },
        { t: 'leaderIs', nation: 'CHI', leader: 'chiang' },
        { t: 'controls', nation: 'JAP', region: 'chi-shanghai' },
        { t: 'turnAtLeast', n: 12 },
      ],
    },
    once: true,
    priority: 6,
    text:
      'MILITARY AFFAIRS COMMISSION, CHUNGKING. Reports from the Yangtze provinces: the ' +
      'Communist New Fourth Army, ordered north of the river, moves slowly and recruits ' +
      'as it goes, installing district administrations in territory the enemy has passed ' +
      'over. Staff estimates put Communist strength at three times the agreed establishment. ' +
      'Local commanders ask authority to disarm columns that disobey movement orders. The ' +
      'Russians make their aid contingent on the united front; the American embassy asks ' +
      'questions in the same direction. Whichever way the Commission rules, the war against ' +
      'Japan continues from the same map, with one army or two.',
    choices: [
      {
        label: 'Disarm the columns that disobey',
        detail: 'Enforce the movement orders by force. The front against Japan comes second for a week.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: F_UNITED_FRONT_BROKEN, value: true },
          { t: 'armyStrength', nation: 'CHI', delta: -5 },
          { t: 'stability', nation: 'CHI', delta: -8 },
          { t: 'relations', a: 'CHI', b: 'SOV', delta: -15 },
          {
            t: 'report', to: 'JAP', kind: 'intel', title: 'Chinese fighting Chinese',
            body: 'Government and Communist forces have fought a pitched engagement south of the Yangtze. The united front survives on paper only.',
          },
          {
            t: 'chronicle',
            text: 'Nationalist headquarters moved against the New Fourth Army, as in our history. The civil quarrel inside China\'s war resumed beneath the surface.',
          },
        ],
      },
      {
        label: 'Preserve the front; overlook the trespass',
        detail: 'Swallow the provocation. One enemy at a time.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: F_UNITED_FRONT_HOLDS, value: true },
          { t: 'stability', nation: 'CHI', delta: 4 },
          { t: 'warSupport', nation: 'CHI', delta: 5 },
          { t: 'relations', a: 'CHI', b: 'SOV', delta: 10 },
          {
            t: 'chronicle',
            text: 'Chungking swallowed the provocation and the united front held. In our history it broke in blood on the south bank of the Yangtze in 1941.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. China at the breaking point: endure or treat. Fires when the whole
  //    coast is lost and the state is cracking.
  // -------------------------------------------------------------------------
  {
    id: 'pac-china-breaking',
    title: 'Free China at the Breaking Point',
    nation: 'CHI',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'JAP', b: 'CHI' },
        { t: 'alive', nation: 'CHI' },
        { t: 'controls', nation: 'JAP', region: 'chi-north' },
        { t: 'controls', nation: 'JAP', region: 'chi-shanghai' },
        { t: 'controls', nation: 'JAP', region: 'chi-canton' },
        { t: 'stability', nation: 'CHI', below: 35 },
      ],
    },
    once: true,
    priority: 8,
    text:
      'SUPREME NATIONAL DEFENSE COUNCIL, CHUNGKING. The coast is lost from the Yellow Sea ' +
      'to the Indochina frontier and the blockade is complete. Rice stands at forty times ' +
      'the prewar price in the capital; the armies replace losses with conscripts marched ' +
      'in under rope. Through intermediaries in Shanghai, Tokyo offers terms: recognition ' +
      'of the occupied provinces, a joint front against Communism, and an end to the ' +
      'bombing. Against this the staff can offer only arithmetic. The interior feeds three ' +
      'hundred divisions badly, the enemy\'s lines lengthen with every mile, and somewhere ' +
      'beyond the horizon a wider war may yet find Japan.',
    choices: [
      {
        label: 'Endure. Space is time.',
        detail: 'Refuse the terms, conscript deeper, and wait for the wider war.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: F_CHINA_ENDURES, value: true },
          { t: 'warSupport', nation: 'CHI', delta: 8 },
          { t: 'stability', nation: 'CHI', delta: 4 },
          { t: 'manpower', nation: 'CHI', delta: -1000 },
          {
            t: 'report', to: 'JAP', kind: 'diplomatic', title: 'Chungking rejects the terms',
            body: 'The Shanghai channel is closed. The Chinese government has refused all conditions and continues the war from the interior.',
          },
        ],
      },
      {
        label: 'Accept terms through the Shanghai channel',
        detail: 'Recognize the occupied provinces and end the war. What remains of China remains Chinese.',
        aiWeight: 1,
        effects: [
          { t: 'peace', a: 'CHI', b: 'JAP' },
          { t: 'cedeRegion', region: 'chi-north', to: 'JAP' },
          { t: 'cedeRegion', region: 'chi-shanghai', to: 'JAP' },
          { t: 'cedeRegion', region: 'chi-canton', to: 'JAP' },
          { t: 'stability', nation: 'CHI', delta: -8 },
          { t: 'warSupport', nation: 'CHI', delta: -20 },
          { t: 'relations', a: 'CHI', b: 'JAP', delta: 20 },
          { t: 'relations', a: 'CHI', b: 'USA', delta: -20 },
          { t: 'relations', a: 'CHI', b: 'UK', delta: -15 },
          {
            t: 'report', to: 'JAP', kind: 'diplomatic', title: 'China accepts terms',
            body: 'The Chungking government has signed. The coastal provinces pass under Japanese administration and the China Incident is declared concluded.',
          },
          {
            t: 'report', to: 'USA', kind: 'diplomatic', title: 'China leaves the war',
            body: 'Chungking has come to terms with Tokyo, ceding the coast. The Japanese army in China is now free for employment elsewhere.',
          },
          {
            t: 'chronicle',
            text: 'Chungking signed with Tokyo and ceded the coast. In our history China never made peace, and a million Japanese soldiers stayed pinned on the continent to the end.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. Surrender event (engine convention id). Fires on capitulation:
  //    exile to the far west, or the peace movement takes the seals.
  // -------------------------------------------------------------------------
  {
    id: surrenderEventId('CHI'),
    title: 'The Fall of Chungking',
    nation: 'CHI',
    fires: { t: 'flag', key: capitulatedFlag('CHI') },
    once: true,
    priority: 9,
    text:
      'TO ALL ARMIES OF THE REPUBLIC. The seat of government has fallen and the Council ' +
      'is dispersed. What remains to decide is the disposition of the state. One party ' +
      'holds that the government must withdraw beyond the gorges with the archives and ' +
      'the treasury, and continue the war from the far provinces as a fact of law and of ' +
      'arms. Another, gathered around Mr. Wang Jingwei\'s peace movement, holds that ' +
      'further resistance spends Chinese lives for foreign interests, and that an ' +
      'accommodation reached now preserves what can still be preserved. The marshals ' +
      'will follow whichever order is signed tonight.',
    choices: [
      {
        label: 'The Republic withdraws and fights on',
        detail: 'Government, archives, and treasury go west. The war continues as guerrilla and law.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: exileFlag('CHI'), value: true },
          { t: 'annex', nation: 'CHI', by: 'JAP' },
          { t: 'relations', a: 'CHI', b: 'USA', delta: 10 },
          { t: 'relations', a: 'CHI', b: 'UK', delta: 10 },
          {
            t: 'report', to: 'JAP', kind: 'front', title: 'Organized resistance ends',
            body: 'The Chinese capital has fallen and field armies are dissolving into the hills. The government has escaped west and signs nothing.',
          },
          {
            t: 'report', to: 'USA', kind: 'diplomatic', title: 'The Chinese government goes into exile',
            body: 'The Nationalist government has withdrawn beyond Japanese reach and declares the war continues. It asks recognition and aid.',
          },
          {
            t: 'chronicle',
            text: 'Chungking fell and the Nationalist government took to the far west, refusing any instrument. In our history Free China\'s wartime capital never fell.',
            divergence: true,
          },
        ],
      },
      {
        label: 'The peace movement forms a government',
        detail: 'Wang Jingwei takes the seals and signs what is put before him.',
        aiWeight: 2,
        effects: [
          { t: 'puppet', nation: 'CHI', by: 'JAP' },
          { t: 'setLeader', nation: 'CHI', leader: 'wang-jingwei' },
          { t: 'stability', nation: 'CHI', delta: -10 },
          {
            t: 'report', to: 'JAP', kind: 'diplomatic', title: 'A cooperative China',
            body: 'Mr. Wang Jingwei has formed a national government prepared to work within the Co-Prosperity framework. The continent is declared pacified.',
          },
          {
            t: 'report', to: 'USA', kind: 'diplomatic', title: 'China capitulates',
            body: 'A collaborationist government under Wang Jingwei has signed peace on Japanese terms. No recognized Chinese authority remains at war.',
          },
          {
            t: 'chronicle',
            text: 'Wang Jingwei\'s peace government took the seals of the Republic. In our history his regime governed only where Japanese garrisons stood, and Chungking fought on.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. Island campaign posture, American side: bypass or reduce.
  // -------------------------------------------------------------------------
  {
    id: 'pac-island-road',
    title: 'Two Roads Across the Pacific',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.PEARL_HARBOR },
        { t: 'atWar', a: 'USA', b: 'JAP' },
        { t: 'strengthRatio', a: 'USA', b: 'JAP', atLeast: 1.2 },
      ],
    },
    once: true,
    priority: 7,
    text:
      'JOINT CHIEFS OF STAFF, MEMORANDUM FOR THE PRESIDENT. The fleet is rebuilt and the ' +
      'yards now deliver faster than the enemy can sink. Two lines of advance are before ' +
      'us. The Navy proposes the central Pacific: fast carrier forces against the island ' +
      'chains, each anchorage a step toward the enemy\'s home waters. The Army proposes ' +
      'the southwest: New Guinea to the Philippines, land-based air all the way. The ' +
      'planners agree on one point only, that a fortified island need not always be ' +
      'taken; a garrison bypassed and blockaded is a garrison defeated. Which strongholds ' +
      'to storm and which to starve will write the casualty lists for two years.',
    choices: [
      {
        label: 'Bypass and let them wither',
        detail: 'Strike where the enemy is thin, cut off where he is thick, and keep moving.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: F_USA_LEAPFROG, value: true },
          { t: 'navy', nation: 'USA', delta: 40 },
          { t: 'warSupport', nation: 'USA', delta: 4 },
          {
            t: 'report', to: 'JAP', kind: 'front', title: 'Garrisons cut off',
            body: 'American forces are bypassing fortified islands and severing their supply. Isolated garrisons report by radio and can be neither supplied nor withdrawn.',
          },
        ],
      },
      {
        label: 'Reduce every fortress in turn',
        detail: 'No enemy garrison left behind the advance. Slower, bloodier, thorough.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: F_USA_FRONTAL, value: true },
          { t: 'armyStrength', nation: 'USA', delta: -8 },
          { t: 'manpower', nation: 'USA', delta: -1000 },
          { t: 'warSupport', nation: 'USA', delta: -5 },
          {
            t: 'chronicle',
            text: 'The Pacific command stormed each island fortress in succession. In our history the strongholds were leapfrogged and left to wither on the vine.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. Island campaign posture, Japanese side: the absolute defense sphere.
  // -------------------------------------------------------------------------
  {
    id: 'pac-absolute-defense',
    title: 'The Absolute Defense Sphere',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.PEARL_HARBOR },
        { t: 'atWar', a: 'JAP', b: 'USA' },
        { t: 'strengthRatio', a: 'USA', b: 'JAP', atLeast: 1.4 },
        { t: 'turnAtLeast', n: 60 },
      ],
    },
    once: true,
    priority: 7,
    text:
      'IMPERIAL GENERAL HEADQUARTERS, LIAISON CONFERENCE MINUTE. The outer perimeter is ' +
      'breached and shipping losses exceed new construction threefold. The Army proposes ' +
      'a line to be held absolutely: the home islands, the inner mandates, the western ' +
      'barrier, the fuel of the southern regions. Garrisons beyond the line are to receive ' +
      'neither relief nor evacuation; their orders are to bleed the enemy for every reef. ' +
      'The Navy observes that the line\'s fuel lies at one end and its factories at the ' +
      'other, joined by sea lanes it can no longer promise to keep. The conference must ' +
      'fix the line and the doctrine tonight.',
    choices: [
      {
        label: 'Every garrison stands to the last',
        detail: 'No withdrawal, no surrender. Each island is priced in American months and blood.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: F_JAP_NO_RETREAT, value: true },
          { t: 'warSupport', nation: 'JAP', delta: 5 },
          { t: 'manpower', nation: 'JAP', delta: -800 },
          { t: 'stability', nation: 'JAP', delta: -3 },
          {
            t: 'report', to: 'USA', kind: 'intel', title: 'No-withdrawal order intercepted',
            body: 'Japanese island garrisons have been ordered to fight to annihilation. No evacuation shipping is being assembled. Expect no surrenders.',
          },
        ],
      },
      {
        label: 'Draw back to the inner sphere',
        detail: 'Write off the outer islands and thicken the inner line while sea lanes remain.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: F_JAP_INNER_SPHERE, value: true },
          { t: 'newArmy', nation: 'JAP', name: 'Home Defense Army', location: 'jap-home', strength: 60, equipment: 50 },
          { t: 'navy', nation: 'JAP', delta: 30 },
          { t: 'warSupport', nation: 'JAP', delta: -5 },
          {
            t: 'report', to: 'USA', kind: 'intel', title: 'Japanese withdrawal observed',
            body: 'Outer-island garrisons are being lifted toward the home islands under escort. The enemy is shortening his line rather than defending it everywhere.',
          },
          {
            t: 'chronicle',
            text: 'Tokyo wrote off the outer islands and pulled its garrisons home. In our history the men stayed where they stood, and the islands became their graves.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 8. The continental offensive (Ichi-Go analog): Japan's last great effort
  //    in China while losing at sea.
  // -------------------------------------------------------------------------
  {
    id: 'pac-continental-offensive',
    title: 'The Continental Offensive',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'JAP', b: 'CHI' },
        { t: 'atWar', a: 'JAP', b: 'USA' },
        { t: 'alive', nation: 'CHI' },
        { t: 'controls', nation: 'JAP', region: 'chi-shanghai' },
        { t: 'strengthRatio', a: 'USA', b: 'JAP', atLeast: 1.3 },
      ],
    },
    once: true,
    priority: 6,
    text:
      'IMPERIAL GENERAL HEADQUARTERS, ARMY SECTION. American heavy bombers now stage from ' +
      'fields in Free China; the home islands are within their arc. The China Expeditionary ' +
      'Army proposes the largest operation in its history: a corridor driven from the ' +
      'Yellow River to the Indochina frontier, overrunning the airfields and joining the ' +
      'continent to the southern resources by rail, beyond the reach of submarines. It ' +
      'asks half a million men and the year\'s locomotive production, at the moment the ' +
      'Pacific fleet actions demand every replacement. The alternative is to stand on the ' +
      'defensive in China and accept the bombing.',
    choices: [
      {
        label: 'Launch the offensive',
        detail: 'The corridor from the Yellow River to Indochina. The airfields are overrun this year.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: F_ICHIGO, value: true },
          { t: 'armyStrength', nation: 'CHI', delta: -10 },
          { t: 'armyStrength', nation: 'JAP', delta: -4 },
          { t: 'manpower', nation: 'CHI', delta: -1500 },
          { t: 'warSupport', nation: 'CHI', delta: -8 },
          { t: 'stability', nation: 'CHI', delta: -4 },
          {
            t: 'report', to: 'CHI', kind: 'front', title: 'The largest offensive of the war',
            body: 'Japanese columns are driving south along the rail lines in corps strength. Whole armies are giving way; the airfields in the path are being demolished.',
          },
          {
            t: 'report', to: 'USA', kind: 'intel', title: 'Forward airfields lost',
            body: 'The Japanese continental offensive has overrun the forward bomber fields in China. Basing for operations against the home islands must be found elsewhere.',
          },
          {
            t: 'chronicle',
            text: 'The continental offensive tore through central China, as in our history: a last victory on land while the sea war was already lost.',
          },
        ],
      },
      {
        label: 'Stand on the defensive in China',
        detail: 'Husband the expeditionary army. The bombing is endured; the fleet comes first.',
        aiWeight: 2,
        effects: [
          { t: 'armyStrength', nation: 'JAP', delta: 4 },
          {
            t: 'chronicle',
            text: 'The great continental offensive was never launched. In our history it consumed central China in 1944 and changed nothing that mattered.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Chinese succession events, keyed to the leaders.ts succession table
  // (ids follow the engine convention '<nation>-succession-<leader>', exempt
  // from the pac- prefix like surrender-CHI). Queued by the engine when the
  // Generalissimo dies; the fires condition gates on the permanent
  // {LEADER}_DEAD flags so they never fire spontaneously.
  // -------------------------------------------------------------------------
  {
    id: 'chi-succession-chen-cheng',
    title: 'Chen Cheng Assumes Command',
    nation: 'CHI',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'CHI', leader: 'chen-cheng' },
        { t: 'or', c: [{ t: 'flag', key: 'CHIANG_DEAD' }, { t: 'flag', key: 'WANG-JINGWEI_DEAD' }] },
      ],
    },
    once: true,
    priority: 8,
    text:
      'The Generalissimo is dead. In Chungking the succession passes, after a night of telephone ' +
      'calls between the war zones, to Chen Cheng, the most trusted of the field commanders. His ' +
      'first order confirms the strategy that needs no author: trade space, hold the interior, keep ' +
      'the armies in being. The factions watch the new man for weakness. The Japanese radio announces ' +
      'that Chinese resistance has been decapitated. The new Generalissimo does not trouble to ' +
      'answer it.',
    choices: [
      {
        label: 'The war of endurance continues',
        detail: 'Space for time, as before. The interior holds.',
        aiWeight: 3,
        effects: [{ t: 'warSupport', nation: 'CHI', delta: 5 }],
      },
      {
        label: 'Rebuild the central armies',
        detail: 'The new man\'s own divisions become the model for the rest.',
        aiWeight: 2,
        effects: [
          { t: 'armyStrength', nation: 'CHI', delta: 4 },
          { t: 'stability', nation: 'CHI', delta: 2 },
        ],
      },
    ],
  },
  {
    id: 'chi-succession-wang-jingwei',
    title: 'The Peace Faction Governs',
    nation: 'CHI',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'CHI', leader: 'wang-jingwei' },
        { t: 'or', c: [{ t: 'flag', key: 'CHIANG_DEAD' }, { t: 'flag', key: 'CHEN-CHENG_DEAD' }] },
      ],
    },
    once: true,
    priority: 8,
    text:
      'Power in Chungking passes to Wang Jingwei, the veteran of the left Kuomintang who has argued ' +
      'for years, first in council and then in exile from it, that China cannot win this war. His ' +
      'government speaks of peace with honor and of the salvage of what remains. Emissaries are ' +
      'rumored in Shanghai within the week. The war zone commanders wire their loyalty in terms so ' +
      'qualified that the telegrams read as warnings. Tokyo waits, correct and attentive, on ' +
      'developments.',
    choices: [
      {
        label: 'Open talks with Tokyo',
        detail: 'Through Shanghai intermediaries. Terms before collapse.',
        aiWeight: 2,
        effects: [
          { t: 'relations', a: 'CHI', b: 'JAP', delta: 20 },
          { t: 'warSupport', nation: 'CHI', delta: -10 },
        ],
      },
      {
        label: 'The armies fight on regardless',
        detail: 'The commanders will not sign. The government pretends it never asked.',
        aiWeight: 1,
        effects: [
          { t: 'stability', nation: 'CHI', delta: -5 },
          { t: 'warSupport', nation: 'CHI', delta: 3 },
        ],
      },
    ],
  },
];
