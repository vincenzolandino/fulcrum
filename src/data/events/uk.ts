// UK event pack — the British line from appeasement through the Blitz to
// Lend-Lease and, if it comes to that, the fall of London. Twelve events,
// ids prefixed 'uk-' (surrender event uses the engine convention
// 'surrender-UK' per registry.ts).
//
// Pure data: no functions, no randomness, no dates as triggers. Every `fires`
// condition anchors on world state; `turnAtLeast` appears only as a floor.

import type { GameEvent } from '../../engine/types';
import { FLAGS, capitulatedFlag, exileFlag, surrenderEventId } from './registry';

// Pack-local flags. These are written (and only ever read) inside this pack;
// they record British decisions for save-state inspection and future hooks.
// Cross-pack flags stay in registry.ts per the coordination contract.
const UK_SEPARATE_PEACE = 'UK_SEPARATE_PEACE';
const UK_FRENCH_FLEET_SPARED = 'UK_FRENCH_FLEET_SPARED';
const UK_LEND_LEASE_APPEAL_SENT = 'UK_LEND_LEASE_APPEAL_SENT';
const UK_INDIA_REFORM_PROMISED = 'UK_INDIA_REFORM_PROMISED';

export const UK_EVENTS: GameEvent[] = [
  // -------------------------------------------------------------------------
  // 1. The appeasement line, part one: rearmament after the Anschluss.
  // -------------------------------------------------------------------------
  {
    id: 'uk-scheme-l',
    title: 'The Air Programme',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.ANSCHLUSS_DONE },
        { t: 'leaderIs', nation: 'UK', leader: 'chamberlain' },
        { t: 'not', c: { t: 'atWar', a: 'UK' } },
      ],
    },
    once: true,
    priority: 4,
    text:
      'CABINET OFFICE, LONDON. The Chiefs of Staff report that the absorption of Austria has moved the air balance further toward Germany. Scheme L, laid before the Cabinet this week, would order twelve thousand aircraft in two years and give the Royal Air Force first call upon industry. The Chancellor of the Exchequer objects that finance is the fourth arm of defence, and that a race run too hard will break it. The Prime Minister must fix the pace of rearmament, and say plainly what the country is arming against.',
    choices: [
      {
        label: 'Approve Scheme L',
        detail: 'The air programme first. Fighters and the radar chain take priority over the Treasury view.',
        effects: [
          { t: 'air', nation: 'UK', delta: 40 },
          { t: 'stability', nation: 'UK', delta: -2 },
          { t: 'report', to: 'GER', kind: 'intel', title: 'British air estimates revised', body: 'The Air Ministry in London has been authorized to order aircraft without financial ceiling. British fighter production will rise sharply within the year.' },
        ],
        aiWeight: 4,
      },
      {
        label: 'Balanced rearmament',
        detail: 'Spread the money: some air, some army equipment, some hulls. Slower everywhere, weaker nowhere.',
        effects: [
          { t: 'air', nation: 'UK', delta: 15 },
          { t: 'armyStrength', nation: 'UK', delta: 5 },
          { t: 'navy', nation: 'UK', delta: 15 },
        ],
        aiWeight: 2,
      },
      {
        label: 'The Treasury view holds',
        detail: 'Finance is the fourth arm of defence. Rearm within the budget and trust diplomacy to buy time.',
        effects: [
          { t: 'stability', nation: 'UK', delta: 3 },
          { t: 'warSupport', nation: 'UK', delta: -3 },
          { t: 'chronicle', text: 'Britain held rearmament to the peacetime budget through 1938, a caution our history abandoned after Vienna.', divergence: true },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. The appeasement line, part two: what the Munich year is for.
  // -------------------------------------------------------------------------
  {
    id: 'uk-munich-dividend',
    title: 'Peace for Our Time',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.MUNICH_CONCEDED },
        { t: 'leaderIs', nation: 'UK', leader: 'chamberlain' },
        { t: 'not', c: { t: 'atWar', a: 'UK' } },
      ],
    },
    once: true,
    priority: 5,
    text:
      'HESTON AERODROME. The Prime Minister has returned from Munich with the Anglo-German declaration in hand, and the crowds sang him back to Downing Street. The Sudetenland passes to Germany without a shot fired. In Cabinet the mood is cooler. The Chiefs of Staff put the Royal Air Force a year short of readiness and strike thirty-five Czechoslovak divisions from every future calculation. Mr. Churchill, from the back benches, calls the settlement a defeat without a war. The question before the government is what the year just purchased is to be spent on.',
    choices: [
      {
        label: 'Peace with honour, and quiet haste at the factories',
        detail: 'Celebrate the settlement in public. Accelerate the fighter and radar programmes in private.',
        effects: [
          { t: 'stability', nation: 'UK', delta: 5 },
          { t: 'warSupport', nation: 'UK', delta: -5 },
          { t: 'air', nation: 'UK', delta: 20 },
          { t: 'chronicle', text: 'London banked the Munich year: a country told it had peace, and factories told otherwise.' },
        ],
        aiWeight: 4,
      },
      {
        label: 'Tell the country to arm',
        detail: 'Adopt the Churchill line from the despatch box. Name the danger and demand a war footing now.',
        effects: [
          { t: 'warSupport', nation: 'UK', delta: 10 },
          { t: 'stability', nation: 'UK', delta: -5 },
          { t: 'relations', a: 'UK', b: 'GER', delta: -10 },
          { t: 'chronicle', text: 'Chamberlain came home from Munich and told the Commons the settlement was a reprieve, not a peace; the appeasement consensus broke a year early.', divergence: true },
        ],
        aiWeight: 1,
      },
      {
        label: 'Bind France closer',
        detail: 'Formal staff talks and a standing Anglo-French alliance, so the next crisis finds one front, not two policies.',
        effects: [
          { t: 'relations', a: 'UK', b: 'FRA', delta: 15 },
          { t: 'pact', a: 'UK', b: 'FRA', kind: 'alliance' },
          { t: 'report', to: 'FRA', kind: 'diplomatic', title: 'London proposes staff talks', body: 'The British government offers a standing alliance and joint military planning, effective immediately.' },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. The appeasement line breaks: Prague occupied, the eastern guarantee.
  // -------------------------------------------------------------------------
  {
    id: 'uk-end-of-appeasement',
    title: 'The Guarantee',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'controls', nation: 'GER', region: 'cze-prague' },
        { t: 'not', c: { t: 'atWar', a: 'UK', b: 'GER' } },
        { t: 'alive', nation: 'POL' },
      ],
    },
    once: true,
    priority: 7,
    text:
      'FOREIGN OFFICE, LONDON. German troops entered Prague at dawn. Bohemia and Moravia are occupied, the rump state extinguished, and the Munich settlement is six months dead. At Birmingham the Prime Minister asked aloud whether this is a step toward an attempt to dominate the world by force. The Warsaw embassy reports German pressure over Danzig growing weekly. The Cabinet must now decide whether Britain draws a line in eastern Europe, where it runs, and who stands behind it.',
    choices: [
      {
        label: 'Guarantee Poland',
        detail: 'A public pledge, with France, to defend Polish independence. The line runs through Danzig.',
        effects: [
          { t: 'guarantee', by: 'UK', of: 'POL' },
          { t: 'guarantee', by: 'FRA', of: 'POL' },
          { t: 'relations', a: 'UK', b: 'GER', delta: -15 },
          { t: 'relations', a: 'UK', b: 'POL', delta: 20 },
          { t: 'tension', delta: 2 },
          { t: 'warSupport', nation: 'UK', delta: 5 },
          { t: 'report', to: 'POL', kind: 'diplomatic', title: 'London and Paris pledge support', body: 'Britain and France have publicly guaranteed Polish independence. Any attack on Poland now means a general war.' },
          { t: 'report', to: 'GER', kind: 'diplomatic', title: 'Anglo-French guarantee to Warsaw', body: 'London has drawn its line at the Polish frontier. The Danzig question is now a question of general war.' },
          { t: 'chronicle', text: 'After Prague, Britain guaranteed Poland: the policy of appeasement was buried in a single afternoon in the Commons.' },
        ],
        aiWeight: 4,
      },
      {
        label: 'Guarantee the whole eastern tier',
        detail: 'Poland, Romania, and Greece together. A broader fence, and more places to be called to defend it.',
        effects: [
          { t: 'guarantee', by: 'UK', of: 'POL' },
          { t: 'guarantee', by: 'UK', of: 'ROM' },
          { t: 'guarantee', by: 'UK', of: 'GRE' },
          { t: 'relations', a: 'UK', b: 'GER', delta: -20 },
          { t: 'tension', delta: 4 },
          { t: 'warSupport', nation: 'UK', delta: 5 },
          { t: 'report', to: 'POL', kind: 'diplomatic', title: 'British guarantee announced', body: 'Britain has guaranteed Poland, Romania, and Greece against aggression in a single declaration.' },
        ],
        aiWeight: 2,
      },
      {
        label: 'Approach Moscow instead',
        detail: 'Only a Soviet alliance makes an eastern front real. Swallow the ideology and send a full mission.',
        effects: [
          { t: 'relations', a: 'UK', b: 'SOV', delta: 20 },
          { t: 'tension', delta: 1 },
          { t: 'report', to: 'SOV', kind: 'diplomatic', title: 'British mission to Moscow', body: 'London proposes immediate staff conversations on the containment of Germany, at cabinet level and in earnest.' },
          { t: 'chronicle', text: 'British envoys went to Moscow in earnest in 1939, a mission our history sent too slowly, too junior, and by slow boat.', divergence: true },
        ],
        aiWeight: 2,
      },
      {
        label: 'No commitments east of the Rhine',
        detail: 'The Empire cannot fight for Danzig. Rearm, and let the eastern peoples make their own terms.',
        effects: [
          { t: 'stability', nation: 'UK', delta: -3 },
          { t: 'warSupport', nation: 'UK', delta: -8 },
          { t: 'relations', a: 'UK', b: 'GER', delta: 5 },
          { t: 'relations', a: 'UK', b: 'POL', delta: -15 },
          { t: 'chronicle', text: 'After Prague, London offered eastern Europe nothing but sympathy; the guarantee to Poland that defined our 1939 was never given.', divergence: true },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. Peacetime conscription: paying for the guarantee in men.
  // -------------------------------------------------------------------------
  {
    id: 'uk-conscription',
    title: 'The Militia',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'eventFired', id: 'uk-end-of-appeasement' },
        { t: 'tension', atLeast: 30 },
        { t: 'not', c: { t: 'atWar', a: 'UK', b: 'GER' } },
      ],
    },
    once: true,
    priority: 5,
    text:
      'WAR OFFICE MEMORANDUM. The eastern guarantee commits Britain to a land war she is not equipped to fight. The Regular Army can put five divisions in the field; the French General Staff ask, politely and repeatedly, where the British Army is. A Military Training Act, the first conscription ever ordered in peacetime, has been drafted for the Prime Minister\'s signature. The Labour benches promise a fight. Berlin will call it encirclement, and count the divisions anyway.',
    choices: [
      {
        label: 'Sign the Military Training Act',
        detail: 'Six months with the colours for men of twenty. A militia, not a mass army, but a beginning.',
        effects: [
          { t: 'manpower', nation: 'UK', delta: 400 },
          { t: 'warSupport', nation: 'UK', delta: 5 },
          { t: 'tension', delta: 2 },
          { t: 'relations', a: 'UK', b: 'GER', delta: -5 },
          { t: 'report', to: 'FRA', kind: 'diplomatic', title: 'Britain adopts conscription', body: 'London has introduced peacetime military service for the first time in its history. A continental field force is now in preparation.' },
        ],
        aiWeight: 4,
      },
      {
        label: 'Voluntary service only',
        detail: 'Conscription in peacetime is not the British way. Recruiting posters, not call-up papers.',
        effects: [
          { t: 'stability', nation: 'UK', delta: 2 },
          { t: 'warSupport', nation: 'UK', delta: -3 },
          { t: 'chronicle', text: 'Britain declined conscription in the spring of 1939 and went to the crisis with a volunteer army; our history chose otherwise in April.', divergence: true },
        ],
        aiWeight: 1,
      },
      {
        label: 'Full conscription now',
        detail: 'Not a militia. Raise a new field army at once and accept the political storm.',
        effects: [
          { t: 'manpower', nation: 'UK', delta: 900 },
          { t: 'newArmy', nation: 'UK', name: 'British 5th Army', location: 'uk-southeast', strength: 50, equipment: 40 },
          { t: 'stability', nation: 'UK', delta: -5 },
          { t: 'tension', delta: 3 },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. Churchill takes over when the war sours (the leader swap).
  // -------------------------------------------------------------------------
  {
    id: 'uk-churchill-takes-over',
    title: 'A Question of Confidence',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'UK', b: 'GER' },
        { t: 'leaderIs', nation: 'UK', leader: 'chamberlain' },
        {
          t: 'or',
          c: [
            { t: 'controls', nation: 'GER', region: 'nor-oslo' },
            { t: 'controls', nation: 'GER', region: 'bel-brussels' },
            { t: 'controls', nation: 'GER', region: 'fra-paris' },
            { t: 'warSupport', nation: 'UK', below: 25 },
          ],
        },
      ],
    },
    once: true,
    priority: 8,
    text:
      'HOUSE OF COMMONS. Two days of debate on the conduct of the war have cut the Government\'s majority from two hundred and thirteen to eighty-one. Members of the Prime Minister\'s own party filed into the Opposition lobby; one rose to tell him, in Cromwell\'s words, in the name of God, go. The Labour Party will enter a coalition, but not under Mr. Chamberlain. The choice narrows to two men: Lord Halifax, whom the party and the Palace would prefer, and Mr. Churchill, whom the crisis appears to demand.',
    choices: [
      {
        label: 'Send for Churchill',
        detail: 'The wilderness prophet forms a national government. Blood, toil, tears, and sweat.',
        effects: [
          { t: 'setLeader', nation: 'UK', leader: 'churchill' },
          { t: 'flag', key: FLAGS.CHURCHILL_PM, value: true },
          { t: 'setAI', nation: 'UK', patch: { aggression: 0.5, riskTolerance: 0.7, focus: 'defense' } },
          { t: 'warSupport', nation: 'UK', delta: 12 },
          { t: 'stability', nation: 'UK', delta: 5 },
          { t: 'report', to: 'GER', kind: 'diplomatic', title: 'Churchill forms a government', body: 'The appeasers are out of office in London. The new Prime Minister has promised the Commons nothing but war to the end.' },
          { t: 'report', to: 'USA', kind: 'diplomatic', title: 'New government in London', body: 'Winston Churchill has kissed hands as Prime Minister at the head of a national coalition pledged to fight on.' },
          { t: 'chronicle', text: 'Chamberlain fell and Churchill formed his national government, promising victory however long and hard the road may be.' },
        ],
        aiWeight: 4,
      },
      {
        label: 'Send for Halifax',
        detail: 'The safe pair of hands. A peer for Prime Minister, and a government that might yet listen to terms.',
        effects: [
          { t: 'setLeader', nation: 'UK', leader: 'halifax' },
          { t: 'setAI', nation: 'UK', patch: { aggression: 0.1, riskTolerance: 0.2, focus: 'defense' } },
          { t: 'stability', nation: 'UK', delta: 3 },
          { t: 'warSupport', nation: 'UK', delta: -5 },
          { t: 'chronicle', text: 'The premiership passed to Lord Halifax, the man who in our history stood aside in silence; Britain\'s war would now be run by a government that had not ruled out a settlement.', divergence: true },
        ],
        aiWeight: 1,
      },
      {
        label: 'Chamberlain soldiers on',
        detail: 'No change at the top in mid-crisis. Govern with a wounded majority and hope for better news.',
        effects: [
          { t: 'stability', nation: 'UK', delta: -8 },
          { t: 'warSupport', nation: 'UK', delta: -8 },
          { t: 'chronicle', text: 'Chamberlain clung to office after the confidence vote, governing on a broken majority through the worst of the war; in our history he resigned within days.', divergence: true },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. The Halifax branch pays off: a peace feeler through Rome.
  // -------------------------------------------------------------------------
  {
    id: 'uk-halifax-peace-feeler',
    title: 'An Approach Through Rome',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'UK', leader: 'halifax' },
        { t: 'atWar', a: 'UK', b: 'GER' },
      ],
    },
    once: true,
    priority: 8,
    text:
      'CABINET WAR ROOMS, MOST SECRET. The Italian ambassador lets it be known that Rome would convey to Berlin any British interest in a general settlement. The shape of terms is sketched: the Empire intact, the fleet untouched, Germany unchallenged on the Continent. The Chiefs of Staff advise that the home islands can be defended but that victory, at present, cannot be foreseen. The Prime Minister sees no harm in learning what the terms would be. Others at the table answer that nations which go down fighting rise again, and that those which surrender tamely are finished.',
    choices: [
      {
        label: 'Hear the terms, and take them',
        detail: 'A negotiated peace. The Empire and the fleet survive; the Continent is written off.',
        effects: [
          { t: 'peace', a: 'UK', b: 'GER' },
          { t: 'flag', key: UK_SEPARATE_PEACE, value: true },
          { t: 'relations', a: 'UK', b: 'GER', delta: 15 },
          { t: 'tension', delta: -8 },
          { t: 'stability', nation: 'UK', delta: 5 },
          { t: 'warSupport', nation: 'UK', delta: -15 },
          { t: 'report', to: 'GER', kind: 'diplomatic', title: 'London accepts mediation', body: 'The British government has agreed terms through Rome. The war in the West is over; the Royal Navy and the Empire remain in British hands.' },
          { t: 'report', to: 'USA', kind: 'diplomatic', title: 'Britain leaves the war', body: 'London has concluded a negotiated settlement with Berlin. No British ally was consulted.' },
          { t: 'chronicle', text: 'Britain treated with Berlin through Italian good offices, and the war in the West ended in an adjournment rather than a verdict. In our history the Cabinet argued for three days in May 1940 and chose to fight.', divergence: true },
        ],
        aiWeight: 3,
      },
      {
        label: 'The Cabinet balks. Fight on',
        detail: 'Even this government cannot sign it. Break off the contact and prosecute the war.',
        effects: [
          { t: 'warSupport', nation: 'UK', delta: 5 },
          { t: 'stability', nation: 'UK', delta: -3 },
          { t: 'relations', a: 'UK', b: 'ITA', delta: -10 },
          { t: 'chronicle', text: 'The Halifax government examined the terms and found even it could not sign them; Britain stayed in the war under a Prime Minister who did not believe in it.' },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. Mers-el-Kebir: fires when France capitulates without exile (VICHY).
  // -------------------------------------------------------------------------
  {
    id: 'uk-mers-el-kebir',
    title: 'Operation Catapult',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.VICHY },
        { t: 'atWar', a: 'UK', b: 'GER' },
        { t: 'not', c: { t: 'flag', key: FLAGS.FRANCE_FIGHTS_ON } },
      ],
    },
    once: true,
    priority: 7,
    text:
      'ADMIRALTY, MOST SECRET. France has signed an armistice. Her fleet, the fourth largest afloat, lies at Mers-el-Kebir under terms that put it beyond Britain\'s reach but not beyond Germany\'s. Admiral Gensoul has been handed four alternatives: sail with us, sail to a British port, sail demilitarized to the West Indies, or scuttle within six hours. He refuses to choose. Force H stands off the Algerian coast with its guns trained and orders that expire at nightfall. The War Cabinet must give the word or withhold it.',
    choices: [
      {
        label: 'Open fire',
        detail: 'Sink the French fleet at its moorings and seize the ships in British ports. The world will know Britain fights on.',
        effects: [
          { t: 'navy', nation: 'FRA', delta: -120 },
          { t: 'navy', nation: 'UK', delta: 20 },
          { t: 'relations', a: 'UK', b: 'FRA', delta: -40 },
          { t: 'relations', a: 'UK', b: 'USA', delta: 10 },
          { t: 'warSupport', nation: 'UK', delta: 8 },
          { t: 'tension', delta: 3 },
          { t: 'report', to: 'FRA', kind: 'front', title: 'The Royal Navy fires on the fleet', body: 'British battleships have shelled the squadron at Mers-el-Kebir. Nearly thirteen hundred French sailors are dead. Ships in British ports have been boarded and seized.' },
          { t: 'report', to: 'GER', kind: 'intel', title: 'British attack at Mers-el-Kebir', body: 'The Royal Navy has destroyed a large part of the French fleet at anchor rather than see it fall under armistice control. London does not intend to negotiate.' },
          { t: 'report', to: 'USA', kind: 'diplomatic', title: 'Action at Mers-el-Kebir', body: 'Britain has fired on the fleet of her late ally rather than risk its surrender. Whatever else is in doubt, British resolve is not.' },
          { t: 'chronicle', text: 'The Royal Navy fired on the French fleet at Mers-el-Kebir; twelve hundred and ninety-seven French sailors died at the hands of an ally of six weeks before.' },
        ],
        aiWeight: 4,
      },
      {
        label: 'Trust the armistice terms',
        detail: 'Accept French assurances that no ship will pass to German control. Withhold fire and keep French friendship.',
        effects: [
          { t: 'flag', key: UK_FRENCH_FLEET_SPARED, value: true },
          { t: 'relations', a: 'UK', b: 'FRA', delta: 10 },
          { t: 'warSupport', nation: 'UK', delta: -3 },
          { t: 'report', to: 'FRA', kind: 'diplomatic', title: 'Force H withdraws', body: 'The British squadron off Mers-el-Kebir has stood down. London states it accepts French assurances regarding the fleet.' },
          { t: 'chronicle', text: 'Britain stayed her hand at Mers-el-Kebir and staked the naval balance on French assurances; in our history the War Cabinet gave the order to fire.', divergence: true },
        ],
        aiWeight: 1,
      },
      {
        label: 'Seize only the ships in British ports',
        detail: 'Take what is already in Portsmouth and Plymouth. Leave the African squadrons untouched, and unresolved.',
        effects: [
          { t: 'navy', nation: 'FRA', delta: -40 },
          { t: 'navy', nation: 'UK', delta: 20 },
          { t: 'relations', a: 'UK', b: 'FRA', delta: -15 },
          { t: 'warSupport', nation: 'UK', delta: 2 },
          { t: 'report', to: 'FRA', kind: 'diplomatic', title: 'French ships seized in England', body: 'British parties have boarded French vessels in home ports. The squadrons at Mers-el-Kebir and Dakar were not molested.' },
          { t: 'chronicle', text: 'Catapult was carried out by half-measure: the ships in England were taken, the African fleet was left riding at anchor, and the question it posed was left for another day.', divergence: true },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 8. Battle of Britain posture: the enemy on the Channel coast.
  // -------------------------------------------------------------------------
  {
    id: 'uk-battle-of-britain',
    title: 'The Air Battle',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'UK', b: 'GER' },
        { t: 'controls', nation: 'GER', region: 'fra-north' },
        { t: 'not', c: { t: 'flag', key: capitulatedFlag('UK') } },
      ],
    },
    once: true,
    priority: 8,
    text:
      'AIR MINISTRY. The enemy holds the Channel coast from Brest to the Hook of Holland, and his air fleets have opened their assault on the fighter stations of Kent and Sussex. Invasion barges are counted daily in the ports opposite Dover. Fighter Command musters some seven hundred serviceable machines; the radar chain and the sector stations are the margin between an ordered defence and a blind one. The Air Staff asks for a ruling on how the battle is to be fought, and what may be spent to win it.',
    choices: [
      {
        label: 'The fighters hold the line',
        detail: 'Fight over the airfields, feed the squadrons forward, trust the Dowding system to husband the whole.',
        effects: [
          { t: 'air', nation: 'UK', delta: 25 },
          { t: 'warSupport', nation: 'UK', delta: 5 },
          { t: 'report', to: 'GER', kind: 'front', title: 'British fighter defence holding', body: 'Fighter Command accepts battle daily over its own stations. Claimed attrition is not producing the collapse the air staff projected.' },
          { t: 'chronicle', text: 'The air battle over southern England was fought and won by the few, squadron by squadron, over their own airfields.' },
        ],
        aiWeight: 4,
      },
      {
        label: 'Husband the reserve north of London',
        detail: 'Refuse the decisive battle. Concede the forward airfields by day and keep the force in being for the invasion itself.',
        effects: [
          { t: 'air', nation: 'UK', delta: 10 },
          { t: 'stability', nation: 'UK', delta: -4 },
          { t: 'warSupport', nation: 'UK', delta: -3 },
          { t: 'chronicle', text: 'Fighter Command withdrew north of the Thames and let the coastal stations burn, keeping its strength against invasion day; our history fought for every airfield.', divergence: true },
        ],
        aiWeight: 2,
      },
      {
        label: 'Strike the invasion ports',
        detail: 'Send Bomber Command against the barges by night and the fighters with them by day. Costly, and it may end the threat at its source.',
        effects: [
          { t: 'navy', nation: 'GER', delta: -30 },
          { t: 'air', nation: 'UK', delta: -20 },
          { t: 'warSupport', nation: 'UK', delta: 3 },
          { t: 'tension', delta: 2 },
          { t: 'report', to: 'GER', kind: 'front', title: 'Invasion fleet under attack', body: 'British bombers are striking the embarkation ports nightly. Barge losses are mounting faster than replacement.' },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 9. The Lend-Lease ask: the letter to the President.
  // -------------------------------------------------------------------------
  {
    id: 'uk-lend-lease-appeal',
    title: 'A Letter to the President',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'UK', b: 'GER' },
        { t: 'not', c: { t: 'flag', key: FLAGS.LEND_LEASE } },
        { t: 'not', c: { t: 'atWar', a: 'USA', b: 'GER' } },
        { t: 'alive', nation: 'USA' },
        {
          t: 'or',
          c: [
            { t: 'flag', key: capitulatedFlag('FRA') },
            { t: 'warSupport', nation: 'UK', below: 55 },
          ],
        },
      ],
    },
    once: true,
    priority: 6,
    text:
      '10 DOWNING STREET. The Treasury reports gold and dollar reserves near exhaustion. Orders placed in American factories can be paid for into the spring and no further. The Prime Minister has drafted a letter to President Roosevelt, described in the office as one of the most important of his life, setting out the shipping ledger, the aircraft ledger, and the dollar ledger without ornament. The moment approaches, it reads, when we shall no longer be able to pay cash. The President\'s sympathies are not in doubt; his Congress is.',
    choices: [
      {
        label: 'Send the letter. Give us the tools',
        detail: 'Lay the books open to Washington and ask for aid without payment. Pride is cheaper than defeat.',
        effects: [
          { t: 'flag', key: UK_LEND_LEASE_APPEAL_SENT, value: true },
          { t: 'relations', a: 'UK', b: 'USA', delta: 15 },
          { t: 'warSupport', nation: 'UK', delta: 3 },
          { t: 'report', to: 'USA', kind: 'diplomatic', title: 'A letter from London', body: 'The Prime Minister has set Britain\'s position before the President without concealment: the war can be fought, but it can no longer be paid for in cash. He asks for the tools.' },
          { t: 'chronicle', text: 'London asked Washington for the tools to finish the job, and put the solvency of the Empire on the table to get them.' },
        ],
        aiWeight: 4,
      },
      {
        label: 'Offer bases for destroyers first',
        detail: 'Trade ninety-nine-year leases on Atlantic bases for fifty over-age destroyers. A deal, not a plea.',
        effects: [
          { t: 'navy', nation: 'UK', delta: 40 },
          { t: 'relations', a: 'UK', b: 'USA', delta: 8 },
          { t: 'stability', nation: 'UK', delta: -2 },
          { t: 'report', to: 'USA', kind: 'diplomatic', title: 'Destroyers for bases', body: 'Britain offers long leases on its Atlantic island bases in exchange for destroyers now. Hardware for real estate, no credit asked.' },
        ],
        aiWeight: 2,
      },
      {
        label: 'Pay cash while it lasts',
        detail: 'No begging letters. Liquidate the overseas holdings, spend the gold to the bottom, and keep the account square.',
        effects: [
          { t: 'ic', nation: 'UK', delta: -3 },
          { t: 'armyStrength', nation: 'UK', delta: 5 },
          { t: 'stability', nation: 'UK', delta: 2 },
          { t: 'chronicle', text: 'Britain declined to ask America for aid and sold the last of its overseas wealth instead; the begging letter of December 1940 that shaped our history was never sent.', divergence: true },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 10. Lend-Lease arrives (fires on the cross-pack flag set by the USA pack).
  // -------------------------------------------------------------------------
  {
    id: 'uk-lend-lease-arrives',
    title: 'The Arsenal Opens',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.LEND_LEASE },
        { t: 'atWar', a: 'UK', b: 'GER' },
      ],
    },
    once: true,
    priority: 5,
    text:
      'MINISTRY OF SUPPLY. The Lend-Lease Act is law in Washington. War material may now cross the Atlantic without payment, against account rendered on the day of victory: aircraft, armour, escort vessels, machine tools, wheat. The convoy routes, not the credit lines, are now the limiting factor. The first allocations cannot cover every need at once, and the Chiefs of Staff are asked to state where British necessity is greatest.',
    choices: [
      {
        label: 'Escorts and food for the Atlantic',
        detail: 'The lifeline first. Corvettes, long-range aircraft, and grain; everything else waits on the convoys.',
        effects: [
          { t: 'navy', nation: 'UK', delta: 60 },
          { t: 'stability', nation: 'UK', delta: 3 },
          { t: 'warSupport', nation: 'UK', delta: 3 },
          { t: 'chronicle', text: 'The first Lend-Lease allocations went to the Atlantic lifeline; the island would be fed and the convoys screened before any offensive was armed.' },
        ],
        aiWeight: 4,
      },
      {
        label: 'Armour for the field armies',
        detail: 'Tanks, trucks, and guns to the armies abroad. The war must eventually be won on land.',
        effects: [
          { t: 'armyStrength', nation: 'UK', delta: 12 },
          { t: 'warSupport', nation: 'UK', delta: 3 },
        ],
        aiWeight: 2,
      },
      {
        label: 'Aircraft above all',
        detail: 'Bombers and fighters. Carry the war to the enemy from the air while the armies rebuild.',
        effects: [
          { t: 'air', nation: 'UK', delta: 60 },
          { t: 'warSupport', nation: 'UK', delta: 3 },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 11. Empire strain: what to ask of India, and what to promise.
  // -------------------------------------------------------------------------
  {
    id: 'uk-empire-strain',
    title: 'The Weight of Empire',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'UK', b: 'GER' },
        { t: 'turnAtLeast', n: 30 },
        {
          t: 'or',
          c: [
            { t: 'stability', nation: 'UK', below: 70 },
            { t: 'warSupport', nation: 'UK', below: 55 },
          ],
        },
      ],
    },
    once: true,
    priority: 4,
    text:
      'INDIA OFFICE, LONDON. The Empire carries the war unevenly. India has raised the largest volunteer army in history and pays for it in inflation, requisition, and political arrest; the Congress party names independence as the price of cooperation, and its leaders wait in prison. The Dominions ask after the defence of their own oceans. The Treasury reports sterling balances mounting in Delhi that London cannot redeem. The Cabinet must decide what more to ask of the Empire, and what, if anything, to promise it.',
    choices: [
      {
        label: 'Draw deeper on India',
        detail: 'More divisions, more rice, more requisition. The war effort first; the political bill comes due after victory.',
        effects: [
          { t: 'manpower', nation: 'UK', delta: 1500 },
          { t: 'stability', nation: 'UK', delta: -4 },
          { t: 'relations', a: 'UK', b: 'IND', delta: -10 },
          { t: 'report', to: 'IND', kind: 'domestic', title: 'New war levies announced', body: 'London has ordered further recruitment and requisition across the Raj. The Viceroy\'s council was informed, not consulted.' },
          { t: 'chronicle', text: 'The war was fed from the Empire without the Empire\'s consent; the ledgers record rice requisitioned and shipping withheld, and in Bengal the price of those ledgers was paid in famine.' },
        ],
        aiWeight: 4,
      },
      {
        label: 'Promise India her freedom',
        detail: 'A firm public pledge of independence at the war\'s end, in exchange for full cooperation now.',
        effects: [
          { t: 'flag', key: UK_INDIA_REFORM_PROMISED, value: true },
          { t: 'manpower', nation: 'UK', delta: 600 },
          { t: 'stability', nation: 'UK', delta: 2 },
          { t: 'relations', a: 'UK', b: 'IND', delta: 15 },
          { t: 'report', to: 'IND', kind: 'diplomatic', title: 'The London declaration', body: 'Britain has pledged, in terms admitting no retreat, that India will govern herself when the war is won. Congress is asked to join the war effort on that basis.' },
          { t: 'chronicle', text: 'London bound itself to Indian independence while the war still hung in the balance, a pledge our history offered only in the equivocal drafts of the Cripps mission.', divergence: true },
        ],
        aiWeight: 2,
      },
      {
        label: 'Tighten the belt at home',
        detail: 'Ask nothing new of the Empire. Deeper rationing and longer hours in Britain instead.',
        effects: [
          { t: 'manpower', nation: 'UK', delta: 300 },
          { t: 'stability', nation: 'UK', delta: -8 },
          { t: 'warSupport', nation: 'UK', delta: -3 },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 12. Surrender event, engine convention id: fires on capitulation.
  // -------------------------------------------------------------------------
  {
    id: surrenderEventId('UK'),
    title: 'The Fall of London',
    nation: 'UK',
    fires: { t: 'flag', key: capitulatedFlag('UK') },
    once: true,
    priority: 9,
    text:
      'MOST SECRET. FOR WHAT REMAINS OF THE WAR CABINET. Enemy formations are in the capital and organized resistance in the south of England is ending. The machinery of government is broken. Plans long held against this day are on the table: the fleet to Halifax, the King and government to Ottawa, the war carried on from the Empire and the seas. Against them stands the counsel that the country has borne all it can, and that terms should be sought while a British state remains to ask for them. There is no precedent. There is only the decision.',
    choices: [
      {
        label: 'The government sails for Ottawa',
        detail: 'The King, the Cabinet, and the fleet leave for Canada. Britain falls; the war does not end.',
        effects: [
          { t: 'flag', key: exileFlag('UK'), value: true },
          { t: 'relations', a: 'UK', b: 'USA', delta: 10 },
          { t: 'relations', a: 'UK', b: 'CAN', delta: 20 },
          { t: 'report', to: 'CAN', kind: 'diplomatic', title: 'The government arrives', body: 'The King and the British government have reached Ottawa with the surviving units of the Royal Navy. The war of the British Empire continues from Canadian soil.' },
          { t: 'report', to: 'USA', kind: 'diplomatic', title: 'Britain fights on from exile', body: 'The home islands are lost, but the British government, the fleet, and the Empire have not surrendered. The Atlantic is now the front line.' },
          { t: 'chronicle', text: 'The British Isles fell, and the government crossed the Atlantic to carry on the war from Ottawa; nothing in our history prepared anyone for this.', divergence: true },
        ],
        aiWeight: 3,
      },
      {
        label: 'Ask for an armistice',
        detail: 'End it. Seek terms while a British state still exists to sign them.',
        effects: [
          { t: 'puppet', nation: 'UK', by: 'GER' },
          { t: 'tension', delta: -5 },
          { t: 'report', to: 'USA', kind: 'diplomatic', title: 'Britain capitulates', body: 'A British delegation has asked Berlin for terms. The remaining ships of the Royal Navy are to be interned under the armistice commission.' },
          { t: 'chronicle', text: 'Britain signed an armistice on her own soil, the first conqueror\'s peace imposed on England since 1066; in our history no such day ever came.', divergence: true },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Succession events, keyed to the leaders.ts succession table. Queued by
  // the engine when the sitting Prime Minister dies; the fires condition
  // gates on the permanent {LEADER}_DEAD flags so a normal political
  // transition never triggers them spontaneously.
  // -------------------------------------------------------------------------
  {
    id: 'uk-succession-churchill',
    title: 'The King Sends for Churchill',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'UK', leader: 'churchill' },
        { t: 'or', c: [{ t: 'flag', key: 'CHAMBERLAIN_DEAD' }, { t: 'flag', key: 'HALIFAX_DEAD' }] },
      ],
    },
    once: true,
    priority: 8,
    text:
      'From the Palace, a summons. The Prime Minister is dead, and the King has sent for the Member ' +
      'for Epping, the man the party machine kept from office through a decade of warnings. He accepts ' +
      'in the plain terms the hour demands. The new Prime Minister forms a government of all parties ' +
      'and asks the House for its confidence, offering nothing but the prosecution of the national ' +
      'cause with every resource the Empire commands. In Berlin the appointment is read, correctly, ' +
      'as an answer.',
    choices: [
      {
        label: 'Action this day',
        detail: 'A war ministry in permanent session. Everything else waits.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: FLAGS.CHURCHILL_PM, value: true },
          { t: 'warSupport', nation: 'UK', delta: 6 },
          { t: 'stability', nation: 'UK', delta: -2 },
        ],
      },
      {
        label: 'Steady the House first',
        detail: 'Confidence, then a cabinet of national concentration.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: FLAGS.CHURCHILL_PM, value: true },
          { t: 'stability', nation: 'UK', delta: 4 },
        ],
      },
    ],
  },
  {
    id: 'uk-succession-halifax',
    title: 'The Holy Fox Takes Office',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'UK', leader: 'halifax' },
        { t: 'or', c: [{ t: 'flag', key: 'CHAMBERLAIN_DEAD' }, { t: 'flag', key: 'CHURCHILL_DEAD' }] },
      ],
    },
    once: true,
    priority: 8,
    text:
      'The succession passes to the Foreign Secretary. From the Lords, Halifax kisses hands: a peer ' +
      'as Prime Minister, constitutionally awkward and politically deliberate. The new government ' +
      'speaks of continuity, of firmness matched with realism, of ends and means honestly weighed. ' +
      'The service ministries note no change in the programmes. The chanceries of Europe note ' +
      'something else: this is a man who has never believed the quarrel with Germany must be fought ' +
      'to a finish, and who now holds the deciding voice.',
    choices: [
      {
        label: 'Continuity and caution',
        detail: 'The programmes proceed. The options stay open.',
        aiWeight: 2,
        effects: [{ t: 'stability', nation: 'UK', delta: 4 }],
      },
      {
        label: 'Sound Berlin, quietly',
        detail: 'Through Rome or Stockholm. Nothing His Majesty\'s Government need own.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'UK', b: 'GER', delta: 10 },
          { t: 'warSupport', nation: 'UK', delta: -4 },
        ],
      },
    ],
  },
];
