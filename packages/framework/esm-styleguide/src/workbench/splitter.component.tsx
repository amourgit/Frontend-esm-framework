import React, { useRef } from 'react';
import type { ToolWindowAnchor } from '@egen-civitas/esm-extensions';
import { useStore } from '@egen-civitas/esm-react-utils';
import { clampZoneSize, resetZoneSize, setZoneSize, workbenchStore } from './workbench.store.js';
import styles from './workbench.module.scss';

const KEYBOARD_STEP = 16;
const RESIZING_ATTRIBUTE = 'data-workbench-resizing';

interface SplitterProps {
  anchor: ToolWindowAnchor;
  /** Libellé accessible de la poignée. */
  label: string;
}

/**
 * Poignée de redimensionnement d'une zone : glisser à la souris/au doigt, flèches au clavier,
 * double-clic pour revenir à la taille par défaut. La poignée est centrée dans l'écart entre la
 * zone et le contenu central ; la taille est calculée à partir du bord opposé, qui ne bouge pas.
 * L'écart entre le point saisi et la frontière est mémorisé : la frontière suit le pointeur sans
 * saut au début du glissement, même si la poignée a été saisie à côté de son centre.
 */
export function Splitter({ anchor, label }: SplitterProps) {
  // NB : `useStore` retourne toujours un objet (état étalé) : on lit l'état entier, jamais une valeur primitive.
  const { sizes } = useStore(workbenchStore);
  const size = sizes[anchor];
  const dragging = useRef<{ edge: number; grab: number } | null>(null);
  const vertical = anchor !== 'bottom'; // poignée verticale (redimensionne la largeur)

  const sizeFromPointer = (clientX: number, clientY: number, edge: number, grab: number) => {
    if (anchor === 'left') return clientX - grab - edge;
    if (anchor === 'right') return edge - (clientX - grab);
    return edge - (clientY - grab);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const cell = event.currentTarget.parentElement?.parentElement ?? event.currentTarget.parentElement;
    if (!cell) return;
    const rect = cell.getBoundingClientRect();
    // Bord fixe de la zone : gauche pour `left`, droite pour `right`, bas pour `bottom`.
    const edge = anchor === 'left' ? rect.left : anchor === 'right' ? rect.right : rect.bottom;
    // Bord mobile de la cellule, au milieu de l'écart où se trouve la poignée.
    const movingEdge = anchor === 'left' ? rect.right : anchor === 'right' ? rect.left : rect.top;
    const pointer = anchor === 'bottom' ? event.clientY : event.clientX;
    dragging.current = { edge, grab: pointer - movingEdge };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    document.documentElement.setAttribute(RESIZING_ATTRIBUTE, anchor);
    event.preventDefault();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    setZoneSize(anchor, sizeFromPointer(event.clientX, event.clientY, dragging.current.edge, dragging.current.grab));
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    document.documentElement.removeAttribute(RESIZING_ATTRIBUTE);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Le sens « agrandir » dépend du bord : une zone gauche grandit vers la droite, etc.
    const grow = anchor === 'left' ? 'ArrowRight' : anchor === 'right' ? 'ArrowLeft' : 'ArrowUp';
    const shrink = anchor === 'left' ? 'ArrowLeft' : anchor === 'right' ? 'ArrowRight' : 'ArrowDown';
    if (event.key === grow) setZoneSize(anchor, workbenchStore.getState().sizes[anchor] + KEYBOARD_STEP);
    else if (event.key === shrink) setZoneSize(anchor, workbenchStore.getState().sizes[anchor] - KEYBOARD_STEP);
    else if (event.key === 'Home') setZoneSize(anchor, 0);
    else if (event.key === 'End') setZoneSize(anchor, Number.MAX_SAFE_INTEGER);
    else return;
    event.preventDefault();
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-valuenow={size}
      aria-valuemin={clampZoneSize(anchor, 0)}
      aria-valuemax={clampZoneSize(anchor, Number.MAX_SAFE_INTEGER)}
      data-anchor={anchor}
      className={`${styles.splitter} ${styles[`splitter-${anchor}`]}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onDoubleClick={() => resetZoneSize(anchor)}
      onKeyDown={onKeyDown}
    />
  );
}
