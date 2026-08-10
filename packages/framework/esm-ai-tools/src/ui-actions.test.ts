import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerUIAction,
  getVisibleUIActions,
  getUIActionElement,
  subscribeToUIActions,
  setNativeInputValue,
  _clearUIActionRegistry,
} from './ui-actions';

describe('ui-actions registry', () => {
  beforeEach(() => {
    _clearUIActionRegistry();
    document.body.innerHTML = '';
  });

  it("n'expose que les actions dont l'élément est toujours attaché au document", () => {
    const attached = document.createElement('button');
    document.body.appendChild(attached);
    const detached = document.createElement('button');
    // volontairement non ajouté au document

    registerUIAction({ id: 'attached', kind: 'click', label: 'Attaché', description: '...' }, attached);
    registerUIAction({ id: 'detached', kind: 'click', label: 'Détaché', description: '...' }, detached);

    const visible = getVisibleUIActions().map((a) => a.id);
    expect(visible).toContain('attached');
    expect(visible).not.toContain('detached');
  });

  it('résout l’élément réel via getUIActionElement, et null si retiré du document', () => {
    const el = document.createElement('input');
    document.body.appendChild(el);
    registerUIAction({ id: 'field', kind: 'fill', label: 'Champ', description: '...' }, el);

    expect(getUIActionElement('field')).toBe(el);

    el.remove();
    expect(getUIActionElement('field')).toBeNull();
  });

  it('le nettoyage retourné par registerUIAction retire bien l’action', () => {
    const el = document.createElement('button');
    document.body.appendChild(el);
    const cleanup = registerUIAction({ id: 'btn', kind: 'click', label: 'Bouton', description: '...' }, el);

    expect(getVisibleUIActions()).toHaveLength(1);
    cleanup();
    expect(getVisibleUIActions()).toHaveLength(0);
  });

  it('ne retire pas un ré-enregistrement plus récent sous le même id (cleanup tardif)', () => {
    const first = document.createElement('button');
    const second = document.createElement('button');
    document.body.append(first, second);

    const cleanupFirst = registerUIAction({ id: 'dup', kind: 'click', label: 'A', description: '...' }, first);
    registerUIAction({ id: 'dup', kind: 'click', label: 'B', description: '...' }, second);

    cleanupFirst(); // démontage tardif du premier élément — ne doit pas écraser le second

    expect(getUIActionElement('dup')).toBe(second);
  });

  it('notifie les abonnés à chaque enregistrement/retrait', () => {
    let notifications = 0;
    const unsubscribe = subscribeToUIActions(() => notifications++);

    const el = document.createElement('button');
    document.body.appendChild(el);
    const cleanup = registerUIAction({ id: 'btn', kind: 'click', label: 'Bouton', description: '...' }, el);
    expect(notifications).toBe(1);

    cleanup();
    expect(notifications).toBe(2);

    unsubscribe();
  });

  it('setNativeInputValue déclenche un évènement input détectable par un listener React-like', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);

    let observedValue = '';
    input.addEventListener('input', (e) => {
      observedValue = (e.target as HTMLInputElement).value;
    });

    setNativeInputValue(input, 'N0uveauM0tDePasse!');

    expect(observedValue).toBe('N0uveauM0tDePasse!');
    expect(input.value).toBe('N0uveauM0tDePasse!');
  });
});
