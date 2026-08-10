/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerTool,
  overrideTool,
  decorateTool,
  removeTool,
  getTool,
  getAllTools,
  hasTool,
  getToolsSchemaForLLM,
  _clearToolRegistry,
  validateToolArgs,
  checkToolPermissions,
  type AIToolDefinition,
  type AIToolResult,
  type AIToolExecutionContext,
} from '.';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTool(overrides: Partial<AIToolDefinition> = {}): AIToolDefinition {
  return {
    id: `tool-${Math.random().toString(36).slice(2)}`,
    name: 'Test Tool',
    description: 'A test tool',
    parameters: {},
    moduleName: '@test/app',
    execute: async () => ({ success: true, durationMs: 0 }),
    ...overrides,
  };
}

// ─── Tests Validation ─────────────────────────────────────────────────────────

describe('validateToolArgs', () => {
  it('valide des arguments corrects', () => {
    const result = validateToolArgs(
      { name: 'Alice', age: 25 },
      {
        name: { type: 'string', required: true, description: '' },
        age: { type: 'number', required: true, description: '' },
      },
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('retourne une erreur pour un paramètre requis manquant', () => {
    const result = validateToolArgs(
      {},
      { name: { type: 'string', required: true, description: '' } },
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('name');
  });

  it('utilise la valeur par défaut si le paramètre est absent', () => {
    const result = validateToolArgs(
      {},
      { kind: { type: 'string', required: false, default: 'info', description: '' } },
    );
    expect(result.valid).toBe(true);
    expect(result.coercedArgs?.kind).toBe('info');
  });

  it('coerce une string en nombre', () => {
    const result = validateToolArgs(
      { count: '42' },
      { count: { type: 'number', required: true, description: '' } },
    );
    expect(result.valid).toBe(true);
    expect(result.coercedArgs?.count).toBe(42);
  });

  it('coerce "true" string en boolean', () => {
    const result = validateToolArgs(
      { enabled: 'true' },
      { enabled: { type: 'boolean', required: true, description: '' } },
    );
    expect(result.valid).toBe(true);
    expect(result.coercedArgs?.enabled).toBe(true);
  });

  it('rejette un type invalide non coercible', () => {
    const result = validateToolArgs(
      { count: 'not-a-number' },
      { count: { type: 'number', required: true, description: '' } },
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('count');
  });

  it('valide les valeurs enum', () => {
    const result = validateToolArgs(
      { kind: 'invalid' },
      { kind: { type: 'string', required: true, description: '', enum: ['info', 'error'] } },
    );
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('kind');
  });

  it('accepte les paramètres inconnus sans erreur', () => {
    const result = validateToolArgs(
      { known: 'val', unknown: 'extra' },
      { known: { type: 'string', required: true, description: '' } },
    );
    expect(result.valid).toBe(true);
    expect(result.coercedArgs?.unknown).toBe('extra');
  });
});

describe('checkToolPermissions', () => {
  it('autorise si aucun privilège requis', () => {
    const result = checkToolPermissions([], ['Get Users']);
    expect(result.allowed).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('autorise si l\'utilisateur a tous les privilèges', () => {
    const result = checkToolPermissions(['Get Users', 'Edit Users'], ['Get Users', 'Edit Users', 'Admin']);
    expect(result.allowed).toBe(true);
  });

  it('refuse si un privilège est manquant', () => {
    const result = checkToolPermissions(['Get Users', 'Delete Users'], ['Get Users']);
    expect(result.allowed).toBe(false);
    expect(result.missing).toContain('Delete Users');
  });
});

// ─── Tests Registry ───────────────────────────────────────────────────────────

describe('Tool Registry', () => {
  beforeEach(() => _clearToolRegistry());
  afterEach(() => _clearToolRegistry());

  describe('registerTool', () => {
    it('enregistre un tool avec succès', () => {
      const tool = makeTool({ id: 'my-tool' });
      registerTool(tool);
      expect(hasTool('my-tool')).toBe(true);
    });

    it('throw si un tool avec le même id existe déjà', () => {
      const tool = makeTool({ id: 'duplicate' });
      registerTool(tool);
      expect(() => registerTool(tool)).toThrow('duplicate');
    });

    it('inclut le tool dans getAllTools()', () => {
      const tool = makeTool({ id: 't1', name: 'Tool 1' });
      registerTool(tool);
      expect(getAllTools().find((t) => t.id === 't1')).toBeDefined();
    });
  });

  describe('overrideTool', () => {
    it('remplace la définition d\'un tool existant', () => {
      const v1 = makeTool({ id: 'nav', name: 'Navigate V1' });
      const v2 = makeTool({ id: 'nav', name: 'Navigate V2' });
      registerTool(v1);
      overrideTool(v2);
      expect(getTool('nav')?.definition.name).toBe('Navigate V2');
    });

    it('crée le tool s\'il n\'existe pas', () => {
      const tool = makeTool({ id: 'new-tool' });
      overrideTool(tool);
      expect(hasTool('new-tool')).toBe(true);
    });

    it('conserve les décorateurs existants lors d\'un override', () => {
      const tool = makeTool({ id: 'dec-tool' });
      registerTool(tool);
      const decorator = vi.fn(async (exec, ctx) => exec(ctx));
      decorateTool('dec-tool', decorator);
      overrideTool({ ...tool, name: 'Overridden' });
      expect(getTool('dec-tool')?.decorators).toHaveLength(1);
    });
  });

  describe('decorateTool', () => {
    it('ajoute un décorateur au tool', () => {
      const tool = makeTool({ id: 'd1' });
      registerTool(tool);
      const dec = vi.fn(async (exec, ctx) => exec(ctx));
      decorateTool('d1', dec);
      expect(getTool('d1')?.decorators).toHaveLength(1);
    });

    it('la fonction de retrait supprime le décorateur', () => {
      const tool = makeTool({ id: 'd2' });
      registerTool(tool);
      const dec = vi.fn(async (exec, ctx) => exec(ctx));
      const removeDecorator = decorateTool('d2', dec);
      removeDecorator();
      expect(getTool('d2')?.decorators).toHaveLength(0);
    });

    it('throw si le tool n\'existe pas', () => {
      expect(() => decorateTool('nonexistent', async (e, c) => e(c))).toThrow('nonexistent');
    });
  });

  describe('removeTool', () => {
    it('retire un tool du registre', () => {
      const tool = makeTool({ id: 'rem' });
      registerTool(tool);
      removeTool('rem');
      expect(hasTool('rem')).toBe(false);
    });

    it('ne throw pas si le tool n\'existe pas', () => {
      expect(() => removeTool('ghost')).not.toThrow();
    });
  });

  describe('getToolsSchemaForLLM', () => {
    it('retourne tous les tools si aucun privilège requis', () => {
      registerTool(makeTool({ id: 'open', name: 'Open' }));
      registerTool(makeTool({ id: 'restricted', name: 'Restricted', requiredPrivileges: ['Admin'] }));
      const schema = getToolsSchemaForLLM([]);
      expect(schema.find((t: any) => t.name === 'open')).toBeDefined();
      expect(schema.find((t: any) => t.name === 'restricted')).toBeUndefined();
    });

    it('inclut les tools restreints si l\'utilisateur a les privilèges', () => {
      registerTool(makeTool({ id: 'admin-tool', requiredPrivileges: ['Admin'] }));
      const schema = getToolsSchemaForLLM(['Admin']);
      expect(schema.find((t: any) => t.name === 'admin-tool')).toBeDefined();
    });

    it('exclut les tools restreints si l\'utilisateur n\'a pas les privilèges', () => {
      registerTool(makeTool({ id: 'secret-tool', requiredPrivileges: ['SuperAdmin'] }));
      const schema = getToolsSchemaForLLM(['User']);
      expect(schema.find((t: any) => t.name === 'secret-tool')).toBeUndefined();
    });

    it("n'expose jamais le champ interne `required` (booléen) au niveau d'une propriété — invalide pour tout LLM (OpenAI, Gemini, ...), seul un tableau `required` au niveau racine du schéma l'est", () => {
      registerTool(
        makeTool({
          id: 'navigate-like',
          parameters: {
            route: { type: 'string', required: true, description: 'Route cible' },
            newTab: { type: 'boolean', required: false, default: false, description: 'Ouvrir un nouvel onglet' },
          },
        }),
      );

      const schema: any = getToolsSchemaForLLM([]).find((t: any) => t.name === 'navigate-like');

      expect(schema.parameters.required).toEqual(['route']);
      expect(schema.parameters.properties.route).not.toHaveProperty('required');
      expect(schema.parameters.properties.newTab).not.toHaveProperty('required');
      expect(schema.parameters.properties.route).toMatchObject({ type: 'string', description: 'Route cible' });
    });
  });
});
