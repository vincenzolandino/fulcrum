// Poland event pack — the September campaign, the exile state, and the
// underground. ~12 events, id prefix 'pol-' (exception: 'surrender-POL' per
// the engine convention in registry.ts).
//
// Pack-local flags (set and read only inside this file):
//   POL_FIGHTS_FORWARD   September posture chose forward defense
//   POL_BZURA_LAUNCHED   the Bzura counterattack was ordered
//   POL_UNDERGROUND      the Underground State is organized
//   POL_RISING           Warsaw rose against the occupation
//
// Cross-pack flags come from registry.ts (POLAND_STANDS, DANZIG_CONCEDED,
// EXILE_POL, PACT_MR, CAPITULATED_POL, LEADER_DEAD_POL).
//
// Bzura timing note: the DSL has no war-age condition, so the "2+ turns into
// a German war" requirement is delivered by queueEvent (delay 2) from the
// forward-defense choice of pol-september-posture; pol-bzura's own `fires`
// is a world-state backstop gated on that choice's flag and on Warsaw still
// holding. Its outcome is a genuine gamble: pol-bzura-success rolls
// { t: 'random' } and sets POLAND_STANDS; pol-bzura-failure fires only if
// the success roll missed (guarded by eventNotFired both ways).

import type { GameEvent } from '../../engine/types';
import { FLAGS, capitulatedFlag, leaderDeadFlag, surrenderEventId } from './registry';

const F_FIGHTS_FORWARD = 'POL_FIGHTS_FORWARD';
const F_BZURA_LAUNCHED = 'POL_BZURA_LAUNCHED';
const F_UNDERGROUND = 'POL_UNDERGROUND';
const F_RISING = 'POL_RISING';

export const POLAND_EVENTS: GameEvent[] = [
  // -------------------------------------------------------------------------
  // 1. September posture: the war-opening decision.
  // -------------------------------------------------------------------------
  {
    id: 'pol-september-posture',
    title: 'The September Directive',
    nation: 'POL',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'GER', b: 'POL' },
        { t: 'alive', nation: 'POL' },
        { t: 'controls', nation: 'POL', region: 'pol-warsaw' },
      ],
    },
    once: true,
    priority: 9,
    text:
      'GENERAL STAFF, WARSAW. German columns crossed the frontier at dawn along the whole ' +
      'western arc, from Pomerania to Silesia. The Marshal has convened the war council. ' +
      'Plan Zachód commits the army to the border provinces, where the factories and the ' +
      'coal are, and where the French will look for proof that Poland is fighting. A second ' +
      'paper, which no minister will sign, proposes surrendering the western third of the ' +
      'Republic to stand behind the Vistula and the Narew. A third, from the Foreign ' +
      'Ministry, prices what Berlin says it wants: Danzig, and an end to the shooting. ' +
      'The Marshal decides today.',
    choices: [
      {
        label: 'Fight at the border',
        detail:
          'Plan Zachód as written: hold Pomerania and Silesia, and show Paris the army fighting forward.',
        effects: [
          { t: 'flag', key: F_FIGHTS_FORWARD, value: true },
          { t: 'warSupport', nation: 'POL', delta: 8 },
          { t: 'relations', a: 'POL', b: 'FRA', delta: 8 },
          { t: 'relations', a: 'POL', b: 'UK', delta: 8 },
          { t: 'queueEvent', id: 'pol-bzura', delay: 2 },
          {
            t: 'report', to: 'GER', kind: 'front', title: 'Warsaw stands',
            body: 'Polish forces are accepting battle in the border provinces. No general withdrawal behind the Vistula is observed.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Stand on the Vistula and Narew',
        detail: 'Yield the western provinces without battle and hold a shorter line on the rivers.',
        effects: [
          { t: 'newArmy', nation: 'POL', name: 'Armia Warszawa', location: 'pol-warsaw', strength: 55, equipment: 45 },
          { t: 'stability', nation: 'POL', delta: -4 },
          { t: 'warSupport', nation: 'POL', delta: -5 },
          {
            t: 'chronicle',
            text: 'The Polish army abandoned the western provinces to stand on the river line. In our history it met the invasion at the frontier.',
            divergence: true,
          },
          {
            t: 'report', to: 'GER', kind: 'front', title: 'The west yields',
            body: 'Polish formations are withdrawing east in good order. Resistance is expected on the Vistula-Narew line.',
          },
        ],
        aiWeight: 2,
      },
      {
        label: 'Cede Danzig and ask for terms',
        detail: 'Accept the loss of the city and the corridor traffic rules in exchange for an end to the invasion.',
        available: { t: 'controls', nation: 'POL', region: 'pol-danzig' },
        effects: [
          { t: 'peace', a: 'GER', b: 'POL' },
          { t: 'cedeRegion', region: 'pol-danzig', to: 'GER' },
          { t: 'flag', key: FLAGS.DANZIG_CONCEDED, value: true },
          { t: 'stability', nation: 'POL', delta: -12 },
          { t: 'warSupport', nation: 'POL', delta: -20 },
          { t: 'relations', a: 'GER', b: 'POL', delta: 25 },
          { t: 'tension', delta: 2 },
          {
            t: 'chronicle',
            text: 'Warsaw yielded Danzig under the guns. In our history the Republic refused and fought.',
            divergence: true,
          },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'Warsaw yields',
            body: 'The Polish government accepts the cession of Danzig and requests an immediate cessation of hostilities.',
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. French pressure to hold the line.
  // -------------------------------------------------------------------------
  {
    id: 'pol-french-pressure',
    title: 'The Gamelin Cable',
    nation: 'POL',
    fires: {
      t: 'and',
      c: [
        { t: 'atWar', a: 'GER', b: 'POL' },
        { t: 'atWar', a: 'FRA', b: 'GER' },
        { t: 'alive', nation: 'POL' },
        { t: 'controls', nation: 'POL', region: 'pol-warsaw' },
      ],
    },
    once: true,
    priority: 6,
    text:
      'CIPHER CABLE, POLISH MILITARY MISSION, PARIS. General Gamelin renews the May ' +
      'convention: the French army will open a general offensive against the German west ' +
      'wall with the bulk of its forces by the fifteenth day of mobilization. Until then ' +
      'Warsaw is asked to hold the line and keep the mass of the German army engaged in ' +
      'the east. The mission notes that French deployment is methodical and that the Saar ' +
      'outposts are lightly held. The General Staff must weigh the promise of Paris against ' +
      'the map: every day forward of the Vistula costs battalions Poland cannot replace.',
    choices: [
      {
        label: 'Hold as the alliance demands',
        detail: 'Keep the army forward and give France no excuse. The cost is paid in men.',
        effects: [
          { t: 'relations', a: 'POL', b: 'FRA', delta: 10 },
          { t: 'warSupport', nation: 'POL', delta: 5 },
          { t: 'armyStrength', nation: 'POL', delta: -4 },
          {
            t: 'report', to: 'FRA', kind: 'diplomatic', title: 'Warsaw holds',
            body: 'The Polish General Staff confirms it will hold forward positions pending the promised offensive in the west.',
          },
        ],
        aiWeight: 3,
      },
      {
        label: 'Fall back on the Romanian bridgehead',
        detail: 'Preserve the army in the southeast corner and trust nothing that is only promised.',
        effects: [
          { t: 'relations', a: 'POL', b: 'FRA', delta: -10 },
          { t: 'relations', a: 'POL', b: 'ROM', delta: 15 },
          { t: 'armyStrength', nation: 'POL', delta: 4 },
          { t: 'stability', nation: 'POL', delta: -3 },
          {
            t: 'chronicle',
            text: 'The Polish high command wrote off the west early and staged its reserves toward the Romanian frontier. In our history the retreat was ordered too late to matter.',
            divergence: true,
          },
          {
            t: 'report', to: 'FRA', kind: 'diplomatic', title: 'Warsaw looks southeast',
            body: 'Polish forces are conserving strength and regrouping toward the Romanian frontier rather than holding forward.',
          },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. The Bzura counterattack opportunity (queued 2 turns after the
  //    forward-defense choice; fires only while Warsaw still holds).
  // -------------------------------------------------------------------------
  {
    id: 'pol-bzura',
    title: 'The Poznań Army\'s Hour',
    nation: 'POL',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: F_FIGHTS_FORWARD },
        { t: 'atWar', a: 'GER', b: 'POL' },
        { t: 'controls', nation: 'POL', region: 'pol-warsaw' },
      ],
    },
    once: true,
    priority: 8,
    text:
      'ARMY POZNAŃ, FIELD HEADQUARTERS. General Kutrzeba reports his army intact and ' +
      'unengaged, bypassed by the German thrusts running east on both flanks. Air ' +
      'reconnaissance shows the German Eighth Army strung along the Bzura with open flanks, ' +
      'its columns racing for Warsaw ahead of their own infantry. Kutrzeba requests freedom ' +
      'of action: a concentrated blow south across the river could cut into the exposed ' +
      'flank and force the enemy to turn back from the capital. The alternative is to slip ' +
      'east by night marches and add his divisions to the Warsaw perimeter while a corridor ' +
      'remains.',
    choices: [
      {
        label: 'Strike south across the Bzura',
        detail: 'Commit the last intact army to the flank attack. The outcome cannot be promised.',
        available: { t: 'controls', nation: 'POL', region: 'pol-warsaw' },
        effects: [
          { t: 'flag', key: F_BZURA_LAUNCHED, value: true },
          { t: 'warSupport', nation: 'POL', delta: 3 },
          {
            t: 'report', to: 'GER', kind: 'front', title: 'Attack on the Bzura',
            body: 'Strong Polish forces have attacked south across the Bzura into the flank of the Eighth Army. The drive on Warsaw is affected.',
          },
        ],
        aiWeight: 3,
      },
      {
        label: 'Slip east to the capital',
        detail: 'March by night, save the divisions, thicken the Warsaw perimeter.',
        available: { t: 'controls', nation: 'POL', region: 'pol-warsaw' },
        effects: [
          { t: 'armyStrength', nation: 'POL', delta: 4 },
          {
            t: 'chronicle',
            text: 'Army Poznań marched east by night and reached Warsaw whole. In our history it turned and struck across the Bzura.',
            divergence: true,
          },
        ],
        aiWeight: 2,
      },
      {
        label: 'The moment has passed',
        detail: 'With the capital gone there is no front to strike for.',
        available: { t: 'not', c: { t: 'controls', nation: 'POL', region: 'pol-warsaw' } },
        effects: [],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. Bzura outcome: success (random roll; sets POLAND_STANDS).
  // -------------------------------------------------------------------------
  {
    id: 'pol-bzura-success',
    title: 'Counterblow on the Bzura',
    nation: 'POL',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: F_BZURA_LAUNCHED },
        { t: 'alive', nation: 'POL' },
        { t: 'eventNotFired', id: 'pol-bzura-failure' },
        { t: 'random', p: 0.45 },
      ],
    },
    once: true,
    priority: 7,
    text:
      'COMMUNIQUE, POLISH GENERAL STAFF. Army Poznań crossed the Bzura on a broad front ' +
      'and broke the German Eighth Army\'s flank guard. Two enemy divisions are reported ' +
      'cut off; the drive on Warsaw has been suspended while German armor turns back west ' +
      'to restore the line. Prisoners and captured guns are moving east. The capital\'s ' +
      'defenders have used the respite to close the perimeter. Foreign correspondents in ' +
      'Warsaw have filed the first reports of a German check in this war, and the General ' +
      'Staff intends that they should not be the last.',
    choices: [
      {
        label: 'Exploit the breach',
        effects: [
          { t: 'flag', key: FLAGS.POLAND_STANDS, value: true },
          { t: 'armyStrength', nation: 'GER', delta: -8 },
          { t: 'armyStrength', nation: 'POL', delta: -4 },
          { t: 'warSupport', nation: 'POL', delta: 10 },
          { t: 'stability', nation: 'POL', delta: 4 },
          { t: 'relations', a: 'POL', b: 'UK', delta: 5 },
          { t: 'relations', a: 'POL', b: 'FRA', delta: 5 },
          {
            t: 'chronicle',
            text: 'On the Bzura the Poznań Army\'s counterblow held. In our history the same attack bought nine days and ended in encirclement; here it stopped the drive on Warsaw.',
            divergence: true,
          },
          {
            t: 'report', to: 'GER', kind: 'front', title: 'Setback on the Bzura',
            body: 'The Eighth Army\'s flank has been broken open. Armored formations are being recalled from the Warsaw axis to restore the situation.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. Bzura outcome: encirclement (the historical result).
  // -------------------------------------------------------------------------
  {
    id: 'pol-bzura-failure',
    title: 'Encirclement on the Bzura',
    nation: 'POL',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: F_BZURA_LAUNCHED },
        { t: 'alive', nation: 'POL' },
        { t: 'eventNotFired', id: 'pol-bzura-success' },
      ],
    },
    once: true,
    priority: 6,
    text:
      'COMMUNIQUE, POLISH GENERAL STAFF. The counterattack across the Bzura gained ground ' +
      'for three days before German armor and aircraft returned in strength. Army Poznań ' +
      'is now fighting encircled between the river and the Vistula, attacked from every ' +
      'side and from the air. Breakout groups are being formed to reach Warsaw through the ' +
      'Kampinos forest by night. The army\'s heavy equipment is to be destroyed in place. ' +
      'The blow bought the capital time to organize its defense; it will be paid for in ' +
      'divisions.',
    choices: [
      {
        label: 'Order the breakout',
        effects: [
          { t: 'armyStrength', nation: 'POL', delta: -10 },
          { t: 'warSupport', nation: 'POL', delta: -6 },
          {
            t: 'chronicle',
            text: 'The Bzura counterattack surprised the invader, bought Warsaw time, and ended in encirclement, much as it did in our history.',
          },
          {
            t: 'report', to: 'GER', kind: 'front', title: 'The Bzura pocket',
            body: 'The Polish counterattack has been contained and the attacking force encircled west of Warsaw. Reduction of the pocket is under way.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. Surrender event (engine convention id). The government-in-exile
  //    decision lives here: choice 1 sets EXILE_POL.
  // -------------------------------------------------------------------------
  {
    id: surrenderEventId('POL'),
    title: 'The Capital Falls',
    nation: 'POL',
    fires: { t: 'flag', key: capitulatedFlag('POL') },
    once: true,
    priority: 9,
    text:
      'WARSAW COMMAND TO ALL STATIONS. The capital\'s food and ammunition are exhausted ' +
      'and the waterworks are destroyed; further resistance in the city means only the ' +
      'destruction of its people. Terms of capitulation for the garrison are being ' +
      'arranged. The question before the President is the state itself. The Romanian ' +
      'frontier remains open tonight and the gold of the Bank of Poland is already across. ' +
      'A government that reaches allied soil keeps Poland at war as a legal fact; a ' +
      'government taken in Warsaw ends it. The constitution provides for succession ' +
      'abroad. There will be no second chance to choose.',
    choices: [
      {
        label: 'The Republic crosses the frontier',
        detail: 'Government, high command, and treasury go into exile. The state continues abroad.',
        effects: [
          { t: 'flag', key: FLAGS.EXILE_POL, value: true },
          { t: 'annex', nation: 'POL', by: 'GER' },
          { t: 'setLeader', nation: 'POL', leader: 'sikorski' },
          { t: 'relations', a: 'POL', b: 'UK', delta: 15 },
          { t: 'relations', a: 'POL', b: 'FRA', delta: 15 },
          {
            t: 'chronicle',
            text: 'The government of the Republic crossed into Romania and re-formed on allied soil. Poland\'s war continued from exile, as it did in our history.',
          },
          {
            t: 'report', to: 'GER', kind: 'front', title: 'Poland capitulates',
            body: 'Organized resistance has ended. The Polish government has escaped abroad and refuses any instrument of surrender.',
          },
          {
            t: 'report', to: 'UK', kind: 'diplomatic', title: 'The Polish government reaches the West',
            body: 'The Polish President, cabinet, and general staff have crossed into Romania with the national gold reserve, bound for allied territory.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Capitulation in place',
        detail: 'The government remains with its people and signs what is put before it.',
        effects: [
          { t: 'annex', nation: 'POL', by: 'GER' },
          {
            t: 'chronicle',
            text: 'No Polish government escaped. In our history the Republic continued from exile; here the state\'s legal thread was cut on the Vistula.',
            divergence: true,
          },
          {
            t: 'report', to: 'GER', kind: 'front', title: 'Poland surrenders',
            body: 'The Polish government has capitulated in Warsaw and signed the instrument of surrender. The campaign is concluded.',
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. The Soviet share of a partitioned Poland (only under the pact).
  // -------------------------------------------------------------------------
  {
    id: 'pol-soviet-occupation',
    title: 'The Eastern Protocol',
    nation: 'global',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: FLAGS.PACT_MR },
        { t: 'flag', key: capitulatedFlag('POL') },
        { t: 'alive', nation: 'SOV' },
        { t: 'alive', nation: 'GER' },
        { t: 'not', c: { t: 'atWar', a: 'GER', b: 'SOV' } },
      ],
    },
    once: true,
    priority: 7,
    text:
      'MOSCOW AND BERLIN, JOINT COMMUNIQUE. Citing the disintegration of the Polish state ' +
      'and the need to protect the kindred populations of the eastern voivodeships, Soviet ' +
      'forces have crossed the Polish frontier along its whole length. Demarcation follows ' +
      'the line agreed in the supplementary protocol of the non-aggression treaty. German ' +
      'commands have been instructed to withdraw west of the line and to transfer occupied ' +
      'localities according to schedule. The two governments declare the Polish question ' +
      'settled.',
    choices: [
      {
        label: 'Executed under the protocol',
        effects: [
          { t: 'cedeRegion', region: 'pol-east', to: 'SOV' },
          { t: 'relations', a: 'GER', b: 'SOV', delta: 5 },
          { t: 'tension', delta: 3 },
          {
            t: 'chronicle',
            text: 'Poland was partitioned along the protocol line, the fourth partition in its history, as in ours.',
          },
          {
            t: 'report', to: 'SOV', kind: 'diplomatic', title: 'The eastern voivodeships secured',
            body: 'Soviet administration is established east of the demarcation line agreed with Berlin.',
          },
          {
            t: 'report', to: 'GER', kind: 'diplomatic', title: 'Demarcation completed',
            body: 'Transfer of localities east of the agreed line to Soviet administration is complete.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 8. Resistance: the Underground State.
  // -------------------------------------------------------------------------
  {
    id: 'pol-underground-state',
    title: 'The Underground State',
    nation: 'POL',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: capitulatedFlag('POL') },
        { t: 'controls', nation: 'GER', region: 'pol-warsaw' },
      ],
    },
    once: true,
    priority: 6,
    text:
      'DEPOT REPORT, FORWARDED VIA BUDAPEST. The occupation administration governs the ' +
      'cities by curfew and the countryside not at all. Officer cadres who escaped the ' +
      'September catastrophe are organizing in the General Government: courts, couriers, ' +
      'clandestine schooling, an armed wing under central discipline. What they ask from ' +
      'the government abroad is direction and money. Two roads are proposed. Build slowly, ' +
      'a secret state beneath the occupation, with its intelligence sold to the Allies at ' +
      'full price. Or strike now, while the garrisons are thin and the population\'s anger ' +
      'is fresh.',
    choices: [
      {
        label: 'Build the secret state',
        detail: 'Patience: courts, schools, intelligence, and an army that waits for its hour.',
        effects: [
          { t: 'flag', key: F_UNDERGROUND, value: true },
          { t: 'spyNetwork', owner: 'POL', target: 'GER', delta: 20 },
          { t: 'relations', a: 'POL', b: 'UK', delta: 5 },
          {
            t: 'chronicle',
            text: 'An underground state grew beneath the occupation: courts, schools, and an army in the shadows, as in our history.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Strike at once',
        detail: 'Sabotage and open attacks now, whatever the reprisals cost.',
        effects: [
          { t: 'armyStrength', nation: 'GER', delta: -3 },
          { t: 'stability', nation: 'GER', delta: -2 },
          { t: 'tension', delta: 2 },
          { t: 'spyNetwork', owner: 'POL', target: 'GER', delta: 5 },
          {
            t: 'chronicle',
            text: 'The early rising was broken in weeks and the survivors went deeper. In our history the underground husbanded its strength for years.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 9. Resistance: the capital rises when the eastern front draws near.
  // -------------------------------------------------------------------------
  {
    id: 'pol-home-army-rising',
    title: 'Warsaw Rises',
    nation: 'POL',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: F_UNDERGROUND },
        { t: 'controls', nation: 'GER', region: 'pol-warsaw' },
        { t: 'atWar', a: 'GER', b: 'SOV' },
        { t: 'strengthRatio', a: 'SOV', b: 'GER', atLeast: 1.15 },
        { t: 'turnAtLeast', n: 66 },
      ],
    },
    once: true,
    priority: 7,
    text:
      'HOME ARMY COMMAND TO LONDON. The eastern front can be heard from the city. The ' +
      'occupier\'s rear services are burning files and the first garrison units have begun ' +
      'to withdraw across the bridges. The Home Army in the capital musters forty thousand ' +
      'sworn soldiers with weapons for one in four. If the city frees itself before the ' +
      'Red Army arrives, Poland\'s administration will greet them as hosts, not ' +
      'petitioners. If the front stops on the river, the city will fight alone. Command ' +
      'requests a decision: rise now, or keep the army hidden and intact.',
    choices: [
      {
        label: 'Rise now',
        detail: 'Take the city before the Red Army does, and hold it whatever comes.',
        effects: [
          { t: 'flag', key: F_RISING, value: true },
          { t: 'armyStrength', nation: 'GER', delta: -6 },
          { t: 'warSupport', nation: 'GER', delta: -3 },
          { t: 'tension', delta: 2 },
          {
            t: 'chronicle',
            text: 'Warsaw rose against the occupation as the front drew near, and the city paid for every street.',
          },
          {
            t: 'report', to: 'SOV', kind: 'front', title: 'Warsaw in revolt',
            body: 'The Polish Home Army has risen in Warsaw and is fighting the German garrison ahead of your advance.',
          },
          {
            t: 'report', to: 'GER', kind: 'front', title: 'Rising in Warsaw',
            body: 'Armed insurgents have seized districts of Warsaw. Rear-area units are engaged; the eastern front rail hub is threatened.',
          },
        ],
        aiWeight: 3,
      },
      {
        label: 'Keep the army hidden',
        detail: 'The underground survives to speak for Poland later, whoever liberates the ruins.',
        effects: [
          { t: 'spyNetwork', owner: 'POL', target: 'GER', delta: 10 },
          {
            t: 'chronicle',
            text: 'The Home Army held its hand and Warsaw was not burned house by house. In our history the city rose and was destroyed.',
            divergence: true,
          },
        ],
        aiWeight: 2,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 10. The Cipher Bureau's gift.
  // -------------------------------------------------------------------------
  {
    id: 'pol-enigma',
    title: 'The Gift at Pyry',
    nation: 'POL',
    fires: {
      t: 'and',
      c: [
        { t: 'alive', nation: 'POL' },
        { t: 'alive', nation: 'UK' },
        { t: 'tension', atLeast: 45 },
        { t: 'relations', a: 'GER', b: 'POL', below: -30 },
        { t: 'not', c: { t: 'flag', key: FLAGS.DANZIG_CONCEDED } },
        { t: 'turnAtLeast', n: 15 },
      ],
    },
    once: true,
    priority: 5,
    text:
      'MEMORANDUM, CIPHER BUREAU, WARSAW. Since 1932 the Bureau\'s mathematicians have ' +
      'read the German machine cipher, and the reconstructed Enigma with its card ' +
      'catalogues stands ready in the Kabaty woods. War will come faster than the Bureau ' +
      'can exploit what it holds. The chiefs of French and British intelligence have ' +
      'accepted an invitation to Pyry. The question for the General Staff: hand over the ' +
      'machines, the methods, and the mathematics entire, and arm allies who may yet fail ' +
      'us, or keep the Republic\'s one decisive secret at home and sell its product ' +
      'piecemeal.',
    choices: [
      {
        label: 'Hand over everything',
        detail: 'Machines, methods, mathematicians\' notes. The Allies must be able to read Berlin without us.',
        effects: [
          { t: 'spyNetwork', owner: 'UK', target: 'GER', delta: 15 },
          { t: 'spyNetwork', owner: 'FRA', target: 'GER', delta: 10 },
          { t: 'relations', a: 'POL', b: 'UK', delta: 10 },
          { t: 'relations', a: 'POL', b: 'FRA', delta: 10 },
          {
            t: 'chronicle',
            text: 'Weeks before the war, Polish cryptologists handed their reconstruction of the German machine cipher to Britain and France, as in our history.',
          },
        ],
        aiWeight: 4,
      },
      {
        label: 'Keep the Bureau\'s secret',
        detail: 'The one card Poland holds alone is not given away.',
        effects: [
          { t: 'spyNetwork', owner: 'POL', target: 'GER', delta: 15 },
          {
            t: 'chronicle',
            text: 'The Cipher Bureau kept its secret. In our history the gift at Pyry seeded everything the Allies later read.',
            divergence: true,
          },
        ],
        aiWeight: 1,
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 11-12. Succession events (queued by covert.ts via leaders.ts eventIds).
  // -------------------------------------------------------------------------
  {
    id: 'pol-succession-sikorski',
    title: 'Sikorski Takes the Helm',
    nation: 'POL',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: leaderDeadFlag('POL') },
        { t: 'leaderIs', nation: 'POL', leader: 'sikorski' },
      ],
    },
    once: true,
    priority: 5,
    text:
      'COMMUNIQUE OF THE COUNCIL OF MINISTERS. The Marshal of Poland is dead. Under the ' +
      'April constitution authority has passed, and the President has entrusted the ' +
      'direction of the government and the high command to General Władysław Sikorski. ' +
      'The General, long excluded from command by the late regime, assumes office with a ' +
      'pledge to the army: modernization before prestige, and no Polish soldier spent for ' +
      'another power\'s convenience. The Sanacja ministers have tendered resignations. ' +
      'Foreign missions are instructed to convey that the policy of the Republic, and its ' +
      'alliances, stand unchanged.',
    choices: [
      {
        label: 'The government reforms',
        effects: [
          { t: 'stability', nation: 'POL', delta: -5 },
          { t: 'warSupport', nation: 'POL', delta: 5 },
          {
            t: 'chronicle',
            text: 'Command in Warsaw passed to Sikorski, the outsider the prewar regime had shelved. No such succession occurred in our history\'s Poland.',
            divergence: true,
          },
          {
            t: 'report', to: 'GER', kind: 'intel', title: 'Change of command in Warsaw',
            body: 'General Sikorski has assumed the Polish premiership and supreme command following the Marshal\'s death.',
          },
        ],
      },
    ],
  },
  {
    id: 'pol-succession-sosnkowski',
    title: 'Sosnkowski Assumes Command',
    nation: 'POL',
    fires: {
      t: 'and',
      c: [
        { t: 'flag', key: leaderDeadFlag('POL') },
        { t: 'leaderIs', nation: 'POL', leader: 'sosnkowski' },
      ],
    },
    once: true,
    priority: 5,
    text:
      'COMMUNIQUE OF THE COUNCIL OF MINISTERS. The Marshal of Poland is dead. The ' +
      'President has appointed General Kazimierz Sosnkowski Commander-in-Chief and charged ' +
      'him with the continuity of the state\'s defense. Piłsudski\'s oldest comrade takes ' +
      'up the baton amid open grief in the army and quiet relief among the opposition, ' +
      'which he has never persecuted. His first order confirms every standing operational ' +
      'directive; his second dissolves the late Marshal\'s personal chancellery. The ' +
      'government asks the country for calm and the garrisons for discipline.',
    choices: [
      {
        label: 'The state endures',
        effects: [
          { t: 'stability', nation: 'POL', delta: -8 },
          { t: 'warSupport', nation: 'POL', delta: 3 },
          {
            t: 'chronicle',
            text: 'The baton passed to Sosnkowski on the Marshal\'s death, a succession our history never staged.',
            divergence: true,
          },
          {
            t: 'report', to: 'GER', kind: 'intel', title: 'Change of command in Warsaw',
            body: 'General Sosnkowski has been named Polish Commander-in-Chief following the Marshal\'s death.',
          },
        ],
      },
    ],
  },
];
