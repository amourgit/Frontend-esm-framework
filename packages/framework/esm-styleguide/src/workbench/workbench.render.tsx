/** @module @category Workbench */
import React, { type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { egenComponentDecorator } from '@egen-civitas/esm-react-utils';
import { LeftRail, RightRail } from './tool-window-rail.component.js';
import { ToolWindowZone } from './tool-window-zone.component.js';

/**
 * Le shell monte chaque morceau du plan de travail dans sa propre racine React, hors de toute app :
 * sans décorateur, ces racines n'ont ni `ComponentContext` (les `ExtensionSlot` de `ToolWindowZone`
 * levaient « ComponentContext has not been provided » dès qu'on ouvrait une fenêtre d'outils),
 * ni namespace i18n, ni garde d'erreur. On les décore donc comme n'importe quelle app.
 * `strictMode` est désactivé : ce sont des éléments de châssis du shell, montés une seule fois.
 */
const decoratorOptions = {
  moduleName: '@egen-civitas/esm-styleguide',
  featureName: 'workbench',
  strictMode: false,
};
const DecoratedLeftRail = egenComponentDecorator<ComponentProps<typeof LeftRail>>(decoratorOptions)(LeftRail);
const DecoratedRightRail = egenComponentDecorator<ComponentProps<typeof RightRail>>(decoratorOptions)(RightRail);
const DecoratedToolWindowZone =
  egenComponentDecorator<ComponentProps<typeof ToolWindowZone>>(decoratorOptions)(ToolWindowZone);

export interface WorkbenchTargets {
  railLeft: HTMLElement | null;
  railRight: HTMLElement | null;
  zoneLeft: HTMLElement | null;
  zoneRight: HTMLElement | null;
  zoneBottom: HTMLElement | null;
}

/**
 * Monte le plan de travail du shell : rails gauche/droit fixes et zones gauche, droite, bas
 * redimensionnables. À utiliser uniquement par le shell, une seule fois ; les apps y déclarent
 * leurs fenêtres d'outils par extensions (voir `ToolWindowMeta`).
 *
 * Tant qu'aucune extension n'est déclarée, les rails sont vides et les zones repliées.
 */
export function renderWorkbench({ railLeft, railRight, zoneLeft, zoneRight, zoneBottom }: WorkbenchTargets) {
  if (railLeft) createRoot(railLeft).render(<DecoratedLeftRail />);
  if (railRight) createRoot(railRight).render(<DecoratedRightRail />);
  if (zoneLeft) createRoot(zoneLeft).render(<DecoratedToolWindowZone anchor="left" />);
  if (zoneRight) createRoot(zoneRight).render(<DecoratedToolWindowZone anchor="right" />);
  if (zoneBottom) createRoot(zoneBottom).render(<DecoratedToolWindowZone anchor="bottom" />);
}
