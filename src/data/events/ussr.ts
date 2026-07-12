// USSR event pack — the Soviet Union's decision points, 1938–1948.
//
// Pure data: GameEvent objects interpreted by the engine's Condition/Effect
// DSL. No functions in content, no randomness, no dates as triggers (turn
// floors only ever accompany a world-state condition). Voice: period staff
// memoranda, special communications, and protocols.
//
// Cross-pack flags come from ./registry (FLAGS). Flags DEFINED by this pack
// (readable by other packs later) are exported below as SOV_FLAGS; they were
// not added to registry.ts because that file is outside this task's writable
// set — see the pack report.

import type { GameEvent } from '../../engine/types';
import { EVENT_ID_PREFIX, FLAGS, exileFlag, surrenderEventId } from './registry';

/** Flags this pack sets. Other packs may read them via these exact strings. */
export const SOV_FLAGS = {
  /** Western military districts brought to quiet or full readiness before an
   *  eastern German attack (set by the Sorge-warning choices). */
  BORDER_ALERT: 'SOV_BORDER_ALERT',
  /** The evacuated industry is re-erected and producing beyond the Volga. */
  INDUSTRY_EAST: 'SOV_INDUSTRY_EAST',
  /** The Berlin residency holds an approved direct-action file: the player
   *  has been pointed at the covert assassinate mission. */
  DIRECT_ACTION_READY: 'SOV_DIRECT_ACTION_READY',
} as const;

const id = (suffix: string): string => `${EVENT_ID_PREFIX.ussr}${suffix}`;

export const USSR_EVENTS: GameEvent[] = [
  // -------------------------------------------------------------------------
  // 1. The purge: continue or rebuild. Doctrine 0 at start is the purge's
  //    mechanical scar; rehabilitation is the recovery path.
  // -------------------------------------------------------------------------
  {
    id: id('purge-question'),
    title: 'The Army and the Organs',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'SOV' },
        { t: 'leaderIs', nation: 'SOV', leader: 'stalin' },
        { t: 'not', c: { t: 'tech', nation: 'SOV', track: 'doctrine', atLeast: 1 } },
        { t: 'turnAtLeast', n: 2 },
      ],
    },
    once: true,
    priority: 6,
    text:
      'MEMORANDUM. Commissariat of Defense to the General Secretary, personal. ' +
      'The military districts report above thirty thousand command vacancies. ' +
      'Corps commanders lead divisions; senior lieutenants lead battalions. ' +
      'Staff exercises in the Kiev Special District failed at the map stage. ' +
      'The organs report that the cleansing of the officer corps remains incomplete ' +
      'and that further lists are prepared for signature. The General Staff submits, ' +
      'with respect, that the army cannot absorb further subtraction. ' +
      'Both papers are on the desk. One signature is required.',
    choices: [
      {
        label: 'The lists are approved',
        detail: 'The cleansing continues. The apparatus is obedient; the army is headless.',
        aiWeight: 4,
        effects: [
          { t: 'stability', nation: 'SOV', delta: 4 },
          { t: 'armyStrength', nation: 'SOV', delta: -5 },
          { t: 'manpower', nation: 'SOV', delta: -50 },
          {
            t: 'chronicle',
            text:
              'The purge of the Red Army command continued through 1938; the officers who might have shortened the next war were shot before it began.',
          },
        ],
      },
      {
        label: 'Enough. The army must be rebuilt',
        detail: 'Halt the arrests, recall cashiered officers, reopen the academies. The organs will not forgive it.',
        aiWeight: 1,
        effects: [
          { t: 'tech', nation: 'SOV', track: 'doctrine', delta: 1 },
          { t: 'stability', nation: 'SOV', delta: -4 },
          {
            t: 'chronicle',
            divergence: true,
            text:
              'Here history turned: the arrests stopped, and cashiered commanders walked back through the gates of the Frunze Academy.',
          },
        ],
      },
      {
        label: 'Slow the machine without stopping it',
        detail: 'Fewer lists, quieter trials. Neither the army nor the organs are satisfied, and neither is provoked.',
        aiWeight: 2,
        effects: [
          { t: 'stability', nation: 'SOV', delta: 2 },
          { t: 'armyStrength', nation: 'SOV', delta: -2 },
          {
            t: 'chronicle',
            text: 'The purge slackened to a routine of quiet dismissals; the Red Army command stayed thin.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. Sorge / Starshina warnings — Barbarossa brewing. Anchored on the spy
  //    network in Germany, the pact, Germany already at war, and high tension.
  // -------------------------------------------------------------------------
  {
    id: id('sorge-warning'),
    title: 'The Ramsay Cables',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'SOV' },
        { t: 'alive', nation: 'GER' },
        { t: 'spyNetwork', owner: 'SOV', target: 'GER', atLeast: 30 },
        { t: 'flag', key: FLAGS.PACT_MR },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'SOV' } },
        { t: 'atWar', a: 'GER' },
        { t: 'tension', atLeast: 50 },
        { t: 'turnAtLeast', n: 30 },
      ],
    },
    once: true,
    priority: 8,
    text:
      'SPECIAL COMMUNICATION, First Chief Directorate. Source Starshina, inside the German Air Ministry, ' +
      'reports target folders for airfields in our western districts complete. Source Ramsay, Tokyo, ' +
      'reports the German attache speaking of a decision in the East before winter. Rail traffic east of ' +
      'Warsaw has tripled since March; fuel and bridging columns are moving to the frontier in quantity. ' +
      'The Directorate notes that similar reports have preceded nothing in the past year, and that the ' +
      'network may be the object of an English provocation. An assessment is requested.',
    choices: [
      {
        label: 'A provocation of the English',
        detail: 'The pact holds because it must. Nothing is to be done that Berlin could read as preparation.',
        aiWeight: 4,
        effects: [
          { t: 'relations', a: 'SOV', b: 'GER', delta: 5 },
          {
            t: 'report',
            to: 'SOV',
            kind: 'intel',
            title: 'Warnings filed',
            body: 'The Starshina and Ramsay material is filed with the other provocations. The frontier districts remain on peacetime establishment.',
          },
        ],
      },
      {
        label: 'Quiet readiness in the western districts',
        detail: 'No public mobilization. Ammunition forward, staffs to field posts, leave cancelled without announcement.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: SOV_FLAGS.BORDER_ALERT, value: true },
          { t: 'armyStrength', nation: 'SOV', delta: 3 },
          { t: 'stability', nation: 'SOV', delta: -1 },
          {
            t: 'report',
            to: 'SOV',
            kind: 'intel',
            title: 'Covering armies alerted',
            body: 'The western districts move to field posts under maskirovka. Berlin has not been given a pretext.',
          },
        ],
      },
      {
        label: 'General alert. Mobilize the frontier armies',
        detail: 'Believe the cables in full. Berlin will see it, and may treat it as cause.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: SOV_FLAGS.BORDER_ALERT, value: true },
          { t: 'armyStrength', nation: 'SOV', delta: 6 },
          { t: 'manpower', nation: 'SOV', delta: -200 },
          { t: 'relations', a: 'SOV', b: 'GER', delta: -15 },
          { t: 'tension', delta: 3 },
          {
            t: 'report',
            to: 'GER',
            kind: 'intel',
            title: 'Soviet districts mobilizing',
            body: 'Abwehr reporting: the Soviet western military districts have gone to a war footing. Surprise can no longer be assumed.',
          },
          {
            t: 'chronicle',
            divergence: true,
            text: 'Here history turned: Moscow believed its spies, and the Red Army stood to before the blow fell.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. Relocate industry east — trade IC now for IC later (follow-up below).
  // -------------------------------------------------------------------------
  {
    id: id('relocate-industry'),
    title: 'Wheels East',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'SOV' },
        { t: 'atWar', a: 'SOV', b: 'GER' },
      ],
    },
    once: true,
    priority: 8,
    text:
      'DECREE of the Council for Evacuation, drafted for signature. The enemy advances on the industrial ' +
      'regions of the west. It is proposed to dismantle one thousand five hundred major enterprises, load ' +
      'them onto flatcars, and re-erect them beyond the Volga and in the Urals, together with their workers ' +
      'and their families. Production will stop for months while the machines travel. The alternative is ' +
      'that the plants work for us until the day they work for the enemy. The State Defense Committee must ' +
      'choose between output this winter and output for the rest of the war.',
    choices: [
      {
        label: 'Load the flatcars',
        detail: 'Accept the production trough now. The plants come back on line in the east, out of reach.',
        aiWeight: 5,
        effects: [
          { t: 'ic', nation: 'SOV', delta: -15 },
          { t: 'stability', nation: 'SOV', delta: -3 },
          { t: 'queueEvent', id: id('industry-east'), delay: 6 },
          {
            t: 'report',
            to: 'SOV',
            kind: 'domestic',
            title: 'Evacuation eastward begun',
            body: 'The Council for Evacuation reports the first thousand trains loaded. Output will fall sharply until the plants are re-erected beyond the Volga.',
          },
          {
            t: 'chronicle',
            text: 'The evacuation of Soviet industry eastward began; machine tools were bolted to frozen ground and cutting metal within weeks of arrival.',
          },
        ],
      },
      {
        label: 'The plants stay and fight',
        detail: 'Full output now. Whatever the front loses, the enemy inherits with its machinery intact.',
        aiWeight: 1,
        effects: [
          { t: 'stability', nation: 'SOV', delta: 2 },
          {
            t: 'chronicle',
            divergence: true,
            text: 'Here history turned: the factories of the Ukraine and the Donbas kept their machines in place, wagering that the front would hold.',
          },
        ],
      },
    ],
  },

  // Follow-up: queued by 'Load the flatcars'. Never fires on its own.
  {
    id: id('industry-east'),
    title: 'The Urals Wake',
    nation: 'SOV',
    fires: { t: 'never' },
    once: true,
    priority: 7,
    text:
      'REPORT to the State Defense Committee. The evacuated enterprises are re-erected at Chelyabinsk, ' +
      'Sverdlovsk, Magnitogorsk, and Tashkent. Tank output at the Urals combines has passed the pre-war ' +
      'figure of the Kharkov works. Workers sleep in the shops beside their machines; power and rail ' +
      'allocation hold priority over every civil claim. The relocation is complete. Eastern production now ' +
      'exceeds what was lost in the west, and it stands beyond the reach of any enemy air fleet.',
    choices: [
      {
        label: 'Noted for the record',
        aiWeight: 1,
        effects: [
          { t: 'ic', nation: 'SOV', delta: 25 },
          { t: 'flag', key: SOV_FLAGS.INDUSTRY_EAST, value: true },
          {
            t: 'report',
            to: 'SOV',
            kind: 'domestic',
            title: 'Eastern plants at full output',
            body: 'The relocated combines exceed pre-war output. The arsenal is now east of the Volga.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. Winter War conduct (peace protocol follow-up below).
  // -------------------------------------------------------------------------
  {
    id: id('winter-war-conduct'),
    title: 'The Mannerheim Line',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.WINTER_WAR },
        { t: 'atWar', a: 'SOV', b: 'FIN' },
      ],
    },
    once: true,
    priority: 7,
    text:
      'STAVKA ASSESSMENT, Finnish theater. The December offensives against the Karelian fortifications have ' +
      'failed with heavy loss. Divisions trained for the plains are burning in forest defiles; enemy ski ' +
      'battalions cut road-bound columns into pockets and destroy them piecemeal. Temperatures stand below ' +
      'minus forty. Seventh Army requests reinforcement, artillery concentration, and time. The foreign ' +
      'press counts our dead with satisfaction, and the general staffs of Europe are revising their estimate ' +
      'of the Red Army. The question before the Stavka is how the campaign is to be finished, and at what price.',
    choices: [
      {
        label: 'Halt. Timoshenko rebuilds the assault by the book',
        detail: 'Weeks of preparation, massed artillery, rehearsed infantry. Slower, cheaper in blood, and certain.',
        aiWeight: 4,
        effects: [
          { t: 'armyStrength', nation: 'SOV', delta: -4 },
          { t: 'manpower', nation: 'SOV', delta: -100 },
          { t: 'tech', nation: 'SOV', track: 'doctrine', delta: 1 },
          { t: 'queueEvent', id: id('winter-peace'), delay: 4 },
          {
            t: 'chronicle',
            text: 'The Finnish debacle forced reform: Timoshenko rebuilt the assault methodically, and the army relearned its trade in the snow.',
          },
        ],
      },
      {
        label: 'Throw fresh armies at the Isthmus at once',
        detail: 'Mass ends it quickly. The cost is paid in infantry and in reputation.',
        aiWeight: 2,
        effects: [
          { t: 'armyStrength', nation: 'SOV', delta: -10 },
          { t: 'manpower', nation: 'SOV', delta: -300 },
          { t: 'warSupport', nation: 'SOV', delta: -5 },
          { t: 'queueEvent', id: id('winter-peace'), delay: 2 },
          {
            t: 'chronicle',
            text: 'The line was carried by weight of numbers; the frozen columns on the Raate road were the tuition.',
          },
        ],
      },
      {
        label: 'Break off the campaign',
        detail: 'Withdraw with nothing. The border stays where it was; the failure is public and permanent.',
        aiWeight: 1,
        effects: [
          { t: 'peace', a: 'SOV', b: 'FIN' },
          { t: 'stability', nation: 'SOV', delta: -6 },
          { t: 'warSupport', nation: 'SOV', delta: -8 },
          { t: 'tension', delta: -2 },
          {
            t: 'chronicle',
            divergence: true,
            text: 'Here history turned: Moscow withdrew from Finland empty-handed, and every general staff in Europe marked the Red Army down accordingly.',
          },
        ],
      },
    ],
  },

  // Follow-up: queued by either offensive choice above. Never fires on its own.
  {
    id: id('winter-peace'),
    title: 'The Peace of Moscow',
    nation: 'SOV',
    fires: { t: 'never' },
    once: true,
    priority: 7,
    text:
      'PROTOCOL initialed at Moscow between the Government of the USSR and the Government of the Republic ' +
      'of Finland. The Finnish delegation, its army unbroken but its manpower exhausted, accepts the cession ' +
      'of the Karelian Isthmus and the Ladoga shore. The foreign intervention much discussed in London and ' +
      'Paris never sailed. The guns are to fall silent at eleven o\'clock, Leningrad time. What remains is ' +
      'to decide whether the protocol is an end or an installment.',
    choices: [
      {
        label: 'Take the border and be done',
        detail: 'Karelia is the object. Finland keeps its independence and its grievance.',
        available: { t: 'atWar', a: 'SOV', b: 'FIN' },
        aiWeight: 5,
        effects: [
          { t: 'peace', a: 'SOV', b: 'FIN' },
          { t: 'cedeRegion', region: 'fin-karelia', to: 'SOV' },
          { t: 'relations', a: 'SOV', b: 'FIN', delta: -40 },
          { t: 'tension', delta: 2 },
          {
            t: 'report',
            to: 'FIN',
            kind: 'diplomatic',
            title: 'Peace signed at Moscow',
            body: 'The war is over. Karelia is ceded to the Soviet Union; the republic stands, reduced and unreconciled.',
          },
          {
            t: 'chronicle',
            text: 'Finland ceded Karelia and kept its independence; the Red Army\'s performance in the snow was studied with great care in Berlin.',
          },
        ],
      },
      {
        label: 'Press on to Helsinki',
        detail: 'Refuse the protocol. The whole country, whatever it costs and whoever intervenes.',
        available: { t: 'atWar', a: 'SOV', b: 'FIN' },
        aiWeight: 1,
        effects: [
          { t: 'armyStrength', nation: 'SOV', delta: -8 },
          { t: 'manpower', nation: 'SOV', delta: -300 },
          { t: 'warSupport', nation: 'SOV', delta: -6 },
          { t: 'tension', delta: 4 },
          {
            t: 'chronicle',
            divergence: true,
            text: 'Here history turned: Moscow refused the Finnish offer and ground on toward Helsinki through the drifts.',
          },
        ],
      },
      {
        label: 'The matter is already settled',
        detail: 'The war ended before the protocol could be initialed. File it.',
        available: { t: 'not', c: { t: 'atWar', a: 'SOV', b: 'FIN' } },
        aiWeight: 1,
        effects: [],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. The Baltic ultimatum — the pact's secret ledger comes due.
  // -------------------------------------------------------------------------
  {
    id: id('baltic-ultimatum'),
    title: 'Letters to Three Capitals',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.PACT_MR },
        { t: 'alive', nation: 'SOV' },
        { t: 'alive', nation: 'EST' },
        { t: 'alive', nation: 'LAT' },
        { t: 'alive', nation: 'LIT' },
        { t: 'atWar', a: 'GER' },
        { t: 'not', c: { t: 'atWar', a: 'SOV', b: 'GER' } },
        { t: 'turnAtLeast', n: 20 },
      ],
    },
    once: true,
    priority: 6,
    text:
      'To the Governments of Estonia, Latvia, and Lithuania, identical notes. The Government of the USSR ' +
      'draws attention to the war now general in Europe and to the demonstrated inability of small states ' +
      'to defend their neutrality. It proposes treaties of mutual assistance, the stationing of Soviet ' +
      'garrisons at named ports and airfields, and consultations on the composition of governments friendly ' +
      'to the Soviet Union. An answer is expected within seventy-two hours. The Baltic foreign ministries, ' +
      'reading between the lines, have begun burning their archives.',
    choices: [
      {
        label: 'Incorporation. The republics apply to join the Union',
        detail: 'Garrisons, then elections with one list, then admission. The window is open while the West looks elsewhere.',
        aiWeight: 4,
        effects: [
          { t: 'annex', nation: 'EST', by: 'SOV' },
          { t: 'annex', nation: 'LAT', by: 'SOV' },
          { t: 'annex', nation: 'LIT', by: 'SOV' },
          { t: 'relations', a: 'SOV', b: 'UK', delta: -10 },
          { t: 'relations', a: 'SOV', b: 'USA', delta: -10 },
          {
            t: 'report',
            to: 'EST',
            kind: 'diplomatic',
            title: 'The republic extinguished',
            body: 'Soviet garrisons, a staged plebiscite, and admission to the Union. The state has ceased to exist in law and in fact.',
          },
          {
            t: 'chronicle',
            text: 'The Baltic states were absorbed into the Soviet Union; within the year the deportation trains were running east.',
          },
        ],
      },
      {
        label: 'Garrisons only; the flags remain',
        detail: 'Bases and treaty control without formal absorption. Less alarm abroad, less finality at home.',
        aiWeight: 2,
        effects: [
          { t: 'puppet', nation: 'EST', by: 'SOV' },
          { t: 'puppet', nation: 'LAT', by: 'SOV' },
          { t: 'puppet', nation: 'LIT', by: 'SOV' },
          { t: 'tension', delta: 3 },
          { t: 'relations', a: 'SOV', b: 'UK', delta: -5 },
          {
            t: 'report',
            to: 'EST',
            kind: 'diplomatic',
            title: 'Mutual assistance imposed',
            body: 'Soviet garrisons occupy the named ports and airfields. The government remains in office and under instruction.',
          },
        ],
      },
      {
        label: 'The notes are withdrawn',
        detail: 'Leave the Baltic shore alone. The pact\'s eastern ledger goes uncollected.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'SOV', b: 'EST', delta: 10 },
          { t: 'relations', a: 'SOV', b: 'LAT', delta: 10 },
          { t: 'relations', a: 'SOV', b: 'LIT', delta: 10 },
          {
            t: 'chronicle',
            divergence: true,
            text: 'Here history turned: Moscow let the Baltic republics stand, and the pact\'s secret map went unredeemed on its northern edge.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. Envoy to Berlin — player-SOV hook at network 70: points at the covert
  //    assassinate mission and delivers an intelligence report.
  // -------------------------------------------------------------------------
  {
    id: id('envoy-berlin'),
    title: 'The Berlin Residency',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'isPlayer', nation: 'SOV' },
        { t: 'alive', nation: 'SOV' },
        { t: 'alive', nation: 'GER' },
        { t: 'spyNetwork', owner: 'SOV', target: 'GER', atLeast: 70 },
      ],
    },
    once: true,
    priority: 6,
    text:
      'EYES ONLY, First Chief Directorate to the General Secretary. The Berlin residency now operates at ' +
      'full depth: sources inside the Air Ministry, the Foreign Office cipher section, and the Chancellery ' +
      'motor pool. Attached is the residency\'s current product, including the German order of battle in ' +
      'the East and the fuel state of their mechanized forces. The rezident adds one further paragraph, ' +
      'for one reader. Given the present depth of access, direct action against the German leadership is ' +
      'now technically feasible. He awaits instruction, and asks only that the instruction be unambiguous.',
    choices: [
      {
        label: 'Prepare the direct action file',
        detail: 'Authorize preparation. Execution remains a separate order, given through the covert apparatus.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: SOV_FLAGS.DIRECT_ACTION_READY, value: true },
          {
            t: 'report',
            to: 'player',
            kind: 'covert',
            title: 'Direct action file open',
            body: 'The Berlin residency holds an approved plan against the German leadership. Network strength meets the requirement for an assassination operation; order it through the covert operations panel when you choose.',
          },
          {
            t: 'report',
            to: 'player',
            kind: 'intel',
            title: 'Berlin residency: eastern dispositions',
            body: 'German order of battle in the East, fuel states, and railhead loadings attached. The mechanized forces are concentrated and short of oil reserves.',
          },
        ],
      },
      {
        label: 'Product, not corpses. Keep the sources alive',
        detail: 'A dead man tells us nothing next month. The residency continues collection only.',
        aiWeight: 3,
        effects: [
          { t: 'spyNetwork', owner: 'SOV', target: 'GER', delta: 5 },
          {
            t: 'report',
            to: 'player',
            kind: 'intel',
            title: 'Berlin residency: eastern dispositions',
            body: 'German order of battle in the East, fuel states, and railhead loadings attached. Collection continues; direct action is declined.',
          },
        ],
      },
      {
        label: 'Too exposed. Thin the residency',
        detail: 'Depth of access is depth of risk. Withdraw the most exposed sources before the Gestapo finds the seam.',
        aiWeight: 1,
        effects: [
          { t: 'spyNetwork', owner: 'SOV', target: 'GER', delta: -20 },
          { t: 'relations', a: 'SOV', b: 'GER', delta: 5 },
          {
            t: 'report',
            to: 'player',
            kind: 'covert',
            title: 'Residency drawn down',
            body: 'The most exposed Berlin sources are withdrawn through Stockholm. The network survives at reduced depth.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. Order No. 227 — discipline by decree or defense in depth.
  // -------------------------------------------------------------------------
  {
    id: id('not-one-step-back'),
    title: 'Not One Step Back',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'SOV', b: 'GER' },
        {
          t: 'or',
          c: [
            { t: 'controls', nation: 'GER', region: 'sov-ukraine' },
            { t: 'controls', nation: 'GER', region: 'sov-byelorussia' },
            { t: 'controls', nation: 'GER', region: 'sov-leningrad' },
          ],
        },
        { t: 'warSupport', nation: 'SOV', below: 55 },
      ],
    },
    once: true,
    priority: 7,
    text:
      'ORDER of the People\'s Commissar of Defense, No. 227, in draft. The enemy stands deep in Soviet ' +
      'territory. Units retreat without orders, abandoning guns and grain to the invader, and the ' +
      'population is losing faith in the army. The draft before the Stavka ends unauthorized withdrawal by ' +
      'decree: blocking detachments behind unsteady divisions, penal companies for the broken, courts for ' +
      'commanders who yield ground unordered. The alternative paper, argued by the front commanders, trades ' +
      'ground for time and husbands the men. Panic, says one school, is the true enemy. Encirclement, says the other.',
    choices: [
      {
        label: 'Sign Order 227',
        detail: 'The line holds by decree. The penal companies pay the price of holding it.',
        aiWeight: 4,
        effects: [
          { t: 'warSupport', nation: 'SOV', delta: 8 },
          { t: 'stability', nation: 'SOV', delta: -4 },
          { t: 'armyStrength', nation: 'SOV', delta: 4 },
          {
            t: 'chronicle',
            text: 'Order No. 227 held the line by decree; the blocking detachments and penal companies paid its price in full.',
          },
        ],
      },
      {
        label: 'Depth over dogma. The fronts may trade space',
        detail: 'License withdrawal to the operational commanders. Fewer encirclements, more abandoned ground.',
        aiWeight: 2,
        effects: [
          { t: 'setAI', nation: 'SOV', patch: { focus: 'defense' } },
          { t: 'warSupport', nation: 'SOV', delta: -4 },
          { t: 'stability', nation: 'SOV', delta: 2 },
          {
            t: 'chronicle',
            divergence: true,
            text: 'Here history turned: the Stavka licensed withdrawal, and the summer battles became a war of depth rather than of decrees.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 8. Sorge's last service — Japan strikes south; the Siberians can go west.
  // -------------------------------------------------------------------------
  {
    id: id('siberian-divisions'),
    title: 'Ramsay\'s Last Service',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'SOV' },
        { t: 'alive', nation: 'JAP' },
        { t: 'atWar', a: 'SOV', b: 'GER' },
        { t: 'not', c: { t: 'atWar', a: 'SOV', b: 'JAP' } },
        { t: 'spyNetwork', owner: 'SOV', target: 'JAP', atLeast: 30 },
        {
          t: 'or',
          c: [
            { t: 'flag', key: FLAGS.PEARL_HARBOR },
            { t: 'atWar', a: 'JAP', b: 'USA' },
          ],
        },
      ],
    },
    once: true,
    priority: 8,
    text:
      'SPECIAL COMMUNICATION, source Ramsay, Tokyo. The Imperial conference has decided. Japan moves south, ' +
      'against the colonial powers and the American fleet, not north against the Soviet Far East. No attack ' +
      'across the Amur will come this winter. The residency rates the report as certain, and notes that it ' +
      'is likely to be its last; the Tokyo police are close. The Far Eastern Front\'s divisions, held ' +
      'against an invasion that will not come, are as of this cable strategically unemployed.',
    choices: [
      {
        label: 'The Siberians go west',
        detail: 'Strip the Far East to reinforce the decisive front. If Ramsay is wrong, the Amur is open.',
        aiWeight: 5,
        effects: [
          { t: 'newArmy', nation: 'SOV', name: '1st Far Eastern Shock Army', location: 'sov-moscow', strength: 90, equipment: 70 },
          { t: 'newArmy', nation: 'SOV', name: '2nd Far Eastern Shock Army', location: 'sov-moscow', strength: 85, equipment: 65 },
          {
            t: 'report',
            to: 'GER',
            kind: 'intel',
            title: 'Fresh Siberian formations identified',
            body: 'Prisoner interrogation and radio intercepts confirm full-strength Far Eastern divisions arriving opposite the central sector, acclimatized and winter-equipped.',
          },
          {
            t: 'chronicle',
            text: 'The Siberian divisions arrived at the decisive front in winter whites; Sorge was hanged in Tokyo with his last cable proven right.',
          },
        ],
      },
      {
        label: 'The Far East stays garrisoned',
        detail: 'One agent\'s certainty is not the state\'s. The Amur frontier remains held in strength.',
        aiWeight: 1,
        effects: [
          { t: 'stability', nation: 'SOV', delta: 1 },
          {
            t: 'chronicle',
            divergence: true,
            text: 'Here history turned: Moscow kept its Siberian divisions facing an enemy that never came.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 9. Lend-Lease — the aid protocols arrive with strings visible.
  // -------------------------------------------------------------------------
  {
    id: id('lend-lease'),
    title: 'Aid from the Capitalists',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.LEND_LEASE },
        { t: 'alive', nation: 'SOV' },
        { t: 'atWar', a: 'SOV', b: 'GER' },
      ],
    },
    once: true,
    priority: 5,
    text:
      'MEMORANDUM, People\'s Commissariat for Foreign Trade. The Anglo-American aid protocols are signed. ' +
      'Convoys are forming for Murmansk and Archangel, and a truck route is surveyed through Persia. On ' +
      'offer: trucks, boots, aviation fuel, aluminum, and the canned meat the soldiers will call the second ' +
      'front. The Commissariat notes that the aid is substantial and that the donors are capitalist powers ' +
      'with long memories and longer ledgers. Acceptance in full will place foreign liaison officers in our ' +
      'ports and foreign figures in our books.',
    choices: [
      {
        label: 'Take everything',
        detail: 'Winter does not ask where the boots were made. Full protocols, full convoys.',
        aiWeight: 5,
        effects: [
          { t: 'ic', nation: 'SOV', delta: 8 },
          { t: 'relations', a: 'SOV', b: 'USA', delta: 15 },
          { t: 'relations', a: 'SOV', b: 'UK', delta: 10 },
          {
            t: 'report',
            to: 'SOV',
            kind: 'domestic',
            title: 'Convoys running',
            body: 'The northern convoys and the Persian corridor are delivering. Front-line units report American trucks and British aircraft in quantity.',
          },
        ],
      },
      {
        label: 'Accept the goods, quarantine the officers',
        detail: 'The material comes in; the liaison missions stay on their ships and in their compounds.',
        aiWeight: 2,
        effects: [
          { t: 'ic', nation: 'SOV', delta: 5 },
          { t: 'relations', a: 'SOV', b: 'USA', delta: 5 },
          { t: 'stability', nation: 'SOV', delta: 2 },
        ],
      },
      {
        label: 'Refuse. The Union owes no debts',
        detail: 'Fight on domestic production alone. Purity has a price in trucks.',
        aiWeight: 1,
        effects: [
          { t: 'stability', nation: 'SOV', delta: 2 },
          { t: 'relations', a: 'SOV', b: 'USA', delta: -10 },
          {
            t: 'chronicle',
            divergence: true,
            text: 'Here history turned: Moscow refused the Anglo-American convoys and marched on boots of its own making.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 10. Surrender event — engine convention id 'surrender-SOV'; queued by the
  //     capitulation check, never fires on its own.
  // -------------------------------------------------------------------------
  {
    id: surrenderEventId('SOV'),
    title: 'The State of the Union',
    nation: 'SOV',
    fires: { t: 'never' },
    once: true,
    priority: 9,
    text:
      'PROTOCOL of the emergency session, State Defense Committee, meeting east of the capital. Moscow\'s ' +
      'fall is confirmed. The western fronts are broken or encircled. Two papers lie on the table. The ' +
      'first orders the government to Kuibyshev and then the Urals, the army to scorched earth and winter, ' +
      'the state to fight from the taiga if the steppe is lost. The second, drafted without signature, ' +
      'sounds Berlin through Sofia for terms: an armistice on the Brest-Litovsk model, the Union truncated ' +
      'but alive. The committee is silent. Somebody must speak first.',
    choices: [
      {
        label: 'The Union retreats. It does not surrender',
        detail: 'Government to the Urals, industry to the taiga, the war to the seasons. No signature for Berlin.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: exileFlag('SOV'), value: true },
          { t: 'stability', nation: 'SOV', delta: 5 },
          { t: 'warSupport', nation: 'SOV', delta: 10 },
          {
            t: 'report',
            to: 'GER',
            kind: 'diplomatic',
            title: 'No Soviet capitulation',
            body: 'The Soviet government has withdrawn beyond the Volga and refuses terms. The war in the East continues without a front line or an end.',
          },
          {
            t: 'chronicle',
            text: 'The Soviet state withdrew behind the Volga and refused the pen; the eastern war went on past the maps.',
          },
        ],
      },
      {
        label: 'Sound Berlin for terms',
        detail: 'A second Brest-Litovsk: cede the west, keep the state. The revolution survived it once.',
        available: { t: 'atWar', a: 'SOV', b: 'GER' },
        aiWeight: 2,
        effects: [
          { t: 'peace', a: 'SOV', b: 'GER' },
          { t: 'cedeRegion', region: 'sov-ukraine', to: 'GER' },
          { t: 'cedeRegion', region: 'sov-byelorussia', to: 'GER' },
          { t: 'cedeRegion', region: 'sov-caucasus', to: 'GER' },
          { t: 'warSupport', nation: 'SOV', delta: -20 },
          { t: 'stability', nation: 'SOV', delta: -8 },
          { t: 'tension', delta: -8 },
          {
            t: 'report',
            to: 'GER',
            kind: 'diplomatic',
            title: 'Armistice in the East',
            body: 'Moscow has signed. The Ukraine, Byelorussia, and the Caucasus pass under German control; the residual Soviet state withdraws beyond the Volga.',
          },
          {
            t: 'chronicle',
            divergence: true,
            text: 'Here history turned: a second Brest-Litovsk was signed, and the revolution\'s state shrank to the forests and foundries beyond the Volga.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 11. Succession: Molotov. Queued by covert.ts via leaders.ts eventId;
  //     never fires on its own.
  // -------------------------------------------------------------------------
  {
    id: id('succession-molotov'),
    title: 'The Committee of Survivors',
    nation: 'SOV',
    fires: { t: 'never' },
    once: true,
    priority: 9,
    text:
      'ANNOUNCEMENT of the Central Committee. Comrade Stalin is dead. By the unanimous will of the Party, ' +
      'Comrade Molotov assumes the chairmanship of the Council of People\'s Commissars. The apparatus holds ' +
      'its breath: every man in the building owes his place to the dead man and his file to the organs. The ' +
      'new chairman speaks for forty minutes on continuity and vigilance and never once uses the past tense ' +
      'of his predecessor. The Moscow garrison has been doubled. The question in every corridor is what the ' +
      'committee will do with the machine it inherits.',
    choices: [
      {
        label: 'Continuity and vigilance',
        detail: 'Nothing changes, and everyone is watched while it does not.',
        aiWeight: 3,
        effects: [
          { t: 'stability', nation: 'SOV', delta: -8 },
          { t: 'warSupport', nation: 'SOV', delta: -3 },
          {
            t: 'report',
            to: 'SOV',
            kind: 'domestic',
            title: 'The committee holds',
            body: 'The transition passes without arrests and without reforms. The apparatus waits to learn which it should fear.',
          },
        ],
      },
      {
        label: 'Blame the organs; open the officer files',
        detail: 'The excesses were the executioners\' excess. Rehabilitate the purged commanders and rebuild the corps.',
        aiWeight: 2,
        effects: [
          { t: 'tech', nation: 'SOV', track: 'doctrine', delta: 1 },
          { t: 'stability', nation: 'SOV', delta: -3 },
          {
            t: 'chronicle',
            divergence: true,
            text: 'With the Vozhd gone, the surviving officers came back from the camps to their commands.',
          },
        ],
      },
      {
        label: 'Feel toward the West',
        detail: 'The committee needs quiet frontiers and open ledgers more than it needs doctrine.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'SOV', b: 'UK', delta: 15 },
          { t: 'relations', a: 'SOV', b: 'USA', delta: 15 },
          { t: 'setAI', nation: 'SOV', patch: { ideologyZeal: 0.3 } },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 12. Succession: the Zhukov junta. Queued by covert.ts; never self-fires.
  // -------------------------------------------------------------------------
  {
    id: id('succession-zhukov-junta'),
    title: 'The Marshals Take the Watch',
    nation: 'SOV',
    fires: { t: 'never' },
    once: true,
    priority: 9,
    text:
      'BULLETIN. Comrade Stalin is dead. The Politburo\'s session ended without a chairman; it ended with ' +
      'soldiers at the doors. A Military Committee under Zhukov assumes emergency powers, pledging to ' +
      'defend the Union and to convene the Party in due course. The central apparatus of the NKVD has been ' +
      'confined to barracks by troops of the Moscow Military District. The marshals inherit a purged army, ' +
      'a frightened party, and a war economy. Their first orders will say what kind of regime this is to be.',
    choices: [
      {
        label: 'The army rebuilds itself first',
        detail: 'Academies reopened, the purged recalled, the commissars subordinated to the commanders.',
        aiWeight: 3,
        effects: [
          { t: 'tech', nation: 'SOV', track: 'doctrine', delta: 1 },
          { t: 'stability', nation: 'SOV', delta: -5 },
          {
            t: 'report',
            to: 'SOV',
            kind: 'domestic',
            title: 'The junta rebuilds the corps',
            body: 'The Military Committee\'s first decrees recall cashiered officers and strip the political sections of their veto.',
          },
        ],
      },
      {
        label: 'Reconcile with the Party; share the watch',
        detail: 'The marshals rule with the survivors, not over them. Slower reform, steadier state.',
        aiWeight: 2,
        effects: [
          { t: 'stability', nation: 'SOV', delta: 8 },
          { t: 'warSupport', nation: 'SOV', delta: 4 },
          {
            t: 'chronicle',
            text: 'The soldiers and the survivors divided the watch between them, and the state held.',
          },
        ],
      },
    ],
  },
];
