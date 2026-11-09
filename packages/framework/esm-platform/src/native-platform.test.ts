import { afterEach, describe, expect, it } from 'vitest';
import { getHostInfo, getPlatform, registerPlatformCapabilities } from './index';
import { createMockHost } from './testing';

afterEach(() => {
  const w = window as unknown as Record<string, unknown>;
  delete w.egenTarget;
  delete w.egenHostBridge;
});

describe('getPlatform() natif — handshake avec le Host', () => {
  it('ready attend le handshake ; getHostInfo() expose ce que le Host a annoncé', async () => {
    window.egenTarget = 'android';
    const host = createMockHost({ host: '4.2.0', capabilities: { secureStorage: { v: 1 } } });
    host.install();

    expect(getHostInfo()).toBeNull(); // pas encore de handshake
    await getPlatform().ready;

    expect(getHostInfo()).toEqual({
      protocol: 1,
      host: '4.2.0',
      platform: 'android',
      capabilities: { secureStorage: { v: 1 } },
    });
  });

  it('plusieurs getPlatform() partagent UN SEUL handshake et UN SEUL abonnement', async () => {
    window.egenTarget = 'android';
    const host = createMockHost();
    host.install();

    await Promise.all([getPlatform().ready, getPlatform().ready, getPlatform().ready]);
    await getPlatform().ready;

    expect(host.sent.filter((r) => r.m === 'hello')).toHaveLength(1);
    expect(host.subscribeCount).toBe(1);
  });

  it('Host de version de protocole incompatible ⇒ ready rejette INCOMPATIBLE', async () => {
    window.egenTarget = 'ios';
    createMockHost({ platform: 'ios', protocol: 2 }).install();
    await expect(getPlatform().ready).rejects.toMatchObject({ code: 'INCOMPATIBLE' });
    expect(getHostInfo()).toBeNull();
  });

  it('Host qui annonce une autre plateforme que la cible du build ⇒ INCOMPATIBLE', async () => {
    window.egenTarget = 'ios';
    createMockHost({ platform: 'android' }).install();
    await expect(getPlatform().ready).rejects.toMatchObject({ code: 'INCOMPATIBLE' });
  });

  it("tant que les adaptateurs natifs (C7) n'existent pas, aucune capacité n'est disponible — même annoncée par le Host", async () => {
    window.egenTarget = 'android';
    createMockHost({ capabilities: { secureStorage: { v: 1 }, session: { v: 1 } } }).install();
    const platform = getPlatform();
    await platform.ready;

    expect(platform.has('secureStorage')).toBe(false);
    await expect(platform.secureStorage.get('k')).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });

  it('registerPlatformCapabilities() attend le handshake natif', async () => {
    window.egenTarget = 'android';
    const host = createMockHost();
    host.install();
    await expect(registerPlatformCapabilities()).resolves.toBeUndefined();
    expect(host.sent.some((r) => r.m === 'hello')).toBe(true);
  });
});
