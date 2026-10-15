import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NATIVE_TOOLS,
  discoverComponentsTool,
  fillFieldTool,
  findInPageTool,
  getDomTreeTool,
  getPageStateTool,
  inspectElementTool,
  inspectInterfaceTool,
  navigateAndReadTool,
  readComponentTool,
  readPageTool,
  readTableTool,
  scrollToTool,
} from './index';
import { registerUIAction, _clearUIActionRegistry } from '../ui-actions';
import { _clearElementRefs } from './dom-utils';

const mockNavigate = vi.fn();
vi.mock('@egen-civitas/esm-navigation', () => ({ navigate: (...args: unknown[]) => mockNavigate(...args) }));
vi.mock('@egen-civitas/esm-styleguide', () => ({
  showNotification: vi.fn(),
  showSnackbar: vi.fn(),
  showModal: vi.fn(),
}));
vi.mock('@egen-civitas/esm-api', () => ({ egenFetch: vi.fn() }));

function mockLayout() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    top: 0,
    left: 0,
    right: 100,
    bottom: 20,
    toJSON: () => ({}),
  } as DOMRect);
}

const run = (tool: { execute: (ctx: any) => Promise<any> }, args: Record<string, unknown> = {}) =>
  tool.execute({ args });
const refIn = (outline: string, pattern: RegExp): string => (pattern.exec(outline)?.[1] ?? '') as string;

describe('enregistrement des tools de lecture', () => {
  it('expose chaque tool une seule fois, avec des paramètres documentés', () => {
    const ids = NATIVE_TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [
      'get_page_state',
      'read_page',
      'read_component',
      'read_table',
      'find_in_page',
      'discover_components',
      'get_dom_tree',
      'scroll_to',
      'navigate_and_read',
    ]) {
      expect(ids).toContain(id);
    }
    for (const tool of NATIVE_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(20);
      for (const [name, param] of Object.entries(tool.parameters)) {
        expect(param.description, `${tool.id}.${name}`).toBeTruthy();
      }
    }
  });
});

describe('tools de lecture de page', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main>
        <h1>Classes</h1>
        <div class="cds--tile" id="tile"><h3>Terminale</h3><p>32 élèves</p><a href="/c/t">Ouvrir</a></div>
        <table id="t"><thead><tr><th>Nom</th><th>Note</th></tr></thead>
          <tbody>${Array.from({ length: 6 }, (_, i) => `<tr><td>Élève ${i}</td><td>${10 + i}</td></tr>`).join('')}</tbody></table>
        <input id="pwd" type="password" value="hunter2" aria-label="Mot de passe">
      </main>`;
    mockLayout();
    _clearElementRefs();
    mockNavigate.mockClear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('read_page lit tout le contenu et fournit des refs réutilisables', async () => {
    const result = await run(readPageTool);
    expect(result.success).toBe(true);
    const outline = result.data.outline as string;
    expect(outline).toContain('heading[1] "Classes"');
    expect(outline).toContain('32 élèves');
    expect(outline).not.toContain('hunter2');
    expect(result.data.pageLoading).toBe(false);

    const tileRef = refIn(outline, /card "Terminale" \{(e\d+)\}/);
    const component = await run(readComponentTool, { ref: tileRef });
    expect(component.success).toBe(true);
    expect(component.data.parts.title).toBe('Terminale');
    expect(component.data.parts.actions[0].href).toBe('/c/t');
  });

  it('read_page peut être restreint à une zone (selector / ref) et signale une cible introuvable', async () => {
    const scoped = await run(readPageTool, { selector: '#tile' });
    expect(scoped.data.outline).toContain('Ouvrir');
    expect(scoped.data.outline).not.toContain('Classes');
    const missing = await run(readPageTool, { selector: '#absent' });
    expect(missing.success).toBe(false);
    const stale = await run(readPageTool, { ref: 'e99999' });
    expect(stale.success).toBe(false);
    expect(stale.error).toContain('read_page');
  });

  it('read_table pagine les lignes, accepte un élément contenant le tableau', async () => {
    const page1 = await run(readTableTool, { selector: '#t', limit: 4 });
    expect(page1.success).toBe(true);
    expect(page1.data.headers).toEqual(['Nom', 'Note']);
    expect(page1.data.rows).toHaveLength(4);
    expect(page1.data.totalRows).toBe(6);
    expect(page1.data.hasMore).toBe(true);
    const page2 = await run(readTableTool, { selector: '#t', limit: 4, offset: 4 });
    expect(page2.data.rows).toEqual([
      ['Élève 4', '14'],
      ['Élève 5', '15'],
    ]);
    const viaParent = await run(readTableTool, { selector: 'main' });
    expect(viaParent.data.totalRows).toBe(6);
    const none = await run(readTableTool, { selector: '#tile' });
    expect(none.success).toBe(false);
  });

  it('find_in_page localise un texte et renvoie une ref exploitable', async () => {
    const found = await run(findInPageTool, { query: '32 élèves' });
    expect(found.success).toBe(true);
    expect(found.data.matches[0]).toMatchObject({ tag: 'p', section: 'Terminale' });
    const read = await run(readComponentTool, { ref: found.data.matches[0].ref });
    expect(read.success).toBe(true);
    expect((await run(findInPageTool, { query: '' })).success).toBe(false);
  });

  it('discover_components accepte kinds, query et un filtre de zone', async () => {
    const result = await run(discoverComponentsTool, { kinds: ['card'] });
    expect(result.data.components).toHaveLength(1);
    expect(result.data.components[0]).toMatchObject({ kind: 'card', title: 'Terminale', carbon: 'tile' });
    const scoped = await run(discoverComponentsTool, { selector: '#t' });
    expect(scoped.data.components).toHaveLength(1);
    expect(scoped.data.components[0].kind).toBe('table');
  });

  it('get_dom_tree renvoie une structure compacte bornée', async () => {
    const result = await run(getDomTreeTool, { selector: 'main', maxDepth: 2 });
    expect(result.success).toBe(true);
    const lines = (result.data.tree as string).split('\n');
    expect(lines[0]).toMatch(/^main \{e\d+\}/);
    expect(lines.some((l) => l.includes('h1') && l.includes('"Classes"'))).toBe(true);
    const small = await run(getDomTreeTool, { selector: 'main', maxNodes: 10 });
    expect(small.data.nodesShown).toBeLessThanOrEqual(10);
  });

  it('get_page_state décrit la page, les modales, les alertes et le chargement', async () => {
    document.body.innerHTML +=
      '<div role="dialog" aria-label="Confirmer"><p>Sûr ?</p></div><div role="alert"><p>Échec réseau</p></div><div aria-busy="true"></div>';
    const result = await run(getPageStateTool);
    expect(result.success).toBe(true);
    expect(result.data.counts.headings).toBeGreaterThanOrEqual(1);
    expect(result.data.dialogs[0].name).toBe('Confirmer');
    expect(result.data.notifications[0].text).toBe('Échec réseau');
    expect(result.data.loading.isLoading).toBe(true);
  });

  it('scroll_to cible un élément ou une direction, et refuse une demande vide', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const toElement = await run(scrollToTool, { selector: '#t' });
    expect(toElement.success).toBe(true);
    expect(scrollIntoView).toHaveBeenCalled();
    expect((await run(scrollToTool, { direction: 'bottom' })).success).toBe(true);
    expect((await run(scrollToTool, {})).success).toBe(false);
  });

  it('navigate_and_read navigue puis lit la page', async () => {
    const result = await run(navigateAndReadTool, { route: '/classes' });
    expect(mockNavigate).toHaveBeenCalledWith({ to: '${egenSpaBase}/classes' });
    expect(result.success).toBe(true);
    expect(result.data.outline).toContain('heading[1] "Classes"');
    expect(result.data.stillLoading).toBe(false);
    expect((await run(navigateAndReadTool, { route: 'https://evil.example/x' })).success).toBe(false);
  }, 15000);
});

describe("tools d'inspection améliorés", () => {
  beforeEach(() => {
    document.body.innerHTML = '<main><button id="b">OK</button><input id="pwd" type="password" value="hunter2"></main>';
    mockLayout();
    _clearElementRefs();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('inspect_element accepte une ref et respecte detail=compact', async () => {
    const read = await run(readPageTool);
    const ref = refIn(read.data.outline, /button "OK" \{(e\d+)\}/);
    const compact = await run(inspectElementTool, { ref, detail: 'compact' });
    expect(compact.success).toBe(true);
    expect(compact.data.identity.ref).toBe(ref);
    expect(compact.data.omittedSections).toContain('appliedCSSRules');
    expect(compact.data.computedStyle.byCategory).toEqual({});
    const full = await run(inspectElementTool, { ref });
    expect(full.data.omittedSections).toEqual([]);
    expect(Object.keys(full.data.computedStyle.allProperties).length).toBeGreaterThan(0);
  });

  it('inspect_element ne divulgue jamais un mot de passe, même via les props React', async () => {
    const pwd = document.getElementById('pwd') as HTMLElement;
    (pwd as unknown as Record<string, unknown>).__reactProps$x = { value: 'hunter2', type: 'password' };
    (pwd as unknown as Record<string, unknown>).__reactFiber$x = { type: 'input' };
    const result = await run(inspectElementTool, { selector: '#pwd' });
    expect(result.success).toBe(true);
    expect(JSON.stringify(result.data)).not.toContain('hunter2');
  });

  it('inspect_interface est paginé et par défaut en detail=standard', async () => {
    document.body.innerHTML =
      '<main>' + Array.from({ length: 30 }, (_, i) => `<button>B${i}</button>`).join('') + '</main>';
    const page1 = await run(inspectInterfaceTool, { limit: 10 });
    expect(page1.data.detail).toBe('standard');
    expect(page1.data.nodes).toHaveLength(10);
    expect(page1.data.nextOffset).toBe(10);
    expect(page1.data.nodes[0].computedStyle.allProperties).toEqual({});
    const page2 = await run(inspectInterfaceTool, { limit: 10, offset: page1.data.nextOffset });
    expect(page2.data.nodes[0].nodeIndex).toBe(10);
    const last = await run(inspectInterfaceTool, { limit: 500, offset: 20 });
    expect(last.data.nextOffset).toBeNull();
  });
});

describe('fill_field : select, cases à cocher, champs verrouillés', () => {
  beforeEach(() => {
    _clearUIActionRegistry();
    document.body.innerHTML = '';
  });

  it('choisit une option de <select> par libellé et déclenche input + change', async () => {
    document.body.innerHTML = '<select id="s"><option value="a">Alpha</option><option value="b">Bêta</option></select>';
    const select = document.getElementById('s') as HTMLSelectElement;
    const events: string[] = [];
    select.addEventListener('input', () => events.push('input'));
    select.addEventListener('change', () => events.push('change'));
    registerUIAction({ id: 'classe', kind: 'select', label: 'Classe', description: '...' }, select);

    const result = await run(fillFieldTool, { actionId: 'classe', value: 'bêta' });
    expect(result.success).toBe(true);
    expect(select.value).toBe('b');
    expect(events).toEqual(['input', 'change']);

    const bad = await run(fillFieldTool, { actionId: 'classe', value: 'Gamma' });
    expect(bad.success).toBe(false);
    expect(bad.error).toContain('Alpha | Bêta');
  });

  it('coche / décoche une case selon "true" / "false" et refuse les valeurs ambiguës', async () => {
    document.body.innerHTML = '<input id="c" type="checkbox">';
    const box = document.getElementById('c') as HTMLInputElement;
    registerUIAction({ id: 'actif', kind: 'toggle', label: 'Actif', description: '...' }, box);

    expect((await run(fillFieldTool, { actionId: 'actif', value: 'true' })).data.checked).toBe(true);
    expect(box.checked).toBe(true);
    expect((await run(fillFieldTool, { actionId: 'actif', value: 'true' })).data.checked).toBe(true);
    expect((await run(fillFieldTool, { actionId: 'actif', value: 'false' })).data.checked).toBe(false);
    expect((await run(fillFieldTool, { actionId: 'actif', value: 'peut-être' })).success).toBe(false);
  });

  it('refuse un champ désactivé ou en lecture seule', async () => {
    document.body.innerHTML = '<input id="d" disabled><input id="r" readonly>';
    registerUIAction(
      { id: 'd', kind: 'fill', label: 'D', description: '...' },
      document.getElementById('d') as HTMLElement,
    );
    registerUIAction(
      { id: 'r', kind: 'fill', label: 'R', description: '...' },
      document.getElementById('r') as HTMLElement,
    );
    expect((await run(fillFieldTool, { actionId: 'd', value: 'x' })).success).toBe(false);
    expect((await run(fillFieldTool, { actionId: 'r', value: 'x' })).success).toBe(false);
  });
});
