/** @category Section */
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

// =============================================================================
//  EN-TÊTE COLLANT — mécanique partagée par `Section` et `SectionSlot`
//
//  Principe : tout passe par des variables CSS. Elles s'héritent à travers le
//  DOM, donc aussi d'un parcel single-spa à l'autre : un `SectionSlot` (shell
//  ou app hôte) les pose sur son conteneur et les `Section` rendues par les
//  extensions d'AUTRES apps les reçoivent sans contexte React partagé.
//
//    --section-header-position  `sticky` | `static`   (hérité, surchargeable)
//    --section-sticky-top       décalage du haut de la zone de défilement
//    --section-sticky-z         empilement
//    --section-sticky-bg        fond une fois collé (verre sombre par défaut)
//
//  Le `position: sticky` d'un en-tête est borné par son parent direct (la
//  racine de la `Section`) : il reste visible tant que le corps l'est, puis
//  repart avec la section — la suivante prend le relais, sans code de plus.
//  Condition : aucun ancêtre jusqu'à la zone de défilement (#egen-scroll-region)
//  ne doit poser `overflow` autre que `visible`.
// =============================================================================

export const STICKY_VARS = {
  position: '--section-header-position',
  top: '--section-sticky-top',
  zIndex: '--section-sticky-z',
} as const;

export interface StickyOptions {
  sticky?: boolean;
  offset?: string;
  zIndex?: number;
}

/** Variables CSS à poser (en `style`) pour activer / désactiver le mode collant. */
export function stickyStyleVars({ sticky, offset, zIndex }: StickyOptions): CSSProperties {
  const vars: Record<string, string | number> = {};
  if (sticky !== undefined) {
    vars[STICKY_VARS.position] = sticky ? 'sticky' : 'static';
  }
  if (offset !== undefined) {
    vars[STICKY_VARS.top] = offset;
  }
  if (zIndex !== undefined) {
    vars[STICKY_VARS.zIndex] = zIndex;
  }
  return vars as CSSProperties;
}

/** Le corps d'une section coupe l'héritage : une section imbriquée ne devient pas collante par accident. */
export const STICKY_RESET: CSSProperties = { [STICKY_VARS.position]: 'static' } as CSSProperties;

/**
 * Détecte si l'en-tête est actuellement collé. Un sentinelle d'1 px placé juste
 * avant l'en-tête quitte la zone visible au moment où l'en-tête se colle.
 * Retourne `isSticky` (la position calculée est bien `sticky` — à lire après
 * montage car héritée du DOM) et `stuck`.
 */
export function useStickyState(
  headerRef: RefObject<HTMLElement>,
  recheckKey: unknown,
): { isSticky: boolean; stuck: boolean; sentinelRef: RefObject<HTMLDivElement> } {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = headerRef.current;
    setIsSticky(!!el && getComputedStyle(el).position === 'sticky');
  }, [headerRef, recheckKey]);

  useEffect(() => {
    const header = headerRef.current;
    const sentinel = sentinelRef.current;
    if (!isSticky || !header || !sentinel || typeof IntersectionObserver === 'undefined') {
      setStuck(false);
      return undefined;
    }
    const top = parseFloat(getComputedStyle(header).top) || 0;
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      rootMargin: `-${top}px 0px 0px 0px`,
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [headerRef, isSticky]);

  return { isSticky, stuck, sentinelRef };
}
