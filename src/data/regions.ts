// The 1938 world map: ~90 regions covering 43 nations. Europe is fine-grained,
// the rest of the world coarse. Adjacency is authored as an undirected edge
// list and expanded symmetrically below, so it cannot go asymmetric by hand.
//
// Strait pairs are listed as normal adjacency per the plan: Dover
// (uk-southeast <-> fra-north / bel-brussels), Sicily-Tunis (ita-sicily <->
// fra-algeria), Messina (ita-south <-> ita-sicily), Japan-Korea (jap-home <->
// jap-korea), and the Pacific island chains (jap-tokyo <-> usa-hawaii,
// jap-home <-> usa-philippines, and onward to the East Indies and Australia).
// bra-rio connects to mex-mexico-city via an abstracted Central American land
// bridge so the whole graph stays one component.
//
// IC targets (world ~1000): USA ~180, GER ~130, SOV ~120, UK+empire ~100,
// FRA ~70. Oil is concentrated: Ploiesti, Baku, Texas, the Dutch East Indies,
// and the Persian/Iraqi fields.

import type { NationId, Region, RegionId, Terrain } from '../engine/types';

interface RegionSeed {
  id: RegionId;
  name: string;
  owner: NationId;
  terrain: Terrain;
  coastal: boolean;
  ic: number;
  vp: number;
  oil?: number;
  steel?: number;
  food?: number;
}

const SEEDS: RegionSeed[] = [
  // ---- Germany (IC 130) ----
  { id: 'ger-berlin', name: 'Berlin & Brandenburg', owner: 'GER', terrain: 'urban', coastal: true, ic: 30, vp: 10, food: 8 },
  { id: 'ger-ruhr', name: 'The Ruhr', owner: 'GER', terrain: 'urban', coastal: true, ic: 40, vp: 8, steel: 30 },
  { id: 'ger-rhineland', name: 'Rhineland', owner: 'GER', terrain: 'plains', coastal: false, ic: 20, vp: 4, food: 6 },
  { id: 'ger-bavaria', name: 'Bavaria', owner: 'GER', terrain: 'mountain', coastal: false, ic: 15, vp: 3, food: 8 },
  { id: 'ger-saxony', name: 'Saxony', owner: 'GER', terrain: 'plains', coastal: false, ic: 15, vp: 3, steel: 5 },
  { id: 'ger-prussia', name: 'East Prussia', owner: 'GER', terrain: 'plains', coastal: true, ic: 10, vp: 3, food: 10 },

  // ---- France (IC 73) ----
  { id: 'fra-paris', name: 'Paris & the Ile-de-France', owner: 'FRA', terrain: 'urban', coastal: false, ic: 30, vp: 10, food: 8 },
  { id: 'fra-north', name: 'Picardy & the Channel Coast', owner: 'FRA', terrain: 'plains', coastal: true, ic: 15, vp: 4, steel: 8, food: 8 },
  { id: 'fra-alsace', name: 'Alsace-Lorraine', owner: 'FRA', terrain: 'plains', coastal: false, ic: 10, vp: 4, steel: 10 },
  { id: 'fra-south', name: 'The Midi', owner: 'FRA', terrain: 'plains', coastal: true, ic: 10, vp: 3, food: 10 },
  { id: 'fra-algeria', name: 'French North Africa', owner: 'FRA', terrain: 'desert', coastal: true, ic: 5, vp: 2, food: 6 },
  { id: 'fra-indochina', name: 'French Indochina', owner: 'FRA', terrain: 'jungle', coastal: true, ic: 3, vp: 1, food: 10 },

  // ---- United Kingdom (IC 81; +IND empire = ~101) ----
  { id: 'uk-london', name: 'London & the Home Counties', owner: 'UK', terrain: 'urban', coastal: true, ic: 30, vp: 10 },
  { id: 'uk-southeast', name: 'The Southeast & Dover', owner: 'UK', terrain: 'plains', coastal: true, ic: 10, vp: 3, food: 6 },
  { id: 'uk-midlands', name: 'The Midlands', owner: 'UK', terrain: 'urban', coastal: false, ic: 25, vp: 5, steel: 20 },
  { id: 'uk-scotland', name: 'Scotland & the North', owner: 'UK', terrain: 'forest', coastal: true, ic: 10, vp: 3, steel: 5, food: 5 },
  { id: 'uk-malaya', name: 'Malaya & Singapore', owner: 'UK', terrain: 'jungle', coastal: true, ic: 6, vp: 2, food: 5 },

  // ---- Soviet Union (IC 120) ----
  { id: 'sov-moscow', name: 'Moscow', owner: 'SOV', terrain: 'urban', coastal: false, ic: 25, vp: 10, food: 8 },
  { id: 'sov-leningrad', name: 'Leningrad', owner: 'SOV', terrain: 'urban', coastal: true, ic: 20, vp: 7, steel: 5 },
  { id: 'sov-ukraine', name: 'The Ukraine', owner: 'SOV', terrain: 'plains', coastal: true, ic: 15, vp: 5, steel: 15, food: 25 },
  { id: 'sov-byelorussia', name: 'Byelorussia', owner: 'SOV', terrain: 'forest', coastal: false, ic: 8, vp: 3, food: 10 },
  { id: 'sov-caucasus', name: 'The Caucasus & Baku', owner: 'SOV', terrain: 'mountain', coastal: true, ic: 10, vp: 6, oil: 30, food: 6 },
  { id: 'sov-urals', name: 'The Urals', owner: 'SOV', terrain: 'mountain', coastal: false, ic: 20, vp: 4, steel: 25 },
  { id: 'sov-siberia', name: 'Siberia', owner: 'SOV', terrain: 'forest', coastal: false, ic: 8, vp: 2, food: 8 },
  { id: 'sov-fareast', name: 'The Soviet Far East', owner: 'SOV', terrain: 'forest', coastal: true, ic: 6, vp: 2, food: 4 },
  { id: 'sov-centralasia', name: 'Central Asia', owner: 'SOV', terrain: 'desert', coastal: false, ic: 4, vp: 1, food: 6 },
  { id: 'sov-karelia', name: 'Soviet Karelia & Murmansk', owner: 'SOV', terrain: 'forest', coastal: true, ic: 4, vp: 1 },

  // ---- Italy (IC 47) ----
  { id: 'ita-rome', name: 'Rome & Latium', owner: 'ITA', terrain: 'urban', coastal: true, ic: 15, vp: 8, food: 6 },
  { id: 'ita-north', name: 'The Po Valley', owner: 'ITA', terrain: 'plains', coastal: true, ic: 20, vp: 5, steel: 5, food: 10 },
  { id: 'ita-south', name: 'The Mezzogiorno', owner: 'ITA', terrain: 'mountain', coastal: true, ic: 6, vp: 2, food: 8 },
  { id: 'ita-sicily', name: 'Sicily', owner: 'ITA', terrain: 'island', coastal: true, ic: 4, vp: 2, food: 6 },
  { id: 'ita-libya', name: 'Libya', owner: 'ITA', terrain: 'desert', coastal: true, ic: 2, vp: 1 },

  // ---- Japan (IC 58) ----
  { id: 'jap-tokyo', name: 'Tokyo & Kanto', owner: 'JAP', terrain: 'urban', coastal: true, ic: 30, vp: 10, food: 6 },
  { id: 'jap-home', name: 'Western Home Islands', owner: 'JAP', terrain: 'mountain', coastal: true, ic: 20, vp: 5, steel: 3, food: 8 },
  { id: 'jap-korea', name: 'Korea', owner: 'JAP', terrain: 'mountain', coastal: true, ic: 8, vp: 3, food: 10 },

  // ---- United States (IC 185) ----
  { id: 'usa-east', name: 'The Eastern Seaboard', owner: 'USA', terrain: 'urban', coastal: true, ic: 60, vp: 10, steel: 10, food: 10 },
  { id: 'usa-midwest', name: 'The Midwest', owner: 'USA', terrain: 'plains', coastal: false, ic: 60, vp: 6, steel: 40, food: 30 },
  { id: 'usa-south', name: 'The South & Texas', owner: 'USA', terrain: 'plains', coastal: true, ic: 30, vp: 4, oil: 30, food: 15 },
  { id: 'usa-west', name: 'The Pacific Coast', owner: 'USA', terrain: 'plains', coastal: true, ic: 30, vp: 4, oil: 5, food: 10 },
  { id: 'usa-hawaii', name: 'Hawaii', owner: 'USA', terrain: 'island', coastal: true, ic: 2, vp: 3 },
  { id: 'usa-philippines', name: 'The Philippines', owner: 'USA', terrain: 'jungle', coastal: true, ic: 3, vp: 2, food: 6 },

  // ---- Poland (IC 24) ----
  { id: 'pol-warsaw', name: 'Warsaw & Central Poland', owner: 'POL', terrain: 'urban', coastal: false, ic: 15, vp: 8, steel: 5, food: 12 },
  { id: 'pol-danzig', name: 'Danzig & the Corridor', owner: 'POL', terrain: 'plains', coastal: true, ic: 5, vp: 4, food: 6 },
  { id: 'pol-east', name: 'The Kresy', owner: 'POL', terrain: 'forest', coastal: false, ic: 4, vp: 2, food: 10 },

  // ---- China (IC 28). JAP holds claims here: the Sino-Japanese War is
  // already burning in 1938; setup.ts creates the actual War object. ----
  { id: 'chi-north', name: 'North China', owner: 'CHI', terrain: 'plains', coastal: true, ic: 8, vp: 4, steel: 5, food: 15 },
  { id: 'chi-shanghai', name: 'Shanghai & the Yangtze Delta', owner: 'CHI', terrain: 'urban', coastal: true, ic: 10, vp: 5, food: 10 },
  { id: 'chi-canton', name: 'South China', owner: 'CHI', terrain: 'jungle', coastal: true, ic: 5, vp: 3, food: 10 },
  { id: 'chi-chungking', name: 'Szechwan & the Interior', owner: 'CHI', terrain: 'mountain', coastal: false, ic: 5, vp: 5, food: 12 },

  // ---- Central Europe ----
  { id: 'aus-austria', name: 'Austria', owner: 'AUS', terrain: 'mountain', coastal: false, ic: 12, vp: 5, steel: 3, food: 5 },
  { id: 'cze-prague', name: 'Bohemia & Moravia', owner: 'CZE', terrain: 'urban', coastal: false, ic: 12, vp: 5, steel: 5, food: 5 },
  { id: 'cze-sudetenland', name: 'The Sudetenland', owner: 'CZE', terrain: 'mountain', coastal: false, ic: 8, vp: 3, steel: 5 },
  { id: 'hun-budapest', name: 'Hungary', owner: 'HUN', terrain: 'plains', coastal: false, ic: 8, vp: 4, food: 12 },

  // ---- Balkans ----
  { id: 'rom-bucharest', name: 'Wallachia & Moldavia', owner: 'ROM', terrain: 'plains', coastal: true, ic: 6, vp: 3, food: 12 },
  { id: 'rom-ploiesti', name: 'Ploiesti', owner: 'ROM', terrain: 'plains', coastal: false, ic: 4, vp: 3, oil: 30 },
  { id: 'rom-transylvania', name: 'Transylvania', owner: 'ROM', terrain: 'mountain', coastal: false, ic: 3, vp: 2, food: 6 },
  { id: 'bul-sofia', name: 'Bulgaria', owner: 'BUL', terrain: 'mountain', coastal: true, ic: 4, vp: 2, food: 8 },
  { id: 'yug-belgrade', name: 'Yugoslavia', owner: 'YUG', terrain: 'mountain', coastal: true, ic: 7, vp: 3, steel: 5, food: 8 },
  { id: 'gre-athens', name: 'Greece', owner: 'GRE', terrain: 'mountain', coastal: true, ic: 5, vp: 3, food: 5 },
  { id: 'alb-albania', name: 'Albania', owner: 'ALB', terrain: 'mountain', coastal: true, ic: 1, vp: 1 },

  // ---- Turkey & the Middle East ----
  { id: 'tur-istanbul', name: 'Istanbul & Thrace', owner: 'TUR', terrain: 'urban', coastal: true, ic: 5, vp: 4 },
  { id: 'tur-ankara', name: 'Anatolia', owner: 'TUR', terrain: 'mountain', coastal: true, ic: 6, vp: 3, steel: 3, food: 8 },
  { id: 'per-tehran', name: 'Persia', owner: 'PER', terrain: 'mountain', coastal: true, ic: 4, vp: 2, oil: 15, food: 5 },
  { id: 'irq-baghdad', name: 'Iraq', owner: 'IRQ', terrain: 'desert', coastal: true, ic: 3, vp: 2, oil: 15 },
  { id: 'egy-cairo', name: 'Egypt & Suez', owner: 'EGY', terrain: 'desert', coastal: true, ic: 5, vp: 3, food: 8 },

  // ---- Western Europe minors ----
  { id: 'bel-brussels', name: 'Belgium', owner: 'BEL', terrain: 'plains', coastal: true, ic: 12, vp: 4, steel: 8 },
  { id: 'ned-amsterdam', name: 'The Netherlands', owner: 'NED', terrain: 'plains', coastal: true, ic: 12, vp: 3, food: 8 },
  { id: 'ned-east-indies', name: 'The Dutch East Indies', owner: 'NED', terrain: 'island', coastal: true, ic: 5, vp: 2, oil: 25, food: 10 },
  { id: 'sui-bern', name: 'Switzerland', owner: 'SUI', terrain: 'mountain', coastal: false, ic: 8, vp: 2 },
  { id: 'esp-madrid', name: 'Spain', owner: 'ESP', terrain: 'mountain', coastal: true, ic: 10, vp: 4, steel: 5, food: 8 },
  { id: 'por-lisbon', name: 'Portugal', owner: 'POR', terrain: 'plains', coastal: true, ic: 4, vp: 2, food: 5 },
  { id: 'ire-dublin', name: 'Ireland', owner: 'IRE', terrain: 'plains', coastal: true, ic: 3, vp: 1, food: 8 },

  // ---- Scandinavia & the Baltic ----
  { id: 'den-copenhagen', name: 'Denmark', owner: 'DEN', terrain: 'plains', coastal: true, ic: 6, vp: 2, food: 10 },
  { id: 'nor-oslo', name: 'Norway', owner: 'NOR', terrain: 'mountain', coastal: true, ic: 5, vp: 2, steel: 2, food: 4 },
  { id: 'swe-stockholm', name: 'Sweden', owner: 'SWE', terrain: 'forest', coastal: true, ic: 10, vp: 3, steel: 20, food: 6 },
  { id: 'fin-helsinki', name: 'Finland', owner: 'FIN', terrain: 'forest', coastal: true, ic: 5, vp: 3, food: 4 },
  { id: 'fin-karelia', name: 'Finnish Karelia', owner: 'FIN', terrain: 'forest', coastal: false, ic: 2, vp: 1 },
  { id: 'est-tallinn', name: 'Estonia', owner: 'EST', terrain: 'plains', coastal: true, ic: 2, vp: 1, food: 4 },
  { id: 'lat-riga', name: 'Latvia', owner: 'LAT', terrain: 'plains', coastal: true, ic: 3, vp: 1, food: 4 },
  { id: 'lit-kaunas', name: 'Lithuania', owner: 'LIT', terrain: 'plains', coastal: true, ic: 2, vp: 1, food: 5 },

  // ---- Americas ----
  { id: 'can-ottawa', name: 'Canada', owner: 'CAN', terrain: 'forest', coastal: true, ic: 15, vp: 3, steel: 8, food: 15 },
  { id: 'mex-mexico-city', name: 'Mexico', owner: 'MEX', terrain: 'mountain', coastal: true, ic: 8, vp: 2, oil: 8, food: 10 },
  { id: 'bra-rio', name: 'Brazil', owner: 'BRA', terrain: 'jungle', coastal: true, ic: 8, vp: 2, food: 12 },

  // ---- Asia, Pacific & the rest of the empires ----
  { id: 'anz-sydney', name: 'Australia & New Zealand', owner: 'ANZ', terrain: 'plains', coastal: true, ic: 10, vp: 3, steel: 5, food: 15 },
  { id: 'ind-delhi', name: 'Northern India', owner: 'IND', terrain: 'plains', coastal: false, ic: 12, vp: 4, food: 15 },
  { id: 'ind-bombay', name: 'Southern India', owner: 'IND', terrain: 'plains', coastal: true, ic: 8, vp: 3, steel: 5, food: 12 },
  { id: 'saf-pretoria', name: 'South Africa', owner: 'SAF', terrain: 'plains', coastal: true, ic: 6, vp: 2, steel: 8, food: 8 },
  { id: 'sia-bangkok', name: 'Siam', owner: 'SIA', terrain: 'jungle', coastal: true, ic: 3, vp: 1, food: 10 },
  { id: 'man-manchuria', name: 'Manchukuo', owner: 'MAN', terrain: 'plains', coastal: true, ic: 10, vp: 3, oil: 2, steel: 10, food: 12 },
  { id: 'mon-ulaanbaatar', name: 'Mongolia', owner: 'MON', terrain: 'desert', coastal: false, ic: 1, vp: 1, food: 4 },
];

// Undirected edges; expanded symmetrically below.
const EDGES: [RegionId, RegionId][] = [
  // Germany
  ['ger-berlin', 'ger-ruhr'],
  ['ger-berlin', 'ger-saxony'],
  ['ger-berlin', 'den-copenhagen'],
  ['ger-berlin', 'pol-danzig'],
  ['ger-ruhr', 'ger-rhineland'],
  ['ger-ruhr', 'ger-saxony'],
  ['ger-ruhr', 'ned-amsterdam'],
  ['ger-rhineland', 'bel-brussels'],
  ['ger-rhineland', 'fra-alsace'],
  ['ger-rhineland', 'ger-bavaria'],
  ['ger-bavaria', 'ger-saxony'],
  ['ger-bavaria', 'aus-austria'],
  ['ger-bavaria', 'cze-sudetenland'],
  ['ger-bavaria', 'sui-bern'],
  ['ger-bavaria', 'fra-alsace'],
  ['ger-saxony', 'cze-sudetenland'],
  ['ger-saxony', 'pol-warsaw'],
  ['ger-prussia', 'pol-danzig'],
  ['ger-prussia', 'pol-warsaw'],
  ['ger-prussia', 'lit-kaunas'],
  // Poland
  ['pol-warsaw', 'pol-danzig'],
  ['pol-warsaw', 'pol-east'],
  ['pol-warsaw', 'cze-prague'],
  ['pol-east', 'sov-byelorussia'],
  ['pol-east', 'sov-ukraine'],
  ['pol-east', 'lit-kaunas'],
  ['pol-east', 'rom-bucharest'],
  // Central Europe
  ['cze-prague', 'cze-sudetenland'],
  ['cze-prague', 'aus-austria'],
  ['cze-prague', 'hun-budapest'],
  ['cze-prague', 'rom-transylvania'],
  ['aus-austria', 'hun-budapest'],
  ['aus-austria', 'ita-north'],
  ['aus-austria', 'sui-bern'],
  ['aus-austria', 'yug-belgrade'],
  ['hun-budapest', 'rom-transylvania'],
  ['hun-budapest', 'yug-belgrade'],
  // Balkans
  ['rom-transylvania', 'rom-bucharest'],
  ['rom-transylvania', 'rom-ploiesti'],
  ['rom-transylvania', 'yug-belgrade'],
  ['rom-bucharest', 'rom-ploiesti'],
  ['rom-bucharest', 'bul-sofia'],
  ['rom-bucharest', 'sov-ukraine'],
  ['yug-belgrade', 'bul-sofia'],
  ['yug-belgrade', 'gre-athens'],
  ['yug-belgrade', 'alb-albania'],
  ['yug-belgrade', 'ita-north'],
  ['bul-sofia', 'gre-athens'],
  ['bul-sofia', 'tur-istanbul'],
  ['gre-athens', 'alb-albania'],
  ['gre-athens', 'tur-istanbul'],
  // Turkey & Middle East
  ['tur-istanbul', 'tur-ankara'],
  ['tur-ankara', 'sov-caucasus'],
  ['tur-ankara', 'irq-baghdad'],
  ['tur-ankara', 'per-tehran'],
  ['irq-baghdad', 'per-tehran'],
  ['irq-baghdad', 'egy-cairo'],
  ['per-tehran', 'sov-caucasus'],
  ['per-tehran', 'sov-centralasia'],
  ['per-tehran', 'ind-delhi'],
  // Africa
  ['egy-cairo', 'ita-libya'],
  ['egy-cairo', 'saf-pretoria'], // abstracted African interior corridor
  ['ita-libya', 'fra-algeria'],
  ['fra-algeria', 'ita-sicily'], // Sicily-Tunis strait
  // Italy
  ['ita-north', 'ita-rome'],
  ['ita-north', 'fra-south'],
  ['ita-north', 'sui-bern'],
  ['ita-rome', 'ita-south'],
  ['ita-south', 'ita-sicily'], // Messina strait
  // France & Iberia
  ['fra-paris', 'fra-north'],
  ['fra-paris', 'fra-alsace'],
  ['fra-paris', 'fra-south'],
  ['fra-north', 'bel-brussels'],
  ['fra-north', 'fra-alsace'],
  ['fra-alsace', 'sui-bern'],
  ['fra-south', 'esp-madrid'],
  ['esp-madrid', 'por-lisbon'],
  // Benelux & Britain
  ['bel-brussels', 'ned-amsterdam'],
  ['uk-southeast', 'fra-north'], // Dover strait
  ['uk-southeast', 'bel-brussels'], // Dover strait
  ['uk-london', 'uk-southeast'],
  ['uk-london', 'uk-midlands'],
  ['uk-midlands', 'uk-scotland'],
  ['uk-scotland', 'ire-dublin'], // North Channel strait
  // Scandinavia & Baltic
  ['nor-oslo', 'swe-stockholm'],
  ['swe-stockholm', 'fin-helsinki'],
  ['fin-helsinki', 'fin-karelia'],
  ['fin-karelia', 'sov-karelia'],
  ['fin-karelia', 'sov-leningrad'],
  ['sov-karelia', 'sov-leningrad'],
  ['sov-leningrad', 'est-tallinn'],
  ['est-tallinn', 'lat-riga'],
  ['lat-riga', 'lit-kaunas'],
  ['lat-riga', 'sov-byelorussia'],
  // Soviet interior
  ['sov-leningrad', 'sov-moscow'],
  ['sov-leningrad', 'sov-byelorussia'],
  ['sov-moscow', 'sov-byelorussia'],
  ['sov-moscow', 'sov-ukraine'],
  ['sov-moscow', 'sov-urals'],
  ['sov-byelorussia', 'sov-ukraine'],
  ['sov-ukraine', 'sov-caucasus'],
  ['sov-caucasus', 'sov-urals'],
  ['sov-urals', 'sov-centralasia'],
  ['sov-urals', 'sov-siberia'],
  ['sov-centralasia', 'sov-siberia'],
  ['sov-siberia', 'sov-fareast'],
  ['sov-siberia', 'mon-ulaanbaatar'],
  ['sov-fareast', 'man-manchuria'],
  // East Asia & Pacific
  ['mon-ulaanbaatar', 'man-manchuria'],
  ['mon-ulaanbaatar', 'chi-north'],
  ['man-manchuria', 'chi-north'],
  ['man-manchuria', 'jap-korea'],
  ['jap-korea', 'jap-home'], // Tsushima strait
  ['jap-home', 'jap-tokyo'],
  ['jap-tokyo', 'usa-hawaii'], // Pacific island chain
  ['jap-home', 'usa-philippines'], // Pacific island chain
  ['usa-philippines', 'ned-east-indies'],
  ['ned-east-indies', 'uk-malaya'],
  ['ned-east-indies', 'anz-sydney'],
  ['uk-malaya', 'sia-bangkok'],
  ['sia-bangkok', 'fra-indochina'],
  ['sia-bangkok', 'ind-delhi'], // via Burma, abstracted
  ['fra-indochina', 'chi-canton'],
  ['chi-canton', 'chi-shanghai'],
  ['chi-canton', 'chi-chungking'],
  ['chi-shanghai', 'chi-north'],
  ['chi-shanghai', 'chi-chungking'],
  ['chi-north', 'chi-chungking'],
  ['ind-delhi', 'ind-bombay'],
  // Americas
  ['usa-east', 'usa-midwest'],
  ['usa-east', 'usa-south'],
  ['usa-midwest', 'usa-south'],
  ['usa-midwest', 'usa-west'],
  ['usa-south', 'usa-west'],
  ['usa-south', 'mex-mexico-city'],
  ['usa-west', 'mex-mexico-city'],
  ['usa-east', 'can-ottawa'],
  ['usa-midwest', 'can-ottawa'],
  ['usa-west', 'usa-hawaii'],
  ['mex-mexico-city', 'bra-rio'], // abstracted Central American land bridge
];

const buildRegions = (): {
  regions: Record<RegionId, Region>;
  control: Record<RegionId, NationId>;
} => {
  const regions: Record<RegionId, Region> = {};
  const control: Record<RegionId, NationId> = {};
  for (const s of SEEDS) {
    if (regions[s.id]) throw new Error(`duplicate region id ${s.id}`);
    regions[s.id] = {
      id: s.id,
      name: s.name,
      terrain: s.terrain,
      adjacent: [],
      coastal: s.coastal,
      ic: s.ic,
      resources: { oil: s.oil ?? 0, steel: s.steel ?? 0, food: s.food ?? 0 },
      vp: s.vp,
    };
    control[s.id] = s.owner;
  }
  for (const [a, b] of EDGES) {
    if (!regions[a]) throw new Error(`edge references unknown region ${a}`);
    if (!regions[b]) throw new Error(`edge references unknown region ${b}`);
    if (regions[a].adjacent.includes(b)) throw new Error(`duplicate edge ${a}<->${b}`);
    regions[a].adjacent.push(b);
    regions[b].adjacent.push(a);
  }
  return { regions, control };
};

const built = buildRegions();

export const REGIONS: Record<RegionId, Region> = built.regions;
export const INITIAL_CONTROL: Record<RegionId, NationId> = built.control;
export const REGION_IDS: RegionId[] = SEEDS.map((s) => s.id);
