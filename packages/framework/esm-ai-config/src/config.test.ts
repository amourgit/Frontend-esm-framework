/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildDefaultConfig } from './defaults';
import { validateAIConfig, mergeConfig } from './validation';
import { aiConfigStore, overrideAIConfig, resetAIConfig, getAIConfig } from './store';
import type { AIConfig } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeValidConfig(): AIConfig {
  return buildDefaultConfig();
}

// ─── Tests buildDefaultConfig ─────────────────────────────────────────────────

describe('buildDefaultConfig', () => {
  it('retourne une configuration complète avec toutes les clés requises', () => {
    const config = buildDefaultConfig();

    expect(config).toHaveProperty('enabled');
    expect(config).toHaveProperty('backend');
    expect(config).toHaveProperty('context');
    expect(config).toHaveProperty('security');
    expect(config).toHaveProperty('observability');
  });

  it('le heartbeat du canal est défini par défaut', () => {
    const config = buildDefaultConfig();
    expect(config.backend.heartbeatMs).toBe(20000);
  });

  it('le système IA est désactivé par défaut (sécurité)', () => {
    const config = buildDefaultConfig();
    expect(config.enabled).toBe(false);
  });

  it('lit EGEN_AI_ENABLED depuis process.env', () => {
    const original = process.env.EGEN_AI_ENABLED;
    process.env.EGEN_AI_ENABLED = 'true';
    const config = buildDefaultConfig();
    expect(config.enabled).toBe(true);
    if (original === undefined) delete process.env.EGEN_AI_ENABLED;
    else process.env.EGEN_AI_ENABLED = original;
  });

  it('lit EGEN_AI_CHANNEL_URL depuis process.env', () => {
    const original = process.env.EGEN_AI_CHANNEL_URL;
    process.env.EGEN_AI_CHANNEL_URL = 'ws://localhost:9999/api/ai/ws';
    const config = buildDefaultConfig();
    expect(config.backend.channelUrl).toBe('ws://localhost:9999/api/ai/ws');
    if (original === undefined) delete process.env.EGEN_AI_CHANNEL_URL;
    else process.env.EGEN_AI_CHANNEL_URL = original;
  });

  it("retourne la valeur par défaut si la variable d'env numérique est invalide", () => {
    const original = process.env.EGEN_AI_REQUEST_TIMEOUT;
    process.env.EGEN_AI_REQUEST_TIMEOUT = 'not-a-number';
    const config = buildDefaultConfig();
    expect(config.backend.requestTimeoutMs).toBe(30000);
    if (original === undefined) delete process.env.EGEN_AI_REQUEST_TIMEOUT;
    else process.env.EGEN_AI_REQUEST_TIMEOUT = original;
  });
});

// ─── Tests validateAIConfig ───────────────────────────────────────────────────

describe('validateAIConfig', () => {
  it('valide une configuration correcte sans erreur', () => {
    const config = makeValidConfig();
    // Force enabled pour une config valide testable
    config.enabled = true;
    const result = validateAIConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejette un backend.channelUrl vide', () => {
    const config = makeValidConfig();
    config.backend.channelUrl = '';
    const result = validateAIConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('channelUrl'))).toBe(true);
  });

  it('rejette une profondeur de sérialisation invalide', () => {
    const config = makeValidConfig();
    config.context.serializationDepth = 0;
    const result = validateAIConfig(config);
    expect(result.valid).toBe(false);
  });

  it('génère un avertissement pour requestTimeoutMs très bas', () => {
    const config = makeValidConfig();
    config.backend.requestTimeoutMs = 500;
    const result = validateAIConfig(config);
    expect(result.warnings.some((w) => w.includes('requestTimeoutMs'))).toBe(true);
  });

  it('rejette un logLevel invalide', () => {
    const config = makeValidConfig();
    (config.observability as any).logLevel = 'verbose';
    const result = validateAIConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('logLevel'))).toBe(true);
  });

});

// ─── Tests mergeConfig ────────────────────────────────────────────────────────

describe('mergeConfig', () => {
  it('fusionne un override partiel sans écraser les autres valeurs', () => {
    const base = makeValidConfig();
    const result = mergeConfig(base, { backend: { channelUrl: 'ws://x/api/ai/ws' } });
    expect(result.backend.channelUrl).toBe('ws://x/api/ai/ws');
    // Les autres propriétés sont conservées
    expect(result.backend.heartbeatMs).toBe(base.backend.heartbeatMs);
    expect(result.enabled).toBe(base.enabled);
  });

  it('fusionne des overrides imbriqués profonds', () => {
    const base = makeValidConfig();
    const result = mergeConfig(base, {
      backend: { heartbeatMs: 5000 },
      security: { auditLog: true },
    });
    expect(result.backend.heartbeatMs).toBe(5000);
    expect(result.backend.channelUrl).toBe(base.backend.channelUrl);
    expect(result.security.auditLog).toBe(true);
    expect(result.security.toolTimeoutMs).toBe(base.security.toolTimeoutMs);
  });

  it("ignore les valeurs undefined dans l'override", () => {
    const base = makeValidConfig();
    const original = base.backend.channelUrl;
    const result = mergeConfig(base, { backend: { channelUrl: undefined } });
    expect(result.backend.channelUrl).toBe(original);
  });

  it("ne mute pas l'objet de base", () => {
    const base = makeValidConfig();
    const originalUrl = base.backend.channelUrl;
    mergeConfig(base, { backend: { channelUrl: 'ws://new' } });
    expect(base.backend.channelUrl).toBe(originalUrl);
  });
});

// ─── Tests Store ──────────────────────────────────────────────────────────────

describe('aiConfigStore', () => {
  afterEach(() => {
    resetAIConfig();
  });

  it('est initialisé avec la configuration par défaut', () => {
    const state = aiConfigStore.getState();
    expect(state.loaded).toBe(true);
    expect(state.config).toBeDefined();
    expect(state.source).toBe('default');
  });

  it('overrideAIConfig applique un override valide', () => {
    const success = overrideAIConfig({ backend: { channelUrl: 'ws://x/api/ai/ws' } });
    expect(success).toBe(true);
    expect(getAIConfig().backend.channelUrl).toBe('ws://x/api/ai/ws');
  });

  it('overrideAIConfig rejette un override invalide', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const success = overrideAIConfig({ context: { serializationDepth: 99 } });
    expect(success).toBe(false);
    // La config n'est pas modifiée
    const config = getAIConfig();
    expect(config.context.serializationDepth).not.toBe(99);
    consoleSpy.mockRestore();
  });

  it('overrideAIConfig marque la source correctement', () => {
    overrideAIConfig({ enabled: true }, 'runtime');
    expect(aiConfigStore.getState().source).toBe('runtime');
  });

  it('resetAIConfig remet la configuration par défaut', () => {
    overrideAIConfig({ backend: { channelUrl: 'ws://custom/api/ai/ws' } });
    resetAIConfig();
    const config = getAIConfig();
    expect(config.backend.channelUrl).toBe(buildDefaultConfig().backend.channelUrl);
    expect(aiConfigStore.getState().source).toBe('default');
  });

  it("les subscribers sont notifiés lors d'un override", () => {
    const handler = vi.fn();
    const unsubscribe = aiConfigStore.subscribe(handler);

    overrideAIConfig({ enabled: true });
    expect(handler).toHaveBeenCalled();

    unsubscribe();
  });

  it('les subscribers ne sont plus notifiés après unsubscribe', () => {
    const handler = vi.fn();
    const unsubscribe = aiConfigStore.subscribe(handler);
    unsubscribe();
    handler.mockClear();

    overrideAIConfig({ enabled: true });
    expect(handler).not.toHaveBeenCalled();
  });
});
