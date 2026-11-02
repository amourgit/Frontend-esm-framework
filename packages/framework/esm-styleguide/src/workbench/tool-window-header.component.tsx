import React, { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Attribut posé sur le conteneur (compartiment) qui affiche une fenêtre d'outils ; son en-tête s'y trouve. */
export const TOOL_WINDOW_CONTAINER_ATTRIBUTE = 'data-tool-window-container';

/** Attribut de l'emplacement d'en-tête d'une zone (entre le titre et le bouton de fermeture). */
export const TOOL_WINDOW_HEADER_ATTRIBUTE = 'data-tool-window-header';

export interface ToolWindowHeaderProps {
  /** Actions et contrôles de la fenêtre d'outils (boutons, recherche, filtres…). */
  children: ReactNode;
}

/**
 * Place `children` dans l'en-tête de la zone qui affiche la fenêtre d'outils, à droite du titre et à
 * gauche du bouton de fermeture : la fenêtre n'a ainsi pas à réserver une barre d'outils dans son
 * propre contenu. Les enfants restent rendus par la fenêtre (son état, ses contextes et ses
 * gestionnaires d'événements) ; seul leur emplacement dans le DOM change.
 *
 * Hors d'une zone (Storybook, tests, rendu autonome), les enfants sont rendus sur place.
 */
export function ToolWindowHeader({ children }: ToolWindowHeaderProps) {
  const markerRef = useRef<HTMLSpanElement>(null);
  // undefined : pas encore résolu · null : hors zone (rendu sur place) · élément : emplacement de la zone.
  const [slot, setSlot] = useState<HTMLElement | null | undefined>(undefined);

  useLayoutEffect(() => {
    // Compartiment de la fenêtre (une zone latérale peut en empiler plusieurs) ; à défaut, la zone elle-même.
    const zone = markerRef.current?.closest(`[${TOOL_WINDOW_CONTAINER_ATTRIBUTE}], aside[data-anchor]`);
    setSlot(zone?.querySelector<HTMLElement>(`[${TOOL_WINDOW_HEADER_ATTRIBUTE}]`) ?? null);
  }, []);

  return (
    <>
      <span ref={markerRef} hidden />
      {slot === undefined ? null : slot === null ? children : createPortal(children, slot)}
    </>
  );
}
