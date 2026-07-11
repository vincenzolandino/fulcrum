// Heads of state/government as of January 1938 for all 43 nations, plus
// succession tables for the majors. Succession fires via covert.ts when a
// leader is killed or removed: a weighted pick chooses the successor, applies
// the AI patch, and queues the eventId if the content pack defines it.

import type { AIPersonality, LeaderId, NationId } from '../engine/types';

export interface Leader {
  id: LeaderId;
  nation: NationId;
  name: string;
  title: string;
  bio: string;
}

export interface SuccessionOption {
  leader: LeaderId;
  weight: number;
  aiPatch: Partial<AIPersonality>;
  eventId?: string;
}

const L = (id: LeaderId, nation: NationId, name: string, title: string, bio: string): Leader =>
  ({ id, nation, name, title, bio });

const LEADER_LIST: Leader[] = [
  // ---- Majors, sitting in 1938 ----
  L('hitler', 'GER', 'Adolf Hitler', 'Führer and Reich Chancellor',
    'Absolute master of the German state since 1934, bent on overturning Versailles and carving out an empire in the East.'),
  L('daladier', 'FRA', 'Édouard Daladier', 'Président du Conseil',
    'Radical politician and three-time premier, caught between a hollowed-out army and a country desperate to avoid another war.'),
  L('chamberlain', 'UK', 'Neville Chamberlain', 'Prime Minister',
    'Methodical Birmingham businessman turned statesman, convinced that patient negotiation can keep the dictators in their box.'),
  L('stalin', 'SOV', 'Joseph Stalin', 'General Secretary',
    'The Vozhd. Has just finished shooting most of his own officer corps and trusts no one, at home or abroad.'),
  L('mussolini', 'ITA', 'Benito Mussolini', 'Il Duce',
    'Founder of Fascism, dreaming of a new Roman Empire across the Mediterranean while his industry lags a war behind.'),
  L('konoe', 'JAP', 'Fumimaro Konoe', 'Prime Minister',
    'Aristocratic premier presiding uneasily over an army that makes its own foreign policy in China.'),
  L('roosevelt', 'USA', 'Franklin D. Roosevelt', 'President',
    'Second-term president fighting the Depression, hemmed in by a Congress and public that want no part of foreign wars.'),
  L('rydz-smigly', 'POL', 'Edward Rydz-Śmigły', 'Marshal of Poland',
    'Piłsudski\'s heir, commander of an army long on courage and short on tanks, wedged between two hungry giants.'),
  L('chiang', 'CHI', 'Chiang Kai-shek', 'Generalissimo',
    'Leader of the Nationalist government, trading space for time against Japan while keeping one eye on the Communists.'),

  // ---- Successors (majors) ----
  L('goering', 'GER', 'Hermann Göring', 'Reichsmarschall',
    'Luftwaffe chief and self-styled Renaissance prince; ambitious, corrupt, and marginally more pragmatic than his master.'),
  L('himmler', 'GER', 'Heinrich Himmler', 'Reichsführer-SS',
    'The policeman of the movement; under him the regime would become purer, colder, and more murderous still.'),
  L('beck-junta', 'GER', 'Ludwig Beck', 'Head of the Military Council',
    'Former chief of the general staff, fronting a junta of conservative officers who want Germany strong but not suicidal.'),
  L('molotov', 'SOV', 'Vyacheslav Molotov', 'Chairman of the Council of People\'s Commissars',
    'Stalin\'s stone-faced negotiator; would run the Union as a committee of survivors, cautious and cold.'),
  L('zhukov-junta', 'SOV', 'Georgy Zhukov', 'Chairman of the Military Committee',
    'The army\'s hardest general at the head of a soldiers\' committee, rebuilding the purged officer corps first.'),
  L('churchill', 'UK', 'Winston Churchill', 'Prime Minister',
    'The wilderness prophet of rearmament, called at last to make good on a decade of warnings.'),
  L('halifax', 'UK', 'Lord Halifax', 'Prime Minister',
    'The Holy Fox; would sooner treat with Berlin than bleed the Empire white.'),
  L('badoglio', 'ITA', 'Pietro Badoglio', 'Head of Government',
    'Marshal of Italy, no fascist zealot; would take Italy out of any losing war he could.'),
  L('ciano', 'ITA', 'Galeazzo Ciano', 'Duce',
    'Mussolini\'s son-in-law and foreign minister, vain and opportunistic, with fewer illusions about German friendship.'),
  L('tojo', 'JAP', 'Hideki Tōjō', 'Prime Minister',
    'The Kwantung Army\'s razor; total mobilization, total war, no retreat.'),
  L('yonai', 'JAP', 'Mitsumasa Yonai', 'Prime Minister',
    'Admiral of the treaty school who thinks a war against America and Britain is a war Japan loses.'),
  L('reynaud', 'FRA', 'Paul Reynaud', 'Président du Conseil',
    'Combative conservative who backed De Gaulle\'s armored heresies when nobody listened.'),
  L('petain', 'FRA', 'Philippe Pétain', 'Chef de l\'État',
    'The hero of Verdun grown old; order, hierarchy, and an armistice if it comes to that.'),
  L('garner', 'USA', 'John Nance Garner', 'President',
    'Texan vice president, more conservative and more isolationist than the man he would replace.'),
  L('hull', 'USA', 'Cordell Hull', 'President',
    'The long-serving secretary of state; free trade, international law, and a long memory for insults.'),
  L('sikorski', 'POL', 'Władysław Sikorski', 'Prime Minister',
    'Modernizing general sidelined by the Sanacja regime; would fight on from anywhere, with anyone.'),
  L('sosnkowski', 'POL', 'Kazimierz Sosnkowski', 'Commander-in-Chief',
    'Piłsudski\'s old comrade, a careful soldier who husbands what little Poland has.'),
  L('chen-cheng', 'CHI', 'Chen Cheng', 'Generalissimo',
    'Chiang\'s most trusted field commander; would keep Free China fighting from the interior.'),
  L('wang-jingwei', 'CHI', 'Wang Jingwei', 'Head of Government',
    'The left-Kuomintang veteran who concluded China cannot win, and that peace with Japan at any price is still peace.'),

  // ---- Minor-nation heads of state, 1938 ----
  L('schuschnigg', 'AUS', 'Kurt Schuschnigg', 'Chancellor',
    'Austrofascist chancellor playing a losing hand against Berlin, hoping a plebiscite can save the republic.'),
  L('benes', 'CZE', 'Edvard Beneš', 'President',
    'Co-founder of the state, banking on French treaties and Sudeten fortifications to hold the line.'),
  L('horthy', 'HUN', 'Miklós Horthy', 'Regent',
    'Admiral without a sea, regent without a king, determined to undo Trianon by any patron available.'),
  L('carol', 'ROM', 'Carol II', 'King',
    'Playboy monarch tightening a royal dictatorship while everyone from Berlin to Moscow eyes his oil.'),
  L('boris', 'BUL', 'Boris III', 'Tsar',
    'Cautious tsar of a revisionist kingdom, forever weighing German offers against Balkan risks.'),
  L('paul', 'YUG', 'Prince Paul', 'Prince Regent',
    'Reluctant regent for the boy-king Peter, balancing a fractious kingdom between the powers.'),
  L('metaxas', 'GRE', 'Ioannis Metaxas', 'Prime Minister',
    'General and dictator of the 4th of August regime; authoritarian at home, stubbornly independent abroad.'),
  L('zog', 'ALB', 'Zog I', 'King',
    'Chieftain turned king, financing his court with Italian loans he knows have strings attached.'),
  L('ataturk', 'TUR', 'Mustafa Kemal Atatürk', 'President',
    'Father of the republic, ailing but adamant that Turkey stays out of the next European catastrophe.'),
  L('leopold', 'BEL', 'Leopold III', 'King',
    'Young king committed to armed independence, trusting neither French promises nor German ones.'),
  L('wilhelmina', 'NED', 'Wilhelmina', 'Queen',
    'Iron-willed queen of a trading nation whose wealth lies exposed in the East Indies.'),
  L('christian', 'DEN', 'Christian X', 'King',
    'Rider-king of a small flat country with a very large neighbor.'),
  L('haakon', 'NOR', 'Haakon VII', 'King',
    'Elected king of a seafaring democracy that believes neutrality kept it safe once and will again.'),
  L('hansson', 'SWE', 'Per Albin Hansson', 'Prime Minister',
    'Social democrat building the folkhemmet, armed neutrality its foreign policy.'),
  L('kallio', 'FIN', 'Kyösti Kallio', 'President',
    'Farmer-president of a young republic that trusts its forests and its reservists.'),
  L('pats', 'EST', 'Konstantin Päts', 'President',
    'Authoritarian president of the smallest Baltic state, hoping the storm passes north or south.'),
  L('ulmanis', 'LAT', 'Kārlis Ulmanis', 'President',
    'Agronomist-dictator of Latvia, neutral by necessity.'),
  L('smetona', 'LIT', 'Antanas Smetona', 'President',
    'Nationalist president squeezed between Poland over Vilnius and Germany over Memel.'),
  L('motta', 'SUI', 'Giuseppe Motta', 'Federal Councillor',
    'Veteran foreign minister of a confederation whose neutrality is its export product.'),
  L('franco', 'ESP', 'Francisco Franco', 'Caudillo',
    'Generalissimo of the Nationalist rising, grinding toward victory in a ruined country.'),
  L('salazar', 'POR', 'António Salazar', 'Prime Minister',
    'Professor-dictator of the Estado Novo; ledgers balanced, borders quiet, England\'s oldest ally.'),
  L('devalera', 'IRE', 'Éamon de Valera', 'Taoiseach',
    'Revolutionary turned statesman, guarding a hard-won neutrality against his nearest neighbor\'s wars.'),
  L('mackenzie-king', 'CAN', 'William Lyon Mackenzie King', 'Prime Minister',
    'Careful, séance-holding premier who will follow Britain to war only with Parliament\'s blessing.'),
  L('cardenas', 'MEX', 'Lázaro Cárdenas', 'President',
    'Reforming general about to nationalize the oil fields and dare the powers to object.'),
  L('vargas', 'BRA', 'Getúlio Vargas', 'President',
    'Author of the Estado Novo, auctioning Brazilian alignment to the highest bidder.'),
  L('lyons', 'ANZ', 'Joseph Lyons', 'Prime Minister',
    'Tasmanian premier of a dominion whose defense begins, it is said, at Singapore.'),
  L('linlithgow', 'IND', 'Lord Linlithgow', 'Viceroy',
    'Viceroy of the Raj, prepared to commit India\'s millions to a war Indians were never asked about.'),
  L('reza-shah', 'PER', 'Reza Shah Pahlavi', 'Shah',
    'Soldier-founder of the Pahlavi state, modernizing at speed while courting Berlin to offset London and Moscow.'),
  L('ghazi', 'IRQ', 'Ghazi I', 'King',
    'Young nationalist king of a restless mandate-born kingdom sitting on an ocean of oil.'),
  L('farouk', 'EGY', 'Farouk I', 'King',
    'Teenage king of an Egypt nominally sovereign, practically garrisoned by Britain astride the Canal.'),
  L('hertzog', 'SAF', 'J. B. M. Hertzog', 'Prime Minister',
    'Afrikaner nationalist premier who sees no South African quarrel in Europe\'s wars.'),
  L('phahon', 'SIA', 'Phraya Phahon', 'Prime Minister',
    'Soldier-premier of the constitutional era, steering a small kingdom between empires.'),
  L('puyi', 'MAN', 'Puyi', 'Emperor of Manchukuo',
    'The last Qing emperor, restored to a throne that answers in every particular to the Kwantung Army.'),
  L('choibalsan', 'MON', 'Khorloogiin Choibalsan', 'Marshal',
    'Stalin\'s faithful echo in Ulaanbaatar, conducting his own miniature purge.'),
];

export const LEADERS: Record<LeaderId, Leader> = Object.fromEntries(
  LEADER_LIST.map((l) => [l.id, l]),
);

const succEvent = (nation: NationId, leader: LeaderId): string =>
  `${nation.toLowerCase()}-succession-${leader}`;

export const SUCCESSIONS: Record<NationId, SuccessionOption[]> = {
  GER: [
    { leader: 'goering', weight: 40, aiPatch: { aggression: 0.7, ideologyZeal: 0.7 }, eventId: succEvent('GER', 'goering') },
    { leader: 'himmler', weight: 25, aiPatch: { aggression: 0.95, ideologyZeal: 1.0 }, eventId: succEvent('GER', 'himmler') },
    { leader: 'beck-junta', weight: 35, aiPatch: { aggression: 0.3, ideologyZeal: 0.2, focus: 'defense' }, eventId: succEvent('GER', 'beck-junta') },
  ],
  SOV: [
    { leader: 'molotov', weight: 55, aiPatch: { aggression: 0.4, opportunism: 0.7 }, eventId: succEvent('SOV', 'molotov') },
    { leader: 'zhukov-junta', weight: 45, aiPatch: { aggression: 0.6, ideologyZeal: 0.3, focus: 'defense' }, eventId: succEvent('SOV', 'zhukov-junta') },
  ],
  UK: [
    { leader: 'churchill', weight: 70, aiPatch: { aggression: 0.5, riskTolerance: 0.7, focus: 'defense' }, eventId: succEvent('UK', 'churchill') },
    { leader: 'halifax', weight: 30, aiPatch: { aggression: 0.1, riskTolerance: 0.2, focus: 'defense' }, eventId: succEvent('UK', 'halifax') },
  ],
  ITA: [
    { leader: 'badoglio', weight: 55, aiPatch: { aggression: 0.2, ideologyZeal: 0.1, focus: 'defense' }, eventId: succEvent('ITA', 'badoglio') },
    { leader: 'ciano', weight: 45, aiPatch: { aggression: 0.4, opportunism: 0.9 }, eventId: succEvent('ITA', 'ciano') },
  ],
  JAP: [
    { leader: 'tojo', weight: 60, aiPatch: { aggression: 0.95, ideologyZeal: 0.9 }, eventId: succEvent('JAP', 'tojo') },
    { leader: 'yonai', weight: 40, aiPatch: { aggression: 0.4, focus: 'defense' }, eventId: succEvent('JAP', 'yonai') },
  ],
  FRA: [
    { leader: 'reynaud', weight: 55, aiPatch: { aggression: 0.35, riskTolerance: 0.5 }, eventId: succEvent('FRA', 'reynaud') },
    { leader: 'petain', weight: 45, aiPatch: { aggression: 0.05, riskTolerance: 0.1, focus: 'defense' }, eventId: succEvent('FRA', 'petain') },
  ],
  USA: [
    { leader: 'garner', weight: 60, aiPatch: { aggression: 0.1 }, eventId: succEvent('USA', 'garner') },
    { leader: 'hull', weight: 40, aiPatch: { aggression: 0.15 }, eventId: succEvent('USA', 'hull') },
  ],
  POL: [
    { leader: 'sikorski', weight: 60, aiPatch: { aggression: 0.25, focus: 'defense' }, eventId: succEvent('POL', 'sikorski') },
    { leader: 'sosnkowski', weight: 40, aiPatch: { aggression: 0.2, focus: 'defense' }, eventId: succEvent('POL', 'sosnkowski') },
  ],
  CHI: [
    { leader: 'chen-cheng', weight: 60, aiPatch: { focus: 'defense' }, eventId: succEvent('CHI', 'chen-cheng') },
    { leader: 'wang-jingwei', weight: 40, aiPatch: { aggression: 0.05, focus: 'consolidation' }, eventId: succEvent('CHI', 'wang-jingwei') },
  ],
};
