import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerToolWindow } from './tool-window-registration';
import { getExtensionRegistration } from './extensions';

afterEach(() => vi.restoreAllMocks());

describe('registerToolWindow', () => {
  const load = () =>
    Promise.resolve({
      bootstrap: () => Promise.resolve(),
      mount: () => Promise.resolve(),
      unmount: () => Promise.resolve(),
    });

  it('enregistre l’extension et la rattache au slot de la zone', () => {
    expect(
      registerToolWindow({
        moduleName: '@remote/app',
        name: 'remote-tree',
        anchor: 'left',
        meta: { title: 'Remote', global: true },
        load,
      }),
    ).toBe(true);
    expect(getExtensionRegistration('remote-tree')?.moduleName).toBe('@remote/app');
  });

  it('refuse (en avertissant) une meta invalide', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(
      registerToolWindow({ moduleName: '@remote/app', name: 'bad', anchor: 'right', meta: { title: '' }, load }),
    ).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('title'));
    expect(getExtensionRegistration('bad')).toBeUndefined();
  });
});

describe('compartiments (meta.compartment)', () => {
  it('valide et résout les hauteurs, avec les valeurs par défaut', async () => {
    const { getToolWindowCompartment, getToolWindowMetaProblems, DEFAULT_COMPARTMENT_HEIGHTS } =
      await import('./tool-window');
    expect(getToolWindowCompartment({})).toBeNull();
    expect(getToolWindowCompartment({ compartment: 'default' })).toBeNull();
    expect(getToolWindowCompartment({ compartment: {} })).toEqual(DEFAULT_COMPARTMENT_HEIGHTS);
    expect(getToolWindowCompartment({ compartment: { height: 90, maxHeight: 60 } })).toEqual({
      height: 60,
      minHeight: 15,
      maxHeight: 60,
    });
    expect(getToolWindowMetaProblems({ title: 'x', compartment: 'default' })).toEqual([]);
    expect(getToolWindowMetaProblems({ title: 'x', compartment: { height: 30 } })).toEqual([]);
    expect(getToolWindowMetaProblems({ title: 'x', compartment: { height: 500 } })).toHaveLength(1);
    expect(getToolWindowMetaProblems({ title: 'x', compartment: { minHeight: 50, maxHeight: 20 } })).toHaveLength(1);
    expect(getToolWindowMetaProblems({ title: 'x', compartment: 'big' })).toHaveLength(1);
  });
});
