/**
 * Alias de nom de module.
 *
 * Une app peut être connue sous DEUX noms : le nom de son paquet (clé du registre de routes et de l'import map,
 * p. ex. `@egen/esm-clock-app`) et un alias (l'espace de noms qu'elle utilise dans son code pour ses traductions et sa
 * configuration, p. ex. `@egen-civitas/esm-clock-app`). L'import map publie ce lien dans sa clé `aliases`
 * (alias -> nom du paquet).
 *
 * Le système de configuration, lui, est indexé par NOM de module. Le Shell n'enregistrait que le nom du paquet : la
 * lecture des surcharges de traduction de l'alias (`getTranslationOverrides`) attendait alors indéfiniment un module
 * jamais enregistré sous ce nom, et les composants qui suspendent sur les traductions ne s'affichaient jamais.
 * Ce module garde la correspondance paquet -> alias pour enregistrer et marquer « chargé » les DEUX noms.
 */
const aliasesByApp = new Map<string, ReadonlyArray<string>>();

/** Retient les alias d'une app (remplace les précédents). Les valeurs vides ou identiques au nom du paquet sont ignorées. */
export function setModuleAliases(appName: string, aliases: ReadonlyArray<string> | undefined): ReadonlyArray<string> {
  const clean = Array.from(
    new Set((aliases ?? []).filter((a) => typeof a === 'string' && a.trim().length > 0 && a !== appName)),
  );
  if (clean.length) {
    aliasesByApp.set(appName, clean);
  } else {
    aliasesByApp.delete(appName);
  }
  return clean;
}

/** Alias connus d'une app (tableau vide si aucun). */
export function getModuleAliases(appName: string): ReadonlyArray<string> {
  return aliasesByApp.get(appName) ?? [];
}

/**
 * Inverse la table `aliases` de l'import map (alias -> paquet) en paquet -> alias[].
 * Tolérante : une table absente ou mal formée donne une table vide.
 */
export function invertAliases(aliases: Record<string, string> | undefined | null): Map<string, string[]> {
  const byApp = new Map<string, string[]>();
  if (!aliases || typeof aliases !== 'object') {
    return byApp;
  }
  for (const [alias, target] of Object.entries(aliases)) {
    if (typeof alias !== 'string' || typeof target !== 'string' || !alias.trim() || !target.trim()) {
      continue;
    }
    const list = byApp.get(target) ?? [];
    list.push(alias);
    byApp.set(target, list);
  }
  return byApp;
}
