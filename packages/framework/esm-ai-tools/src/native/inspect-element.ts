// =============================================================================
//  @egen/esm-ai-tools — Inspecteur profond d'éléments DOM
//
//  Complémentaire, JAMAIS un remplacement, de describe_screen/list_ui_actions/
//  list_observables : ces derniers restent volontairement légers et sémantiques
//  (voir observables.ts — "le CSS ne porte aucun sens pour un LLM qui
//  raisonne"), présents dans le contexte à CHAQUE message. Ce module fournit
//  l'inverse : une plongée technique COMPLÈTE (CSS calculé intégral, cascade
//  de règles avec sélecteur/spécificité/source, géométrie, accessibilité,
//  React best-effort), appelée à la demande via un tool dédié (inspect_element/
//  inspect_interface — voir native/index.ts), jamais injectée d'office dans le
//  contexte général. C'est le principe d'enrichissement progressif : contexte
//  léger en permanence, détail technique total UNIQUEMENT quand l'agent le
//  demande explicitement — le résultat du tool rejoint alors l'historique de
//  la conversation comme n'importe quel autre résultat d'outil.
//
//  ARCHITECTURE — collecteurs composables et indépendants :
//  Chaque dimension du rapport (identité, géométrie, style, cascade CSS,
//  accessibilité, contenu, React, métadonnées déclarées) est une fonction
//  séparée, chacune protégée individuellement par un try/catch. Une erreur
//  dans UN collecteur (ex: feuille CSS cross-origin bloquée par CORS, fiber
//  React introuvable) ne fait jamais échouer les autres — voir robustesse.
//  Ajouter une nouvelle dimension plus tard = ajouter un collecteur, sans
//  toucher aux autres ni aux tools qui les appellent (évolutivité).
//
//  SOUVERAINETÉ / SÉCURITÉ : tout s'exécute 100% côté client, aucun appel
//  réseau nouveau. La même discipline de rédaction déjà en place pour
//  describe_screen (jamais la valeur d'un champ mot de passe) est reprise et
//  étendue ici à TOUTE valeur de champ potentiellement sensible.
// =============================================================================

import { getUIActionDefinition } from '../ui-actions';
import { getObservableDefinition } from '../observables';

// ---------------------------------------------------------------------------
// Garde-fous (généreux, mais jamais littéralement illimités — voir principe
// de robustesse : un cas pathologique ne doit jamais faire planter/geler le
// navigateur ni exploser la taille du résultat au point de le rendre inutile).
// ---------------------------------------------------------------------------

const MAX_TEXT_LENGTH = 4000;
const MAX_APPLIED_CSS_RULES = 150;
const MAX_REACT_PROPS_DEPTH = 4;
const MAX_REACT_PROPS_KEYS = 60;
const MAX_INTERFACE_NODES = 500;
const MAX_DOM_PATH_ANCESTORS = 25;

/** Types de champs dont la VALEUR ne doit jamais être transmise en clair. */
const SENSITIVE_INPUT_TYPES = new Set(['password']);
/** Noms/autocomplete évoquant une donnée sensible même sur un input type="text". */
const SENSITIVE_NAME_PATTERN = /password|secret|token|credential|pin\b|cvv|ssn|nir\b/i;

function truncateText(text: string, max = MAX_TEXT_LENGTH): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}… [tronqué à ${max} caractères]`;
}

// =============================================================================
// 1. IDENTITÉ — tag, attributs, dataset, chemin DOM stable
// =============================================================================

export interface ElementIdentity {
  tagName: string;
  id: string | null;
  classList: string[];
  attributes: Record<string, string>;
  dataset: Record<string, string>;
  /** Sélecteur CSS permettant de retrouver CET élément précis (nth-child en repli). */
  stableSelector: string;
  /** Chemin des ancêtres, du parent direct jusqu'à <body> (plafonné). */
  domPath: Array<{ tag: string; id: string | null; classes: string[] }>;
  childElementCount: number;
  /** Tags des enfants directs (résumé, pas récursif). */
  directChildrenTags: string[];
  siblingIndex: number;
  siblingCount: number;
}

/** Repli minimal si CSS.escape est indisponible (très rare, mais évite un crash sur un navigateur/WebView atypique). */
function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
}

/** Construit un sélecteur CSS suffisamment précis pour re-cibler cet élément (id > chemin nth-child). */
function buildStableSelector(el: Element): string {
  if (el.id) return `#${cssEscape(el.id)}`;

  const parts: string[] = [];
  let current: Element | null = el;
  let depth = 0;
  while (current && current !== document.body && depth < MAX_DOM_PATH_ANCESTORS) {
    if (current.id) {
      parts.unshift(`#${cssEscape(current.id)}`);
      break;
    }
    const parent = current.parentElement;
    if (!parent) {
      parts.unshift(current.tagName.toLowerCase());
      break;
    }
    const siblings = Array.from<Element>(parent.children).filter((c) => c.tagName === current!.tagName);
    const index = siblings.indexOf(current) + 1;
    const tag = current.tagName.toLowerCase();
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
    current = parent;
    depth++;
  }
  return parts.join(' > ');
}

function collectIdentity(el: Element): ElementIdentity {
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    attributes[attr.name] = attr.name.toLowerCase() === 'value' && isSensitiveField(el) ? '••••••' : attr.value;
  }

  const dataset: Record<string, string> = {};
  if (el instanceof HTMLElement) {
    for (const [key, value] of Object.entries(el.dataset)) {
      dataset[key] = value ?? '';
    }
  }

  const domPath: ElementIdentity['domPath'] = [];
  let ancestor = el.parentElement;
  let depth = 0;
  while (ancestor && ancestor !== document.documentElement && depth < MAX_DOM_PATH_ANCESTORS) {
    domPath.push({
      tag: ancestor.tagName.toLowerCase(),
      id: ancestor.id || null,
      classes: Array.from(ancestor.classList),
    });
    ancestor = ancestor.parentElement;
    depth++;
  }

  const parent = el.parentElement;
  const siblings = parent ? Array.from(parent.children) : [el];

  return {
    tagName: el.tagName.toLowerCase(),
    id: el.id || null,
    classList: Array.from(el.classList),
    attributes,
    dataset,
    stableSelector: buildStableSelector(el),
    domPath,
    childElementCount: el.childElementCount,
    directChildrenTags: Array.from(el.children).map((c) => c.tagName.toLowerCase()),
    siblingIndex: siblings.indexOf(el),
    siblingCount: siblings.length,
  };
}

// =============================================================================
// 2. GÉOMÉTRIE & VISIBILITÉ
// =============================================================================

export interface ElementGeometry {
  boundingRect: { x: number; y: number; width: number; height: number; top: number; right: number; bottom: number; left: number };
  scrollWidth: number;
  scrollHeight: number;
  offsetWidth: number;
  offsetHeight: number;
  isVisible: boolean;
  isInViewport: boolean;
  visibilityReason: string;
}

function collectGeometry(el: Element): ElementGeometry {
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

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

  const inViewport =
    visible && rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;

  return {
    boundingRect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      top: Math.round(rect.top),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
    },
    scrollWidth: el.scrollWidth,
    scrollHeight: el.scrollHeight,
    offsetWidth: el instanceof HTMLElement ? el.offsetWidth : 0,
    offsetHeight: el instanceof HTMLElement ? el.offsetHeight : 0,
    isVisible: visible,
    isInViewport: inViewport,
    visibilityReason: reason,
  };
}

// =============================================================================
// 3. STYLE CALCULÉ — cssText intégral (rien n'est omis) + regroupement structuré
// =============================================================================

const STYLE_CATEGORIES: Record<string, string[]> = {
  boxModel: [
    'display', 'boxSizing', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'borderRadius',
  ],
  typography: [
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
    'textAlign', 'textDecoration', 'textDecorationLine', 'textTransform', 'color',
    'whiteSpace', 'wordBreak', 'textOverflow',
  ],
  layout: [
    'position', 'top', 'right', 'bottom', 'left', 'zIndex', 'float', 'clear',
    'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'alignContent', 'alignSelf',
    'flex', 'flexGrow', 'flexShrink', 'flexBasis',
    'gridTemplateColumns', 'gridTemplateRows', 'gridColumn', 'gridRow', 'gap', 'rowGap', 'columnGap',
  ],
  visual: [
    'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
    'boxShadow', 'opacity', 'filter', 'backdropFilter', 'transform', 'transformOrigin',
    'transition', 'animation', 'overflow', 'overflowX', 'overflowY', 'visibility', 'outline',
  ],
  interaction: ['cursor', 'pointerEvents', 'userSelect', 'touchAction'],
};

export interface ElementComputedStyle {
  /** Sérialisation COMPLÈTE — toutes les propriétés calculées, rien n'est omis. */
  cssText: string;
  /**
   * Table à plat de TOUTES les propriétés calculées (nom CSS kebab-case →
   * valeur), construite par énumération indexée (computed[i] pour
   * i < computed.length) plutôt que par simple lecture de cssText — plus
   * robuste : certains moteurs DOM (rencontré en test avec happy-dom, pas
   * en navigateur réel) laissent cssText vide alors que l'énumération
   * indexée, elle, fonctionne toujours. C'est LA garantie d'exhaustivité de
   * ce rapport, indépendante de tout format de sérialisation.
   */
  allProperties: Record<string, string>;
  /** Le même contenu, regroupé par catégorie pour une lecture structurée rapide. */
  byCategory: Record<string, Record<string, string>>;
}

function collectComputedStyle(el: Element): ElementComputedStyle {
  const computed = window.getComputedStyle(el);

  const allProperties: Record<string, string> = {};
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    const value = computed.getPropertyValue(prop);
    if (value) allProperties[prop] = value;
  }

  const byCategory: Record<string, Record<string, string>> = {};
  for (const [category, props] of Object.entries(STYLE_CATEGORIES)) {
    const values: Record<string, string> = {};
    for (const prop of props) {
      const value = allProperties[camelToKebab(prop)];
      if (value) values[prop] = value;
    }
    byCategory[category] = values;
  }

  return { cssText: computed.cssText, allProperties, byCategory };
}

function camelToKebab(prop: string): string {
  return prop.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// =============================================================================
// 4. CASCADE CSS — quelles règles s'appliquent, d'où, avec quelle spécificité
// =============================================================================

export interface AppliedCSSRule {
  selector: string;
  cssText: string;
  /** Spécificité approximative (id, classes/attributs/pseudo-classes, types) — heuristique, pas un moteur CSS exact. */
  specificity: string;
  source: string;
}

/** Heuristique de spécificité CSS simplifiée (a,b,c) — suffisante pour comprendre l'ordre de la cascade, pas pour une reproduction exacte du moteur du navigateur. */
function computeApproximateSpecificity(selector: string): string {
  const idCount = (selector.match(/#[\w-]+/g) ?? []).length;
  const classCount = (selector.match(/\.[\w-]+|\[[^\]]*\]|:[\w-]+(?!\()/g) ?? []).length;
  const typeCount = (selector.match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) ?? []).length;
  return `${idCount},${classCount},${typeCount}`;
}

function collectAppliedCSSRules(el: Element): AppliedCSSRule[] {
  const results: AppliedCSSRule[] = [];

  const walk = (ruleList: CSSRuleList, sourceLabel: string) => {
    for (let i = 0; i < ruleList.length && results.length < MAX_APPLIED_CSS_RULES; i++) {
      const rule = ruleList[i];
      try {
        if (rule instanceof CSSMediaRule) {
          if (window.matchMedia(rule.media.mediaText).matches) {
            walk(rule.cssRules, sourceLabel);
          }
          continue;
        }
        if (rule instanceof CSSStyleRule && el.matches(rule.selectorText)) {
          results.push({
            selector: rule.selectorText,
            cssText: rule.style.cssText,
            specificity: computeApproximateSpecificity(rule.selectorText),
            source: sourceLabel,
          });
        }
      } catch {
        // Sélecteur non supporté par .matches() (pseudo-éléments complexes...) — ignoré, non bloquant
      }
    }
  };

  try {
    for (let s = 0; s < document.styleSheets.length && results.length < MAX_APPLIED_CSS_RULES; s++) {
      const sheet = document.styleSheets[s];
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        // Feuille cross-origin sans CORS — inaccessible aux scripts, ignorée proprement
        continue;
      }
      if (!rules) continue;
      walk(rules, sheet.href ?? `<style> inline (feuille #${s})`);
    }
  } catch {
    // best-effort — ne doit jamais faire échouer le reste du rapport
  }

  return results;
}

// =============================================================================
// 5. ACCESSIBILITÉ — même algorithme que describe_screen, réutilisé tel quel
// =============================================================================

export interface ElementAccessibility {
  role: string | null;
  accessibleName: string;
  tabIndex: number | null;
  focusable: boolean;
  ariaAttributes: Record<string, string>;
}

function collectAccessibility(el: Element): ElementAccessibility {
  const ariaLabel = el.getAttribute('aria-label');
  let accessibleName = ariaLabel?.trim() ?? '';

  if (!accessibleName) {
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      accessibleName = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim())
        .filter(Boolean)
        .join(' ');
    }
  }

  if (!accessibleName && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
    accessibleName = el.labels?.[0]?.textContent?.trim() ?? ('placeholder' in el ? el.placeholder : '') ?? '';
  }

  if (!accessibleName) {
    accessibleName = truncateText((el.textContent ?? '').trim().replace(/\s+/g, ' '), 200);
  }

  const ariaAttributes: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith('aria-')) ariaAttributes[attr.name] = attr.value;
  }

  const tabIndexAttr = el.getAttribute('tabindex');

  return {
    role: el.getAttribute('role'),
    accessibleName,
    tabIndex: tabIndexAttr !== null ? Number(tabIndexAttr) : null,
    focusable: el instanceof HTMLElement && typeof el.focus === 'function' && el.tabIndex >= 0,
    ariaAttributes,
  };
}

// =============================================================================
// 6. CONTENU — texte, valeur (avec rédaction), médias, validité de formulaire
// =============================================================================

function isSensitiveField(el: Element): boolean {
  if (el instanceof HTMLInputElement) {
    if (SENSITIVE_INPUT_TYPES.has(el.type)) return true;
    if (SENSITIVE_NAME_PATTERN.test(el.name) || SENSITIVE_NAME_PATTERN.test(el.autocomplete)) return true;
    if (el.id && SENSITIVE_NAME_PATTERN.test(el.id)) return true;
  }
  return false;
}

export interface ElementContent {
  textContent: string | null;
  innerText: string | null;
  formValue?: { value: string; redacted: boolean; disabled: boolean; required: boolean; validity?: Record<string, boolean> };
  checked?: boolean;
  href?: string;
  media?: { src: string; alt: string; naturalWidth?: number; naturalHeight?: number };
}

function collectContent(el: Element): ElementContent {
  const content: ElementContent = {
    textContent: el.textContent ? truncateText(el.textContent.trim().replace(/\s+/g, ' ')) : null,
    innerText: el instanceof HTMLElement ? truncateText(el.innerText?.trim().replace(/\s+/g, ' ') ?? '') : null,
  };

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const sensitive = isSensitiveField(el);
    content.formValue = {
      value: sensitive ? '••••••' : el.value,
      redacted: sensitive,
      disabled: el.disabled,
      required: el.required,
      validity: el.validity ? Object.fromEntries(
        Object.entries(Object.getPrototypeOf(el.validity)).map(([k]) => [k, (el.validity as any)[k]])
          .filter(([k]) => typeof (el.validity as any)[k] === 'boolean'),
      ) : undefined,
    };
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      content.checked = el.checked;
    }
  }

  if (el instanceof HTMLAnchorElement) content.href = el.href;

  if (el instanceof HTMLImageElement) {
    content.media = { src: el.src, alt: el.alt, naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight };
  }

  return content;
}

// =============================================================================
// 7. REACT (best-effort) — composant propriétaire, props passées
//
// Fragile PAR NATURE : dépend d'expandos internes non documentés que React
// attache au nœud DOM (__reactFiber$*/__reactProps$*). Fonctionne de façon
// fiable pour la version de React réellement utilisée dans ce monorepo
// (React 18) mais N'EST PAS un contrat public de React — peut casser à une
// montée de version majeure. TOUJOURS best-effort : dégrade proprement vers
// `available: false` plutôt que de faire échouer tout le rapport.
// =============================================================================

export interface ReactElementInfo {
  available: boolean;
  componentName?: string;
  props?: unknown;
  hasKey?: boolean;
  reason?: string;
}

function findExpandoKey(el: HTMLElement, prefix: string): string | undefined {
  return Object.keys(el).find((k) => k.startsWith(prefix));
}

function serializeReactValue(value: unknown, depth: number): unknown {
  if (depth > MAX_REACT_PROPS_DEPTH) return '[…tronqué — profondeur max atteinte]';
  if (value == null) return value;
  if (typeof value === 'function') return '[Function]';
  if (typeof value !== 'object') return value;
  if (typeof (value as { $$typeof?: unknown }).$$typeof === 'symbol') return '[ReactElement]';
  if (Array.isArray(value)) {
    return value.slice(0, MAX_REACT_PROPS_KEYS).map((v) => serializeReactValue(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  let count = 0;
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key === 'children') {
      out.children = '[omis — utiliser inspect_interface pour explorer la sous-arborescence]';
      continue;
    }
    if (++count > MAX_REACT_PROPS_KEYS) {
      out['…'] = 'tronqué';
      break;
    }
    out[key] = serializeReactValue((value as Record<string, unknown>)[key], depth + 1);
  }
  return out;
}

function collectReactInfo(el: Element): ReactElementInfo {
  try {
    if (!(el instanceof HTMLElement)) return { available: false, reason: 'pas un HTMLElement' };

    const fiberKey = findExpandoKey(el, '__reactFiber$');
    const propsKey = findExpandoKey(el, '__reactProps$');
    if (!fiberKey && !propsKey) {
      return { available: false, reason: "aucun fiber React détecté sur ce nœud (n'est peut-être pas géré par React, ou app non-React)" };
    }

    let componentName: string | undefined;
    if (fiberKey) {
      let node: any = (el as unknown as Record<string, unknown>)[fiberKey];
      let guard = 0;
      while (node && guard++ < 200) {
        const type = node.type;
        if (typeof type === 'function') {
          componentName = type.displayName || type.name || 'Composant anonyme';
          break;
        }
        if (type && typeof type === 'object' && 'render' in type) {
          componentName = type.render?.displayName || type.render?.name || 'ForwardRef';
          break;
        }
        node = node.return;
      }
    }

    const rawProps = propsKey ? (el as unknown as Record<string, unknown>)[propsKey] : undefined;
    const props = rawProps !== undefined ? serializeReactValue(rawProps, 0) : undefined;

    return { available: true, componentName, props, hasKey: Boolean(fiberKey) };
  } catch (err) {
    return { available: false, reason: `introspection React échouée : ${String(err)}` };
  }
}

// =============================================================================
// 8. MÉTADONNÉES DÉCLARÉES — croisement avec ui-actions.ts / observables.ts
//    Relie la vérité brute du DOM à l'intention FONCTIONNELLE déclarée par
//    l'app quand elle existe (plus fiable qu'une déduction depuis les props).
// =============================================================================

export interface DeclaredMetadata {
  registeredAction: ReturnType<typeof getUIActionDefinition>;
  registeredObservable: ReturnType<typeof getObservableDefinition>;
}

function collectDeclaredMetadata(el: Element, actionId?: string): DeclaredMetadata {
  // Si l'élément a été résolu via un actionId connu, on le retrouve directement.
  // Sinon, best-effort par attribut id (les registres sont keyés par un id
  // logique, pas forcément égal à Element.id, donc pas de garantie de match).
  const candidateId = actionId ?? el.id;
  return {
    registeredAction: candidateId ? getUIActionDefinition(candidateId) : null,
    registeredObservable: candidateId ? getObservableDefinition(candidateId) : null,
  };
}

// =============================================================================
// ASSEMBLAGE — rapport complet d'un élément
// =============================================================================

export interface ElementInspectionReport {
  identity: ElementIdentity;
  geometry: ElementGeometry;
  computedStyle: ElementComputedStyle;
  appliedCSSRules: AppliedCSSRule[];
  appliedCSSRulesTruncated: boolean;
  accessibility: ElementAccessibility;
  content: ElementContent;
  react: ReactElementInfo;
  declaredMetadata: DeclaredMetadata;
}

/**
 * Inspecte UN élément DOM et retourne un rapport technique/visuel/fonctionnel
 * complet. Chaque section est calculée indépendamment — une erreur dans une
 * section n'empêche jamais les autres d'être renvoyées.
 */
export function inspectDOMElement(el: Element, actionId?: string): ElementInspectionReport {
  const safe = <T,>(fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };

  const appliedCSSRules = safe(() => collectAppliedCSSRules(el), []);

  return {
    identity: safe(() => collectIdentity(el), {
      tagName: el.tagName.toLowerCase(),
      id: null,
      classList: [],
      attributes: {},
      dataset: {},
      stableSelector: '',
      domPath: [],
      childElementCount: 0,
      directChildrenTags: [],
      siblingIndex: -1,
      siblingCount: 0,
    }),
    geometry: safe(() => collectGeometry(el), {
      boundingRect: { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 },
      scrollWidth: 0,
      scrollHeight: 0,
      offsetWidth: 0,
      offsetHeight: 0,
      isVisible: false,
      isInViewport: false,
      visibilityReason: 'inconnu (échec de calcul)',
    }),
    computedStyle: safe(() => collectComputedStyle(el), { cssText: '', allProperties: {}, byCategory: {} }),
    appliedCSSRules,
    appliedCSSRulesTruncated: appliedCSSRules.length >= MAX_APPLIED_CSS_RULES,
    accessibility: safe(() => collectAccessibility(el), {
      role: null,
      accessibleName: '',
      tabIndex: null,
      focusable: false,
      ariaAttributes: {},
    }),
    content: safe(() => collectContent(el), { textContent: null, innerText: null }),
    react: safe(() => collectReactInfo(el), { available: false, reason: 'échec inattendu' }),
    declaredMetadata: safe(() => collectDeclaredMetadata(el, actionId), { registeredAction: null, registeredObservable: null }),
  };
}

// =============================================================================
// ATTENTE DE STABILISATION DU DOM — utilisé par navigate_and_inspect pour
// laisser le temps à l'app single-spa cible de se monter (import différé,
// remote Module Federation, effets React) avant de capturer l'interface.
// Générique et sans couplage à single-spa : observe simplement l'absence de
// mutation DOM pendant une courte fenêtre de silence, avec un plafond global
// pour ne jamais bloquer indéfiniment (ex: animations/polling continus).
// =============================================================================

export function waitForDomSettle(options: { quietMs?: number; timeoutMs?: number } = {}): Promise<void> {
  const quietMs = options.quietMs ?? 200;
  const timeoutMs = options.timeoutMs ?? 4000;

  return new Promise((resolve) => {
    let settledTimer: ReturnType<typeof setTimeout>;
    const hardTimeout = setTimeout(() => {
      observer.disconnect();
      clearTimeout(settledTimer);
      resolve();
    }, timeoutMs);

    const observer = new MutationObserver(() => {
      clearTimeout(settledTimer);
      settledTimer = setTimeout(finish, quietMs);
    });

    function finish() {
      observer.disconnect();
      clearTimeout(hardTimeout);
      resolve();
    }

    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    settledTimer = setTimeout(finish, quietMs);
  });
}

export interface InterfaceNodeReport extends ElementInspectionReport {
  /** Index de ce nœud dans le rapport (référence stable pour le reste de la conversation). */
  nodeIndex: number;
  /** nodeIndex du parent significatif le plus proche, ou null à la racine. */
  parentNodeIndex: number | null;
}

export interface FullInterfaceReport {
  url: string;
  title: string;
  nodes: InterfaceNodeReport[];
  totalMeaningfulNodesFound: number;
  truncated: boolean;
}

/**
 * Un nœud est "significatif" s'il porte du sens propre : contenu textuel non
 * vide, élément interactif/sémantique, ou styling/attributs explicites. Les
 * div/span purement structurels sans aucune de ces propriétés sont ignorés —
 * pas par souci de taille (voir en-tête de fichier) mais parce qu'ils
 * n'apportent aucune information supplémentaire par rapport à leurs enfants.
 */
const MEANINGFUL_TAGS = new Set([
  'button', 'a', 'input', 'select', 'textarea', 'label', 'img', 'svg', 'video', 'audio',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'td', 'th', 'table', 'form', 'nav', 'header',
  'footer', 'main', 'section', 'article', 'aside', 'dialog',
]);

function isMeaningfulNode(el: Element): boolean {
  if (MEANINGFUL_TAGS.has(el.tagName.toLowerCase())) return true;
  if (el.getAttribute('role')) return true;
  if (el.hasAttribute('data-testid') || el.hasAttribute('data-ai-id')) return true;
  if (el.id) return true;
  const directText = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim());
  return Boolean(directText);
}

/**
 * Inspecte l'intégralité de l'interface actuellement montée (ou d'une
 * sous-arborescence si `rootSelector` est fourni) : un rapport complet par
 * nœud significatif, avec la hiérarchie parent/enfant pour reconstituer la
 * mise en page.
 */
export function inspectFullInterface(rootSelector?: string): FullInterfaceReport {
  const root = rootSelector ? document.querySelector(rootSelector) : document.body;
  if (!root) {
    return { url: window.location.href, title: document.title, nodes: [], totalMeaningfulNodesFound: 0, truncated: false };
  }

  const allMeaningful = Array.from(root.querySelectorAll('*')).filter(isMeaningfulNode);
  const truncated = allMeaningful.length > MAX_INTERFACE_NODES;
  const selected = allMeaningful.slice(0, MAX_INTERFACE_NODES);

  // Index pour retrouver rapidement le nodeIndex du plus proche ancêtre significatif
  const indexByElement = new Map<Element, number>();
  selected.forEach((el, i) => indexByElement.set(el, i));

  const nodes: InterfaceNodeReport[] = selected.map((el, i) => {
    let parentNodeIndex: number | null = null;
    let ancestor = el.parentElement;
    while (ancestor) {
      if (indexByElement.has(ancestor)) {
        parentNodeIndex = indexByElement.get(ancestor)!;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    return { ...inspectDOMElement(el), nodeIndex: i, parentNodeIndex };
  });

  return {
    url: window.location.href,
    title: document.title,
    nodes,
    totalMeaningfulNodesFound: allMeaningful.length,
    truncated,
  };
}
