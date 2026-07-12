// France event pack: the Third Republic's road from the armament debates of
// 1938 to the choice at Bordeaux, and the two Frances that can follow it.
//
// Pure data. Every trigger anchors on world state (flags, wars, relations,
// leaders, control); turnAtLeast/turnBefore appear only as floors/ceilings
// beside real conditions. Cross-pack flags come from the registry; the flags
// below are local to this pack (read nowhere else).

import type { GameEvent } from '../../engine/types';
import { FLAGS, capitulatedFlag, surrenderEventId } from './registry';

/** Flags set and read only inside the France pack. */
const FRA_FLAGS = {
  MAGINOT_EXTENDED: 'FRA_MAGINOT_EXTENDED',
  ARMOR_DOCTRINE: 'FRA_ARMOR_DOCTRINE',
  DYLE_PLAN: 'FRA_DYLE_PLAN',
  PETAIN_RECALLED: 'FRA_PETAIN_RECALLED',
  FLEET_TOULON: 'FRA_FLEET_TOULON',
} as const;

export const FRANCE_EVENTS: GameEvent[] = [
  // -------------------------------------------------------------------------
  // 1. The 1938 armament credits: concrete or tanks.
  // -------------------------------------------------------------------------
  {
    id: 'fra-maginot-doctrine',
    title: 'The Armament Credits',
    nation: 'FRA',
    once: true,
    priority: 5,
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'FRA' },
        { t: 'not', c: { t: 'atWar', a: 'FRA' } },
        { t: 'relations', a: 'FRA', b: 'GER', below: -20 },
        { t: 'turnAtLeast', n: 2 },
        { t: 'turnBefore', n: 20 },
      ],
    },
    text:
      'Memorandum, Conseil Supérieur de la Guerre, to the Minister of National Defence. ' +
      'The credits voted for the fortification of the northeastern frontier are nearly exhausted at the Belgian border. ' +
      "Colonel de Gaulle's book on the professional armored corps circulates in the Chamber, and Reynaud presses its case; " +
      'Marshal Pétain and the General Staff judge continuous fortification the sounder investment. ' +
      'The treasury will bear one programme, and one only. Germany rearms on a schedule we do not set. ' +
      'The Council requests a decision on the allocation of the 1938 armament credits.',
    choices: [
      {
        label: 'Pour the concrete north',
        detail: 'Extend the fortified line along the Belgian frontier toward the sea. The country trusts what it can see.',
        effects: [
          { t: 'flag', key: FRA_FLAGS.MAGINOT_EXTENDED, value: true },
          { t: 'newArmy', nation: 'FRA', name: 'Fortress Army of the North', location: 'fra-north', strength: 60, equipment: 70 },
          { t: 'stability', nation: 'FRA', delta: 5 },
        ],
        aiWeight: 4,
      },
      {
        label: 'Raise the armored corps',
        detail: "De Gaulle's professional mechanized force: divisions of tanks and lorried infantry, an army that moves.",
        effects: [
          { t: 'flag', key: FRA_FLAGS.ARMOR_DOCTRINE, value: true },
          { t: 'tech', nation: 'FRA', track: 'armor', delta: 1 },
          { t: 'stability', nation: 'FRA', delta: -3 },
          {
            t: 'chronicle',
            text: 'In this history the Republic listened to its colonel. The 1938 credits went to a professional armored corps, and the concrete stopped at Montmédy.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
      {
        label: 'Divide the credits',
        detail: 'Half measures for both programmes; neither finished soon.',
        effects: [
          { t: 'armyStrength', nation: 'FRA', delta: 5 },
          { t: 'stability', nation: 'FRA', delta: 2 },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. The 1938 early-war option: Munich stood, Berlin marched anyway.
  // -------------------------------------------------------------------------
  {
    id: 'fra-early-war-1938',
    title: 'The Treaty of 1924',
    nation: 'FRA',
    once: true,
    priority: 8,
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.MUNICH_WAR },
        { t: 'atWar', a: 'GER', b: 'CZE' },
        { t: 'not', c: { t: 'atWar', a: 'FRA', b: 'GER' } },
        { t: 'alive', nation: 'FRA' },
        { t: 'alive', nation: 'CZE' },
        { t: 'turnBefore', n: 16 },
      ],
    },
    text:
      "The Quai d'Orsay reports that German columns crossed the Bohemian frontier at dawn. " +
      'London and Paris stood at Munich; Berlin chose war regardless. ' +
      "The Franco-Czechoslovak treaty of 1924 binds France to Prague's defense. " +
      "General Gamelin advises the Council that the Wehrmacht's weight is committed in Bohemia and that fewer than a dozen German divisions stand in the west; " +
      'he also advises that the army is not mobilized and that the country has not been asked. ' +
      "Beneš's ambassador waits in the antechamber. The Council must give him an answer.",
    choices: [
      {
        label: 'Honor the treaty',
        detail: 'General mobilization and an offensive toward the Rhine while the Wehrmacht is engaged in Bohemia.',
        effects: [
          { t: 'declareWar', attacker: 'FRA', defender: 'GER' },
          { t: 'relations', a: 'FRA', b: 'CZE', delta: 30 },
          { t: 'warSupport', nation: 'FRA', delta: -10 },
          {
            t: 'chronicle',
            text: 'France marched in 1938. The general war Berlin had planned for later came a year early, against an unfinished Westwall.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'GER',
            kind: 'front',
            title: 'France declares war',
            body: 'Paris has honored its Czechoslovak treaty. French forces are mobilizing on the western frontier while the campaign in Bohemia continues.',
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'diplomatic',
            title: 'Paris goes to war',
            body: 'France has declared war on Germany in defense of Czechoslovakia, and asks where Britain stands.',
          },
        ],
        aiWeight: 2,
      },
      {
        label: 'Mobilize, but hold the frontier',
        detail: 'Call the reserve classes, man the works, and let Berlin feel the weight without crossing it.',
        effects: [
          { t: 'armyStrength', nation: 'FRA', delta: 5 },
          { t: 'relations', a: 'FRA', b: 'GER', delta: -15 },
          { t: 'tension', delta: 2 },
          {
            t: 'report',
            to: 'GER',
            kind: 'intel',
            title: 'French reserve classes called up',
            body: 'French covering forces have manned the frontier fortifications. Paris has not declared war.',
          },
        ],
        aiWeight: 3,
      },
      {
        label: 'The treaty cannot be honored',
        detail: 'France will not bleed for Bohemia unless Britain marches first.',
        effects: [
          { t: 'relations', a: 'FRA', b: 'CZE', delta: -40 },
          { t: 'relations', a: 'FRA', b: 'UK', delta: -10 },
          { t: 'stability', nation: 'FRA', delta: -5 },
          { t: 'warSupport', nation: 'FRA', delta: -5 },
          {
            t: 'chronicle',
            text: 'The treaty of 1924 was not honored. Prague fought without the ally that signed it.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. The forty-hour question: production against the streets.
  // -------------------------------------------------------------------------
  {
    id: 'fra-labor-decrees',
    title: 'The Forty-Hour Question',
    nation: 'FRA',
    once: true,
    priority: 3,
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'FRA' },
        { t: 'not', c: { t: 'atWar', a: 'FRA' } },
        { t: 'stability', nation: 'FRA', below: 60 },
        { t: 'turnAtLeast', n: 6 },
      ],
    },
    text:
      'Note from the Ministry of Finance to the Président du Conseil. The armament programme is eighteen months behind schedule. ' +
      "The factories work five days while Germany's work seven; the forty-hour law, the conquest of 1936, governs even the aircraft works at Toulouse. " +
      'Reynaud proposes decree-laws to lengthen the armament week, and the CGT promises a general strike the day they are signed. ' +
      'The alternative is to keep the social peace and the present rate of output. ' +
      'The cabinet must weigh production against the streets.',
    choices: [
      {
        label: 'Sign the decree-laws',
        detail: 'The armament week comes first. Break the strike if it comes.',
        effects: [
          { t: 'ic', nation: 'FRA', delta: 4 },
          { t: 'stability', nation: 'FRA', delta: -5 },
        ],
        aiWeight: 4,
      },
      {
        label: 'Keep the social peace',
        detail: 'The Republic quarrels with its workers at its peril.',
        effects: [
          { t: 'stability', nation: 'FRA', delta: 5 },
          {
            t: 'chronicle',
            text: 'The forty-hour week held. The arsenals kept the peace, and the schedule slipped.',
            divergence: true,
          },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. Rome demands Tunis, Corsica, Savoy.
  // -------------------------------------------------------------------------
  {
    id: 'fra-tunis-corsica',
    title: 'Tunis, Corsica, Savoy',
    nation: 'FRA',
    once: true,
    priority: 4,
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'FRA' },
        { t: 'alive', nation: 'ITA' },
        { t: 'relations', a: 'ITA', b: 'FRA', below: -20 },
        { t: 'not', c: { t: 'atWar', a: 'FRA', b: 'ITA' } },
        { t: 'turnAtLeast', n: 10 },
      ],
    },
    text:
      'Telegram, Ambassador François-Poncet, Rome. During the Chamber sitting of 30 November the Fascist deputies rose on cue to cry Tunis, Corsica, Savoy, and the galleries answered. ' +
      'The Duce sat silent and let the demonstration run. ' +
      "The embassy assesses the claims as a pressure campaign aimed at the Tunisian protectorate and the Djibouti railway, mounted with Berlin's tacit blessing. " +
      'Rome will read the reply in deeds. ' +
      'The question before the Council is whether France answers with a closed fist or an open ledger.',
    choices: [
      {
        label: 'A closed fist',
        detail: 'Reject every claim publicly; the Président du Conseil tours Corsica and Tunis to say not one acre, not one right.',
        effects: [
          { t: 'relations', a: 'FRA', b: 'ITA', delta: -10 },
          { t: 'armyStrength', nation: 'FRA', delta: 3 },
          { t: 'warSupport', nation: 'FRA', delta: 5 },
          { t: 'stability', nation: 'FRA', delta: 3 },
          { t: 'tension', delta: 2 },
          {
            t: 'report',
            to: 'ITA',
            kind: 'diplomatic',
            title: 'Paris rejects all claims',
            body: 'The French premier has toured Corsica and Tunis and declared that France will cede neither an acre of her territory nor one of her rights.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'An open ledger',
        detail: 'Offer conversations on Djibouti, the Suez board, the status of Italians in Tunisia. Buy quiet in the Mediterranean.',
        effects: [
          { t: 'relations', a: 'FRA', b: 'ITA', delta: 15 },
          { t: 'warSupport', nation: 'FRA', delta: -5 },
          { t: 'stability', nation: 'FRA', delta: -3 },
          {
            t: 'chronicle',
            text: 'Paris offered Rome conversations over Tunis and the Djibouti line. Appetite, fed, grew.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'ITA',
            kind: 'diplomatic',
            title: 'Paris offers conversations',
            body: 'The French government proposes negotiations on the Italian claims in Africa. The initiative is judged in Rome as weakness.',
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. The Monnet mission: American aircraft or machine tools at home.
  // -------------------------------------------------------------------------
  {
    id: 'fra-buy-american',
    title: 'The Purchasing Mission',
    nation: 'FRA',
    once: true,
    priority: 4,
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'FRA' },
        { t: 'relations', a: 'FRA', b: 'USA', atLeast: 20 },
        { t: 'tension', atLeast: 25 },
        { t: 'not', c: { t: 'flag', key: FLAGS.VICHY } },
        { t: 'turnAtLeast', n: 8 },
      ],
    },
    text:
      'Note for the Minister of Finance. The Air Ministry confirms that domestic output of modern fighters remains below one hundred airframes a month, against German output several times that figure. ' +
      'Monsieur Jean Monnet proposes a purchasing mission to Washington: American factories can deliver combat aircraft in quantity, for dollars, within the year. ' +
      'The Treasury observes that the same dollars could instead double the machine-tool stock of the nationalized works at home, a slower remedy that stays. ' +
      'Neutrality law complicates delivery, but the President is understood to be sympathetic. ' +
      'A decision is requested before the exchange position worsens.',
    choices: [
      {
        label: 'Send the mission to Washington',
        detail: 'Curtiss fighters and Douglas bombers now, whatever the exchange costs.',
        effects: [
          { t: 'air', nation: 'FRA', delta: 40 },
          { t: 'relations', a: 'FRA', b: 'USA', delta: 10 },
        ],
        aiWeight: 4,
      },
      {
        label: 'Dollars for the works at home',
        detail: 'Machine tools and plant for the nationalized factories. Slower, but the capacity is French and it stays.',
        effects: [
          { t: 'ic', nation: 'FRA', delta: 3 },
          { t: 'air', nation: 'FRA', delta: 10 },
          { t: 'stability', nation: 'FRA', delta: 2 },
          {
            t: 'chronicle',
            text: 'The Monnet mission never sailed. The dollars went into machine tools at home, and the aircraft came later, or not at all.',
            divergence: true,
          },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. War plan against Germany: the Dyle manoeuvre or the frontier.
  // -------------------------------------------------------------------------
  {
    id: 'fra-dyle-plan',
    title: 'The Manoeuvre into Belgium',
    nation: 'FRA',
    once: true,
    priority: 6,
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'FRA', b: 'GER' },
        { t: 'alive', nation: 'BEL' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'BEL' } },
        { t: 'alive', nation: 'FRA' },
      ],
    },
    text:
      "General Headquarters, Vincennes. General Gamelin submits the winter directive for the Council's approval. " +
      'Belgium keeps its neutrality and will not stake it on staff conversations, yet every appreciation holds that the German blow will come through the Low Countries as in 1914. ' +
      'The First Army Group can wheel forward to the Dyle the moment Brussels calls, meeting the enemy on Belgian soil and covering the northern industries. ' +
      'Or the armies can stand on the fortified frontier they have prepared all winter and let the blow spend itself. ' +
      'The directive requires a signature.',
    choices: [
      {
        label: 'Approve the Dyle manoeuvre',
        detail: 'The best divisions wheel into Belgium at the first shot. The battle is fought forward, away from French soil.',
        effects: [
          { t: 'flag', key: FRA_FLAGS.DYLE_PLAN, value: true },
          { t: 'relations', a: 'FRA', b: 'BEL', delta: 15 },
          { t: 'warSupport', nation: 'FRA', delta: 5 },
          {
            t: 'report',
            to: 'BEL',
            kind: 'diplomatic',
            title: 'French staff dispositions',
            body: 'The French First Army Group is echeloned to advance to the Dyle line the moment Belgium is attacked and calls for aid.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Stand on the frontier',
        detail: 'No wheel, no gamble. The armies fight from prepared positions on French ground.',
        effects: [
          { t: 'armyStrength', nation: 'FRA', delta: 5 },
          { t: 'stability', nation: 'FRA', delta: 3 },
          { t: 'relations', a: 'FRA', b: 'BEL', delta: -10 },
          {
            t: 'chronicle',
            text: 'There was no wheel into Belgium. The French armies waited behind their own wire for the blow to come to them.',
            divergence: true,
          },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. The Chamber turns on Daladier when the war sours.
  // -------------------------------------------------------------------------
  {
    id: 'fra-reynaud-premier',
    title: 'The Chamber Turns',
    nation: 'FRA',
    once: true,
    priority: 6,
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'FRA' },
        { t: 'leaderIs', nation: 'FRA', leader: 'daladier' },
        { t: 'atWar', a: 'FRA', b: 'GER' },
        { t: 'warSupport', nation: 'FRA', below: 45 },
      ],
    },
    text:
      'Secret session of the Chamber of Deputies. The deputies emerged grim. ' +
      'The war drags and the country feels it is not being fought: communiqués speak of patrols on the Saar, ration books, and little else. ' +
      "Daladier's majority has thinned to abstentions. " +
      'Paul Reynaud, at Finance, demands the war be waged with method and with fury, and his friends canvass openly for the succession. ' +
      'In the lobbies older men speak of Marshal Pétain, ambassador in Madrid, as a name to steady the country. ' +
      'The President of the Republic must send for someone.',
    choices: [
      {
        label: 'Send for Reynaud',
        detail: 'The combative man of finance forms a war ministry by a handful of votes.',
        effects: [
          { t: 'setLeader', nation: 'FRA', leader: 'reynaud' },
          { t: 'warSupport', nation: 'FRA', delta: 10 },
          { t: 'stability', nation: 'FRA', delta: -3 },
        ],
        aiWeight: 4,
      },
      {
        label: 'Daladier soldiers on',
        detail: 'No captain changed in mid-passage. The abstentions deepen.',
        effects: [
          { t: 'stability', nation: 'FRA', delta: -5 },
          { t: 'warSupport', nation: 'FRA', delta: -5 },
        ],
        aiWeight: 1,
      },
      {
        label: 'Call the Marshal to the cabinet',
        detail: 'Pétain returns from Madrid as minister of state. The country is reassured; the defeatists have their man inside.',
        effects: [
          { t: 'flag', key: FRA_FLAGS.PETAIN_RECALLED, value: true },
          { t: 'stability', nation: 'FRA', delta: 5 },
          { t: 'warSupport', nation: 'FRA', delta: -5 },
          {
            t: 'chronicle',
            text: 'The old Marshal of Verdun entered the government early, and his shadow lengthened over it.',
            divergence: true,
          },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 8. Calling the empire's classes to the colors.
  // -------------------------------------------------------------------------
  {
    id: 'fra-empire-levy',
    title: 'The Army of Africa',
    nation: 'FRA',
    once: true,
    priority: 4,
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'FRA' },
        { t: 'atWar', a: 'FRA' },
        { t: 'controls', nation: 'FRA', region: 'fra-algeria' },
        { t: 'not', c: { t: 'flag', key: FLAGS.VICHY } },
      ],
    },
    text:
      'Report of the Commander-in-Chief, North Africa, to the War Ministry. The war absorbs the active divisions of the metropole. ' +
      'Across the Mediterranean the empire holds reserves the enemy cannot touch: the tirailleurs and zouaves of Algeria and Tunisia, the Moroccan divisions, the depots at Oran and Bizerte. ' +
      'A general levy would put fresh corps into the line within months, at the price of thinning the garrisons that keep the protectorates quiet and drawing on classes the settlers would rather see in the fields. ' +
      "The Ministry asks whether to call the empire's classes or leave them under arms at home.",
    choices: [
      {
        label: 'Call the classes of the empire',
        detail: 'A general levy across North Africa. The garrisons thin; the line thickens.',
        effects: [
          { t: 'manpower', nation: 'FRA', delta: 400 },
          { t: 'newArmy', nation: 'FRA', name: '19th Corps, Army of Africa', location: 'fra-algeria', strength: 55, equipment: 40 },
          { t: 'stability', nation: 'FRA', delta: -3 },
        ],
        aiWeight: 4,
      },
      {
        label: 'Leave the garrisons in place',
        detail: 'The protectorates stay quiet. The metropole fights with what it has.',
        effects: [{ t: 'stability', nation: 'FRA', delta: 2 }],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 9. Capitulation: the choice at Bordeaux. Engine convention 'surrender-FRA'
  //    (queued by events.ts when politics raises the capitulation flag).
  // -------------------------------------------------------------------------
  {
    id: surrenderEventId('FRA'),
    title: 'The Republic at Bordeaux',
    nation: 'FRA',
    once: true,
    priority: 9,
    fires: {
      t: 'and',
      c: [{ t: 'flag', key: capitulatedFlag('FRA') }, { t: 'alive', nation: 'FRA' }],
    },
    text:
      'The government has left Paris. At Bordeaux the cabinet sits in continuous session while refugee columns block the roads south. ' +
      'Marshal Pétain holds that the army is broken and that honor now requires an armistice sought openly, as between soldiers. ' +
      'Others answer that France remains an empire: the fleet is intact, North Africa untouched, and a government seated at Algiers could carry on the war beside Britain. ' +
      'Weygand warns of disorder in the metropole. ' +
      'The ministers must choose what France is to be.',
    choices: [
      {
        label: 'Ask terms of the enemy',
        detail: 'Pétain forms a government and seeks an armistice. The State survives at Vichy, sovereign in the south, watched everywhere.',
        effects: [
          { t: 'setLeader', nation: 'FRA', leader: 'petain' },
          { t: 'peace', a: 'FRA', b: 'GER' },
          { t: 'peace', a: 'FRA', b: 'ITA' },
          { t: 'breakPact', a: 'FRA', b: 'UK' },
          { t: 'puppet', nation: 'FRA', by: 'GER' },
          { t: 'flag', key: FLAGS.VICHY, value: true },
          { t: 'setController', region: 'fra-south', to: 'FRA' },
          { t: 'setController', region: 'fra-algeria', to: 'FRA' },
          { t: 'relations', a: 'FRA', b: 'UK', delta: -40 },
          { t: 'stability', nation: 'FRA', delta: 10 },
          { t: 'warSupport', nation: 'FRA', delta: -25 },
          {
            t: 'chronicle',
            text: "France signed the armistice. An État Français seated at Vichy administered the unoccupied south, under the victor's supervision.",
          },
          {
            t: 'report',
            to: 'player',
            kind: 'diplomatic',
            title: 'France capitulates',
            body: 'Marshal Pétain has asked Germany for an armistice. A French state at Vichy will administer the unoccupied zone and the empire. The Republic is out of the war.',
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'diplomatic',
            title: 'The French armistice',
            body: 'Bordeaux has asked for terms without consulting London. The disposition of the French fleet is now an open question of the first order.',
          },
          {
            t: 'report',
            to: 'GER',
            kind: 'front',
            title: 'France asks terms',
            body: 'The Pétain government requests an armistice. The south and the empire remain under a French administration answerable to Berlin.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'The Republic sails for Algiers',
        detail: 'Reynaud keeps the seals. The government, the gold, and the fleet cross to North Africa, and the war goes on.',
        available: { t: 'controls', nation: 'FRA', region: 'fra-algeria' },
        effects: [
          { t: 'setLeader', nation: 'FRA', leader: 'reynaud' },
          { t: 'flag', key: FLAGS.FRANCE_FIGHTS_ON, value: true },
          { t: 'flag', key: FLAGS.EXILE_FRA, value: true },
          { t: 'newArmy', nation: 'FRA', name: 'Army of Africa', location: 'fra-algeria', strength: 55, equipment: 45 },
          { t: 'relations', a: 'FRA', b: 'UK', delta: 25 },
          { t: 'warSupport', nation: 'FRA', delta: 10 },
          { t: 'stability', nation: 'FRA', delta: -10 },
          {
            t: 'chronicle',
            text: 'The government did not sign. It crossed to Algiers with the fleet and the empire, and the war in the west went on.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'player',
            kind: 'diplomatic',
            title: 'France fights on from Africa',
            body: 'The French government has refused an armistice and removed itself to Algiers with the fleet. Metropolitan France is occupied; French Africa is not.',
          },
          {
            t: 'report',
            to: 'GER',
            kind: 'front',
            title: 'No armistice signed',
            body: 'The French government has escaped to Algiers with the fleet. The occupation of the metropole ends nothing; the French war continues from Africa.',
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 10. Vichy branch: the fleet at Toulon.
  // -------------------------------------------------------------------------
  {
    id: 'fra-fleet-toulon',
    title: 'The Fleet Question',
    nation: 'FRA',
    once: true,
    priority: 7,
    fires: {
      t: 'and',
      c: [{ t: 'flag', key: FLAGS.VICHY }, { t: 'alive', nation: 'FRA' }],
    },
    text:
      "Admiralty signal, Toulon. The armistice commissions ask for a schedule of the fleet's berths. " +
      'The battle squadrons ride intact at Toulon and Mers el-Kébir, the one force of the Republic the campaign never touched. ' +
      "Berlin's terms require the ships disarmed under supervision in home ports; " +
      "London signals, through channels that no longer officially exist, that His Majesty's Government cannot leave the fleet's disposition to assurances. " +
      'Admiral Darlan states the ships will never be surrendered to any power. ' +
      "Where they anchor, and under whose guns, is now the government's to decide.",
    choices: [
      {
        label: 'The fleet stays French, at Toulon',
        detail: "Darlan's word: disarmed under French colors, scuttling charges kept ready, surrendered to no one.",
        effects: [
          { t: 'flag', key: FRA_FLAGS.FLEET_TOULON, value: true },
          { t: 'relations', a: 'FRA', b: 'UK', delta: 5 },
          {
            t: 'report',
            to: 'UK',
            kind: 'intel',
            title: "Darlan's assurance",
            body: 'The French fleet remains at Toulon under French colors. The admiral has given his word it will never pass to Germany. The word is all there is.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Sail for British harbors',
        detail: 'The squadrons defy the armistice and steam for Portsmouth and Alexandria. Berlin will exact a price from Vichy.',
        effects: [
          { t: 'navy', nation: 'FRA', delta: -250 },
          { t: 'navy', nation: 'UK', delta: 250 },
          { t: 'relations', a: 'FRA', b: 'UK', delta: 30 },
          { t: 'relations', a: 'FRA', b: 'GER', delta: -30 },
          { t: 'tension', delta: 2 },
          {
            t: 'chronicle',
            text: 'The squadrons weighed anchor by night and steamed for Portsmouth and Alexandria. Vichy kept the armistice; the fleet did not.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'front',
            title: 'The French fleet comes over',
            body: 'French battle squadrons from Toulon and Mers el-Kébir have anchored in British harbors and placed themselves under Admiralty direction.',
          },
          {
            t: 'report',
            to: 'GER',
            kind: 'intel',
            title: 'French squadrons defect',
            body: 'The French fleet has sailed for British ports in violation of the armistice. The commissions recommend consequences for the Vichy administration.',
          },
        ],
        aiWeight: 1,
      },
      {
        label: 'Disarm under the commissions',
        detail: 'Full compliance. The ships pass under armistice control, and Berlin decides what becomes of them.',
        effects: [
          { t: 'navy', nation: 'FRA', delta: -150 },
          { t: 'navy', nation: 'GER', delta: 150 },
          { t: 'relations', a: 'FRA', b: 'UK', delta: -30 },
          { t: 'tension', delta: 3 },
          {
            t: 'chronicle',
            text: "The ships passed under armistice control, and some in time under the enemy's colors.",
            divergence: true,
          },
          {
            t: 'report',
            to: 'UK',
            kind: 'intel',
            title: 'The Toulon squadrons pass to enemy control',
            body: 'The French fleet is disarming under German supervision. The Admiralty must now count some of those hulls on the other side of the ledger.',
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 11. Fights-on branch: the empire answers Algiers.
  // -------------------------------------------------------------------------
  {
    id: 'fra-free-france-rallies',
    title: 'The Empire Answers',
    nation: 'FRA',
    once: true,
    priority: 5,
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.FRANCE_FIGHTS_ON },
        { t: 'atWar', a: 'FRA', b: 'GER' },
        { t: 'alive', nation: 'FRA' },
      ],
    },
    text:
      "Proclamation drafted at the Palais d'Été, Algiers. The government of the Republic, seated on French soil in Africa, calls the empire to witness that France remains in the war. " +
      'Governors from Dakar to Beirut wire their adherence one by one; Indochina waits on events. ' +
      'The British liaison offers shipping, credits, and equipment for every division North Africa can raise. ' +
      "The Council must decide whether to throw the empire's whole weight into the balance at once, or to husband its strength for the long war ahead.",
    choices: [
      {
        label: 'Throw the empire into the balance',
        detail: 'Every class, every depot, every hull. Britain equips what Africa raises.',
        effects: [
          { t: 'manpower', nation: 'FRA', delta: 400 },
          { t: 'newArmy', nation: 'FRA', name: 'Corps Expéditionnaire Français', location: 'fra-algeria', strength: 55, equipment: 45 },
          { t: 'relations', a: 'FRA', b: 'UK', delta: 15 },
          { t: 'warSupport', nation: 'FRA', delta: 5 },
          {
            t: 'chronicle',
            text: 'From Algiers the Republic called the empire to arms. The war in the west did not end in 1940.',
            divergence: true,
          },
        ],
        aiWeight: 3,
      },
      {
        label: 'Husband its strength',
        detail: 'The empire is the last France there is. Spend it slowly.',
        effects: [{ t: 'stability', nation: 'FRA', delta: 5 }],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Succession events, keyed to the leaders.ts succession table. Queued by
  // the engine when the sitting premier dies; the fires condition gates on
  // the permanent {LEADER}_DEAD flags so an ordinary change of ministry
  // never triggers them spontaneously.
  // -------------------------------------------------------------------------
  {
    id: 'fra-succession-reynaud',
    title: 'Reynaud Forms a Government',
    nation: 'FRA',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'FRA', leader: 'reynaud' },
        { t: 'or', c: [{ t: 'flag', key: 'DALADIER_DEAD' }, { t: 'flag', key: 'PETAIN_DEAD' }] },
      ],
    },
    once: true,
    priority: 8,
    text:
      'The Chamber invests Paul Reynaud by a narrow margin. The new premier is combative, quick, and ' +
      'unforgiving of the complacencies of the last decade; he has backed the armored heresies of a ' +
      'certain colonel since the books were reviews and the colonel was unfashionable. The ministries ' +
      'are told to expect decisions. The Bank is told to fund them. Whether the margin in the Chamber ' +
      'will survive the first hard decision is a question the premier declines to entertain.',
    choices: [
      {
        label: 'Back the armored school',
        detail: 'Credits to the mechanized divisions. The colonel gets his corps.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: FRA_FLAGS.ARMOR_DOCTRINE, value: true },
          { t: 'warSupport', nation: 'FRA', delta: 4 },
        ],
      },
      {
        label: 'Hold the majority together',
        detail: 'No doctrine is worth a government falling over it.',
        aiWeight: 1,
        effects: [{ t: 'stability', nation: 'FRA', delta: 5 }],
      },
    ],
  },
  {
    id: 'fra-succession-petain',
    title: 'The Marshal Called',
    nation: 'FRA',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'FRA', leader: 'petain' },
        { t: 'or', c: [{ t: 'flag', key: 'DALADIER_DEAD' }, { t: 'flag', key: 'REYNAUD_DEAD' }] },
      ],
    },
    once: true,
    priority: 8,
    text:
      'In the crisis the Republic reaches for its oldest talisman. The Marshal of Verdun accepts the ' +
      'premiership to an ovation that owes nothing to program and everything to memory. He speaks ' +
      'briefly: of the soil of France, of suffering, of the gift of his person. Order is promised. ' +
      'What else is intended remains, perhaps deliberately, unspoken. The embassies report a ' +
      'government that will not seek battles, and may not refuse a settlement that spares the country ' +
      'another bleeding.',
    choices: [
      {
        label: 'Order above all',
        detail: 'The country is steadied. The war is not spoken of.',
        aiWeight: 2,
        effects: [
          { t: 'stability', nation: 'FRA', delta: 8 },
          { t: 'warSupport', nation: 'FRA', delta: -5 },
        ],
      },
      {
        label: 'The Marshal rallies the army',
        detail: 'Verdun is invoked. The line will be held as it was held before.',
        aiWeight: 1,
        effects: [
          { t: 'warSupport', nation: 'FRA', delta: 3 },
          { t: 'armyStrength', nation: 'FRA', delta: 2 },
        ],
      },
    ],
  },
];
