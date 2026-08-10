import { describe, it, expect, beforeEach, vi } from 'vitest';
import { describeCurrentScreen } from './describe-screen';
import { registerObservable, _clearObservableRegistry } from '../observables';

function mockVisible(el: HTMLElement, rect: Partial<DOMRect> = {}) {
  Object.defineProperty(el, 'getBoundingClientRect', {
    value: () => ({ x: 0, y: 0, width: 100, height: 30, top: 0, left: 0, right: 100, bottom: 30, ...rect }),
    configurable: true,
  });
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    (target) =>
      ({
        display: 'block',
        visibility: 'visible',
        opacity: '1',
      }) as CSSStyleDeclaration,
  );
}

describe('describeCurrentScreen', () => {
  beforeEach(() => {
    _clearObservableRegistry();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('recense les titres visibles avec leur niveau', () => {
    const h1 = document.createElement('h1');
    h1.textContent = 'Tableau de bord';
    document.body.appendChild(h1);
    mockVisible(h1);

    const description = describeCurrentScreen();

    expect(description.headings).toEqual([{ level: 1, text: 'Tableau de bord' }]);
  });

  it('calcule le nom accessible par ordre de priorité : aria-label > label associé > placeholder > texte', () => {
    const withAriaLabel = document.createElement('button');
    withAriaLabel.setAttribute('aria-label', 'Fermer la fenêtre');
    withAriaLabel.textContent = 'X';
    document.body.appendChild(withAriaLabel);
    mockVisible(withAriaLabel);

    const input = document.createElement('input');
    input.id = 'email-field';
    const label = document.createElement('label');
    label.setAttribute('for', 'email-field');
    label.textContent = 'Adresse e-mail';
    document.body.append(label, input);
    mockVisible(input);

    const description = describeCurrentScreen();

    const closeButton = description.interactiveElements.find((e) => e.tag === 'button');
    const emailInput = description.interactiveElements.find((e) => e.tag === 'input');

    expect(closeButton?.accessibleName).toBe('Fermer la fenêtre');
    expect(emailInput?.accessibleName).toBe('Adresse e-mail');
  });

  it('masque la valeur des champs de mot de passe même en lecture seule', () => {
    const passwordField = document.createElement('input');
    passwordField.type = 'password';
    passwordField.value = 'S3cretR3el!';
    document.body.appendChild(passwordField);
    mockVisible(passwordField);

    const description = describeCurrentScreen();
    const described = description.interactiveElements.find((e) => e.tag === 'input');

    expect(described?.state.value).toBe('••••••');
    expect(JSON.stringify(description)).not.toContain('S3cretR3el!');
  });

  it('ignore les éléments non visibles (display: none)', () => {
    const hidden = document.createElement('button');
    hidden.textContent = 'Caché';
    document.body.appendChild(hidden);
    Object.defineProperty(hidden, 'getBoundingClientRect', {
      value: () => ({ x: 0, y: 0, width: 0, height: 0 }),
    });

    const description = describeCurrentScreen();

    expect(description.interactiveElements.find((e) => e.accessibleName === 'Caché')).toBeUndefined();
  });

  it('plafonne le nombre d’éléments interactifs et signale la troncature', () => {
    for (let i = 0; i < 75; i++) {
      const btn = document.createElement('button');
      btn.textContent = `Bouton ${i}`;
      document.body.appendChild(btn);
      mockVisible(btn);
    }

    const description = describeCurrentScreen();

    expect(description.interactiveElements.length).toBe(60);
    expect(description.truncated).toBe(true);
  });

  it('inclut le catalogue des observables déclarés', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    mockVisible(el);
    registerObservable(
      { id: 'summary', kind: 'card', label: 'Résumé', description: '...', getData: () => ({ total: 42 }) },
      el,
    );

    const description = describeCurrentScreen();

    expect(description.observables).toEqual([
      expect.objectContaining({ id: 'summary', data: { total: 42 } }),
    ]);
  });
});
