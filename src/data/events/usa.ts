// USA event pack — the American line from strict neutrality up the ladder of
// involvement: cash-and-carry, the two-ocean navy, Lend-Lease, the Atlantic
// escort war, the embargo of Japan, the bomb, and the day of infamy. Thirteen
// events, ids prefixed 'usa-' (surrender event uses the engine convention
// 'surrender-USA' per registry.ts; succession events use the leaders.ts
// convention 'usa-succession-<leader>').
//
// Pure data: no functions, no randomness, no dates as triggers. Every `fires`
// condition anchors on world state; `turnAtLeast` appears only as a floor.

import type { GameEvent } from '../../engine/types';
import { FLAGS, capitulatedFlag, exileFlag, surrenderEventId } from './registry';

// Pack-local flags. Written and read only inside this pack; they record
// American decisions for save-state inspection and future hooks. Cross-pack
// flags stay in registry.ts per the coordination contract.
const USA_CASH_CARRY = 'USA_CASH_CARRY';
const USA_TWO_OCEAN_NAVY = 'USA_TWO_OCEAN_NAVY';
const USA_SHOOT_ON_SIGHT = 'USA_SHOOT_ON_SIGHT';
const USA_MANHATTAN = 'USA_MANHATTAN';
const USA_URANIUM_COMMITTEE = 'USA_URANIUM_COMMITTEE';
const USA_MOBILIZED = 'USA_MOBILIZED';
const USA_GERMANY_FIRST = 'USA_GERMANY_FIRST';
const USA_PACIFIC_FIRST = 'USA_PACIFIC_FIRST';
const USA_WAR_ECONOMY = 'USA_WAR_ECONOMY';
const USA_FDR_RETIRED = 'USA_FDR_RETIRED';

// Engine convention (covert.ts leaderKilledFlag): '{LEADER}_DEAD', uppercased
// leader id, set by succession and never cleared. Same family as
// FLAGS.HITLER_DEAD / FLAGS.STALIN_DEAD; kept local because only this pack
// reads it.
const ROOSEVELT_DEAD = 'ROOSEVELT_DEAD';

export const USA_EVENTS: GameEvent[] = [
  // -------------------------------------------------------------------------
  // 1. Isolation erosion, step one: the Neutrality Act revision.
  // -------------------------------------------------------------------------
  {
    id: 'usa-neutrality-revision',
    title: 'The Neutrality Question',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        { t: 'tension', atLeast: 30 },
        { t: 'not', c: { t: 'atWar', a: 'USA' } },
        { t: 'warSupport', nation: 'USA', below: 60 },
      ],
    },
    once: true,
    priority: 5,
    text:
      'DEPARTMENT OF STATE, WASHINGTON. The Neutrality Act binds the United States to sell arms to ' +
      'no belligerent, aggressor and victim alike. The President has told the Congress that the law, ' +
      'in operation, may actually give aid to an aggressor and deny it to the victim. The service ' +
      'chiefs report the Army ranks eighteenth among the armies of the world. The embassies in London ' +
      'and Paris cable that the democracies stand ready to pay cash and carry the goods in their own ' +
      'bottoms, if the law permits it. The Congress must now be asked, and the country behind it, how ' +
      'strict a neutrality the Republic can afford.',
    choices: [
      {
        label: 'Cash and carry',
        detail: 'Repeal the arms embargo. Any nation may buy that can pay cash and carry the goods itself. The sea lanes decide who that is.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: USA_CASH_CARRY, value: true },
          { t: 'warSupport', nation: 'USA', delta: 5 },
          { t: 'relations', a: 'USA', b: 'UK', delta: 8 },
          { t: 'relations', a: 'USA', b: 'FRA', delta: 8 },
          { t: 'relations', a: 'USA', b: 'GER', delta: -5 },
          { t: 'report', to: 'UK', kind: 'diplomatic', title: 'Washington opens the arsenal', body: 'The Congress has revised the Neutrality Act. American factories may now sell to any purchaser who pays cash and carries in his own ships. The Royal Navy controls the Atlantic; the advantage is Britain\'s.' },
          { t: 'chronicle', text: 'The arms embargo fell in Washington, and the American economy began, cash in hand, to take a side.' },
        ],
      },
      {
        label: 'The Act stands as written',
        detail: 'The last war was entered through the account books of the munitions makers. Not again.',
        aiWeight: 1,
        effects: [
          { t: 'warSupport', nation: 'USA', delta: -3 },
          { t: 'stability', nation: 'USA', delta: 2 },
          { t: 'chronicle', text: 'The Congress kept the arms embargo intact through the crisis, a strictness our history repealed in the autumn of 1939.', divergence: true },
        ],
      },
      {
        label: 'Name the aggressors',
        detail: 'Not mere revision. An open finding that certain powers menace the peace, and an embargo aimed at them alone.',
        aiWeight: 1,
        effects: [
          { t: 'warSupport', nation: 'USA', delta: 8 },
          { t: 'relations', a: 'USA', b: 'GER', delta: -15 },
          { t: 'relations', a: 'USA', b: 'JAP', delta: -10 },
          { t: 'tension', delta: 2 },
          { t: 'report', to: 'GER', kind: 'diplomatic', title: 'American embargo declared', body: 'Washington has named Germany an aggressor state by act of Congress and barred it from American trade. The pretense of neutrality is ended.' },
          { t: 'chronicle', text: 'America dispensed with the fiction of impartiality and named its adversaries from the Capitol steps, years before our history found the nerve.', divergence: true },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. Isolation erosion, step two: the two-ocean navy and the draft.
  // -------------------------------------------------------------------------
  {
    id: 'usa-two-ocean-navy',
    title: 'The Two-Ocean Standard',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        { t: 'eventFired', id: 'usa-neutrality-revision' },
        { t: 'tension', atLeast: 45 },
        { t: 'or', c: [{ t: 'atWar', a: 'GER' }, { t: 'atWar', a: 'JAP' }] },
        { t: 'not', c: { t: 'atWar', a: 'USA' } },
      ],
    },
    once: true,
    priority: 6,
    text:
      'NAVY DEPARTMENT, WASHINGTON. The General Board reports that a fleet sufficient for one ocean ' +
      'cannot answer for two, and the news from abroad reads like a bill presented for collection. ' +
      'Before the Congress stand two measures: a naval expansion act to lay down carriers, ' +
      'battleships, and escorts against every yard\'s capacity, and a selective service bill, the ' +
      'first compulsory training ever asked of this country in peacetime. The isolationist bloc calls ' +
      'it the long road to somebody else\'s war. The service chiefs call it the price of staying out, ' +
      'or of going in late and alive.',
    choices: [
      {
        label: 'Build the fleet and call the men',
        detail: 'Both bills, whole. Seventy percent more fleet, and nine hundred thousand men a year with the colors.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: USA_TWO_OCEAN_NAVY, value: true },
          { t: 'navy', nation: 'USA', delta: 80 },
          { t: 'manpower', nation: 'USA', delta: 1500 },
          { t: 'warSupport', nation: 'USA', delta: 6 },
          { t: 'tension', delta: 2 },
          { t: 'report', to: 'JAP', kind: 'intel', title: 'American naval expansion', body: 'The Congress has voted a two-ocean navy. When the program completes, the United States Fleet will outbuild the Combined Fleet several times over. The window for any Pacific decision is closing.' },
          { t: 'chronicle', text: 'America voted itself a two-ocean navy and a peacetime draft in the same season, arming while it argued.' },
        ],
      },
      {
        label: 'Ships, not conscripts',
        detail: 'Steel is politics the country will bear. A draft is not, yet.',
        aiWeight: 2,
        effects: [
          { t: 'navy', nation: 'USA', delta: 60 },
          { t: 'warSupport', nation: 'USA', delta: 3 },
          { t: 'chronicle', text: 'The fleet was voted and the draft was not; America chose to meet the crisis with machines before men.', divergence: true },
        ],
      },
      {
        label: 'Hemisphere defense only',
        detail: 'Fortify the approaches, patrol the Americas, and let the old world burn its own house.',
        aiWeight: 1,
        effects: [
          { t: 'navy', nation: 'USA', delta: 20 },
          { t: 'warSupport', nation: 'USA', delta: -4 },
          { t: 'stability', nation: 'USA', delta: 2 },
          { t: 'chronicle', text: 'Washington drew its line at the water\'s edge of the hemisphere and built accordingly; the two-ocean program of our history was never passed.', divergence: true },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. Lend-Lease: the response to a Britain that can no longer pay.
  // -------------------------------------------------------------------------
  {
    id: 'usa-lend-lease',
    title: 'The Arsenal of Democracy',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'UK', b: 'GER' },
        { t: 'tension', atLeast: 50 },
        { t: 'not', c: { t: 'flag', key: FLAGS.LEND_LEASE } },
        { t: 'not', c: { t: 'atWar', a: 'USA' } },
      ],
    },
    once: true,
    priority: 7,
    text:
      'THE WHITE HOUSE. The Treasury confirms what London\'s cables have implied for months: British ' +
      'dollar balances are nearly gone, and the orders that keep American assembly lines running ' +
      'cannot be paid for past the spring. The President puts the matter to the country as a neighbor ' +
      'lending a garden hose to a house on fire, to be returned when the fire is out. The bill before ' +
      'Congress, numbered H.R. 1776 by a clerk with a sense of occasion, would lend the goods and ' +
      'defer the reckoning. The opposition calls it war by installment. The President calls the ' +
      'United States the arsenal of democracy.',
    choices: [
      {
        label: 'Pass the Lend-Lease Act',
        detail: 'Aid without payment, against account rendered on the day of victory. The fire next door gets the hose.',
        aiWeight: 5,
        effects: [
          { t: 'flag', key: FLAGS.LEND_LEASE, value: true },
          { t: 'ic', nation: 'USA', delta: 4 },
          { t: 'warSupport', nation: 'USA', delta: 5 },
          { t: 'relations', a: 'USA', b: 'UK', delta: 20 },
          { t: 'relations', a: 'USA', b: 'GER', delta: -15 },
          { t: 'tension', delta: 3 },
          { t: 'report', to: 'UK', kind: 'diplomatic', title: 'Lend-Lease is law', body: 'The President has signed the Lend-Lease Act. War material will cross the Atlantic without payment for the duration. The dollar problem is solved; the U-boat problem is now the only one that matters.' },
          { t: 'report', to: 'GER', kind: 'intel', title: 'American aid act passes', body: 'Washington has undertaken to supply Britain without payment or limit of credit. American industry is now a belligerent asset in all but flag.' },
          { t: 'chronicle', text: 'The Lend-Lease Act passed, and the American economy went to war a year before the American flag did.' },
        ],
      },
      {
        label: 'Aid to every front',
        detail: 'Britain, and China too, and Russia if she fights. Whoever holds a front against the aggressors draws on the arsenal.',
        aiWeight: 2,
        available: { t: 'atWar', a: 'CHI', b: 'JAP' },
        effects: [
          { t: 'flag', key: FLAGS.LEND_LEASE, value: true },
          { t: 'ic', nation: 'USA', delta: 4 },
          { t: 'warSupport', nation: 'USA', delta: 4 },
          { t: 'relations', a: 'USA', b: 'UK', delta: 15 },
          { t: 'relations', a: 'USA', b: 'CHI', delta: 15 },
          { t: 'relations', a: 'USA', b: 'SOV', delta: 10 },
          { t: 'relations', a: 'USA', b: 'JAP', delta: -10 },
          { t: 'armyStrength', nation: 'CHI', delta: 6 },
          { t: 'tension', delta: 3 },
          { t: 'report', to: 'CHI', kind: 'diplomatic', title: 'American aid extended to China', body: 'Washington has declared China eligible for Lend-Lease aid. Trucks, aircraft, and arms will move over the Burma Road as fast as it will carry them.' },
          { t: 'report', to: 'JAP', kind: 'diplomatic', title: 'Washington arms Chungking', body: 'The United States has placed China under its aid act. The China Incident is now underwritten by American industry.' },
        ],
      },
      {
        label: 'Loans at interest, cash on the barrel',
        detail: 'Sympathy is free; the goods are not. Extend credit on commercial terms and keep the books square.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'USA', b: 'UK', delta: 5 },
          { t: 'warSupport', nation: 'USA', delta: -3 },
          { t: 'chronicle', text: 'Washington offered Britain bankers\' terms instead of Lend-Lease, and the arsenal of democracy kept a cash register at the door.', divergence: true },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. Isolation erosion, step three: the undeclared war in the Atlantic.
  // -------------------------------------------------------------------------
  {
    id: 'usa-atlantic-escorts',
    title: 'Incidents in the Atlantic',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.LEND_LEASE },
        { t: 'atWar', a: 'UK', b: 'GER' },
        { t: 'not', c: { t: 'atWar', a: 'USA', b: 'GER' } },
      ],
    },
    once: true,
    priority: 6,
    text:
      'OFFICE OF THE CHIEF OF NAVAL OPERATIONS. The goods voted by Congress are sinking in ' +
      'quantity. The convoy routes are under attack to the edge of the western hemisphere, and ' +
      'American destroyers already trail the U-boats they are forbidden to engage. This week a ' +
      'destroyer on such duty was fired upon; the torpedo missed by yards. The Navy asks for orders ' +
      'that mean something: escort the convoys under American guns to mid-ocean, or beyond, or admit ' +
      'the cargo is Britain\'s problem the moment it clears the pier. Whatever is ordered, men will be ' +
      'shooting at each other on the high seas without a declaration of anything.',
    choices: [
      {
        label: 'Shoot on sight',
        detail: 'Escort to Iceland and beyond. Any submarine in the defensive zone is attacked without warning. The rattlesnake doctrine.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: USA_SHOOT_ON_SIGHT, value: true },
          { t: 'warSupport', nation: 'USA', delta: 8 },
          { t: 'navy', nation: 'USA', delta: 20 },
          { t: 'relations', a: 'USA', b: 'GER', delta: -20 },
          { t: 'tension', delta: 3 },
          { t: 'report', to: 'GER', kind: 'front', title: 'American navy opens fire', body: 'United States warships now escort British convoys and attack U-boats on sight west of Iceland. An undeclared naval war with America has begun; only Berlin can decide whether to declare it.' },
          { t: 'report', to: 'UK', kind: 'front', title: 'The U.S. Navy joins the watch', body: 'American escorts have taken over the western convoy legs with orders to shoot on sight. Escort strength on the Atlantic run nearly doubles.' },
          { t: 'chronicle', text: 'The United States fought an undeclared war in the Atlantic, depth charge by depth charge, months before any Congress spoke.' },
        ],
      },
      {
        label: 'Escort to mid-ocean only',
        detail: 'Guns manned, orders defensive. Protect the goods halfway and leave the eastern passage to the Royal Navy.',
        aiWeight: 2,
        effects: [
          { t: 'warSupport', nation: 'USA', delta: 4 },
          { t: 'relations', a: 'USA', b: 'GER', delta: -10 },
          { t: 'tension', delta: 1 },
          { t: 'report', to: 'UK', kind: 'diplomatic', title: 'American escort to mid-ocean', body: 'The U.S. Navy will convoy Lend-Lease cargo to a mid-Atlantic meridian under defensive orders. The eastern leg remains a British charge.' },
        ],
      },
      {
        label: 'The Navy stays home',
        detail: 'The goods were lent, not guaranteed. No American keel takes a convoy station.',
        aiWeight: 1,
        effects: [
          { t: 'warSupport', nation: 'USA', delta: -4 },
          { t: 'relations', a: 'USA', b: 'UK', delta: -5 },
          { t: 'chronicle', text: 'The American fleet kept to its own waters while the goods it had lent went down at sea; the undeclared Atlantic war of our history was never fought.', divergence: true },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. The oil embargo: the answer to Japan's southward expansion.
  // -------------------------------------------------------------------------
  {
    id: 'usa-oil-embargo',
    title: 'The Oil Question',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'JAP' },
        { t: 'not', c: { t: 'atWar', a: 'USA', b: 'JAP' } },
        { t: 'not', c: { t: 'flag', key: FLAGS.EMBARGO_JAPAN } },
        {
          t: 'or',
          c: [
            { t: 'controls', nation: 'JAP', region: 'fra-indochina' },
            { t: 'controls', nation: 'JAP', region: 'ned-east-indies' },
            {
              t: 'and',
              c: [
                { t: 'controls', nation: 'JAP', region: 'chi-canton' },
                { t: 'tension', atLeast: 55 },
              ],
            },
          ],
        },
      ],
    },
    once: true,
    priority: 7,
    text:
      'DEPARTMENT OF STATE. Japanese forces have moved south, beyond any line the China Incident ' +
      'could explain, and the map now reads as a preparation against the Indies, Malaya, and the ' +
      'Philippines. Four-fifths of Japan\'s oil comes from the United States; the tankers load at San ' +
      'Pedro while the divisions they fuel march on territory Washington has asked Tokyo, formally ' +
      'and repeatedly, to leave alone. Treasury has prepared the orders: freeze Japanese assets, ' +
      'license all exports, and let no license issue for oil. The Ambassador in Tokyo warns that an ' +
      'embargo does not corner a government of that temper. It corners a fleet, with eighteen months ' +
      'of oil and a choice.',
    choices: [
      {
        label: 'Freeze the assets, stop the oil',
        detail: 'The full embargo, with the Dutch and British in line behind it. Japan buys nothing more with conquest unpaid for.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: FLAGS.EMBARGO_JAPAN, value: true },
          { t: 'relations', a: 'USA', b: 'JAP', delta: -30 },
          { t: 'warSupport', nation: 'USA', delta: 4 },
          { t: 'tension', delta: 4 },
          { t: 'report', to: 'JAP', kind: 'diplomatic', title: 'American embargo imposed', body: 'Washington has frozen Japanese assets and embargoed oil and steel, and the Dutch and British authorities have followed. The Navy\'s reserves are now a clock. Every course from here is a decision about that clock.' },
          { t: 'report', to: 'UK', kind: 'diplomatic', title: 'Washington embargoes Japan', body: 'The United States has cut Japan off from oil, steel, and its own frozen funds. The Pacific question will now be settled one way or the other within the year.' },
          { t: 'chronicle', text: 'The oil embargo fell on Japan, and the war party in Tokyo was handed its argument: strike south while the bunkers were still full.' },
        ],
      },
      {
        label: 'Scrap iron and aviation spirit only',
        detail: 'A partial screw. Deny the war materials with warlike names and leave crude oil, and a way back, on the table.',
        aiWeight: 2,
        effects: [
          { t: 'relations', a: 'USA', b: 'JAP', delta: -10 },
          { t: 'tension', delta: 1 },
          { t: 'warSupport', nation: 'USA', delta: 1 },
          { t: 'report', to: 'JAP', kind: 'diplomatic', title: 'Partial American restrictions', body: 'Washington has embargoed scrap metal and aviation gasoline but left crude oil in trade. The door is narrowed, not shut.' },
          { t: 'chronicle', text: 'America stopped short of the oil embargo and left Tokyo fuel enough to wait; the countdown our history started in July 1941 was never set running.', divergence: true },
        ],
      },
      {
        label: 'Trade continues',
        detail: 'An embargo is a blockade by another name, and blockades are how wars start. Sell, and keep talking.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'USA', b: 'JAP', delta: 5 },
          { t: 'warSupport', nation: 'USA', delta: -4 },
          { t: 'chronicle', text: 'The tankers kept loading for Yokohama with the conquest of the south already underway; commerce outvoted policy in Washington.', divergence: true },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. Manhattan Project priority.
  // -------------------------------------------------------------------------
  {
    id: 'usa-manhattan-project',
    title: 'A Letter from the Professors',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        { t: 'tech', nation: 'USA', track: 'industry', atLeast: 2 },
        { t: 'tension', atLeast: 55 },
        { t: 'alive', nation: 'USA' },
      ],
    },
    once: true,
    priority: 6,
    text:
      'THE WHITE HOUSE, PERSONAL AND CONFIDENTIAL. A letter over Professor Einstein\'s signature, ' +
      'drafted by the refugee physicists Szilard and Wigner, has reached the President\'s desk. It ' +
      'states that recent work makes it conceivable that uranium may be turned into a new and ' +
      'important source of energy, and that extremely powerful bombs of a new type may thereby be ' +
      'constructed. It notes that Germany has stopped the sale of uranium from the Czech mines it ' +
      'now holds. The scientists ask for watchfulness and, if necessary, quick action. The question ' +
      'is what a bomb that may not exist is worth in money that certainly does.',
    choices: [
      {
        label: 'Full priority',
        detail: 'A district of its own, unlimited funds, first call on materials and men. If the thing can be built, America builds it first.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: USA_MANHATTAN, value: true },
          { t: 'tech', nation: 'USA', track: 'secret', delta: 1 },
          { t: 'ic', nation: 'USA', delta: -3 },
          { t: 'report', to: 'USA', kind: 'research', title: 'The uranium program', body: 'The special weapons program has been granted overriding priority. Sites are being acquired and the university laboratories emptied. Nothing about the program appears in any budget by name.' },
          { t: 'chronicle', text: 'The uranium letter was read and believed, and the largest secret enterprise in history began as a line item no one could find.' },
        ],
      },
      {
        label: 'A committee and a modest grant',
        detail: 'Watchfulness, as the professors ask. Six thousand dollars for graphite, and a standing committee to read the journals.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: USA_URANIUM_COMMITTEE, value: true },
          { t: 'report', to: 'USA', kind: 'research', title: 'Uranium committee formed', body: 'An advisory committee on uranium has been constituted and modestly funded. The work continues at the pace of the academic year.' },
        ],
      },
      {
        label: 'A weapon of the next war',
        detail: 'The Army needs rifles, not physics. File the letter.',
        aiWeight: 1,
        effects: [
          { t: 'chronicle', text: 'The Einstein letter was filed without action, and the atomic decade opened with the United States a spectator to its own scientists.', divergence: true },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. War entry, Pacific: Pearl Harbor or war with Japan however it comes.
  // -------------------------------------------------------------------------
  {
    id: 'usa-day-of-infamy',
    title: 'Air Raid, Pearl Harbor',
    nation: 'USA',
    fires: {
      t: 'or',
      c: [
        { t: 'flag', key: FLAGS.PEARL_HARBOR },
        { t: 'atWar', a: 'USA', b: 'JAP' },
      ],
    },
    once: true,
    priority: 9,
    text:
      'OFFICE OF THE CHIEF OF NAVAL OPERATIONS. War has come in the Pacific. Japanese carrier ' +
      'aircraft have struck the Fleet at its moorings without declaration or warning; the ' +
      'battleship line is burning in its own harbor and the casualty signals are still coming in. ' +
      'The Ambassador of Japan delivered his government\'s final note an hour after the first bomb ' +
      'fell. The President will go before a joint session of the Congress tomorrow at noon. The ' +
      'isolationist committees are dissolving themselves by telegram tonight. What is asked of the ' +
      'Congress, and how much of the world\'s war America now takes for its own, is the President\'s ' +
      'to decide by morning.',
    choices: [
      {
        label: 'A state of war has existed',
        detail: 'War with Japan, alliance with all who fight the aggressors, and the whole weight of the Republic behind both.',
        aiWeight: 5,
        effects: [
          { t: 'declareWar', attacker: 'USA', defender: 'JAP' },
          { t: 'joinFaction', nation: 'USA', faction: 'allies' },
          { t: 'flag', key: USA_MOBILIZED, value: true },
          { t: 'warSupport', nation: 'USA', delta: 35 },
          { t: 'stability', nation: 'USA', delta: 5 },
          { t: 'manpower', nation: 'USA', delta: 2500 },
          { t: 'ic', nation: 'USA', delta: 8 },
          { t: 'newArmy', nation: 'USA', name: 'U.S. First Army', location: 'usa-east', strength: 60, equipment: 50 },
          { t: 'report', to: 'UK', kind: 'diplomatic', title: 'America is in the war', body: 'The Congress has declared war and the United States has joined the alliance. The output of American industry, the two-ocean fleet, and an army still being raised are now committed to the common cause.' },
          { t: 'report', to: 'JAP', kind: 'diplomatic', title: 'The American declaration', body: 'The United States has declared war with one dissenting vote. The strike bought a season\'s advantage in the Pacific and mortgaged everything after it.' },
          { t: 'report', to: 'GER', kind: 'intel', title: 'Washington mobilizes', body: 'America is at war in the Pacific and has aligned with the Allied powers. Whether its weight falls east or west is not yet decided in Washington.' },
          { t: 'chronicle', text: 'The Pacific Fleet burned at anchor, and a country that had argued about the war for two years entered it in an afternoon, united.' },
        ],
      },
      {
        label: 'War with Japan alone',
        detail: 'The quarrel is with the empire that struck us. The Atlantic stays as it was; Europe fights its own war.',
        aiWeight: 2,
        effects: [
          { t: 'declareWar', attacker: 'USA', defender: 'JAP' },
          { t: 'flag', key: USA_MOBILIZED, value: true },
          { t: 'warSupport', nation: 'USA', delta: 30 },
          { t: 'manpower', nation: 'USA', delta: 2000 },
          { t: 'ic', nation: 'USA', delta: 6 },
          { t: 'report', to: 'UK', kind: 'diplomatic', title: 'A one-ocean war', body: 'The Congress has declared war on Japan and on Japan only. Washington has declined alliance and keeps its Atlantic policy unchanged. American weight goes to the Pacific.' },
          { t: 'chronicle', text: 'America went to war with Japan alone and left Europe\'s war at arm\'s length, an abstention our history was not permitted to keep.', divergence: true },
        ],
      },
      {
        label: 'Reprisal without general war',
        detail: 'Break relations, seize what is Japanese, demand reparation. Ask the Congress for nothing it must vote on.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'USA', b: 'JAP', delta: -20 },
          { t: 'warSupport', nation: 'USA', delta: -10 },
          { t: 'stability', nation: 'USA', delta: -8 },
          { t: 'tension', delta: 2 },
          { t: 'chronicle', text: 'The fleet burned and the Congress was not asked for war; no verdict of our history is stranger to record than this one.', divergence: true },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 8. War entry, Atlantic: Germany and the United States at war — the
  //    grand-strategy ruling. Fires on an Axis declaration or any US-German war.
  // -------------------------------------------------------------------------
  {
    id: 'usa-germany-first',
    title: 'Rainbow Five',
    nation: 'USA',
    fires: { t: 'atWar', a: 'USA', b: 'GER' },
    once: true,
    priority: 8,
    text:
      'JOINT BOARD, WASHINGTON. Germany and the United States are at war, and the planning question ' +
      'that the staff colleges have argued for two years is now a live order waiting for signature. ' +
      'The joint estimate is unsentimental: Germany is the stronger enemy, and only Germany can lose ' +
      'the war for the coalition in a single campaign season. Against this stands the fact that ' +
      'American ships and American territory have burned in the Pacific, and the public\'s anger ' +
      'points west. The Board asks for a ruling on where the main effort goes, knowing the ruling ' +
      'will govern every convoy, every landing, and every argument with every ally for the duration.',
    choices: [
      {
        label: 'Germany first',
        detail: 'The main effort goes to the Atlantic. The Pacific holds with what can be spared until the stronger enemy is finished.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: USA_GERMANY_FIRST, value: true },
          { t: 'joinFaction', nation: 'USA', faction: 'allies' },
          { t: 'warSupport', nation: 'USA', delta: 8 },
          { t: 'relations', a: 'USA', b: 'UK', delta: 15 },
          { t: 'relations', a: 'USA', b: 'SOV', delta: 10 },
          { t: 'report', to: 'UK', kind: 'diplomatic', title: 'The main effort comes east', body: 'The American Joint Board has ruled for Germany first. The buildup in Britain begins at once; the Pacific becomes a holding theater until the decision in Europe.' },
          { t: 'report', to: 'SOV', kind: 'diplomatic', title: 'American strategy declared', body: 'Washington has fixed its main effort against Germany. American supply and, in time, a second front now weigh in the European balance.' },
          { t: 'chronicle', text: 'The Joint Board ruled for Germany first, and the shape of the whole war followed from a single page of staff prose.' },
        ],
      },
      {
        label: 'The Pacific first',
        detail: 'The enemy that struck America is dealt with first. Europe receives supply, sympathy, and nothing else for now.',
        aiWeight: 1,
        available: { t: 'atWar', a: 'USA', b: 'JAP' },
        effects: [
          { t: 'flag', key: USA_PACIFIC_FIRST, value: true },
          { t: 'navy', nation: 'USA', delta: 40 },
          { t: 'warSupport', nation: 'USA', delta: 5 },
          { t: 'relations', a: 'USA', b: 'UK', delta: -10 },
          { t: 'report', to: 'UK', kind: 'diplomatic', title: 'America turns west', body: 'Against every staff conversation of the past year, Washington has ruled for the Pacific first. No American buildup in Britain is to be expected this year or next.' },
          { t: 'chronicle', text: 'America put its weight into the Pacific first and let the European war wait, reversing the ruling on which our history\'s coalition was built.', divergence: true },
        ],
      },
      {
        label: 'Hold both oceans, build first',
        detail: 'No main effort yet. Stand on the defensive everywhere while the arsenal reaches full output, then choose.',
        aiWeight: 2,
        effects: [
          { t: 'ic', nation: 'USA', delta: 5 },
          { t: 'stability', nation: 'USA', delta: 2 },
          { t: 'warSupport', nation: 'USA', delta: -3 },
          { t: 'chronicle', text: 'Washington declined to name a main effort in its first year of war, trading the initiative for inventory.', divergence: true },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 9. War economy conversion once the country is in.
  // -------------------------------------------------------------------------
  {
    id: 'usa-war-production',
    title: 'The Production Question',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'USA' },
        { t: 'warSupport', nation: 'USA', atLeast: 40 },
      ],
    },
    once: true,
    priority: 6,
    text:
      'WAR PRODUCTION BOARD, WASHINGTON. The President has named figures the industrialists ' +
      'privately call impossible: sixty thousand aircraft this year, forty-five thousand tanks, ' +
      'eight million tons of shipping. The automobile industry alone commands the machine tools to ' +
      'approach them, and the automobile industry is still building automobiles. The Board holds ' +
      'authority to end that with a signature: no civilian cars, rationed rubber and steel, ' +
      'priorities enforced by criminal law. Labor asks who will bear the freeze in wages and prices ' +
      'that must follow. The figures wait on the answer.',
    choices: [
      {
        label: 'Total conversion',
        detail: 'The last civilian automobile leaves the line this month. Every machine tool in the country works for the government.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: USA_WAR_ECONOMY, value: true },
          { t: 'ic', nation: 'USA', delta: 15 },
          { t: 'stability', nation: 'USA', delta: -3 },
          { t: 'report', to: 'GER', kind: 'intel', title: 'American conversion ordered', body: 'Civilian manufacture in the United States has been halted by decree. The production figures announced in Washington exceed the combined Axis programs and are, by our attaches\' estimate, achievable.' },
          { t: 'report', to: 'JAP', kind: 'intel', title: 'American industry converts', body: 'The United States has placed its whole industrial plant under war priorities. The material balance in the Pacific will worsen every quarter from this one forward.' },
          { t: 'chronicle', text: 'Detroit stopped making cars, and the figures called impossible in January were exceeded by December.' },
        ],
      },
      {
        label: 'Guns and butter both',
        detail: 'Convert the slack, not the whole. The home front keeps its goods and its patience.',
        aiWeight: 2,
        effects: [
          { t: 'ic', nation: 'USA', delta: 8 },
          { t: 'stability', nation: 'USA', delta: 2 },
        ],
      },
      {
        label: 'Let the contracts lead',
        detail: 'No decrees. Cost-plus contracts and the profit motive will convert industry at their own pace.',
        aiWeight: 1,
        effects: [
          { t: 'ic', nation: 'USA', delta: 4 },
          { t: 'stability', nation: 'USA', delta: 3 },
          { t: 'warSupport', nation: 'USA', delta: -2 },
          { t: 'chronicle', text: 'American mobilization was left to the market, and the arsenal filled slowly, at list price.', divergence: true },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 10. The third-term election: the isolationist off-ramp the voters held.
  // -------------------------------------------------------------------------
  {
    id: 'usa-third-term',
    title: 'The Third Term',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        { t: 'turnAtLeast', n: 33 },
        { t: 'turnBefore', n: 44 },
        { t: 'leaderIs', nation: 'USA', leader: 'roosevelt' },
        { t: 'tension', atLeast: 35 },
      ],
    },
    once: true,
    priority: 5,
    text:
      'WASHINGTON. No President has stood for a third term since the Republic began, and the ' +
      'precedent is the quiet center of the campaign. The opposition candidate accepts aid to the ' +
      'democracies but promises the mothers of America their sons will not be sent to any foreign ' +
      'war; the President, pressed, has now promised the same words. The polls turn on whether the ' +
      'country believes the world crisis excuses the broken tradition, or is the argument against ' +
      'trusting one man with it. The convention waits on the President\'s intention, which he has ' +
      'told no one, possibly including himself.',
    choices: [
      {
        label: 'Break the tradition',
        detail: 'Stand for the third term. The crisis does not change horses.',
        aiWeight: 4,
        effects: [
          { t: 'warSupport', nation: 'USA', delta: 3 },
          { t: 'stability', nation: 'USA', delta: 3 },
          { t: 'chronicle', text: 'The two-term tradition broke against the world crisis, and the same hand stayed on the wheel through what followed.' },
        ],
      },
      {
        label: 'Retire to Hyde Park',
        detail: 'The tradition holds. The Vice President takes the nomination, and the country a quieter course.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: USA_FDR_RETIRED, value: true },
          { t: 'setLeader', nation: 'USA', leader: 'garner' },
          { t: 'setAI', nation: 'USA', patch: { aggression: 0.05, focus: 'consolidation' } },
          { t: 'warSupport', nation: 'USA', delta: -6 },
          { t: 'report', to: 'UK', kind: 'diplomatic', title: 'Change in Washington', body: 'The President has declined a third term. His successor is a Texas conservative with no appetite for foreign commitments. Every assurance London holds is now personal to a man leaving office.' },
          { t: 'chronicle', text: 'Roosevelt kept the two-term tradition and went home, and the interventionist course of our history left with him.', divergence: true },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 11. Succession: Garner, on the death of the President.
  // -------------------------------------------------------------------------
  {
    id: 'usa-succession-garner',
    title: 'The Vice President Sworn',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'USA', leader: 'garner' },
        { t: 'flag', key: ROOSEVELT_DEAD },
      ],
    },
    once: true,
    priority: 8,
    text:
      'WASHINGTON. The President is dead, and the oath has been administered to the Vice President ' +
      'in a Capitol office with the blinds drawn. The new President is a Texan of the old school, ' +
      'a man of the Congress who took the second office as a duty and has described it in terms the ' +
      'newspapers decline to print. He inherits commitments abroad that he argued against in ' +
      'private, a cabinet that was not chosen by him, and a country that knows the other man\'s ' +
      'voice by heart. The chanceries of three continents are cabling home tonight the same ' +
      'question: does the policy survive the man.',
    choices: [
      {
        label: 'Continuity of government',
        detail: 'The cabinet stays, the commitments stand, the dead man\'s course is steered by the living.',
        aiWeight: 3,
        effects: [
          { t: 'stability', nation: 'USA', delta: 4 },
          { t: 'warSupport', nation: 'USA', delta: -3 },
        ],
      },
      {
        label: 'Retrench',
        detail: 'The country did not elect the late President\'s promises twice over. Draw in the commitments.',
        aiWeight: 2,
        effects: [
          { t: 'setAI', nation: 'USA', patch: { aggression: 0.05, focus: 'consolidation' } },
          { t: 'warSupport', nation: 'USA', delta: -6 },
          { t: 'stability', nation: 'USA', delta: 2 },
          { t: 'report', to: 'UK', kind: 'diplomatic', title: 'Washington draws in', body: 'The new administration is reviewing every foreign commitment of its predecessor. Nothing is repudiated; nothing is reaffirmed.' },
          { t: 'chronicle', text: 'The succession in Washington broke the interventionist line, and America\'s hand withdrew from scales it had only begun to touch.', divergence: true },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 12. Succession: Hull, if the office passes to the Secretary of State.
  // -------------------------------------------------------------------------
  {
    id: 'usa-succession-hull',
    title: 'The Secretary Succeeds',
    nation: 'USA',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'USA', leader: 'hull' },
        { t: 'flag', key: ROOSEVELT_DEAD },
      ],
    },
    once: true,
    priority: 8,
    text:
      'WASHINGTON. By the succession act the office has passed to the Secretary of State, a Tennessee ' +
      'judge grown old in the pursuit of orderly trade among nations. The new President wrote the ' +
      'reciprocal trade treaties, argued Japan patiently toward a settlement that never came, and ' +
      'believes with the whole force of a deliberate mind that commerce, given law, prevents war. He ' +
      'takes the oath in a capital that respects him and cannot guess what he will do, chiefly ' +
      'because his creed has never before been tested from the chair where the decisions are final.',
    choices: [
      {
        label: 'The policy holds',
        detail: 'The late President\'s commitments are the nation\'s commitments. The course does not change.',
        aiWeight: 3,
        effects: [
          { t: 'stability', nation: 'USA', delta: 3 },
          { t: 'relations', a: 'USA', b: 'UK', delta: 5 },
        ],
      },
      {
        label: 'Order through commerce',
        detail: 'One more attempt at the judge\'s lifelong case: trade agreements before armaments, everywhere a door remains open.',
        aiWeight: 2,
        effects: [
          { t: 'relations', a: 'USA', b: 'JAP', delta: 10 },
          { t: 'relations', a: 'USA', b: 'GER', delta: 5 },
          { t: 'warSupport', nation: 'USA', delta: -4 },
          { t: 'report', to: 'JAP', kind: 'diplomatic', title: 'A new note from Washington', body: 'The new American President proposes a general settlement on the basis of restored trade. The terms are the old terms, but the signature would now be his own.' },
          { t: 'chronicle', text: 'The lawyer of open trade reached the presidency and spent its first months on one more settlement offer; history had run out of patience for such letters.', divergence: true },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 13. Surrender event, engine convention id: fires on capitulation. Rare.
  // -------------------------------------------------------------------------
  {
    id: surrenderEventId('USA'),
    title: 'The Fall of Washington',
    nation: 'USA',
    fires: { t: 'flag', key: capitulatedFlag('USA') },
    once: true,
    priority: 9,
    text:
      'CONTINUITY OF GOVERNMENT DIRECTIVE, EYES ONLY. Enemy forces hold the capital and the ' +
      'seaboard, and the machinery of the federal government is dispersed or destroyed. No plan ' +
      'ever seriously provided for this. What remains: the interior states untouched and unoccupied, ' +
      'an industrial plant beyond any invader\'s reach in the middle of the continent, and a ' +
      'population that has not been asked whether it considers itself beaten. Against this stands ' +
      'counsel that constitutional government must be preserved by treating while a Congress exists ' +
      'to ratify the terms. The Union has never surrendered. It has also never had to answer whether ' +
      'it would.',
    choices: [
      {
        label: 'The government goes west',
        detail: 'The Republic withdraws beyond the mountains and fights from the interior. The coasts are lost; the war is not conceded.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: exileFlag('USA'), value: true },
          { t: 'relations', a: 'USA', b: 'CAN', delta: 15 },
          { t: 'report', to: 'CAN', kind: 'diplomatic', title: 'Washington will not treat', body: 'The remnant American government has withdrawn into the interior and declared the war continues. It asks for a common front on the continent.' },
          { t: 'report', to: 'UK', kind: 'diplomatic', title: 'America fights on', body: 'The United States government has refused terms and reconstituted itself beyond the Mississippi. The American war continues from the interior.' },
          { t: 'chronicle', text: 'The seaboard fell and the United States government went inland rather than sign, a chapter without precedent in any history, including ours.', divergence: true },
        ],
      },
      {
        label: 'An armistice with Berlin',
        detail: 'Treat while a Congress exists to ratify. End it on the best terms the situation still buys.',
        aiWeight: 1,
        available: { t: 'atWar', a: 'USA', b: 'GER' },
        effects: [
          { t: 'puppet', nation: 'USA', by: 'GER' },
          { t: 'tension', delta: -5 },
          { t: 'report', to: 'UK', kind: 'diplomatic', title: 'The United States capitulates', body: 'An American delegation has signed an armistice with Germany. The remaining fleet is to be interned under the armistice commission.' },
          { t: 'chronicle', text: 'The United States signed an armistice on its own soil, the first peace ever dictated to the Republic; nothing in our history stands anywhere near this page.', divergence: true },
        ],
      },
      {
        label: 'An armistice in the Pacific',
        detail: 'Treat with Tokyo while a government remains to sign. The war ends where it began.',
        aiWeight: 1,
        available: {
          t: 'and',
          c: [
            { t: 'atWar', a: 'USA', b: 'JAP' },
            { t: 'not', c: { t: 'atWar', a: 'USA', b: 'GER' } },
          ],
        },
        effects: [
          { t: 'puppet', nation: 'USA', by: 'JAP' },
          { t: 'tension', delta: -5 },
          { t: 'report', to: 'UK', kind: 'diplomatic', title: 'The United States capitulates', body: 'An American delegation has accepted Japanese terms. The Pacific war is over on Tokyo\'s conditions.' },
          { t: 'chronicle', text: 'America accepted terms from Japan, and the Pacific century began under the other flag; our history holds no such page.', divergence: true },
        ],
      },
    ],
  },
];
