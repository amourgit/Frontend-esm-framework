import { beforeEach, describe, expect, it, vi } from 'vitest';
import { contextStore, getContext, registerContext, subscribeToContext, unregisterContext, updateContext } from './context';

beforeEach(() => {
  contextStore.setState({}, true);
});

describe('registerContext / getContext', () => {
  it('enregistre un espace de noms avec sa valeur initiale, lue en lecture seule (copie figée)', () => {
    registerContext('ns', { a: 1 });

    const value = getContext<{ a: number }>('ns');
    expect(value).toEqual({ a: 1 });
    expect(Object.isFrozen(value)).toBe(true);
  });

  it('sans valeur initiale : objet vide', () => {
    registerContext('vide');
    expect(getContext('vide')).toEqual({});
  });

  it('un espace de noms inconnu vaut null', () => {
    expect(getContext('absent')).toBeNull();
  });

  it('refuse de réenregistrer un espace de noms sans l’avoir désenregistré', () => {
    registerContext('ns');
    expect(() => registerContext('ns')).toThrow(/re-register namespace ns/);
  });

  it('applique un sélecteur à la lecture', () => {
    registerContext('ns', { a: 1, b: 2 });
    expect(getContext<{ a: number; b: number }, { b: number }>('ns', (s) => ({ b: s.b }))).toEqual({ b: 2 });
  });
});

describe('unregisterContext', () => {
  it('retire l’espace de noms, qui peut ensuite être réenregistré', () => {
    registerContext('ns', { a: 1 });
    unregisterContext('ns');

    expect(getContext('ns')).toBeNull();
    expect(() => registerContext('ns', { a: 2 })).not.toThrow();
    expect(getContext('ns')).toEqual({ a: 2 });
  });

  it('un espace de noms inconnu est ignoré sans erreur', () => {
    expect(() => unregisterContext('inconnu')).not.toThrow();
  });
});

describe('updateContext', () => {
  it('remplace la valeur par le résultat de la fonction', () => {
    registerContext('ns', { n: 1 });
    updateContext<{ n: number }>('ns', (state) => ({ n: state.n + 1 }));
    expect(getContext('ns')).toEqual({ n: 2 });
  });

  it('crée l’espace de noms s’il n’existe pas encore (partant d’un objet vide)', () => {
    updateContext<{ x?: number }>('neuf', (state) => ({ ...state, x: 5 }));
    expect(getContext('neuf')).toEqual({ x: 5 });
  });
});

describe('subscribeToContext', () => {
  it('appelle immédiatement avec l’état courant, puis à chaque changement de cet espace de noms', () => {
    registerContext('ns', { n: 1 });
    const callback = vi.fn();

    const unsubscribe = subscribeToContext<{ n: number }>('ns', callback);
    expect(callback).toHaveBeenLastCalledWith({ n: 1 });

    updateContext<{ n: number }>('ns', () => ({ n: 2 }));
    expect(callback).toHaveBeenLastCalledWith({ n: 2 });
    expect(callback).toHaveBeenCalledTimes(2);

    unsubscribe();
    updateContext<{ n: number }>('ns', () => ({ n: 3 }));
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('n’est pas notifié des changements d’un autre espace de noms', () => {
    registerContext('a', { n: 1 });
    registerContext('b', { n: 1 });
    const callback = vi.fn();
    subscribeToContext('a', callback);
    callback.mockClear();

    updateContext<{ n: number }>('b', () => ({ n: 2 }));

    expect(callback).not.toHaveBeenCalled();
  });

  it('notifie null quand l’espace de noms est retiré, et reçoit null s’il n’existe pas encore', () => {
    const callback = vi.fn();
    subscribeToContext('ns', callback);
    expect(callback).toHaveBeenLastCalledWith(null);

    registerContext('ns', { n: 1 });
    expect(callback).toHaveBeenLastCalledWith({ n: 1 });

    unregisterContext('ns');
    expect(callback).toHaveBeenLastCalledWith(null);
  });
});
