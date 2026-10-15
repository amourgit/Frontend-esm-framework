// =============================================================================
//  @egen-civitas/esm-ai-tools — describe_screen
//
//  Filet de secours pour toute page qui n'a PAS déclaré ses actions/
//  observables via useAIActionable/useAIObservable : décrit l'écran
//  actuellement affiché en lisant le DOM réel — headings, régions,
//  éléments interactifs visibles avec leur nom accessible et leur état,
//  et les observables déjà enregistrés (voir observables.ts).
//
//  Ce n'est PAS un arbre d'accessibilité complet façon moteur de navigateur
//  (l'API "Accessibility Object Model" n'est pas exposée aux scripts dans
//  les navigateurs actuels) — c'est une approximation pragmatique basée sur
//  les mêmes règles que les technologies d'assistance (aria-label >
//  aria-labelledby > <label> associé > texte visible), suffisante pour
//  qu'un LLM comprenne CE QUI est affichable et actionnable, sans jamais
//  transmettre de CSS brut.
//
//  Plafond volontaire (MAX_INTERACTIVE_ELEMENTS) : une page mal maîtrisée
//  peut contenir des centaines de nœuds interactifs. Sans limite, un seul
//  appel pourrait faire exploser le contexte envoyé au LLM — même logique
//  de troncature défensive que EGEN_AI_CONTEXT_MAX_SIZE dans esm-ai-context.
// =============================================================================

import { getObservablesCatalogForLLM } from '../observables.js';
import { getComponentTitle } from './components.js';
import {
  computeAccessibleName,
  getElementRef,
  isFormControl,
  readFieldValue,
  tagOf,
  walkElementsDeep,
} from './dom-utils.js';
import { SKIPPED_TAGS, roleOf } from './text-extract.js';

const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 300;
const MAX_LANDMARKS = 20;

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="switch"]',
  '[role="combobox"]',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const LANDMARK_SELECTOR =
  'main, nav, header, footer, aside, dialog, [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], ' +
  '[role="complementary"], [role="region"][aria-label], [role="search"], [role="dialog"], [role="alertdialog"]';

export interface DescribedElement {
  tag: string;
  role: string | null;
  accessibleName: string;
  /** État observable directement sur l'élément (disabled, checked, valeur courante...). */
  state: Record<string, string | boolean>;
  position: { x: number; y: number; width: number; height: number };
  /** Référence stable (« e42 ») utilisable avec read_component / inspect_element / scroll_to. */
  ref: string;
  /** true si l'élément est (au moins en partie) dans la fenêtre visible. */
  inViewport: boolean;
}

export interface DescribedHeading {
  level: number;
  text: string;
}

export interface DescribedLandmark {
  role: string;
  name: string;
  ref: string;
}

export interface ScreenDescription {
  url: string;
  title: string;
  lang: string | null;
  headings: DescribedHeading[];
  landmarks: DescribedLandmark[];
  interactiveElements: DescribedElement[];
  /** Nombre total d'éléments interactifs visibles (avant limit/offset). */
  totalInteractive: number;
  offset: number;
  /** true si des éléments interactifs n'ont pas été renvoyés (relancer avec offset pour la suite). */
  truncated: boolean;
  observables: ReturnType<typeof getObservablesCatalogForLLM>;
}

export interface DescribeScreenOptions {
  /** Éléments interactifs renvoyés au maximum (défaut 60, plafond 300). */
  limit?: number;
  /** Pagination : nombre d'éléments interactifs à sauter. */
  offset?: number;
  /** Inclure les éléments hors de la fenêtre visible (défaut : true). */
  includeOffscreen?: boolean;
}

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function inViewportNow(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
}

function computeElementState(el: Element): Record<string, string | boolean> {
  const state: Record<string, string | boolean> = {};

  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') state.disabled = true;

  if (tagOf(el) === 'input' && ['checkbox', 'radio'].includes((el as HTMLInputElement).type)) {
    state.checked = (el as HTMLInputElement).checked;
  } else if (isFormControl(el)) {
    // Valeur masquée pour tout champ sensible (mot de passe, jeton, IBAN…) : un secret ne doit jamais
    // transiter vers le LLM, même en lecture seule pour la description d'écran.
    const value = readFieldValue(el);
    if (value?.value) state.value = value.value;
  } else if (['checkbox', 'radio', 'switch'].includes(roleOf(el) ?? '')) {
    state.checked = el.getAttribute('aria-checked') === 'true';
  }

  const ariaExpanded = el.getAttribute('aria-expanded');
  if (ariaExpanded !== null) state.expanded = ariaExpanded === 'true';
  const ariaSelected = el.getAttribute('aria-selected');
  if (ariaSelected !== null) state.selected = ariaSelected === 'true';
  const ariaPressed = el.getAttribute('aria-pressed');
  if (ariaPressed !== null) state.pressed = ariaPressed === 'true';
  if (el.getAttribute('aria-invalid') === 'true') state.invalid = true;

  return state;
}

/** Sous-arborescences jamais décrites : balises techniques et zones marquées `data-ai-ignore` (ex: le panneau de l'assistant lui-même). */
const skipSubtree = (el: Element): boolean => SKIPPED_TAGS.has(tagOf(el)) || el.hasAttribute('data-ai-ignore');

export function describeCurrentScreen(options: DescribeScreenOptions = {}): ScreenDescription {
  const limit = Math.max(1, Math.min(Math.floor(options.limit ?? DEFAULT_LIMIT), MAX_LIMIT));
  const offset = Math.max(0, Math.floor(options.offset ?? 0));

  const headings: DescribedHeading[] = [];
  const landmarks: DescribedLandmark[] = [];
  let allInteractive: Element[] = [];

  for (const el of walkElementsDeep(document.body, {}, skipSubtree)) {
    const tag = tagOf(el);
    if (/^h[1-6]$/.test(tag)) {
      if (isVisible(el)) {
        headings.push({
          level: Number(tag.slice(1)),
          text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 200),
        });
      }
      continue;
    }
    if (landmarks.length < MAX_LANDMARKS && el.matches(LANDMARK_SELECTOR) && isVisible(el)) {
      landmarks.push({
        role: roleOf(el) ?? tag,
        name: getComponentTitle(el, 80) ?? '',
        ref: getElementRef(el),
      });
    }
    if (el.matches(INTERACTIVE_SELECTOR) && isVisible(el)) allInteractive.push(el);
  }

  if (options.includeOffscreen === false) allInteractive = allInteractive.filter(inViewportNow);

  const totalInteractive = allInteractive.length;
  const interactiveElements: DescribedElement[] = allInteractive.slice(offset, offset + limit).map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      tag: tagOf(el),
      role: el.getAttribute('role'),
      accessibleName: computeAccessibleName(el, 120),
      state: computeElementState(el),
      position: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
      ref: getElementRef(el),
      inViewport: inViewportNow(el),
    };
  });

  return {
    url: window.location.href,
    title: document.title,
    lang: document.documentElement.getAttribute('lang'),
    headings,
    landmarks,
    interactiveElements,
    totalInteractive,
    offset,
    truncated: offset + limit < totalInteractive,
    observables: getObservablesCatalogForLLM(),
  };
}
