// =============================================================================
//  @egen-civitas/esm-ai-tools — Identification des composants d'une page
//
//  Répond à « qu'est-ce que c'est ? » pour un élément : un landmark, une carte,
//  une modale, un onglet… quelle que soit la façon dont l'app l'a construit
//  (balise native, rôle ARIA, `data-slot` des composants EGEN, convention de nom de
//  classe, custom element). Le résultat est une heuristique documentée, jamais
//  une vérité absolue : `source` dit d'où vient la déduction.
// =============================================================================

import { collapseWhitespace, getSlotComponent, getClassComponentWord, snippet, tagOf } from './dom-utils.js';
import { roleOf } from './text-extract.js';

export type ComponentSource = 'native' | 'aria' | 'slot' | 'class' | 'custom-element';

export interface ComponentIdentity {
  /** Nature sémantique : card, dialog, tabs, notification, navigation, main… */
  kind: string;
  source: ComponentSource;
  /** Nom technique : `data-slot` (« tile »), balise du custom element… */
  name?: string;
  /** Landmark / structure de page (vs composant applicatif). */
  structural: boolean;
}

const NATIVE_KINDS: Record<string, string> = {
  nav: 'navigation',
  main: 'main',
  aside: 'complementary',
  footer: 'footer',
  header: 'header',
  article: 'article',
  dialog: 'dialog',
  details: 'accordion',
  fieldset: 'group',
  figure: 'figure',
  form: 'form',
  search: 'search',
  progress: 'progress',
  meter: 'progress',
};

const ROLE_KINDS: Record<string, string> = {
  banner: 'header',
  navigation: 'navigation',
  main: 'main',
  complementary: 'complementary',
  contentinfo: 'footer',
  region: 'region',
  search: 'search',
  form: 'form',
  dialog: 'dialog',
  alertdialog: 'dialog',
  alert: 'notification',
  status: 'status',
  log: 'log',
  tabpanel: 'tabpanel',
  tablist: 'tabs',
  toolbar: 'toolbar',
  tooltip: 'popover',
  menu: 'menu',
  menubar: 'menu',
  tree: 'tree',
  progressbar: 'progress',
  group: 'group',
  article: 'article',
  figure: 'figure',
  table: 'table',
  grid: 'table',
  treegrid: 'table',
  list: 'list',
  listbox: 'list',
};

const STRUCTURAL_KINDS = new Set([
  'navigation',
  'main',
  'complementary',
  'footer',
  'header',
  'region',
  'search',
  'form',
  'article',
  'dialog',
  'tabpanel',
]);

/** `data-slot` des composants EGEN → nature sémantique. Les blocs de mise en page sont ignorés. */
const SLOT_KINDS: Record<string, string> = {
  tile: 'card',
  'dialog-content': 'dialog',
  'modal-header': 'dialog',
  alert: 'notification',
  tabs: 'tabs',
  badge: 'tag',
  table: 'table',
  'table-container': 'table',
  'dropdown-menu-content': 'menu',
  'app-header': 'header',
  'inline-loading': 'loading',
  spinner: 'progress',
  tooltip: 'popover',
  'tooltip-content': 'popover',
  button: 'button',
  input: 'field',
  'text-input': 'field',
  switch: 'field',
};

const CLASS_KINDS: Record<string, string> = {
  card: 'card',
  tile: 'card',
  kpi: 'card',
  stat: 'card',
  stats: 'card',
  panel: 'panel',
  widget: 'panel',
  banner: 'banner',
  hero: 'banner',
  toast: 'notification',
  snackbar: 'notification',
  alert: 'notification',
  notification: 'notification',
  modal: 'dialog',
  dialog: 'dialog',
  drawer: 'dialog',
  popup: 'dialog',
  badge: 'tag',
  chip: 'tag',
  pill: 'tag',
  accordion: 'accordion',
  tabs: 'tabs',
  breadcrumb: 'breadcrumb',
  breadcrumbs: 'breadcrumb',
  pagination: 'pagination',
  stepper: 'stepper',
  tooltip: 'popover',
  popover: 'popover',
  dropdown: 'dropdown',
  sidebar: 'sidebar',
  navbar: 'header',
  topbar: 'header',
  skeleton: 'loading',
  spinner: 'progress',
  carousel: 'carousel',
  avatar: 'avatar',
  timeline: 'timeline',
  calendar: 'calendar',
};

const CLASS_WORDS: ReadonlySet<string> = new Set(Object.keys(CLASS_KINDS));

/** Texte d'un libellé référencé par aria-labelledby, ou `''`. */
function labelledByText(el: Element): string {
  const ids = el.getAttribute('aria-labelledby');
  if (!ids) return '';
  return ids
    .split(/\s+/)
    .map((id) => collapseWhitespace(el.ownerDocument.getElementById(id)?.textContent))
    .filter(Boolean)
    .join(' ');
}

function hasAccessibleName(el: Element): boolean {
  return Boolean(el.getAttribute('aria-label')?.trim()) || Boolean(labelledByText(el));
}

/**
 * Identifie le composant qu'un élément représente, ou `null` pour un simple wrapper sans identité.
 * Ordre : balise native / rôle ARIA (structure) > `data-slot` > mot-clé de classe > custom element.
 */
export function classifyComponent(el: Element): ComponentIdentity | null {
  const tag = tagOf(el);
  const role = roleOf(el);

  if (role && ROLE_KINDS[role]) {
    const kind = ROLE_KINDS[role];
    // Un rôle « region » n'a de sens que nommé (sinon ce n'est qu'un conteneur).
    if (!(role === 'region' && !hasAccessibleName(el))) {
      return { kind, source: 'aria', structural: STRUCTURAL_KINDS.has(kind) };
    }
  }

  if (tag === 'section' && hasAccessibleName(el)) return { kind: 'region', source: 'native', structural: true };
  if (tag === 'table') return { kind: 'table', source: 'native', structural: false };
  if (tag === 'ul' || tag === 'ol' || tag === 'dl') return { kind: 'list', source: 'native', structural: false };
  if (NATIVE_KINDS[tag] && !(tag === 'form' && !hasAccessibleName(el) && !el.id)) {
    const kind = NATIVE_KINDS[tag];
    return { kind, source: 'native', structural: STRUCTURAL_KINDS.has(kind) };
  }

  const slot = getSlotComponent(el);
  if (slot && SLOT_KINDS[slot]) return { kind: SLOT_KINDS[slot], source: 'slot', name: slot, structural: false };

  const word = getClassComponentWord(el, CLASS_WORDS);
  // Même mot sur le parent (« card » > « card-body ») : partie interne du même composant.
  if (word && !(el.parentElement && getClassComponentWord(el.parentElement, CLASS_WORDS) === word)) {
    return { kind: CLASS_KINDS[word], source: 'class', name: word, structural: false };
  }

  if (tag.includes('-')) {
    return { kind: 'custom-element', source: 'custom-element', name: tag, structural: false };
  }

  return null;
}

/** Titre lisible d'un composant : nom ARIA, sinon premier titre/légende/summary/élément « title » à l'intérieur. */
export function getComponentTitle(el: Element, maxLength = 100): string | undefined {
  const aria = collapseWhitespace(el.getAttribute('aria-label')) || labelledByText(el);
  if (aria) return snippet(aria, maxLength);

  const heading = el.querySelector(
    'h1, h2, h3, h4, h5, h6, [role="heading"], legend, summary, caption, [class*="title"], [class*="Title"]',
  );
  const text = collapseWhitespace(heading?.textContent);
  return text ? snippet(text, maxLength) : undefined;
}
