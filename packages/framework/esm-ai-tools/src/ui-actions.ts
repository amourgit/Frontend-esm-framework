// =============================================================================
//  @egen/esm-ai-tools — Registre d'actions UI génériques
//
//  Contrairement à un "workflow" codé en dur (« pour changer le mot de
//  passe, fais ceci puis cela »), ce registre ne décrit QUE les éléments
//  interactifs individuels présents à l'écran — un bouton, un champ — avec
//  une description de ce qu'ils font. Le LLM reçoit ce catalogue (via le
//  contexte IA, voir esm-ai-assistant-app) et compose LUI-MÊME la séquence
//  d'actions nécessaire pour atteindre l'objectif de l'utilisateur, en
//  combinant navigate/click_element/fill_field dans l'ordre qu'il juge bon.
//  Aucune logique de tâche n'est écrite ici ni ailleurs dans ce package.
//
//  Portabilité mobile : ce registre stocke une référence DOM réelle
//  (HTMLElement) et agit via les APIs DOM standard (click(), value setter +
//  évènement 'input'). Si l'application est encapsulée dans un wrapper
//  natif (WebView, ex. via Capacitor/Cordova-style "convertisseur Kotlin"),
//  c'est exactement le même DOM/JS qui s'exécute dedans — aucune adaptation
//  spécifique à la plateforme n'est nécessaire.
//
//  Enregistrement (voir @egen/esm-ai-framework, hook useAIActionable) :
//
//  ```tsx
//  const submitRef = useAIActionable<HTMLButtonElement>({
//    id: 'change-password:submit',
//    kind: 'click',
//    label: 'Valider le changement de mot de passe',
//    description: "Soumet le formulaire une fois les 3 champs remplis.",
//  });
//  return <Button ref={submitRef} type="submit">...</Button>;
//  ```
//
//  Un élément n'est visible du LLM QUE tant qu'il est monté à l'écran — le
//  hook se charge de l'enregistrement/désenregistrement automatique au
//  montage/démontage du composant React qui le porte.
// =============================================================================

export type AIUIActionKind = 'click' | 'fill' | 'toggle' | 'select';

export interface AIUIActionDefinition {
  /** Identifiant unique, stable, à travers lequel le LLM référence cette action (ex: "change-password:submit"). */
  id: string;
  kind: AIUIActionKind;
  /** Libellé court, tel qu'affiché à l'écran (aide le LLM à faire le lien avec ce que voit l'utilisateur). */
  label: string;
  /** Description de ce que fait cette action, à destination du LLM. */
  description: string;
  /** Pour kind 'select' : valeurs possibles. */
  options?: string[];
  moduleName?: string;
}

interface RegisteredUIAction extends AIUIActionDefinition {
  element: HTMLElement;
}

const _actions = new Map<string, RegisteredUIAction>();
const _listeners = new Set<() => void>();

function notifyChange(): void {
  _listeners.forEach((cb) => cb());
}

/** Notifié à chaque enregistrement/désenregistrement — utilisé par le context provider pour rester à jour en temps réel. */
export function subscribeToUIActions(onChange: () => void): () => void {
  _listeners.add(onChange);
  return () => _listeners.delete(onChange);
}

/**
 * Enregistre un élément interactif. Retourne une fonction de nettoyage à
 * appeler au démontage (voir useAIActionable, qui s'en charge automatiquement).
 */
export function registerUIAction(def: AIUIActionDefinition, element: HTMLElement): () => void {
  _actions.set(def.id, { ...def, element });
  notifyChange();
  return () => {
    const current = _actions.get(def.id);
    // Ne retire que si c'est bien CET élément qui est enregistré sous cet id
    // (évite qu'un démontage tardif écrase un ré-enregistrement plus récent).
    if (current?.element === element) {
      _actions.delete(def.id);
      notifyChange();
    }
  };
}

/** Catalogue des actions actuellement VISIBLES à l'écran (élément toujours attaché au document). */
export function getVisibleUIActions(): AIUIActionDefinition[] {
  return Array.from(_actions.values())
    .filter((a) => a.element.isConnected)
    .map(({ element, ...rest }) => rest);
}

/** Résout l'élément DOM réel d'une action, ou `null` s'il n'existe pas / n'est plus visible. */
export function getUIActionElement(id: string): HTMLElement | null {
  const action = _actions.get(id);
  if (!action || !action.element.isConnected) return null;
  return action.element;
}

/** Retourne la définition déclarée d'une action (sans l'élément DOM), ou `null`. */
export function getUIActionDefinition(id: string): AIUIActionDefinition | null {
  const action = _actions.get(id);
  if (!action || !action.element.isConnected) return null;
  const { element, ...rest } = action;
  return rest;
}

/**
 * Fixe la valeur d'un champ contrôlé (React) en passant par le setter natif
 * du DOM, puis déclenche un évènement 'input' — nécessaire car assigner
 * directement `.value` ne déclenche PAS le onChange de React (React
 * intercepte son propre setter). Voir https://github.com/facebook/react/issues/10135.
 */
export function setNativeInputValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  nativeSetter?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/** @internal — tests uniquement */
export function _clearUIActionRegistry(): void {
  _actions.clear();
  _listeners.clear();
}
