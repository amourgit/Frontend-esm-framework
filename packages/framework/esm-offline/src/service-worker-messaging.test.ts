import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEgenServiceWorker } from './service-worker';
import { messageEgenServiceWorker } from './service-worker-messaging';

vi.mock('./service-worker', () => ({ getEgenServiceWorker: vi.fn() }));

const mockGetServiceWorker = vi.mocked(getEgenServiceWorker);

afterEach(() => {
  vi.restoreAllMocks();
  mockGetServiceWorker.mockReset();
});

describe('messageEgenServiceWorker (E2 : messages SW sans SW)', () => {
  it('sans service worker : no-op silencieux, résultat en échec explicite, aucune exception ni journal', async () => {
    mockGetServiceWorker.mockResolvedValue(undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await messageEgenServiceWorker({ type: 'clearDynamicRoutes' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No service worker');
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('sans service worker : ne tente jamais d’en enregistrer un (aucun accès à navigator.serviceWorker)', async () => {
    mockGetServiceWorker.mockResolvedValue(undefined);
    const register = vi.fn();
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true });

    await messageEgenServiceWorker({ type: 'registerDynamicRoute', url: 'https://x.test/session' });

    expect(register).not.toHaveBeenCalled();
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  });

  it('avec service worker : transmet le message et retourne son résultat (Web inchangé)', async () => {
    const messageSW = vi.fn().mockResolvedValue({ success: true, result: 'ok' });
    mockGetServiceWorker.mockResolvedValue({ messageSW } as never);

    const result = await messageEgenServiceWorker({ type: 'clearDynamicRoutes' });

    expect(messageSW).toHaveBeenCalledWith({ type: 'clearDynamicRoutes' });
    expect(result).toEqual({ success: true, result: 'ok' });
  });
});
