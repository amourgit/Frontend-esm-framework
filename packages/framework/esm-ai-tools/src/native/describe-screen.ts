// =============================================================================
//  @egen/esm-ai-tools — describe_screen
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

import { getObservablesCatalogForLLM } from '../observables';

const MAX_INTERACTIVE_ELEMENTS = 60;

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
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export interface DescribedElement {
  tag: string;
  role: string | null;
  accessibleName: string;
  /** État observable directement sur l'élément (disabled, checked, valeur courante...). */
  state: Record<string, string | boolean>;
  position: { x: number; y: number; width: number; height: number };
}

export interface DescribedHeading {
  level: number;
  text: string;
}

export interface ScreenDescription {
  url: string;
  title: string;
  headings: DescribedHeading[];
  interactiveElements: DescribedElement[];
  /** true si des éléments interactifs ont été omis pour rester sous MAX_INTERACTIVE_ELEMENTS. */
  truncated: boolean;
  observables: ReturnType<typeof getObservablesCatalogForLLM>;
}

function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

/**
 * Calcule le nom accessible d'un élément, en suivant le même ordre de
 * priorité que les technologies d'assistance : aria-label explicite,
 * aria-labelledby, <label> associé (pour les champs), placeholder en
 * dernier recours pour un champ, sinon le texte visible.
 */
function computeAccessibleName(el: Element): string {
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel?.trim()) return ariaLabel.trim();

  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelText = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    if (labelText) return labelText;
  }

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    const associatedLabel = el.labels?.[0]?.textContent?.trim();
    if (associatedLabel) return associatedLabel;
    if ('placeholder' in el && el.placeholder) return el.placeholder;
  }

  return (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
}

function computeElementState(el: Element): Record<string, string | boolean> {
  const state: Record<string, string | boolean> = {};

  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    if (el.disabled) state.disabled = true;
  }
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') {
      state.checked = el.checked;
    } else if (el.value) {
      // Jamais la valeur d'un champ de mot de passe — même en lecture seule
      // pour la description d'écran, un secret ne doit jamais transiter
      // vers le LLM.
      state.value = el.type === 'password' ? '••••••' : el.value;
    }
  }
  const ariaExpanded = el.getAttribute('aria-expanded');
  if (ariaExpanded !== null) state.expanded = ariaExpanded === 'true';
  const ariaSelected = el.getAttribute('aria-selected');
  if (ariaSelected !== null) state.selected = ariaSelected === 'true';
  const ariaInvalid = el.getAttribute('aria-invalid');
  if (ariaInvalid === 'true') state.invalid = true;

  return state;
}

export function describeCurrentScreen(): ScreenDescription {
  const headings: DescribedHeading[] = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .filter(isVisible)
    .map((el) => ({
      level: Number(el.tagName.slice(1)),
      text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 200),
    }));

  const allInteractive = Array.from(document.querySelectorAll(INTERACTIVE_SELECTOR)).filter(isVisible);
  const truncated = allInteractive.length > MAX_INTERACTIVE_ELEMENTS;

  const interactiveElements: DescribedElement[] = allInteractive.slice(0, MAX_INTERACTIVE_ELEMENTS).map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role'),
      accessibleName: computeAccessibleName(el),
      state: computeElementState(el),
      position: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  });

  return {
    url: window.location.href,
    title: document.title,
    headings,
    interactiveElements,
    truncated,
    observables: getObservablesCatalogForLLM(),
  };
}
