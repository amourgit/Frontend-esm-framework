import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerObservable,
  getObservablesCatalogForLLM,
  subscribeToObservables,
  _clearObservableRegistry,
} from './observables';

describe('observables registry', () => {
  beforeEach(() => {
    _clearObservableRegistry();
    document.body.innerHTML = '';
  });

  it('expose les données structurées calculées à la lecture (pas en cache)', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    let students = [{ nom: 'Alice' }];
    registerObservable(
      {
        id: 'students-table',
        kind: 'table',
        label: 'Étudiants',
        description: 'Liste des étudiants',
        getData: () => students,
      },
      el,
    );

    expect(getObservablesCatalogForLLM()[0].data).toEqual([{ nom: 'Alice' }]);

    // La donnée change dynamiquement — le catalogue doit refléter l'état
    // COURANT, pas une valeur figée au moment de l'enregistrement.
    students = [{ nom: 'Alice' }, { nom: 'Bob' }];
    expect(getObservablesCatalogForLLM()[0].data).toEqual([{ nom: 'Alice' }, { nom: 'Bob' }]);
  });

  it('calcule une position (rect) plutôt que de transmettre du CSS', () => {
    const el = document.createElement('div');
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({ x: 12.4, y: 8.6, width: 300.2, height: 40.9 }),
    });
    document.body.appendChild(el);

    registerObservable({ id: 'status', kind: 'status', label: 'Statut', description: '...', getData: () => 'ok' }, el);

    const snapshot = getObservablesCatalogForLLM()[0];
    expect(snapshot.position).toEqual({ x: 12, y: 9, width: 300, height: 41 });
    expect(snapshot).not.toHaveProperty('css');
    expect(snapshot).not.toHaveProperty('style');
  });

  it('porte un état sémantique (state), jamais une valeur CSS', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    registerObservable(
      { id: 'error-banner', kind: 'status', label: 'Erreur', description: '...', state: 'error', getData: () => null },
      el,
    );

    expect(getObservablesCatalogForLLM()[0].state).toBe('error');
  });

  it("n'expose que les observables toujours attachés au document", () => {
    const attached = document.createElement('div');
    document.body.appendChild(attached);
    const detached = document.createElement('div');

    registerObservable({ id: 'a', kind: 'text', label: 'A', description: '...', getData: () => 'a' }, attached);
    registerObservable({ id: 'b', kind: 'text', label: 'B', description: '...', getData: () => 'b' }, detached);

    const ids = getObservablesCatalogForLLM().map((o) => o.id);
    expect(ids).toContain('a');
    expect(ids).not.toContain('b');
  });

  it("capture une exception de getData() sans faire échouer les autres observables", () => {
    const broken = document.createElement('div');
    const healthy = document.createElement('div');
    document.body.append(broken, healthy);

    registerObservable(
      {
        id: 'broken',
        kind: 'text',
        label: 'Cassé',
        description: '...',
        getData: () => {
          throw new Error('boom');
        },
      },
      broken,
    );
    registerObservable({ id: 'healthy', kind: 'text', label: 'Sain', description: '...', getData: () => 'ok' }, healthy);

    const catalog = getObservablesCatalogForLLM();
    const brokenSnapshot = catalog.find((o) => o.id === 'broken');
    const healthySnapshot = catalog.find((o) => o.id === 'healthy');

    expect(brokenSnapshot?.data).toMatchObject({ error: expect.stringContaining('boom') });
    expect(healthySnapshot?.data).toBe('ok');
  });

  it('notifie les abonnés à chaque enregistrement/retrait', () => {
    let notifications = 0;
    const unsubscribe = subscribeToObservables(() => notifications++);

    const el = document.createElement('div');
    document.body.appendChild(el);
    const cleanup = registerObservable({ id: 'x', kind: 'text', label: 'X', description: '...', getData: () => 'x' }, el);
    expect(notifications).toBe(1);

    cleanup();
    expect(notifications).toBe(2);

    unsubscribe();
  });
});
