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
 * Motifs de noms de slots d'extension : `topbar-nav-slot` (exact) ou `annuaire-*` (préfixe, `*` final obligatoire).
 * Le motif seul `*` n'est volontairement PAS supporté : un grant doit nommer les slots qu'il ouvre.
 */
export function slotCovers(ceiling: string, q: string): boolean {
  if (ceiling === q) return true;
  return ceiling.length > 1 && ceiling.endsWith('*') && q.startsWith(ceiling.slice(0, -1));
}

export function slotAllowed(patterns: readonly string[] | undefined, slot: string): boolean {
  return !!patterns && patterns.some((p) => slotCovers(p, slot));
}
