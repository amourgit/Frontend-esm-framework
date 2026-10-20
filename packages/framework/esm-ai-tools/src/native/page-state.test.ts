import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _clearElementRefs } from './dom-utils.js';
import {
  getDomTree,
  getLoadingIndicators,
  getPageState,
  isPageLoading,
  scrollPage,
  waitForPageReady,
} from './page-state.js';

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

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(RECT);
  _clearElementRefs();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = '';
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-theme');
  document.head.innerHTML = '';
});

describe('getPageState', () => {
  it('décrit URL, titre, langue, viewport, thème Carbon, méta et compte les éléments', () => {
    document.documentElement.setAttribute('lang', 'fr');
    document.documentElement.classList.add('cds--g100');
    document.head.innerHTML =
      '<meta name="description" content="Pilotage des classes"><meta property="og:title" content="EGEN"><meta name="robots" content="noindex">';
    document.title = 'Tableau de bord'; // après avoir remplacé le <head>
    document.body.innerHTML = `
      <h1>Titre</h1><a href="/x">x</a><button>b</button><img alt="i" src="/i.png">
      <form><input aria-label="a"><input type="hidden" name="h"><select></select><textarea></textarea></form>
      <table></table><div id="single-spa-application:@egen/esm-students-app"><p>monté</p></div>
      <div id="single-spa-application:@egen/vide"></div>`;
    const state = getPageState();
    expect(state).toMatchObject({
      title: 'Tableau de bord',
      lang: 'fr',
      dir: 'ltr',
      readyState: expect.any(String),
      theme: { carbonTheme: 'g100' },
      meta: { description: 'Pilotage des classes', 'og:title': 'EGEN' },
    });
    expect(state.meta).not.toHaveProperty('robots');
    expect(state.counts).toMatchObject({
      headings: 1,
      links: 1,
      buttons: 1,
      images: 1,
      forms: 1,
      fields: 3,
      tables: 1,
    });
    expect(state.microfrontends).toEqual([
      { name: '@egen/esm-students-app', hasContent: true },
      { name: '@egen/vide', hasContent: false },
    ]);
    expect(state.viewport.width).toBeGreaterThan(0);
  });

  it('expose le focus (avec nom et sélecteur) et la sélection, mais jamais la sélection dans un champ sensible', () => {
    document.body.innerHTML =
      '<input id="nom" aria-label="Nom"><p id="para">Texte sélectionnable</p><input id="pwd" type="password" value="hunter2">';
    (document.getElementById('nom') as HTMLElement).focus();
    expect(getPageState().focus).toMatchObject({ tag: 'input', name: 'Nom', selector: '#nom' });

    const range = document.createRange();
    range.selectNodeContents(document.getElementById('para') as Node);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    expect(getPageState().selection).toBe('Texte sélectionnable');

    // sélection ancrée dans un champ sensible : jamais exposée
    vi.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => 'hunter2',
      anchorNode: document.getElementById('pwd'),
    } as unknown as Selection);
    expect(getPageState().selection).toBeNull();
  });

  it('classe les alertes par niveau Carbon et ignore le contenu masqué ou data-ai-ignore', () => {
    document.body.innerHTML = `
      <div class="cds--inline-notification cds--inline-notification--error" role="alert"><p>Échec</p></div>
      <div class="cds--toast-notification cds--toast-notification--success"><p>Enregistré</p></div>
      <div role="status" style="display:none">Caché</div>
      <div role="status" data-ai-ignore>Assistant</div>
      <div role="alert"><p></p></div>`;
    const levels = getPageState().notifications.map((n) => [n.level, n.text]);
    expect(levels).toEqual([
      ['error', 'Échec'],
      ['success', 'Enregistré'],
    ]);
  });

  it('liste les modales ouvertes (nom depuis aria-label ou titre) et ignore les fermées', () => {
    document.body.innerHTML = `
      <div role="dialog" aria-label="Confirmer"><p>Sûr ?</p></div>
      <div role="alertdialog"><h2>Attention</h2><p>Danger</p></div>
      <div role="dialog" style="display:none"><p>Fermée</p></div>`;
    expect(getPageState().dialogs.map((d) => d.name)).toEqual(['Confirmer', 'Attention']);
  });
});

describe('chargement', () => {
  it('détecte aria-busy, progressbar, squelettes et spinners visibles — pas ceux qui sont masqués', () => {
    document.body.innerHTML = `
      <div aria-busy="true"></div><div role="progressbar"></div><div class="cds--skeleton"></div>
      <div class="page-spinner"></div><div class="cds--loading" style="display:none"></div>`;
    expect(getLoadingIndicators().map((i) => i.kind)).toEqual(['aria-busy', 'progressbar', 'skeleton', 'spinner']);
    expect(getLoadingIndicators(2)).toHaveLength(2);
    expect(isPageLoading()).toBe(true);
    document.body.innerHTML = '<p>chargé</p>';
    expect(isPageLoading()).toBe(false);
    expect(getPageState().loading).toEqual({ isLoading: false, indicators: [] });
  });

  it('waitForPageReady attend la disparition des indicateurs, puis rend la main', async () => {
    document.body.innerHTML = '<div id="spin" aria-busy="true"></div>';
    setTimeout(() => document.getElementById('spin')?.remove(), 250);
    const started = Date.now();
    const result = await waitForPageReady({ quietMs: 30, timeoutMs: 3000 });
    expect(result).toEqual({ settled: true, stillLoading: false });
    expect(Date.now() - started).toBeGreaterThanOrEqual(200);
  });

  it("waitForPageReady plafonne l'attente quand la page charge indéfiniment", async () => {
    document.body.innerHTML = '<div aria-busy="true"></div>';
    const started = Date.now();
    const result = await waitForPageReady({ quietMs: 20, timeoutMs: 400 });
    expect(result).toEqual({ settled: false, stillLoading: true });
    expect(Date.now() - started).toBeLessThan(1500);
  });
});

describe('getDomTree', () => {
  const build = () => {
    document.body.innerHTML = `
      <main id="app"><header class="top nav"><h1>Titre</h1></header>
        <section><ul><li>Un</li><li>Deux</li><li>Trois</li></ul></section>
        <footer hidden>caché</footer><div data-ai-ignore>assistant</div></main>`;
  };

  it('rend une ligne par nœud avec balise, id, classes, rôle, ref et texte direct', () => {
    build();
    const { tree, nodesShown, nodesTotal, truncated } = getDomTree({ maxDepth: 6 });
    expect(tree).toMatch(/^body \{e\d+\}/);
    expect(tree).toMatch(/\n {2}main#app \{e\d+\}/);
    expect(tree).toMatch(/header\.top\.nav \{e\d+\} {0,}/);
    expect(tree).toContain('h1 ');
    expect(tree).toContain('"Titre"');
    expect(tree).not.toContain('caché');
    expect(tree).not.toContain('assistant');
    expect(truncated).toBe(false);
    expect(nodesShown).toBe(nodesTotal);
  });

  it('maxDepth borne la profondeur et signale les enfants non affichés', () => {
    build();
    const { tree, truncated } = getDomTree({ root: document.getElementById('app') as Element, maxDepth: 1 });
    expect(tree).toContain('(+');
    expect(tree).toContain('enfants non affichés');
    expect(tree).not.toContain('Titre');
    expect(truncated).toBe(true);
  });

  it("maxNodes borne le total (largeur d'abord : le haut de l'arbre est toujours couvert)", () => {
    document.body.innerHTML = `<div>${Array.from({ length: 50 }, (_, i) => `<p id="p${i}">n${i}</p>`).join('')}</div>`;
    const result = getDomTree({ maxNodes: 10 });
    expect(result.nodesShown).toBeLessThanOrEqual(10);
    expect(result.nodesTotal).toBeGreaterThan(50);
    expect(result.truncated).toBe(true);
    expect(result.tree.split('\n')[0]).toMatch(/^body/);
  });

  it('includeText=false retire les textes ; includeHidden=true révèle les nœuds masqués', () => {
    build();
    expect(getDomTree({ includeText: false }).tree).not.toContain('"Titre"');
    expect(getDomTree({ includeHidden: true, maxDepth: 6 }).tree).toContain('footer');
  });
});

describe('scrollPage', () => {
  it("amène un élément à l'écran et renvoie la position", () => {
    document.body.innerHTML = '<p id="bas">bas</p>';
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const result = scrollPage({ el: document.getElementById('bas') as Element });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'nearest' });
    expect(result).toMatchObject({ targetInViewport: true });
  });

  it('défile la fenêtre : top / bottom / up / down', () => {
    const scroller = document.scrollingElement as Element;
    Object.defineProperty(scroller, 'scrollHeight', { value: 3000, configurable: true });
    const scrollTo = vi.fn();
    (scroller as { scrollTo: unknown }).scrollTo = scrollTo;
    scrollPage({ direction: 'top' });
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'auto' });
    scrollPage({ direction: 'bottom' });
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 3000, behavior: 'auto' });
    scrollPage({ direction: 'down' });
    expect(scrollTo.mock.calls.at(-1)?.[0].top).toBeGreaterThan(0);
    scrollPage({ direction: 'up' });
    expect(scrollTo.mock.calls.at(-1)?.[0].top).toBeLessThanOrEqual(0);
  });

  it('défile un conteneur précis et en déduit atTop / atBottom', () => {
    document.body.innerHTML = '<div id="liste"></div>';
    const box = document.getElementById('liste') as HTMLElement;
    Object.defineProperty(box, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(box, 'clientHeight', { value: 200, configurable: true });
    box.scrollTop = 800;
    expect(scrollPage({ container: box })).toMatchObject({ scrollY: 800, atTop: false, atBottom: true });
    box.scrollTo = vi.fn() as never;
    box.scrollTop = 0;
    expect(scrollPage({ container: box })).toMatchObject({ atTop: true, atBottom: false });
  });
});
