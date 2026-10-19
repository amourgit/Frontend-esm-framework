import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNavBehavior, navBehaviorStore, registerNavBehavior } from './nav-behavior';

afterEach(() => navBehaviorStore.setState({ behaviors: {} }, true));

describe('registerNavBehavior', () => {
  it("n'a aucun comportement par défaut", () => {
    expect(getNavBehavior({ entry: 'annuaire-nav-contacts' })).toBeUndefined();
  });

  it('distingue une entrée et une section de même nom', () => {
    const onEntry = { onSelect: vi.fn() };
    const onSection = { onSelect: vi.fn() };
    registerNavBehavior({ entry: 'annuaire' }, onEntry);
    registerNavBehavior({ section: 'annuaire' }, onSection);
    expect(getNavBehavior({ entry: 'annuaire' })).toBe(onEntry);
    expect(getNavBehavior({ section: 'annuaire' })).toBe(onSection);
  });

  it('le dernier enregistré remplace le précédent', () => {
    const first = { onSelect: vi.fn() };
    const second = { onSelect: vi.fn() };
    registerNavBehavior({ entry: 'x' }, first);
    registerNavBehavior({ entry: 'x' }, second);
    expect(getNavBehavior({ entry: 'x' })).toBe(second);
  });

  it('retourne une fonction de retrait, sans effet si le comportement a été remplacé depuis', () => {
    const first = { onSelect: vi.fn() };
    const second = { onSelect: vi.fn() };
    const unregisterFirst = registerNavBehavior({ entry: 'x' }, first);
    registerNavBehavior({ entry: 'x' }, second);
    unregisterFirst();
    expect(getNavBehavior({ entry: 'x' })).toBe(second);

    const unregisterThird = registerNavBehavior({ entry: 'y' }, first);
    unregisterThird();
    expect(getNavBehavior({ entry: 'y' })).toBeUndefined();
  });

  it('transmet le contexte au comportement (runDefault conserve la logique globale)', () => {
    const runDefault = vi.fn();
    registerNavBehavior({ entry: 'x' }, { onSelect: (ctx) => ctx.runDefault() });
    getNavBehavior({ entry: 'x' })?.onSelect({
      target: { entry: 'x' },
      route: 'a/b',
      workspaceId: 'intranet',
      runDefault,
    });
    expect(runDefault).toHaveBeenCalledOnce();
  });
});
