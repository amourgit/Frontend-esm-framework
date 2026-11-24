/**
 * Motifs de sujets : `a.b` (exact) ou `a.b.*` (préfixe, le point est inclus).
 * Le motif seul `*` n'est volontairement PAS supporté : un grant doit nommer ce qu'il ouvre.
 */
export function patternCovers(ceiling: string, q: string): boolean {
  if (ceiling === q) return true;
  if (ceiling.endsWith('.*')) return q.startsWith(ceiling.slice(0, -1));
  return false;
}

/** Un sujet concret est-il autorisé par au moins un motif ? */
export function topicAllowed(patterns: readonly string[] | undefined, topic: string): boolean {
  return !!patterns && patterns.some((p) => patternCovers(p, topic));
}

/**
 * Chemins d'API : `/a/b` (exact) ou `/a/b/*` (préfixe, le `/` est inclus). Requête et fragment ignorés pour la comparaison.
 * Refusés d'office : `..`, `%2e`, `%2f`, `%5c`, `//`, `\\`, caractères de contrôle (contournements classiques de filtrage de chemin).
 */
export function normalizeApiPath(path: string): string | null {
  const p = path.split(/[?#]/)[0];
  // eslint-disable-next-line no-control-regex
  if (!p.startsWith('/') || /(^|\/)\.\.?(\/|$)|%2e|%2f|%5c|\/\/|\\|[\u0000-\u001f\u007f]/i.test(p)) return null;
  return p;
}

export function pathCovers(ceiling: string, q: string): boolean {
  if (ceiling === q) return true;
  return ceiling.endsWith('/*') && q.startsWith(ceiling.slice(0, -1));
}

export function pathAllowed(patterns: readonly string[] | undefined, path: string): boolean {
  const p = normalizeApiPath(path);
  return p !== null && !!patterns && patterns.some((c) => pathCovers(c, p));
}
