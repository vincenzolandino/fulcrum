// Germany event pack: the Reich's strategic decision points, 1938-1948.
// Pure data against the Condition/Effect DSL in engine/types.ts. Cross-pack
// flags come from the registry; flags prefixed GER_ below are internal to
// this pack (other packs may read them but nothing depends on them yet).

import type { GameEvent } from '../../engine/types';
import { FLAGS, capitulatedFlag } from './registry';

// Pack-internal flags (set here; readable by anyone).
const GER_AUTARKY = 'GER_AUTARKY';
const GER_PLAN_Z = 'GER_PLAN_Z';
const GER_AIR_PRIORITY = 'GER_AIR_PRIORITY';
const GER_UBOAT_DOCTRINE = 'GER_UBOAT_DOCTRINE';
const GER_ROMANIAN_OIL = 'GER_ROMANIAN_OIL';
const GER_WESERUEBUNG = 'GER_WESERUEBUNG';
const GER_WEST_OFFENSIVE = 'GER_WEST_OFFENSIVE';
const GER_AIR_OFFENSIVE_UK = 'GER_AIR_OFFENSIVE_UK';
const GER_SEALION = 'GER_SEALION';
const GER_EYES_EAST = 'GER_EYES_EAST';
const GER_BARBAROSSA_POSTPONED = 'GER_BARBAROSSA_POSTPONED';
const GER_HALT_ORDER = 'GER_HALT_ORDER';
const GER_TOTAL_WAR = 'GER_TOTAL_WAR';
const GER_TONNAGE_WAR = 'GER_TONNAGE_WAR';
const GER_PLOT_CRUSHED = 'GER_PLOT_CRUSHED';
const GER_PEACE_FEELER = 'GER_PEACE_FEELER';
const GER_JUNTA_PEACE_BID = 'GER_JUNTA_PEACE_BID';
const GER_JUNTA_HOLDS = 'GER_JUNTA_HOLDS';
const GER_SURRENDERED = 'GER_SURRENDERED';
const GER_FIGHTS_TO_END = 'GER_FIGHTS_TO_END';

export const GERMANY_EVENTS: GameEvent[] = [
  // -------------------------------------------------------------------------
  // War economy: the founding economic choice.
  // -------------------------------------------------------------------------
  {
    id: 'ger-war-economy',
    title: 'The Four Year Plan Deepens',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'GER', leader: 'hitler' },
        { t: 'controls', nation: 'GER', region: 'ger-ruhr' },
        { t: 'turnAtLeast', n: 1 },
      ],
    },
    once: true,
    priority: 4,
    text:
      'Memorandum, Reich Ministry of Economics, to the Chancellery. The rearmament program has outrun ' +
      'the Reich\'s foreign exchange. Steel is rationed between the services; copper and rubber run short ' +
      'before each quarter closes. The Air Ministry presses for full autarky: synthetic fuel, domestic ore, ' +
      'armament above all civilian claims. Dr. Schacht warns that exports alone pay for imported ore, and ' +
      'that the present pace bankrupts the Reich within years. The Chancellery must set the priority. ' +
      'Both courses carry costs that will compound with every budget cycle.',
    choices: [
      {
        label: 'Armament above all',
        detail: 'Full autarky. The consumer economy is subordinated to the services.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: GER_AUTARKY, value: true },
          { t: 'ic', nation: 'GER', delta: 8 },
          { t: 'stability', nation: 'GER', delta: -4 },
          { t: 'warSupport', nation: 'GER', delta: 3 },
        ],
      },
      {
        label: 'Heed Schacht\'s warning',
        detail: 'Slow the pace, sell abroad, keep the currency solvent.',
        aiWeight: 1,
        effects: [
          { t: 'stability', nation: 'GER', delta: 4 },
          { t: 'relations', a: 'GER', b: 'USA', delta: 5 },
          { t: 'relations', a: 'GER', b: 'UK', delta: 5 },
          {
            t: 'chronicle',
            text: 'Berlin throttled back rearmament in 1938. The Reich that followed was richer, steadier, and slower to arm than the one history records.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Kriegsmarine vs Luftwaffe priority.
  // -------------------------------------------------------------------------
  {
    id: 'ger-plan-z',
    title: 'Kriegsmarine or Luftwaffe',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'relations', a: 'GER', b: 'UK', below: -20 },
        {
          t: 'or',
          c: [
            { t: 'flag', key: FLAGS.MUNICH_CONCEDED },
            { t: 'flag', key: FLAGS.MUNICH_WAR },
            { t: 'atWar', a: 'GER' },
          ],
        },
        { t: 'turnAtLeast', n: 10 },
      ],
    },
    once: true,
    priority: 4,
    text:
      'Admiral Raeder has laid before the Chancellery the fleet program designated Plan Z: ten ' +
      'battleships, four carriers, a cruiser force to contest the Atlantic by 1946. The Air Ministry ' +
      'answers that no such respite exists, and that every ton of armor plate sent to the yards is a ' +
      'bomber squadron unbuilt. A third school, Commodore Doenitz\'s, wants neither: three hundred ' +
      'submarines to close the sea lanes of an island that imports its bread. Steel allocations cannot ' +
      'honor all three programs. The question is what war the Reich intends to fight, and how soon.',
    choices: [
      {
        label: 'The air fleet first',
        detail: 'Bombers and fighters within two years. The Navy waits.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: GER_AIR_PRIORITY, value: true },
          { t: 'air', nation: 'GER', delta: 80 },
        ],
      },
      {
        label: 'Approve Plan Z',
        detail: 'A battle fleet by the mid-forties. Nothing before then.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: GER_PLAN_Z, value: true },
          { t: 'navy', nation: 'GER', delta: 100 },
          {
            t: 'chronicle',
            text: 'Germany laid down the great fleet it historically abandoned at the first shot, mortgaging the air arm to do it.',
            divergence: true,
          },
        ],
      },
      {
        label: 'The submarine school',
        detail: 'Small hulls, fast building, and a war on tonnage.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: GER_UBOAT_DOCTRINE, value: true },
          { t: 'navy', nation: 'GER', delta: 50 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The Memel demand on Lithuania.
  // -------------------------------------------------------------------------
  {
    id: 'ger-memel',
    title: 'The Memel Question',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.ANSCHLUSS_DONE },
        { t: 'alive', nation: 'LIT' },
        { t: 'relations', a: 'GER', b: 'LIT', below: 0 },
        { t: 'turnAtLeast', n: 10 },
      ],
    },
    once: true,
    priority: 3,
    text:
      'From the Foreign Ministry to the Legation in Kaunas. The Memelland, detached from the Reich in ' +
      '1919 and held by Lithuania since the coup of 1923, returns to the agenda. The German population ' +
      'of the territory votes in blocs for the homeland parties; the harbor works fall idle while ' +
      'Koenigsberg takes the trade. The Ministry judges that Kaunas, isolated between Warsaw and Moscow, ' +
      'will not fight for the port. A note has been drafted. It awaits only a signature.',
    choices: [
      {
        label: 'Deliver the ultimatum',
        detail: 'The port returns to the Reich, or the question is settled otherwise.',
        aiWeight: 4,
        effects: [
          { t: 'addClaim', nation: 'GER', region: 'lit-kaunas' },
          { t: 'relations', a: 'GER', b: 'LIT', delta: -25 },
          { t: 'tension', delta: 2 },
          {
            t: 'report',
            to: 'LIT',
            kind: 'diplomatic',
            title: 'Ultimatum from Berlin',
            body: 'The German Foreign Ministry demands the return of the Memel territory. The note gives days, not weeks, and no arbitration is offered.',
          },
        ],
      },
      {
        label: 'Let the port wait',
        detail: 'There are larger questions than a harbor on the Niemen.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'GER', b: 'LIT', delta: 10 },
          {
            t: 'chronicle',
            text: 'Berlin never pressed the Memel demand. The last of the Versailles grievances went unclaimed.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Romanian oil: the fuel arithmetic.
  // -------------------------------------------------------------------------
  {
    id: 'ger-ploiesti',
    title: 'The Wells of Wallachia',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'GER' },
        { t: 'alive', nation: 'ROM' },
        { t: 'faction', nation: 'ROM', is: 'neutral' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'ROM' } },
      ],
    },
    once: true,
    priority: 5,
    text:
      'Study by the Military Economy Staff. The Reich\'s synthetic fuel plants cover barely half of ' +
      'wartime consumption; the balance must come from Ploiesti or from stocks. Romania sells today for ' +
      'foreign exchange, and sells to London too. The Staff sees three roads: purchase the harvest at a ' +
      'premium and bind Bucharest by treaty, draw the kingdom into the Reich\'s political orbit outright, ' +
      'or take the fields by force and hold ninety kilometers of pipeline against sabotage. Fuel is the ' +
      'war\'s arithmetic. It must be solved before the reserve gauges say so.',
    choices: [
      {
        label: 'Buy the oil, bind the King',
        detail: 'A trade treaty at generous prices. Bucharest stays a friend by profit.',
        aiWeight: 4,
        effects: [
          { t: 'pact', a: 'GER', b: 'ROM', kind: 'trade' },
          { t: 'relations', a: 'GER', b: 'ROM', delta: 20 },
          { t: 'flag', key: GER_ROMANIAN_OIL, value: true },
        ],
      },
      {
        label: 'Bring Bucharest into the Axis',
        detail: 'Guarantees, advisers, and a place at the table. The oil follows the flag.',
        available: { t: 'relations', a: 'GER', b: 'ROM', atLeast: 20 },
        aiWeight: 2,
        effects: [
          { t: 'joinFaction', nation: 'ROM', faction: 'axis' },
          { t: 'relations', a: 'GER', b: 'ROM', delta: 10 },
          { t: 'tension', delta: 2 },
          {
            t: 'report',
            to: 'SOV',
            kind: 'diplomatic',
            title: 'Bucharest Aligns with Berlin',
            body: 'Romania has entered the German political orbit. German missions are expected at Ploiesti and on the Danube within the month.',
          },
        ],
      },
      {
        label: 'Seize the fields',
        detail: 'Take the wells and hold them. Suppliers can refuse; provinces cannot.',
        aiWeight: 1,
        effects: [
          { t: 'declareWar', attacker: 'GER', defender: 'ROM' },
          {
            t: 'chronicle',
            text: 'Germany invaded Romania for its oil, trading a willing supplier for a battlefield and a burning refinery belt.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'SOV',
            kind: 'front',
            title: 'German Columns Cross into Romania',
            body: 'German forces have attacked Romania without ultimatum. The Ploiesti fields are the evident objective.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Weseruebung: the iron ore route.
  // -------------------------------------------------------------------------
  {
    id: 'ger-weseruebung',
    title: 'The Iron Ore Route',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'GER', b: 'UK' },
        { t: 'alive', nation: 'NOR' },
        { t: 'faction', nation: 'NOR', is: 'neutral' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'NOR' } },
      ],
    },
    once: true,
    priority: 6,
    text:
      'Naval Staff appreciation for the leadership conference. Swedish ore reaches the Reich through ' +
      'Narvik in the winter months, coasting south inside Norwegian waters. The British Admiralty studies ' +
      'the same chart; mining of the Leads is expected in the spring, and a landing behind it. Whoever ' +
      'moves first holds the fjords and the ore. The Army can spare six divisions; the fleet can carry ' +
      'them, once, at a price it may go on paying for years. Denmark is the stepping stone and will not ' +
      'resist beyond a morning.',
    choices: [
      {
        label: 'Execute Weseruebung',
        detail: 'Denmark and Norway in one stroke, before the Royal Navy moves.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: GER_WESERUEBUNG, value: true },
          { t: 'declareWar', attacker: 'GER', defender: 'DEN' },
          { t: 'declareWar', attacker: 'GER', defender: 'NOR' },
          {
            t: 'report',
            to: 'UK',
            kind: 'front',
            title: 'German Landings in Scandinavia',
            body: 'German forces have entered Denmark and landed at points along the Norwegian coast. The ore route and the North Sea flank are at stake.',
          },
        ],
      },
      {
        label: 'The ore must run the gauntlet',
        detail: 'No divisions for the north. The ships take their chances inside the Leads.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'GER', b: 'NOR', delta: 10 },
          { t: 'relations', a: 'GER', b: 'SWE', delta: 10 },
          {
            t: 'chronicle',
            text: 'Germany left Scandinavia untouched. The ore route lived at the Royal Navy\'s pleasure, and Berlin knew it.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Case Yellow: the decision in the West.
  // -------------------------------------------------------------------------
  {
    id: 'ger-case-yellow',
    title: 'The Decision in the West',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'GER', b: 'FRA' },
        { t: 'alive', nation: 'BEL' },
        { t: 'faction', nation: 'BEL', is: 'neutral' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'BEL' } },
      ],
    },
    once: true,
    priority: 8,
    text:
      'Army High Command, deployment directive, third draft. The fortifications opposite the Saar cannot ' +
      'be broken at tolerable cost; every map exercise ends the same way. General von Manstein\'s ' +
      'alternative puts the weight of the armor through the Ardennes, hinging on Belgian and Dutch ' +
      'neutrality being violated on the first morning. The General Staff calls the forest impassable for ' +
      'tanks and the plan a gamble on French reaction time. The remaining course is a winter of siege ' +
      'warfare on the frontier while the blockade tightens around the Reich\'s imports.',
    choices: [
      {
        label: 'Through the Low Countries',
        detail: 'The armor goes through the Ardennes. Neutrality is a morning\'s casualty.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: GER_WEST_OFFENSIVE, value: true },
          { t: 'declareWar', attacker: 'GER', defender: 'BEL' },
          { t: 'declareWar', attacker: 'GER', defender: 'NED' },
          {
            t: 'report',
            to: 'FRA',
            kind: 'front',
            title: 'The German Offensive Opens',
            body: 'German columns have crossed the Belgian and Dutch frontiers at dawn on a broad front. The weight of the attack is not yet located.',
          },
        ],
      },
      {
        label: 'Assault the fortifications',
        detail: 'A frontal battle on the common frontier. Costly, and honest about it.',
        aiWeight: 1,
        effects: [
          { t: 'armyStrength', nation: 'GER', delta: -8 },
          { t: 'warSupport', nation: 'GER', delta: -5 },
          {
            t: 'chronicle',
            text: 'Germany chose to bleed itself against the French fortress line rather than turn the flank through Belgium.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Stand on the defensive',
        detail: 'Hold the West Wall and let the enemy coalition carry the cost of attacking.',
        aiWeight: 1,
        effects: [
          { t: 'stability', nation: 'GER', delta: 2 },
          { t: 'warSupport', nation: 'GER', delta: -3 },
          {
            t: 'chronicle',
            text: 'No offensive came in the West. The armies dug in and the war became a siege of nerves and imports.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // After France: the Channel question.
  // -------------------------------------------------------------------------
  {
    id: 'ger-sealion',
    title: 'Across the Channel',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'GER', b: 'UK' },
        { t: 'controls', nation: 'GER', region: 'fra-paris' },
        { t: 'alive', nation: 'UK' },
      ],
    },
    once: true,
    priority: 7,
    text:
      'Leadership conference, naval and air commanders in attendance. France has fallen and the British ' +
      'cabinet has declined every feeler. The Army submits landing tables for a crossing on a broad ' +
      'front; the Navy answers that it can protect a narrow one, perhaps, in fog. The Air Staff promises ' +
      'that the island\'s air force can be broken over its own fields in five weeks, after which barges ' +
      'may cross under an umbrella. To the east, intelligence reports fresh mechanized corps forming on ' +
      'the Soviet side of the demarcation line. Three roads lead out of Paris.',
    choices: [
      {
        label: 'Break their air force first',
        detail: 'The bombers go against the airfields and the ports. The barges wait on the result.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: GER_AIR_OFFENSIVE_UK, value: true },
          { t: 'air', nation: 'GER', delta: -50 },
          { t: 'air', nation: 'UK', delta: -40 },
          {
            t: 'report',
            to: 'UK',
            kind: 'front',
            title: 'Mass Raids on the Southern Airfields',
            body: 'German air fleets have opened a sustained offensive against fighter stations and radar posts in the south of England.',
          },
        ],
      },
      {
        label: 'Risk the crossing now',
        detail: 'Every week of delay arms the island. The Navy\'s objections are noted and overruled.',
        aiWeight: 1,
        effects: [
          { t: 'flag', key: GER_SEALION, value: true },
          { t: 'navy', nation: 'GER', delta: -40 },
          { t: 'tension', delta: 3 },
          {
            t: 'report',
            to: 'UK',
            kind: 'intel',
            title: 'Invasion Fleet Assembling',
            body: 'Barge concentrations are confirmed in the Channel ports from Rotterdam to Le Havre. Embarkation exercises are under way.',
          },
          {
            t: 'chronicle',
            text: 'The barges sailed. No German plan of the war had ever leaned so far over the water.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Turn the planning east',
        detail: 'England can be starved later. The continental rival is the real account.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: GER_EYES_EAST, value: true },
          { t: 'relations', a: 'GER', b: 'SOV', delta: -10 },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Barbarossa: the decision of the war.
  // -------------------------------------------------------------------------
  {
    id: 'ger-barbarossa',
    title: 'Directive for the East',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'SOV' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'SOV' } },
        {
          t: 'or',
          c: [
            { t: 'leaderIs', nation: 'GER', leader: 'hitler' },
            { t: 'leaderIs', nation: 'GER', leader: 'goering' },
            { t: 'leaderIs', nation: 'GER', leader: 'himmler' },
          ],
        },
        // Weigh the UK's status: knocked out, at peace with the Reich, or
        // beaten on the continent (France fallen).
        {
          t: 'or',
          c: [
            { t: 'flag', key: capitulatedFlag('UK') },
            { t: 'not', c: { t: 'atWar', a: 'GER', b: 'UK' } },
            { t: 'controls', nation: 'GER', region: 'fra-paris' },
          ],
        },
        // A pact to break, or a war already running: no bolt from a clear sky.
        {
          t: 'or',
          c: [
            { t: 'flag', key: FLAGS.PACT_MR },
            { t: 'atWar', a: 'GER' },
          ],
        },
        { t: 'strengthRatio', a: 'GER', b: 'SOV', atLeast: 1.05 },
        { t: 'tension', atLeast: 40 },
        { t: 'turnAtLeast', n: 30 },
      ],
    },
    once: true,
    priority: 9,
    text:
      'Directive of the Supreme Command, distribution restricted to army group level. The war in the ' +
      'West has not produced a decision against England, yet the island fights on credit: its last hope, ' +
      'the draft reads, is Russia and America. The General Staff counts the divisions available against ' +
      'the Soviet frontier armies, whose officer corps has not recovered from the purges. The window is ' +
      'the summer. Every month surrendered gives Moscow another season of tank production and another ' +
      'class of conscripts. The Supreme Command requires a recommendation before the spring thaw closes ' +
      'the roads.',
    choices: [
      {
        label: 'Launch Barbarossa',
        detail: 'The eastern campaign opens with the dry season. The pact is void at H-hour.',
        available: { t: 'strengthRatio', a: 'GER', b: 'SOV', atLeast: 1.1 },
        aiWeight: 4,
        effects: [
          { t: 'flag', key: FLAGS.BARBAROSSA, value: true },
          { t: 'breakPact', a: 'GER', b: 'SOV' },
          { t: 'declareWar', attacker: 'GER', defender: 'SOV' },
          {
            t: 'chronicle',
            text: 'German armies crossed the Soviet frontier on a front from the Baltic to the Black Sea. The war found its center of gravity.',
          },
          {
            t: 'chronicle',
            text: 'Behind the front, the apparatus of occupation began its work. The war in the East was waged against peoples as much as against armies.',
          },
          {
            t: 'report',
            to: 'SOV',
            kind: 'front',
            title: 'Invasion Across the Western Frontier',
            body: 'German forces have attacked without declaration along the entire western frontier. Border districts report air strikes on airfields and rail junctions.',
          },
        ],
      },
      {
        label: 'Postpone one season',
        detail: 'The Balkans flank, the fuel stocks, the barge question: all argue for one more year.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: GER_BARBAROSSA_POSTPONED, value: true },
          { t: 'queueEvent', id: 'ger-barbarossa-delayed', delay: 5 },
        ],
      },
      {
        label: 'Hold to the pact',
        detail: 'Two-front war broke the Reich once. The East delivers grain and oil; let it.',
        aiWeight: 1,
        effects: [
          { t: 'relations', a: 'GER', b: 'SOV', delta: 15 },
          {
            t: 'chronicle',
            text: 'Germany kept its eastern pact. No war of annihilation opened in the East, and the trade trains kept crossing the Bug.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // Postponed Barbarossa returns to the table.
  {
    id: 'ger-barbarossa-delayed',
    title: 'The Eastern Question Returns',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: GER_BARBAROSSA_POSTPONED },
        { t: 'alive', nation: 'SOV' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'SOV' } },
      ],
    },
    once: true,
    priority: 9,
    text:
      'Second staff appreciation on the Eastern question. The postponed directive returns with the thaw. ' +
      'Soviet deliveries under the trade protocol arrive punctually, and every train crossing the Bug ' +
      'pays for the divisions watching it. Intelligence counts new mechanized corps forming beyond the ' +
      'frontier and a fortification line rising behind the border rivers. The delay was purchased at ' +
      'interest. The choice before the Supreme Command has not changed; only the odds have.',
    choices: [
      {
        label: 'Launch the attack',
        detail: 'The window narrows every quarter. It is this summer or no summer.',
        available: { t: 'strengthRatio', a: 'GER', b: 'SOV', atLeast: 1.0 },
        aiWeight: 3,
        effects: [
          { t: 'flag', key: FLAGS.BARBAROSSA, value: true },
          { t: 'breakPact', a: 'GER', b: 'SOV' },
          { t: 'declareWar', attacker: 'GER', defender: 'SOV' },
          {
            t: 'chronicle',
            text: 'Barbarossa came a season or more later than in our history, against a Red Army that had used the time.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'SOV',
            kind: 'front',
            title: 'Invasion Across the Western Frontier',
            body: 'German forces have attacked without declaration along the entire western frontier. The long-signaled blow has fallen.',
          },
        ],
      },
      {
        label: 'Abandon the eastern design',
        detail: 'The moment has passed. File the directive and fight the war already on the books.',
        aiWeight: 2,
        effects: [
          { t: 'relations', a: 'GER', b: 'SOV', delta: 15 },
          {
            t: 'chronicle',
            text: 'The eastern war was shelved for good. Two empires watched each other across the Bug, arming.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The winter crisis before Moscow.
  // -------------------------------------------------------------------------
  {
    id: 'ger-winter-crisis',
    title: 'The Army Stands at the Gates',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.BARBAROSSA },
        { t: 'atWar', a: 'GER', b: 'SOV' },
        { t: 'controls', nation: 'GER', region: 'sov-byelorussia' },
        { t: 'not', c: { t: 'controls', nation: 'GER', region: 'sov-moscow' } },
      ],
    },
    once: true,
    priority: 6,
    text:
      'Army Group Center to Supreme Command, situation report. The advance has reached its culminating ' +
      'point short of Moscow. Frost casualties now exceed battle casualties; the tanks require depot ' +
      'overhaul; the railheads lie two hundred kilometers behind the spearheads. Fresh Siberian divisions ' +
      'are identified opposite the line. The field commanders request authority for elastic withdrawal ' +
      'to prepared winter positions. The alternative order is to stand fast on every meter and hold the ' +
      'front by will alone until spring.',
    choices: [
      {
        label: 'Stand fast',
        detail: 'Not one step back. Retreat in this cold becomes rout.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: GER_HALT_ORDER, value: true },
          { t: 'armyStrength', nation: 'GER', delta: -8 },
          { t: 'warSupport', nation: 'GER', delta: 3 },
        ],
      },
      {
        label: 'Authorize withdrawal',
        detail: 'Trade ground for the army. The commanders on the spot know the front.',
        aiWeight: 2,
        effects: [
          { t: 'armyStrength', nation: 'GER', delta: -3 },
          { t: 'warSupport', nation: 'GER', delta: -5 },
          {
            t: 'chronicle',
            text: 'The German army gave ground before Moscow by choice, preserving men over prestige.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Total war mobilization.
  // -------------------------------------------------------------------------
  {
    id: 'ger-total-war',
    title: 'Total War',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'GER' },
        { t: 'warSupport', nation: 'GER', below: 50 },
        { t: 'turnAtLeast', n: 36 },
      ],
    },
    once: true,
    priority: 5,
    text:
      'Minute of the Ministry for Armaments, circulated to district level. The fronts consume more than ' +
      'the Reich produces. Single-shift working persists in the tank works; domestic servants number in ' +
      'the millions; women\'s labor registration remains voluntary. The Ministry proposes total ' +
      'mobilization: closure of the luxury trades, conscription of labor, rationalization of the cartels ' +
      'under central direction. The Party objects that the home front\'s mood will not bear it. The ' +
      'figures on the following pages say the war will not be borne without it.',
    choices: [
      {
        label: 'Proclaim total war',
        detail: 'Everything for the front. The home front is asked whether it wants the war shorter or lost.',
        aiWeight: 4,
        effects: [
          { t: 'flag', key: GER_TOTAL_WAR, value: true },
          { t: 'ic', nation: 'GER', delta: 10 },
          { t: 'manpower', nation: 'GER', delta: 400 },
          { t: 'stability', nation: 'GER', delta: -8 },
          { t: 'warSupport', nation: 'GER', delta: 8 },
        ],
      },
      {
        label: 'Spare the home front',
        detail: 'The regime\'s bargain with its people holds: victory without sacrifice at home.',
        aiWeight: 1,
        effects: [
          { t: 'stability', nation: 'GER', delta: 3 },
          {
            t: 'chronicle',
            text: 'The regime declined total mobilization. The factories kept peacetime hours while the fronts starved for shells.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The U-boat rules of engagement and American opinion.
  // -------------------------------------------------------------------------
  {
    id: 'ger-tonnage-war',
    title: 'Tonnage War',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'GER', b: 'UK' },
        { t: 'faction', nation: 'USA', is: 'neutral' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'USA' } },
      ],
    },
    once: true,
    priority: 4,
    text:
      'Naval Staff, monthly appreciation. The island imports a million tons a week; the boats sink at a ' +
      'rate that grows each quarter as the flotillas expand. The reservation is political. American ' +
      'hulls carry an increasing share of the trade, and the boats request standing orders for the gray ' +
      'zone where escort meets convoy. To sink without warning is to feed the American interventionists. ' +
      'To surface and search is to lose boats to disguised armament. The Staff requests a ruling that ' +
      'will hold for the campaign, not for the week.',
    choices: [
      {
        label: 'Sink on sight',
        detail: 'The blockade is the weapon. Flags do not carry cargo; hulls do.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: GER_TONNAGE_WAR, value: true },
          { t: 'relations', a: 'GER', b: 'USA', delta: -20 },
          { t: 'tension', delta: 3 },
          {
            t: 'report',
            to: 'USA',
            kind: 'diplomatic',
            title: 'American Ships Lost in the War Zone',
            body: 'United States merchant vessels have been torpedoed without warning in the declared blockade area. Survivors report no challenge before the attacks.',
          },
        ],
      },
      {
        label: 'Spare the neutral flags',
        detail: 'No second Lusitania. The boats work under prize rules where neutrals sail.',
        aiWeight: 2,
        effects: [
          { t: 'relations', a: 'GER', b: 'USA', delta: 5 },
          {
            t: 'chronicle',
            text: 'The U-boat arm fought under prize rules in the neutral lanes. American opinion was handed no burning liner.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The generals' plot. Arms when the regime wobbles or the war goes badly.
  // -------------------------------------------------------------------------
  {
    id: 'ger-generals-plot',
    title: 'The Oath and the State',
    nation: 'GER',
    fires: {
      t: 'and',
      c: [
        { t: 'leaderIs', nation: 'GER', leader: 'hitler' },
        {
          t: 'or',
          c: [
            { t: 'stability', nation: 'GER', below: 40 },
            {
              t: 'and',
              c: [
                { t: 'atWar', a: 'GER' },
                { t: 'warSupport', nation: 'GER', below: 35 },
              ],
            },
          ],
        },
      ],
    },
    once: true,
    priority: 8,
    text:
      'Report of the Reich Security Main Office, restricted circulation. Fragments assemble into a ' +
      'pattern: a courier arrested at Prague station with names in a notebook; retired generals meeting ' +
      'at estates in the East; a staff colonel asking after the strength of the Berlin guard regiments. ' +
      'The conspirators are believed to include serving commanders. Whether the front\'s misfortunes ' +
      'have made them bold or desperate is not established. The apparatus can strike first, but the ' +
      'Army is the instrument fighting the war. Handled wrongly, the state loses both.',
    choices: [
      {
        label: 'Strike first',
        detail: 'Arrests tonight, tribunals within the week. The Army learns who owns the state.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: GER_PLOT_CRUSHED, value: true },
          { t: 'stability', nation: 'GER', delta: 4 },
          { t: 'armyStrength', nation: 'GER', delta: -6 },
          {
            t: 'chronicle',
            text: 'The plot against the regime was broken before it moved. The reprisals reached deep into the officer corps.',
          },
        ],
      },
      {
        label: 'Hesitate before the Army',
        detail: 'Moving against serving commanders in wartime risks the front. Wait for proof.',
        aiWeight: 2,
        effects: [
          { t: 'setLeader', nation: 'GER', leader: 'beck-junta' },
          { t: 'setAI', nation: 'GER', patch: { aggression: 0.3, ideologyZeal: 0.2, focus: 'defense' } },
          { t: 'stability', nation: 'GER', delta: -10 },
          { t: 'queueEvent', id: 'ger-succession-beck-junta', delay: 0 },
          {
            t: 'chronicle',
            text: 'The conspirators succeeded where in our history they failed. A council of officers took the German state.',
            divergence: true,
          },
          {
            t: 'report',
            to: 'player',
            kind: 'intel',
            title: 'Upheaval in Berlin',
            body: 'The German head of state has been deposed by his own officers. A military council under Colonel-General Beck claims executive power.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Succession events, keyed to the leaders.ts succession table.
  // -------------------------------------------------------------------------
  {
    id: 'ger-succession-goering',
    title: 'The Reichsmarschall Succeeds',
    nation: 'GER',
    fires: { t: 'leaderIs', nation: 'GER', leader: 'goering' },
    once: true,
    priority: 8,
    text:
      'Radio Berlin announces the succession in solemn tones: by the decree of succession, the ' +
      'Reichsmarschall assumes the offices of the fallen leader. The apparatus holds. The Air Ministry\'s ' +
      'man now commands the whole; the procurement networks, long his private province, become ' +
      'instruments of state. Foreign chanceries note that the new master is vain, acquisitive, and, by ' +
      'the standards of his movement, approachable. In the ministries, men who never dared speak of ' +
      'terms begin, carefully, to speak.',
    choices: [
      {
        label: 'Continuity above all',
        detail: 'The program does not change with the portrait on the wall.',
        aiWeight: 3,
        effects: [
          { t: 'stability', nation: 'GER', delta: 5 },
          { t: 'warSupport', nation: 'GER', delta: -3 },
        ],
      },
      {
        label: 'Open a channel to the West',
        detail: 'Quiet soundings through Stockholm. Nothing on paper.',
        available: { t: 'atWar', a: 'GER', b: 'UK' },
        aiWeight: 2,
        effects: [
          { t: 'flag', key: GER_PEACE_FEELER, value: true },
          { t: 'relations', a: 'GER', b: 'UK', delta: 15 },
          { t: 'relations', a: 'GER', b: 'USA', delta: 10 },
          {
            t: 'report',
            to: 'UK',
            kind: 'diplomatic',
            title: 'A Feeler from Berlin',
            body: 'Intermediaries in Stockholm carry word that the new German leadership would discuss terms. The approach is deniable and unsigned.',
          },
        ],
      },
    ],
  },
  {
    id: 'ger-succession-himmler',
    title: 'The Policeman\'s State',
    nation: 'GER',
    fires: { t: 'leaderIs', nation: 'GER', leader: 'himmler' },
    once: true,
    priority: 8,
    text:
      'The announcement is brief and the streets are quiet, which is itself the message. The ' +
      'Reichsfuehrer-SS assumes the leadership of state and movement; the security apparatus he built ' +
      'now is the state. Commissioners flank each army headquarters within the week. Foreign observers ' +
      'expect no feelers, no terms, no exhaustion of will at the top. The new regime is purer than the ' +
      'old, and colder, and it counts loyalty the only strategic resource that matters.',
    choices: [
      {
        label: 'Terror at home, iron at the front',
        detail: 'The apparatus turns inward and outward at once.',
        aiWeight: 3,
        effects: [
          { t: 'stability', nation: 'GER', delta: -8 },
          { t: 'warSupport', nation: 'GER', delta: 5 },
          { t: 'flag', key: FLAGS.AI_COVERT_AGGRESSIVE, value: true },
          {
            t: 'chronicle',
            text: 'Under the policeman\'s regime the machinery of persecution ground on without pause, and the record of the camps lengthened.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Purge the officer corps',
        detail: 'The Army\'s loyalty is verified name by name.',
        aiWeight: 2,
        effects: [
          { t: 'armyStrength', nation: 'GER', delta: -8 },
          { t: 'stability', nation: 'GER', delta: 4 },
          {
            t: 'chronicle',
            text: 'The new regime purged its own high command in wartime, trading experience at the front for obedience at headquarters.',
            divergence: true,
          },
        ],
      },
    ],
  },
  {
    id: 'ger-succession-beck-junta',
    title: 'The Generals\' Government',
    nation: 'GER',
    fires: { t: 'leaderIs', nation: 'GER', leader: 'beck-junta' },
    once: true,
    priority: 8,
    text:
      'Proclamation of the Military Council of the German Reich, broadcast on all stations. The Army has ' +
      'assumed executive power to preserve the nation. Party formations are dissolved; the security ' +
      'police pass under military law; political prisoners of the old regime walk out of Moabit into the ' +
      'photographers\' flashbulbs. Colonel-General Beck, speaking as head of the council, names an ' +
      'honorable peace as the government\'s first purpose and the integrity of German soil its second. ' +
      'In London and Washington the same question is asked: can one deal with these men.',
    choices: [
      {
        label: 'Sue for peace on all fronts',
        detail: 'Notes to every belligerent capital within the week. The bleeding stops first.',
        aiWeight: 3,
        effects: [
          { t: 'flag', key: GER_JUNTA_PEACE_BID, value: true },
          { t: 'relations', a: 'GER', b: 'UK', delta: 25 },
          { t: 'relations', a: 'GER', b: 'USA', delta: 20 },
          { t: 'relations', a: 'GER', b: 'SOV', delta: 10 },
          { t: 'warSupport', nation: 'GER', delta: -10 },
          { t: 'tension', delta: -5 },
          {
            t: 'report',
            to: 'UK',
            kind: 'diplomatic',
            title: 'Berlin Asks for Terms',
            body: 'The German military government has formally requested negotiations through the Swiss. The note does not use the word surrender. It does not exclude it.',
          },
          {
            t: 'chronicle',
            text: 'A German government sought a negotiated peace. The war\'s end became a matter of terms rather than ruins.',
            divergence: true,
          },
        ],
      },
      {
        label: 'Stabilize the fronts, then talk',
        detail: 'Terms are better bought from an unbroken line.',
        aiWeight: 2,
        effects: [
          { t: 'flag', key: GER_JUNTA_HOLDS, value: true },
          { t: 'stability', nation: 'GER', delta: 5 },
          {
            t: 'chronicle',
            text: 'The junta chose to bargain from strength, holding its lines while its diplomats waited for a better season.',
            divergence: true,
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // The end. Fires on the engine's capitulation flag.
  // -------------------------------------------------------------------------
  {
    id: 'surrender-GER',
    title: 'The Instrument of Surrender',
    nation: 'GER',
    fires: { t: 'flag', key: capitulatedFlag('GER') },
    once: true,
    priority: 9,
    text:
      'The delegation crosses the lines at first light under a white flag stitched from a bedsheet. In ' +
      'a schoolhouse requisitioned as a forward headquarters, the act of military surrender is read ' +
      'aloud twice, once in German, and signed without ceremony. All forces of the Reich are to cease ' +
      'operations, hand over war material intact, and await direction. Outside, the guns have already ' +
      'gone quiet along most of the front, the armies dissolving toward home ahead of any order. Twelve ' +
      'years of the thousand-year Reich conclude in twenty minutes of procedure.',
    choices: [
      {
        label: 'Sign the instrument',
        detail: 'Unconditional. The state passes into the custody of its enemies.',
        aiWeight: 5,
        effects: [
          { t: 'flag', key: GER_SURRENDERED, value: true },
          { t: 'peace', a: 'GER', b: 'SOV' },
          { t: 'peace', a: 'GER', b: 'UK' },
          { t: 'peace', a: 'GER', b: 'USA' },
          { t: 'peace', a: 'GER', b: 'FRA' },
          { t: 'peace', a: 'GER', b: 'POL' },
          { t: 'disbandArmy', nation: 'GER', count: 20 },
          { t: 'navy', nation: 'GER', delta: -1000 },
          { t: 'air', nation: 'GER', delta: -1000 },
          { t: 'tension', delta: -10 },
          {
            t: 'chronicle',
            text: 'The German instrument of surrender was signed. The war in Europe was over.',
          },
          {
            t: 'chronicle',
            text: 'What the advancing armies found in the camps entered the permanent record of the century. The count of the murdered began, and did not end.',
          },
          {
            t: 'report',
            to: 'player',
            kind: 'front',
            title: 'Germany Surrenders',
            body: 'German forces have capitulated on all fronts. Occupation authorities assume control pending a settlement among the victorious powers.',
          },
        ],
      },
      {
        label: 'Deny the surrender',
        detail: 'No signature. The state is extinguished piecemeal, city by city.',
        available: {
          t: 'or',
          c: [
            { t: 'leaderIs', nation: 'GER', leader: 'hitler' },
            { t: 'leaderIs', nation: 'GER', leader: 'himmler' },
          ],
        },
        aiWeight: 1,
        effects: [
          { t: 'flag', key: GER_FIGHTS_TO_END, value: true },
          { t: 'stability', nation: 'GER', delta: -20 },
          { t: 'warSupport', nation: 'GER', delta: -15 },
          {
            t: 'chronicle',
            text: 'No instrument was signed. The Reich was extinguished piecemeal, garrison by garrison, at a cost the surrender would have spared everyone.',
            divergence: true,
          },
        ],
      },
    ],
  },
];
