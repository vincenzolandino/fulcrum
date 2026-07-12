// Endgame event pack: how the war ends and what the world looks like after.
// Atomic employment, peace feelers from broken majors, partition of the
// defeated, and the postwar order. Pure data against the Condition/Effect DSL
// in engine/types.ts. Cross-pack flags come from the registry; flags prefixed
// END_ below are internal to this pack (other packs may read them).

import type { GameEvent, NationId } from '../../engine/types';
import { FLAGS, atomicFlag, capitulatedFlag } from './registry';

// Transient engine flag raised by ai.ts (runPeaceAI) the turn an AI major
// sues for peace. Local mirror of the engine convention documented in the
// registry ('_peaceseek_<id>'); content reads it in `fires` and never sets it.
const peaceseekFlag = (nation: NationId): string => `_peaceseek_${nation}`;

// Pack-internal flags (set here; readable by anyone).
const END_ATOMIC_DEMONSTRATION = 'END_ATOMIC_DEMONSTRATION';
const END_ATOMIC_WITHHELD_USA = 'END_ATOMIC_WITHHELD_USA';
const END_ATOMIC_DETERRENT_GER = 'END_ATOMIC_DETERRENT_GER';
const END_ATOMIC_TESTED_SOV = 'END_ATOMIC_TESTED_SOV';
const END_ATOMIC_SECRET_SOV = 'END_ATOMIC_SECRET_SOV';
const END_ATOMIC_SHARED_UK = 'END_ATOMIC_SHARED_UK';
const END_ATOMIC_RESERVE_UK = 'END_ATOMIC_RESERVE_UK';
const END_UNCONDITIONAL_GER = 'END_UNCONDITIONAL_GER';
const END_PEACE_GER = 'END_PEACE_GER';
const END_SEPARATE_PEACE_WEST = 'END_SEPARATE_PEACE_WEST';
const END_UNCONDITIONAL_JAP = 'END_UNCONDITIONAL_JAP';
const END_PEACE_JAP = 'END_PEACE_JAP';
const END_BLOCKADE_JAP = 'END_BLOCKADE_JAP';
const END_PEACE_SOV_DICTATED = 'END_PEACE_SOV_DICTATED';
const END_EAST_WHITE_PEACE = 'END_EAST_WHITE_PEACE';
const END_PEACE_UK = 'END_PEACE_UK';
const END_PEACE_UK_FLEET = 'END_PEACE_UK_FLEET';
const END_GERMANY_PARTITIONED = 'END_GERMANY_PARTITIONED';
const END_GERMANY_NEUTRAL = 'END_GERMANY_NEUTRAL';
const END_GERMANY_PASTORAL = 'END_GERMANY_PASTORAL';
const END_JAPAN_OCCUPIED = 'END_JAPAN_OCCUPIED';
const END_JAPAN_DIVIDED = 'END_JAPAN_DIVIDED';
const END_JAPAN_PUNITIVE = 'END_JAPAN_PUNITIVE';
const END_TRIBUNAL = 'END_TRIBUNAL';
const END_SUMMARY_JUSTICE = 'END_SUMMARY_JUSTICE';
const END_AMNESTY = 'END_AMNESTY';
const END_IRON_CURTAIN = 'END_IRON_CURTAIN';
const END_FREE_ELECTIONS = 'END_FREE_ELECTIONS';
const END_UN_FOUNDED = 'END_UN_FOUNDED';
const END_ISOLATION = 'END_ISOLATION';
const END_CONCERT = 'END_CONCERT';

export const ENDGAME_EVENTS: GameEvent[] = [
  // -------------------------------------------------------------------------
  // Atomic employment. One decision per nuclear power, fired on the ATOMIC_
  // flag raised by research.ts at secret tech level 5.
  // -------------------------------------------------------------------------
  {
    id: 'end-atomic-usa',
    title: 'The Interim Committee Reports',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: atomicFlag('USA') },
        { t: 'atWar', a: 'USA' },
      ],
    },
    once: true,
    priority: 9,
    text:
      'Memorandum for the President, by hand of the Secretary of War. The device tested in the desert ' +
      'performed beyond the estimates of the scientific panel; production will furnish further units at ' +
      'intervals of weeks. The Committee weighed a demonstration before neutral observers and set it ' +
      'aside as forfeiting surprise without compelling proof, since a dud before witnesses would be worse ' +
      'than silence. The target committee\'s list is appended. Every name on it is a city. The Committee ' +
      'was instructed to report what the weapon can do, not what ought to be done with it. That question ' +
      'comes to this desk alone.',
    choices: [
      {
        label: 'Employ it against Japan',
        detail: 'One aircraft, one city, no warning. The invasion timetable becomes unnecessary.',
        available: {
          t: 'and',
          c: [{ t: 'atWar', a: 'USA', b: 'JAP' }, { t: 'alive', nation: 'JAP' }],
        },
        aiWeight: 5,
        effects: [
          { t: 'flag', key: FLAGS.ATOMIC_USED, value: true },
          { t: 'warSupport', nation: 'JAP', delta: -35 },
          { t: 'stability', nation: 'JAP', delta: -20 },
          { t: 'tension', delta: 6 },
          {
            t: 'chronicle',
            text: 'A single American aircraft destroyed a Japanese city with one bomb. The nature of war changed in the time it takes light to cross a valley.',
          },
          {
            t: 'report',
            to: 'JAP',
            kind: 'domestic',
            title: 'A City Has Ceased to Exist',
            body: 'A weapon of a new type has destroyed an entire city in a single instant. The government cannot conceal the scale of it, and does not know how many more the enemy holds.',
          },
        ],
      },
      {
        label: 'Employ it against Germany',
        detail: 'The weapon was begun against Germany. Let it finish what it was built for.',
        available: {
          t: 'and',
          c: [{ t: 'atWar', a: 'USA', b: 'GER' }, { t: 'alive', nation: 'GER' }],
        },
        aiWeight: 1,
        effects: [
          { t: 'flag', key: FLAGS.ATOMIC_USED, value: true },
          { t: 'warSupport', nation: 'GER', delta: -35 },
          { t: 'stability', nation: 'GER', delta: -20 },
          { t: 'tension', delta: 6 },
          {
            t: 'chronicle',
            text: 'The first atomic weapon used in war fell on a German city. In our history the war in Europe ended before the device was ready; here the order of things ran otherwise.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'GER',
            kind: 'domestic',
            title: 'Annihilation from a Single Aircraft',
            body: 'An American weapon of unprecedented type has erased a German city. The air defense reported one intruder at high altitude and engaged nothing.',
          },
        ],
      },
      {
        label: 'A demonstration before witnesses',
        detail: 'Detonate it over an uninhabited target with neutral observers present. Persuasion before slaughter.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_ATOMIC_DEMONSTRATION, value: true },
          { t: 'tension', delta: 4 },
          {
            t: 'chronicle',
            text: 'The atomic weapon was demonstrated over an empty island before invited witnesses rather than used against a city. History\'s first nuclear act was a warning, not a wound.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Withhold the weapon',
        detail: 'The war is won by ordinary means or not at all. The precedent is never set.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_ATOMIC_WITHHELD_USA, value: true },
          { t: 'warSupport', nation: 'USA', delta: -5 },
          {
            t: 'chronicle',
            text: 'The United States built the atomic bomb and locked it away. The war was fought to its end with the weapons of the old world.',
            divergence: true,
          },
        ],
      },
    ],
  },
  {
    id: 'end-atomic-germany',
    title: 'The Ordnance Office Reports Success',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: atomicFlag('GER') },
        { t: 'atWar', a: 'GER' },
      ],
    },
    once: true,
    priority: 9,
    text:
      'The Army Ordnance Office reports the special program complete. A device of the new type stands ' +
      'ready, with a second in assembly; the delivery squadron is trained and holds two machines of ' +
      'sufficient range. The Office states plainly what the weapon does to a city: one aircraft, one ' +
      'morning, no warning the defense can read. The Foreign Ministry asks whether the weapon is better ' +
      'spent than held, since its existence, once demonstrated, negotiates by itself. The services ask ' +
      'only for a target. The decision can be neither delegated nor deferred; the enemy programs are not ' +
      'standing still.',
    choices: [
      {
        label: 'Strike London',
        detail: 'Break the island\'s will in one morning. The Atlantic war ends where it began.',
        available: {
          t: 'and',
          c: [{ t: 'atWar', a: 'GER', b: 'UK' }, { t: 'alive', nation: 'UK' }],
        },
        aiWeight: 3,
        effects: [
          { t: 'flag', key: FLAGS.ATOMIC_USED, value: true },
          { t: 'warSupport', nation: 'UK', delta: -35 },
          { t: 'stability', nation: 'UK', delta: -20 },
          { t: 'tension', delta: 8 },
          {
            t: 'chronicle',
            text: 'A German atomic weapon destroyed the heart of London. In our history the German program never came near a device; here the race was run the other way.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'domestic',
            title: 'Catastrophe in the Capital',
            body: 'A single German bomb of a wholly new order has destroyed central London. Casualty figures cannot yet be compiled. The seat of government is being moved.',
          },
        ],
      },
      {
        label: 'Strike Moscow',
        detail: 'Decapitate the eastern enemy. No Soviet state survives its center.',
        available: {
          t: 'and',
          c: [{ t: 'atWar', a: 'GER', b: 'SOV' }, { t: 'alive', nation: 'SOV' }],
        },
        aiWeight: 3,
        effects: [
          { t: 'flag', key: FLAGS.ATOMIC_USED, value: true },
          { t: 'warSupport', nation: 'SOV', delta: -35 },
          { t: 'stability', nation: 'SOV', delta: -20 },
          { t: 'tension', delta: 8 },
          {
            t: 'chronicle',
            text: 'A German atomic weapon fell on Moscow. No German device existed in our history; this war built one, and spent it in the East.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'SOV',
            kind: 'domestic',
            title: 'A Weapon of a New Type',
            body: 'A single enemy aircraft has destroyed the center of Moscow with one bomb. The State Defense Committee has relocated east of the city. The scale of the destruction is being concealed from the foreign press without success.',
          },
        ],
      },
      {
        label: 'Hold it as a bargaining counter',
        detail: 'Announce the test, spend nothing. A weapon in hand buys terms a weapon spent cannot.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: END_ATOMIC_DETERRENT_GER, value: true },
          { t: 'tension', delta: 5 },
          {
            t: 'chronicle',
            text: 'Germany announced possession of the atomic bomb and did not use it. Every chancellery in the world recalculated overnight.',
            divergence: true,
          },
        ],
      },
    ],
  },
  {
    id: 'end-atomic-ussr',
    title: 'Special File for the State Defense Committee',
    nation: 'SOV',
    fires: { t: 'flag', key: atomicFlag('SOV') },
    once: true,
    priority: 9,
    text:
      'Report to the State Defense Committee under special file. The article was assembled at the test ' +
      'range and awaits the Committee\'s disposition. The physicists certify a yield within the range of ' +
      'the foreign estimates. Detonation on the range, announced or merely detected, ends the foreign ' +
      'monopoly at a stroke and changes every calculation made against the Union. Employment against an ' +
      'enemy in the field ends more than that. Concealment preserves surprise at the price of deterrence, ' +
      'and a weapon no one believes in defends nothing. The Committee is asked to choose which version of ' +
      'the future it prefers.',
    choices: [
      {
        label: 'Detonate it on the test range',
        detail: 'Let the seismographs abroad carry the announcement. The monopoly ends today.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: END_ATOMIC_TESTED_SOV, value: true },
          { t: 'tension', delta: 6 },
          {
            t: 'chronicle',
            text: 'The Soviet Union detonated an atomic device years ahead of the 1949 test our history records. The balance of the age arrived early.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Employ it against the German enemy',
        detail: 'The invader\'s cities have addresses. One of them ceases to exist.',
        available: {
          t: 'and',
          c: [{ t: 'atWar', a: 'SOV', b: 'GER' }, { t: 'alive', nation: 'GER' }],
        },
        aiWeight: 2,
        effects: [
          { t: 'flag', key: FLAGS.ATOMIC_USED, value: true },
          { t: 'warSupport', nation: 'GER', delta: -35 },
          { t: 'stability', nation: 'GER', delta: -20 },
          { t: 'tension', delta: 8 },
          {
            t: 'chronicle',
            text: 'A Soviet atomic weapon destroyed a German city. In our history the first Soviet device came four years after the war; here it arrived in time to fight.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'GER',
            kind: 'domestic',
            title: 'A Soviet Weapon of Annihilation',
            body: 'A single Soviet bomb has destroyed a German city outright. The eastern enemy, counted backward in every appreciation, has produced the decisive weapon first.',
          },
        ],
      },
      {
        label: 'Conceal it',
        detail: 'A secret weapon and a secret advantage. Surprise is spent only once.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_ATOMIC_SECRET_SOV, value: true },
          {
            t: 'chronicle',
            text: 'The Soviet bomb existed and the world was not told. The archives would keep the secret for a generation.',
            divergence: true,
          },
        ],
      },
    ],
  },
  {
    id: 'end-atomic-britain',
    title: 'Tube Alloys Delivers',
    nation: 'UK',
    fires: { t: 'flag', key: atomicFlag('UK') },
    once: true,
    priority: 9,
    text:
      'Most secret, for the War Cabinet only. The Tube Alloys directorate reports the weapon proved. The ' +
      'stockpile stands at one, with a second expected within the quarter; the modified squadron is at ' +
      'readiness. The Chiefs of Staff observe that the weapon alters the balance more by existing than by ' +
      'falling, and that His Majesty\'s Government now holds a card it cannot afford to play twice. Three ' +
      'papers are circulated: employment against the enemy while the war lasts, disclosure to Washington ' +
      'and a common Anglo-American front, or a silent reserve held against a darker year.',
    choices: [
      {
        label: 'Disclose it to Washington',
        detail: 'A common front and a common arsenal. The alliance outlives the war.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: END_ATOMIC_SHARED_UK, value: true },
          { t: 'relations', a: 'UK', b: 'USA', delta: 15 },
          {
            t: 'chronicle',
            text: 'Britain reached the atomic weapon first and placed it inside the Atlantic partnership. In our history the order of arrival was reversed.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Employ it against Germany',
        detail: 'The enemy is bombed nightly at great cost in crews. This costs one.',
        available: {
          t: 'and',
          c: [{ t: 'atWar', a: 'UK', b: 'GER' }, { t: 'alive', nation: 'GER' }],
        },
        aiWeight: 2,
        effects: [
          { t: 'flag', key: FLAGS.ATOMIC_USED, value: true },
          { t: 'warSupport', nation: 'GER', delta: -35 },
          { t: 'stability', nation: 'GER', delta: -20 },
          { t: 'tension', delta: 8 },
          {
            t: 'chronicle',
            text: 'A British atomic weapon destroyed a German city. The first nuclear power of this history flew the roundel.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'GER',
            kind: 'domestic',
            title: 'One Aircraft, One City',
            body: 'A British weapon of a new order has destroyed a German city in a single strike. The defense registered one machine at extreme altitude.',
          },
        ],
      },
      {
        label: 'The silent reserve',
        detail: 'Tell no one, not even the ally. Insurance is bought before the fire.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_ATOMIC_RESERVE_UK, value: true },
          {
            t: 'chronicle',
            text: 'Britain built the bomb in secret and kept the secret, from enemy and ally alike.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Peace feelers from broken majors, fired on the engine's transient
  // _peaceseek_ flag the turn the AI sues for peace.
  // -------------------------------------------------------------------------
  {
    id: 'end-peace-germany',
    title: 'Terms from Berlin',
    nation: 'global',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: peaceseekFlag('GER') },
        { t: 'atWar', a: 'GER' },
        { t: 'alive', nation: 'GER' },
      ],
    },
    once: true,
    priority: 9,
    text:
      'Most immediate, from the Legation in Berne. An emissary of the German government presented himself ' +
      'this evening at the residence, credentials verified by separate channel. Berlin asks whether the ' +
      'powers at war with Germany would receive terms, and indicates that the composition of any German ' +
      'delegation is negotiable. The emissary did not use the word surrender. The military position behind ' +
      'the request is understood on both sides of the table: the fronts are giving way and Berlin knows ' +
      'it. The reply given here will bind the coalition. The question is whether this war ends at a table ' +
      'or in the streets of the German capital.',
    choices: [
      {
        label: 'Unconditional surrender or nothing',
        detail: 'The formula holds. No armistice, no negotiated Reich, no third war in forty years.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: END_UNCONDITIONAL_GER, value: true },
          { t: 'stability', nation: 'GER', delta: -5 },
          { t: 'tension', delta: 2 },
          {
            t: 'chronicle',
            text: 'The powers held to the formula of unconditional surrender. The German feeler was returned unanswered, and the war went on to its end.',
          },
          {
            t: 'report',
            to: 'GER',
            kind: 'diplomatic',
            title: 'The Feeler Is Rejected',
            body: 'The enemy coalition replies with one word repeated in every capital: unconditional. There will be no negotiated end. The war will be carried into the Reich.',
          },
        ],
      },
      {
        label: 'Open negotiations',
        detail: 'The bleeding stops now. Germany survives, reduced and watched.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_PEACE_GER, value: true },
          { t: 'peace', a: 'GER', b: 'UK' },
          { t: 'peace', a: 'GER', b: 'USA' },
          { t: 'peace', a: 'GER', b: 'SOV' },
          { t: 'peace', a: 'GER', b: 'FRA' },
          { t: 'peace', a: 'GER', b: 'POL' },
          { t: 'relations', a: 'GER', b: 'UK', delta: 20 },
          { t: 'relations', a: 'GER', b: 'USA', delta: 15 },
          { t: 'stability', nation: 'GER', delta: 10 },
          { t: 'tension', delta: -15 },
          {
            t: 'chronicle',
            text: 'The war against Germany ended at a conference table, not in the rubble of Berlin. A German state signed the peace and survived it.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'GER',
            kind: 'diplomatic',
            title: 'An Armistice Is Offered',
            body: 'The enemy coalition will treat. Delegations are to meet on neutral ground within the fortnight. The guns fall silent on the present lines pending terms.',
          },
        ],
      },
      {
        label: 'An armistice in the West only',
        detail: 'Peace with Berlin, and let the two dictatorships grind each other down in the East.',
        available: {
          t: 'and',
          c: [{ t: 'atWar', a: 'GER', b: 'SOV' }, { t: 'atWar', a: 'GER', b: 'UK' }],
        },
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_SEPARATE_PEACE_WEST, value: true },
          { t: 'peace', a: 'GER', b: 'UK' },
          { t: 'peace', a: 'GER', b: 'USA' },
          { t: 'peace', a: 'GER', b: 'FRA' },
          { t: 'relations', a: 'UK', b: 'SOV', delta: -30 },
          { t: 'relations', a: 'USA', b: 'SOV', delta: -20 },
          { t: 'tension', delta: 5 },
          {
            t: 'chronicle',
            text: 'The Western powers made a separate peace with Germany and left the eastern war to burn. The coalition of the war became the enmity of the peace within a season.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'SOV',
            kind: 'diplomatic',
            title: 'The Western Allies Have Made Peace',
            body: 'London and Washington have concluded an armistice with Berlin. The eastern front is now the only front, and every German division released in the West is entraining east.',
          },
        ],
      },
    ],
  },
  {
    id: 'end-peace-japan',
    title: 'The Note Through the Neutrals',
    nation: 'global',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: peaceseekFlag('JAP') },
        { t: 'atWar', a: 'JAP' },
        { t: 'alive', nation: 'JAP' },
      ],
    },
    once: true,
    priority: 9,
    text:
      'The Japanese Foreign Ministry has approached a neutral legation with instructions traceable to the ' +
      'highest level. Tokyo asks what terms the powers would extend, and attaches one condition it calls ' +
      'indispensable: the person and prerogatives of the Emperor. Intercepted traffic confirms the ' +
      'approach is genuine and that the army faction opposes it. The blockade has cut the home islands\' ' +
      'imports of food and fuel to a fraction; the cities burn faster than they can be evacuated. The ' +
      'cabinet that sent this note may not survive its rejection. Neither may the chance it represents.',
    choices: [
      {
        label: 'Unconditional surrender',
        detail: 'No conditions, stated or implied. The formula bends for no throne.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: END_UNCONDITIONAL_JAP, value: true },
          { t: 'stability', nation: 'JAP', delta: -5 },
          {
            t: 'chronicle',
            text: 'The demand on Japan remained unconditional surrender. The note through the neutrals was answered with the terms already published.',
          },
          {
            t: 'report',
            to: 'JAP',
            kind: 'diplomatic',
            title: 'The Powers Do Not Bargain',
            body: 'The reply restates the published terms without amendment. No assurance is given on the imperial institution. The army faction calls this proof that surrender means extinction.',
          },
        ],
      },
      {
        label: 'Peace preserving the throne',
        detail: 'One sentence of assurance ends the war today. The conquests are surrendered regardless.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: END_PEACE_JAP, value: true },
          { t: 'peace', a: 'JAP', b: 'USA' },
          { t: 'peace', a: 'JAP', b: 'UK' },
          { t: 'peace', a: 'JAP', b: 'CHI' },
          { t: 'peace', a: 'JAP', b: 'SOV' },
          { t: 'peace', a: 'JAP', b: 'ANZ' },
          { t: 'stability', nation: 'JAP', delta: 10 },
          { t: 'tension', delta: -10 },
          {
            t: 'chronicle',
            text: 'The Pacific war ended by negotiation, the throne preserved by a written line. The invasion fleets and the final fire raids stayed in their harbors and hangars.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'JAP',
            kind: 'diplomatic',
            title: 'Terms Accepted',
            body: 'The powers accept peace on the basis proposed. The imperial institution continues. All territories taken since 1931 are to be evacuated and the armies demobilized under supervision.',
          },
        ],
      },
      {
        label: 'Tighten the blockade and wait',
        detail: 'No reply at all. Hunger negotiates on our behalf, at their expense.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_BLOCKADE_JAP, value: true },
          { t: 'warSupport', nation: 'JAP', delta: -10 },
          { t: 'stability', nation: 'JAP', delta: -8 },
          {
            t: 'chronicle',
            text: 'The powers gave Japan\'s feeler no answer and let the blockade do the talking. The home islands starved toward a surrender no one would sign.',
            divergence: true,
          },
        ],
      },
    ],
  },
  {
    id: 'end-peace-ussr',
    title: 'Emissaries Across the Lines',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: peaceseekFlag('SOV') },
        { t: 'atWar', a: 'GER', b: 'SOV' },
        { t: 'alive', nation: 'SOV' },
      ],
    },
    once: true,
    priority: 9,
    text:
      'To the Chief of the Army General Staff. Soviet emissaries crossed the lines under flag of truce ' +
      'and ask for an armistice on any terms consistent with the survival of their state. The government ' +
      'that sends them controls what remains east of the front; its capital is under the guns. The ' +
      'Foreign Ministry submits three courses: a dictated peace taking the western republics and the ' +
      'grain lands; a white peace ending the drain in the East on today\'s line; or refusal, on the ' +
      'argument that a state so near collapse should be finished rather than treated with. The armies ' +
      'await orders in either case.',
    choices: [
      {
        label: 'Dictate the eastern peace',
        detail: 'The Ukraine and White Russia pass to the Reich. A second Brest-Litovsk, signed at bayonet point.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: END_PEACE_SOV_DICTATED, value: true },
          { t: 'peace', a: 'GER', b: 'SOV' },
          { t: 'cedeRegion', region: 'sov-ukraine', to: 'GER' },
          { t: 'cedeRegion', region: 'sov-byelorussia', to: 'GER' },
          { t: 'warSupport', nation: 'GER', delta: 10 },
          { t: 'stability', nation: 'SOV', delta: -10 },
          { t: 'tension', delta: 5 },
          {
            t: 'chronicle',
            text: 'The Soviet state signed a dictated peace and ceded its western lands. No such treaty was ever signed in our history; the eastern war ended on paper instead of in Berlin.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'SOV',
            kind: 'diplomatic',
            title: 'The Treaty Is Signed',
            body: 'The armistice terms detach the Ukraine and Byelorussia from the Union. The state survives behind a shortened frontier. The Party will call it breathing space; the country will call it what it is.',
          },
        ],
      },
      {
        label: 'A white peace in the East',
        detail: 'The line stands where the armies stand. The drain stops and the divisions come west.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_EAST_WHITE_PEACE, value: true },
          { t: 'peace', a: 'GER', b: 'SOV' },
          { t: 'relations', a: 'GER', b: 'SOV', delta: 10 },
          { t: 'tension', delta: -5 },
          {
            t: 'chronicle',
            text: 'Germany and the Soviet Union ended their war on the line of contact, each unbeaten in name. The eastern war our history fought to annihilation ended here in exhaustion.',
            divergence: true,
          },
        ],
      },
      {
        label: 'No terms for Moscow',
        detail: 'A wounded enemy spared is a war postponed. The offensive continues.',
        aiWeight: 2,
        effects: [
          { t: 'warSupport', nation: 'SOV', delta: -5 },
          { t: 'stability', nation: 'SOV', delta: -5 },
          {
            t: 'chronicle',
            text: 'The Soviet feeler was refused without reply. The war in the East remained what it had been from its first morning: a war without terms.',
          },
          {
            t: 'report',
            to: 'SOV',
            kind: 'diplomatic',
            title: 'Silence from the Enemy',
            body: 'The emissaries returned without an answer. There will be no armistice. The State Defense Committee orders the war continued with whatever remains.',
          },
        ],
      },
    ],
  },
  {
    id: 'end-peace-britain',
    title: 'The Question from London',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: peaceseekFlag('UK') },
        { t: 'atWar', a: 'GER', b: 'UK' },
        { t: 'alive', nation: 'UK' },
      ],
    },
    once: true,
    priority: 9,
    text:
      'Report of the Foreign Ministry for the Chancellery. Through the Swedish court, His Majesty\'s ' +
      'Government asks what terms would end the war in the West. The message is authentic; the cabinet ' +
      'behind it is divided, and the island\'s position is arithmetic: the convoys are failing and ' +
      'invasion stands off the coast. The Ministry notes that England intact and neutral costs the Reich ' +
      'nothing to garrison, while England conquered must be held forever. Others answer that the fleet, ' +
      'not the island, is the prize, and that no English signature has yet bound England. The reply will ' +
      'shape the West for a generation.',
    choices: [
      {
        label: 'Generous terms',
        detail: 'The Empire intact, the Continent conceded. England retires from Europe with honors.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: END_PEACE_UK, value: true },
          { t: 'peace', a: 'GER', b: 'UK' },
          { t: 'peace', a: 'ITA', b: 'UK' },
          { t: 'relations', a: 'GER', b: 'UK', delta: 25 },
          { t: 'tension', delta: -10 },
          {
            t: 'chronicle',
            text: 'Britain signed a peace that left the Continent to Germany and kept the Empire. The war our history calls unfinishable was finished with a signature.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'diplomatic',
            title: 'Terms from Berlin',
            body: 'Berlin offers peace on the basis of the imperial status quo: the Empire and the fleet untouched, the Continent\'s arrangements recognized. The cabinet must answer within the week.',
          },
        ],
      },
      {
        label: 'Demand the fleet',
        detail: 'Peace is sold, not given. The Royal Navy is the price.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: END_PEACE_UK_FLEET, value: true },
          { t: 'peace', a: 'GER', b: 'UK' },
          { t: 'navy', nation: 'UK', delta: -300 },
          { t: 'navy', nation: 'GER', delta: 150 },
          { t: 'stability', nation: 'UK', delta: -10 },
          { t: 'tension', delta: 3 },
          {
            t: 'chronicle',
            text: 'The price of peace was the surrender of British capital ships to German crews. Britain paid it, and the Atlantic changed owners.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'diplomatic',
            title: 'The Fleet for the Peace',
            body: 'Berlin\'s terms require the transfer of the battle fleet\'s heavy units to German control. The Admiralty calls the demand unthinkable. The cabinet has not yet said so.',
          },
        ],
      },
      {
        label: 'No terms for the island',
        detail: 'England asked once at our weakest hour and got its answer. Now it gets ours.',
        aiWeight: 1,
        effects: [
          { t: 'warSupport', nation: 'UK', delta: 5 },
          {
            t: 'chronicle',
            text: 'Britain asked for terms and was refused. The refusal did what the offer could not: it ended the asking.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Partition of the defeated.
  // -------------------------------------------------------------------------
  {
    id: 'end-partition-germany',
    title: 'The Occupation Protocol',
    nation: 'global',
    fires: { t: 'flag', key: capitulatedFlag('GER') },
    once: true,
    priority: 8,
    text:
      'Protocol of the conference of the victorious powers, first session. Germany has surrendered ' +
      'without conditions and its territory lies under the armies of its enemies. Before the delegations: ' +
      'the drawing of occupation zones; the transfer of the eastern provinces; the disposition of German ' +
      'industry, of the fleet, and of the men who directed the war. Each delegation arrives with its dead ' +
      'counted and its intentions drafted. What is decided at this table will outlast every man seated at ' +
      'it.',
    choices: [
      {
        label: 'Zones of occupation and the eastern transfer',
        detail: 'Germany divided among the victors, Prussia detached in the East. The map of the armistice becomes the map of the peace.',
        available: { t: 'alive', nation: 'SOV' },
        aiWeight: 4,
        effects: [
          { t: 'flag', key: END_GERMANY_PARTITIONED, value: true },
          { t: 'cedeRegion', region: 'ger-prussia', to: 'SOV' },
          { t: 'ic', nation: 'GER', delta: -20 },
          { t: 'stability', nation: 'GER', delta: -5 },
          {
            t: 'chronicle',
            text: 'Germany was divided into zones of occupation and East Prussia passed from the German map. The division drawn at the conference table hardened into the geography of the peace.',
          },
          {
            t: 'report',
            to: 'GER',
            kind: 'domestic',
            title: 'The Zones Are Drawn',
            body: 'The occupying powers have partitioned the country into zones of military government. East Prussia is detached outright. Movement between the zones requires a permit that is rarely granted.',
          },
        ],
      },
      {
        label: 'A unified, disarmed, neutral Germany',
        detail: 'One state, no army, watched by all. Nobody\'s Germany rather than everybody\'s quarrel.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_GERMANY_NEUTRAL, value: true },
          { t: 'joinFaction', nation: 'GER', faction: 'neutral' },
          { t: 'disbandArmy', nation: 'GER', count: 20 },
          { t: 'stability', nation: 'GER', delta: 10 },
          { t: 'tension', delta: -5 },
          {
            t: 'chronicle',
            text: 'The victors left Germany whole: one state, demilitarized and neutral by treaty. Our history divided the country for forty-five years; this one declined to.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Pastoralization',
        detail: 'The mines flooded, the mills dismantled. A nation of farms cannot arm a third time.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_GERMANY_PASTORAL, value: true },
          { t: 'ic', nation: 'GER', delta: -40 },
          { t: 'stability', nation: 'GER', delta: -15 },
          {
            t: 'chronicle',
            text: 'The victors dismantled German industry down to the field and the forge. The plan our history drafted and discarded was here carried out, and central Europe grew poor around it.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'GER',
            kind: 'domestic',
            title: 'The Dismantling Begins',
            body: 'Occupation authorities have ordered the removal or destruction of heavy industrial plant in every zone. The Ruhr works are being unbolted and shipped away as reparations in kind.',
          },
        ],
      },
    ],
  },
  {
    id: 'end-partition-japan',
    title: 'The Occupation of the Home Islands',
    nation: 'global',
    fires: { t: 'flag', key: capitulatedFlag('JAP') },
    once: true,
    priority: 8,
    text:
      'Instrument of surrender signed in the bay, the fleet of the victors at anchor in sight of the ' +
      'capital. The home islands pass under military occupation without administration of their own. ' +
      'Before the occupying powers: the demobilization of the armies overseas, the disposition of the ' +
      'throne, and the return of the conquests taken since 1931. The garrisons across the continent await ' +
      'orders to lay down arms in territories they have held for a decade. How the occupation is divided, ' +
      'and what survives of the old state, is decided now.',
    choices: [
      {
        label: 'A single occupation, the throne retained',
        detail: 'One command, one policy, the Emperor kept as instrument of order. Manchuria returns to China.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: END_JAPAN_OCCUPIED, value: true },
          { t: 'annex', nation: 'MAN', by: 'CHI' },
          { t: 'navy', nation: 'JAP', delta: -600 },
          { t: 'air', nation: 'JAP', delta: -300 },
          { t: 'stability', nation: 'JAP', delta: 5 },
          {
            t: 'chronicle',
            text: 'Japan passed under a single occupation, the throne retained as an instrument of order, the continental conquests handed back. The occupation governed through the state it had defeated.',
          },
          {
            t: 'report',
            to: 'JAP',
            kind: 'domestic',
            title: 'The Occupation Command Assumes Authority',
            body: 'A single occupation command now governs through the existing ministries. The imperial institution continues under supervision. The armies overseas are ordered home for demobilization.',
          },
        ],
      },
      {
        label: 'Divided occupation, north and south',
        detail: 'The northern islands to the Soviet zone. Every victor gets a piece, and the seam never heals.',
        available: { t: 'alive', nation: 'SOV' },
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_JAPAN_DIVIDED, value: true },
          { t: 'setController', region: 'jap-home', to: 'SOV' },
          { t: 'stability', nation: 'JAP', delta: -15 },
          { t: 'tension', delta: 8 },
          {
            t: 'chronicle',
            text: 'Japan was divided into occupation zones, the north under Soviet administration. Our history spared Japan the partition it imposed on Germany; this one did not.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'JAP',
            kind: 'domestic',
            title: 'The Country Is Divided',
            body: 'Soviet forces have assumed control of the northern home islands under the occupation protocol. Families with relatives across the demarcation line are advised that the line is closed.',
          },
        ],
      },
      {
        label: 'A punitive peace',
        detail: 'The industry dismantled, the throne abolished, the state remade from the ground.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_JAPAN_PUNITIVE, value: true },
          { t: 'ic', nation: 'JAP', delta: -30 },
          { t: 'stability', nation: 'JAP', delta: -20 },
          {
            t: 'chronicle',
            text: 'The occupation abolished the imperial institution and dismantled Japanese industry wholesale. The reconstruction our history managed through the old state was attempted here against it.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The reckoning and the postwar order.
  // -------------------------------------------------------------------------
  {
    id: 'end-tribunal',
    title: 'The Question of the Forum',
    nation: 'global',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: capitulatedFlag('GER') },
        { t: 'eventFired', id: 'end-partition-germany' },
      ],
    },
    once: true,
    priority: 6,
    text:
      'Memorandum of the conference of Allied jurists. The custody of the surviving leadership of the ' +
      'German state is settled; the question is the forum. The evidence recovered from the ministries and ' +
      'the camps documents crimes of a scale without precedent in the modern record, planned as policy ' +
      'and executed as administration. Three courses lie before the powers: an international tribunal ' +
      'sitting in public, with counsel, indictment, and record; military courts and sentences carried out ' +
      'within the week; or a line drawn, for reasons of state, under all but the most notorious cases.',
    choices: [
      {
        label: 'An international tribunal',
        detail: 'Indictment, defense, judgment, record. The crime is proved to the century, not merely punished.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: END_TRIBUNAL, value: true },
          {
            t: 'chronicle',
            text: 'The leadership of the defeated regime was tried in public before an international tribunal. The evidence entered the record of the century where no denial could reach it.',
          },
          {
            t: 'chronicle',
            text: 'What the tribunal documented of the camps and the deportations fixed the regime\'s crimes as historical fact: murder planned as policy, administered as routine, counted in millions.',
          },
        ],
      },
      {
        label: 'Summary justice',
        detail: 'A wall and a firing party. The lawyers can argue over the graves.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_SUMMARY_JUSTICE, value: true },
          { t: 'stability', nation: 'GER', delta: -10 },
          {
            t: 'chronicle',
            text: 'The captured leadership was shot after drumhead proceedings. Justice was swift, and the full documentary record the trials would have built was never assembled.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Draw the line',
        detail: 'Punish the few, enroll the rest. The reconstruction needs administrators more than defendants.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_AMNESTY, value: true },
          { t: 'stability', nation: 'GER', delta: 5 },
          {
            t: 'chronicle',
            text: 'For reasons of state the account was left largely unsettled, and men of the old apparatus passed into the new administration. The unexamined record waited for a later generation.',
            divergence: true,
          },
        ],
      },
    ],
  },
  {
    id: 'end-iron-curtain',
    title: 'The Lands the Army Holds',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        {
          t: 'or',
          c: [
            { t: 'flag', key: capitulatedFlag('GER') },
            { t: 'flag', key: END_PEACE_GER },
          ],
        },
        { t: 'alive', nation: 'SOV' },
        { t: 'controls', nation: 'SOV', region: 'pol-warsaw' },
      ],
    },
    once: true,
    priority: 7,
    text:
      'To the State Defense Committee, from the Foreign Commissariat. The armies stand from the Baltic to ' +
      'the Danube, in the lands through which every invasion of Russia has come. The governments-in-exile ' +
      'ask for elections; the Western powers ask for them too, citing the conference declarations. The ' +
      'Commissariat observes that free elections in these countries returned governments hostile to the ' +
      'Union in every year of their independence, and that the security of the state was not won by ' +
      'ballots. What the army holds, the Party can organize. The question is whether the western frontier ' +
      'is to be guarded by treaties or by governments that cannot change sides.',
    choices: [
      {
        label: 'Friendly governments on the frontier',
        detail: 'Coalition cabinets first, then the coalition trimmed. Poland answers to Moscow.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: END_IRON_CURTAIN, value: true },
          { t: 'cedeRegion', region: 'pol-east', to: 'SOV' },
          { t: 'puppet', nation: 'POL', by: 'SOV' },
          { t: 'relations', a: 'SOV', b: 'USA', delta: -20 },
          { t: 'relations', a: 'SOV', b: 'UK', delta: -20 },
          { t: 'tension', delta: 8 },
          {
            t: 'chronicle',
            text: 'Governments answerable to Moscow were installed across the lands the Red Army held, and a line drew itself across Europe from the Baltic to the Adriatic.',
          },
          {
            t: 'report',
            to: 'POL',
            kind: 'domestic',
            title: 'The Provisional Government Is Reorganized',
            body: 'Ministries pass one by one to men returned from Moscow. The eastern territories are ceded by treaty. Opposition deputies are arrested or abroad. The elections promised at the conferences will be held, and their result is not in doubt.',
          },
          {
            t: 'report',
            to: 'USA',
            kind: 'diplomatic',
            title: 'The Declarations Are Dead Letters',
            body: 'Reports from Warsaw and the Danube capitals describe police consolidation under Soviet direction. The election commitments of the wartime conferences are being discharged in form and buried in practice.',
          },
        ],
      },
      {
        label: 'Honor the declarations',
        detail: 'Withdrawal on schedule, elections observed. Security bought with treaties and goodwill.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_FREE_ELECTIONS, value: true },
          { t: 'relations', a: 'SOV', b: 'USA', delta: 15 },
          { t: 'relations', a: 'SOV', b: 'UK', delta: 15 },
          { t: 'tension', delta: -5 },
          {
            t: 'chronicle',
            text: 'The Red Army withdrew behind its treaty lines and the eastern elections were held under observation. The division of Europe that our history took for granted did not occur.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Annex the frontier belt outright',
        detail: 'No intermediaries, no fictions. The republics of the frontier enter the Union.',
        aiWeight: 1,
        effects: [
          { t: 'cedeRegion', region: 'pol-east', to: 'SOV' },
          { t: 'annex', nation: 'POL', by: 'SOV' },
          { t: 'relations', a: 'SOV', b: 'USA', delta: -35 },
          { t: 'relations', a: 'SOV', b: 'UK', delta: -35 },
          { t: 'tension', delta: 15 },
          {
            t: 'chronicle',
            text: 'Moscow dispensed with client governments and annexed the frontier belt into the Union outright. Even our history\'s partition of Europe kept up appearances; this one did not.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'USA',
            kind: 'diplomatic',
            title: 'Annexation in the East',
            body: 'The Soviet Union has incorporated Poland by decree. No election, observed or otherwise, preceded the act. The wartime declarations on liberated Europe are formally repudiated.',
          },
        ],
      },
    ],
  },
  {
    id: 'end-world-order',
    title: 'The Shape of the Peace',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        {
          t: 'or',
          c: [
            { t: 'flag', key: capitulatedFlag('GER') },
            { t: 'flag', key: END_PEACE_GER },
          ],
        },
        { t: 'alive', nation: 'USA' },
        { t: 'turnAtLeast', n: 60 },
      ],
    },
    once: true,
    priority: 6,
    text:
      'Draft message to the Congress. The war in Europe is ended, with the republic\'s armies on three ' +
      'continents and its industry unmatched in the world. Twice in a generation the powers of Europe ' +
      'have set the world alight, and twice the republic has crossed the ocean to put the fire out. The ' +
      'Department submits the alternatives for the peace: a permanent organization of the nations, seated ' +
      'on American soil, with force at its call; a return to the hemisphere and the tariff; or a standing ' +
      'concert of the great powers alone, without assembly or charter. Each course has its advocates. ' +
      'None can be tried twice.',
    choices: [
      {
        label: 'Found the United Nations',
        detail: 'A charter, an assembly, a council of the great powers with teeth. The lesson of 1920 applied.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: END_UN_FOUNDED, value: true },
          { t: 'relations', a: 'USA', b: 'UK', delta: 10 },
          { t: 'relations', a: 'USA', b: 'SOV', delta: 5 },
          { t: 'tension', delta: -10 },
          {
            t: 'chronicle',
            text: 'The delegates signed the Charter of a permanent organization of nations, seated in America, with the victors holding its council. The peace was given an address.',
          },
        ],
      },
      {
        label: 'Return to the hemisphere',
        detail: 'The oceans are wide and the debt is deep. Europe can keep its own peace this time.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_ISOLATION, value: true },
          { t: 'relations', a: 'USA', b: 'UK', delta: -10 },
          { t: 'tension', delta: 5 },
          {
            t: 'chronicle',
            text: 'The republic went home, as it had in 1920. No charter was signed and no permanent council sat, and the peace was left to keep itself.',
            divergence: true,
          },
        ],
      },
      {
        label: 'A concert of the great powers',
        detail: 'No assembly of the small, no charter for the many. The powers that won the war police it.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: END_CONCERT, value: true },
          { t: 'tension', delta: -5 },
          {
            t: 'chronicle',
            text: 'In place of a parliament of nations the victors constituted themselves a standing concert, meeting behind closed doors. The nineteenth century\'s peace machinery was rebuilt for the twentieth.',
            divergence: true,
          },
        ],
      },
    ],
  },
];
