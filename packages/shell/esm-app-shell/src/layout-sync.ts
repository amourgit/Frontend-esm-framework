/**
 * Synchronise la hauteur réelle de la TopBar (tous niveaux confondus) avec la
 * variable CSS `--egen-navbar-height`.
 *
 * Pourquoi : la TopBar peut avoir 2 niveaux (niveau 1 + navigation niveau 2).
 * Le conteneur `#egen-top-nav-app-container` a désormais une hauteur
 * automatique (elle suit le contenu), et tout ce qui dépend de la hauteur de
 * la barre (workspaces, action-menu, panneaux latéraux...) lit cette variable :
 * la mesurer en direct évite qu'un niveau 2 « déborde » sur le contenu.
 */
const CONTAINER_ID = 'egen-top-nav-app-container';
const CSS_VAR = '--egen-navbar-height';

export function setupNavbarHeightSync(): () => void {
  const container = document.getElementById(CONTAINER_ID);
  if (!container || typeof ResizeObserver === 'undefined') {
    return () => {};
  }

  const root = document.documentElement;
  let last = -1;

  const apply = () => {
    const height = Math.round(container.getBoundingClientRect().height);
    if (height !== last) {
      last = height;
      root.style.setProperty(CSS_VAR, `${height}px`);
    }
  };

  const observer = new ResizeObserver(apply);
  observer.observe(container);
  apply();

  return () => {
    observer.disconnect();
    root.style.removeProperty(CSS_VAR);
  };
}
