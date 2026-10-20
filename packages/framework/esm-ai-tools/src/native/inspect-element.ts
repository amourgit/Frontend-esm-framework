// =============================================================================
//  @egen-civitas/esm-ai-tools — Inspecteur profond d'éléments DOM
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

import { getUIActionDefinition } from '../ui-actions.js';
import { getObservableDefinition } from '../observables.js';
import {
  buildStableSelector,
  computeAccessibleName,
  computedStyleOf,
  getElementRef,
  getReactOwnerChain,
  getVisibility,
  isFormControl,
  isInShadowRoot,
  isSensitiveField,
  readFieldValue,
  safeTextContent,
  truncateText as truncateShared,
  walkElementsDeep,
} from './dom-utils.js';
import { SKIPPED_TAGS, createReadContext, inlineText } from './text-extract.js';
import { serializeForAI } from './serialize.js';

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

function truncateText(text: string, max = MAX_TEXT_LENGTH): string {
  return truncateShared(text, max);
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
  /** Référence stable « eNN » de l'élément (utilisable avec read_component, read_table, scroll_to…). */
  ref: string;
  /** true si l'élément vit dans un Shadow DOM (le sélecteur CSS ne le retrouve alors pas depuis le document). */
  inShadowRoot: boolean;
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
    ref: getElementRef(el),
    inShadowRoot: isInShadowRoot(el),
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
  const { visible, inViewport, reason } = getVisibility(el);

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
  const computed = computedStyleOf(el);

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
  const accessibleName = computeAccessibleName(el, 200);

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

export interface ElementContent {
  textContent: string | null;
  innerText: string | null;
  formValue?: { value: string; redacted: boolean; disabled: boolean; required: boolean; validity?: Record<string, boolean> };
  checked?: boolean;
  /** <select> : options (libellé, valeur, sélection), 50 max. */
  options?: Array<{ label: string; value: string; selected: boolean }>;
  href?: string;
  media?: { src: string; alt: string; naturalWidth?: number; naturalHeight?: number };
  /** Texte injecté par CSS (::before / ::after) — invisible dans textContent mais bien affiché (icônes-police, libellés…). */
  pseudoElements?: { before?: string; after?: string };
}

/** Texte d'un `content:` CSS (chaîne simple uniquement ; `none`, `normal`, compteurs, attr()… sont ignorés). */
function parsePseudoContent(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = /^(["'])([\s\S]*)\1$/.exec(raw.trim());
  const text = match?.[2];
  return text && text.trim() ? text : undefined;
}

function collectPseudoElements(el: Element): ElementContent['pseudoElements'] {
  const read = (pseudo: string) => {
    try {
      return parsePseudoContent(computedStyleOf(el, pseudo).content);
    } catch {
      return undefined;
    }
  };
  const before = read('::before');
  const after = read('::after');
  return before || after ? { ...(before ? { before } : {}), ...(after ? { after } : {}) } : undefined;
}

function collectContent(el: Element): ElementContent {
  // Texte « sûr » : sans la valeur des champs (le texte d'un <textarea> EST sa valeur ; celui d'un champ sensible, un secret).
  const safeText = safeTextContent(el);
  const content: ElementContent = {
    textContent: safeText ? truncateText(safeText.trim().replace(/\s+/g, ' ')) : null,
    innerText:
      el instanceof HTMLElement
        ? truncateText(inlineText(el, createReadContext(), { links: false }))
        : null,
  };

  if (isFormControl(el)) {
    const control = el as HTMLInputElement;
    const field = readFieldValue(el);
    content.formValue = {
      value: field?.value ?? '',
      redacted: field?.redacted ?? false,
      disabled: control.disabled,
      required: control.required,
      validity: control.validity
        ? Object.fromEntries(
            Object.entries(Object.getPrototypeOf(control.validity))
              .map(([k]) => [k, (control.validity as any)[k]])
              .filter(([, v]) => typeof v === 'boolean'),
          )
        : undefined,
    };
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      content.checked = el.checked;
    }
    if (el instanceof HTMLSelectElement) {
      content.options = Array.from(el.options)
        .slice(0, 50)
        .map((o) => ({ label: (o.label || o.textContent || '').trim(), value: o.value, selected: o.selected }));
    }
  }

  if (el instanceof HTMLAnchorElement) content.href = el.href;

  if (el instanceof HTMLImageElement) {
    content.media = { src: el.src, alt: el.alt, naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight };
  }

  const pseudo = collectPseudoElements(el);
  if (pseudo) content.pseudoElements = pseudo;

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
  /** Composants React qui rendent cet élément, du plus proche au plus lointain (noms exploitables seulement). */
  ownerChain?: string[];
  reason?: string;
}

function findExpandoKey(el: HTMLElement, prefix: string): string | undefined {
  return Object.keys(el).find((k) => k.startsWith(prefix));
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
    // Les props d'un champ sensible portent sa valeur en clair (`value`) : elle est masquée comme ailleurs,
    // et toute clé évoquant un secret (password, token…) l'est aussi, à n'importe quelle profondeur.
    const props =
      rawProps !== undefined
        ? serializeForAI(rawProps, {
            maxDepth: MAX_REACT_PROPS_DEPTH,
            maxKeys: MAX_REACT_PROPS_KEYS,
            redactKeys: isSensitiveField(el) ? ['value', 'defaultValue'] : [],
          })
        : undefined;

    const ownerChain = getReactOwnerChain(el);
    return { available: true, componentName, props, hasKey: Boolean(fiberKey), ...(ownerChain.length ? { ownerChain } : {}) };
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

/**
 * Niveau de détail d'un rapport :
 *  - full     : tout (CSS calculé intégral, cascade de règles) — défaut d'inspect_element ;
 *  - standard : CSS regroupé par catégorie, sans l'intégralité des propriétés ni la cascade — défaut d'inspect_interface ;
 *  - compact  : identité, géométrie, accessibilité, contenu, React (sans props) — pas de CSS du tout.
 * La cascade CSS parcourt TOUTES les feuilles de style pour chaque élément : à réserver à `full` sur un élément précis.
 */
export type InspectDetail = 'compact' | 'standard' | 'full';

export interface InspectOptions {
  detail?: InspectDetail;
}

export interface ElementInspectionReport {
  /** Sections volontairement omises par le niveau de détail demandé (vide en `full`). */
  omittedSections: string[];
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
export function inspectDOMElement(el: Element, actionId?: string, options: InspectOptions = {}): ElementInspectionReport {
  const detail: InspectDetail = options.detail ?? 'full';
  const safe = <T,>(fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };

  const omittedSections: string[] = [];
  if (detail !== 'full') omittedSections.push('appliedCSSRules', 'computedStyle.allProperties', 'computedStyle.cssText');
  if (detail === 'compact') omittedSections.push('computedStyle.byCategory', 'react.props');

  const appliedCSSRules = detail === 'full' ? safe(() => collectAppliedCSSRules(el), []) : [];

  const emptyStyle: ElementComputedStyle = { cssText: '', allProperties: {}, byCategory: {} };
  let computedStyle = emptyStyle;
  if (detail !== 'compact') {
    computedStyle = safe(() => collectComputedStyle(el), emptyStyle);
    if (detail === 'standard') computedStyle = { cssText: '', allProperties: {}, byCategory: computedStyle.byCategory };
  }

  let react = safe(() => collectReactInfo(el), { available: false, reason: 'échec inattendu' } as ReactElementInfo);
  if (detail === 'compact' && react.props !== undefined) react = { ...react, props: undefined };

  return {
    omittedSections,
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
      ref: '',
      inShadowRoot: false,
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
    computedStyle,
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
    react,
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
  detail: InspectDetail;
  /** Index (dans la liste des nœuds significatifs) du premier nœud de ce rapport. */
  offset: number;
  /** Valeur d'`offset` pour obtenir la suite, ou null si tout a été renvoyé. */
  nextOffset: number | null;
}

export interface InspectInterfaceOptions extends InspectOptions {
  /** Nœuds renvoyés au maximum (plafond absolu : 500). */
  limit?: number;
  /** Pagination : nombre de nœuds significatifs à sauter. */
  offset?: number;
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
export function inspectFullInterface(rootSelector?: string, options: InspectInterfaceOptions = {}): FullInterfaceReport {
  const detail: InspectDetail = options.detail ?? 'full';
  const limit = Math.max(1, Math.min(Math.floor(options.limit ?? MAX_INTERFACE_NODES), MAX_INTERFACE_NODES));
  const offset = Math.max(0, Math.floor(options.offset ?? 0));

  const root = rootSelector ? document.querySelector(rootSelector) : document.body;
  if (!root) {
    return { url: window.location.href, title: document.title, nodes: [], totalMeaningfulNodesFound: 0, truncated: false, detail, offset, nextOffset: null };
  }

  // Shadow DOM ouverts inclus ; zones `data-ai-ignore` (ex: le panneau de l'assistant) et balises techniques écartées.
  const allMeaningful = Array.from(
    walkElementsDeep(root, { iframes: false }, (el) => SKIPPED_TAGS.has(el.localName) || el.hasAttribute('data-ai-ignore')),
  ).filter(isMeaningfulNode);
  const selected = allMeaningful.slice(offset, offset + limit);
  const nextOffset = offset + limit < allMeaningful.length ? offset + limit : null;

  // Index pour retrouver rapidement le nodeIndex du plus proche ancêtre significatif DANS cette page de résultats
  const indexByElement = new Map<Element, number>();
  selected.forEach((el, i) => indexByElement.set(el, offset + i));

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
    return { ...inspectDOMElement(el, undefined, { detail }), nodeIndex: offset + i, parentNodeIndex };
  });

  return {
    url: window.location.href,
    title: document.title,
    nodes,
    totalMeaningfulNodesFound: allMeaningful.length,
    truncated: nextOffset !== null,
    detail,
    offset,
    nextOffset,
  };
}
