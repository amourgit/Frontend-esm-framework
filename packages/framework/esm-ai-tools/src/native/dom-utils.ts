// =============================================================================
//  @egen-civitas/esm-ai-tools — Utilitaires DOM partagés par les tools natifs
//
//  Source unique pour tout ce que describe_screen, inspect_element et les tools
//  de lecture de page (read_page, read_component, find_in_page…) ont en commun :
//  visibilité, nom accessible, rédaction des champs sensibles, références
//  d'éléments, traversée profonde (Shadow DOM + iframes même origine) et
//  identification des composants (React, Carbon).
//
//  Règle : les nouveaux modules testent les balises via `localName` (et non
//  `instanceof HTMLxxxElement`) — un élément issu d'une iframe appartient à un
//  autre « realm » et ferait échouer tous les `instanceof`.
// =============================================================================

export const REDACTED = '••••••';

// ─── Texte ────────────────────────────────────────────────────────────────────

export function collapseWhitespace(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

export function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… [tronqué à ${max} caractères]`;
}

/** Version courte pour les extraits (pas de suffixe verbeux). */
export function snippet(text: string, max = 120): string {
  const flat = collapseWhitespace(text);
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

export function tagOf(el: Element): string {
  return el.localName.toLowerCase();
}

export function isTag(el: Element, ...tags: string[]): boolean {
  return tags.includes(el.localName.toLowerCase());
}

/** Fenêtre propriétaire de l'élément (celle de l'iframe pour un élément d'iframe). */
export function windowOf(el: Element): Window {
  return (el.ownerDocument?.defaultView as Window | null) ?? window;
}

export function computedStyleOf(el: Element, pseudo?: string): CSSStyleDeclaration {
  return windowOf(el).getComputedStyle(el, pseudo);
}

export function roundedRect(el: Element): { x: number; y: number; width: number; height: number } {
  const rect = el.getBoundingClientRect();
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

// ─── Champs sensibles ─────────────────────────────────────────────────────────

/** Types de champs dont la VALEUR ne doit jamais être transmise en clair (hidden : jetons CSRF, etc.). */
const SENSITIVE_INPUT_TYPES = new Set(['password', 'hidden']);

/**
 * Noms / autocomplete / libellés évoquant une donnée sensible, même sur un champ texte.
 * Un faux positif (valeur masquée à tort) est sans conséquence ; un faux négatif fuit un secret.
 */
const SENSITIVE_PATTERN =
  /password|passwd|secret|token|credential|jeton|mot[\s_-]*de[\s_-]*passe|passeport|\bmdp\b|cvv|cvc|iban|card[\s_-]*number|cc-(?:number|csc|exp)|one-time-code|(?:^|[^a-z])(?:pin|nir|ssn|otp)(?:$|[^a-z])/i;

export function isFormControl(el: Element): boolean {
  return isTag(el, 'input', 'textarea', 'select');
}

export function isSensitiveField(el: Element): boolean {
  if (!isFormControl(el)) return false;
  const control = el as HTMLInputElement;
  if (isTag(el, 'input') && SENSITIVE_INPUT_TYPES.has((control.type ?? '').toLowerCase())) return true;
  const hints = [
    el.getAttribute('name'),
    el.id,
    el.getAttribute('autocomplete'),
    el.getAttribute('aria-label'),
    el.getAttribute('placeholder'),
    el.getAttribute('data-testid'),
    (control as { labels?: NodeListOf<HTMLLabelElement> | null }).labels?.[0]?.textContent,
  ];
  return hints.some((hint) => Boolean(hint) && SENSITIVE_PATTERN.test(hint as string));
}

export interface FieldValue {
  value: string;
  redacted: boolean;
}

/** Valeur courante d'un champ (select : libellés des options choisies), masquée si le champ est sensible. */
export function readFieldValue(el: Element): FieldValue | null {
  if (
    !isFormControl(el) &&
    el.getAttribute('contenteditable') !== 'true' &&
    el.getAttribute('contenteditable') !== ''
  ) {
    return null;
  }
  if (isSensitiveField(el)) return { value: REDACTED, redacted: true };

  if (isTag(el, 'select')) {
    const select = el as HTMLSelectElement;
    const labels = Array.from(select.options ?? [])
      .filter((o) => o.selected)
      .map((o) => collapseWhitespace(o.label || o.textContent));
    return { value: labels.join(', '), redacted: false };
  }
  if (isFormControl(el)) return { value: (el as HTMLInputElement).value ?? '', redacted: false };
  return { value: collapseWhitespace(el.textContent), redacted: false };
}

/**
 * `textContent` SANS le contenu des champs : le texte d'un <textarea> est sa valeur (souvent saisie par
 * l'utilisateur), et celui d'un champ sensible est un secret. Ignore aussi script/style. À utiliser partout où
 * le texte d'un élément QUELCONQUE (conteneur, formulaire, modale) part vers le backend.
 */
export function safeTextContent(el: Element): string {
  const parts: string[] = [];
  const visit = (node: Node): void => {
    if (node.nodeType === 3) {
      parts.push(node.textContent ?? '');
      return;
    }
    if (node.nodeType !== 1) return;
    const child = node as Element;
    const tag = child.localName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'textarea' || (isFormControl(child) && isSensitiveField(child)))
      return;
    for (const grandChild of Array.from(child.childNodes)) visit(grandChild);
  };
  if (isTag(el, 'textarea') || (isFormControl(el) && isSensitiveField(el))) return '';
  for (const child of Array.from(el.childNodes)) visit(child);
  return parts.join('');
}

// ─── Visibilité ───────────────────────────────────────────────────────────────

export interface VisibilityInfo {
  visible: boolean;
  inViewport: boolean;
  reason: string;
}

/** Visibilité « rendue » complète (géométrie incluse) — utilisée par l'inspection d'un élément précis. */
export function getVisibility(el: Element): VisibilityInfo {
  const rect = el.getBoundingClientRect();
  const style = computedStyleOf(el);

  let visible = true;
  let reason = 'visible';
  if (style.display === 'none') {
    visible = false;
    reason = 'display: none';
  } else if (style.visibility === 'hidden' || style.visibility === 'collapse') {
    visible = false;
    reason = `visibility: ${style.visibility}`;
  } else if (parseFloat(style.opacity) === 0) {
    visible = false;
    reason = 'opacity: 0';
  } else if (rect.width === 0 && rect.height === 0) {
    visible = false;
    reason = 'dimensions nulles (0×0)';
  } else if (el instanceof HTMLElement && el.offsetParent === null && style.position !== 'fixed') {
    visible = false;
    reason = 'offsetParent null (probablement dans un ancêtre display:none)';
  }

  const win = windowOf(el);
  const inViewport =
    visible && rect.bottom > 0 && rect.right > 0 && rect.top < win.innerHeight && rect.left < win.innerWidth;
  return { visible, inViewport, reason };
}

/**
 * Vrai si l'élément (lui-même, sans regarder les ancêtres — le parcours les écarte déjà) est masqué
 * pour la lecture : `hidden`, display:none, visibility:hidden/collapse, opacity:0.
 * N'exige PAS de géométrie non nulle : un wrapper `display: contents` a un rectangle 0×0 mais ses
 * enfants sont bien affichés.
 */
export function isHiddenForReading(el: Element): boolean {
  if (el.hasAttribute('hidden') && el.getAttribute('hidden') !== 'until-found') return true;
  const style = computedStyleOf(el);
  if (style.display === 'none') return true;
  if (style.visibility === 'hidden' || style.visibility === 'collapse') return true;
  return parseFloat(style.opacity) === 0;
}

/** Vrai si l'élément a une taille et se trouve (au moins en partie) dans la fenêtre. `null` si la géométrie n'est pas exploitable. */
export function isInViewport(el: Element): boolean | null {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  const win = windowOf(el);
  return rect.bottom > 0 && rect.right > 0 && rect.top < win.innerHeight && rect.left < win.innerWidth;
}

/** Vrai si l'élément défile réellement (contenu plus grand que la zone visible). */
export function getScrollInfo(el: Element): {
  scrollable: boolean;
  clientHeight: number;
  scrollHeight: number;
  scrollTop: number;
} {
  const style = computedStyleOf(el);
  const overflowY = style.overflowY;
  const scrollable = (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1;
  return { scrollable, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
}

// ─── Nom accessible ───────────────────────────────────────────────────────────

/**
 * Nom accessible, dans l'ordre des technologies d'assistance : aria-labelledby > aria-label >
 * <label> associé (champs) > valeur d'un bouton input > alt > titre SVG > texte visible >
 * placeholder > title.
 */
export function computeAccessibleName(el: Element, max = 200): string {
  const doc = el.ownerDocument;

  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => collapseWhitespace(doc.getElementById(id)?.textContent))
      .filter(Boolean)
      .join(' ');
    if (text) return truncateName(text, max);
  }

  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel?.trim()) return truncateName(ariaLabel.trim(), max);

  if (isFormControl(el)) {
    const labelText = collapseWhitespace((el as HTMLInputElement).labels?.[0]?.textContent);
    if (labelText) return truncateName(labelText, max);
    if (isTag(el, 'input')) {
      const type = ((el as HTMLInputElement).type ?? '').toLowerCase();
      if (['button', 'submit', 'reset'].includes(type) && (el as HTMLInputElement).value) {
        return truncateName((el as HTMLInputElement).value, max);
      }
      if (type === 'image' && el.getAttribute('alt')) return truncateName(el.getAttribute('alt') as string, max);
    }
  }

  if (isTag(el, 'img', 'area') && el.getAttribute('alt')?.trim())
    return truncateName(el.getAttribute('alt') as string, max);

  if (isTag(el, 'svg')) {
    const svgTitle = collapseWhitespace(Array.from(el.children).find((c) => tagOf(c) === 'title')?.textContent);
    if (svgTitle) return truncateName(svgTitle, max);
  }

  if (!isFormControl(el)) {
    const text = collapseWhitespace(safeTextContent(el));
    if (text) return truncateName(text, max);
  }

  const placeholder = el.getAttribute('placeholder');
  if (placeholder?.trim()) return truncateName(placeholder.trim(), max);

  const title = el.getAttribute('title');
  if (title?.trim()) return truncateName(title.trim(), max);

  return '';
}

function truncateName(text: string, max: number): string {
  const flat = collapseWhitespace(text);
  return flat.length <= max ? flat : flat.slice(0, max);
}

// ─── Sélecteurs et références ─────────────────────────────────────────────────

const MAX_DOM_PATH_ANCESTORS = 25;

/** Repli minimal si CSS.escape est indisponible (WebView / environnement de test atypique). */
export function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

/** Sélecteur CSS suffisamment précis pour re-cibler CET élément (id > chemin nth-of-type). */
export function buildStableSelector(el: Element): string {
  if (el.id) return `#${cssEscape(el.id)}`;

  const parts: string[] = [];
  let current: Element | null = el;
  let depth = 0;
  while (current && current !== current.ownerDocument?.body && depth < MAX_DOM_PATH_ANCESTORS) {
    if (current.id) {
      parts.unshift(`#${cssEscape(current.id)}`);
      break;
    }
    const parent: Element | null = current.parentElement;
    if (!parent) {
      parts.unshift(current.tagName.toLowerCase());
      break;
    }
    const tag = current.tagName;
    const siblings = Array.from<Element>(parent.children).filter((c) => c.tagName === tag);
    const index = siblings.indexOf(current) + 1;
    const name = tag.toLowerCase();
    parts.unshift(siblings.length > 1 ? `${name}:nth-of-type(${index})` : name);
    current = parent;
    depth++;
  }
  return parts.join(' > ');
}

export function isInShadowRoot(el: Element): boolean {
  const root = el.getRootNode?.();
  return typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot;
}

const _refToElement = new Map<string, Element>();
const _elementToRef = new WeakMap<Element, string>();
let _refCounter = 0;
const PURGE_EVERY = 500;

function purgeDetachedRefs(): void {
  for (const [ref, el] of _refToElement) {
    if (!el.isConnected) _refToElement.delete(ref);
  }
}

/**
 * Référence courte et STABLE d'un élément (« e42 ») : la même tant que l'élément existe. Permet à
 * l'agent d'enchaîner read_page → read_component / inspect_element / read_table sans deviner de
 * sélecteur CSS. N'écrit rien dans le DOM.
 */
export function getElementRef(el: Element): string {
  let ref = _elementToRef.get(el);
  if (ref) {
    if (!_refToElement.has(ref)) _refToElement.set(ref, el);
    return ref;
  }
  ref = `e${++_refCounter}`;
  _elementToRef.set(el, ref);
  _refToElement.set(ref, el);
  if (_refCounter % PURGE_EVERY === 0) purgeDetachedRefs();
  return ref;
}

/** Élément correspondant à une référence, ou `null` s'il a disparu de la page. */
export function resolveElementRef(ref: string): Element | null {
  const el = _refToElement.get(ref.trim());
  if (!el) return null;
  if (!el.isConnected) {
    _refToElement.delete(ref.trim());
    return null;
  }
  return el;
}

/** @internal — tests uniquement */
export function _clearElementRefs(): void {
  _refToElement.clear();
  _refCounter = 0;
}

// ─── Traversée profonde ───────────────────────────────────────────────────────

export interface DeepOptions {
  /** Entrer dans les Shadow DOM ouverts (défaut : true). */
  shadow?: boolean;
  /** Entrer dans les iframes de même origine (défaut : true). */
  iframes?: boolean;
}

export function getIframeDocument(frame: Element): Document | null {
  try {
    return (frame as HTMLIFrameElement).contentDocument ?? null;
  } catch {
    return null; // cross-origin
  }
}

/**
 * Parcourt les descendants de `parent` en ordre de document, y compris les Shadow DOM ouverts et les
 * iframes de même origine. Le contenu d'un shadow root est visité avant les enfants « light » (qui y
 * sont projetés via <slot>) : tout est couvert une seule fois, l'ordre exact de projection est
 * approximatif.
 */
export function* walkElementsDeep(
  parent: ParentNode,
  options: DeepOptions = {},
  /** Retourne `true` pour écarter l'élément ET toute sa sous-arborescence. */
  skip?: (el: Element) => boolean,
): Generator<Element> {
  for (const child of Array.from(parent.children)) {
    if (skip?.(child)) continue;
    yield child;
    if (options.shadow !== false && child.shadowRoot) yield* walkElementsDeep(child.shadowRoot, options, skip);
    yield* walkElementsDeep(child, options, skip);
    if (options.iframes !== false && isTag(child, 'iframe', 'frame')) {
      const doc = getIframeDocument(child);
      if (doc?.documentElement) {
        yield doc.documentElement;
        yield* walkElementsDeep(doc.documentElement, options, skip);
      }
    }
  }
}

// ─── React (best-effort) ──────────────────────────────────────────────────────

/** Noms probablement minifiés (« a », « Zt ») : inutilisables pour l'agent. */
function isUsableComponentName(name: string | undefined): name is string {
  return Boolean(name) && (name as string).length > 2 && !/^[a-z]{1,2}\d*$/i.test(name as string);
}

function fiberTypeName(type: any): string | undefined {
  if (!type) return undefined;
  if (typeof type === 'function') return type.displayName || type.name || undefined;
  if (typeof type === 'object') {
    if (type.displayName) return type.displayName;
    if (type.render) return type.render.displayName || type.render.name || undefined;
    if (type.type) return fiberTypeName(type.type);
  }
  return undefined;
}

export function getReactFiber(el: Element): any | null {
  try {
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    return key ? ((el as unknown as Record<string, unknown>)[key] ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * Noms des composants React qui rendent cet élément, du plus proche au plus lointain. Vide hors
 * React ou si les noms sont minifiés. Non contractuel (expandos internes de React) : jamais bloquant.
 */
export function getReactOwnerChain(el: Element, max = 6): string[] {
  const chain: string[] = [];
  try {
    let node = getReactFiber(el);
    let guard = 0;
    while (node && guard++ < 300 && chain.length < max) {
      if (typeof node.type !== 'string') {
        const name = fiberTypeName(node.type);
        if (isUsableComponentName(name) && chain[chain.length - 1] !== name) chain.push(name);
      }
      node = node.return;
    }
  } catch {
    // best-effort
  }
  return chain;
}

/** Composant React propriétaire le plus proche (nom utilisable) avec ses props mémorisées brutes. */
export function getReactOwner(el: Element): { name: string; props: unknown } | null {
  try {
    let node = getReactFiber(el);
    let guard = 0;
    while (node && guard++ < 300) {
      if (typeof node.type !== 'string') {
        const name = fiberTypeName(node.type);
        if (isUsableComponentName(name)) return { name, props: node.memoizedProps };
      }
      node = node.return;
    }
  } catch {
    // best-effort
  }
  return null;
}

export function getReactOwnerName(el: Element): string | undefined {
  return getReactOwnerChain(el, 1)[0];
}

// ─── Composants (Carbon, hints de classe, custom elements) ────────────────────

const CARBON_BLOCK = /^(?:cds|bx)--([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/** Bloc Carbon Design System porté par l'élément (« tile », « data-table »…), sans modificateurs. */
export function getCarbonComponent(el: Element): string | undefined {
  for (const cls of Array.from(el.classList ?? [])) {
    const match = CARBON_BLOCK.exec(cls);
    if (match) return match[1];
  }
  return undefined;
}

function classTokens(el: Element, includeInner: boolean): string[] {
  const tokens: string[] = [];
  for (const cls of Array.from(el.classList ?? [])) {
    // « card__title » (BEM) ou « Card_root__x7a2 » (CSS modules) : partie interne d'un bloc, pas le bloc lui-même.
    if (cls.includes('__') && !includeInner) continue;
    // Pas de lookbehind (Safari < 16.4) : on sépare le camelCase par remplacement.
    for (const part of cls.replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[-_\s]+/)) {
      if (part) tokens.push(part.toLowerCase());
    }
  }
  return tokens;
}

/**
 * Premier mot-clé trouvé dans les classes de l'élément (card, modal, title…), ou `undefined`.
 * Par défaut les parties internes BEM / CSS-modules (« card__title ») sont ignorées : elles ne
 * désignent pas un composant. `includeInner` les inclut (utile pour deviner le RÔLE d'un texte).
 */
export function getClassComponentWord(
  el: Element,
  words: ReadonlySet<string>,
  includeInner = false,
): string | undefined {
  return classTokens(el, includeInner).find((t) => words.has(t));
}
