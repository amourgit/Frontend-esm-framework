// =============================================================================
//  @egen-civitas/esm-ai-tools — État de la page, arbre DOM, chargement, défilement
//
//  get_page_state : le « coup d'œil » — où suis-je, qu'est-ce qui est ouvert
//  (modales), qu'est-ce qui s'affiche (alertes/toasts), la page est-elle encore
//  en train de charger, quelles micro-apps sont montées, où est le focus.
//  get_dom_tree   : arbre DOM compact (une ligne par nœud) pour comprendre la
//  structure sans le coût d'inspect_interface.
// =============================================================================

import { getComponentTitle } from './components.js';
import {
  buildStableSelector,
  collapseWhitespace,
  computeAccessibleName,
  getElementRef,
  getVisibility,
  isFormControl,
  isHiddenForReading,
  isSensitiveField,
  safeTextContent,
  snippet,
  tagOf,
  windowOf,
} from './dom-utils.js';
import { waitForDomSettle } from './inspect-element.js';
import { createReadContext, roleOf } from './text-extract.js';

// ─── Chargement ───────────────────────────────────────────────────────────────

const LOADING_SELECTOR =
  '[aria-busy="true"], [role="progressbar"], .cds--loading, .cds--inline-loading, .cds--skeleton, [class*="skeleton"], [class*="spinner"]';

export interface LoadingIndicator {
  ref: string;
  tag: string;
  kind: string;
}

export function getLoadingIndicators(limit = 20): LoadingIndicator[] {
  const found: LoadingIndicator[] = [];
  for (const el of Array.from(document.querySelectorAll(LOADING_SELECTOR))) {
    if (found.length >= limit) break;
    try {
      if (isHiddenForReading(el)) continue;
    } catch {
      continue;
    }
    const kind =
      el.getAttribute('aria-busy') === 'true'
        ? 'aria-busy'
        : roleOf(el) === 'progressbar'
          ? 'progressbar'
          : /skeleton/.test(String(el.className))
            ? 'skeleton'
            : 'spinner';
    found.push({ ref: getElementRef(el), tag: tagOf(el), kind });
  }
  return found;
}

export function isPageLoading(): boolean {
  return document.readyState === 'loading' || getLoadingIndicators(1).length > 0;
}

/** Attend que le DOM se stabilise PUIS que les indicateurs de chargement disparaissent (plafond global). */
export async function waitForPageReady(
  options: { quietMs?: number; timeoutMs?: number } = {},
): Promise<{ settled: boolean; stillLoading: boolean }> {
  const timeoutMs = options.timeoutMs ?? 6000;
  const started = Date.now();
  await waitForDomSettle({ quietMs: options.quietMs, timeoutMs: Math.min(timeoutMs, 4000) });
  while (isPageLoading() && Date.now() - started < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  const stillLoading = isPageLoading();
  return { settled: !stillLoading, stillLoading };
}

// ─── get_page_state ───────────────────────────────────────────────────────────

const DIALOG_SELECTOR =
  'dialog[open], [role="dialog"], [role="alertdialog"], .cds--modal.is-visible, .cds--modal[open]';
const NOTIFICATION_SELECTOR =
  '[role="alert"], [role="status"], .cds--inline-notification, .cds--toast-notification, .cds--actionable-notification';

export interface PageState {
  url: string;
  path: string;
  search: string;
  hash: string;
  title: string;
  lang: string | null;
  dir: string;
  readyState: string;
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
    scrollX: number;
    scrollY: number;
    pageWidth: number;
    pageHeight: number;
    scrolledPercent: number;
  };
  focus: { ref: string; tag: string; name: string; selector: string } | null;
  selection: string | null;
  theme: { prefersDark: boolean | null; dataTheme: string | null; carbonTheme: string | null };
  meta: Record<string, string>;
  counts: Record<string, number>;
  microfrontends: Array<{ name: string; hasContent: boolean }>;
  spaBase: string | null;
  loading: { isLoading: boolean; indicators: LoadingIndicator[] };
  dialogs: Array<{ ref: string; name: string; text: string }>;
  notifications: Array<{ ref: string; role: string | null; level: string | null; text: string }>;
}

function notificationLevel(el: Element): string | null {
  const match = /(?:inline|toast|actionable)-notification--(error|success|warning|info)/.exec(String(el.className));
  return match ? match[1] : null;
}

function readMeta(): Record<string, string> {
  const wanted = ['description', 'application-name', 'og:title', 'og:description'];
  const meta: Record<string, string> = {};
  for (const el of Array.from(document.querySelectorAll('meta[name], meta[property]'))) {
    const key = el.getAttribute('name') ?? el.getAttribute('property') ?? '';
    const content = el.getAttribute('content');
    if (wanted.includes(key) && content) meta[key] = snippet(content, 300);
  }
  return meta;
}

export function getPageState(): PageState {
  const doc = document;
  const win = window;
  const scrolling = doc.scrollingElement ?? doc.documentElement;
  const maxScroll = Math.max(1, scrolling.scrollHeight - win.innerHeight);

  let focus: PageState['focus'] = null;
  const active = doc.activeElement;
  if (active && active !== doc.body && active !== doc.documentElement) {
    focus = {
      ref: getElementRef(active),
      tag: tagOf(active),
      name: computeAccessibleName(active, 80),
      selector: buildStableSelector(active),
    };
  }

  let selection: string | null = null;
  try {
    const selected = win.getSelection?.();
    const text = collapseWhitespace(selected?.toString());
    const anchor = selected?.anchorNode instanceof Element ? selected.anchorNode : selected?.anchorNode?.parentElement;
    if (text && !(anchor && isFormControl(anchor) && isSensitiveField(anchor))) selection = snippet(text, 500);
  } catch {
    // sélection indisponible
  }

  const classes = `${doc.documentElement.className} ${doc.body?.className ?? ''}`;
  const carbonTheme = /cds--(white|g10|g90|g100)\b/.exec(classes)?.[1] ?? null;

  const count = (selector: string) => doc.querySelectorAll(selector).length;
  const counts = {
    elements: count('*'),
    headings: count('h1, h2, h3, h4, h5, h6, [role="heading"]'),
    links: count('a[href]'),
    buttons: count('button, [role="button"]'),
    images: count('img'),
    forms: count('form'),
    fields: count('input:not([type="hidden"]), select, textarea'),
    tables: count('table, [role="table"], [role="grid"]'),
    iframes: count('iframe'),
    stylesheets: doc.styleSheets.length,
    scripts: count('script'),
  };

  const microfrontends = Array.from(doc.querySelectorAll('[id^="single-spa-application:"]')).map((el) => ({
    name: el.id.replace('single-spa-application:', ''),
    hasContent: el.childElementCount > 0,
  }));

  const ctx = createReadContext();
  const dialogs = Array.from(doc.querySelectorAll(DIALOG_SELECTOR))
    .filter((el) => getVisibility(el).visible)
    .slice(0, 5)
    .map((el) => ({
      ref: getElementRef(el),
      name: getComponentTitle(el, 80) ?? '',
      text: snippet(safeTextContent(el), 300),
    }));

  const notifications = Array.from(doc.querySelectorAll(NOTIFICATION_SELECTOR))
    .filter((el) => !ctx.isIgnored(el))
    .slice(0, 8)
    .map((el) => ({
      ref: getElementRef(el),
      role: roleOf(el) ?? null,
      level: notificationLevel(el),
      text: snippet(safeTextContent(el), 300),
    }))
    .filter((n) => n.text);

  const indicators = getLoadingIndicators();

  return {
    url: win.location.href,
    path: win.location.pathname,
    search: win.location.search,
    hash: win.location.hash,
    title: doc.title,
    lang: doc.documentElement.getAttribute('lang'),
    dir: doc.documentElement.getAttribute('dir') ?? 'ltr',
    readyState: doc.readyState,
    viewport: {
      width: win.innerWidth,
      height: win.innerHeight,
      devicePixelRatio: win.devicePixelRatio ?? 1,
      scrollX: Math.round(win.scrollX),
      scrollY: Math.round(win.scrollY),
      pageWidth: scrolling.scrollWidth,
      pageHeight: scrolling.scrollHeight,
      scrolledPercent: Math.min(100, Math.round((win.scrollY / maxScroll) * 100)),
    },
    focus,
    selection,
    theme: {
      prefersDark: typeof win.matchMedia === 'function' ? win.matchMedia('(prefers-color-scheme: dark)').matches : null,
      dataTheme:
        doc.documentElement.getAttribute('data-theme') ?? doc.documentElement.getAttribute('data-carbon-theme'),
      carbonTheme,
    },
    meta: readMeta(),
    counts,
    microfrontends,
    spaBase: typeof win.getEgenSpaBase === 'function' ? win.getEgenSpaBase() : null,
    loading: { isLoading: doc.readyState === 'loading' || indicators.length > 0, indicators },
    dialogs,
    notifications,
  };
}

// ─── get_dom_tree ─────────────────────────────────────────────────────────────

export interface DomTreeOptions {
  root?: Element;
  maxDepth?: number;
  maxNodes?: number;
  /** Ajouter le texte direct de chaque nœud (défaut : true). */
  includeText?: boolean;
  includeHidden?: boolean;
}

export interface DomTreeResult {
  root: { ref: string; selector: string };
  tree: string;
  nodesShown: number;
  nodesTotal: number;
  truncated: boolean;
}

function describeNode(el: Element, includeText: boolean, hiddenChildren: number): string {
  const id = el.id ? `#${el.id}` : '';
  const classes = Array.from(el.classList)
    .slice(0, 4)
    .map((c) => `.${c}`)
    .join('');
  const role = roleOf(el);
  let line = `${tagOf(el)}${id}${classes} {${getElementRef(el)}}${role ? ` role=${role}` : ''}`;
  // Pas de texte pour un champ : le contenu d'un <textarea> est sa valeur (voir safeTextContent).
  if (includeText && !isFormControl(el)) {
    const own = collapseWhitespace(
      Array.from(el.childNodes)
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent ?? '')
        .join(' '),
    );
    if (own) line += ` "${snippet(own, 70)}"`;
  }
  if (hiddenChildren > 0) line += ` (+${hiddenChildren} enfants non affichés)`;
  return line;
}

/** Arbre DOM compact en largeur d'abord : les niveaux supérieurs sont toujours couverts avant les profondeurs. */
export function getDomTree(options: DomTreeOptions = {}): DomTreeResult {
  const root = options.root ?? document.body;
  const maxDepth = Math.max(1, Math.min(options.maxDepth ?? 4, 12));
  const maxNodes = Math.max(10, Math.min(options.maxNodes ?? 250, 1500));
  const includeText = options.includeText ?? true;
  const ctx = createReadContext({ includeHidden: options.includeHidden });

  const visibleChildren = (el: Element): Element[] => Array.from(el.children).filter((c) => !ctx.isIgnored(c));

  const selected = new Set<Element>([root]);
  let frontier: Element[] = [root];
  let total = 1;
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const next: Element[] = [];
    for (const el of frontier) {
      for (const child of visibleChildren(el)) {
        total++;
        if (selected.size < maxNodes) {
          selected.add(child);
          next.push(child);
        }
      }
    }
    frontier = next;
  }
  // Compte réel (au-delà de ce qui est affiché) : un seul passage borné.
  for (const el of frontier) total += visibleChildren(el).length;

  const lines: string[] = [];
  const render = (el: Element, depth: number): void => {
    const children = visibleChildren(el);
    const shown = children.filter((c) => selected.has(c));
    lines.push(`${'  '.repeat(depth)}${describeNode(el, includeText, children.length - shown.length)}`);
    for (const child of shown) render(child, depth + 1);
  };
  render(root, 0);

  return {
    root: { ref: getElementRef(root), selector: buildStableSelector(root) },
    tree: lines.join('\n'),
    nodesShown: selected.size,
    nodesTotal: Math.max(total, selected.size),
    truncated: total > selected.size,
  };
}

// ─── Défilement ───────────────────────────────────────────────────────────────

export interface ScrollResult {
  scrollY: number;
  scrollX: number;
  atTop: boolean;
  atBottom: boolean;
  targetInViewport?: boolean;
}

/** Fait défiler jusqu'à un élément (centré) ou dans une direction ; renvoie la position obtenue. */
export function scrollPage(target: {
  el?: Element;
  direction?: 'top' | 'bottom' | 'up' | 'down';
  container?: Element;
}): ScrollResult {
  const win = windowOf(target.el ?? document.body);
  const scroller = target.container ?? (document.scrollingElement as Element | null) ?? document.documentElement;

  if (target.el) {
    target.el.scrollIntoView?.({ block: 'center', inline: 'nearest' });
  } else if (target.direction) {
    const page = Math.round((target.container ? target.container.clientHeight : win.innerHeight) * 0.85);
    const top =
      target.direction === 'top'
        ? 0
        : target.direction === 'bottom'
          ? scroller.scrollHeight
          : target.direction === 'up'
            ? scroller.scrollTop - page
            : scroller.scrollTop + page;
    if (typeof scroller.scrollTo === 'function') scroller.scrollTo({ top, behavior: 'auto' });
    else scroller.scrollTop = top;
  }

  const top = target.container ? scroller.scrollTop : win.scrollY;
  const result: ScrollResult = {
    scrollY: Math.round(top),
    scrollX: Math.round(win.scrollX),
    atTop: top <= 1,
    atBottom: top + (target.container ? scroller.clientHeight : win.innerHeight) >= scroller.scrollHeight - 1,
  };
  if (target.el) result.targetInViewport = getVisibility(target.el).inViewport;
  return result;
}
