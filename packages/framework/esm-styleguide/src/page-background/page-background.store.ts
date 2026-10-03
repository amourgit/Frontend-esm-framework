import { getGlobalStore } from '@egen-civitas/esm-state';
import type { PageBackgroundProps } from './page-background.component.js';

/**
 * État global (unique pour toute l'application) de l'arrière-plan de page.
 *
 * Il passe par `@egen-civitas/esm-state` et non par un contexte React : chaque
 * app micro-frontend est montée dans sa propre racine React, et un contexte ne
 * traverserait pas ces racines. Le shell monte un unique `<GlobalPageBackground>`
 * (voir `renderPageBackground`) qui lit cet état ; n'importe quelle app le
 * renseigne avec `<PageBackground>`.
 *
 * `owner` identifie la page qui a déclaré le fond : un démontage tardif d'une
 * ancienne page (ex. changement d'app) ne doit pas effacer le fond que la
 * nouvelle page vient de déclarer.
 */
export interface PageBackgroundState {
  config: PageBackgroundProps | null;
  owner: object | null;
}

export const pageBackgroundStore = getGlobalStore<PageBackgroundState>('pageBackground', {
  config: null,
  owner: null,
});

/** Déclare (ou met à jour) le fond de la page `owner`. */
export function claimPageBackground(owner: object, config: PageBackgroundProps) {
  pageBackgroundStore.setState({ config, owner });
}

/** Libère le fond de la page `owner` — sans effet si une autre page l'a repris entre-temps. */
export function releasePageBackground(owner: object) {
  if (pageBackgroundStore.getState().owner === owner) {
    pageBackgroundStore.setState({ config: null, owner: null });
  }
}

/** Définit directement le fond global (sans propriétaire). Préférer `<PageBackground>`. */
export function setGlobalPageBackground(config: PageBackgroundProps | null) {
  pageBackgroundStore.setState({ config, owner: null });
}
