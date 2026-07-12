// The shared type contract for Fulcrum. Every module and every content file
// codes against these names. Changes here require updating the plan doc.

export type NationId = string;
export type RegionId = string;
export type LeaderId = string;
export type Faction = 'axis' | 'allies' | 'comintern' | 'neutral';
export type TechTrack = 'armor' | 'air' | 'naval' | 'industry' | 'doctrine' | 'secret';
export type Posture = 'allout' | 'offensive' | 'hold' | 'elastic' | 'retreat';
export type Terrain = 'plains' | 'forest' | 'mountain' | 'urban' | 'desert' | 'jungle' | 'island';
export type Government = 'fascist' | 'communist' | 'democracy' | 'monarchy' | 'authoritarian';

export interface Region {
  id: RegionId;
  name: string;
  terrain: Terrain;
  adjacent: RegionId[]; // symmetric
  coastal: boolean;
  ic: number;
  resources: { oil: number; steel: number; food: number };
  vp: number; // 0-10
}

export interface RegionState {
  owner: NationId;
  controller: NationId;
  entrenchment: number; // 0-5
}

export interface Army {
  id: string;
  name: string;
  strength: number; // 0-100
  equipment: number; // 0-100
  experience: number; // 0-100
  location: RegionId;
  posture: Posture;
  moveTarget: RegionId | null;
}

export interface Pact {
  with: NationId;
  kind: 'nap' | 'alliance' | 'trade';
}

export interface AIPersonality {
  aggression: number; // 0-1
  riskTolerance: number; // 0-1
  ideologyZeal: number; // 0-1
  opportunism: number; // 0-1
  focus: 'expansion' | 'defense' | 'consolidation';
}

export interface Nation {
  id: NationId;
  name: string;
  adjective: string;
  color: string;
  capital: RegionId;
  government: Government;
  faction: Faction;
  alive: boolean;
  puppetOf: NationId | null;
  ic: number; // recomputed each turn
  stockpile: { oil: number; steel: number; food: number };
  icAllocation: { army: number; air: number; navy: number; civilian: number }; // sums to 1
  armies: Army[];
  navy: number; // 0-1000
  air: number; // 0-1000
  manpower: number; // thousands
  stability: number; // 0-100
  warSupport: number; // 0-100
  relations: Record<NationId, number>; // -100..100
  guarantees: NationId[];
  pacts: Pact[];
  claims: RegionId[];
  spyNetworks: Record<NationId, number>; // 0-100
  tech: Record<TechTrack, number>; // 0-5
  research: { track: TechTrack | null; progress: number }; // progress 0-100
  leader: LeaderId;
  ai: AIPersonality;
}

export interface War {
  id: string;
  attackers: NationId[];
  defenders: NationId[];
  startTurn: number;
}

export type Flags = Record<string, boolean | number | string>;

// ---------- Condition DSL (serializable) ----------
export type Condition =
  | { t: 'always' }
  | { t: 'never' }
  | { t: 'and'; c: Condition[] }
  | { t: 'or'; c: Condition[] }
  | { t: 'not'; c: Condition }
  | { t: 'flag'; key: string; is?: boolean | number | string } // default is: true
  | { t: 'turnAtLeast'; n: number }
  | { t: 'turnBefore'; n: number }
  | { t: 'random'; p: number }
  | { t: 'atWar'; a: NationId; b?: NationId }
  | { t: 'alive'; nation: NationId }
  | { t: 'isPlayer'; nation: NationId }
  | { t: 'faction'; nation: NationId; is: Faction }
  | { t: 'controls'; nation: NationId; region: RegionId }
  | { t: 'leaderIs'; nation: NationId; leader: LeaderId }
  | { t: 'relations'; a: NationId; b: NationId; atLeast?: number; below?: number }
  | { t: 'stability'; nation: NationId; atLeast?: number; below?: number }
  | { t: 'warSupport'; nation: NationId; atLeast?: number; below?: number }
  | { t: 'strengthRatio'; a: NationId; b: NationId; atLeast: number }
  | { t: 'spyNetwork'; owner: NationId; target: NationId; atLeast: number }
  | { t: 'tech'; nation: NationId; track: TechTrack; atLeast: number }
  | { t: 'tension'; atLeast?: number; below?: number }
  | { t: 'eventFired'; id: string }
  | { t: 'eventNotFired'; id: string };

// ---------- Effect DSL (serializable) ----------
export type Effect =
  | { t: 'flag'; key: string; value: boolean | number | string }
  | { t: 'addFlag'; key: string; delta: number }
  | { t: 'relations'; a: NationId; b: NationId; delta: number }
  | { t: 'stability'; nation: NationId; delta: number }
  | { t: 'warSupport'; nation: NationId; delta: number }
  | { t: 'tension'; delta: number }
  | { t: 'declareWar'; attacker: NationId; defender: NationId }
  | { t: 'peace'; a: NationId; b: NationId }
  | { t: 'annex'; nation: NationId; by: NationId }
  | { t: 'puppet'; nation: NationId; by: NationId }
  | { t: 'cedeRegion'; region: RegionId; to: NationId }
  | { t: 'setController'; region: RegionId; to: NationId }
  | { t: 'joinFaction'; nation: NationId; faction: Faction }
  | { t: 'guarantee'; by: NationId; of: NationId }
  | { t: 'pact'; a: NationId; b: NationId; kind: Pact['kind'] }
  | { t: 'breakPact'; a: NationId; b: NationId }
  | { t: 'addClaim'; nation: NationId; region: RegionId }
  | { t: 'ic'; nation: NationId; delta: number }
  | { t: 'resource'; nation: NationId; resource: 'oil' | 'steel' | 'food'; delta: number }
  | { t: 'manpower'; nation: NationId; delta: number }
  | { t: 'navy'; nation: NationId; delta: number }
  | { t: 'air'; nation: NationId; delta: number }
  | { t: 'armyStrength'; nation: NationId; delta: number }
  | { t: 'newArmy'; nation: NationId; name: string; location: RegionId; strength: number; equipment: number }
  | { t: 'disbandArmy'; nation: NationId; count: number }
  | { t: 'setLeader'; nation: NationId; leader: LeaderId }
  | { t: 'killLeader'; nation: NationId }
  | { t: 'spyNetwork'; owner: NationId; target: NationId; delta: number }
  | { t: 'tech'; nation: NationId; track: TechTrack; delta: number }
  | { t: 'setAI'; nation: NationId; patch: Partial<AIPersonality> }
  | { t: 'chronicle'; text: string; divergence?: boolean }
  | { t: 'report'; to: NationId | 'player'; kind: ReportKind; title: string; body: string }
  | { t: 'queueEvent'; id: string; delay: number }
  | { t: 'endGame'; verdict: string };

export type ReportKind = 'intel' | 'front' | 'diplomatic' | 'domestic' | 'covert' | 'research';

export interface Report {
  kind: ReportKind;
  title: string;
  body: string;
  turn: number;
}

export interface EventChoice {
  label: string;
  detail?: string;
  available?: Condition;
  effects: Effect[];
  aiWeight?: number; // default 1
}

export interface GameEvent {
  id: string;
  title: string;
  nation: NationId | 'global';
  fires: Condition;
  once: boolean;
  priority: number;
  text: string; // period voice, 40-150 words
  choices: EventChoice[]; // 1-5
}

export interface ChronicleEntry {
  turn: number;
  text: string;
  divergence: boolean;
}

/**
 * A real-history event the Chronicle checks the game against each turn (see
 * historyTimeline.ts for the actual data). `matches` tests whether the game
 * tracked history; on a match `text` is logged as-is. On a miss, `otherwise`
 * is evaluated in order and the first branch whose `when` holds supplies the
 * alternate-outcome text — chronicle.ts must never fall back to `text` on a
 * divergence, since that would describe the real history that did NOT
 * happen instead of what did. Every milestone's `otherwise` list must end
 * with a `{ t: 'always' }` catch-all branch.
 */
export interface HistoryMilestone {
  turn: number;
  text: string;
  matches: Condition;
  otherwise: { text: string; when: Condition }[];
}

export interface CovertMission {
  id: string;
  owner: NationId;
  target: NationId;
  type: 'assassinate' | 'coup' | 'sabotage' | 'stealIntel' | 'buildNetwork';
  turnsLeft: number;
}

export interface GameOverState {
  verdict: string;
  score: number;
  epilogue: string;
}

export interface GameState {
  seed: number;
  turn: number; // 0 = Jan 1938
  playerNation: NationId;
  nations: Record<NationId, Nation>;
  regions: Record<RegionId, RegionState>;
  wars: War[];
  tension: number; // 0-100
  flags: Flags;
  firedEvents: string[];
  queuedEvents: { id: string; fireTurn: number }[];
  pendingChoices: { eventId: string }[];
  missions: CovertMission[];
  chronicle: ChronicleEntry[];
  reports: Report[];
  gameOver: GameOverState | null;
}

export interface Rng {
  next(): number; // [0, 1)
  pick<T>(arr: T[]): T;
  chance(p: number): boolean;
  int(lo: number, hi: number): number; // inclusive both ends
}

export const dateOf = (turn: number) => ({ year: 1938 + Math.floor(turn / 12), month: turn % 12 });

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const formatDate = (turn: number): string => {
  const { year, month } = dateOf(turn);
  return `${MONTH_NAMES[month]} ${year}`;
};
