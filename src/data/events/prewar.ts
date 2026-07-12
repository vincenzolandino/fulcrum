// Prewar event pack: the road to war, January 1938 to the Winter War.
// Pure data against the Condition/Effect DSL. Ids are prefixed 'pre-' per
// EVENT_ID_PREFIX.prewar. Cross-pack flags come from the registry (FLAGS);
// pack-local chain flags live in PREWAR_FLAGS below and are exported so
// downstream packs (poland, germany, ussr, uk) may key on them.

import type { GameEvent } from '../../engine/types';
import { FLAGS } from './registry';

/**
 * Pack-local flags. These carry state between the stages of this pack's
 * event chains (demand → answer). Exported because several are natural
 * hooks for other packs (e.g. PRE_PRAGUE_SEIZED, PRE_CASE_WHITE); they were
 * not added to registry.ts because that file is outside this task's remit.
 */
export const PREWAR_FLAGS = {
  /** Germany presented Vienna with the union ultimatum. */
  PRE_ANSCHLUSS_DEMAND: 'PRE_ANSCHLUSS_DEMAND',
  /** Austria chose to fight rather than yield (player-Austria only). */
  PRE_AUSTRIA_RESISTS: 'PRE_AUSTRIA_RESISTS',
  /** Germany formally demanded the Sudetenland. */
  PRE_MUNICH_DEMAND: 'PRE_MUNICH_DEMAND',
  /** Germany demanded the dissolution of Czechoslovakia outright. */
  PRE_MUNICH_TOTAL: 'PRE_MUNICH_TOTAL',
  /** London chose settlement at Munich. */
  PRE_MUNICH_APPEASED: 'PRE_MUNICH_APPEASED',
  /** London chose to stand with Prague. */
  PRE_MUNICH_STAND: 'PRE_MUNICH_STAND',
  /** Moscow publicly offered collective action over Czechoslovakia. */
  PRE_SOV_OFFER_CZE: 'PRE_SOV_OFFER_CZE',
  /** Germany extinguished rump Czechoslovakia (annexed or puppeted). */
  PRE_PRAGUE_SEIZED: 'PRE_PRAGUE_SEIZED',
  /** Germany delivered the Memel ultimatum to Lithuania. */
  PRE_MEMEL_DEMAND: 'PRE_MEMEL_DEMAND',
  /** Lithuania signed the Memel cession. */
  PRE_MEMEL_CEDED: 'PRE_MEMEL_CEDED',
  /** Italy delivered the ultimatum to Tirana. */
  PRE_ALBANIA_ULTIMATUM: 'PRE_ALBANIA_ULTIMATUM',
  /** Germany formally demanded Danzig and the Corridor route. */
  PRE_DANZIG_DEMAND: 'PRE_DANZIG_DEMAND',
  /** The Danzig demand was framed as a bargain, not an ultimatum. */
  PRE_DANZIG_SOFT: 'PRE_DANZIG_SOFT',
  /** Britain opened serious military talks with Moscow. */
  PRE_ANGLO_SOVIET_TALKS: 'PRE_ANGLO_SOVIET_TALKS',
  /** The Anglo-Franco-Soviet convention was signed (M-R declined). */
  PRE_TRIPLE_ENTENTE: 'PRE_TRIPLE_ENTENTE',
  /** Moscow summoned the Finnish delegation with territorial demands. */
  PRE_SOV_DEMANDS_FIN: 'PRE_SOV_DEMANDS_FIN',
  /** Finland ceded the Isthmus ground without war. */
  PRE_FIN_CONCEDED: 'PRE_FIN_CONCEDED',
  /** Case White executed: Germany invaded Poland. */
  PRE_CASE_WHITE: 'PRE_CASE_WHITE',
} as const;

const PF = PREWAR_FLAGS;

export const PREWAR_EVENTS: GameEvent[] = [
  // -------------------------------------------------------------------------
  // Anschluss
  // -------------------------------------------------------------------------
  {
    id: 'pre-anschluss',
    title: 'The Austrian Question',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'AUS' },
        { t: 'alive', nation: 'GER' },
        { t: 'not', c: { t: 'atWar', a: 'GER' } },
        { t: 'strengthRatio', a: 'GER', b: 'AUS', atLeast: 3 },
        { t: 'turnAtLeast', n: 1 },
      ],
    },
    once: true,
    priority: 8,
    text:
      'Berchtesgaden, February 1938. Chancellor Schuschnigg has been received at the Berghof and shown the military maps. The Austrian National Socialists hold portfolios in Vienna already; Seyss-Inquart sits at the Interior Ministry with control of the police. Paris is between governments. London signals that no one will march for Austria. Rome, once Vienna’s protector, is absorbed elsewhere. General Keitel reports the frontier divisions can move within forty-eight hours of the order. The staff memorandum before the Chancellery poses the question plainly: union now, by pressure or by force, or a longer game of erosion from within.',
    choices: [
      {
        label: 'Demand union now',
        detail: 'Present Vienna with terms no sovereign government could accept, and move if they refuse.',
        effects: [
          { t: 'flag', key: PF.PRE_ANSCHLUSS_DEMAND, value: true },
          { t: 'tension', delta: 2 },
          { t: 'relations', a: 'GER', b: 'AUS', delta: -20 },
          {
            t: 'report', to: 'AUS', kind: 'diplomatic', title: 'Berlin’s terms harden',
            body: 'The German government demands the cancellation of the plebiscite and the surrender of the chancellorship. An answer is expected within days.',
          },
        ],
        aiWeight: 5,
      },
      {
        label: 'Erode from within',
        detail: 'Money, marches, and the Austrian party. Take the country without alarming London.',
        effects: [
          { t: 'spyNetwork', owner: 'GER', target: 'AUS', delta: 20 },
          { t: 'stability', nation: 'AUS', delta: -10 },
          { t: 'relations', a: 'GER', b: 'AUS', delta: -10 },
          { t: 'queueEvent', id: 'pre-anschluss-vienna', delay: 3 },
        ],
        aiWeight: 2,
      },
      {
        label: 'Let Austria stand',
        detail: 'The union can wait for a government that wants it. Germany has other business.',
        available: { t: 'not', c: { t: 'leaderIs', nation: 'GER', leader: 'hitler' } },
        effects: [
          { t: 'relations', a: 'GER', b: 'AUS', delta: 15 },
          { t: 'relations', a: 'GER', b: 'UK', delta: 10 },
          { t: 'tension', delta: -2 },
          { t: 'chronicle', text: 'Berlin set the Austrian question aside. The union of 1938 did not take place.', divergence: true },
        ],
        aiWeight: 2,
      },
    ],
  },
  {
    id: 'pre-anschluss-vienna',
    title: 'Ultimatum in Vienna',
    nation: 'AUS',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: PF.PRE_ANSCHLUSS_DEMAND },
        { t: 'alive', nation: 'AUS' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'AUS' } },
      ],
    },
    once: true,
    priority: 9,
    text:
      'Vienna, the Ballhausplatz. Berlin’s terms arrived overnight: the plebiscite is to be cancelled, the Chancellor is to stand aside, and the government is to pass to men Berlin has named. General staff assessment: the Bundesheer can field perhaps one soldier for every eight the Reich can bring, with no promise of a single foreign division in support. Rome has not answered the last three telegrams. London expresses sympathy and nothing else. The cabinet must answer by morning. Whatever is decided, the country will wake to a different Austria.',
    choices: [
      {
        label: 'Stand aside',
        detail: 'Spare the army a hopeless fight. Let the occupation proceed unopposed.',
        effects: [
          { t: 'annex', nation: 'AUS', by: 'GER' },
          { t: 'flag', key: FLAGS.ANSCHLUSS_DONE, value: true },
          { t: 'relations', a: 'GER', b: 'UK', delta: -10 },
          { t: 'relations', a: 'GER', b: 'FRA', delta: -10 },
          { t: 'chronicle', text: 'German columns crossed the Austrian frontier without resistance. Austria ceased to exist as a state.' },
          {
            t: 'report', to: 'CZE', kind: 'diplomatic', title: 'Vienna has fallen without a shot',
            body: 'The German army entered Austria unopposed. Czechoslovakia is now flanked from the south as well as the north and west.',
          },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'Austria annexed',
            body: 'The Austrian government yielded to a German ultimatum. No power moved to prevent the annexation.',
          },
        ],
        aiWeight: 5,
      },
      {
        label: 'Protest to every chancellery, then yield',
        detail: 'Submission under formal protest. Put Berlin’s methods on the record for the world to read.',
        effects: [
          { t: 'annex', nation: 'AUS', by: 'GER' },
          { t: 'flag', key: FLAGS.ANSCHLUSS_DONE, value: true },
          { t: 'relations', a: 'GER', b: 'UK', delta: -20 },
          { t: 'relations', a: 'GER', b: 'FRA', delta: -20 },
          { t: 'relations', a: 'GER', b: 'ITA', delta: -10 },
          { t: 'tension', delta: 1 },
          { t: 'chronicle', text: 'Austria was annexed under protest lodged in every capital that would receive it.' },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'Vienna’s protest note',
            body: 'Austria submitted to German occupation under formal protest, circulated to all League signatories.',
          },
        ],
        aiWeight: 2,
      },
      {
        label: 'Cancel nothing. Resist.',
        detail: 'Hold the plebiscite, man the passes, and make Berlin take the country by force.',
        available: { t: 'isPlayer', nation: 'AUS' },
        effects: [
          { t: 'declareWar', attacker: 'GER', defender: 'AUS' },
          { t: 'flag', key: PF.PRE_AUSTRIA_RESISTS, value: true },
          { t: 'warSupport', nation: 'AUS', delta: 20 },
          { t: 'stability', nation: 'AUS', delta: 5 },
          { t: 'relations', a: 'AUS', b: 'UK', delta: 10 },
          { t: 'relations', a: 'AUS', b: 'FRA', delta: 10 },
          { t: 'relations', a: 'AUS', b: 'CZE', delta: 15 },
          { t: 'chronicle', text: 'Austria answered the ultimatum with mobilization. The first shots of the European crisis were fired on the Inn.', divergence: true },
          {
            t: 'report', to: 'CZE', kind: 'front', title: 'Fighting in Austria',
            body: 'The Austrian army is resisting the German invasion. The southern flank of Bohemia is, for the moment, a battlefield rather than a German salient.',
          },
        ],
        aiWeight: 1,
      },
    ],
  },
  {
    id: 'pre-western-rearmament',
    title: 'The Air Estimates',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'or', c: [{ t: 'flag', key: FLAGS.ANSCHLUSS_DONE }, { t: 'flag', key: PF.PRE_AUSTRIA_RESISTS }] },
        { t: 'alive', nation: 'UK' },
        { t: 'alive', nation: 'GER' },
      ],
    },
    once: true,
    priority: 5,
    text:
      'London. The Cabinet takes up the defence estimates in the shadow of events in Austria. The Chiefs of Staff paper is blunt: the Luftwaffe’s first-line strength is growing faster than Fighter Command’s, and the radar chain covers the Estuary and little else. The Treasury warns that rearmament at the pace proposed means borrowing on a war footing in peacetime. The Foreign Office adds that visible acceleration may harden Berlin. The question before ministers is the pace of preparation, not the fact of it.',
    choices: [
      {
        label: 'Accelerate the air programme',
        detail: 'Fighters, the radar chain, the shadow factories. Buy time in the only currency that counts.',
        effects: [
          { t: 'air', nation: 'UK', delta: 60 },
          { t: 'stability', nation: 'UK', delta: -3 },
          { t: 'relations', a: 'GER', b: 'UK', delta: -5 },
        ],
        aiWeight: 4,
      },
      {
        label: 'Balanced rearmament',
        detail: 'The air estimate rises, the naval estimate rises, and the Treasury keeps its seat at the table.',
        effects: [
          { t: 'air', nation: 'UK', delta: 25 },
          { t: 'navy', nation: 'UK', delta: 25 },
          { t: 'stability', nation: 'UK', delta: -2 },
        ],
        aiWeight: 2,
      },
      {
        label: 'Finance is the fourth arm of defence',
        detail: 'A long war is won by the solvent. Hold spending, husband the reserves, negotiate from strength later.',
        effects: [{ t: 'stability', nation: 'UK', delta: 3 }],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Munich, three stages: Berlin demands, London decides, Prague answers.
  // Outcome flags: MUNICH_CONCEDED or MUNICH_WAR.
  // -------------------------------------------------------------------------
  {
    id: 'pre-munich-demand',
    title: 'The Sudeten Question',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'CZE' },
        { t: 'alive', nation: 'GER' },
        { t: 'not', c: { t: 'atWar', a: 'GER' } },
        { t: 'or', c: [{ t: 'flag', key: FLAGS.ANSCHLUSS_DONE }, { t: 'controls', nation: 'GER', region: 'aus-austria' }] },
        { t: 'turnAtLeast', n: 6 },
      ],
    },
    once: true,
    priority: 8,
    text:
      'The Sudeten German Party reports its instructions executed: demands presented at Karlsbad that Prague cannot grant and cannot refuse. Henlein asks for guidance. The General Staff’s study for Case Green lies on the table, war against Czechoslovakia, with the Bohemian fortifications rated the strongest in Europe after the Maginot Line and the French bound to Prague by treaty. Vienna’s incorporation has turned the Czech flank. The question is what to demand aloud, and whether the Western powers will carry Prague’s burden or set it down.',
    choices: [
      {
        label: 'Demand the Sudetenland',
        detail: 'The border districts, on self-determination grounds the West will find awkward to refuse.',
        effects: [
          { t: 'flag', key: PF.PRE_MUNICH_DEMAND, value: true },
          { t: 'tension', delta: 2 },
          { t: 'relations', a: 'GER', b: 'CZE', delta: -20 },
          { t: 'relations', a: 'GER', b: 'UK', delta: -10 },
          {
            t: 'report', to: 'CZE', kind: 'diplomatic', title: 'Berlin demands the border districts',
            body: 'Germany has formally demanded the cession of the Sudetenland. The fortress line lies almost entirely within the demanded zone.',
          },
        ],
        aiWeight: 10,
      },
      {
        label: 'Demand the dissolution of Czechoslovakia',
        detail: 'No half-measures. The state itself is the obstacle; say so and let the West choke on it.',
        effects: [
          { t: 'flag', key: PF.PRE_MUNICH_DEMAND, value: true },
          { t: 'flag', key: PF.PRE_MUNICH_TOTAL, value: true },
          { t: 'tension', delta: 4 },
          { t: 'relations', a: 'GER', b: 'CZE', delta: -30 },
          { t: 'relations', a: 'GER', b: 'UK', delta: -20 },
          { t: 'relations', a: 'GER', b: 'FRA', delta: -20 },
          {
            t: 'report', to: 'CZE', kind: 'diplomatic', title: 'Berlin demands everything',
            body: 'The German note does not stop at the border districts. It questions the existence of the Czechoslovak state itself.',
          },
        ],
        aiWeight: 1,
      },
      {
        label: 'Press grievances, not ultimata',
        detail: 'Keep the agitation warm and the army out of it. The fruit may fall unshaken.',
        effects: [
          { t: 'relations', a: 'GER', b: 'CZE', delta: -5 },
          { t: 'spyNetwork', owner: 'GER', target: 'CZE', delta: 10 },
          { t: 'chronicle', text: 'Berlin kept the Sudeten agitation at a simmer through 1938. The Munich crisis did not come.', divergence: true },
        ],
        aiWeight: 1,
      },
    ],
  },
  {
    id: 'pre-soviet-offer',
    title: 'Litvinov’s Proposal',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: PF.PRE_MUNICH_DEMAND },
        { t: 'alive', nation: 'CZE' },
        { t: 'alive', nation: 'SOV' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'SOV' } },
        { t: 'eventNotFired', id: 'pre-munich-prague' },
      ],
    },
    once: true,
    priority: 6,
    text:
      'Moscow. Comrade Litvinov places before the Politburo a draft note proposing immediate staff consultations with France and Czechoslovakia under the 1935 treaties. The obstacles are recorded without comment: Poland and Romania refuse passage to the Red Army, the French have not answered the last proposal, and the officer corps is two years into its purge. Voroshilov certifies ninety rifle divisions available on paper. The alternative course is silence, and whatever price the capitalist powers pay each other at Prague’s expense.',
    choices: [
      {
        label: 'Propose collective action',
        detail: 'Publish the offer. If the West refuses it, let the refusal be on the record.',
        effects: [
          { t: 'flag', key: PF.PRE_SOV_OFFER_CZE, value: true },
          { t: 'relations', a: 'SOV', b: 'CZE', delta: 15 },
          { t: 'relations', a: 'SOV', b: 'FRA', delta: 10 },
          { t: 'relations', a: 'SOV', b: 'UK', delta: 5 },
          {
            t: 'report', to: 'CZE', kind: 'diplomatic', title: 'Moscow declares readiness',
            body: 'The Soviet government states it will honour the 1935 treaty if France honours hers, and proposes immediate staff talks.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Say nothing',
        detail: 'The Union owes nothing to a coalition that will not have it. Watch, and arm.',
        effects: [
          { t: 'relations', a: 'GER', b: 'SOV', delta: 5 },
          { t: 'chronicle', text: 'Moscow watched the Czech crisis in silence.', divergence: true },
        ],
        aiWeight: 1,
      },
    ],
  },
  {
    id: 'pre-munich-london',
    title: 'A Faraway Country',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: PF.PRE_MUNICH_DEMAND },
        { t: 'alive', nation: 'CZE' },
        { t: 'alive', nation: 'UK' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'CZE' } },
      ],
    },
    once: true,
    priority: 9,
    text:
      'Downing Street, September. Three flights to Germany have narrowed the matter to this: Berlin will have the Sudeten districts by agreement within the week or take them by war. Paris says it will honour its treaty if Britain marches, and privately begs Britain not to. The Chiefs of Staff estimate the Luftwaffe could deliver blows on London for which no defence yet exists. Trenches are being dug in the parks, gas masks issued to schoolchildren. Prague has mobilized and waits on word from the West.',
    choices: [
      {
        label: 'Concede at Munich',
        detail: 'A conference, a settlement, and the border districts transferred on a timetable. Peace, for a term of years unknown.',
        available: { t: 'not', c: { t: 'flag', key: PF.PRE_MUNICH_TOTAL } },
        effects: [
          { t: 'flag', key: PF.PRE_MUNICH_APPEASED, value: true },
          { t: 'relations', a: 'UK', b: 'GER', delta: 5 },
          { t: 'relations', a: 'UK', b: 'CZE', delta: -15 },
          { t: 'relations', a: 'FRA', b: 'CZE', delta: -15 },
          {
            t: 'report', to: 'CZE', kind: 'diplomatic', title: 'The West will not fight for the Sudetenland',
            body: 'Britain and France have accepted the substance of the German demand. Prague is advised to comply with the transfer.',
          },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'London chooses conference',
            body: 'The British government proposes a four-power meeting to settle the transfer of the Sudeten districts.',
          },
        ],
        aiWeight: 7,
      },
      {
        label: 'Stand with Prague',
        detail: 'Tell Berlin that an attack on Czechoslovakia means a general war, and mean it.',
        effects: [
          { t: 'flag', key: PF.PRE_MUNICH_STAND, value: true },
          { t: 'guarantee', by: 'UK', of: 'CZE' },
          { t: 'guarantee', by: 'FRA', of: 'CZE' },
          { t: 'tension', delta: 3 },
          { t: 'relations', a: 'UK', b: 'CZE', delta: 20 },
          { t: 'relations', a: 'FRA', b: 'CZE', delta: 15 },
          { t: 'relations', a: 'GER', b: 'UK', delta: -15 },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'London draws the line',
            body: 'Britain and France have jointly guaranteed Czechoslovakia. An attack on the Czech state will be answered as an attack on the West.',
          },
          {
            t: 'report', to: 'CZE', kind: 'diplomatic', title: 'The West stands',
            body: 'Britain and France have publicly committed to Czechoslovakia’s defence.',
          },
        ],
        aiWeight: 1,
      },
    ],
  },
  {
    id: 'pre-munich-prague',
    title: 'The Answer from Prague',
    nation: 'CZE',
    fires: {
      t: 'and',
      c: [
        { t: 'or', c: [{ t: 'flag', key: PF.PRE_MUNICH_APPEASED }, { t: 'flag', key: PF.PRE_MUNICH_STAND }] },
        { t: 'alive', nation: 'CZE' },
        { t: 'alive', nation: 'GER' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'CZE' } },
      ],
    },
    once: true,
    priority: 9,
    text:
      'The Hradčany, night session. The army is mobilized and the border fortifications manned; the generals report the troops steady and the works strong, though the demanded zone would include nearly all of them. The Western position has been communicated and admits no misreading. President Beneš has the final say. To submit is to hand over the frontier belt, the fortress line, and a third of the state’s industry on Germany’s schedule. To refuse is war, on terms the map of alliances will decide.',
    choices: [
      {
        label: 'Submit to the settlement',
        detail: 'Sign, cede the districts, and preserve the state that remains. History may call it prudence.',
        available: { t: 'flag', key: PF.PRE_MUNICH_APPEASED },
        effects: [
          { t: 'cedeRegion', region: 'cze-sudetenland', to: 'GER' },
          { t: 'flag', key: FLAGS.MUNICH_CONCEDED, value: true },
          { t: 'stability', nation: 'CZE', delta: -15 },
          { t: 'warSupport', nation: 'CZE', delta: -20 },
          { t: 'relations', a: 'CZE', b: 'UK', delta: -10 },
          { t: 'relations', a: 'CZE', b: 'FRA', delta: -15 },
          { t: 'chronicle', text: 'Czechoslovakia ceded the Sudetenland under the Munich settlement. The fortress line passed to Germany without a shot.' },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'Prague complies',
            body: 'The Czechoslovak government has accepted the transfer of the Sudeten districts under the four-power settlement.',
          },
          {
            t: 'report', to: 'POL', kind: 'diplomatic', title: 'The Munich precedent',
            body: 'Czechoslovakia has ceded territory under threat, with the Western powers presiding. The method has now been demonstrated.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Fight alone',
        detail: 'The fortifications were built to be used. If the West will not come, the army will still fight.',
        available: { t: 'flag', key: PF.PRE_MUNICH_APPEASED },
        effects: [
          { t: 'declareWar', attacker: 'GER', defender: 'CZE' },
          { t: 'flag', key: FLAGS.MUNICH_WAR, value: true },
          { t: 'warSupport', nation: 'CZE', delta: 15 },
          { t: 'chronicle', text: 'Abandoned at Munich, Czechoslovakia chose to fight. The war of 1938 began in the Bohemian forest.', divergence: true },
          {
            t: 'report', to: 'UK', kind: 'front', title: 'Prague refuses',
            body: 'Czechoslovakia has rejected the settlement and is at war with Germany, without Western support.',
          },
          {
            t: 'report', to: 'SOV', kind: 'front', title: 'War in Bohemia',
            body: 'Germany has attacked Czechoslovakia. The Western powers stand aside.',
          },
        ],
        aiWeight: 1,
      },
      {
        label: 'Refuse, with the West at our backs',
        detail: 'The guarantee is signed. If Berlin marches now, it marches into a general war.',
        available: { t: 'flag', key: PF.PRE_MUNICH_STAND },
        effects: [
          { t: 'declareWar', attacker: 'GER', defender: 'CZE' },
          { t: 'declareWar', attacker: 'GER', defender: 'UK' },
          { t: 'declareWar', attacker: 'GER', defender: 'FRA' },
          { t: 'flag', key: FLAGS.MUNICH_WAR, value: true },
          { t: 'warSupport', nation: 'CZE', delta: 20 },
          { t: 'chronicle', text: 'The powers stood at Munich and Germany struck regardless. The European war began in the autumn of 1938.', divergence: true },
          {
            t: 'report', to: 'SOV', kind: 'front', title: 'General war in Europe',
            body: 'Germany is at war with Czechoslovakia, Britain, and France. The Czech fortress line is holding as of this report.',
          },
          {
            t: 'report', to: 'ITA', kind: 'diplomatic', title: 'Berlin calls in its friendships',
            body: 'Germany is at war with the Western powers over Czechoslovakia and looks to Rome for support.',
          },
        ],
        aiWeight: 4,
      },
    ],
  },
  {
    id: 'pre-prague-seized',
    title: 'The Rump State',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.MUNICH_CONCEDED },
        { t: 'alive', nation: 'CZE' },
        { t: 'not', c: { t: 'atWar', a: 'GER' } },
        { t: 'turnAtLeast', n: 12 },
      ],
    },
    once: true,
    priority: 7,
    text:
      'Prague’s fortifications stand inside the Reich frontier now; what remains of Czechoslovakia is a state without a rampart. The Slovak autonomists are prepared to declare independence on a signal from Berlin, furnishing the occasion. The aged President Hácha can be summoned and pressed through the night. The military occupation would take a morning and cost nothing. Against this the Foreign Ministry notes one entry in the ledger: the Munich signature is six months old, and marching on Prague spends what remains of it in a single stroke.',
    choices: [
      {
        label: 'March into Prague',
        detail: 'Bohemia and Moravia into the Reich, Slovakia a client. The Munich paper has served its purpose.',
        effects: [
          { t: 'annex', nation: 'CZE', by: 'GER' },
          { t: 'flag', key: PF.PRE_PRAGUE_SEIZED, value: true },
          { t: 'relations', a: 'GER', b: 'UK', delta: -25 },
          { t: 'relations', a: 'GER', b: 'FRA', delta: -20 },
          { t: 'relations', a: 'GER', b: 'POL', delta: -10 },
          { t: 'relations', a: 'GER', b: 'SOV', delta: -10 },
          { t: 'tension', delta: 3 },
          { t: 'chronicle', text: 'German troops occupied Prague. The Munich settlement was dead within half a year of its signing.' },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'Prague occupied',
            body: 'Germany has extinguished the Czech state in violation of the Munich settlement. No claim of self-determination covers this.',
          },
          {
            t: 'report', to: 'POL', kind: 'intel', title: 'The Wehrmacht on three sides',
            body: 'With Bohemia occupied and Slovakia a German client, Poland’s southern frontier is now a German military boundary.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'A protectorate by treaty',
        detail: 'Press Hácha to sign. The same result on paper that reads better in London.',
        effects: [
          { t: 'puppet', nation: 'CZE', by: 'GER' },
          { t: 'flag', key: PF.PRE_PRAGUE_SEIZED, value: true },
          { t: 'relations', a: 'GER', b: 'UK', delta: -15 },
          { t: 'relations', a: 'GER', b: 'FRA', delta: -12 },
          { t: 'tension', delta: 2 },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'Prague signs under duress',
            body: 'The Czech president has placed his country under German protection. The signature was obtained overnight, under pressure not concealed.',
          },
        ],
        aiWeight: 2,
      },
      {
        label: 'Honour the settlement',
        detail: 'The Sudetenland was the claim; the claim is satisfied. Keep the signature worth something.',
        available: { t: 'not', c: { t: 'leaderIs', nation: 'GER', leader: 'hitler' } },
        effects: [
          { t: 'relations', a: 'GER', b: 'UK', delta: 10 },
          { t: 'relations', a: 'GER', b: 'FRA', delta: 5 },
          { t: 'tension', delta: -2 },
          { t: 'chronicle', text: 'Germany held to the Munich line. The rump Czech state lived on in the Reich’s shadow.', divergence: true },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Pact of Steel
  // -------------------------------------------------------------------------
  {
    id: 'pre-pact-of-steel',
    title: 'The Pact of Steel',
    nation: 'ITA',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'ITA' },
        { t: 'alive', nation: 'GER' },
        { t: 'faction', nation: 'GER', is: 'axis' },
        { t: 'relations', a: 'GER', b: 'ITA', atLeast: 45 },
        { t: 'or', c: [{ t: 'flag', key: FLAGS.ANSCHLUSS_DONE }, { t: 'tension', atLeast: 30 }] },
        { t: 'turnAtLeast', n: 10 },
      ],
    },
    once: true,
    priority: 6,
    text:
      'Rome. Count Ciano lays the draft before the Duce. It is a soldier’s treaty, not a diplomat’s: each party pledges to join the other’s wars immediately and with all forces, no reservations, no consultation clause with teeth. The Germans pressed for it and drafted most of it. The service ministries repeat their standing estimate that Italy cannot sustain a general war before 1943, an estimate the Germans have heard and noted. Berlin gives verbal assurances that peace will hold for three years. Nothing binds them to it.',
    choices: [
      {
        label: 'Sign the Pact of Steel',
        detail: 'Bind the two revolutions together. The risk is Germany’s timetable; the reward is Germany’s weight.',
        effects: [
          { t: 'pact', a: 'GER', b: 'ITA', kind: 'alliance' },
          { t: 'flag', key: FLAGS.PACT_STEEL, value: true },
          { t: 'relations', a: 'GER', b: 'ITA', delta: 15 },
          { t: 'tension', delta: 2 },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'Rome and Berlin sign a military alliance',
            body: 'The published text obliges each power to enter the other’s wars with all forces, immediately and without condition.',
          },
          {
            t: 'report', to: 'FRA', kind: 'diplomatic', title: 'The Axis becomes a treaty',
            body: 'Italy has bound itself to Germany by full military alliance. French planning must now assume a two-front Mediterranean.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'A political accord only',
        detail: 'Friendship on paper, consultations, and the hands kept free. Sign nothing that marches.',
        effects: [{ t: 'relations', a: 'GER', b: 'ITA', delta: 5 }],
        aiWeight: 2,
      },
      {
        label: 'Reopen the road to London',
        detail: 'The Easter accords showed the English will pay for Italian neutrality. Find out how much.',
        effects: [
          { t: 'relations', a: 'ITA', b: 'UK', delta: 15 },
          { t: 'relations', a: 'GER', b: 'ITA', delta: -15 },
          { t: 'chronicle', text: 'Rome declined Berlin’s treaty and kept its windows open to the West.', divergence: true },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Memel
  // -------------------------------------------------------------------------
  {
    id: 'pre-memel',
    title: 'The Memel Ultimatum',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'LIT' },
        { t: 'alive', nation: 'GER' },
        { t: 'not', c: { t: 'atWar', a: 'GER' } },
        { t: 'or', c: [{ t: 'flag', key: FLAGS.MUNICH_CONCEDED }, { t: 'flag', key: PF.PRE_PRAGUE_SEIZED }] },
        { t: 'relations', a: 'GER', b: 'LIT', below: 0 },
        { t: 'turnAtLeast', n: 13 },
      ],
    },
    once: true,
    priority: 4,
    text:
      'The Memel territory, detached from Germany in 1919 and held by Lithuania since 1923, returns to the agenda. The German population of the port is organized and expectant. Kaunas has no ally to call on: Warsaw is estranged over Vilnius, Moscow distant, the Convention signatories silent since Munich. A naval squadron can stand off the harbour within the week. The Foreign Ministry drafts two sentences: the territory returns at once, or the government of Lithuania bears the consequences alone.',
    choices: [
      {
        label: 'Deliver it',
        detail: 'A small demand, cleanly made, against a country with no friends. The port returns.',
        effects: [
          { t: 'flag', key: PF.PRE_MEMEL_DEMAND, value: true },
          { t: 'tension', delta: 2 },
          { t: 'relations', a: 'GER', b: 'LIT', delta: -15 },
          {
            t: 'report', to: 'POL', kind: 'intel', title: 'Ultimatum to Kaunas',
            body: 'Germany has demanded the immediate return of the Memel territory from Lithuania. The Baltic coast is being redrawn by note verbale.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Leave the port for now',
        detail: 'The larger questions come first. Memel will keep.',
        effects: [
          { t: 'relations', a: 'GER', b: 'LIT', delta: 5 },
          { t: 'chronicle', text: 'The Memel demand was never sent.', divergence: true },
        ],
        aiWeight: 1,
      },
    ],
  },
  {
    id: 'pre-memel-kaunas',
    title: 'Answer from Kaunas',
    nation: 'LIT',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: PF.PRE_MEMEL_DEMAND },
        { t: 'alive', nation: 'LIT' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'LIT' } },
      ],
    },
    once: true,
    priority: 5,
    text:
      'Kaunas. Foreign Minister Urbšys, called to Berlin, has heard the terms in a single sitting: sign over the Memel territory now or the matter passes to the military. The port is the country’s one outlet to the sea and a fifth of its customs revenue. The army staff reports that mobilization would be a gesture, nothing more. No answer has come from any capital that was asked. The cabinet convenes at midnight with a draft treaty of cession on the table and a train waiting.',
    choices: [
      {
        label: 'Sign the cession',
        detail: 'The port for the peace. A small state’s arithmetic admits no other sum.',
        effects: [
          { t: 'flag', key: PF.PRE_MEMEL_CEDED, value: true },
          { t: 'ic', nation: 'LIT', delta: -2 },
          { t: 'ic', nation: 'GER', delta: 2 },
          { t: 'stability', nation: 'LIT', delta: -10 },
          { t: 'relations', a: 'GER', b: 'LIT', delta: 10 },
          { t: 'chronicle', text: 'Lithuania ceded Memel under ultimatum. The Baltic capitals took note.' },
          {
            t: 'report', to: 'EST', kind: 'diplomatic', title: 'Memel ceded',
            body: 'Lithuania has surrendered its port to Germany under threat. The precedent for the Baltic states is not lost on anyone.',
          },
          {
            t: 'report', to: 'LAT', kind: 'diplomatic', title: 'Memel ceded',
            body: 'Lithuania has surrendered its port to Germany under threat. The precedent for the Baltic states is not lost on anyone.',
          },
        ],
        aiWeight: 5,
      },
      {
        label: 'Refuse',
        detail: 'Mobilize the army and let the powers watch a small country say no.',
        available: { t: 'isPlayer', nation: 'LIT' },
        effects: [
          { t: 'declareWar', attacker: 'GER', defender: 'LIT' },
          { t: 'warSupport', nation: 'LIT', delta: 15 },
          { t: 'chronicle', text: 'Lithuania refused the Memel ultimatum, alone.', divergence: true },
          {
            t: 'report', to: 'POL', kind: 'front', title: 'War on the Baltic',
            body: 'Lithuania has refused the German ultimatum and is at war. The fighting is expected to be brief and one-sided.',
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Albania
  // -------------------------------------------------------------------------
  {
    id: 'pre-albania',
    title: 'Good Friday',
    nation: 'ITA',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'ALB' },
        { t: 'alive', nation: 'ITA' },
        { t: 'not', c: { t: 'atWar', a: 'ITA' } },
        { t: 'or', c: [{ t: 'flag', key: PF.PRE_PRAGUE_SEIZED }, { t: 'flag', key: FLAGS.MUNICH_WAR }, { t: 'tension', atLeast: 30 }] },
        { t: 'strengthRatio', a: 'ITA', b: 'ALB', atLeast: 3 },
        { t: 'turnAtLeast', n: 12 },
      ],
    },
    once: true,
    priority: 6,
    text:
      'Rome. The Albanian file returns to the Duce’s desk. King Zog rules on Italian loans he cannot repay, with an army Italian officers train and Italian companies supply. Ciano’s plan is complete: an ultimatum on personal union, and if it is refused, landings at Durazzo, Valona, and Santi Quaranta with the fleet in support. The prestige argument is written in the margin: Germany has taken two capitals in a year and consulted Rome on neither. Empire, the file observes, is taken, not granted.',
    choices: [
      {
        label: 'Present the ultimatum',
        detail: 'Union of the crowns, garrisons at the ports, and an answer within the week.',
        effects: [
          { t: 'flag', key: PF.PRE_ALBANIA_ULTIMATUM, value: true },
          { t: 'tension', delta: 2 },
          { t: 'relations', a: 'ITA', b: 'ALB', delta: -20 },
          {
            t: 'report', to: 'GRE', kind: 'diplomatic', title: 'Italian terms in Tirana',
            body: 'Italy has presented Albania with an ultimatum on union. An Italian army across the strait of Otranto changes Greece’s northern frontier.',
          },
          {
            t: 'report', to: 'YUG', kind: 'diplomatic', title: 'Italian terms in Tirana',
            body: 'Italy demands the Albanian crown. An Italian garrison at Durazzo would put Rome on Yugoslavia’s southern border.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Keep the king in our debt',
        detail: 'A creditor owns more than an occupier holds. Renew the loans; deepen the leverage.',
        effects: [
          { t: 'relations', a: 'ITA', b: 'ALB', delta: 10 },
          { t: 'spyNetwork', owner: 'ITA', target: 'ALB', delta: 15 },
          { t: 'chronicle', text: 'Rome preferred the invoice to the invasion. Albania kept its king.', divergence: true },
        ],
        aiWeight: 1,
      },
    ],
  },
  {
    id: 'pre-albania-tirana',
    title: 'The King’s Answer',
    nation: 'ALB',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: PF.PRE_ALBANIA_ULTIMATUM },
        { t: 'alive', nation: 'ALB' },
        { t: 'not', c: { t: 'atWar', a: 'ITA', b: 'ALB' } },
      ],
    },
    once: true,
    priority: 6,
    text:
      'Tirana. The Italian minister has delivered the terms: union of the crowns, garrisons at the ports, and an answer within days. The gendarmerie’s Italian instructors have stopped reporting for duty. The treasury holds a few weeks’ pay. The mountain chiefs promise fighters if the King will arm them, though the arsenals were mortgaged to Rome long ago. Refusal means facing the Italian fleet with a militia. Acceptance means the House of Zogu joins the House of Savoy, as a footnote.',
    choices: [
      {
        label: 'The King departs',
        detail: 'No answer, a sealed car to the Greek frontier, and the country left to the landings.',
        effects: [
          { t: 'annex', nation: 'ALB', by: 'ITA' },
          { t: 'relations', a: 'ITA', b: 'GRE', delta: -15 },
          { t: 'relations', a: 'ITA', b: 'YUG', delta: -10 },
          { t: 'relations', a: 'ITA', b: 'UK', delta: -10 },
          { t: 'chronicle', text: 'Italian troops landed at Durazzo. King Zog crossed into Greece with what the treasury still held.' },
          {
            t: 'report', to: 'GRE', kind: 'front', title: 'Italy holds Albania',
            body: 'Italian forces have occupied Albania against scattered resistance. The Italian army now stands on the Greek frontier.',
          },
        ],
        aiWeight: 5,
      },
      {
        label: 'Arm the mountains',
        detail: 'Refuse, distribute what rifles remain, and make the landings cost something.',
        available: { t: 'isPlayer', nation: 'ALB' },
        effects: [
          { t: 'declareWar', attacker: 'ITA', defender: 'ALB' },
          { t: 'warSupport', nation: 'ALB', delta: 20 },
          { t: 'chronicle', text: 'Albania fought.', divergence: true },
          {
            t: 'report', to: 'GRE', kind: 'front', title: 'Fighting at Durazzo',
            body: 'Albania has refused the Italian ultimatum and is resisting the landings.',
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Danzig chain: demand → Warsaw's answer → guarantee → Case White.
  // Outcome flags: POLAND_STANDS or DANZIG_CONCEDED.
  // -------------------------------------------------------------------------
  {
    id: 'pre-danzig-demand',
    title: 'Danzig and the Corridor',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'POL' },
        { t: 'alive', nation: 'GER' },
        { t: 'not', c: { t: 'atWar', a: 'GER' } },
        { t: 'or', c: [{ t: 'flag', key: PF.PRE_PRAGUE_SEIZED }, { t: 'flag', key: FLAGS.MUNICH_CONCEDED }] },
        { t: 'turnAtLeast', n: 14 },
      ],
    },
    once: true,
    priority: 8,
    text:
      'The Foreign Ministry’s Polish file is ready. The Free City of Danzig, German in population and administration, wants only the word; the League’s commissioner cannot prevent it. The demand as drafted: Danzig returns to the Reich, and an extraterritorial road and rail line crosses the Corridor to East Prussia. In exchange, a guarantee of Poland’s frontiers and an extension of the 1934 declaration. Warsaw has refused softer versions of this three times. The Marshal’s army is large, brave, and a generation out of date. The question is the tone: bargain or ultimatum.',
    choices: [
      {
        label: 'Present it as final',
        detail: 'No more soundings. The demand, the deadline, and the consequences stated plainly.',
        effects: [
          { t: 'flag', key: PF.PRE_DANZIG_DEMAND, value: true },
          { t: 'tension', delta: 2 },
          { t: 'relations', a: 'GER', b: 'POL', delta: -15 },
          {
            t: 'report', to: 'POL', kind: 'diplomatic', title: 'Berlin demands Danzig',
            body: 'Germany demands the return of the Free City and an extraterritorial route across the Corridor, and states the demand is final.',
          },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'The next demand',
            body: 'Germany has presented Poland with terms on Danzig and the Corridor. The pattern of the last eighteen months resumes.',
          },
        ],
        aiWeight: 5,
      },
      {
        label: 'Offer the bargain once more',
        detail: 'Danzig for friendship: frontier guarantees, the 1934 declaration extended, a common line against Moscow.',
        effects: [
          { t: 'flag', key: PF.PRE_DANZIG_DEMAND, value: true },
          { t: 'flag', key: PF.PRE_DANZIG_SOFT, value: true },
          { t: 'tension', delta: 1 },
          { t: 'relations', a: 'GER', b: 'POL', delta: -5 },
          {
            t: 'report', to: 'POL', kind: 'diplomatic', title: 'Berlin’s offer on Danzig',
            body: 'Germany again offers frontier guarantees and an extended non-aggression declaration in exchange for Danzig and a corridor route.',
          },
        ],
        aiWeight: 2,
      },
      {
        label: 'Let Danzig wait a year',
        detail: 'The army wants time and the navy wants years. The Free City is not going anywhere.',
        effects: [
          { t: 'relations', a: 'GER', b: 'POL', delta: 5 },
          { t: 'tension', delta: -1 },
          { t: 'chronicle', text: 'Berlin shelved the Danzig question.', divergence: true },
        ],
        aiWeight: 1,
      },
    ],
  },
  {
    id: 'pre-danzig-warsaw',
    title: 'Warsaw’s Reply',
    nation: 'POL',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: PF.PRE_DANZIG_DEMAND },
        { t: 'alive', nation: 'POL' },
        { t: 'alive', nation: 'GER' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'POL' } },
      ],
    },
    once: true,
    priority: 9,
    text:
      'Warsaw. Colonel Beck reads the German note to the cabinet. The precedents are one year old and need no rehearsal: Austria, then the Sudetenland, then Prague, each concession the preface to the next demand. Against this, the military balance is what it is, and the French answer about an offensive in the west remains a study, not a promise. Beck’s own formula is on the table: Poland may negotiate about Danzig, but it will not take instructions, and it will not be detached from the sea. The reply goes to Berlin in the morning.',
    choices: [
      {
        label: 'Refuse',
        detail: 'There is only one thing in the life of nations without price, and that is honour.',
        effects: [
          { t: 'flag', key: FLAGS.POLAND_STANDS, value: true },
          { t: 'tension', delta: 2 },
          { t: 'warSupport', nation: 'POL', delta: 10 },
          { t: 'relations', a: 'POL', b: 'UK', delta: 10 },
          { t: 'relations', a: 'POL', b: 'FRA', delta: 5 },
          { t: 'relations', a: 'GER', b: 'POL', delta: -15 },
          { t: 'chronicle', text: 'Warsaw rejected the German demands on Danzig and the Corridor.' },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'Warsaw refuses',
            body: 'Poland has rejected the demand in full. The reply forecloses further negotiation on the terms presented.',
          },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'Poland stands',
            body: 'Warsaw has refused the German terms on Danzig. The question of Western support is now immediate.',
          },
        ],
        aiWeight: 5,
      },
      {
        label: 'Concede the Free City',
        detail: 'Danzig was never Polish soil. Trade the symbol, keep the Corridor, and buy a year of German friendship.',
        effects: [
          { t: 'cedeRegion', region: 'pol-danzig', to: 'GER' },
          { t: 'flag', key: FLAGS.DANZIG_CONCEDED, value: true },
          { t: 'stability', nation: 'POL', delta: -12 },
          { t: 'warSupport', nation: 'POL', delta: -15 },
          { t: 'relations', a: 'GER', b: 'POL', delta: 15 },
          { t: 'relations', a: 'POL', b: 'UK', delta: -10 },
          { t: 'chronicle', text: 'Warsaw yielded Danzig without a shot. Every chancellery in Europe drew its own conclusion.', divergence: true },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'Danzig returns',
            body: 'Poland has agreed to the transfer of the Free City. The corridor route remains under discussion.',
          },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'Warsaw yields',
            body: 'Poland has ceded Danzig under German pressure. The method of Munich has claimed another success without a conference.',
          },
        ],
        aiWeight: 1,
      },
    ],
  },
  {
    id: 'pre-uk-guarantee',
    title: 'The Guarantee',
    nation: 'UK',
    fires: {
      t: 'and',
      c: [
        { t: 'or', c: [{ t: 'flag', key: FLAGS.POLAND_STANDS }, { t: 'flag', key: PF.PRE_PRAGUE_SEIZED }] },
        { t: 'not', c: { t: 'flag', key: FLAGS.DANZIG_CONCEDED } },
        { t: 'alive', nation: 'POL' },
        { t: 'alive', nation: 'UK' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'POL' } },
      ],
    },
    once: true,
    priority: 8,
    text:
      'London. The policy of settlement is bankrupt on its own books, and the Cabinet knows which country stands next on the list. The proposal before ministers is without precedent in peacetime: a public undertaking that if Polish independence is clearly threatened and Warsaw resists, His Majesty’s Government will lend all support in its power. The Chiefs of Staff observe that no British force can reach Poland; the guarantee’s weight is the threat of general war. Paris will associate itself with whatever London decides. The deterrent is the policy. There is no other.',
    choices: [
      {
        label: 'Issue the guarantee',
        detail: 'A line on the map at last, drawn where the next demand falls.',
        effects: [
          { t: 'guarantee', by: 'UK', of: 'POL' },
          { t: 'guarantee', by: 'FRA', of: 'POL' },
          { t: 'relations', a: 'UK', b: 'POL', delta: 20 },
          { t: 'relations', a: 'FRA', b: 'POL', delta: 10 },
          { t: 'relations', a: 'GER', b: 'UK', delta: -10 },
          { t: 'tension', delta: 3 },
          { t: 'chronicle', text: 'Britain and France publicly guaranteed the independence of Poland.' },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'The Anglo-French guarantee',
            body: 'Britain and France have guaranteed Poland. An attack on Polish independence now carries the stated risk of general war.',
          },
          {
            t: 'report', to: 'POL', kind: 'diplomatic', title: 'The West commits',
            body: 'Britain and France have publicly guaranteed Polish independence.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Guarantee, and court Moscow',
        detail: 'A guarantee without an eastern front is a sentiment. The eastern front is the Red Army.',
        effects: [
          { t: 'guarantee', by: 'UK', of: 'POL' },
          { t: 'guarantee', by: 'FRA', of: 'POL' },
          { t: 'flag', key: PF.PRE_ANGLO_SOVIET_TALKS, value: true },
          { t: 'relations', a: 'UK', b: 'POL', delta: 15 },
          { t: 'relations', a: 'UK', b: 'SOV', delta: 15 },
          { t: 'relations', a: 'FRA', b: 'SOV', delta: 10 },
          { t: 'relations', a: 'GER', b: 'UK', delta: -10 },
          { t: 'tension', delta: 3 },
          {
            t: 'report', to: 'SOV', kind: 'diplomatic', title: 'London proposes staff talks',
            body: 'Britain and France, having guaranteed Poland, propose serious military conversations with the Soviet Union.',
          },
          {
            t: 'report', to: 'GER', kind: 'intel', title: 'Encirclement takes shape',
            body: 'The Western guarantee to Poland is to be backed by Anglo-French military talks in Moscow.',
          },
        ],
        aiWeight: 2,
      },
      {
        label: 'No commitments in the east',
        detail: 'The Empire cannot be pledged to a frontier it cannot reach. Rearm, and keep the hands free.',
        effects: [
          { t: 'relations', a: 'UK', b: 'POL', delta: -10 },
          { t: 'stability', nation: 'POL', delta: -5 },
          { t: 'chronicle', text: 'London declined to underwrite Poland. Warsaw stood alone with its French treaty.', divergence: true },
          {
            t: 'report', to: 'POL', kind: 'diplomatic', title: 'No word from London',
            body: 'The British government will offer sympathy but no guarantee. Poland’s security rests on the French alliance alone.',
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Molotov-Ribbentrop
  // -------------------------------------------------------------------------
  {
    id: 'pre-molotov-ribbentrop',
    title: 'The Telegram from Berlin',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'GER' },
        { t: 'alive', nation: 'SOV' },
        { t: 'alive', nation: 'POL' },
        { t: 'relations', a: 'GER', b: 'SOV', atLeast: -59 },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'SOV' } },
        { t: 'or', c: [{ t: 'flag', key: FLAGS.POLAND_STANDS }, { t: 'tension', atLeast: 45 }] },
        { t: 'turnAtLeast', n: 15 },
      ],
    },
    once: true,
    priority: 9,
    text:
      'Moscow. Two suitors, one summer. The British and French military missions arrived by slow boat with authority to discuss but not to sign, and no answer to the question of passage through Poland. Now Ribbentrop asks to fly to Moscow within the week, with full powers. The German draft offers non-aggression and, in an unpublished protocol, a line drawn through Eastern Europe: spheres of interest, with the Baltic states and eastern Poland falling to the Soviet side. Comrade Stalin observes that the Western powers would happily fight Germany to the last Russian. The Germans, at least, offer payment in advance.',
    choices: [
      {
        label: 'Sign with Berlin',
        detail: 'Non-aggression, trade, and the protocol. Let the capitalist powers exhaust each other first.',
        effects: [
          { t: 'pact', a: 'GER', b: 'SOV', kind: 'nap' },
          { t: 'flag', key: FLAGS.PACT_MR, value: true },
          { t: 'addClaim', nation: 'SOV', region: 'pol-east' },
          { t: 'relations', a: 'GER', b: 'SOV', delta: 50 },
          { t: 'relations', a: 'SOV', b: 'UK', delta: -15 },
          { t: 'relations', a: 'SOV', b: 'FRA', delta: -10 },
          { t: 'tension', delta: 4 },
          { t: 'chronicle', text: 'Berlin and Moscow signed a treaty of non-aggression. Its protocols were not published.' },
          {
            t: 'report', to: 'POL', kind: 'intel', title: 'Berlin and Moscow shake hands',
            body: 'Germany and the Soviet Union have signed a non-aggression treaty. Poland now faces both neighbours without a counterweight between them.',
          },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'The Moscow treaty',
            body: 'The German-Soviet pact removes the eastern front from every Allied calculation. The guarantee to Poland must now be honoured without one.',
          },
          {
            t: 'report', to: 'FRA', kind: 'diplomatic', title: 'The Moscow treaty',
            body: 'Germany has secured its rear. French war planning against a one-front Germany is void as of this morning.',
          },
        ],
        aiWeight: 5,
      },
      {
        label: 'Sign with London and Paris',
        detail: 'The convention, the military annexes, and the passage question forced on Warsaw by its own patrons.',
        available: { t: 'flag', key: PF.PRE_ANGLO_SOVIET_TALKS },
        effects: [
          { t: 'flag', key: PF.PRE_TRIPLE_ENTENTE, value: true },
          { t: 'relations', a: 'SOV', b: 'UK', delta: 25 },
          { t: 'relations', a: 'SOV', b: 'FRA', delta: 20 },
          { t: 'relations', a: 'GER', b: 'SOV', delta: -25 },
          { t: 'guarantee', by: 'SOV', of: 'POL' },
          { t: 'tension', delta: 2 },
          { t: 'chronicle', text: 'An Anglo-Franco-Soviet convention was initialled in Moscow. Germany faced the two-front war entire.', divergence: true },
          {
            t: 'report', to: 'GER', kind: 'intel', title: 'The Moscow convention',
            body: 'Britain, France, and the Soviet Union have concluded a military convention. The encirclement is no longer a phrase.',
          },
          {
            t: 'report', to: 'POL', kind: 'diplomatic', title: 'Moscow joins the guarantors',
            body: 'The Soviet Union has associated itself with the Western guarantee. The terms of Red Army passage remain unsettled.',
          },
        ],
        aiWeight: 3,
      },
      {
        label: 'Sign nothing',
        detail: 'Neither suitor is offering anything the Union cannot take later. Wait.',
        effects: [
          { t: 'relations', a: 'GER', b: 'SOV', delta: -5 },
          { t: 'chronicle', text: 'Moscow kept its own counsel that summer.', divergence: true },
        ],
        aiWeight: 1,
      },
    ],
  },
  {
    id: 'pre-september',
    title: 'Case White',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.POLAND_STANDS },
        { t: 'alive', nation: 'POL' },
        { t: 'alive', nation: 'GER' },
        { t: 'not', c: { t: 'atWar', a: 'GER' } },
        { t: 'or', c: [{ t: 'flag', key: FLAGS.PACT_MR }, { t: 'turnAtLeast', n: 22 }] },
      ],
    },
    once: true,
    priority: 9,
    text:
      'The directive for Case White has been in the army’s hands since spring; the divisions stand ready on three sides of Poland, from Pomerania, East Prussia, and the Slovak ground. The eastern question is settled or it is not, and the staff planning proceeds either way. The Western guarantee is judged at the Chancellery to be a bluff aged past redemption, and if it is not a bluff, the West can be held at the Westwall while Poland is destroyed in weeks. An incident on the frontier can be arranged for the evening papers. The order requires only a date.',
    choices: [
      {
        label: 'Execute Case White',
        detail: 'The date is set. The army group commanders receive the codeword tonight.',
        effects: [
          { t: 'declareWar', attacker: 'GER', defender: 'POL' },
          { t: 'flag', key: PF.PRE_CASE_WHITE, value: true },
          { t: 'chronicle', text: 'At dawn German forces crossed the Polish frontier along its whole length.' },
          {
            t: 'report', to: 'UK', kind: 'front', title: 'Germany invades Poland',
            body: 'German forces have attacked Poland without declaration. The guarantee falls due.',
          },
          {
            t: 'report', to: 'FRA', kind: 'front', title: 'Germany invades Poland',
            body: 'German forces have attacked Poland without declaration. The guarantee falls due.',
          },
          {
            t: 'report', to: 'SOV', kind: 'intel', title: 'Case White begins',
            body: 'Germany has invaded Poland. The timetable for matters east of the demarcation line is now a Soviet decision.',
          },
        ],
        aiWeight: 5,
      },
      {
        label: 'Strangle Danzig first',
        detail: 'A customs war, a garrison coup in the Free City, and the army’s powder kept dry until spring.',
        effects: [
          { t: 'tension', delta: 2 },
          { t: 'relations', a: 'GER', b: 'POL', delta: -10 },
          { t: 'spyNetwork', owner: 'GER', target: 'POL', delta: 10 },
        ],
        aiWeight: 1,
      },
      {
        label: 'Stand down the divisions',
        detail: 'Poland refused, the West has committed, and a two-front war is the general staff’s oldest nightmare.',
        available: { t: 'not', c: { t: 'leaderIs', nation: 'GER', leader: 'hitler' } },
        effects: [
          { t: 'relations', a: 'GER', b: 'UK', delta: 10 },
          { t: 'relations', a: 'GER', b: 'POL', delta: 10 },
          { t: 'tension', delta: -3 },
          { t: 'chronicle', text: 'The order for Case White was never given. The divisions returned to their depots.', divergence: true },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Winter War trigger
  // -------------------------------------------------------------------------
  {
    id: 'pre-winter-war',
    title: 'Demands on Finland',
    nation: 'SOV',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'FIN' },
        { t: 'alive', nation: 'SOV' },
        { t: 'not', c: { t: 'atWar', a: 'SOV', b: 'FIN' } },
        { t: 'or', c: [{ t: 'flag', key: FLAGS.PACT_MR }, { t: 'tension', atLeast: 55 }] },
        { t: 'relations', a: 'SOV', b: 'FIN', below: 10 },
        { t: 'turnAtLeast', n: 20 },
      ],
    },
    once: true,
    priority: 7,
    text:
      'Leningrad lies thirty-two kilometres from the Finnish frontier, within range of heavy artillery on Finnish soil. The naval staff requires the Gulf’s northern shore; the Baltic republics have already accepted garrisons. The proposal to Helsinki: the frontier on the Isthmus moves back, the islands are ceded, Hanko is leased as a base, and in exchange Finland receives twice the ground in Soviet Karelia, forest for fortress. Comrade Zhdanov holds that the Finns will bargain; the Finnish desk holds that they will not. The delegation is summoned either way.',
    choices: [
      {
        label: 'Summon the Finns',
        detail: 'The security of Leningrad is not a subject for sentiment. Present the terms.',
        effects: [
          { t: 'flag', key: PF.PRE_SOV_DEMANDS_FIN, value: true },
          { t: 'tension', delta: 2 },
          { t: 'relations', a: 'SOV', b: 'FIN', delta: -10 },
          {
            t: 'report', to: 'SWE', kind: 'diplomatic', title: 'Moscow summons Helsinki',
            body: 'The Soviet Union has presented Finland with territorial demands on the Karelian Isthmus and the Gulf islands.',
          },
          {
            t: 'report', to: 'GER', kind: 'intel', title: 'Soviet demands on Finland',
            body: 'Moscow moves on its northern sphere. The Finnish reply is not yet known.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Leave Finland for the spring',
        detail: 'The Baltic garrisons are enough for one season. Do not hand the West a small heroic cause.',
        effects: [
          { t: 'relations', a: 'SOV', b: 'FIN', delta: 5 },
          { t: 'chronicle', text: 'Moscow left the Finnish question in the drawer that winter.', divergence: true },
        ],
        aiWeight: 1,
      },
    ],
  },
  {
    id: 'pre-winter-helsinki',
    title: 'The Isthmus Question',
    nation: 'FIN',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: PF.PRE_SOV_DEMANDS_FIN },
        { t: 'alive', nation: 'FIN' },
        { t: 'not', c: { t: 'atWar', a: 'SOV', b: 'FIN' } },
      ],
    },
    once: true,
    priority: 8,
    text:
      'Helsinki. The delegation has returned from Moscow with the Soviet terms unchanged through three sittings. Marshal Mannerheim, no friend of illusions, advises that the army has ammunition for sixty days and that the demands, measured strictly in ground, could be borne. The government’s reading is different: the Isthmus line is the country’s one defensible frontier, and what is conceded under threat is only the first instalment. Sweden offers sympathy, volunteers perhaps, no divisions. Snow is expected early this year. The reply to Moscow must go this week.',
    choices: [
      {
        label: 'Refuse the demands',
        detail: 'The line is the country. If Moscow wants the Isthmus, it must come and take it in winter.',
        effects: [
          { t: 'declareWar', attacker: 'SOV', defender: 'FIN' },
          { t: 'flag', key: FLAGS.WINTER_WAR, value: true },
          { t: 'warSupport', nation: 'FIN', delta: 20 },
          { t: 'relations', a: 'FIN', b: 'SWE', delta: 10 },
          { t: 'relations', a: 'FIN', b: 'UK', delta: 10 },
          { t: 'chronicle', text: 'Soviet columns crossed the Finnish frontier. The Winter War had begun.' },
          {
            t: 'report', to: 'SWE', kind: 'front', title: 'War in the north',
            body: 'Finland has refused the Soviet terms and is under attack along the whole eastern frontier.',
          },
          {
            t: 'report', to: 'GER', kind: 'intel', title: 'The Red Army moves on Finland',
            body: 'The Soviet attack on Finland has begun. Early reports suggest the Red Army’s performance merits close study.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Cede the ground',
        detail: 'Trade the Isthmus for time, fortify what remains, and trust that appetite has a limit.',
        effects: [
          { t: 'cedeRegion', region: 'fin-karelia', to: 'SOV' },
          { t: 'flag', key: PF.PRE_FIN_CONCEDED, value: true },
          { t: 'stability', nation: 'FIN', delta: -10 },
          { t: 'warSupport', nation: 'FIN', delta: -10 },
          { t: 'relations', a: 'SOV', b: 'FIN', delta: 15 },
          { t: 'chronicle', text: 'Finland ceded the Isthmus ground without war. The Mannerheim Line passed into Soviet hands unfought.', divergence: true },
          {
            t: 'report', to: 'SWE', kind: 'diplomatic', title: 'Helsinki yields',
            body: 'Finland has accepted the Soviet territorial demands. The northern Baltic settles into the new arrangement.',
          },
        ],
        aiWeight: 2,
      },
    ],
  },
];
