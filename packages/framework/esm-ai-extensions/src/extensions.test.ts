import { afterEach, describe, expect, it } from 'vitest';
import {
  getAllCapabilities,
  getAllRoutes,
  getAllTools,
  getTool,
  _clearToolRegistry,
  type AIToolDefinition,
} from '@egen-civitas/esm-ai-tools';
import { defineAIModule } from '.';

const tool = (id: string, description = 'd'): AIToolDefinition => ({
  id,
  name: id,
  description,
  parameters: {},
  execute: async () => ({ success: true, durationMs: 0 }),
});

afterEach(() => _clearToolRegistry());

describe('defineAIModule', () => {
  it('enregistre tools, capacités et routes en rattachant le nom du module', () => {
    const cleanup = defineAIModule({
      moduleName: '@school/esm-grades-app',
      tools: [tool('list_grades')],
      capabilities: [{ id: 'grades', name: 'Notes', description: 'Consulter les notes' }],
      routes: [{ path: '/grades', description: 'Notes', label: 'Notes' } as never],
    });
    expect(getTool('list_grades')?.definition.moduleName).toBe('@school/esm-grades-app');
    expect(getAllCapabilities().map((c) => c.id)).toEqual(['grades']);
    expect(getAllRoutes().map((r) => r.path)).toEqual(['/grades']);
    cleanup();
    expect(getAllTools()).toHaveLength(0);
    expect(getAllCapabilities()).toHaveLength(0);
    expect(getAllRoutes()).toHaveLength(0);
  });

  it("le nettoyage restaure le tool remplacé par un override (pas de fuite)", () => {
    const base = defineAIModule({ moduleName: 'base', tools: [tool('navigate', 'original')] });
    const cleanup = defineAIModule({ moduleName: 'custom', toolOverrides: [tool('navigate', 'remplacé')] });
    expect(getTool('navigate')?.definition.description).toBe('remplacé');
    cleanup();
    expect(getTool('navigate')?.definition.description).toBe('original');
    base();
    expect(getTool('navigate')).toBeUndefined();
  });

  it("le nettoyage d'un override sans tool d'origine retire le tool", () => {
    const cleanup = defineAIModule({ moduleName: 'custom', toolOverrides: [tool('ghost')] });
    expect(getTool('ghost')).toBeDefined();
    cleanup();
    expect(getTool('ghost')).toBeUndefined();
  });

  it('le nettoyage est idempotent', () => {
    const cleanup = defineAIModule({ moduleName: 'm', tools: [tool('a')] });
    cleanup();
    expect(() => cleanup()).not.toThrow();
  });
});
