/**
 * Synchronise la hauteur réelle des barres du shell avec des variables CSS :
 *
 *  - TopBar  (`#egen-top-nav-app-container`) -> `--egen-navbar-height`
 *  - Footer  (`#egen-footer-app-container`)  -> `--egen-footer-height`
 *
 * Pourquoi : la TopBar peut avoir 2 niveaux (niveau 1 + navigation niveau 2) et
 * le footer une hauteur libre. Les deux conteneurs ont une hauteur automatique
 * (ils suivent leur contenu) ; la zone de scroll `#egen-scroll-region` occupe
 * exactement l'espace entre les deux et coupe le contenu net à chaque frontière.
 * Tout ce qui est positionné par rapport à la fenêtre (workspaces, action-menu,
 * panneaux latéraux...) lit ces variables : les mesurer en direct évite qu'un
 * niveau 2 ou un footer « déborde » sur le contenu.
 */
const BARS = [
  { id: 'egen-top-nav-app-container', cssVar: '--egen-navbar-height' },
  { id: 'egen-footer-app-container', cssVar: '--egen-footer-height' },
] as const;

function syncHeight(container: HTMLElement, cssVar: string): () => void {
  const root = document.documentElement;
  let last = -1;

  const apply = () => {
    // display:none (routes publiques) -> 0 ; sinon hauteur mesurée.
    const height = Math.round(container.getBoundingClientRect().height);
    if (height !== last) {
      last = height;
      root.style.setProperty(cssVar, `${height}px`);
    }
  };

  const observer = new ResizeObserver(apply);
  observer.observe(container);
  apply();

  return () => {
    observer.disconnect();
    root.style.removeProperty(cssVar);
  };
}

export function setupLayoutHeightSync(): () => void {
  if (typeof ResizeObserver === 'undefined') {
    return () => {};
  }

  const cleanups = BARS.flatMap(({ id, cssVar }) => {
    const container = document.getElementById(id);
    return container ? [syncHeight(container, cssVar)] : [];
  });

  return () => cleanups.forEach((cleanup) => cleanup());
}

/** @deprecated Conservé pour compatibilité : utiliser `setupLayoutHeightSync`. */
export const setupNavbarHeightSync = setupLayoutHeightSync;
