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
    expect(config).toHaveProperty('provider');
    expect(config).toHaveProperty('backend');
    expect(config).toHaveProperty('context');
    expect(config).toHaveProperty('memory');
    expect(config).toHaveProperty('security');
    expect(config).toHaveProperty('observability');
  });

  it('le provider par défaut est "gemini"', () => {
    const config = buildDefaultConfig();
    expect(config.provider.provider).toBe('gemini');
  });

  it('le stream est activé par défaut', () => {
    const config = buildDefaultConfig();
    expect(config.provider.stream).toBe(true);
  });

  it('le système IA est désactivé par défaut (sécurité)', () => {
    const config = buildDefaultConfig();
    expect(config.enabled).toBe(false);
  });

  it('la mémoire est activée par défaut', () => {
    const config = buildDefaultConfig();
    expect(config.memory.enabled).toBe(true);
  });

  it('lit EGEN_AI_ENABLED depuis process.env', () => {
    const original = process.env.EGEN_AI_ENABLED;
    process.env.EGEN_AI_ENABLED = 'true';
    const config = buildDefaultConfig();
    expect(config.enabled).toBe(true);
    if (original === undefined) delete process.env.EGEN_AI_ENABLED;
    else process.env.EGEN_AI_ENABLED = original;
  });

  it('lit EGEN_AI_TEMPERATURE depuis process.env', () => {
    const original = process.env.EGEN_AI_TEMPERATURE;
    process.env.EGEN_AI_TEMPERATURE = '0.3';
    const config = buildDefaultConfig();
    expect(config.provider.temperature).toBe(0.3);
    if (original === undefined) delete process.env.EGEN_AI_TEMPERATURE;
    else process.env.EGEN_AI_TEMPERATURE = original;
  });

  it("retourne la valeur par défaut si la variable d'env est invalide", () => {
    const original = process.env.EGEN_AI_MAX_TOKENS;
    process.env.EGEN_AI_MAX_TOKENS = 'not-a-number';
    const config = buildDefaultConfig();
    expect(config.provider.maxTokens).toBe(8192);
    if (original === undefined) delete process.env.EGEN_AI_MAX_TOKENS;
    else process.env.EGEN_AI_MAX_TOKENS = original;
  });
});

// ─── Tests validateAIConfig ───────────────────────────────────────────────────

describe('validateAIConfig', () => {
  it('valide une configuration correcte sans erreur', () => {
    const config = makeValidConfig();
    // Force enabled pour une config valide testable
    config.enabled = true;
    config.provider.provider = 'gemini';
    config.provider.temperature = 0.7;
    const result = validateAIConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejette un provider inconnu', () => {
    const config = makeValidConfig();
    (config.provider as any).provider = 'unknown-llm';
    const result = validateAIConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('provider.provider'))).toBe(true);
  });

  it('rejette une température hors limites (> 2)', () => {
    const config = makeValidConfig();
    config.provider.temperature = 2.5;
    const result = validateAIConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('temperature'))).toBe(true);
  });

  it('rejette une température hors limites (< 0)', () => {
    const config = makeValidConfig();
    config.provider.temperature = -0.1;
    const result = validateAIConfig(config);
    expect(result.valid).toBe(false);
  });

  it('rejette topP hors limites', () => {
    const config = makeValidConfig();
    config.provider.topP = 1.5;
    const result = validateAIConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('topP'))).toBe(true);
  });

  it('rejette maxTokens invalide (< 1)', () => {
    const config = makeValidConfig();
    config.provider.maxTokens = 0;
    const result = validateAIConfig(config);
    expect(result.valid).toBe(false);
  });

  it('rejette un backend.baseUrl vide', () => {
    const config = makeValidConfig();
    config.backend.baseUrl = '';
    const result = validateAIConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('baseUrl'))).toBe(true);
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

  it('rejette maxMessages < 1 quand memory.enabled=true', () => {
    const config = makeValidConfig();
    config.memory.enabled = true;
    config.memory.maxMessages = 0;
    const result = validateAIConfig(config);
    expect(result.valid).toBe(false);
  });
});

// ─── Tests mergeConfig ────────────────────────────────────────────────────────

describe('mergeConfig', () => {
  it('fusionne un override partiel sans écraser les autres valeurs', () => {
    const base = makeValidConfig();
    const result = mergeConfig(base, { provider: { model: 'claude-3-5-sonnet' } });
    expect(result.provider.model).toBe('claude-3-5-sonnet');
    // Les autres propriétés sont conservées
    expect(result.provider.temperature).toBe(base.provider.temperature);
    expect(result.enabled).toBe(base.enabled);
  });

  it('fusionne des overrides imbriqués profonds', () => {
    const base = makeValidConfig();
    const result = mergeConfig(base, {
      memory: { enabled: false },
      security: { auditLog: true },
    });
    expect(result.memory.enabled).toBe(false);
    expect(result.memory.maxMessages).toBe(base.memory.maxMessages);
    expect(result.security.auditLog).toBe(true);
    expect(result.security.toolTimeoutMs).toBe(base.security.toolTimeoutMs);
  });

  it("ignore les valeurs undefined dans l'override", () => {
    const base = makeValidConfig();
    const original = base.provider.model;
    const result = mergeConfig(base, { provider: { model: undefined } });
    expect(result.provider.model).toBe(original);
  });

  it("ne mute pas l'objet de base", () => {
    const base = makeValidConfig();
    const originalModel = base.provider.model;
    mergeConfig(base, { provider: { model: 'new-model' } });
    expect(base.provider.model).toBe(originalModel);
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
    const success = overrideAIConfig({ provider: { model: 'gemini-2.0-flash' } });
    expect(success).toBe(true);
    expect(getAIConfig().provider.model).toBe('gemini-2.0-flash');
  });

  it('overrideAIConfig rejette un override invalide', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const success = overrideAIConfig({ provider: { temperature: 99 } });
    expect(success).toBe(false);
    // La config n'est pas modifiée
    const config = getAIConfig();
    expect(config.provider.temperature).not.toBe(99);
    consoleSpy.mockRestore();
  });

  it('overrideAIConfig marque la source correctement', () => {
    overrideAIConfig({ enabled: true }, 'runtime');
    expect(aiConfigStore.getState().source).toBe('runtime');
  });

  it('resetAIConfig remet la configuration par défaut', () => {
    overrideAIConfig({ provider: { model: 'some-custom-model' } });
    resetAIConfig();
    const config = getAIConfig();
    expect(config.provider.model).toBe(buildDefaultConfig().provider.model);
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
