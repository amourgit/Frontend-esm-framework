const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Fusion profonde, clé par clé : seules les feuilles déclarées par `source` remplacent celles de `target`.
 * Les tableaux sont remplacés en bloc (ce sont des valeurs atomiques côté CSS, ex. une pile de polices).
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    out[key] = isObject(value) && isObject(out[key]) ? deepMerge(out[key] as Record<string, unknown>, value) : value;
  }
  return out as T;
}

/** Applique les surcharges par priorité croissante (la plus haute gagne ; à égalité, l'ordre d'enregistrement). */
export function mergeByPriority<T extends Record<string, unknown>>(
  base: T,
  overrides: Array<{ priority: number; document: Record<string, unknown> }>,
): T {
  return [...overrides].sort((a, b) => a.priority - b.priority).reduce<T>((acc, o) => deepMerge(acc, o.document), base);
}
