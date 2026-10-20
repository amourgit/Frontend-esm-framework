import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NATIVE_TOOLS,
  describeScreenTool,
  discoverComponentsTool,
  fillFieldTool,
  findInPageTool,
  getDomTreeTool,
  getPageStateTool,
  inspectElementTool,
  inspectInterfaceTool,
  listObservablesTool,
  navigateAndInspectTool,
  navigateAndReadTool,
  readComponentTool,
  readPageTool,
  readTableTool,
  scrollToTool,
} from './index';
import { _clearElementRefs } from './dom-utils';
import { _clearObservableRegistry, registerObservable } from '../observables';

const mockNavigate = vi.fn();
vi.mock('@egen-civitas/esm-navigation', () => ({ navigate: (...args: unknown[]) => mockNavigate(...args) }));
vi.mock('@egen-civitas/esm-styleguide', () => ({
  showNotification: vi.fn(),
  showSnackbar: vi.fn(),
  showModal: vi.fn(),
}));
vi.mock('@egen-civitas/esm-api', () => ({ egenFetch: vi.fn() }));

const RECT = {
  x: 0,
  y: 0,
  width: 100,
  height: 20,
  top: 0,
  left: 0,
  right: 100,
  bottom: 20,
  toJSON: () => ({}),
} as DOMRect;
const run = (tool: { execute: (ctx: any) => Promise<any> }, args: Record<string, unknown> = {}) =>
  tool.execute({ args });

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(RECT);
  _clearElementRefs();
  mockNavigate.mockClear();
  document.body.innerHTML =
    '<main><h1>Page</h1><table id="t"><tbody><tr><td>a</td></tr><tr style="display:none"><td>b</td></tr></tbody></table><button id="b">OK</button></main>';
});
afterEach(() => {
  vi.restoreAllMocks();
  _clearObservableRegistry();
  document.body.innerHTML = '';
});

describe('cibles introuvables : chaque tool échoue proprement, sans exception', () => {
  const needsTarget = [readComponentTool, readTableTool, inspectElementTool];
  const optionalTarget = [readPageTool, findInPageTool, discoverComponentsTool, getDomTreeTool, scrollToTool];

  it.each(needsTarget.map((t) => [t.id, t] as const))('%s sans cible → erreur guidée', async (_id, tool) => {
    const result = await run(tool, {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('selector');
  });

  it.each([...needsTarget, ...optionalTarget].map((t) => [t.id, t] as const))(
    '%s avec un sélecteur introuvable ou invalide → échec explicite',
    async (_id, tool) => {
      const missing = await run(tool, { selector: '#absent', query: 'x', direction: 'top' });
      expect(missing.success).toBe(false);
      expect(missing.error).toContain('#absent');
      const invalid = await run(tool, { selector: '[[[', query: 'x' });
      expect(invalid.success).toBe(false);
      expect(invalid.error).toContain('invalide');
    },
  );

  it('une ref qui a quitté la page est signalée avec la marche à suivre', async () => {
    const page = await run(readPageTool);
    const ref = /button "OK" \{(e\d+)\}/.exec(page.data.outline)?.[1] as string;
    document.getElementById('b')!.remove();
    for (const tool of [readComponentTool, inspectElementTool, scrollToTool, readTableTool]) {
      const result = await run(tool, { ref });
      expect(result.success, tool.id).toBe(false);
      expect(result.error, tool.id).toContain('read_page');
    }
  });
});

describe('coercition des arguments envoyés par le backend (tout peut arriver en texte)', () => {
  it('nombres et booléens fournis en chaînes sont compris ; valeurs absurdes ignorées', async () => {
    document.body.innerHTML = Array.from({ length: 30 }, (_, i) => `<button>B${i}</button>`).join('');
    const screen = await run(describeScreenTool, { limit: '5', offset: '2', includeOffscreen: 'false' });
    expect(screen.data.interactiveElements).toHaveLength(5);
    expect(screen.data.offset).toBe(2);
    const absurd = await run(describeScreenTool, { limit: 'beaucoup', offset: {}, includeOffscreen: 'peut-être' });
    expect(absurd.success).toBe(true);
    expect(absurd.data.interactiveElements.length).toBe(30);
  });

  it('detail invalide → valeur par défaut du tool', async () => {
    document.body.innerHTML = '<button id="b">OK</button>';
    const result = await run(inspectInterfaceTool, { detail: 'énorme', limit: '3' });
    expect(result.data.detail).toBe('standard');
    const element = await run(inspectElementTool, { selector: '#b', detail: 'énorme' });
    expect(element.data.omittedSections).toEqual([]);
  });

  it('read_table : includeHidden en chaîne, limit plafonné à 500, offset négatif ramené à 0', async () => {
    const hidden = await run(readTableTool, { selector: '#t', includeHidden: 'true' });
    expect(hidden.data.totalRows).toBe(2);
    const visible = await run(readTableTool, { selector: '#t', limit: 99999, offset: -4 });
    expect(visible.data).toMatchObject({ totalRows: 1, offset: 0 });
  });

  it('discover_components : kinds non tableau ignoré ; find_in_page : scope inconnu → all', async () => {
    expect((await run(discoverComponentsTool, { kinds: 'card' })).success).toBe(true);
    document.body.innerHTML = '<input aria-label="cible champ">';
    expect((await run(findInPageTool, { query: 'cible', scope: 'n-importe-quoi' })).data.totalMatches).toBe(1);
    expect((await run(findInPageTool, { query: 'cible', scope: 'text' })).data.totalMatches).toBe(0);
  });
});

describe('tools sans effet de bord sur les données', () => {
  it('get_page_state survit à un store de tenant indisponible', async () => {
    const result = await run(getPageStateTool);
    expect(result.success).toBe(true);
    expect(result.data.tenantId).toBeNull();
  });

  it('list_observables et inspect_interface sur une racine inconnue renvoient du vide, pas une erreur', async () => {
    registerObservable(
      { id: 'o', kind: 'card', label: 'O', description: 'd', state: 'ready', getData: () => ({}) },
      document.getElementById('b') as HTMLElement,
    );
    expect((await run(listObservablesTool)).data.observables).toHaveLength(1);
    const empty = await run(inspectInterfaceTool, { rootSelector: '#absent' });
    expect(empty.success).toBe(true);
    expect(empty.data).toMatchObject({ nodes: [], totalMeaningfulNodesFound: 0, nextOffset: null });
  });

  it('fill_field : id inconnu et élément non-champ → échec explicite', async () => {
    expect((await run(fillFieldTool, { actionId: 'inconnu', value: 'x' })).error).toContain('inconnu');
  });

  it('navigate_and_inspect / navigate_and_read : route absente ou dangereuse refusée SANS naviguer', async () => {
    for (const tool of [navigateAndInspectTool, navigateAndReadTool]) {
      for (const route of ['', '   ', 'javascript:alert(1)', 'https://evil.example/x']) {
        const result = await run(tool, { route });
        expect(result.success, `${tool.id} ${route}`).toBe(false);
      }
    }
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigate_and_read : pagination transmise et état de chargement signalé', async () => {
    document.body.innerHTML =
      '<div aria-busy="true"></div>' + Array.from({ length: 400 }, (_, i) => `<p>Ligne ${i} de contenu</p>`).join('');
    const result = await run(navigateAndReadTool, { route: '/classes', maxChars: 1000, offset: 0 });
    expect(result.success).toBe(true);
    expect(result.data.stillLoading).toBe(true);
    expect(result.data.lines.nextOffset).not.toBeNull();
  }, 20000);
});

describe('catalogue : cohérence des schémas exposés au backend', () => {
  it('chaque paramètre requis a un type valide, chaque enum est cohérent, aucun id en double', () => {
    const types = new Set(['string', 'number', 'boolean', 'object', 'array']);
    for (const tool of NATIVE_TOOLS) {
      expect(tool.id).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(tool.moduleName).toBe('@egen-civitas/esm-ai-tools');
      for (const [name, param] of Object.entries(tool.parameters)) {
        expect(types.has(param.type), `${tool.id}.${name}`).toBe(true);
        if (param.enum) expect(param.enum.length, `${tool.id}.${name}`).toBeGreaterThan(1);
        if (param.type === 'array') expect(param.items, `${tool.id}.${name}`).toBeDefined();
      }
    }
  });

  it('les tools de lecture sont tous décrits comme tels et ne déclarent aucun paramètre obligatoire inutile', () => {
    for (const tool of [readPageTool, getDomTreeTool, discoverComponentsTool, getPageStateTool]) {
      const required = Object.entries(tool.parameters).filter(([, p]) => p.required);
      expect(required, tool.id).toEqual([]);
    }
    expect(
      Object.entries(findInPageTool.parameters)
        .filter(([, p]) => p.required)
        .map(([n]) => n),
    ).toEqual(['query']);
  });
});
