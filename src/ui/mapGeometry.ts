// Hand-authored briefing-room map geometry: one angular low-poly polygon per
// region in src/data/regions.ts, on a 1400x900 canvas. Europe fills roughly
// the left 60%, the Americas sit as coarse slabs on the far-left edge across
// an Atlantic gap, and Asia and the Pacific run down the right side.
//
// Authoring rules:
// - Regions of the same country tile: neighbouring polygons of one nation
//   reuse exact vertex coordinates along their shared edges (island and
//   overseas possessions are exempt; straits and oceans separate them).
// - Different countries abut with small deliberate gaps of a few px so
//   borders read on the dark chrome; nothing overlaps.
// - Neatness over GIS accuracy: recognizable Iberia, France, British Isles,
//   Scandinavia, an Italian boot, the Baltic rim and a Black Sea gap.
//
// Everything is derived from POLYGONS below: REGION_PATHS are closed SVG
// path strings ('M ... Z'), REGION_LABEL_POS are vertex centroids used for
// army chips and labels.

import type { RegionId } from '../engine/types';

export const MAP_WIDTH = 1400;
export const MAP_HEIGHT = 900;
export const MAP_VIEWBOX = `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;

type Pt = readonly [number, number];

const POLYGONS: Record<RegionId, readonly Pt[]> = {
  // ---- The Americas (coarse, far-left edge) ----
  'can-ottawa': [[15, 65], [90, 50], [150, 58], [160, 185], [85, 195], [15, 188]],
  'usa-west': [[15, 205], [58, 200], [58, 318], [15, 312]],
  'usa-midwest': [[58, 200], [102, 196], [102, 318], [58, 318]],
  'usa-east': [[102, 196], [158, 192], [150, 318], [102, 318]],
  'usa-south': [[15, 312], [58, 318], [102, 318], [150, 318], [142, 382], [62, 390], [22, 352]],
  'mex-mexico-city': [[30, 400], [95, 405], [88, 458], [38, 448]],
  'bra-rio': [[95, 470], [160, 480], [172, 565], [120, 635], [75, 560]],

  // ---- British Isles ----
  'ire-dublin': [[345, 240], [392, 230], [400, 288], [352, 298]],
  'uk-scotland': [[408, 172], [458, 164], [465, 238], [412, 244]],
  'uk-midlands': [[412, 244], [465, 238], [470, 298], [416, 303]],
  'uk-london': [[416, 303], [470, 298], [474, 333], [419, 337]],
  'uk-southeast': [[419, 337], [474, 333], [502, 349], [463, 368], [426, 357]],

  // ---- France (metropolitan cluster) ----
  'fra-north': [[455, 382], [505, 352], [536, 352], [562, 398], [468, 415]],
  'fra-alsace': [[536, 352], [598, 364], [602, 420], [566, 430], [562, 398]],
  'fra-paris': [[468, 415], [562, 398], [566, 430], [552, 452], [478, 462]],
  'fra-south': [[478, 462], [552, 452], [592, 468], [586, 512], [502, 524], [468, 492]],
  'fra-algeria': [[470, 572], [636, 564], [646, 614], [556, 636], [478, 618]],
  'fra-indochina': [[1196, 584], [1236, 578], [1248, 634], [1224, 660], [1200, 636]],

  // ---- Iberia ----
  'esp-madrid': [[368, 496], [452, 486], [486, 514], [470, 556], [400, 568], [362, 536]],
  'por-lisbon': [[332, 500], [358, 496], [354, 566], [328, 552]],

  // ---- Benelux ----
  'ned-amsterdam': [[556, 276], [596, 270], [600, 310], [560, 314]],
  'bel-brussels': [[542, 324], [560, 314], [600, 310], [601, 338], [546, 348]],
  'ned-east-indies': [[1180, 726], [1290, 716], [1300, 748], [1190, 758]],

  // ---- Germany (six-region tiled block) ----
  'ger-ruhr': [[602, 302], [640, 288], [645, 330], [607, 342]],
  'ger-berlin': [[640, 288], [700, 288], [703, 322], [645, 330]],
  'ger-rhineland': [[607, 342], [645, 330], [649, 370], [610, 382]],
  'ger-saxony': [[645, 330], [703, 322], [706, 352], [688, 362], [649, 370]],
  'ger-bavaria': [[610, 382], [649, 370], [688, 362], [694, 398], [650, 410], [614, 404]],
  'ger-prussia': [[744, 260], [776, 256], [780, 286], [748, 290]],

  // ---- Scandinavia & the Baltic rim ----
  'nor-oslo': [[556, 120], [596, 58], [626, 70], [608, 170], [572, 186]],
  'swe-stockholm': [[626, 70], [660, 80], [668, 180], [640, 220], [608, 170]],
  'fin-helsinki': [[688, 90], [730, 80], [742, 170], [700, 186]],
  'fin-karelia': [[730, 80], [768, 72], [782, 160], [742, 170]],
  'den-copenhagen': [[646, 244], [674, 240], [677, 284], [649, 285]],
  'est-tallinn': [[768, 196], [810, 190], [814, 218], [772, 224]],
  'lat-riga': [[776, 230], [820, 224], [824, 252], [782, 258]],
  'lit-kaunas': [[784, 262], [824, 256], [828, 286], [788, 292]],

  // ---- Poland (corridor between Berlin and East Prussia) ----
  'pol-danzig': [[710, 258], [738, 255], [741, 292], [713, 296]],
  'pol-warsaw': [[713, 296], [741, 292], [786, 296], [788, 338], [716, 344]],
  'pol-east': [[786, 296], [830, 290], [838, 348], [788, 338]],

  // ---- Central Europe ----
  'cze-sudetenland': [[700, 360], [760, 352], [762, 372], [702, 380]],
  'cze-prague': [[702, 380], [762, 372], [766, 392], [706, 398]],
  'aus-austria': [[662, 416], [732, 406], [738, 434], [670, 442]],
  'hun-budapest': [[742, 404], [800, 398], [806, 434], [748, 438]],
  'sui-bern': [[606, 412], [644, 414], [648, 442], [612, 444]],

  // ---- Italy (the boot) ----
  'ita-north': [[608, 452], [700, 442], [704, 468], [646, 478], [612, 474]],
  'ita-rome': [[646, 478], [704, 468], [712, 494], [676, 512], [652, 500]],
  'ita-south': [[676, 512], [712, 494], [724, 528], [730, 554], [700, 560], [682, 536]],
  'ita-sicily': [[644, 568], [676, 562], [682, 588], [650, 594]],
  'ita-libya': [[660, 644], [790, 636], [802, 694], [700, 708], [664, 680]],

  // ---- The Balkans ----
  'yug-belgrade': [[706, 448], [760, 442], [768, 486], [742, 508], [712, 492]],
  'rom-transylvania': [[766, 446], [818, 438], [824, 468], [772, 476]],
  'rom-ploiesti': [[772, 476], [824, 468], [830, 492], [778, 500]],
  'rom-bucharest': [[778, 500], [830, 492], [856, 486], [864, 520], [790, 530]],
  'bul-sofia': [[766, 538], [848, 528], [854, 560], [776, 568]],
  'alb-albania': [[736, 522], [758, 516], [764, 550], [742, 556]],
  'gre-athens': [[752, 578], [800, 572], [812, 610], [776, 634], [748, 606]],

  // ---- Turkey & the Middle East (Black Sea gap to the north) ----
  'tur-istanbul': [[824, 580], [858, 574], [864, 602], [830, 608]],
  'tur-ankara': [[868, 576], [972, 566], [982, 614], [880, 622]],
  'per-tehran': [[992, 582], [1044, 574], [1052, 640], [1000, 650], [984, 616]],
  'irq-baghdad': [[900, 632], [962, 622], [972, 672], [912, 682]],
  'egy-cairo': [[806, 646], [866, 638], [876, 698], [820, 706]],
  'saf-pretoria': [[760, 780], [846, 770], [858, 858], [776, 868]],

  // ---- Soviet Union (ten-region tiled block) ----
  'sov-karelia': [[800, 58], [886, 50], [894, 150], [816, 158]],
  'sov-leningrad': [[816, 158], [894, 150], [900, 214], [874, 218], [840, 222]],
  'sov-byelorussia': [[840, 222], [874, 218], [880, 310], [838, 318]],
  'sov-moscow': [[874, 218], [900, 214], [966, 208], [974, 298], [926, 304], [880, 310]],
  'sov-ukraine': [[838, 318], [880, 310], [926, 304], [934, 368], [896, 392], [842, 382]],
  'sov-urals': [[966, 208], [1044, 200], [1054, 320], [990, 378], [974, 298]],
  'sov-caucasus': [[896, 392], [934, 368], [990, 378], [1000, 440], [944, 470], [902, 424]],
  'sov-centralasia': [[990, 378], [1054, 320], [1138, 338], [1126, 414], [1032, 428]],
  'sov-siberia': [[1044, 200], [1170, 190], [1230, 196], [1226, 262], [1138, 338], [1054, 320]],
  'sov-fareast': [[1230, 196], [1320, 186], [1328, 252], [1226, 262]],

  // ---- East Asia ----
  'mon-ulaanbaatar': [[1168, 348], [1240, 340], [1250, 392], [1180, 400]],
  'man-manchuria': [[1244, 286], [1330, 276], [1340, 340], [1254, 350]],
  'chi-north': [[1150, 410], [1240, 400], [1248, 458], [1160, 468]],
  'chi-shanghai': [[1204, 463], [1248, 458], [1258, 510], [1214, 516]],
  'chi-chungking': [[1160, 468], [1204, 463], [1214, 516], [1168, 524]],
  'chi-canton': [[1168, 524], [1214, 516], [1258, 510], [1266, 560], [1188, 572]],
  'jap-korea': [[1300, 360], [1332, 354], [1338, 410], [1308, 416]],
  'jap-tokyo': [[1352, 326], [1388, 316], [1394, 372], [1382, 376], [1352, 388]],
  'jap-home': [[1352, 388], [1382, 376], [1394, 372], [1398, 428], [1360, 440]],

  // ---- South Asia & the Pacific ----
  'ind-delhi': [[1056, 556], [1140, 546], [1148, 606], [1066, 616]],
  'ind-bombay': [[1066, 616], [1148, 606], [1130, 672], [1086, 690]],
  'sia-bangkok': [[1148, 590], [1188, 584], [1196, 640], [1160, 652]],
  'uk-malaya': [[1164, 664], [1198, 658], [1206, 706], [1172, 712]],
  'usa-philippines': [[1282, 560], [1318, 554], [1326, 606], [1290, 612]],
  'usa-hawaii': [[1366, 470], [1392, 464], [1396, 492], [1370, 498]],
  'anz-sydney': [[1240, 780], [1350, 770], [1362, 850], [1260, 862]],
};

const toPath = (pts: readonly Pt[]): string =>
  `M${pts.map(([x, y]) => `${x} ${y}`).join(' L')} Z`;

const centroid = (pts: readonly Pt[]): [number, number] => {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of pts) {
    sx += x;
    sy += y;
  }
  const n = pts.length;
  return [Math.round((sx / n) * 10) / 10, Math.round((sy / n) * 10) / 10];
};

/** Raw polygon vertices, exported for hit-testing and dev tooling. */
export const REGION_POLYGONS: Record<RegionId, readonly Pt[]> = POLYGONS;

export const REGION_PATHS: Record<RegionId, string> = Object.fromEntries(
  Object.entries(POLYGONS).map(([id, pts]) => [id, toPath(pts)]),
);

export const REGION_LABEL_POS: Record<RegionId, [number, number]> = Object.fromEntries(
  Object.entries(POLYGONS).map(([id, pts]) => [id, centroid(pts)]),
);
