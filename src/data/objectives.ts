// Victory objectives. Majors get 3-5 authored objectives; every minor gets
// two generated ones (survive with the capital; hold every core region).
// Checks are pure Condition DSL and are scored by victory.ts at game end.

import type { Condition, NationId, RegionId } from '../engine/types';
import { INITIAL_CONTROL } from './regions';
import { MAJOR_IDS, NATION_IDS, NATIONS_1938 } from './nations';

export interface Objective {
  id: string;
  nation: NationId;
  text: string;
  points: number;
  check: Condition;
}

const controls = (nation: NationId, region: RegionId): Condition => ({ t: 'controls', nation, region });
const notControlled = (nation: NationId, region: RegionId): Condition => ({ t: 'not', c: controls(nation, region) });
const all = (...c: Condition[]): Condition => ({ t: 'and', c });
const any = (...c: Condition[]): Condition => ({ t: 'or', c });
const aliveWithCapital = (nation: NationId): Condition =>
  all({ t: 'alive', nation }, controls(nation, NATIONS_1938[nation].capital));

const MAJOR_OBJECTIVES: Objective[] = [
  // ---- Germany ----
  { id: 'ger-anschluss', nation: 'GER', text: 'Bring Austria into the Reich.', points: 15, check: controls('GER', 'aus-austria') },
  { id: 'ger-sudetenland', nation: 'GER', text: 'Annex the Sudetenland.', points: 15, check: controls('GER', 'cze-sudetenland') },
  { id: 'ger-danzig', nation: 'GER', text: 'Return Danzig to the Reich.', points: 15, check: controls('GER', 'pol-danzig') },
  { id: 'ger-master-of-europe', nation: 'GER', text: 'Master of the continent: hold Paris.', points: 40, check: controls('GER', 'fra-paris') },
  { id: 'ger-reich-endures', nation: 'GER', text: 'The Reich endures with Berlin in German hands.', points: 10, check: aliveWithCapital('GER') },

  // ---- France ----
  { id: 'fra-paris-stands', nation: 'FRA', text: 'Paris stands: survive with the capital unconquered.', points: 30, check: aliveWithCapital('FRA') },
  { id: 'fra-alsace', nation: 'FRA', text: 'Hold Alsace-Lorraine against all comers.', points: 20, check: controls('FRA', 'fra-alsace') },
  { id: 'fra-empire', nation: 'FRA', text: 'Keep the empire: North Africa and Indochina remain French.', points: 15, check: all(controls('FRA', 'fra-algeria'), controls('FRA', 'fra-indochina')) },
  { id: 'fra-containment', nation: 'FRA', text: 'Contain Germany: Brussels never falls to German arms.', points: 25, check: notControlled('GER', 'bel-brussels') },

  // ---- United Kingdom ----
  { id: 'uk-home-islands', nation: 'UK', text: 'The home islands inviolate: London never falls.', points: 25, check: aliveWithCapital('UK') },
  { id: 'uk-channel-coast', nation: 'UK', text: 'No hostile power controls the Channel coast.', points: 30, check: all(notControlled('GER', 'fra-north'), notControlled('GER', 'bel-brussels')) },
  { id: 'uk-suez', nation: 'UK', text: 'Guard the Suez lifeline.', points: 15, check: any(controls('UK', 'egy-cairo'), controls('EGY', 'egy-cairo')) },
  { id: 'uk-empire-holds', nation: 'UK', text: 'The empire holds: Delhi answers to the Crown.', points: 20, check: any(controls('IND', 'ind-delhi'), controls('UK', 'ind-delhi')) },

  // ---- Soviet Union ----
  { id: 'sov-heartland', nation: 'SOV', text: 'Defend the heartland: Moscow, Leningrad, and Baku hold.', points: 30, check: all(controls('SOV', 'sov-moscow'), controls('SOV', 'sov-leningrad'), controls('SOV', 'sov-caucasus')) },
  { id: 'sov-baltic-buffer', nation: 'SOV', text: 'A Baltic buffer: the border republics under Soviet control.', points: 20, check: all(controls('SOV', 'est-tallinn'), controls('SOV', 'lat-riga'), controls('SOV', 'lit-kaunas')) },
  { id: 'sov-western-buffer', nation: 'SOV', text: 'Push the border west: hold the Kresy.', points: 20, check: controls('SOV', 'pol-east') },
  { id: 'sov-revolution-endures', nation: 'SOV', text: 'The revolution endures.', points: 15, check: aliveWithCapital('SOV') },

  // ---- Italy ----
  { id: 'ita-albania', nation: 'ITA', text: 'Albania under the fasces.', points: 20, check: controls('ITA', 'alb-albania') },
  { id: 'ita-suez', nation: 'ITA', text: 'Mare Nostrum: seize Egypt and the Canal.', points: 30, check: controls('ITA', 'egy-cairo') },
  { id: 'ita-balkans', nation: 'ITA', text: 'A Balkan empire: Athens under Italian rule.', points: 20, check: controls('ITA', 'gre-athens') },
  { id: 'ita-regime-survives', nation: 'ITA', text: 'The regime survives with Rome intact.', points: 15, check: aliveWithCapital('ITA') },

  // ---- Japan ----
  { id: 'jap-china-coast', nation: 'JAP', text: 'Subdue the Chinese coast from Peking to Canton.', points: 25, check: all(controls('JAP', 'chi-north'), controls('JAP', 'chi-shanghai'), controls('JAP', 'chi-canton')) },
  { id: 'jap-southern-resources', nation: 'JAP', text: 'Seize the southern resource area: the East Indies oil.', points: 30, check: controls('JAP', 'ned-east-indies') },
  { id: 'jap-co-prosperity', nation: 'JAP', text: 'The Co-Prosperity Sphere: Indochina under Japanese control.', points: 20, check: controls('JAP', 'fra-indochina') },
  { id: 'jap-home-islands', nation: 'JAP', text: 'The home islands stand.', points: 15, check: aliveWithCapital('JAP') },

  // ---- United States ----
  { id: 'usa-fortress-america', nation: 'USA', text: 'Fortress America: the mainland untouched.', points: 10, check: aliveWithCapital('USA') },
  { id: 'usa-arsenal', nation: 'USA', text: 'Arsenal of democracy: industry at full war footing.', points: 20, check: { t: 'tech', nation: 'USA', track: 'industry', atLeast: 4 } },
  { id: 'usa-pacific-line', nation: 'USA', text: 'Hold the Pacific line: Hawaii and the Philippines.', points: 25, check: all(controls('USA', 'usa-hawaii'), controls('USA', 'usa-philippines')) },
  { id: 'usa-atomic', nation: 'USA', text: 'First to the atom.', points: 30, check: { t: 'flag', key: 'ATOMIC_USA' } },

  // ---- Poland ----
  { id: 'pol-repel-invasion', nation: 'POL', text: 'Repel the German invasion: Warsaw is Polish at the end.', points: 30, check: all({ t: 'alive', nation: 'POL' }, controls('POL', 'pol-warsaw')) },
  { id: 'pol-danzig-polish', nation: 'POL', text: 'Danzig remains Polish.', points: 25, check: controls('POL', 'pol-danzig') },
  { id: 'pol-eastern-marches', nation: 'POL', text: 'Hold the eastern marches against Moscow.', points: 20, check: controls('POL', 'pol-east') },
  { id: 'pol-republic-survives', nation: 'POL', text: 'The Republic survives, in Warsaw or in exile.', points: 20, check: { t: 'alive', nation: 'POL' } },

  // ---- China ----
  { id: 'chi-free-china', nation: 'CHI', text: 'Free China endures in the interior.', points: 25, check: aliveWithCapital('CHI') },
  { id: 'chi-reclaim-shanghai', nation: 'CHI', text: 'Reclaim Shanghai from the invader.', points: 30, check: controls('CHI', 'chi-shanghai') },
  { id: 'chi-hold-north', nation: 'CHI', text: 'Hold the north China plain.', points: 20, check: controls('CHI', 'chi-north') },
];

const minorObjectives: Objective[] = NATION_IDS
  .filter((id) => !MAJOR_IDS.includes(id))
  .flatMap((id): Objective[] => {
    const coreRegions = Object.entries(INITIAL_CONTROL)
      .filter(([, owner]) => owner === id)
      .map(([rid]) => rid);
    return [
      {
        id: `${id.toLowerCase()}-survive`,
        nation: id,
        text: 'Survive to 1948 with the capital in national hands.',
        points: 20,
        check: aliveWithCapital(id),
      },
      {
        id: `${id.toLowerCase()}-core`,
        nation: id,
        text: 'End the decade holding every core region.',
        points: 15,
        check: { t: 'and', c: coreRegions.map((r) => controls(id, r)) },
      },
    ];
  });

export const OBJECTIVES: Objective[] = [...MAJOR_OBJECTIVES, ...minorObjectives];
