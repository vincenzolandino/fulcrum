// The 43 nations of January 1938, with armies, relations, claims, pacts, and
// AI personalities seeded from history.
//
// NOTE for setup.ts: Japan starts AT WAR with China (the Second Sino-Japanese
// War, burning since July 1937). The War object lives in GameState, which
// setup.ts builds; here the conflict is encoded as JAP claims on the Chinese
// coastal regions plus JAP-CHI relations of -80. setup.ts must create
// { attackers: ['JAP', 'MAN'], defenders: ['CHI'], startTurn: 0 }.

import type {
  AIPersonality,
  Army,
  Government,
  Faction,
  LeaderId,
  Nation,
  NationId,
  Pact,
  RegionId,
  TechTrack,
} from '../engine/types';
import { INITIAL_CONTROL, REGIONS } from './regions';

export const NATION_IDS: NationId[] = [
  'GER', 'FRA', 'UK', 'SOV', 'ITA', 'JAP', 'USA', 'POL', 'CHI',
  'AUS', 'CZE', 'HUN', 'ROM', 'BUL', 'YUG', 'GRE', 'ALB', 'TUR',
  'BEL', 'NED', 'DEN', 'NOR', 'SWE', 'FIN', 'EST', 'LAT', 'LIT',
  'SUI', 'ESP', 'POR', 'IRE', 'CAN', 'MEX', 'BRA', 'ANZ', 'IND',
  'PER', 'IRQ', 'EGY', 'SAF', 'SIA', 'MAN', 'MON',
];

export const MAJOR_IDS: NationId[] = ['GER', 'FRA', 'UK', 'SOV', 'ITA', 'JAP', 'USA', 'POL', 'CHI'];

const ZERO_TECH: Record<TechTrack, number> = {
  armor: 0, air: 0, naval: 0, industry: 0, doctrine: 0, secret: 0,
};

const DEFAULT_AI: AIPersonality = {
  aggression: 0.2, riskTolerance: 0.3, ideologyZeal: 0.3, opportunism: 0.3, focus: 'defense',
};

const DEFAULT_ALLOC = { army: 0.3, air: 0.1, navy: 0.1, civilian: 0.5 };
const DEFAULT_STOCKPILE = { oil: 20, steel: 30, food: 50 };

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

/** Build `count` armies for a nation, cycling through the given locations. */
const mkArmies = (
  nation: NationId,
  count: number,
  strength: number,
  equipment: number,
  experience: number,
  locations: RegionId[],
  adjective: string,
): Army[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${nation.toLowerCase()}-army-${i + 1}`,
    name: `${adjective} ${ORDINALS[i]} Army`,
    strength,
    equipment,
    experience,
    location: locations[i % locations.length],
    posture: 'hold' as const,
    moveTarget: null,
  }));

interface NationSeed {
  id: NationId;
  name: string;
  adjective: string;
  color: string;
  capital: RegionId;
  government: Government;
  faction: Faction;
  puppetOf?: NationId;
  armyCount: number;
  armyStrength: number;
  armyEquipment: number;
  armyExperience?: number;
  armyLocations: RegionId[];
  navy?: number;
  air?: number;
  manpower: number;
  stability: number;
  warSupport?: number;
  stockpile?: { oil: number; steel: number; food: number };
  alloc?: { army: number; air: number; navy: number; civilian: number };
  claims?: RegionId[];
  guarantees?: NationId[];
  spy?: Record<NationId, number>;
  tech?: Partial<Record<TechTrack, number>>;
  leader: LeaderId;
  ai?: Partial<AIPersonality>;
}

const SEEDS: NationSeed[] = [
  // ---------------- Majors ----------------
  {
    id: 'GER', name: 'Germany', adjective: 'German', color: '#565661',
    capital: 'ger-berlin', government: 'fascist', faction: 'axis',
    armyCount: 8, armyStrength: 80, armyEquipment: 75, armyExperience: 25,
    armyLocations: ['ger-berlin', 'ger-ruhr', 'ger-rhineland', 'ger-bavaria', 'ger-saxony', 'ger-prussia', 'ger-berlin', 'ger-prussia'],
    navy: 120, air: 400, manpower: 6000, stability: 70, warSupport: 60,
    stockpile: { oil: 30, steel: 100, food: 80 },
    alloc: { army: 0.45, air: 0.25, navy: 0.1, civilian: 0.2 },
    claims: ['aus-austria', 'cze-sudetenland', 'pol-danzig'],
    spy: { AUS: 40, CZE: 25 },
    tech: { armor: 2, air: 2, naval: 1, industry: 2, doctrine: 2 },
    leader: 'hitler',
    ai: { aggression: 0.9, riskTolerance: 0.7, ideologyZeal: 0.9, opportunism: 0.6, focus: 'expansion' },
  },
  {
    id: 'FRA', name: 'France', adjective: 'French', color: '#4a6fa5',
    capital: 'fra-paris', government: 'democracy', faction: 'allies',
    armyCount: 7, armyStrength: 75, armyEquipment: 65, armyExperience: 10,
    armyLocations: ['fra-paris', 'fra-north', 'fra-alsace', 'fra-alsace', 'fra-south', 'fra-algeria', 'fra-paris'],
    navy: 300, air: 250, manpower: 5000, stability: 55, warSupport: 30,
    stockpile: { oil: 50, steel: 70, food: 80 },
    alloc: { army: 0.35, air: 0.15, navy: 0.1, civilian: 0.4 },
    guarantees: ['BEL'],
    spy: { GER: 15 },
    tech: { armor: 2, air: 1, naval: 2, industry: 2, doctrine: 1 },
    leader: 'daladier',
    ai: { aggression: 0.15, riskTolerance: 0.2, ideologyZeal: 0.3, opportunism: 0.3, focus: 'defense' },
  },
  {
    id: 'UK', name: 'United Kingdom', adjective: 'British', color: '#b0574f',
    capital: 'uk-london', government: 'democracy', faction: 'allies',
    armyCount: 4, armyStrength: 80, armyEquipment: 70, armyExperience: 15,
    armyLocations: ['uk-london', 'uk-southeast', 'uk-midlands', 'uk-scotland'],
    navy: 900, air: 300, manpower: 3500, stability: 75, warSupport: 30,
    stockpile: { oil: 80, steel: 90, food: 60 },
    alloc: { army: 0.25, air: 0.25, navy: 0.3, civilian: 0.2 },
    guarantees: ['BEL'],
    spy: { GER: 15, ITA: 10 },
    tech: { armor: 1, air: 2, naval: 3, industry: 2, doctrine: 1 },
    leader: 'chamberlain',
    ai: { aggression: 0.2, riskTolerance: 0.3, ideologyZeal: 0.3, opportunism: 0.4, focus: 'defense' },
  },
  {
    id: 'SOV', name: 'Soviet Union', adjective: 'Soviet', color: '#b3403f',
    capital: 'sov-moscow', government: 'communist', faction: 'comintern',
    armyCount: 12, armyStrength: 70, armyEquipment: 50, armyExperience: 10,
    armyLocations: [
      'sov-moscow', 'sov-leningrad', 'sov-ukraine', 'sov-byelorussia', 'sov-caucasus', 'sov-urals',
      'sov-siberia', 'sov-fareast', 'sov-fareast', 'sov-ukraine', 'sov-moscow', 'sov-centralasia',
    ],
    navy: 80, air: 350, manpower: 16000, stability: 55, warSupport: 50, // stability 55: the purges
    stockpile: { oil: 120, steel: 100, food: 90 },
    alloc: { army: 0.45, air: 0.2, navy: 0.05, civilian: 0.3 },
    claims: ['pol-east', 'est-tallinn', 'lat-riga', 'lit-kaunas', 'fin-karelia'],
    spy: { GER: 20, UK: 15, JAP: 20 }, // Sorge in Tokyo
    tech: { armor: 2, air: 1, naval: 1, industry: 2, doctrine: 0 }, // doctrine 0: the purges
    leader: 'stalin',
    ai: { aggression: 0.5, riskTolerance: 0.7, ideologyZeal: 0.6, opportunism: 0.8, focus: 'expansion' },
  },
  {
    id: 'ITA', name: 'Italy', adjective: 'Italian', color: '#7d8a56',
    capital: 'ita-rome', government: 'fascist', faction: 'axis',
    armyCount: 6, armyStrength: 65, armyEquipment: 55, armyExperience: 20,
    armyLocations: ['ita-rome', 'ita-north', 'ita-north', 'ita-south', 'ita-sicily', 'ita-libya'],
    navy: 250, air: 200, manpower: 3500, stability: 65, warSupport: 50,
    stockpile: { oil: 25, steel: 40, food: 50 },
    alloc: { army: 0.4, air: 0.15, navy: 0.15, civilian: 0.3 },
    claims: ['alb-albania'],
    spy: { YUG: 15, GRE: 10 },
    tech: { armor: 1, air: 1, naval: 2, industry: 1, doctrine: 1 },
    leader: 'mussolini',
    ai: { aggression: 0.7, riskTolerance: 0.6, ideologyZeal: 0.7, opportunism: 0.85, focus: 'expansion' },
  },
  {
    id: 'JAP', name: 'Japan', adjective: 'Japanese', color: '#9e7b4f',
    capital: 'jap-tokyo', government: 'authoritarian', faction: 'axis',
    armyCount: 8, armyStrength: 75, armyEquipment: 65, armyExperience: 40,
    // Expeditionary armies staged in Korea and allied Manchukuo for the China war.
    armyLocations: ['jap-tokyo', 'jap-home', 'jap-korea', 'jap-korea', 'man-manchuria', 'man-manchuria', 'man-manchuria', 'man-manchuria'],
    navy: 700, air: 300, manpower: 5500, stability: 70, warSupport: 65,
    stockpile: { oil: 60, steel: 50, food: 50 },
    alloc: { army: 0.5, air: 0.15, navy: 0.15, civilian: 0.2 },
    claims: ['chi-north', 'chi-shanghai', 'chi-canton'],
    spy: { CHI: 30 },
    tech: { armor: 1, air: 2, naval: 3, industry: 1, doctrine: 1 },
    leader: 'konoe',
    ai: { aggression: 0.85, riskTolerance: 0.75, ideologyZeal: 0.7, opportunism: 0.7, focus: 'expansion' },
  },
  {
    id: 'USA', name: 'United States', adjective: 'American', color: '#48788f',
    capital: 'usa-east', government: 'democracy', faction: 'neutral',
    armyCount: 4, armyStrength: 60, armyEquipment: 40, armyExperience: 5,
    armyLocations: ['usa-east', 'usa-south', 'usa-west', 'usa-philippines'],
    navy: 800, air: 250, manpower: 10000, stability: 80, warSupport: 20, // warSupport 20: isolationism
    stockpile: { oil: 200, steel: 200, food: 200 },
    alloc: { army: 0.15, air: 0.15, navy: 0.2, civilian: 0.5 },
    tech: { armor: 1, air: 1, naval: 2, industry: 3, doctrine: 0 },
    leader: 'roosevelt',
    ai: { aggression: 0.1, riskTolerance: 0.3, ideologyZeal: 0.2, opportunism: 0.3, focus: 'consolidation' },
  },
  {
    id: 'POL', name: 'Poland', adjective: 'Polish', color: '#a35d6a',
    capital: 'pol-warsaw', government: 'authoritarian', faction: 'neutral',
    armyCount: 4, armyStrength: 70, armyEquipment: 50, armyExperience: 10,
    armyLocations: ['pol-warsaw', 'pol-danzig', 'pol-east', 'pol-warsaw'],
    navy: 10, air: 60, manpower: 2500, stability: 65, warSupport: 50,
    stockpile: { oil: 15, steel: 30, food: 60 },
    alloc: { army: 0.45, air: 0.1, navy: 0.05, civilian: 0.4 },
    tech: { industry: 1, doctrine: 1 },
    leader: 'rydz-smigly',
    ai: { aggression: 0.2, riskTolerance: 0.4, ideologyZeal: 0.4, opportunism: 0.3, focus: 'defense' },
  },
  {
    id: 'CHI', name: 'China', adjective: 'Chinese', color: '#8f8a5a',
    capital: 'chi-chungking', government: 'authoritarian', faction: 'neutral',
    armyCount: 10, armyStrength: 40, armyEquipment: 25, armyExperience: 30,
    armyLocations: [
      'chi-north', 'chi-north', 'chi-shanghai', 'chi-shanghai', 'chi-canton',
      'chi-canton', 'chi-chungking', 'chi-chungking', 'chi-chungking', 'chi-chungking',
    ],
    navy: 5, air: 40, manpower: 25000, stability: 40, warSupport: 60,
    stockpile: { oil: 5, steel: 10, food: 40 },
    alloc: { army: 0.6, air: 0.05, navy: 0, civilian: 0.35 },
    leader: 'chiang',
    ai: { aggression: 0.3, riskTolerance: 0.5, ideologyZeal: 0.4, opportunism: 0.3, focus: 'defense' },
  },

  // ---------------- European minors ----------------
  {
    id: 'AUS', name: 'Austria', adjective: 'Austrian', color: '#c9c1a3',
    capital: 'aus-austria', government: 'authoritarian', faction: 'neutral',
    armyCount: 1, armyStrength: 55, armyEquipment: 40, armyLocations: ['aus-austria'],
    air: 10, manpower: 500, stability: 45, // pre-Anschluss turmoil
    leader: 'schuschnigg',
  },
  {
    id: 'CZE', name: 'Czechoslovakia', adjective: 'Czechoslovak', color: '#6a86a8',
    capital: 'cze-prague', government: 'democracy', faction: 'neutral',
    armyCount: 2, armyStrength: 65, armyEquipment: 60, armyLocations: ['cze-prague', 'cze-sudetenland'],
    air: 50, manpower: 1200, stability: 60,
    tech: { armor: 1, industry: 1 }, // Skoda works
    leader: 'benes',
  },
  {
    id: 'HUN', name: 'Hungary', adjective: 'Hungarian', color: '#8a9264',
    capital: 'hun-budapest', government: 'authoritarian', faction: 'neutral',
    armyCount: 2, armyStrength: 55, armyEquipment: 40, armyLocations: ['hun-budapest'],
    air: 15, manpower: 700, stability: 65,
    claims: ['rom-transylvania'],
    leader: 'horthy',
    ai: { aggression: 0.45, riskTolerance: 0.4, ideologyZeal: 0.5, opportunism: 0.75, focus: 'expansion' },
  },
  {
    id: 'ROM', name: 'Romania', adjective: 'Romanian', color: '#a08e52',
    capital: 'rom-bucharest', government: 'monarchy', faction: 'neutral',
    armyCount: 3, armyStrength: 55, armyEquipment: 35,
    armyLocations: ['rom-bucharest', 'rom-transylvania', 'rom-ploiesti'],
    navy: 5, air: 30, manpower: 1500, stability: 55,
    leader: 'carol',
    ai: { aggression: 0.2, riskTolerance: 0.3, ideologyZeal: 0.3, opportunism: 0.5, focus: 'defense' },
  },
  {
    id: 'BUL', name: 'Bulgaria', adjective: 'Bulgarian', color: '#6f9270',
    capital: 'bul-sofia', government: 'monarchy', faction: 'neutral',
    armyCount: 2, armyStrength: 55, armyEquipment: 35, armyLocations: ['bul-sofia'],
    navy: 3, air: 10, manpower: 500, stability: 60,
    leader: 'boris',
    ai: { aggression: 0.35, riskTolerance: 0.3, ideologyZeal: 0.4, opportunism: 0.6, focus: 'defense' },
  },
  {
    id: 'YUG', name: 'Yugoslavia', adjective: 'Yugoslav', color: '#5d7a9b',
    capital: 'yug-belgrade', government: 'monarchy', faction: 'neutral',
    armyCount: 2, armyStrength: 55, armyEquipment: 35, armyLocations: ['yug-belgrade'],
    navy: 8, air: 30, manpower: 1200, stability: 50,
    leader: 'paul',
  },
  {
    id: 'GRE', name: 'Greece', adjective: 'Greek', color: '#7793ab',
    capital: 'gre-athens', government: 'authoritarian', faction: 'neutral',
    armyCount: 2, armyStrength: 55, armyEquipment: 35, armyLocations: ['gre-athens'],
    navy: 15, air: 15, manpower: 600, stability: 60,
    leader: 'metaxas',
  },
  {
    id: 'ALB', name: 'Albania', adjective: 'Albanian', color: '#9b6b56',
    capital: 'alb-albania', government: 'monarchy', faction: 'neutral',
    armyCount: 1, armyStrength: 40, armyEquipment: 20, armyLocations: ['alb-albania'],
    manpower: 100, stability: 55,
    leader: 'zog',
  },
  {
    id: 'TUR', name: 'Turkey', adjective: 'Turkish', color: '#867358',
    capital: 'tur-ankara', government: 'authoritarian', faction: 'neutral',
    armyCount: 3, armyStrength: 55, armyEquipment: 35, armyLocations: ['tur-ankara', 'tur-istanbul', 'tur-ankara'],
    navy: 25, air: 25, manpower: 1500, stability: 70,
    leader: 'ataturk',
    ai: { aggression: 0.15, riskTolerance: 0.2, ideologyZeal: 0.2, opportunism: 0.5, focus: 'defense' },
  },
  {
    id: 'BEL', name: 'Belgium', adjective: 'Belgian', color: '#a3915f',
    capital: 'bel-brussels', government: 'democracy', faction: 'neutral',
    armyCount: 2, armyStrength: 60, armyEquipment: 45, armyLocations: ['bel-brussels'],
    navy: 3, air: 25, manpower: 600, stability: 65,
    tech: { industry: 1 },
    leader: 'leopold',
  },
  {
    id: 'NED', name: 'Netherlands', adjective: 'Dutch', color: '#c07946',
    capital: 'ned-amsterdam', government: 'democracy', faction: 'neutral',
    armyCount: 2, armyStrength: 55, armyEquipment: 40,
    armyLocations: ['ned-amsterdam', 'ned-east-indies'], // KNIL garrison in the Indies
    navy: 60, air: 25, manpower: 500, stability: 70,
    tech: { industry: 1 },
    leader: 'wilhelmina',
  },
  {
    id: 'DEN', name: 'Denmark', adjective: 'Danish', color: '#b56a6a',
    capital: 'den-copenhagen', government: 'democracy', faction: 'neutral',
    armyCount: 1, armyStrength: 50, armyEquipment: 40, armyLocations: ['den-copenhagen'],
    navy: 10, air: 5, manpower: 300, stability: 75,
    leader: 'christian',
  },
  {
    id: 'NOR', name: 'Norway', adjective: 'Norwegian', color: '#5f8ba3',
    capital: 'nor-oslo', government: 'democracy', faction: 'neutral',
    armyCount: 1, armyStrength: 50, armyEquipment: 40, armyLocations: ['nor-oslo'],
    navy: 15, air: 5, manpower: 300, stability: 75,
    leader: 'haakon',
  },
  {
    id: 'SWE', name: 'Sweden', adjective: 'Swedish', color: '#c2a94e',
    capital: 'swe-stockholm', government: 'democracy', faction: 'neutral',
    armyCount: 2, armyStrength: 60, armyEquipment: 55, armyLocations: ['swe-stockholm'],
    navy: 30, air: 30, manpower: 600, stability: 80,
    tech: { industry: 1 },
    leader: 'hansson',
  },
  {
    id: 'FIN', name: 'Finland', adjective: 'Finnish', color: '#8caab8',
    capital: 'fin-helsinki', government: 'democracy', faction: 'neutral',
    armyCount: 2, armyStrength: 65, armyEquipment: 40, armyLocations: ['fin-helsinki', 'fin-karelia'],
    navy: 5, air: 20, manpower: 400, stability: 70,
    leader: 'kallio',
    ai: { aggression: 0.25, riskTolerance: 0.5, ideologyZeal: 0.3, opportunism: 0.3, focus: 'defense' },
  },
  {
    id: 'EST', name: 'Estonia', adjective: 'Estonian', color: '#728696',
    capital: 'est-tallinn', government: 'authoritarian', faction: 'neutral',
    armyCount: 1, armyStrength: 45, armyEquipment: 30, armyLocations: ['est-tallinn'],
    manpower: 100, stability: 60,
    leader: 'pats',
  },
  {
    id: 'LAT', name: 'Latvia', adjective: 'Latvian', color: '#96625c',
    capital: 'lat-riga', government: 'authoritarian', faction: 'neutral',
    armyCount: 1, armyStrength: 45, armyEquipment: 30, armyLocations: ['lat-riga'],
    manpower: 150, stability: 60,
    leader: 'ulmanis',
  },
  {
    id: 'LIT', name: 'Lithuania', adjective: 'Lithuanian', color: '#7e9560',
    capital: 'lit-kaunas', government: 'authoritarian', faction: 'neutral',
    armyCount: 1, armyStrength: 45, armyEquipment: 30, armyLocations: ['lit-kaunas'],
    manpower: 150, stability: 60,
    leader: 'smetona',
  },
  {
    id: 'SUI', name: 'Switzerland', adjective: 'Swiss', color: '#b0525e',
    capital: 'sui-bern', government: 'democracy', faction: 'neutral',
    armyCount: 2, armyStrength: 65, armyEquipment: 55, armyLocations: ['sui-bern'],
    air: 10, manpower: 400, stability: 85,
    tech: { industry: 1 },
    leader: 'motta',
  },
  {
    id: 'ESP', name: 'Spain', adjective: 'Spanish', color: '#af8352',
    capital: 'esp-madrid', government: 'authoritarian', faction: 'neutral',
    armyCount: 3, armyStrength: 55, armyEquipment: 35, armyExperience: 35, // civil war veterans
    armyLocations: ['esp-madrid'],
    navy: 30, air: 20, manpower: 1500, stability: 30, // the civil war
    leader: 'franco',
    ai: { aggression: 0.3, riskTolerance: 0.2, ideologyZeal: 0.6, opportunism: 0.4, focus: 'consolidation' },
  },
  {
    id: 'POR', name: 'Portugal', adjective: 'Portuguese', color: '#6c9483',
    capital: 'por-lisbon', government: 'authoritarian', faction: 'neutral',
    armyCount: 1, armyStrength: 45, armyEquipment: 30, armyLocations: ['por-lisbon'],
    navy: 15, air: 5, manpower: 400, stability: 70,
    leader: 'salazar',
  },
  {
    id: 'IRE', name: 'Ireland', adjective: 'Irish', color: '#5c8f5e',
    capital: 'ire-dublin', government: 'democracy', faction: 'neutral',
    armyCount: 1, armyStrength: 40, armyEquipment: 25, armyLocations: ['ire-dublin'],
    manpower: 200, stability: 70,
    leader: 'devalera',
  },

  // ---------------- Americas ----------------
  {
    id: 'CAN', name: 'Canada', adjective: 'Canadian', color: '#8f5548',
    capital: 'can-ottawa', government: 'democracy', faction: 'allies',
    armyCount: 1, armyStrength: 55, armyEquipment: 50, armyLocations: ['can-ottawa'],
    navy: 30, air: 20, manpower: 1000, stability: 80, warSupport: 35,
    tech: { industry: 1 },
    leader: 'mackenzie-king',
  },
  {
    id: 'MEX', name: 'Mexico', adjective: 'Mexican', color: '#77995b',
    capital: 'mex-mexico-city', government: 'democracy', faction: 'neutral',
    armyCount: 1, armyStrength: 45, armyEquipment: 30, armyLocations: ['mex-mexico-city'],
    navy: 5, air: 5, manpower: 1000, stability: 60,
    leader: 'cardenas',
  },
  {
    id: 'BRA', name: 'Brazil', adjective: 'Brazilian', color: '#5e9070',
    capital: 'bra-rio', government: 'authoritarian', faction: 'neutral',
    armyCount: 1, armyStrength: 45, armyEquipment: 30, armyLocations: ['bra-rio'],
    navy: 20, air: 10, manpower: 1500, stability: 60,
    leader: 'vargas',
  },

  // ---------------- Empires, Asia & the rest ----------------
  {
    id: 'ANZ', name: 'Australia & New Zealand', adjective: 'Australasian', color: '#4f8b84',
    capital: 'anz-sydney', government: 'democracy', faction: 'allies',
    armyCount: 1, armyStrength: 55, armyEquipment: 50, armyLocations: ['anz-sydney'],
    navy: 40, air: 15, manpower: 800, stability: 80, warSupport: 35,
    tech: { industry: 1 },
    leader: 'lyons',
  },
  {
    id: 'IND', name: 'British India', adjective: 'Indian', color: '#b08a3f',
    capital: 'ind-delhi', government: 'authoritarian', faction: 'allies', puppetOf: 'UK',
    armyCount: 3, armyStrength: 55, armyEquipment: 40,
    armyLocations: ['ind-delhi', 'ind-delhi', 'ind-bombay'],
    navy: 10, air: 10, manpower: 8000, stability: 55, warSupport: 25,
    leader: 'linlithgow',
  },
  {
    id: 'PER', name: 'Persia', adjective: 'Persian', color: '#997752',
    capital: 'per-tehran', government: 'monarchy', faction: 'neutral',
    armyCount: 1, armyStrength: 45, armyEquipment: 25, armyLocations: ['per-tehran'],
    air: 5, manpower: 800, stability: 60,
    leader: 'reza-shah',
  },
  {
    id: 'IRQ', name: 'Iraq', adjective: 'Iraqi', color: '#8a7d4b',
    capital: 'irq-baghdad', government: 'monarchy', faction: 'neutral',
    armyCount: 1, armyStrength: 40, armyEquipment: 25, armyLocations: ['irq-baghdad'],
    air: 5, manpower: 400, stability: 55,
    leader: 'ghazi',
  },
  {
    id: 'EGY', name: 'Egypt', adjective: 'Egyptian', color: '#a89060',
    capital: 'egy-cairo', government: 'monarchy', faction: 'neutral',
    armyCount: 1, armyStrength: 40, armyEquipment: 25, armyLocations: ['egy-cairo'],
    air: 5, manpower: 800, stability: 55,
    leader: 'farouk',
  },
  {
    id: 'SAF', name: 'South Africa', adjective: 'South African', color: '#748c4f',
    capital: 'saf-pretoria', government: 'democracy', faction: 'allies',
    armyCount: 1, armyStrength: 50, armyEquipment: 45, armyLocations: ['saf-pretoria'],
    navy: 5, air: 10, manpower: 500, stability: 70, warSupport: 30,
    leader: 'hertzog',
  },
  {
    id: 'SIA', name: 'Siam', adjective: 'Siamese', color: '#9c6f7e',
    capital: 'sia-bangkok', government: 'monarchy', faction: 'neutral',
    armyCount: 1, armyStrength: 45, armyEquipment: 30, armyLocations: ['sia-bangkok'],
    navy: 5, air: 5, manpower: 500, stability: 60,
    leader: 'phahon',
  },
  {
    id: 'MAN', name: 'Manchukuo', adjective: 'Manchurian', color: '#c2955e',
    capital: 'man-manchuria', government: 'monarchy', faction: 'axis', puppetOf: 'JAP',
    armyCount: 2, armyStrength: 50, armyEquipment: 40, armyLocations: ['man-manchuria'],
    air: 5, manpower: 1000, stability: 50, warSupport: 40,
    leader: 'puyi',
    ai: { aggression: 0.3, riskTolerance: 0.3, ideologyZeal: 0.5, opportunism: 0.3, focus: 'defense' },
  },
  {
    id: 'MON', name: 'Mongolia', adjective: 'Mongolian', color: '#8d5f8f',
    capital: 'mon-ulaanbaatar', government: 'communist', faction: 'comintern', puppetOf: 'SOV',
    armyCount: 1, armyStrength: 45, armyEquipment: 35, armyLocations: ['mon-ulaanbaatar'],
    manpower: 100, stability: 60,
    leader: 'choibalsan',
  },
];

// Symmetric relations seeds from history. Unlisted pairs default to 0.
const RELATIONS: [NationId, NationId, number][] = [
  // Germany
  ['GER', 'SOV', -40], ['GER', 'UK', -30], ['GER', 'FRA', -40], ['GER', 'ITA', 40],
  ['GER', 'POL', -20], ['GER', 'CZE', -60], ['GER', 'AUS', -35], ['GER', 'JAP', 30],
  ['GER', 'USA', -20], ['GER', 'HUN', 30], ['GER', 'ROM', 10], ['GER', 'ESP', 30],
  ['GER', 'BUL', 20], ['GER', 'LIT', -25], ['GER', 'DEN', -10], ['GER', 'NED', -10],
  ['GER', 'BEL', -15],
  // Italy
  ['ITA', 'UK', -20], ['ITA', 'FRA', -25], ['ITA', 'ALB', -40], ['ITA', 'GRE', -20],
  ['ITA', 'YUG', -15], ['ITA', 'JAP', 15], ['ITA', 'HUN', 25], ['ITA', 'ESP', 30],
  // Japan
  ['JAP', 'USA', -30], ['JAP', 'CHI', -80], ['JAP', 'SOV', -50], ['JAP', 'UK', -25],
  ['JAP', 'MAN', 90], ['JAP', 'NED', -15], ['JAP', 'FRA', -15],
  // Soviet Union
  ['SOV', 'POL', -50], ['SOV', 'FIN', -35], ['SOV', 'EST', -30], ['SOV', 'LAT', -30],
  ['SOV', 'LIT', -30], ['SOV', 'ROM', -25], ['SOV', 'UK', -25], ['SOV', 'FRA', -10],
  ['SOV', 'MON', 90], ['SOV', 'CHI', 10], ['SOV', 'TUR', 10],
  // United Kingdom
  ['UK', 'FRA', 70], ['UK', 'USA', 50], ['UK', 'POL', 10], ['UK', 'CAN', 90],
  ['UK', 'ANZ', 90], ['UK', 'SAF', 80], ['UK', 'IND', 60], ['UK', 'EGY', 40],
  ['UK', 'IRQ', 35], ['UK', 'IRE', -10], ['UK', 'GRE', 30], ['UK', 'POR', 40],
  ['UK', 'TUR', 20], ['UK', 'NOR', 25], ['UK', 'NED', 30], ['UK', 'BEL', 35],
  ['UK', 'DEN', 20],
  // France
  ['FRA', 'POL', 40], ['FRA', 'CZE', 50], ['FRA', 'BEL', 40], ['FRA', 'YUG', 30],
  ['FRA', 'ROM', 30], ['FRA', 'USA', 40], ['FRA', 'GRE', 20],
  // United States
  ['USA', 'CAN', 70], ['USA', 'MEX', 20], ['USA', 'BRA', 30], ['USA', 'CHI', 20],
  // Regional feuds and friendships
  ['HUN', 'ROM', -40], ['HUN', 'CZE', -40], ['POL', 'CZE', -20], ['POL', 'LIT', -30],
  ['GRE', 'BUL', -30], ['BUL', 'ROM', -20], ['TUR', 'GRE', -15], ['CHI', 'MAN', -70],
  ['FIN', 'SWE', 30], ['NOR', 'SWE', 40], ['DEN', 'SWE', 30], ['EST', 'LAT', 30],
  ['LAT', 'LIT', 30], ['EST', 'FIN', 30],
];

// Symmetric pacts. Alliance pacts drag partners into wars via declareWar.
const PACTS: [NationId, NationId, Pact['kind']][] = [
  ['FRA', 'POL', 'alliance'], // Franco-Polish alliance, 1921
  ['FRA', 'CZE', 'alliance'], // Franco-Czechoslovak treaty, 1924
  ['UK', 'FRA', 'alliance'], // the Entente
  ['UK', 'CAN', 'alliance'],
  ['UK', 'ANZ', 'alliance'],
  ['UK', 'SAF', 'alliance'],
  ['UK', 'IND', 'alliance'],
  ['JAP', 'MAN', 'alliance'],
  ['SOV', 'MON', 'alliance'],
  ['GER', 'ITA', 'trade'], // Axis declaration, short of a military pact in 1938
];

const buildNations = (): Record<NationId, Nation> => {
  const nations: Record<NationId, Nation> = {};
  for (const s of SEEDS) {
    const ic = Object.entries(INITIAL_CONTROL)
      .filter(([, owner]) => owner === s.id)
      .reduce((sum, [rid]) => sum + REGIONS[rid].ic, 0);
    nations[s.id] = {
      id: s.id,
      name: s.name,
      adjective: s.adjective,
      color: s.color,
      capital: s.capital,
      government: s.government,
      faction: s.faction,
      alive: true,
      puppetOf: s.puppetOf ?? null,
      ic,
      stockpile: { ...DEFAULT_STOCKPILE, ...s.stockpile },
      icAllocation: { ...(s.alloc ?? DEFAULT_ALLOC) },
      armies: mkArmies(
        s.id, s.armyCount, s.armyStrength, s.armyEquipment,
        s.armyExperience ?? 10, s.armyLocations, s.adjective,
      ),
      navy: s.navy ?? 0,
      air: s.air ?? 0,
      manpower: s.manpower,
      stability: s.stability,
      warSupport: s.warSupport ?? 30,
      relations: {},
      guarantees: [...(s.guarantees ?? [])],
      pacts: [],
      claims: [...(s.claims ?? [])],
      spyNetworks: { ...(s.spy ?? {}) },
      tech: { ...ZERO_TECH, ...s.tech },
      research: { track: null, progress: 0 },
      leader: s.leader,
      ai: { ...DEFAULT_AI, ...s.ai },
    };
  }
  for (const [a, b, value] of RELATIONS) {
    if (!nations[a] || !nations[b]) throw new Error(`relations pair references unknown nation ${a}/${b}`);
    nations[a].relations[b] = value;
    nations[b].relations[a] = value;
  }
  for (const [a, b, kind] of PACTS) {
    if (!nations[a] || !nations[b]) throw new Error(`pact references unknown nation ${a}/${b}`);
    nations[a].pacts.push({ with: b, kind });
    nations[b].pacts.push({ with: a, kind });
  }
  return nations;
};

export const NATIONS_1938: Record<NationId, Nation> = buildNations();
