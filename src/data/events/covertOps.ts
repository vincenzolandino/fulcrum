// Covert operations event pack: what the world does after the knife falls.
// Aftermath chains for assassinated leaders (HITLER_DEAD, STALIN_DEAD raised
// by engine/covert.ts succession), blowback crises keyed on the engine's
// COVERT_BLOWBACK_{owner}_{target} flags, and consolidation events for
// covert-coup regimes (signature: a major flipped to faction 'neutral' with
// coup-level stability — only engine/covert.ts resolveCoup produces that).
//
// Pure data against the Condition/Effect DSL in engine/types.ts. Cross-pack
// flags come from the registry; flags prefixed COV_ below are internal to
// this pack (other packs may read them).
//
// Chain wiring: the lead event of each chain fires on the death flag; every
// choice queues the next link (delay 1) so the crisis unfolds across turns.
// Links also carry anchored `fires` conditions (death flag + eventFired
// predecessor) so the chain survives even if a queue entry is lost; once:true
// keeps the two paths from double-firing.

import type { GameEvent } from '../../engine/types';
import { FLAGS, blowbackFlag } from './registry';

// Pack-internal flags (set here; readable by anyone).
/** Berlin's post-assassination government blamed a foreign hand. */
const COV_GER_BLAME_ABROAD = 'COV_GER_BLAME_ABROAD';
/** The German army extracted political concessions during the succession. */
const COV_GER_ARMY_ASCENDANT = 'COV_GER_ARMY_ASCENDANT';
/** The security organs won the Soviet succession struggle. */
const COV_SOV_ORGANS_ASCENDANT = 'COV_SOV_ORGANS_ASCENDANT';
// War-justification flags: the offended power has a public casus belli from a
// blown foreign operation. AI/content may read these to weight a DoW.
const COV_CASUS_GER_SOV = 'COV_CASUS_GER_SOV';
const COV_CASUS_SOV_GER = 'COV_CASUS_SOV_GER';
const COV_CASUS_GER_UK = 'COV_CASUS_GER_UK';
const COV_CASUS_USA_JAP = 'COV_CASUS_USA_JAP';

export const COVERT_EVENTS: GameEvent[] = [
  // ==========================================================================
  // HITLER DEAD — three-event crisis chain.
  // Link 1: the succession struggle inside the regime.
  // ==========================================================================
  {
    id: 'cov-hitler-dead-succession',
    title: 'The State Without Its Master',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'GER' },
        { t: 'flag', key: FLAGS.HITLER_DEAD },
      ],
    },
    once: true,
    priority: 9,
    text:
      'Circular of the Foreign Ministry press section, one hour ahead of the radio announcement, most ' +
      'secret. The Führer is dead. The communique will speak of a sudden collapse; the government ' +
      'quarter, which has doubled its guard overnight, says otherwise and says it quietly. The decree ' +
      'of succession is being read behind locked doors to men who each believed it named them. The ' +
      'Berlin garrison is confined to barracks, which may be obedience or may be positioning. Every ' +
      'ministry waits to learn whose signature now moves the state. Abroad, the chanceries hold their ' +
      'cables and count the divisions on the frontiers.',
    choices: [
      {
        label: 'Order above all',
        detail: 'A state funeral, a sealed archive, and the apparatus closes ranks behind the heir.',
        aiWeight: 4,
        effects: [
          { t: 'stability', nation: 'GER', delta: 4 },
          { t: 'warSupport', nation: 'GER', delta: -3 },
          {
            t: 'report', to: 'player', kind: 'intel',
            title: 'Succession in Berlin',
            body: 'The German head of state is dead. The regime has closed ranks behind a successor; the transfer of power appears orderly, so far.',
          },
          { t: 'queueEvent', id: 'cov-hitler-dead-army', delay: 1 },
        ],
      },
      {
        label: 'Proclaim a foreign hand',
        detail: 'Legitimacy through accusation. Name no country yet; let every rival wonder.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: COV_GER_BLAME_ABROAD, value: true },
          { t: 'warSupport', nation: 'GER', delta: 6 },
          { t: 'tension', delta: 4 },
          { t: 'relations', a: 'GER', b: 'SOV', delta: -10 },
          { t: 'relations', a: 'GER', b: 'UK', delta: -10 },
          {
            t: 'chronicle',
            text: 'The new masters of Berlin announced that foreign assassins had killed their leader, and made the accusation a foundation of the state.',
            divergence: true,
          },
          {
            t: 'report', to: 'player', kind: 'intel',
            title: 'Berlin Cries Murder',
            body: 'The German government has declared its late leader the victim of a foreign conspiracy. No power is yet named. Frontier garrisons are reinforcing.',
          },
          { t: 'queueEvent', id: 'cov-hitler-dead-army', delay: 1 },
        ],
      },
      {
        label: 'Settle the succession by force',
        detail: 'The rival claimants are arrested tonight. The state is cleaner for it, and weaker.',
        aiWeight: 1,
        effects: [
          { t: 'stability', nation: 'GER', delta: -8 },
          { t: 'armyStrength', nation: 'GER', delta: -4 },
          { t: 'tension', delta: 2 },
          {
            t: 'chronicle',
            text: 'The German succession was decided in courtyards and cellars. The regime that emerged had fewer rivals and fewer friends.',
            divergence: true,
          },
          {
            t: 'report', to: 'player', kind: 'intel',
            title: 'Purge in Berlin',
            body: 'Arrests have followed the death of the German leader. Several senior figures of party and state have not been seen in public since the announcement.',
          },
          { t: 'queueEvent', id: 'cov-hitler-dead-army', delay: 1 },
        ],
      },
    ],
  },

  // Link 2: the army's loyalties.
  {
    id: 'cov-hitler-dead-army',
    title: 'The Oath in Question',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'GER' },
        { t: 'flag', key: FLAGS.HITLER_DEAD },
        { t: 'eventFired', id: 'cov-hitler-dead-succession' },
      ],
    },
    once: true,
    priority: 8,
    text:
      'Memorandum of the Army High Command, personal and confidential, to the new Chancellery. The ' +
      'soldier\'s oath was sworn to a man, and the man is dead. The question is now before every ' +
      'headquarters from the Rhine to the frontier districts: to whom does the Army answer. Field ' +
      'commanders report their formations steady but their officer messes loud. The security leadership ' +
      'proposes joint commissions attached to each command; the general staff declines to define what ' +
      'that would mean. A state that cannot answer the oath question by month\'s end will find the Army ' +
      'answering it alone.',
    choices: [
      {
        label: 'The Army swears to the new order',
        detail: 'A new oath, sworn formation by formation, and the state confirmed in its barracks.',
        aiWeight: 4,
        effects: [
          { t: 'stability', nation: 'GER', delta: 4 },
          { t: 'armyStrength', nation: 'GER', delta: 2 },
          { t: 'queueEvent', id: 'cov-hitler-dead-abroad', delay: 1 },
        ],
      },
      {
        label: 'The generals name their price',
        detail: 'The oath is given in exchange for the Army\'s primacy in war policy.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: COV_GER_ARMY_ASCENDANT, value: true },
          { t: 'armyStrength', nation: 'GER', delta: 6 },
          { t: 'stability', nation: 'GER', delta: -4 },
          {
            t: 'chronicle',
            text: 'The German army sold its allegiance to the new regime at a price: the conduct of war passed from the party to the general staff.',
            divergence: true,
          },
          { t: 'queueEvent', id: 'cov-hitler-dead-abroad', delay: 1 },
        ],
      },
      {
        label: 'Commissions into the headquarters',
        detail: 'Political officers beside every commander. Obedience is verified, not assumed.',
        aiWeight: 1,
        effects: [
          { t: 'armyStrength', nation: 'GER', delta: -6 },
          { t: 'stability', nation: 'GER', delta: 2 },
          { t: 'warSupport', nation: 'GER', delta: 2 },
          {
            t: 'chronicle',
            text: 'The new Berlin set watchers over its own generals, trading skill at the front for certainty at headquarters.',
            divergence: true,
          },
          { t: 'queueEvent', id: 'cov-hitler-dead-abroad', delay: 1 },
        ],
      },
    ],
  },

  // Link 3: the foreign chanceries respond.
  {
    id: 'cov-hitler-dead-abroad',
    title: 'The Chanceries Answer',
    nation: 'global',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'GER' },
        { t: 'flag', key: FLAGS.HITLER_DEAD },
        { t: 'eventFired', id: 'cov-hitler-dead-army' },
      ],
    },
    once: true,
    priority: 7,
    text:
      'Survey of foreign press and cable traffic, prepared for circulation to all missions. London: the ' +
      'Foreign Office counsels reserve; the City rallies. Paris: the Quai d\'Orsay asks whether a ' +
      'Germany without its master is safer or merely stranger. Moscow: silence at the commissariat, ' +
      'troop movements none. Washington: the President declines comment beyond condolence in form. ' +
      'Every general staff in Europe has asked its intelligence service the same question this week: ' +
      'does the new Berlin want what the old Berlin wanted. No service has yet answered with ' +
      'confidence.',
    choices: [
      {
        label: 'Watch and verify',
        detail: 'The powers adopt reserve. Judgments are suspended; attaches are reinforced.',
        aiWeight: 4,
        effects: [
          { t: 'tension', delta: -4 },
          { t: 'relations', a: 'GER', b: 'UK', delta: 5 },
          { t: 'relations', a: 'GER', b: 'FRA', delta: 5 },
          {
            t: 'report', to: 'GER', kind: 'diplomatic',
            title: 'Foreign Reserve',
            body: 'The foreign chanceries have taken a waiting posture toward the new government. No recognition is withheld; no warmth is offered.',
          },
        ],
      },
      {
        label: 'Test the new men with an offer',
        detail: 'Quiet soundings from London and Paris: normalization, if Berlin will define its aims.',
        available: { t: 'not', c: { t: 'atWar', a: 'GER', b: 'UK' } },
        aiWeight: 2,
        effects: [
          { t: 'relations', a: 'GER', b: 'UK', delta: 12 },
          { t: 'relations', a: 'GER', b: 'FRA', delta: 8 },
          { t: 'relations', a: 'GER', b: 'USA', delta: 5 },
          { t: 'tension', delta: -6 },
          {
            t: 'chronicle',
            text: 'The Western powers chose to treat with the successor regime in Berlin, wagering that the appetite had died with the man.',
            divergence: true,
          },
          {
            t: 'report', to: 'GER', kind: 'diplomatic',
            title: 'Soundings from the West',
            body: 'Intermediaries carry word that London and Paris would discuss a general settlement with the new government, terms unspecified.',
          },
        ],
      },
      {
        label: 'Close ranks against the Reich',
        detail: 'The succession changes the portrait, not the program. The cordon tightens.',
        aiWeight: 1,
        effects: [
          { t: 'tension', delta: 6 },
          { t: 'relations', a: 'GER', b: 'UK', delta: -8 },
          { t: 'relations', a: 'GER', b: 'FRA', delta: -8 },
          { t: 'relations', a: 'GER', b: 'SOV', delta: -5 },
          {
            t: 'report', to: 'GER', kind: 'diplomatic',
            title: 'The Cordon Holds',
            body: 'Foreign ministries have concluded that German policy survives its author. Staff conversations among the Western powers have quietly resumed.',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // STALIN DEAD — three-event crisis chain.
  // Link 1: the struggle inside the Kremlin.
  // ==========================================================================
  {
    id: 'cov-stalin-dead-struggle',
    title: 'Silence at the Kremlin',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'SOV' },
        { t: 'flag', key: FLAGS.STALIN_DEAD },
      ],
    },
    once: true,
    priority: 9,
    text:
      'Flash traffic, all residencies, most urgent. Moscow radio has played solemn music since four ' +
      'this morning. The announcement, when it comes, is eleven words long. The General Secretary is ' +
      'dead. No cause is offered. The Politburo has not been photographed together in six days. The ' +
      'commissariat of internal affairs has sealed the Kremlin district and is arresting men whose ' +
      'names appear on no list anyone admits writing. The marshals are in their military districts, ' +
      'which is either loyalty or distance. Whoever emerges will inherit the apparatus, the camps, the ' +
      'army the purges left behind, and every file the old man kept.',
    choices: [
      {
        label: 'Collective leadership',
        detail: 'A committee of survivors. No single heir, no single target.',
        aiWeight: 4,
        effects: [
          { t: 'stability', nation: 'SOV', delta: 4 },
          { t: 'warSupport', nation: 'SOV', delta: -2 },
          {
            t: 'report', to: 'GER', kind: 'intel',
            title: 'Succession in Moscow',
            body: 'The Soviet leadership has settled into a collective arrangement. Attaches judge the new center cautious and inward-looking, for the present.',
          },
          {
            t: 'report', to: 'player', kind: 'intel',
            title: 'The Vozhd Is Dead',
            body: 'The Soviet head of state is dead. A committee of the surviving leadership has assumed power in Moscow without visible disorder.',
          },
          { t: 'queueEvent', id: 'cov-stalin-dead-army', delay: 1 },
        ],
      },
      {
        label: 'The organs move first',
        detail: 'The security commissariat holds the files and the cells. It proposes to hold the state.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: COV_SOV_ORGANS_ASCENDANT, value: true },
          { t: 'stability', nation: 'SOV', delta: -6 },
          { t: 'warSupport', nation: 'SOV', delta: 2 },
          { t: 'tension', delta: 2 },
          {
            t: 'chronicle',
            text: 'In the scramble after the Vozhd, the secret police reached the levers first. The Union passed from one fear to another.',
            divergence: true,
          },
          {
            t: 'report', to: 'player', kind: 'intel',
            title: 'The Organs Take Moscow',
            body: 'Reports from Moscow indicate the security apparatus has emerged dominant from the succession. Arrests continue at senior levels.',
          },
          { t: 'queueEvent', id: 'cov-stalin-dead-army', delay: 1 },
        ],
      },
      {
        label: 'Recall the condemned',
        detail: 'Rehabilitation. The surviving purged officers return to duty; the state admits nothing.',
        aiWeight: 2,
        effects: [
          { t: 'tech', nation: 'SOV', track: 'doctrine', delta: 1 },
          { t: 'stability', nation: 'SOV', delta: -2 },
          {
            t: 'chronicle',
            text: 'The new leadership quietly emptied the special camps of officers. The doctrine the purge had buried came back to work.',
            divergence: true,
          },
          {
            t: 'report', to: 'player', kind: 'intel',
            title: 'Quiet Rehabilitations',
            body: 'Officers condemned in the Soviet purges are reappearing at their desks. The new Moscow leadership is rebuilding its command experience.',
          },
          { t: 'queueEvent', id: 'cov-stalin-dead-army', delay: 1 },
        ],
      },
    ],
  },

  // Link 2: the army's position.
  {
    id: 'cov-stalin-dead-army',
    title: 'The Marshals\' Hour',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'SOV' },
        { t: 'flag', key: FLAGS.STALIN_DEAD },
        { t: 'eventFired', id: 'cov-stalin-dead-struggle' },
      ],
    },
    once: true,
    priority: 8,
    text:
      'Appreciation by the military committee, restricted. The Red Army buried more of its own ' +
      'commanders in the purge years than any battle since has taken. The men who survived learned ' +
      'silence; the question is what else they learned. District commanders have wired their loyalty ' +
      'to the new leadership in language a lawyer would admire. The committee must decide what the ' +
      'army is owed for it: rehabilitation of the condemned, money and equipment, or another lesson in ' +
      'obedience. Each answer builds a different army, and the frontier does not wait.',
    choices: [
      {
        label: 'The army stands with the committee',
        detail: 'Loyalty acknowledged, commands confirmed, no scores settled in either direction.',
        aiWeight: 3,
        effects: [
          { t: 'stability', nation: 'SOV', delta: 3 },
          { t: 'armyStrength', nation: 'SOV', delta: 3 },
          { t: 'queueEvent', id: 'cov-stalin-dead-abroad', delay: 1 },
        ],
      },
      {
        label: 'Pay the army its arrears',
        detail: 'Equipment, fuel, and autonomy for the military districts. The party budget bleeds.',
        aiWeight: 2,
        effects: [
          { t: 'armyStrength', nation: 'SOV', delta: 6 },
          { t: 'stability', nation: 'SOV', delta: -2 },
          { t: 'queueEvent', id: 'cov-stalin-dead-abroad', delay: 1 },
        ],
      },
      {
        label: 'Another lesson in obedience',
        detail: 'The districts that wired last are inspected first. The apparatus reminds the army who rules.',
        aiWeight: 1,
        effects: [
          { t: 'armyStrength', nation: 'SOV', delta: -6 },
          { t: 'stability', nation: 'SOV', delta: 3 },
          { t: 'tension', delta: 1 },
          {
            t: 'chronicle',
            text: 'The new Moscow leadership reached for the old instrument and purged again. The army obeyed, and remembered.',
            divergence: true,
          },
          { t: 'queueEvent', id: 'cov-stalin-dead-abroad', delay: 1 },
        ],
      },
    ],
  },

  // Link 3: the world prices the succession.
  {
    id: 'cov-stalin-dead-abroad',
    title: 'Opportunity, Read in Foreign Capitals',
    nation: 'global',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'SOV' },
        { t: 'flag', key: FLAGS.STALIN_DEAD },
        { t: 'eventFired', id: 'cov-stalin-dead-army' },
      ],
    },
    once: true,
    priority: 7,
    text:
      'Intelligence summary for the incoming leadership, single copy. Foreign staffs are pricing the ' +
      'succession. Berlin\'s military attaches have asked to tour the western districts twice this ' +
      'month; the requests are politer than usual, which is noted. Tokyo has reinforced nothing yet ' +
      'but has photographed everything. London signals, through channels it believes subtle, that a ' +
      'Union less revolutionary would find credit and friends. The question every chancery weighs is ' +
      'the same: whether the Union after the Vozhd is a wounded state or merely a quieter one.',
    choices: [
      {
        label: 'The predators hold their breath',
        detail: 'No power moves against an unknown. The frontier stays quiet while the files are read.',
        aiWeight: 3,
        effects: [
          { t: 'tension', delta: -3 },
          { t: 'relations', a: 'SOV', b: 'UK', delta: 5 },
          {
            t: 'report', to: 'SOV', kind: 'intel',
            title: 'Foreign Staffs Stand Down',
            body: 'The residencies report that foreign general staffs studied the frontier during the succession and, for now, filed their studies away.',
          },
        ],
      },
      {
        label: 'Berlin presses the frontier question',
        detail: 'The Reich reads weakness in the interregnum and lets Moscow know it.',
        available: {
          t: 'and',
          c: [
            { t: 'alive', nation: 'GER' },
            { t: 'not', c: { t: 'atWar', a: 'GER', b: 'SOV' } },
            { t: 'strengthRatio', a: 'GER', b: 'SOV', atLeast: 1.2 },
          ],
        },
        aiWeight: 2,
        effects: [
          { t: 'relations', a: 'GER', b: 'SOV', delta: -15 },
          { t: 'warSupport', nation: 'GER', delta: 3 },
          { t: 'tension', delta: 6 },
          {
            t: 'chronicle',
            text: 'Berlin treated the Soviet succession as an invitation, and the frontier grew loud with demands.',
            divergence: true,
          },
          {
            t: 'report', to: 'SOV', kind: 'diplomatic',
            title: 'German Pressure in the Interregnum',
            body: 'Berlin has raised frontier and trade questions in terms chosen to be read as a test. The attaches count our divisions openly.',
          },
        ],
      },
      {
        label: 'Tokyo probes the Amur',
        detail: 'The Kwantung Army asks whether the Far Eastern garrisons still have orders.',
        available: {
          t: 'and',
          c: [
            { t: 'alive', nation: 'JAP' },
            { t: 'not', c: { t: 'atWar', a: 'JAP', b: 'SOV' } },
          ],
        },
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'JAP', b: 'SOV', delta: -12 },
          { t: 'tension', delta: 4 },
          {
            t: 'report', to: 'SOV', kind: 'front',
            title: 'Incidents on the Amur',
            body: 'Japanese patrols have tested the Far Eastern frontier at three points since the announcement from Moscow. Garrison commanders request instructions.',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // BLOWBACK — a blown operation becomes a public affair. The offended power
  // chooses what the scandal is for: outrage, silence, or war.
  // ==========================================================================
  {
    id: 'cov-blowback-sov-ger',
    title: 'Arrests in the Government Quarter',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'GER' },
        { t: 'alive', nation: 'SOV' },
        { t: 'flag', key: blowbackFlag('SOV', 'GER') },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'SOV' } },
      ],
    },
    once: true,
    priority: 6,
    text:
      'Report of the secret state police to the Chancellery. The apparatus rolled up in the capital ' +
      'this week was Soviet, professionally run, and larger than assumed. Three radio sets, a courier ' +
      'line through Prague, and a paymaster attached to the trade delegation are in hand. Two of the ' +
      'arrested hold positions in the armaments administration. Moscow\'s embassy has denied knowledge ' +
      'in terms so uniform they were plainly rehearsed. The material is sufficient for a public trial, ' +
      'a private bargain, or a lesson administered in kind. The choice is political and is referred ' +
      'upward.',
    choices: [
      {
        label: 'Put it in every newspaper',
        detail: 'A show trial and a press campaign. Moscow\'s hand, photographed and captioned.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: COV_CASUS_GER_SOV, value: true },
          { t: 'warSupport', nation: 'GER', delta: 4 },
          { t: 'relations', a: 'GER', b: 'SOV', delta: -12 },
          { t: 'tension', delta: 3 },
          {
            t: 'report', to: 'SOV', kind: 'diplomatic',
            title: 'Berlin Publishes the Affair',
            body: 'The German government has staged the captured residency before the press and names our service directly. The affair is now a standing grievance.',
          },
        ],
      },
      {
        label: 'Trade in silence',
        detail: 'Expulsions without communique. The bargain: our men in their cells come home.',
        aiWeight: 2,
        effects: [
          { t: 'tension', delta: -1 },
          { t: 'spyNetwork', owner: 'GER', target: 'SOV', delta: 5 },
          {
            t: 'report', to: 'SOV', kind: 'covert',
            title: 'A Quiet Settlement in Berlin',
            body: 'Berlin has handled the arrests without publicity and signaled interest in an exchange. The affair stays out of the press, for a price.',
          },
        ],
      },
      {
        label: 'Answer in kind',
        detail: 'The services are unleashed. What was done to us will be done back, and not only by us.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: FLAGS.AI_COVERT_AGGRESSIVE, value: true },
          { t: 'spyNetwork', owner: 'GER', target: 'SOV', delta: 10 },
          { t: 'tension', delta: 2 },
          {
            t: 'chronicle',
            text: 'After the Berlin arrests the services went to war years before the armies did, and every capital learned to check under its own floorboards.',
            divergence: true,
          },
        ],
      },
      {
        label: 'War on the strength of it',
        detail: 'The provocation is sufficient and the balance favorable. The frontier answers for the cellar.',
        available: { t: 'strengthRatio', a: 'GER', b: 'SOV', atLeast: 1.3 },
        aiWeight: 1,
        effects: [
          { t: 'declareWar', attacker: 'GER', defender: 'SOV' },
          {
            t: 'chronicle',
            text: 'A spy scandal did what diplomacy had circled for years: Germany went to war with the Soviet Union over a cellar full of radio sets.',
            divergence: true,
          },
          {
            t: 'report', to: 'SOV', kind: 'front',
            title: 'Germany Declares War',
            body: 'Berlin has declared war, citing the espionage affair as proof of hostile intent. German formations are crossing the frontier.',
          },
        ],
      },
    ],
  },

  {
    id: 'cov-blowback-ger-sov',
    title: 'The Lubyanka Announces',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'SOV' },
        { t: 'alive', nation: 'GER' },
        { t: 'flag', key: blowbackFlag('GER', 'SOV') },
        { t: 'not', c: { t: 'atWar', a: 'SOV', b: 'GER' } },
      ],
    },
    once: true,
    priority: 6,
    text:
      'To the Politburo, from the commissariat of internal affairs. The German network taken this ' +
      'month operated in the rail directorates and the Kirov works. Its instructions, decoded, concern ' +
      'mobilization schedules and the western garrisons. The residency\'s chief died under questioning ' +
      'before signing a statement; his deputy signed everything put before him, which reduces the ' +
      'statement\'s value abroad. The organs can stage a trial the world will watch, bury the affair ' +
      'and work the survivors back against Berlin, or treat the file as grounds for measures no note ' +
      'verbale can answer.',
    choices: [
      {
        label: 'A trial before the world',
        detail: 'Open court, foreign correspondents seated. The confession will be word-perfect.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: COV_CASUS_SOV_GER, value: true },
          { t: 'stability', nation: 'SOV', delta: 3 },
          { t: 'relations', a: 'SOV', b: 'GER', delta: -12 },
          { t: 'tension', delta: 3 },
          {
            t: 'report', to: 'GER', kind: 'diplomatic',
            title: 'Moscow Stages a Trial',
            body: 'The captured network is before an open court in Moscow, our service named in the indictment. The proceedings are broadcast abroad.',
          },
        ],
      },
      {
        label: 'Bury it and turn them',
        detail: 'No trial. The survivors transmit what we compose, and Berlin trusts its own ears.',
        aiWeight: 2,
        effects: [
          { t: 'spyNetwork', owner: 'SOV', target: 'GER', delta: 8 },
          { t: 'tension', delta: -1 },
        ],
      },
      {
        label: 'Measures beyond protest',
        detail: 'The file is a warrant. The western districts move to war readiness first.',
        available: { t: 'strengthRatio', a: 'SOV', b: 'GER', atLeast: 1.3 },
        aiWeight: 1,
        effects: [
          { t: 'declareWar', attacker: 'SOV', defender: 'GER' },
          {
            t: 'chronicle',
            text: 'Moscow read the captured German traffic as the preface to invasion and chose to write the first chapter itself.',
            divergence: true,
          },
          {
            t: 'report', to: 'GER', kind: 'front',
            title: 'Soviet Declaration of War',
            body: 'Moscow has declared war, citing captured espionage traffic as proof of an intended attack. Soviet columns are moving on the frontier.',
          },
        ],
      },
    ],
  },

  {
    id: 'cov-blowback-uk-ger',
    title: 'An Incident at the Frontier',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'GER' },
        { t: 'alive', nation: 'UK' },
        { t: 'flag', key: blowbackFlag('UK', 'GER') },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'UK' } },
      ],
    },
    once: true,
    priority: 6,
    text:
      'Note by the Foreign Ministry, England desk. The two British officers seized at the border ' +
      'crossing carried papers naming half their service\'s continental apparatus, a generosity of ' +
      'documentation the interrogators still distrust. London has said nothing publicly and asked, ' +
      'through The Hague, for a quiet resolution. The security services propose a press campaign: the ' +
      'Empire\'s hand caught inside the Reich, photographs supplied. The diplomats observe that a ' +
      'Britain humiliated is a Britain harder to divide from France. The prisoners, meanwhile, are ' +
      'proving conversational on questions of organization.',
    choices: [
      {
        label: 'Parade the prisoners',
        detail: 'Press conference, photographs, a white book for the neutrals. London answers in public.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: COV_CASUS_GER_UK, value: true },
          { t: 'warSupport', nation: 'GER', delta: 4 },
          { t: 'relations', a: 'GER', b: 'UK', delta: -12 },
          { t: 'tension', delta: 3 },
          {
            t: 'report', to: 'UK', kind: 'diplomatic',
            title: 'Berlin Exhibits the Officers',
            body: 'The two officers are before the German press, our service named. The neutrals have been circulated a documented account. Denial is no longer a policy.',
          },
        ],
      },
      {
        label: 'A discreet exchange',
        detail: 'The Hague channel is answered. The affair closes without a communique.',
        aiWeight: 2,
        effects: [
          { t: 'relations', a: 'GER', b: 'UK', delta: 6 },
          { t: 'tension', delta: -2 },
          {
            t: 'report', to: 'UK', kind: 'covert',
            title: 'The Hague Channel Answers',
            body: 'Berlin has agreed to resolve the frontier affair quietly. The men will come home; the file will not surface. A debt of discretion is implied.',
          },
        ],
      },
      {
        label: 'Feed them a false picture',
        detail: 'The captured apparatus keeps transmitting, under new management. London reads what we write.',
        aiWeight: 1,
        effects: [
          { t: 'spyNetwork', owner: 'GER', target: 'UK', delta: 10 },
          {
            t: 'chronicle',
            text: 'The captured British network in Germany ran on for years as an instrument of its captors, and London banked its fictions as fact.',
            divergence: true,
          },
        ],
      },
    ],
  },

  {
    id: 'cov-blowback-jap-usa',
    title: 'A Ring Broken on the Coast',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'USA' },
        { t: 'alive', nation: 'JAP' },
        { t: 'flag', key: blowbackFlag('JAP', 'USA') },
        { t: 'not', c: { t: 'atWar', a: 'USA', b: 'JAP' } },
      ],
    },
    once: true,
    priority: 6,
    text:
      'Memorandum for the President, from the Bureau. The espionage ring broken this week on the ' +
      'Pacific coast reported to Tokyo through the consulate and a shipping line\'s code room. Its ' +
      'product: berthing schedules at the fleet anchorage, aircraft deliveries, and the yard capacity ' +
      'studies of three builders. Arrests total eleven, two holding reserve commissions. The Attorney ' +
      'General can carry indictments to open court; the Navy prefers silence and doubled ' +
      'counterintelligence. Congress, if the papers reach it, will ask why the fleet\'s timetables ' +
      'read so easily in a foreign capital. Publicity is a weapon that points both ways.',
    choices: [
      {
        label: 'Hearings and headlines',
        detail: 'Open indictments. The country learns what Tokyo wanted and why.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: COV_CASUS_USA_JAP, value: true },
          { t: 'warSupport', nation: 'USA', delta: 5 },
          { t: 'relations', a: 'USA', b: 'JAP', delta: -12 },
          { t: 'tension', delta: 3 },
          {
            t: 'report', to: 'JAP', kind: 'diplomatic',
            title: 'The Ring Is in the Papers',
            body: 'Washington has indicted the coastal network in open court and names our service. The American press has taken up the affair at length.',
          },
        ],
      },
      {
        label: 'The embargo argument',
        detail: 'The scandal carries the export-control bill. Oil and scrap steel stop at the docks.',
        available: { t: 'relations', a: 'USA', b: 'JAP', below: -20 },
        aiWeight: 2,
        effects: [
          { t: 'flag', key: FLAGS.EMBARGO_JAPAN, value: true },
          { t: 'relations', a: 'USA', b: 'JAP', delta: -15 },
          { t: 'tension', delta: 4 },
          {
            t: 'chronicle',
            text: 'A spy scandal, not a war, closed the American docks to Japan. The embargo arrived early, carried on a wave of headlines.',
            divergence: true,
          },
          {
            t: 'report', to: 'JAP', kind: 'diplomatic',
            title: 'Washington Halts Strategic Exports',
            body: 'The United States has embargoed oil and scrap steel shipments, citing the espionage affair. The fleet\'s fuel calculus changes from this week.',
          },
        ],
      },
      {
        label: 'Handle it in camera',
        detail: 'Sealed proceedings. The Navy gets its silence and the Bureau gets its budget.',
        aiWeight: 1,
        effects: [
          { t: 'spyNetwork', owner: 'USA', target: 'JAP', delta: 10 },
          { t: 'tension', delta: -1 },
          {
            t: 'report', to: 'JAP', kind: 'covert',
            title: 'Quiet on the Coast',
            body: 'The arrests on the American coast have produced no trial and no communique. What Washington learned, and from whom, is not established.',
          },
        ],
      },
    ],
  },

  // ==========================================================================
  // COUP AFTERMATH — a covert-sponsored coup leaves a major stripped to
  // faction 'neutral' at coup-level stability (engine/covert.ts resolveCoup).
  // The new regime decides what it is for.
  // ==========================================================================
  {
    id: 'cov-coup-aftermath-ger',
    title: 'The New Men in Berlin',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'GER' },
        { t: 'faction', nation: 'GER', is: 'neutral' },
        { t: 'stability', nation: 'GER', below: 45 },
      ],
    },
    once: true,
    priority: 7,
    text:
      'Proclamation of the provisional government, and what the missions report beneath it. Berlin is ' +
      'quiet; the quiet is enforced. The new men hold the radio, the ministries, and most of the ' +
      'garrisons; the old movement holds meeting halls, some police districts, and a grievance. ' +
      'Foreign sponsorship is suspected in every capital and proven in none. The provisional ' +
      'government must now choose what it is: a caretaker seeking readmission to Europe, a restoration ' +
      'of the old alignments under new management, or a garrison state that answers to nobody. Each ' +
      'choice forfeits the others.',
    choices: [
      {
        label: 'Consolidate and normalize',
        detail: 'Amnesty at home, soundings abroad. The provisional government seeks recognition, not glory.',
        aiWeight: 3,
        effects: [
          { t: 'stability', nation: 'GER', delta: 6 },
          { t: 'tension', delta: -3 },
          { t: 'relations', a: 'GER', b: 'UK', delta: 8 },
          { t: 'relations', a: 'GER', b: 'FRA', delta: 8 },
          { t: 'relations', a: 'GER', b: 'USA', delta: 5 },
          {
            t: 'report', to: 'player', kind: 'diplomatic',
            title: 'Berlin Seeks Normalization',
            body: 'The provisional German government has offered assurances to the powers and asked for recognition. Its army stays in barracks, so far.',
          },
        ],
      },
      {
        label: 'Back to the old banners',
        detail: 'The alignment survives the men who made it. The revolution was a change of drivers.',
        aiWeight: 2,
        effects: [
          { t: 'joinFaction', nation: 'GER', faction: 'axis' },
          { t: 'stability', nation: 'GER', delta: -4 },
          { t: 'warSupport', nation: 'GER', delta: 4 },
          { t: 'tension', delta: 3 },
          {
            t: 'chronicle',
            text: 'The coup in Berlin changed the men and kept the map. Within a season the new government had resumed the old alignments.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Armed and apart',
        detail: 'No bloc, no sponsors, no debts. Germany rearms its neutrality.',
        aiWeight: 2,
        effects: [
          { t: 'armyStrength', nation: 'GER', delta: 5 },
          { t: 'stability', nation: 'GER', delta: 2 },
          { t: 'tension', delta: -1 },
          {
            t: 'chronicle',
            text: 'Post-coup Germany declared for no camp and armed against all of them, a heavily garrisoned question mark in the center of Europe.',
            divergence: true,
          },
        ],
      },
    ],
  },

  {
    id: 'cov-coup-aftermath-sov',
    title: 'The Committee Holds the Union',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'SOV' },
        { t: 'faction', nation: 'SOV', is: 'neutral' },
        { t: 'stability', nation: 'SOV', below: 45 },
      ],
    },
    once: true,
    priority: 7,
    text:
      'Assessment prepared for the new committee, single copy, no distribution. The Union has changed ' +
      'hands without changing shape. The party apparatus obeys because it has always obeyed; the ' +
      'question is what it obeys now that the doctrine is negotiable. Three republics have petitioned ' +
      'for clarifications no one can yet give. The army holds the frontiers and asks for orders. ' +
      'Abroad, the movement\'s foreign sections wait to learn whether the revolution still has a ' +
      'headquarters. The committee can rule by the old decrees, return to the old faith, or look ' +
      'west. It cannot do all three.',
    choices: [
      {
        label: 'Rule by decree',
        detail: 'Doctrine deferred, order first. The Union is held together by administration.',
        aiWeight: 3,
        effects: [
          { t: 'stability', nation: 'SOV', delta: 6 },
          { t: 'warSupport', nation: 'SOV', delta: -2 },
          {
            t: 'report', to: 'player', kind: 'intel',
            title: 'Moscow Consolidates',
            body: 'The new Soviet committee governs by emergency decree. Ideological questions are deferred; the frontiers are quiet and heavily watched.',
          },
        ],
      },
      {
        label: 'Return to the old faith',
        detail: 'The committee rebuilds its legitimacy on the doctrine. The foreign sections get their headquarters back.',
        aiWeight: 2,
        effects: [
          { t: 'joinFaction', nation: 'SOV', faction: 'comintern' },
          { t: 'stability', nation: 'SOV', delta: -3 },
          { t: 'tension', delta: 3 },
          {
            t: 'chronicle',
            text: 'The committee that inherited the coup wrapped itself in the old doctrine, and the international resumed its correspondence with Moscow.',
            divergence: true,
          },
        ],
      },
      {
        label: 'A window to the West',
        detail: 'Trade credits and quiet contacts. The Union asks what normalcy would cost.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'SOV', b: 'UK', delta: 10 },
          { t: 'relations', a: 'SOV', b: 'USA', delta: 10 },
          { t: 'tension', delta: -4 },
          {
            t: 'chronicle',
            text: 'The post-coup Union turned west for credit and recognition, and the chanceries discovered they preferred a Russia that sent trade delegations to one that sent instructions.',
            divergence: true,
          },
        ],
      },
    ],
  },
];
