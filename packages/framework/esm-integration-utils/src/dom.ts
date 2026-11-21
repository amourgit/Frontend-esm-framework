/**
 * Élément DOM où monter un composant.
 *  - extension / modale / workspace : le Shell passe `domElement` (parcel) ;
 *  - page : Single-SPA monte dans `<div id="single-spa-application:<nom>">` créé par le Shell.
 */
export function resolveMountTarget(props: { domElement?: HTMLElement | null; name?: string }): HTMLElement {
  if (props.domElement) return props.domElement;
  const id = `single-spa-application:${props.name}`;
  const el = props.name ? document.getElementById(id) : null;
  if (!el) throw new Error(`Aucun élément de montage pour « ${props.name ?? '?'} » (#${id} introuvable, pas de domElement).`);
  return el;
}
