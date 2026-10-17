import { describe, expect, it } from 'vitest';
import { ChannelUrlRejectedError, assertChannelUrlAllowed, resolveChannelUrl } from './index.js';

const reject = (url: string, policy = {}) => {
  try {
    assertChannelUrlAllowed(url, policy);
  } catch (err) {
    expect(err).toBeInstanceOf(ChannelUrlRejectedError);
    return (err as Error).message;
  }
  throw new Error(`« ${url} » aurait dû être refusée`);
};

describe('assertChannelUrlAllowed', () => {
  it('accepte wss:// et ws:// vers la machine locale', () => {
    expect(assertChannelUrlAllowed('wss://api.egen.ga/api/ai/ws')).toBe('wss://api.egen.ga/api/ai/ws');
    for (const url of ['ws://localhost:8080/ws', 'ws://127.0.0.1/ws', 'ws://[::1]:3000/ws']) {
      expect(assertChannelUrlAllowed(url)).toBe(url);
    }
  });

  it('refuse ws:// vers un hôte distant, sauf dérogation explicite', () => {
    expect(reject('ws://api.egen.ga/ws')).toContain('EGEN_AI_ALLOW_INSECURE_CHANNEL');
    expect(assertChannelUrlAllowed('ws://10.0.0.5/ws', { allowInsecure: true })).toBe('ws://10.0.0.5/ws');
  });

  it('refuse les schémas autres que ws(s) et les URL illisibles', () => {
    reject('https://api.egen.ga/ws');
    reject('javascript:alert(1)');
    reject('pas une url');
  });

  it("épingle les hôtes : exact, avec port, joker de sous-domaine (jamais l'apex ni un suffixe trompeur)", () => {
    const policy = { allowedHosts: ['api.egen.ga', 'ai.egen.ga:8443', '*.civitas.ga'] };
    expect(assertChannelUrlAllowed('wss://api.egen.ga/ws', policy)).toBeTruthy();
    expect(assertChannelUrlAllowed('wss://ai.egen.ga:8443/ws', policy)).toBeTruthy();
    expect(assertChannelUrlAllowed('wss://x.civitas.ga/ws', policy)).toBeTruthy();
    expect(assertChannelUrlAllowed('wss://A.B.CIVITAS.ga/ws', policy)).toBeTruthy();
    reject('wss://civitas.ga/ws', policy); //            apex non couvert par *.civitas.ga
    reject('wss://evilcivitas.ga/ws', policy); //        suffixe trompeur
    reject('wss://api.egen.ga.evil.com/ws', policy);
    reject('wss://ai.egen.ga:9999/ws', policy); //       mauvais port
    reject('wss://evil.example/ws', policy);
  });

  it('sans épinglage configuré (liste vide ou entrées vides) tous les hôtes wss sont admis', () => {
    expect(assertChannelUrlAllowed('wss://nimporte.quoi/ws', { allowedHosts: [] })).toBeTruthy();
    expect(assertChannelUrlAllowed('wss://nimporte.quoi/ws', { allowedHosts: ['', '  '] })).toBeTruthy();
  });

  it("valide l'URL RÉSOLUE : le chemin relatif hérite du schéma de la page", () => {
    const resolved = resolveChannelUrl('/api/ai/ws', { location: { protocol: 'https:', host: 'egen.ga' } });
    expect(assertChannelUrlAllowed(resolved, { allowedHosts: ['egen.ga'] })).toBe('wss://egen.ga/api/ai/ws');
    const insecure = resolveChannelUrl('/api/ai/ws', { location: { protocol: 'http:', host: 'intranet.local' } });
    reject(insecure);
  });
});
