// ============================================================================
//  EGEN THEME ENGINE — Fusion profonde de schémas de thème
// ============================================================================
//
//  Utilisé pour fusionner plusieurs surcharges (AppThemeOverride) entre elles,
//  par ordre de priorité croissante. Fusion "deep" clé par clé : seules les
//  feuilles explicitement déclarées dans une surcharge remplacent celles du
//  schéma de base — tout le reste est conservé.
//
//  Les tableaux sont remplacés entièrement (pas de fusion élément par
//  élément), car en pratique ils représentent des valeurs atomiques côté
//  CSS (ex: une pile de polices "Poppins, sans-serif").
// ============================================================================

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Fusionne récursivement `source` dans une copie de `target` et retourne le résultat.
 * Ni `target` ni `source` ne sont mutés.
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const output: Record<string, unknown> = { ...target };

  for (const [key, sourceValue] of Object.entries(source)) {
    if (sourceValue === undefined) continue;

    const targetValue = output[key];

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      output[key] = deepMerge(targetValue, sourceValue);
    } else {
      output[key] = sourceValue;
    }
  }

  return output as T;
}

/**
 * Fusionne une liste ordonnée de schémas partiels sur une base, par priorité
 * croissante (le dernier de la liste triée gagne en cas de conflit).
 */
export function mergeBySortedPriority<T extends Record<string, unknown>>(
  base: T,
  overrides: Array<{ priority: number; schema: Partial<T> }>,
): T {
  const sorted = [...overrides].sort((a, b) => a.priority - b.priority);
  return sorted.reduce<T>((acc, { schema }) => deepMerge(acc, schema), base);
}
