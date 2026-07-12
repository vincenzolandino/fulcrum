// Every tunable constant in the simulation. The balance pass (Task 14) edits
// this file and nothing else. Formulas live in the engine modules; numbers live here.

// ---- Military power ----
export const POWER_ARMOR_BONUS = 0.15; // per armor tech level
export const POWER_DOCTRINE_BONUS = 0.1; // per doctrine tech level
export const POWER_ARMY_SCALE = 10; // one full-strength army ≈ 10 power

// ---- Economy ----
export const STABILITY_IC_BASE = 0.5; // icFactor = base + stability/200
export const OIL_PER_ARMY = 1; // consumed when posture is allout/offensive
export const FOOD_PER_ARMY = 1; // always consumed
export const AIRNAVY_OIL_DIVISOR = 200; // oil use = (air+navy)/divisor
export const STOCKPILE_MAX = 999;
export const NO_OIL_EQUIPMENT_FACTOR = 0.6; // army effective equipment that turn
export const NO_OIL_AIR_FACTOR = 0.5;
export const NO_FOOD_STABILITY_DRAIN = 2; // per turn
export const PROD_EQUIPMENT_RATE = 0.35; // × ic × alloc.army
export const PROD_STRENGTH_RATE = 0.25; // × ic × alloc.army, costs manpower 1:1
export const PROD_AIRNAVY_RATE = 0.3; // × ic × alloc share
export const CIVILIAN_STABILITY_THRESHOLD = 0.3; // alloc.civilian ≥ this → +stability
export const CIVILIAN_STABILITY_GAIN = 0.2;
export const UNSUPPLIED_FACTOR = 0.5; // armies cut off from capital

// ---- Research ----
export const RESEARCH_BASE = 5; // progress per turn
export const RESEARCH_IC_RATE = 0.15; // × ic × alloc.civilian
export const SECRET_REQUIRES_INDUSTRY = 2; // industry level gate for secret track
export const TECH_MAX = 5;

// ---- Combat ----
export const ATTACK_POSTURE_MOD: Record<string, number> = { allout: 1.3, offensive: 1.0 };
export const DEFENSE_POSTURE_MOD: Record<string, number> = {
  hold: 1.2, elastic: 1.0, retreat: 0.6, offensive: 0.9, allout: 0.8,
};
export const TERRAIN_DEFENSE_MOD: Record<string, number> = {
  plains: 1.0, desert: 1.0, forest: 1.25, urban: 1.5, mountain: 1.6, jungle: 1.4, island: 1.3,
};
export const GARRISON_POWER = 0.5; // every defended region has this baseline
export const ENTRENCH_BONUS = 0.08; // per entrenchment level
export const ENTRENCH_MAX = 5;
export const AIR_SUPERIORITY_RATIO = 1.5; // faction air ratio for the ±mod
export const AIR_SUPERIORITY_MOD = 0.15;
export const COMBAT_RNG_LO = 0.8;
export const COMBAT_RNG_HI = 1.2;
export const CAPTURE_RATIO = 1.25; // effRatio ≥ this → region captured
export const CASUALTY_BASE = 9;
export const CASUALTY_MIN = 3;
export const CASUALTY_MAX = 30;
export const CAPTURE_EXTRA_DEF_LOSS = 8;
export const EQUIPMENT_LOSS_RATIO = 0.6; // of strength losses
export const EXPERIENCE_PER_BATTLE = 3;
export const ALLOUT_CASUALTY_MULT = 2; // attacker losses doubled on allout
export const AMPHIBIOUS_NAVAL_RATIO = 1.5; // required faction naval ratio
export const AMPHIBIOUS_ATTACK_FACTOR = 0.6;
export const BLOCKADE_NAVAL_RATIO = 2;
export const BLOCKADE_RESOURCE_FACTOR = 0.5; // overseas resource income multiplier
export const BLOCKADE_ISLAND_FOOD_FACTOR = 0.8;

// ---- Diplomacy / tension ----
export const DRIFT_SAME_FACTION = 1;
export const DRIFT_IDEOLOGY_CLASH = -0.5; // fascist vs democracy
export const DRIFT_WAR_ALLY = 2;
export const TENSION_PER_DOW = 8;
export const TENSION_PER_ANNEX = 5;
export const TENSION_DECAY = 1; // per turn with no war among majors
export const DEMOCRACY_WAR_TENSION_GATE = 50; // won't join offensive wars below this
export const GUARANTEE_TENSION_GATE = 40;

// ---- Politics ----
export const WAR_SUPPORT_DRAIN = 1; // per turn at war
export const WAR_SUPPORT_WINNING = 2;
export const WAR_SUPPORT_LOSING = -3; // lost ≥2 regions this turn
export const LOW_WS_STABILITY_DRAIN = 1; // when warSupport < 30
export const LOW_WS_THRESHOLD = 30;
export const PEACE_STABILITY_GAIN = 1;
export const PEACE_WS_DRIFT = 2; // toward 50
export const CAPITULATION_VP_FACTOR = 0.35; // core VP share below this (with capital lost)
export const CAPITULATION_STABILITY = 15;

// ---- Covert ----
export const NETWORK_BUILD_TURNS = 3;
export const NETWORK_BUILD_GAIN = 15;
export const NETWORK_DETECTION_CHANCE = 0.15;
export const NETWORK_DETECTION_LOSS = 25;
export const NETWORK_DETECTION_RELATIONS = -10;
export const OP_NETWORK_REQUIREMENTS: Record<string, number> = {
  stealIntel: 30, sabotage: 40, coup: 60, assassinate: 70,
};
export const OP_BASE_ODDS: Record<string, number> = {
  stealIntel: 0.8, sabotage: 0.6, coup: 0.35, assassinate: 0.25,
};
export const OP_NETWORK_ODDS_DIVISOR = 400; // odds += network/divisor
export const OP_FAILURE_NETWORK_LOSS = 30;
export const OP_FAILURE_RELATIONS = -20;
export const OP_FAILURE_TENSION = 3;
export const SABOTAGE_IC_FACTOR = 0.9; // target ic × this
export const SABOTAGE_DURATION = 3; // turns
export const COUP_STABILITY = 30;

// ---- AI ----
export const AI_OFFENSIVE_RATIO = 1.3;
export const AI_ALLOUT_RATIO = 2.0;
export const AI_ALLOUT_AGGRESSION = 0.6;
export const AI_ELASTIC_RATIO = 0.7;
export const AI_DOW_BASE_THRESHOLD = 2.2; // threshold = base − aggression − 0.4×opportunism
export const AI_DOW_OPPORTUNISM_FACTOR = 0.4;
export const AI_DOW_MIN_THRESHOLD = 1.1;
// World tension an aggressor needs before it starts a war over a claim. Scaled
// by aggression so a warmonger (Germany, 0.9) moves once the pre-war crises
// have escalated things, while a cautious power waits far longer. This keeps
// the AI from invading on turn one and lets the 1938 diplomacy (Anschluss,
// Munich) play out through events before the shooting starts.
export const AI_DOW_TENSION_BASE = 58;
export const AI_DOW_TENSION_SLOPE = 34; // gate = base − aggression × slope
// Claims whose seizure is owned by an authored crisis chain (Anschluss,
// Munich, Danzig/September, Albania, the Winter War, the Molotov–Ribbentrop
// partition). The generic AI must not start a war over these during the
// pre-war era, or it preempts the events and stalls the 1938–39 timeline.
// After the scripted era it may pursue any that history left unresolved.
export const SCRIPTED_CLAIM_REGIONS: string[] = [
  'aus-austria', // Anschluss
  'cze-sudetenland', // Munich
  'pol-danzig', // Danzig / September 1939
  'alb-albania', // Italy's Good Friday
  'pol-east', // Molotov–Ribbentrop partition
  'est-tallinn',
  'lat-riga',
  'lit-kaunas',
  'fin-karelia', // the Winter War
];
export const SCRIPTED_ERA_END_TURN = 32; // ~September 1940
export const AI_FACTION_JOIN_RELATIONS = 60;
export const AI_FACTION_JOIN_TENSION = 60;
export const AI_PEACE_WAR_SUPPORT = 25;
export const AI_SECRET_TENSION_GATE = 70;
export const AI_ALLOCATION: Record<string, { army: number; air: number; navy: number; civilian: number }> = {
  expansion: { army: 0.5, air: 0.2, navy: 0.1, civilian: 0.2 },
  defense: { army: 0.4, air: 0.15, navy: 0.05, civilian: 0.4 },
  consolidation: { army: 0.3, air: 0.1, navy: 0.1, civilian: 0.5 },
};

// ---- Resource trade & market ----
// A nation counts as "short" of a resource below this stockpile level, and
// only a short nation ever receives via a pact, an aid request, or the
// market. A giver must stay at or above this level after giving, so trade
// never starves the giver to feed the recipient.
export const TRADE_SHORTAGE_THRESHOLD = 15;
export const TRADE_PACT_TRANSFER = 8; // per active trade pact, per resource, per turn
export const AID_REQUEST_AMOUNT = 20; // one-time grant via the Request Aid action
// AI/relations gate for a request or a pact proposal: the asking nation's
// relations with the target must be at least this, or the target's faction
// must match the asker's, to be granted at all.
export const AID_RELATIONS_GATE = 10;
// World market: buying resources with IC. Cost per unit rises geometrically
// within a single turn's purchase (unitCost × growth^unitsAlreadyBoughtThisBuy),
// so leaning hard on the market gets expensive fast; it resets every turn.
export const MARKET_BASE_COST = 3; // IC per unit, first unit of a purchase
export const MARKET_COST_GROWTH = 0.15; // +15% per unit already bought in this purchase
export const MARKET_MAX_PER_TURN = 40; // cap per resource per buy action

// ---- Events / game flow ----
export const MAX_PLAYER_EVENTS_PER_TURN = 3;
export const FINAL_TURN = 131; // December 1948
