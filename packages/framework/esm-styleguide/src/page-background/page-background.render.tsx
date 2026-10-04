/** @module @category Page Background */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { GlobalPageBackground } from './page-background.component.js';

/**
 * Démarre l'hôte de rendu de l'arrière-plan global de page. À utiliser
 * uniquement par le shell (une seule fois) ; les apps déclarent leur fond avec
 * `<PageBackground>`.
 *
 * Tant qu'aucune page n'a déclaré de fond, rien n'est affiché (`fallback="none"`) :
 * monter l'hôte ne change donc l'apparence d'aucune app existante.
 *
 * @param target Le conteneur qui héberge l'arrière-plan.
 */
export function renderPageBackground(target: HTMLElement | null) {
  if (target) {
    const root = createRoot(target);
    root.render(<GlobalPageBackground fallback="none" />);
  }
}
