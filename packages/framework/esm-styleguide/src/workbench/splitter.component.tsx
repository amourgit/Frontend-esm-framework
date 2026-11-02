import React, { useRef } from 'react';
import type { ToolWindowAnchor } from '@egen-civitas/esm-extensions';
import { useStore } from '@egen-civitas/esm-react-utils';
import { fitCompartmentHeights, resizeCompartmentBoundary, type CompartmentItem } from './compartments.js';
import {
  clampZoneSize,
  resetZoneSize,
  setCompartmentHeights,
  setZoneSize,
  workbenchStore,
  type SideAnchor,
} from './workbench.store.js';
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

type CornerSide = 'left' | 'right';

interface CornerSplitterProps {
  /** Zone latérale dont la frontière croise celle de la zone basse. */
  side: CornerSide;
  label: string;
}

/**
 * Poignée d'angle : posée à l'intersection de trois zones (latérale / centre / bas), elle redimensionne
 * les deux axes d'un même geste — la largeur de la zone latérale et la hauteur de la zone basse.
 * Le déplacement est relatif au point saisi : la frontière suit le pointeur sans saut. Double-clic :
 * les deux tailles reviennent à leur valeur par défaut. Les deux poignées linéaires restent
 * disponibles (souris et clavier) ; l'angle est donc un raccourci pointeur, masqué aux lecteurs d'écran.
 */
export function CornerSplitter({ side, label }: CornerSplitterProps) {
  const start = useRef<{ x: number; y: number; side: number; bottom: number } | null>(null);
  const attribute = `corner-${side}`;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const { sizes } = workbenchStore.getState();
    start.current = { x: event.clientX, y: event.clientY, side: sizes[side], bottom: sizes.bottom };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    document.documentElement.setAttribute(RESIZING_ATTRIBUTE, attribute);
    event.preventDefault();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const origin = start.current;
    if (!origin) return;
    const dx = event.clientX - origin.x;
    // Zone gauche : grandit vers la droite ; zone droite : vers la gauche ; zone basse : vers le haut.
    setZoneSize(side, origin.side + (side === 'left' ? dx : -dx));
    setZoneSize('bottom', origin.bottom - (event.clientY - origin.y));
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    start.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    document.documentElement.removeAttribute(RESIZING_ATTRIBUTE);
  };

  const reset = () => {
    resetZoneSize(side);
    resetZoneSize('bottom');
  };

  return (
    <div
      aria-hidden="true"
      title={label}
      data-corner={side}
      className={`${styles.cornerSplitter} ${styles[`cornerSplitter-${side}`]}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onDoubleClick={reset}
    />
  );
}

const COMPARTMENT_KEYBOARD_STEP = 5; // points de pourcentage

const toRecord = (items: readonly CompartmentItem[], heights: readonly number[]) =>
  Object.fromEntries(items.map((item, i) => [item.key, heights[i]]));

interface CompartmentSplitterProps {
  anchor: SideAnchor;
  /** Rang de la frontière : celle qui sépare le compartiment `index` du suivant. */
  index: number;
  /** Compartiments affichés dans la zone, dans l'ordre. */
  items: readonly CompartmentItem[];
  /** Hauteurs courantes (%) des compartiments. */
  heights: readonly number[];
  label: string;
}

/**
 * Poignée entre deux compartiments empilés d'une zone latérale : glisser (souris/doigt) ou flèches haut/bas
 * déplacent la frontière ; les autres compartiments s'ajustent selon leurs minimum et maximum, la somme restant
 * à 100 % de la zone. Double-clic : hauteurs de base. Elle occupe l'écart entre les deux cartes.
 */
export function CompartmentSplitter({ anchor, index, items, heights, label }: CompartmentSplitterProps) {
  const start = useRef<{ y: number; heights: number[]; perPixel: number } | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const zone = event.currentTarget.parentElement;
    if (!zone) return;
    // Hauteur répartie entre les compartiments = hauteur de la zone moins les écarts (poignées).
    const gap = event.currentTarget.getBoundingClientRect().height;
    const available = zone.getBoundingClientRect().height - gap * (items.length - 1);
    if (!(available > 0)) return;
    start.current = { y: event.clientY, heights: [...heights], perPixel: 100 / available };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    document.documentElement.setAttribute(RESIZING_ATTRIBUTE, `compartment-${anchor}`);
    event.preventDefault();
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const origin = start.current;
    if (!origin) return;
    const delta = (event.clientY - origin.y) * origin.perPixel;
    setCompartmentHeights(toRecord(items, resizeCompartmentBoundary(origin.heights, items, index, delta)));
  };

  const stopDragging = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    start.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    document.documentElement.removeAttribute(RESIZING_ATTRIBUTE);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const delta = event.key === 'ArrowDown' ? COMPARTMENT_KEYBOARD_STEP : -COMPARTMENT_KEYBOARD_STEP;
    setCompartmentHeights(toRecord(items, resizeCompartmentBoundary(heights, items, index, delta)));
    event.preventDefault();
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuenow={Math.round(heights[index])}
      aria-valuemin={0}
      aria-valuemax={100}
      data-compartment-splitter={index}
      className={styles.compartmentSplitter}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onDoubleClick={() => setCompartmentHeights(toRecord(items, fitCompartmentHeights(items, {})))}
      onKeyDown={onKeyDown}
    />
  );
}
