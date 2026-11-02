/**
 * Calcul des hauteurs des compartiments verticaux d'une zone latérale (gauche ou droite).
 *
 * Fonctions pures, sans dépendance au DOM ni au store : la zone empile des compartiments dont les
 * hauteurs, en **% de la zone**, totalisent toujours 100 (aucun débordement). Chaque compartiment a une
 * hauteur de base, un minimum et un maximum.
 */

/** Identifiant réservé du compartiment par défaut d'une zone (aucune fenêtre d'outils ne peut le porter). */
export const DEFAULT_COMPARTMENT_ID = '__default__';

/**
 * Dimensions du compartiment par défaut (en % de la zone). Fixées par le shell : les apps ne peuvent pas les
 * modifier. Maximum à 100 pour qu'il remplisse la zone quand il est seul.
 */
export const DEFAULT_COMPARTMENT_LIMITS: Readonly<{ height: number; minHeight: number; maxHeight: number }> = {
  height: 60,
  minHeight: 25,
  maxHeight: 100,
};

export interface CompartmentItem {
  /** Clé stable du compartiment dans sa zone. */
  key: string;
  /** Hauteur de base (%), utilisée tant que le compartiment n'a pas de hauteur mémorisée. */
  height: number;
  /** Hauteur minimale (%). */
  minHeight: number;
  /** Hauteur maximale (%). */
  maxHeight: number;
}

const TOTAL = 100;
const EPSILON = 1e-6;

/** Arrondit à 0,01 % : assez fin pour un glissement fluide, assez grossier pour ne pas osciller. */
const round = (n: number) => Math.round(n * 100) / 100;

/** Bornes effectives : minimums réduits proportionnellement s'ils dépassent 100, maximums ignorés s'ils n'atteignent pas 100. */
function effectiveLimits(items: readonly CompartmentItem[]): { mins: number[]; maxs: number[] } {
  const sumMin = items.reduce((total, item) => total + item.minHeight, 0);
  const sumMax = items.reduce((total, item) => total + item.maxHeight, 0);
  const minScale = sumMin > TOTAL ? TOTAL / sumMin : 1;
  const mins = items.map((item) => item.minHeight * minScale);
  const maxs = items.map((item) => (sumMax < TOTAL ? TOTAL : Math.max(item.maxHeight, item.minHeight * minScale)));
  return { mins, maxs };
}

/**
 * Hauteurs (%) des compartiments ouverts, dans l'ordre : somme exacte de 100, chacune dans ses bornes.
 *
 * `stored` : hauteurs déjà mémorisées. Un compartiment sans valeur mémorisée (nouvellement ouvert) reçoit sa
 * hauteur de base et les autres se partagent le reste proportionnellement à leurs hauteurs.
 */
export function fitCompartmentHeights(
  items: readonly CompartmentItem[],
  stored: Readonly<Record<string, number | undefined>> = {},
): number[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [TOTAL];
  const { mins, maxs } = effectiveLimits(items);

  const known = items.map((item) => {
    const value = stored[item.key];
    return typeof value === 'number' && Number.isFinite(value) && value > 0;
  });
  const fresh = items.reduce((total, item, i) => total + (known[i] ? 0 : item.height), 0);
  const knownSum = items.reduce((total, item, i) => total + (known[i] ? (stored[item.key] as number) : 0), 0);
  const knownTarget = TOTAL - fresh;

  // Valeurs de départ : nouveaux à leur base, les autres ramenés à la place restante (ou tout ramené à 100 sinon).
  let values: number[];
  if (knownSum > 0 && knownTarget > 0) {
    values = items.map((item, i) => (known[i] ? ((stored[item.key] as number) * knownTarget) / knownSum : item.height));
  } else {
    const raw = items.map((item, i) => (known[i] ? (stored[item.key] as number) : item.height));
    const sum = raw.reduce((total, v) => total + v, 0);
    values = raw.map((v) => (v * TOTAL) / sum);
  }

  // Écrêtage itératif : on fige les compartiments qui sortent de leurs bornes et on redistribue le reste.
  const fixed: Array<number | undefined> = items.map(() => undefined);
  for (let pass = 0; pass <= items.length; pass += 1) {
    const fixedSum = fixed.reduce<number>((total, v) => total + (v ?? 0), 0);
    const freeIndexes = items.map((_, i) => i).filter((i) => fixed[i] === undefined);
    if (freeIndexes.length === 0) break;
    const freeSum = freeIndexes.reduce((total, i) => total + values[i], 0);
    const scale = freeSum > 0 ? (TOTAL - fixedSum) / freeSum : 0;
    const scaled = new Map(
      freeIndexes.map((i) => [i, freeSum > 0 ? values[i] * scale : (TOTAL - fixedSum) / freeIndexes.length]),
    );

    let excess = 0; // > 0 : trop grand une fois écrêté ; < 0 : trop petit
    for (const i of freeIndexes) {
      const v = scaled.get(i) as number;
      excess += Math.min(maxs[i], Math.max(mins[i], v)) - v;
    }
    const tooSmall = freeIndexes.filter((i) => (scaled.get(i) as number) < mins[i] - EPSILON);
    const tooBig = freeIndexes.filter((i) => (scaled.get(i) as number) > maxs[i] + EPSILON);
    if (tooSmall.length === 0 && tooBig.length === 0) {
      for (const i of freeIndexes) fixed[i] = scaled.get(i);
      break;
    }
    // Excès positif (on a relevé des minimums) : on fige les minimums ; négatif : les maximums ; nul : les deux.
    const toFix = excess > EPSILON ? tooSmall : excess < -EPSILON ? tooBig : [...tooSmall, ...tooBig];
    for (const i of toFix.length > 0 ? toFix : [...tooSmall, ...tooBig]) {
      fixed[i] = Math.min(maxs[i], Math.max(mins[i], scaled.get(i) as number));
    }
  }

  const result = items.map((_, i) => fixed[i] ?? values[i]);
  // Somme exacte : l'arrondi est absorbé par le plus grand compartiment.
  const rounded = result.map(round);
  const drift = round(TOTAL - rounded.reduce((total, v) => total + v, 0));
  if (drift !== 0) {
    let largest = 0;
    rounded.forEach((v, i) => {
      if (v > rounded[largest]) largest = i;
    });
    rounded[largest] = round(rounded[largest] + drift);
  }
  return rounded;
}

/**
 * Déplace la frontière entre le compartiment `index` et le suivant de `delta` points de pourcentage
 * (positif : vers le bas). La somme reste 100 :
 *
 * - le côté qui gagne de la place s'agrandit en commençant par le compartiment contre la frontière,
 *   puis le suivant s'il atteint son maximum ;
 * - le côté qui en perd rétrécit de la même façon, jusqu'aux minimums.
 *
 * Le déplacement est borné par ce que les deux côtés peuvent absorber : la frontière s'arrête net.
 */
export function resizeCompartmentBoundary(
  heights: readonly number[],
  items: readonly CompartmentItem[],
  index: number,
  delta: number,
): number[] {
  const next = [...heights];
  if (index < 0 || index >= heights.length - 1 || !Number.isFinite(delta) || delta === 0) return next;
  const { mins, maxs } = effectiveLimits(items);

  const above = Array.from({ length: index + 1 }, (_, k) => index - k); // du plus proche de la frontière au plus loin
  const below = Array.from({ length: heights.length - index - 1 }, (_, k) => index + 1 + k);
  const growing = delta > 0 ? above : below;
  const shrinking = delta > 0 ? below : above;

  const growCapacity = growing.reduce((total, i) => total + Math.max(0, maxs[i] - next[i]), 0);
  const shrinkCapacity = shrinking.reduce((total, i) => total + Math.max(0, next[i] - mins[i]), 0);
  const amount = Math.min(Math.abs(delta), growCapacity, shrinkCapacity);
  if (amount <= 0) return next;

  let toGrow = amount;
  for (const i of growing) {
    const step = Math.min(toGrow, Math.max(0, maxs[i] - next[i]));
    next[i] += step;
    toGrow -= step;
    if (toGrow <= EPSILON) break;
  }
  let toShrink = amount;
  for (const i of shrinking) {
    const step = Math.min(toShrink, Math.max(0, next[i] - mins[i]));
    next[i] -= step;
    toShrink -= step;
    if (toShrink <= EPSILON) break;
  }
  return next.map(round);
}
