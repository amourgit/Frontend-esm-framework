/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { overrideAIConfig, resetAIConfig } from '@egen-civitas/esm-ai-config';
import { _clearToolRegistry, registerTool, hasTool, getTool, overrideTool } from '@egen-civitas/esm-ai-tools';
import { _clearProviderRegistry } from '@egen-civitas/esm-ai-context';
import { initAIFramework, cleanupAIFramework, isAIFrameworkInitialized } from './orchestrator';

// Les native tools (esm-ai-tools) importent de vrais composants esm-styleguide
// (showNotification/showSnackbar/showModal), qui embarquent du .scss réel — non
// transformable ici puisque le paquet est chargé comme dépendance externe. On
// mock au même niveau que esm-ai-tools/src/native/native.test.ts pour continuer
// à exercer le vrai enregistrement des tools sans charger les vrais composants.
vi.mock('@egen-civitas/esm-styleguide', () => ({
  showNotification: vi.fn(),
  showSnackbar: vi.fn(),
  showModal: vi.fn(),
}));

function setup() {
  _clearToolRegistry();
  _clearProviderRegistry();
  resetAIConfig();
}

describe('initAIFramework', () => {
  beforeEach(setup);
  afterEach(() => {
    cleanupAIFramework();
    setup();
  });

  it('retourne false pour isAIFrameworkInitialized avant initialisation', () => {
    expect(isAIFrameworkInitialized()).toBe(false);
  });

  it('marque le framework comme initialisé après appel', () => {
    overrideAIConfig({ enabled: true }, 'runtime');
    initAIFramework();
    expect(isAIFrameworkInitialized()).toBe(true);
  });

  it('est idempotent — le second appel est ignoré', () => {
    overrideAIConfig({ enabled: true }, 'runtime');
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    initAIFramework();
    initAIFramework(); // second appel
    expect(isAIFrameworkInitialized()).toBe(true);
    spy.mockRestore();
  });

  it('force=true réinitialise le framework', () => {
    overrideAIConfig({ enabled: true }, 'runtime');
    initAIFramework();
    initAIFramework({ force: true });
    expect(isAIFrameworkInitialized()).toBe(true);
  });

  it("n'enregistre pas les tools natifs quand AI est désactivé", () => {
    // enabled = false par défaut
    initAIFramework();
    expect(hasTool('navigate')).toBe(false);
  });

  it('enregistre les tools natifs quand AI est activé', () => {
    overrideAIConfig({ enabled: true }, 'runtime');
    initAIFramework();
    expect(hasTool('navigate')).toBe(true);
    expect(hasTool('show_notification')).toBe(true);
    expect(hasTool('fetch_data')).toBe(true);
  });

  it("n'enregistre pas deux fois les mêmes tools si appelé avec force=true", () => {
    overrideAIConfig({ enabled: true }, 'runtime');
    initAIFramework();
    // Enregistrer un tool custom avec l'id d'un natif pour vérifier qu'il n'est pas écrasé
    const customTool = {
      id: 'search',
      name: 'Custom Search',
      description: 'Custom',
      parameters: {},
      execute: async () => ({ success: true, durationMs: 0 }),
    };
    overrideTool(customTool);
    initAIFramework({ force: true });
    // Le tool custom doit être conservé car registerTool n'écrase pas
    expect(getTool('search')?.definition.name).toBe('Custom Search');
  });

  it("cleanupAIFramework réinitialise l'état", () => {
    overrideAIConfig({ enabled: true }, 'runtime');
    initAIFramework();
    cleanupAIFramework();
    expect(isAIFrameworkInitialized()).toBe(false);
  });
});
