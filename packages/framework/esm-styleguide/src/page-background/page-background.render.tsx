/** @module @category Page Background */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { GlobalPageBackground } from './page-background.component.js';

/**
 * Démarre l'hôte de rendu de l'arrière-plan global de page. À utiliser
 * uniquement par le shell (une seule fois) ; les apps déclarent leur fond avec
 * `<PageBackground>`.
 *
 * Par défaut, toute page sans `<PageBackground>` affiche le fond animé
 * d'accueil (`fallback="animated"`) : c'est LE fond système du shell, visible
 * nativement sur toutes les apps. Une page qui souhaite un autre fond le
 * déclare avec `<PageBackground>` ; `fallback="none"` reste possible pour un
 * rendu sans aucun fond.
 *
 * @param target Le conteneur qui héberge l'arrière-plan.
 */
export function renderPageBackground(target: HTMLElement | null) {
  if (target) {
    const root = createRoot(target);
    root.render(<GlobalPageBackground fallback="animated" />);
  }
}
