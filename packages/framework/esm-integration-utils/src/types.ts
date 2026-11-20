import type { LifeCycles } from 'single-spa';

/** Magasin de type zustand (`StoreApi`) : seul le contrat minimal est exigé, aucun import de zustand. */
export interface StoreLike<T> {
  getState(): T;
  subscribe(listener: (state: T, previousState: T) => void): () => void;
}

export type Unsubscribe = () => void;

/** Options communes à toutes les fabriques de lifecycle (React, Vue, Angular…). */
export interface LifecycleOptions {
  /** Nom du module = `name` du `package.json` (espace de noms i18n et configuration). */
  moduleName: string;
  /** Nom fonctionnel (journaux, diagnostic). */
  featureName: string;
  /** Pas de traductions fournies au composant. */
  disableTranslations?: boolean;
  /** Relancer l'erreur interceptée vers la console (défaut `true`). */
  throwErrorsToConsole?: boolean;
}

/**
 * Forme d'un export d'app lu par le Shell (`loadLifeCycles`) : une **fonction** renvoyant
 * des lifecycles Single-SPA, éventuellement via une promesse.
 */
export type LifecycleExport<P = any> = () => LifeCycles<P> | Promise<LifeCycles<P>>;
