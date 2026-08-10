// =============================================================================
//  @egen/esm-ai-tools — Registre de routes IA
//
//  Problème résolu : le tool `navigate` prend une route en argument, mais
//  rien n'empêchait le LLM de DEVINER un chemin plausible (ex: "/login")
//  sans jamais savoir s'il existe vraiment, ni quels paramètres il attend.
//  Ce registre permet à n'importe quel module — natif ou microfrontend —
//  de déclarer ses routes avec une description et des paramètres, pour que
//  le LLM les CONSULTE (via le contexte IA et/ou le tool `list_routes`)
//  au lieu de deviner.
//
//  Enregistrement par un microfrontend, via defineAIModule (voir
//  @egen/esm-ai-extensions) :
//
//  ```ts
//  defineAIModule({
//    moduleName: '@school/esm-grades-app',
//    routes: [
//      {
//        path: '/grades/:studentUuid',
//        description: "Affiche le bulletin de notes d'un étudiant.",
//        params: [{ name: 'studentUuid', type: 'string', required: true, description: "UUID de l'étudiant" }],
//      },
//    ],
//  });
//  ```
//
//  Limite connue : ce registre ne reflète QUE ce que les modules déclarent
//  explicitement. Un module qui ne déclare rien ici reste invisible du
//  LLM pour la navigation fine — seule sa présence dans routes.json
//  (au niveau du shell/single-spa) le rend accessible via une navigation
//  directe si l'URL exacte est connue par ailleurs. Une dérivation
//  automatique depuis routes.json (regex de montage, moins riche : pas de
//  description ni de paramètres par route logique) pourrait être ajoutée
//  plus tard comme filet de secours, mais n'est pas implémentée ici.
// =============================================================================

export interface AIRouteParam {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  description: string;
}

export interface AIRouteDefinition {
  /**
   * Chemin logique de la route, relatif à la racine de la SPA, avec
   * d'éventuels segments paramétrés au format ":nom" (ex: "/students/:id").
   * Ne JAMAIS inclure de préfixe d'environnement (pas de "${egenSpaBase}",
   * pas de domaine) — c'est le tool `navigate` qui se charge de résoudre
   * le chemin final ; ce registre ne décrit que la partie logique.
   */
  path: string;
  /** Description humaine de ce que cette route affiche/permet de faire, à destination du LLM. */
  description: string;
  /** Paramètres attendus dans le chemin (segments ":nom") ou en query string. */
  params?: AIRouteParam[];
  /** Module ayant déclaré cette route (renseigné automatiquement par defineAIModule si omis). */
  moduleName?: string;
}

const _routes = new Map<string, AIRouteDefinition>();

export function registerRoute(route: AIRouteDefinition): void {
  _routes.set(route.path, route);
}

export function removeRoute(path: string): void {
  _routes.delete(path);
}

export function getAllRoutes(): AIRouteDefinition[] {
  return Array.from(_routes.values());
}

/**
 * Catalogue condensé des routes déclarées, au format le plus léger possible
 * pour être inclus directement dans le contexte envoyé au LLM à chaque
 * message (voir esm-ai-assistant-app, context provider "available-routes").
 */
export function getRoutesCatalogForLLM(): Array<{
  path: string;
  description: string;
  params: AIRouteParam[];
}> {
  return getAllRoutes().map((r) => ({ path: r.path, description: r.description, params: r.params ?? [] }));
}

/** @internal — tests uniquement */
export function _clearRouteRegistry(): void {
  _routes.clear();
}
