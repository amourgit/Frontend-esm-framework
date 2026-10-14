/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({
  state: { loaded: true, session: { user: { privileges: [{ display: 'Get Users' }] } } } as any,
}));
vi.mock('@egen-civitas/esm-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@egen-civitas/esm-api')>()),
  sessionStore: { getState: () => session.state, subscribe: () => () => {} },
}));

import { AI_EVENTS, subscribeToAIEvent } from '@egen-civitas/esm-ai-events';
import { overrideAIConfig, resetAIConfig } from '@egen-civitas/esm-ai-config';
import { _clearToolRegistry, decorateTool, executeTool, registerTool, type AIToolDefinition } from '.';

const tool = (over: Partial<AIToolDefinition> = {}): AIToolDefinition => ({
  id: 't',
  name: 'T',
  description: 'd',
  parameters: { n: { type: 'number', required: true, description: '' } },
  execute: async (ctx) => ({ success: true, data: ctx.args, durationMs: 0 }),
  ...over,
});

beforeEach(() => {
  session.state = { loaded: true, session: { user: { privileges: [{ display: 'Get Users' }] } } };
  _clearToolRegistry();
});
afterEach(() => {
  _clearToolRegistry();
  resetAIConfig();
});

describe('executeTool — pipeline complet', () => {
  it('tool inconnu → échec explicite', async () => {
    expect(await executeTool({ tool: 'nope', arguments: {} })).toMatchObject({ success: false, error: expect.stringContaining('inconnu') });
  });

  it('valide et coerce les arguments avant exécution', async () => {
    registerTool(tool());
    const ok = await executeTool({ tool: 't', arguments: { n: '42' } });
    expect(ok).toMatchObject({ success: true, data: { n: 42 } });
    const ko = await executeTool({ tool: 't', arguments: { n: 'abc' } });
    expect(ko).toMatchObject({ success: false, error: expect.stringContaining('Arguments invalides') });
  });

  it("des arguments absents (backend sans `arguments`) ne font pas planter l'exécuteur", async () => {
    registerTool(tool({ parameters: {} }));
    expect(await executeTool({ tool: 't', arguments: undefined as never })).toMatchObject({ success: true });
  });

  it('refuse sans les privilèges requis (et ne lance pas le tool)', async () => {
    const execute = vi.fn(async () => ({ success: true, durationMs: 0 }));
    registerTool(tool({ parameters: {}, requiredPrivileges: ['Admin'], execute }));
    const result = await executeTool({ tool: 't', arguments: {} });
    expect(result).toMatchObject({ success: false, error: expect.stringContaining('Permission refusée') });
    expect(execute).not.toHaveBeenCalled();
  });

  it('refuse tout tool à privilège quand la session est absente', async () => {
    session.state = { loaded: false, session: null };
    registerTool(tool({ parameters: {}, requiredPrivileges: ['Get Users'] }));
    expect((await executeTool({ tool: 't', arguments: {} })).success).toBe(false);
  });

  it('applique les décorateurs dans l\'ordre d\'ajout (premier ajouté = premier exécuté)', async () => {
    registerTool(tool({ parameters: {} }));
    const order: string[] = [];
    decorateTool('t', async (next, ctx) => (order.push('A'), next(ctx)));
    decorateTool('t', async (next, ctx) => (order.push('B'), next(ctx)));
    await executeTool({ tool: 't', arguments: {} });
    expect(order).toEqual(['A', 'B']);
  });

  it('un tool qui lève une exception → échec, pas de rejet', async () => {
    registerTool(tool({ parameters: {}, execute: async () => { throw new Error('boom'); } }));
    expect(await executeTool({ tool: 't', arguments: {} })).toMatchObject({ success: false, error: 'boom' });
  });

  it('un tool qui dépasse le timeout configuré → échec + événement TOOL_TIMEOUT', async () => {
    overrideAIConfig({ security: { toolTimeoutMs: 30 } });
    const timeouts: unknown[] = [];
    const off = subscribeToAIEvent(AI_EVENTS.TOOL_TIMEOUT, (p) => timeouts.push(p));
    registerTool(tool({ parameters: {}, execute: () => new Promise(() => undefined) }));
    expect(await executeTool({ tool: 't', arguments: {} })).toMatchObject({ success: false, error: expect.stringContaining('timeout') });
    expect(timeouts).toHaveLength(1);
    off();
  });

  it('masque les secrets (clé nommée password, apiKey, access_token…, y compris imbriqués) dans les événements', async () => {
    registerTool(tool({ parameters: {} }));
    const seen: any[] = [];
    const off = subscribeToAIEvent(AI_EVENTS.TOOL_EXECUTING, (p) => seen.push(p));
    await executeTool({
      tool: 't',
      arguments: { user: 'sam', newPassword: 'p1', apiKey: 'k', access_token: 't', nested: { Authorization: 'Bearer x', ok: 1 } },
    });
    off();
    expect(seen[0].args).toEqual({
      user: 'sam',
      newPassword: '[REDACTED]',
      apiKey: '[REDACTED]',
      access_token: '[REDACTED]',
      nested: { Authorization: '[REDACTED]', ok: 1 },
    });
  });
});
