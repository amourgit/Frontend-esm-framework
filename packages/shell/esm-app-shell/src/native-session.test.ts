import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthorizationProvider } from '@egen-civitas/esm-api';
import { getPlatform } from '@egen-civitas/esm-platform';
import { createMockHost, type MockHostOptions } from '@egen-civitas/esm-platform/testing';
import { bindPlatformSession } from './native-session';

afterEach(() => {
  const w = window as unknown as Record<string, unknown>;
  delete w.egenTarget;
  delete w.egenHostBridge;
});

function bind(target: 'web' | 'android', hostOptions: MockHostOptions = {}) {
  if (target !== 'web') {
    window.egenTarget = target;
    createMockHost({ capabilities: { session: { v: 1 } }, ...hostOptions }).install();
  }
  let provider: AuthorizationProvider | null = null;
  const setProvider = vi.fn((p: AuthorizationProvider | null) => {
    provider = p;
  });
  const bound = bindPlatformSession(getPlatform(), setProvider);
  return { bound, setProvider, provider: () => provider! };
}

describe('bindPlatformSession (D4)', () => {
  it('Web : ne pose RIEN (le cookie reste le mécanisme)', () => {
    const { bound, setProvider } = bind('web');
    expect(bound).toBe(false);
    expect(setProvider).not.toHaveBeenCalled();
  });

  it("natif : pose le fournisseur de façon synchrone, sans attendre le handshake, avec credentials 'omit'", () => {
    const { bound, provider } = bind('android', { latencyMs: 50 });
    expect(bound).toBe(true);
    expect(provider().credentials).toBe('omit');
  });

  it("getAuthorization attend le handshake puis retourne l'en-tête du Host", async () => {
    const { provider } = bind('android', {
      latencyMs: 20,
      handlers: { 'session.getAuthorization': () => 'Bearer jeton-1' },
    });
    await expect(provider().getAuthorization()).resolves.toBe('Bearer jeton-1');
  });

  it('le premier appel de session ne part PAS avant la fin du handshake', async () => {
    const host = createMockHost({
      capabilities: { session: { v: 1 } },
      latencyMs: 30,
      handlers: { 'session.getAuthorization': () => 'Bearer t' },
    });
    window.egenTarget = 'android';
    host.install();
    let provider!: AuthorizationProvider;
    bindPlatformSession(getPlatform(), (p) => (provider = p!));

    const pending = provider.getAuthorization();
    expect(host.sent.some((r) => r.ns === 'session')).toBe(false); // handshake pas encore terminé
    await pending;
    expect(host.sent.map((r) => `${String(r.ns)}.${String(r.m)}`)).toEqual(['host.hello', 'session.getAuthorization']);
  });

  it("Host sans la capacité session : aucun en-tête, aucun rafraîchissement (rien n'est simulé)", async () => {
    const { provider } = bind('android', { capabilities: {} });
    await expect(provider().getAuthorization()).resolves.toBeNull();
    await expect(provider().refresh!()).resolves.toBe(false);
  });

  it('refresh : délègue au Host', async () => {
    const { provider } = bind('android', { handlers: { 'session.refresh': () => true } });
    await expect(provider().refresh!()).resolves.toBe(true);
  });

  it("handshake en échec : getAuthorization rejette avec l'erreur d'origine, aucune requête de session envoyée", async () => {
    window.egenTarget = 'android';
    const host = createMockHost({ platform: 'ios', capabilities: { session: { v: 1 } } }); // plateforme ≠ cible
    host.install();
    let provider!: AuthorizationProvider;
    bindPlatformSession(getPlatform(), (p) => (provider = p!));

    await expect(provider.getAuthorization()).rejects.toMatchObject({ code: 'INCOMPATIBLE' });
    expect(host.sent.some((r) => r.ns === 'session')).toBe(false);
  });

  it('Host absent : getAuthorization rejette INCOMPATIBLE', async () => {
    window.egenTarget = 'android'; // pas de pont injecté
    let provider!: AuthorizationProvider;
    bindPlatformSession(getPlatform(), (p) => (provider = p!));
    await expect(provider.getAuthorization()).rejects.toMatchObject({ code: 'INCOMPATIBLE' });
  });
});
