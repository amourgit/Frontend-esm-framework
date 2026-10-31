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
