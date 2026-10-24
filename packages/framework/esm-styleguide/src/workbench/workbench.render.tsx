/** @module @category Workbench */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { LeftRail, RightRail } from './tool-window-rail.component.js';
import { ToolWindowZone } from './tool-window-zone.component.js';

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
  if (railLeft) createRoot(railLeft).render(<LeftRail />);
  if (railRight) createRoot(railRight).render(<RightRail />);
  if (zoneLeft) createRoot(zoneLeft).render(<ToolWindowZone anchor="left" />);
  if (zoneRight) createRoot(zoneRight).render(<ToolWindowZone anchor="right" />);
  if (zoneBottom) createRoot(zoneBottom).render(<ToolWindowZone anchor="bottom" />);
}
