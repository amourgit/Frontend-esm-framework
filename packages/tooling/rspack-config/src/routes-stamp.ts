import { validRange } from 'semver';

/** Nom du package dont la plage de compatibilité est estampillée dans `routes.json`. */
export const FRAMEWORK_PACKAGE = '@egen-civitas/esm-framework';

/**
 * Plage de versions du framework avec laquelle l'app est construite : sa `peerDependency` sur `esm-framework`.
 * Retourne `undefined` si elle est absente ou n'est pas une plage semver valide (on n'estampille jamais une valeur
 * douteuse : au démarrage, une plage illisible écarterait l'app).
 */
export function resolveFrameworkRange(peerDependencies?: Record<string, string>): string | undefined {
  const range = peerDependencies?.[FRAMEWORK_PACKAGE];
  return typeof range === 'string' && validRange(range) !== null ? range : undefined;
}

/**
 * Contenu final du `routes.json` publié avec l'app : le fichier source + `version` + `frameworkRange`.
 * Le shell écarte au démarrage (journalisé) une app dont `frameworkRange` n'est pas satisfaite par son framework.
 */
export function stampRoutes(
  content: string | Buffer,
  { version, peerDependencies }: { version: string; peerDependencies?: Record<string, string> },
): string {
  const frameworkRange = resolveFrameworkRange(peerDependencies);
  return JSON.stringify(
    Object.assign({}, JSON.parse(content.toString()), { version }, frameworkRange ? { frameworkRange } : {}),
  );
}
