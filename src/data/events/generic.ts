// Generic event pack — parameterized minor-nation templates instantiated as
// concrete events, id prefix 'gen-'. Six template families per the content
// matrix: border crisis, great-power backing offer, join-faction ultimatum
// from an adjacent major, partisan uprising in occupied regions, mobilization
// choice when a neighbor is at war, trade demand from a major.
//
// Pack-local flags (set and read only inside this file):
//   GEN_YUG_PACT          Yugoslavia signed the Axis adhesion protocol
//   GEN_BEL_STAFF_TALKS   Belgium opened secret staff talks with the Allies
//
// Cross-pack flags come from registry.ts (WINTER_WAR, EMBARGO_JAPAN).

import type { GameEvent } from '../../engine/types';
import { FLAGS } from './registry';

const F_YUG_PACT = 'GEN_YUG_PACT';
const F_BEL_STAFF_TALKS = 'GEN_BEL_STAFF_TALKS';

export const GENERIC_EVENTS: GameEvent[] = [
  // ==========================================================================
  // TEMPLATE: border crisis
  // ==========================================================================

  // 1. Hungary vs Romania over Transylvania (Vienna Award analogue).
  {
    id: 'gen-border-transylvania',
    title: 'The Transylvanian Question',
    nation: 'HUN',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'HUN' },
        { t: 'alive', nation: 'ROM' },
        { t: 'not', c: { t: 'atWar', a: 'HUN', b: 'ROM' } },
        { t: 'controls', nation: 'ROM', region: 'rom-transylvania' },
        { t: 'relations', a: 'HUN', b: 'ROM', below: -25 },
        { t: 'tension', atLeast: 40 },
        { t: 'turnAtLeast', n: 12 },
      ],
    },
    once: true,
    priority: 5,
    text:
      'FOREIGN MINISTRY, BUDAPEST, MEMORANDUM. The Transylvanian question will not keep. ' +
      'Twenty years after Trianon the census maps still show a million and a half Magyars ' +
      'under Romanian administration, and the press of both capitals has taken up the ' +
      'frontier again. Bucharest reinforces its garrisons in the Carpathian passes; our own ' +
      'staff asks for authority to answer. The Regent\'s council sees three roads: carry the ' +
      'claim to the Axis powers and let Berlin and Rome arbitrate, press it alone with the ' +
      'army at our back, or let the question rest for a quieter season. Each has its price, ' +
      'and the bill will be presented in Bucharest either way.',
    choices: [
      {
        label: 'Ask Berlin and Rome to arbitrate',
        detail: 'An Axis award would deliver the province without a shot, and deliver Hungary to the Axis ledger.',
        available: { t: 'relations', a: 'HUN', b: 'GER', atLeast: 20 },
        effects: [
          { t: 'cedeRegion', region: 'rom-transylvania', to: 'HUN' },
          { t: 'relations', a: 'HUN', b: 'GER', delta: 15 },
          { t: 'relations', a: 'ROM', b: 'GER', delta: 10 },
          { t: 'relations', a: 'HUN', b: 'ROM', delta: -20 },
          { t: 'tension', delta: 2 },
          {
            t: 'chronicle',
            text: 'By an arbitral award dictated in Vienna, northern Transylvania passed to Hungary without war, and both claimants passed a little further into the German orbit.',
          },
          {
            t: 'report', to: 'ROM', kind: 'diplomatic', title: 'The Vienna award',
            body: 'Under Axis arbitration Bucharest has been directed to cede Transylvania to Hungary. Berlin offers a guarantee of the remaining frontiers as consolation.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Press the claim alone',
        detail: 'Mass the army on the passes and let Bucharest count divisions.',
        effects: [
          { t: 'relations', a: 'HUN', b: 'ROM', delta: -25 },
          { t: 'warSupport', nation: 'HUN', delta: 5 },
          { t: 'tension', delta: 3 },
          {
            t: 'chronicle',
            text: 'Budapest pressed the Transylvanian claim with its own army rather than through Axis arbitration, a rupture the arbitrated award of our history was designed to prevent.',
            divergence: true,
          },
          {
            t: 'report', to: 'ROM', kind: 'intel', title: 'Hungarian concentrations',
            body: 'Hungarian formations are concentrating opposite the Carpathian passes. No note has accompanied the movement.',
          },
        ],
        aiWeight: 1,
      },
      {
        label: 'Let the question rest',
        detail: 'The province has waited twenty years. It can wait for a better hour.',
        effects: [
          { t: 'relations', a: 'HUN', b: 'ROM', delta: 5 },
          { t: 'stability', nation: 'HUN', delta: -3 },
        ],
        aiWeight: 1,
      },
    ],
  },

  // 2. Poland's ultimatum to Lithuania (March 1938 analogue).
  {
    id: 'gen-border-lithuania',
    title: 'Incident on the Demarcation Line',
    nation: 'POL',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'POL' },
        { t: 'alive', nation: 'LIT' },
        { t: 'not', c: { t: 'atWar', a: 'POL' } },
        { t: 'relations', a: 'POL', b: 'LIT', below: -20 },
        { t: 'tension', atLeast: 15 },
      ],
    },
    once: true,
    priority: 4,
    text:
      'GENERAL STAFF, WARSAW. A soldier of the Frontier Defence Corps was shot dead on the ' +
      'Lithuanian demarcation line in the night. Kaunas has recognized neither our frontier ' +
      'nor our government these twenty years; there are no legations, no railways, no post. ' +
      'The incident is small and the opportunity is not. The Marshal\'s circle presses for an ' +
      'ultimatum: normal diplomatic relations within forty-eight hours, or the army marches. ' +
      'The Foreign Ministry counsels a quieter instrument. Europe is watching other capitals ' +
      'this season, and would notice very little done here.',
    choices: [
      {
        label: 'Deliver the ultimatum',
        detail: 'Forty-eight hours. Kaunas has no army to refuse with.',
        effects: [
          { t: 'relations', a: 'POL', b: 'LIT', delta: 25 },
          { t: 'warSupport', nation: 'POL', delta: 3 },
          { t: 'tension', delta: 2 },
          {
            t: 'chronicle',
            text: 'Faced with a Polish ultimatum, Lithuania restored diplomatic relations within the time allowed. The frontier posts opened for the first time since the seizure of Wilno.',
          },
          {
            t: 'report', to: 'LIT', kind: 'diplomatic', title: 'Warsaw\'s ultimatum',
            body: 'Poland demands the establishment of normal diplomatic relations within forty-eight hours. The alternative is left to the imagination, and to the army visible from the frontier.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Mass troops and claim Kaunas',
        detail: 'Settle the whole question, not the protocol of it.',
        effects: [
          { t: 'relations', a: 'POL', b: 'LIT', delta: -15 },
          { t: 'addClaim', nation: 'POL', region: 'lit-kaunas' },
          { t: 'tension', delta: 4 },
          {
            t: 'chronicle',
            text: 'Warsaw answered the frontier incident with a formal claim to Kaunas itself. In our history Poland demanded only an exchange of ministers, and got it.',
            divergence: true,
          },
          {
            t: 'report', to: 'LIT', kind: 'intel', title: 'Polish concentrations',
            body: 'Polish forces are massing along the demarcation line. Warsaw\'s press has begun printing maps.',
          },
        ],
        aiWeight: 1,
      },
      {
        label: 'Refer the matter to Geneva',
        detail: 'A protest, a commission, a report next year.',
        effects: [
          { t: 'relations', a: 'POL', b: 'LIT', delta: 10 },
          { t: 'warSupport', nation: 'POL', delta: -2 },
          {
            t: 'chronicle',
            text: 'Poland carried the frontier shooting to the League rather than to an ultimatum, and the question of relations with Lithuania stayed unsettled.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // 3. Bulgaria vs Greece in the Rhodope (Petrich-style frontier incident).
  {
    id: 'gen-border-rhodope',
    title: 'Fire on the Rhodope Frontier',
    nation: 'BUL',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'BUL' },
        { t: 'alive', nation: 'GRE' },
        { t: 'not', c: { t: 'atWar', a: 'BUL', b: 'GRE' } },
        { t: 'relations', a: 'BUL', b: 'GRE', below: -20 },
        { t: 'tension', atLeast: 25 },
      ],
    },
    once: true,
    priority: 3,
    text:
      'WAR MINISTRY, SOFIA. Exchange of fire on the Greek frontier in the Rhodope: two dead ' +
      'on our side, a post burned, each staff blaming the other\'s patrol. Athens has closed ' +
      'the crossings and lodged protest at Geneva. This frontier has burned before, in 1925, ' +
      'and the League\'s bill for that lesson was paid in humiliation. The army asks leave to ' +
      'answer in kind. The Foreign Ministry observes that Bulgaria has claims older than this ' +
      'incident and friends newer than the League, and that whatever answer is chosen will be ' +
      'read aloud in every chancellery in the Balkans.',
    choices: [
      {
        label: 'Accept mediation',
        detail: 'A joint commission, compensation for the dead, the frontier reopened.',
        effects: [
          { t: 'relations', a: 'BUL', b: 'GRE', delta: 10 },
          { t: 'stability', nation: 'BUL', delta: -2 },
          {
            t: 'report', to: 'GRE', kind: 'diplomatic', title: 'Sofia accepts mediation',
            body: 'Bulgaria accepts a joint commission of inquiry into the Rhodope incident. The frontier crossings will reopen under supervision.',
          },
        ],
        aiWeight: 3,
      },
      {
        label: 'Retaliate across the frontier',
        detail: 'A reprisal raid against the post that fired, and a claim placed on the record.',
        effects: [
          { t: 'relations', a: 'BUL', b: 'GRE', delta: -20 },
          { t: 'addClaim', nation: 'BUL', region: 'gre-athens' },
          { t: 'warSupport', nation: 'BUL', delta: 4 },
          { t: 'tension', delta: 3 },
          {
            t: 'chronicle',
            text: 'Sofia answered the Rhodope shooting with reprisal and a revived claim to Thrace, where in our history the incident was buried by a commission.',
            divergence: true,
          },
          {
            t: 'report', to: 'GRE', kind: 'front', title: 'Bulgarian reprisal raid',
            body: 'Bulgarian troops crossed the Rhodope frontier in company strength, burned a border post, and withdrew. Sofia\'s note speaks of Thrace.',
          },
        ],
        aiWeight: 1,
      },
      {
        label: 'Ask Berlin to weigh in',
        detail: 'Germany buys our tobacco and sells us rifles. Let the protest travel through friendlier post.',
        effects: [
          { t: 'relations', a: 'BUL', b: 'GER', delta: 10 },
          { t: 'relations', a: 'GRE', b: 'GER', delta: -5 },
          { t: 'tension', delta: 1 },
        ],
        aiWeight: 2,
      },
    ],
  },

  // ==========================================================================
  // TEMPLATE: great-power backing offer
  // ==========================================================================

  // 4. Anglo-French guarantee to Romania (April 1939 analogue).
  {
    id: 'gen-backing-romania',
    title: 'A Guarantee from the West',
    nation: 'ROM',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'ROM' },
        { t: 'not', c: { t: 'atWar', a: 'ROM' } },
        { t: 'faction', nation: 'UK', is: 'allies' },
        { t: 'tension', atLeast: 45 },
        { t: 'turnAtLeast', n: 12 },
      ],
    },
    once: true,
    priority: 6,
    text:
      'ROYAL PALACE, BUCHAREST. The British and French ministers called on the King this ' +
      'morning with a joint declaration: in the event of action clearly threatening Romanian ' +
      'independence, their governments will lend at once all support in their power. The ' +
      'guarantee asks no signature and costs London nothing until it costs everything. ' +
      'Berlin buys our oil and sells us aircraft; Paris is far away and proved little in the ' +
      'Czech affair. The Crown Council meets at noon to decide what to accept, whom to ' +
      'believe, and how loudly to say so.',
    choices: [
      {
        label: 'Accept the guarantee',
        detail: 'Take the Western promise and keep selling oil to everyone.',
        effects: [
          { t: 'guarantee', by: 'UK', of: 'ROM' },
          { t: 'guarantee', by: 'FRA', of: 'ROM' },
          { t: 'relations', a: 'ROM', b: 'UK', delta: 15 },
          { t: 'relations', a: 'ROM', b: 'FRA', delta: 10 },
          { t: 'relations', a: 'ROM', b: 'GER', delta: -15 },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'Bucharest accepts a Western guarantee',
            body: 'London and Paris have declared they will support Romania against any threat to its independence. The oil contracts are unaffected, for the present.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Decline and balance',
        detail: 'A guarantee accepted is a target painted. Stay between the blocs.',
        effects: [
          { t: 'relations', a: 'ROM', b: 'GER', delta: 10 },
          { t: 'relations', a: 'ROM', b: 'UK', delta: -5 },
          {
            t: 'chronicle',
            text: 'Bucharest declined the Anglo-French guarantee it accepted in our history, preferring an unpromised neutrality between the blocs.',
            divergence: true,
          },
        ],
        aiWeight: 2,
      },
      {
        label: 'Seek German protection outright',
        detail: 'The Reich is the customer, the armorer, and the neighbor. Choose it.',
        effects: [
          { t: 'pact', a: 'ROM', b: 'GER', kind: 'nap' },
          { t: 'relations', a: 'ROM', b: 'GER', delta: 25 },
          { t: 'relations', a: 'ROM', b: 'UK', delta: -20 },
          { t: 'tension', delta: 2 },
          {
            t: 'chronicle',
            text: 'Romania answered the Western guarantee by placing itself under German protection at once, a passage that in our history took another year and a fallen France.',
            divergence: true,
          },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'Bucharest turns to Berlin',
            body: 'Romania has declined the joint guarantee and signed a non-aggression instrument with Germany. The Ploiesti fields sit henceforth inside the German ledger.',
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // 5. British guarantee to Greece after the seizure of Albania.
  {
    id: 'gen-backing-greece',
    title: 'The British Declaration',
    nation: 'GRE',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'GRE' },
        { t: 'controls', nation: 'ITA', region: 'alb-albania' },
        { t: 'tension', atLeast: 35 },
      ],
    },
    once: true,
    priority: 6,
    text:
      'FOREIGN MINISTRY, ATHENS. Italian troops hold Albania; their engineers survey roads ' +
      'that end at our frontier posts in Epirus. This morning the British minister conveyed ' +
      'his government\'s declaration: should Greek independence be clearly threatened, His ' +
      'Majesty\'s Government will feel bound to lend all the support in its power. The ' +
      'General Staff notes what such declarations did not do for Prague. It notes also that ' +
      'the fleet which matters in these waters flies the White Ensign, and that a small ' +
      'country on the sea route to Suez does not get to choose whether it interests great ' +
      'powers, only which ones.',
    choices: [
      {
        label: 'Accept the British guarantee',
        detail: 'Anchor the country to the sea power.',
        effects: [
          { t: 'guarantee', by: 'UK', of: 'GRE' },
          { t: 'relations', a: 'GRE', b: 'UK', delta: 15 },
          { t: 'relations', a: 'GRE', b: 'ITA', delta: -10 },
          {
            t: 'report', to: 'ITA', kind: 'diplomatic', title: 'London guarantees Greece',
            body: 'Britain has publicly bound itself to Greek independence. Any move south from Albania now carries a British invoice.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Refuse all guarantees and arm',
        detail: 'Promises invite the blow they claim to prevent. Fortify the Epirus frontier instead.',
        effects: [
          { t: 'newArmy', nation: 'GRE', name: 'Army of Epirus', location: 'gre-athens', strength: 45, equipment: 30 },
          { t: 'stability', nation: 'GRE', delta: -3 },
          {
            t: 'chronicle',
            text: 'Athens declined the British guarantee it accepted in our history and stood armed and alone on the Epirus frontier.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
      {
        label: 'Seek an accommodation with Rome',
        detail: 'Assure the Duce that Greece threatens nobody, and mean it audibly.',
        effects: [
          { t: 'relations', a: 'GRE', b: 'ITA', delta: 15 },
          { t: 'relations', a: 'GRE', b: 'UK', delta: -10 },
          {
            t: 'chronicle',
            text: 'Greece answered the seizure of Albania with courtesies toward Rome rather than the British guarantee of our history.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // 6. Anglo-French-Turkish treaty (October 1939 analogue).
  {
    id: 'gen-backing-turkey',
    title: 'The Ankara Negotiations',
    nation: 'TUR',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'TUR' },
        { t: 'not', c: { t: 'atWar', a: 'TUR' } },
        { t: 'atWar', a: 'GER' },
        { t: 'tension', atLeast: 50 },
      ],
    },
    once: true,
    priority: 5,
    text:
      'FOREIGN MINISTRY, ANKARA, CIRCULAR TO MISSIONS. The war in Europe has reached the ' +
      'stage of bids. London and Paris offer a treaty of mutual assistance covering the ' +
      'Mediterranean, credits for the army, and equipment on terms not seen since the ' +
      'Ottoman debt. Berlin offers chromium contracts, machine tools, and the observation ' +
      'that Britain\'s guarantees have so far been redeemed in communiques. The Republic\'s ' +
      'policy since Lausanne has been to owe nothing to anyone. The Council of Ministers ' +
      'must now decide whether that policy survives a war on three horizons, and if not, ' +
      'in which currency to borrow.',
    choices: [
      {
        label: 'Sign with London and Paris',
        detail: 'Mutual assistance in the Mediterranean, with a clause excusing us from war on the Soviet Union.',
        effects: [
          { t: 'guarantee', by: 'UK', of: 'TUR' },
          { t: 'guarantee', by: 'FRA', of: 'TUR' },
          { t: 'relations', a: 'TUR', b: 'UK', delta: 15 },
          { t: 'relations', a: 'TUR', b: 'FRA', delta: 10 },
          { t: 'relations', a: 'TUR', b: 'GER', delta: -10 },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'Ankara signs with the Allies',
            body: 'Turkey has concluded a mutual assistance treaty with Britain and France covering the Mediterranean. The chromium negotiations continue regardless.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Sign a friendship treaty with Berlin',
        detail: 'Non-aggression, trade, and distance from other people\'s wars.',
        effects: [
          { t: 'pact', a: 'TUR', b: 'GER', kind: 'nap' },
          { t: 'relations', a: 'TUR', b: 'GER', delta: 15 },
          { t: 'relations', a: 'TUR', b: 'UK', delta: -10 },
          {
            t: 'chronicle',
            text: 'Turkey signed with Berlin first. In our history Ankara took the Allied treaty in 1939 and gave Germany its friendship paper only when German armies stood on the Bulgarian border.',
            divergence: true,
          },
        ],
        aiWeight: 2,
      },
      {
        label: 'Armed neutrality, no signatures',
        detail: 'Sell chromium to whoever pays. Sign nothing.',
        effects: [
          { t: 'stability', nation: 'TUR', delta: 2 },
          { t: 'relations', a: 'TUR', b: 'UK', delta: -5 },
          {
            t: 'chronicle',
            text: 'The Republic signed with nobody, holding to an armed and profitable neutrality stricter than the treaty-hedged one of our history.',
            divergence: true,
          },
        ],
        aiWeight: 2,
      },
    ],
  },

  // 7. Allied staff-talks offer to Belgium (winter 1939-40 analogue).
  {
    id: 'gen-backing-belgium',
    title: 'The Question of Staff Talks',
    nation: 'BEL',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'BEL' },
        { t: 'faction', nation: 'BEL', is: 'neutral' },
        { t: 'not', c: { t: 'atWar', a: 'BEL' } },
        { t: 'atWar', a: 'GER', b: 'FRA' },
      ],
    },
    once: true,
    priority: 6,
    text:
      'CABINET OF THE KING, BRUSSELS. The French and British governments ask again for staff ' +
      'conversations and for leave to enter Belgian territory before, not after, a German ' +
      'attack. The military argument is arithmetic: the Allied line is strongest on our ' +
      'soil, weakest improvised behind it. The political argument against is 1914 in ' +
      'reverse: the invitation itself may bring the invasion it prepares for, and the ' +
      'guarantee of our neutrality is the only treaty Berlin has not yet denounced. The King ' +
      'holds to the independent course. His ministers are no longer unanimous that the ' +
      'course still exists.',
    choices: [
      {
        label: 'Hold to independent neutrality',
        detail: 'No foreign soldier enters Belgium before the Germans do.',
        effects: [
          { t: 'stability', nation: 'BEL', delta: 2 },
          { t: 'relations', a: 'BEL', b: 'FRA', delta: -5 },
          { t: 'relations', a: 'BEL', b: 'UK', delta: -5 },
          {
            t: 'report', to: 'FRA', kind: 'diplomatic', title: 'Brussels declines again',
            body: 'Belgium refuses staff conversations and pre-positioning. The Dyle line will have to be occupied at the run, under fire, if it comes to that.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Open the frontier to the Allies',
        detail: 'Invite the French army in now and take a side while there is a side to take.',
        effects: [
          { t: 'joinFaction', nation: 'BEL', faction: 'allies' },
          { t: 'relations', a: 'BEL', b: 'FRA', delta: 20 },
          { t: 'relations', a: 'BEL', b: 'UK', delta: 20 },
          { t: 'relations', a: 'BEL', b: 'GER', delta: -30 },
          { t: 'tension', delta: 3 },
          {
            t: 'chronicle',
            text: 'Belgium invited the Allied armies in before the blow fell. In our history the frontier opened only on the morning of the invasion, hours too late to matter.',
            divergence: true,
          },
          {
            t: 'report', to: 'GER', kind: 'intel', title: 'Allied columns enter Belgium',
            body: 'French and British formations are crossing the Belgian frontier by invitation and digging in along the Dyle. The Belgian army is coordinating with Gamelin\'s staff.',
          },
        ],
        aiWeight: 1,
      },
      {
        label: 'Secret staff talks only',
        detail: 'Exchange plans through the attaches. Deny everything.',
        effects: [
          { t: 'flag', key: F_BEL_STAFF_TALKS, value: true },
          { t: 'relations', a: 'BEL', b: 'FRA', delta: 10 },
          { t: 'relations', a: 'BEL', b: 'UK', delta: 10 },
          { t: 'relations', a: 'BEL', b: 'GER', delta: -10 },
        ],
        aiWeight: 2,
      },
    ],
  },

  // ==========================================================================
  // TEMPLATE: join-faction ultimatum from an adjacent major
  // ==========================================================================

  // 8. German pressure on Bulgaria to adhere to the pact (March 1941 analogue).
  {
    id: 'gen-ultimatum-bulgaria',
    title: 'The Protocol of Adhesion',
    nation: 'BUL',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'BUL' },
        { t: 'faction', nation: 'BUL', is: 'neutral' },
        { t: 'atWar', a: 'GER' },
        { t: 'tension', atLeast: 55 },
        { t: 'relations', a: 'GER', b: 'BUL', atLeast: 20 },
        {
          t: 'or',
          c: [
            { t: 'faction', nation: 'ROM', is: 'axis' },
            { t: 'controls', nation: 'GER', region: 'rom-bucharest' },
            { t: 'controls', nation: 'GER', region: 'yug-belgrade' },
          ],
        },
      ],
    },
    once: true,
    priority: 7,
    text:
      'COUNCIL OF MINISTERS, SOFIA. The German minister presented the protocol of adhesion ' +
      'today and did not present alternatives. German formations stand on the Danube; their ' +
      'engineers have already bridged it on paper. Berlin asks for signature, passage for ' +
      'its troops, and the use of our railways, and offers in exchange the Aegean coastline ' +
      'and the settlement of every grievance since 1918. The King observes that Bulgaria has ' +
      'guessed wrong in every European war of his lifetime. The question before the council ' +
      'is whether refusing the Reich from a position on its army\'s line of march constitutes ' +
      'guessing right.',
    choices: [
      {
        label: 'Sign the protocol',
        detail: 'Adhere to the pact, open the railways, and collect in Thrace.',
        effects: [
          { t: 'joinFaction', nation: 'BUL', faction: 'axis' },
          { t: 'relations', a: 'BUL', b: 'GER', delta: 20 },
          { t: 'relations', a: 'BUL', b: 'UK', delta: -20 },
          { t: 'relations', a: 'BUL', b: 'SOV', delta: -15 },
          { t: 'tension', delta: 3 },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'Bulgaria adheres to the Axis',
            body: 'Sofia has signed the protocol. German troops are crossing the Danube by arrangement, and the Balkan rail net now runs on Berlin time.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Refuse and mobilize',
        detail: 'Decline the honor and man the Danube line.',
        effects: [
          { t: 'relations', a: 'BUL', b: 'GER', delta: -30 },
          { t: 'addClaim', nation: 'GER', region: 'bul-sofia' },
          { t: 'newArmy', nation: 'BUL', name: 'Danube Defense Army', location: 'bul-sofia', strength: 50, equipment: 35 },
          { t: 'tension', delta: 4 },
          {
            t: 'chronicle',
            text: 'Bulgaria refused the protocol it signed in our history and mobilized against the Reich instead of joining it.',
            divergence: true,
          },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'Sofia refuses',
            body: 'Bulgaria declines adhesion and has ordered mobilization. The railways south stay closed to German traffic.',
          },
        ],
        aiWeight: 1,
      },
      {
        label: 'Delay and invoke Moscow',
        detail: 'Remind Berlin that the Soviet Union also takes an interest in Bulgaria.',
        effects: [
          { t: 'relations', a: 'BUL', b: 'SOV', delta: 15 },
          { t: 'relations', a: 'BUL', b: 'GER', delta: -10 },
          { t: 'tension', delta: 2 },
          {
            t: 'chronicle',
            text: 'Sofia played the Soviet card against German pressure rather than sign, a hand our history never saw dealt.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // 9. German pressure on Yugoslavia (March 1941 analogue).
  {
    id: 'gen-ultimatum-yugoslavia',
    title: 'Summons to the Belvedere',
    nation: 'YUG',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'YUG' },
        { t: 'faction', nation: 'YUG', is: 'neutral' },
        { t: 'atWar', a: 'GER' },
        { t: 'controls', nation: 'GER', region: 'aus-austria' },
        { t: 'tension', atLeast: 55 },
      ],
    },
    once: true,
    priority: 7,
    text:
      'ROYAL PALACE, BELGRADE. The Regent has returned from his interview in Austria. The ' +
      'German terms are called generous: adhesion to the pact, no passage of troops, no ' +
      'military obligations, territorial consideration at Salonika. The manner of their ' +
      'delivery was not generous. German armies now stand on three of our frontiers, and the ' +
      'Reich\'s patience is declared officially inexhaustible and privately exhausted. The ' +
      'General Staff answers for the army\'s loyalty but not for its equipment. The Serb ' +
      'regiments answer for their loyalty to the state but audibly not to the signature. ' +
      'The Crown Council convenes tonight.',
    choices: [
      {
        label: 'Sign the protocol',
        detail: 'Take the generous terms and hope the streets read the fine print.',
        effects: [
          { t: 'joinFaction', nation: 'YUG', faction: 'axis' },
          { t: 'flag', key: F_YUG_PACT, value: true },
          { t: 'relations', a: 'YUG', b: 'GER', delta: 15 },
          { t: 'relations', a: 'YUG', b: 'UK', delta: -15 },
          { t: 'stability', nation: 'YUG', delta: -10 },
          { t: 'queueEvent', id: 'gen-belgrade-coup', delay: 1 },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'Belgrade signs',
            body: 'Yugoslavia has adhered to the Axis pact. The crowds in Belgrade did not cheer. Our legation reports the garrison\'s officers are meeting at night.',
          },
        ],
        aiWeight: 3,
      },
      {
        label: 'Refuse Berlin',
        detail: 'Decline the pact with German armies on three frontiers.',
        effects: [
          { t: 'relations', a: 'YUG', b: 'GER', delta: -35 },
          { t: 'relations', a: 'YUG', b: 'UK', delta: 10 },
          { t: 'addClaim', nation: 'GER', region: 'yug-belgrade' },
          { t: 'warSupport', nation: 'YUG', delta: 5 },
          { t: 'tension', delta: 4 },
          {
            t: 'chronicle',
            text: 'The Regent refused the pact outright. In our history he signed, and the refusal came two days later from the colonels.',
            divergence: true,
          },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'Belgrade refuses',
            body: 'Yugoslavia declines adhesion in any form. The Yugoslav army has cancelled leave.',
          },
        ],
        aiWeight: 2,
      },
      {
        label: 'Offer friendship short of adhesion',
        detail: 'A treaty of eternal friendship, warmly worded, signing nothing that matters.',
        effects: [
          { t: 'relations', a: 'YUG', b: 'GER', delta: 5 },
          { t: 'stability', nation: 'YUG', delta: -3 },
          { t: 'tension', delta: 1 },
          {
            t: 'chronicle',
            text: 'Belgrade offered Berlin friendship without adhesion and bought an unquiet season of time.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // 10. The Belgrade coup, if the protocol was signed.
  {
    id: 'gen-belgrade-coup',
    title: 'The Officers Move',
    nation: 'YUG',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: F_YUG_PACT },
        { t: 'alive', nation: 'YUG' },
        { t: 'faction', nation: 'YUG', is: 'axis' },
      ],
    },
    once: true,
    priority: 8,
    text:
      'BELGRADE, BEFORE DAWN. Air force officers and the Guard have seized the war ministry, ' +
      'the radio station, and the palace approaches. The Regent\'s train was stopped at ' +
      'the frontier and turned back with courtesy. The young King has been declared of age; ' +
      'the crowds filling the Terazije carry his portrait and shout against the signature. ' +
      'Not one shot has been fired, and not one German train has moved since midnight. The ' +
      'signature itself sits on the table of a cabinet that no longer exists. What stands ' +
      'in Belgrade this morning must decide whether the coup is a government or merely ' +
      'a gesture, and how the Reich will price the difference.',
    choices: [
      {
        label: 'Let the coup stand',
        detail: 'The new government repudiates the protocol. The country accepts what follows.',
        effects: [
          { t: 'joinFaction', nation: 'YUG', faction: 'neutral' },
          { t: 'relations', a: 'YUG', b: 'GER', delta: -40 },
          { t: 'relations', a: 'YUG', b: 'UK', delta: 20 },
          { t: 'addClaim', nation: 'GER', region: 'yug-belgrade' },
          { t: 'stability', nation: 'YUG', delta: -5 },
          { t: 'warSupport', nation: 'YUG', delta: 10 },
          { t: 'tension', delta: 3 },
          {
            t: 'chronicle',
            text: 'Belgrade tore up its own signature within days of giving it, as it did in our history, and waited for the answer from the north.',
          },
          {
            t: 'report', to: 'GER', kind: 'intel', title: 'Coup in Belgrade',
            body: 'The government that signed the protocol has been overthrown without bloodshed. The new ministry repudiates adhesion. The Belgrade radio plays patriotic marches.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Suppress the coup, honor the pact',
        detail: 'The Guard against the colonels, and the signature upheld at gunpoint.',
        effects: [
          { t: 'stability', nation: 'YUG', delta: -15 },
          { t: 'relations', a: 'YUG', b: 'GER', delta: 10 },
          {
            t: 'chronicle',
            text: 'The Belgrade coup was broken by loyalist troops and the Axis signature stood. In our history the colonels won the morning and the country paid in April.',
            divergence: true,
          },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'Belgrade holds to the pact',
            body: 'The mutiny in Belgrade has been suppressed. The Yugoslav government reaffirms its adhesion. The garrisons are confined to barracks.',
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // ==========================================================================
  // TEMPLATE: partisan uprising in occupied regions
  // ==========================================================================

  // 11. Partisan war in occupied Yugoslavia (German decision).
  {
    id: 'gen-partisans-yugoslavia',
    title: 'The Rear Area Reports',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'controls', nation: 'GER', region: 'yug-belgrade' },
        { t: 'atWar', a: 'GER' },
      ],
    },
    once: true,
    priority: 5,
    text:
      'REAR AREA COMMAND, SERBIA, MONTHLY APPRECIATION. The country is occupied; it is not ' +
      'pacified. Rail traffic to the southeast was cut eleven times this month. Two garrison ' +
      'companies were ambushed on the Uzice road, weapons lost to the band responsible. The ' +
      'insurgents operate in the forested hills in units up to battalion strength, and the ' +
      'population feeds them, from sympathy or terror or both. The command requires a ' +
      'decision on method: divisions committed to clear the interior, a static defense of ' +
      'the towns and railways only, or the arming of local auxiliaries whose reliability and ' +
      'appetites are their own.',
    choices: [
      {
        label: 'Commit divisions to sweep the interior',
        detail: 'Clear the hills valley by valley. The front elsewhere will miss the men.',
        effects: [
          { t: 'armyStrength', nation: 'GER', delta: -4 },
          { t: 'manpower', nation: 'GER', delta: -25 },
          {
            t: 'chronicle',
            text: 'The anti-partisan sweeps in Serbia were conducted with reprisals against the civilian population whose scale the occupation authorities recorded in their own ledgers.',
          },
        ],
        aiWeight: 3,
      },
      {
        label: 'Hold the towns and railways only',
        detail: 'Concede the hills. Guard what earns.',
        effects: [
          { t: 'ic', nation: 'GER', delta: -3 },
          {
            t: 'report', to: 'UK', kind: 'intel', title: 'The Yugoslav interior is open',
            body: 'German forces in Yugoslavia have withdrawn to the towns and rail lines. The insurgent bands hold the hill country and are receiving parachuted supply.',
          },
        ],
        aiWeight: 2,
      },
      {
        label: 'Arm local auxiliaries',
        detail: 'Set the country to police itself, and accept what that sets loose.',
        effects: [
          { t: 'ic', nation: 'GER', delta: -1 },
          { t: 'tension', delta: 1 },
          {
            t: 'chronicle',
            text: 'The occupation armed local auxiliary formations against the partisans, and the occupied country slid into a civil war within the war.',
          },
        ],
        aiWeight: 2,
      },
    ],
  },

  // 12. Guerrilla war behind the Japanese lines in North China.
  {
    id: 'gen-partisans-china',
    title: 'The Situation Behind the Lines',
    nation: 'JAP',
    fires: {
      t: 'and',
      c: [
        { t: 'controls', nation: 'JAP', region: 'chi-north' },
        { t: 'atWar', a: 'JAP', b: 'CHI' },
      ],
    },
    once: true,
    priority: 5,
    text:
      'NORTH CHINA AREA ARMY, STAFF MEMORANDUM. The map shows the province occupied. The ' +
      'railway timetable shows otherwise. Communist and Nationalist irregulars cut the ' +
      'Chengtai line four times in one week; the mine at Chingxing shipped nothing. Our ' +
      'garrisons hold points; the enemy holds the space between the points, and the villages ' +
      'provision him. Tokyo requires coal and cotton from this province, and the army ' +
      'requires a method: punitive columns into the base areas at the cost of frontline ' +
      'divisions, a wall of blockhouses along every line at the cost of the treasury, or ' +
      'terms quietly offered to the regional commanders Tokyo has publicly refused to ' +
      'recognize.',
    choices: [
      {
        label: 'Punitive columns into the base areas',
        detail: 'Burn the bases out of the hills. The China front absorbs more divisions.',
        effects: [
          { t: 'armyStrength', nation: 'JAP', delta: -3 },
          { t: 'manpower', nation: 'JAP', delta: -30 },
          { t: 'warSupport', nation: 'CHI', delta: 5 },
          {
            t: 'chronicle',
            text: 'The pacification campaigns in North China were waged against the villages as much as the fighters, and their devastation entered the record of the war.',
          },
        ],
        aiWeight: 3,
      },
      {
        label: 'Blockhouses and wire',
        detail: 'Cage the railways in concrete. Slow, expensive, and quiet.',
        effects: [
          { t: 'ic', nation: 'JAP', delta: -3 },
        ],
        aiWeight: 2,
      },
      {
        label: 'Quiet terms to regional commanders',
        detail: 'Buy locally what cannot be conquered provincially.',
        effects: [
          { t: 'relations', a: 'JAP', b: 'CHI', delta: 5 },
          { t: 'warSupport', nation: 'JAP', delta: -3 },
          {
            t: 'chronicle',
            text: 'The Area Army bought local truces from Chinese regional commanders, an accommodation Tokyo\'s public policy of chastisement never permitted in our history.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // 13. The Forest Brothers: resistance in the Soviet-occupied Baltic.
  {
    id: 'gen-partisans-baltic',
    title: 'Report from the Special Section',
    nation: 'SOV',
    fires: { t: 'controls', nation: 'SOV', region: 'lit-kaunas' },
    once: true,
    priority: 4,
    text:
      'NKVD SPECIAL SECTION, VILNIUS DISTRICT, TO MOSCOW. Sovietization of the Baltic ' +
      'territory proceeds against armed resistance. Bands composed of former officers, ' +
      'police, and deserters from the conscription operate from the forests, in places in ' +
      'company strength. Rural officials of the new administration have been assassinated; ' +
      'two grain collection points were burned this month. The section requests direction: ' +
      'a general operation of arrests and deportations to remove the bandit element and its ' +
      'supporting families at one stroke, an offer of amnesty and land to draw the forests ' +
      'empty, or reinforcement of the garrisons to contain the problem until it starves.',
    choices: [
      {
        label: 'Arrests and deportations',
        detail: 'The lists are prepared. The wagons are available.',
        effects: [
          { t: 'manpower', nation: 'SOV', delta: -10 },
          {
            t: 'chronicle',
            text: 'The pacification of the Baltic was carried out by mass deportation, whole families entrained east in a single week, as the same offices did in our history.',
          },
          {
            t: 'report', to: 'GER', kind: 'intel', title: 'Unrest in the Soviet Baltic',
            body: 'Deportation trains are leaving the Baltic territory under NKVD escort. Resistance in the forests continues. The population\'s disposition toward any invader may be presumed friendly.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Amnesty and land',
        detail: 'Empty the forests with paper instead of wagons.',
        effects: [
          { t: 'stability', nation: 'SOV', delta: 1 },
          {
            t: 'chronicle',
            text: 'Moscow offered the Baltic resistance amnesty and land, an instrument of persuasion the deportation policy of our history never tried.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
      {
        label: 'Reinforce the garrisons',
        detail: 'Contain, patrol, and wait for winter to do the rest.',
        effects: [
          { t: 'armyStrength', nation: 'SOV', delta: -2 },
        ],
        aiWeight: 2,
      },
    ],
  },

  // ==========================================================================
  // TEMPLATE: mobilization choice when a neighbor is at war
  // ==========================================================================

  // 14. Belgian mobilization on the outbreak of a German war.
  {
    id: 'gen-mobilize-belgium',
    title: 'The Mobilization Question',
    nation: 'BEL',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'BEL' },
        { t: 'faction', nation: 'BEL', is: 'neutral' },
        { t: 'not', c: { t: 'atWar', a: 'BEL' } },
        { t: 'atWar', a: 'GER' },
        { t: 'tension', atLeast: 40 },
      ],
    },
    once: true,
    priority: 5,
    text:
      'GENERAL STAFF, BRUSSELS. Germany is at war. Whatever the communiques call the ' +
      'direction of that war today, the staff\'s planning assumption has not changed since ' +
      '1914: the shortest road between Germany and France runs through this kingdom. The ' +
      'army can call five classes of reserves to the colors within the month, at the price ' +
      'of the harvest, the factories, and any German reading of our neutrality as ' +
      'unarmed. Or it can call none, and be a frontier gendarmerie on the morning the ' +
      'planning assumption proves itself again. The Cabinet requires the staff\'s ' +
      'recommendation by evening, and the King\'s decision follows it.',
    choices: [
      {
        label: 'General mobilization',
        detail: 'Five classes to the colors. Neutrality, armed to the teeth.',
        effects: [
          { t: 'newArmy', nation: 'BEL', name: 'Reserve Army', location: 'bel-brussels', strength: 50, equipment: 40 },
          { t: 'ic', nation: 'BEL', delta: -2 },
          { t: 'stability', nation: 'BEL', delta: -2 },
          {
            t: 'report', to: 'GER', kind: 'intel', title: 'Belgium mobilizes',
            body: 'Belgium has ordered general mobilization while reaffirming strict neutrality. The fortress line on the Albert Canal is being manned to war establishment.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Reinforce the fortress line only',
        detail: 'Man the forts, spare the factories.',
        effects: [
          { t: 'armyStrength', nation: 'BEL', delta: 5 },
        ],
        aiWeight: 2,
      },
      {
        label: 'No measures that could provoke',
        detail: 'The strictest neutrality is the least armed one.',
        effects: [
          { t: 'relations', a: 'BEL', b: 'GER', delta: 5 },
          { t: 'warSupport', nation: 'BEL', delta: -5 },
          {
            t: 'chronicle',
            text: 'Brussels declined to mobilize for fear of provoking Berlin. In our history the reserves were called on the first day of the European war.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // 15. Sweden and the war in Finland.
  {
    id: 'gen-mobilize-sweden',
    title: 'The Finnish Question in Stockholm',
    nation: 'SWE',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'SWE' },
        { t: 'not', c: { t: 'atWar', a: 'SWE' } },
        {
          t: 'or',
          c: [
            { t: 'flag', key: FLAGS.WINTER_WAR },
            { t: 'atWar', a: 'SOV', b: 'FIN' },
          ],
        },
      ],
    },
    once: true,
    priority: 5,
    text:
      'CABINET MEETING, STOCKHOLM, MINUTES. Finland is at war with the Soviet Union and has ' +
      'asked what Sweden will do. The question divides the table. Open intervention means ' +
      'war with a great power on our own frontier and perhaps a German one behind it. ' +
      'Refusal means watching a neighbor and a buffer bleed, and meeting the victor later ' +
      'across a narrower water. Between the two lies the policy of the unofficial: ' +
      'volunteers permitted to go, rifles and aircraft written off the army\'s books, money ' +
      'raised in the open, and the word neutrality replaced in every communique by the word ' +
      'non-belligerent. No choice will be forgiven by everyone.',
    choices: [
      {
        label: 'Non-belligerent aid to Finland',
        detail: 'Volunteers, rifles, and aircraft, unofficially and abundantly.',
        effects: [
          { t: 'relations', a: 'SWE', b: 'FIN', delta: 20 },
          { t: 'relations', a: 'SWE', b: 'SOV', delta: -15 },
          { t: 'armyStrength', nation: 'FIN', delta: 4 },
          { t: 'tension', delta: 1 },
          {
            t: 'report', to: 'SOV', kind: 'intel', title: 'Swedish materiel reaches Finland',
            body: 'Swedish volunteers and equipment, including aircraft, are entering Finland in quantity. Stockholm styles itself non-belligerent rather than neutral.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Intervene openly',
        detail: 'The Finnish frontier is Sweden\'s. Fight for it there.',
        effects: [
          { t: 'declareWar', attacker: 'SWE', defender: 'SOV' },
          { t: 'relations', a: 'SWE', b: 'FIN', delta: 30 },
          {
            t: 'chronicle',
            text: 'Sweden entered the Finnish war openly, the intervention its cabinet weighed and refused in our history.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
      {
        label: 'Strict neutrality, sealed frontier',
        detail: 'No volunteers, no transit, no exceptions.',
        effects: [
          { t: 'relations', a: 'SWE', b: 'FIN', delta: -10 },
          { t: 'relations', a: 'SWE', b: 'SOV', delta: 5 },
          { t: 'stability', nation: 'SWE', delta: -3 },
          {
            t: 'chronicle',
            text: 'Stockholm sealed the frontier and sent Finland nothing, where in our history eight thousand volunteers and a squadron of aircraft went north.',
            divergence: true,
          },
        ],
        aiWeight: 2,
      },
    ],
  },

  // 16. Swiss general mobilization when the western war begins.
  {
    id: 'gen-mobilize-switzerland',
    title: 'Order of the Federal Council',
    nation: 'SUI',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'SUI' },
        { t: 'not', c: { t: 'atWar', a: 'SUI' } },
        { t: 'atWar', a: 'GER', b: 'FRA' },
      ],
    },
    once: true,
    priority: 4,
    text:
      'FEDERAL COUNCIL, BERNE, EXTRAORDINARY SESSION. France and Germany are at war, and the ' +
      'Confederation lies between the Rhine and the Alpine passes both belligerents covet. ' +
      'The General proposes full mobilization: four hundred thousand men to the frontiers ' +
      'now, and behind them the preparation of a national redoubt in the high valleys, ' +
      'where an army too costly to digest can make the country too expensive to swallow. ' +
      'The economic departments answer that the men are the factories, and the factories ' +
      'are the bread. The Council must weigh a demonstration of porcupine resolve against ' +
      'the quiet posture that has kept the peace since 1815.',
    choices: [
      {
        label: 'Full mobilization and the Redoubt',
        detail: 'Every man to the frontier, and the Alps prepared behind them.',
        effects: [
          { t: 'newArmy', nation: 'SUI', name: 'Border Brigades', location: 'sui-bern', strength: 55, equipment: 50 },
          { t: 'ic', nation: 'SUI', delta: -2 },
          { t: 'stability', nation: 'SUI', delta: 3 },
          {
            t: 'report', to: 'GER', kind: 'intel', title: 'Swiss mobilization',
            body: 'Switzerland has mobilized in full. The passes are prepared for demolition and the garrison of the Alpine redoubt is being provisioned for years, not months.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Partial call-up',
        detail: 'Man the frontier works. Keep the factories manned too.',
        effects: [
          { t: 'armyStrength', nation: 'SUI', delta: 5 },
        ],
        aiWeight: 2,
      },
      {
        label: 'Demobilize to reassure Berlin',
        detail: 'A defenseless neutrality, conspicuously harmless.',
        effects: [
          { t: 'relations', a: 'SUI', b: 'GER', delta: 10 },
          { t: 'stability', nation: 'SUI', delta: -5 },
          {
            t: 'chronicle',
            text: 'The Confederation stood its army down to appease its neighbors, where in our history it mobilized to the last man and dug into the Alps.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // ==========================================================================
  // TEMPLATE: trade demand from a major
  // ==========================================================================

  // 17. German demand for Romanian oil (oil-for-arms pact analogue).
  {
    id: 'gen-trade-romania-oil',
    title: 'The Oil Protocol',
    nation: 'ROM',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'ROM' },
        { t: 'controls', nation: 'ROM', region: 'rom-ploiesti' },
        { t: 'atWar', a: 'GER' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'ROM' } },
      ],
    },
    once: true,
    priority: 6,
    text:
      'MINISTRY OF NATIONAL ECONOMY, BUCHAREST. The German delegation has tabled its ' +
      'economic protocol and attached a timetable. Berlin wants the Ploiesti production ' +
      'contracted forward at fixed prices, paid in armaments, aircraft, and machinery ' +
      'rather than currency. The British companies that hold half the concessions have ' +
      'instructions to outbid any German offer and, failing that, other instructions. ' +
      'The wells cannot be hidden and cannot be moved. A country that owns what both ' +
      'coalitions burn does not get to be uninteresting; it gets to choose its customer, ' +
      'once, and live with the choice.',
    choices: [
      {
        label: 'Sign the oil-for-arms protocol',
        detail: 'Fixed deliveries to the Reich, paid in the weapons we lack.',
        effects: [
          { t: 'pact', a: 'ROM', b: 'GER', kind: 'trade' },
          { t: 'relations', a: 'ROM', b: 'GER', delta: 15 },
          { t: 'relations', a: 'ROM', b: 'UK', delta: -15 },
          { t: 'armyStrength', nation: 'ROM', delta: 5 },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'Bucharest signs with Berlin',
            body: 'Romania has contracted the Ploiesti output forward to Germany against deliveries of arms. The British concessions are being squeezed toward the exit.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Honor the British contracts',
        detail: 'Refuse the protocol and let London keep the concessions it holds.',
        effects: [
          { t: 'relations', a: 'ROM', b: 'UK', delta: 15 },
          { t: 'relations', a: 'ROM', b: 'GER', delta: -20 },
          { t: 'tension', delta: 2 },
          {
            t: 'chronicle',
            text: 'Romania refused the German oil protocol and kept faith with the British concessions, a refusal our history\'s Bucharest never sustained.',
            divergence: true,
          },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'Bucharest refuses the protocol',
            body: 'Romania declines forward contracting of the Ploiesti output. British interests retain their concessions. The Reich\'s fuel calculations must look elsewhere.',
          },
        ],
        aiWeight: 1,
      },
      {
        label: 'Auction to both and raise the price',
        detail: 'Sell to every buyer at the price the war has set.',
        effects: [
          { t: 'ic', nation: 'ROM', delta: 3 },
          { t: 'relations', a: 'ROM', b: 'GER', delta: -5 },
          { t: 'relations', a: 'ROM', b: 'UK', delta: -5 },
        ],
        aiWeight: 2,
      },
    ],
  },

  // 18. German demand that the Swedish ore trade continue.
  {
    id: 'gen-trade-sweden-ore',
    title: 'The Ore Question',
    nation: 'SWE',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'SWE' },
        { t: 'not', c: { t: 'atWar', a: 'SWE' } },
        { t: 'atWar', a: 'GER' },
        { t: 'tension', atLeast: 40 },
      ],
    },
    once: true,
    priority: 5,
    text:
      'MINISTRY OF FOREIGN AFFAIRS, STOCKHOLM. Germany is at war, and the German steel ' +
      'industry runs on iron from the Kiruna fields. Berlin\'s note requests confirmation ' +
      'that deliveries will continue at treaty volumes; it mentions, in a separate ' +
      'paragraph, the German navy\'s new interest in the Norwegian coast, along which the ' +
      'winter ore passes. London\'s note arrived the same week, proposing that Sweden ' +
      'consider the ore a matter of belligerent concern and reduce shipments accordingly. ' +
      'Both notes are courteous. The cabinet observes that the mines cannot be neutral, ' +
      'whatever the country declares, and that someone will be refused.',
    choices: [
      {
        label: 'The ore trains run',
        detail: 'Confirm treaty volumes to Germany. Trade is not belligerence.',
        effects: [
          { t: 'pact', a: 'SWE', b: 'GER', kind: 'trade' },
          { t: 'relations', a: 'SWE', b: 'GER', delta: 10 },
          { t: 'relations', a: 'SWE', b: 'UK', delta: -10 },
          { t: 'ic', nation: 'SWE', delta: 2 },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'Stockholm confirms the ore trade',
            body: 'Sweden will maintain iron ore deliveries to Germany at treaty volumes. The winter route through Norwegian waters remains the vulnerable link.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Curtail shipments under Allied pressure',
        detail: 'Cut the tonnage and answer to Berlin for it.',
        effects: [
          { t: 'relations', a: 'SWE', b: 'UK', delta: 15 },
          { t: 'relations', a: 'SWE', b: 'GER', delta: -25 },
          { t: 'addClaim', nation: 'GER', region: 'swe-stockholm' },
          { t: 'tension', delta: 3 },
          {
            t: 'chronicle',
            text: 'Sweden throttled the ore trade under Allied pressure, and the German staff studies that in our history examined Scandinavia for other reasons acquired a new chapter.',
            divergence: true,
          },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'Swedish deliveries cut',
            body: 'Stockholm has reduced iron ore shipments below treaty volumes, citing belligerent-rights representations. The steel plan\'s arithmetic no longer closes.',
          },
        ],
        aiWeight: 1,
      },
      {
        label: 'Ration both sides evenly',
        detail: 'Publish one quota for all buyers and hide behind the arithmetic.',
        effects: [
          { t: 'relations', a: 'SWE', b: 'GER', delta: -5 },
          { t: 'relations', a: 'SWE', b: 'UK', delta: 5 },
        ],
        aiWeight: 2,
      },
    ],
  },

  // 19. Japanese demands on the Dutch East Indies.
  {
    id: 'gen-trade-east-indies',
    title: 'The Batavia Negotiations',
    nation: 'NED',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'NED' },
        { t: 'controls', nation: 'NED', region: 'ned-east-indies' },
        { t: 'atWar', a: 'JAP' },
        {
          t: 'or',
          c: [
            { t: 'flag', key: FLAGS.EMBARGO_JAPAN },
            { t: 'tension', atLeast: 55 },
          ],
        },
      ],
    },
    once: true,
    priority: 6,
    text:
      'GOVERNMENT OF THE INDIES, BATAVIA, TO THE HAGUE. The Japanese economic mission has ' +
      'enlarged its demands: guaranteed annual deliveries of oil, rubber, and tin at ' +
      'several times current volumes, entry for Japanese enterprises into the concessions, ' +
      'and a political understanding whose text keeps arriving in longer drafts. The ' +
      'mission\'s patience is described by its own press as the patience of a rising sun. ' +
      'The oil companies can physically pump what Tokyo asks. Whether the Indies should ' +
      'fuel the fleet that may come for them is a question the Governor-General declines ' +
      'to answer alone. London and Washington counsel firmness from a comfortable ' +
      'distance.',
    choices: [
      {
        label: 'Refuse new concessions',
        detail: 'Current contracts stand. Nothing more, and the garrison reinforced.',
        effects: [
          { t: 'relations', a: 'NED', b: 'JAP', delta: -20 },
          { t: 'relations', a: 'NED', b: 'UK', delta: 10 },
          { t: 'relations', a: 'NED', b: 'USA', delta: 10 },
          { t: 'tension', delta: 2 },
          {
            t: 'report', to: 'JAP', kind: 'diplomatic', title: 'Batavia refuses',
            body: 'The Netherlands Indies government declines expanded quotas and concession entry. The southern resource question remains open, and the fleet staff has resumed its studies.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Grant limited quotas',
        detail: 'Buy time with oil. Modest increases, short contracts, no concessions.',
        effects: [
          { t: 'relations', a: 'NED', b: 'JAP', delta: 10 },
          { t: 'ic', nation: 'NED', delta: 2 },
          {
            t: 'chronicle',
            text: 'Batavia conceded enlarged oil quotas to Japan, the accommodation our history\'s negotiations reached for and never closed.',
            divergence: true,
          },
        ],
        aiWeight: 2,
      },
      {
        label: 'Concede in full under protest',
        detail: 'Sign everything, protest everything, and hope the appetite is finite.',
        effects: [
          { t: 'relations', a: 'NED', b: 'JAP', delta: 20 },
          { t: 'relations', a: 'NED', b: 'UK', delta: -10 },
          { t: 'relations', a: 'NED', b: 'USA', delta: -10 },
          {
            t: 'chronicle',
            text: 'The Indies signed the full Japanese economic program under protest, feeding the fleet whose southward course our history\'s refusal helped to fix.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
    ],
  },
];
