import { describe, expect, it, vi } from 'vitest';
import { setupOfflineMode, type OfflineSetupDeps } from './offline-setup';

function deps(serviceWorkerEnabled: boolean, overrides: Partial<OfflineSetupDeps> = {}) {
  const calls: string[] = [];
  const value: OfflineSetupDeps = {
    serviceWorkerEnabled,
    registerServiceWorker: vi.fn(async () => void calls.push('register')),
    activateOfflineCapability: vi.fn(async () => void calls.push('activate')),
    startStaticDependencyPrecaching: vi.fn(() => void calls.push('precache')),
    ...overrides,
  };
  return { value, calls };
}

describe('setupOfflineMode (E1)', () => {
  it('avec service worker (Web historique) : enregistre, active, puis précache — dans cet ordre', async () => {
    const { value, calls } = deps(true);
    await setupOfflineMode(value);
    expect(calls).toEqual(['register', 'activate', 'precache']);
  });

  it('sans service worker (natif) : les données hors ligne sont activées, rien ne touche au service worker', async () => {
    const { value, calls } = deps(false);
    await setupOfflineMode(value);
    expect(calls).toEqual(['activate']);
    expect(value.registerServiceWorker).not.toHaveBeenCalled();
    expect(value.startStaticDependencyPrecaching).not.toHaveBeenCalled();
  });

  it("un échec d'enregistrement du service worker se propage et n'active pas la suite", async () => {
    const failure = new Error('SW refusé');
    const { value } = deps(true, { registerServiceWorker: vi.fn().mockRejectedValue(failure) });
    await expect(setupOfflineMode(value)).rejects.toBe(failure);
    expect(value.activateOfflineCapability).not.toHaveBeenCalled();
    expect(value.startStaticDependencyPrecaching).not.toHaveBeenCalled();
  });

  it("un échec d'activation sans service worker se propage (l'appelant le journalise)", async () => {
    const failure = new Error('stockage indisponible');
    const { value } = deps(false, { activateOfflineCapability: vi.fn().mockRejectedValue(failure) });
    await expect(setupOfflineMode(value)).rejects.toBe(failure);
  });
});
