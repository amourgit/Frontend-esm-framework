import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _clearElementRefs } from './dom-utils.js';
import { discoverComponents, extractParts, readComponent } from './component-reader.js';
import { buildOutline } from './page-reader.js';
import { findInPage } from './find-in-page.js';
import { _clearObservableRegistry, registerObservable } from '../observables.js';

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
const ok = <T extends object>(r: T | { error: string }): T => {
  if ('error' in r) throw new Error((r as { error: string }).error);
  return r as T;
};

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(RECT);
  _clearElementRefs();
});
afterEach(() => {
  vi.restoreAllMocks();
  _clearObservableRegistry();
  document.body.innerHTML = '';
});

describe('findInPage — cas limites', () => {
  it('cherche dans le Shadow DOM (texte et attributs) et dans une zone ciblée (root)', () => {
    document.body.innerHTML = '<div id="host"></div><section id="zone"><p>cible ici</p></section><p>cible ailleurs</p>';
    (document.getElementById('host') as HTMLElement).attachShadow({ mode: 'open' }).innerHTML =
      '<p>cible dans l\'ombre</p><input aria-label="cible champ">';
    expect(ok(findInPage({ query: 'cible' })).totalMatches).toBe(4);
    const scoped = ok(findInPage({ query: 'cible', root: document.getElementById('zone') as Element }));
    expect(scoped.totalMatches).toBe(1);
    expect(scoped.matches[0].matchedIn).toBe('text');
  });

  it("compte les occurrences d'un bloc (plafond 50) et signale les expressions multiples", () => {
    document.body.innerHTML = `<p>${'abc '.repeat(80)}</p><p>abc abc abc</p>`;
    const result = ok(findInPage({ query: 'abc', scope: 'text' }));
    expect(result.matches.map((m) => m.occurrences)).toEqual([50, 3]);
    const regex = ok(findInPage({ query: 'a(b)c', regex: true, scope: 'text' }));
    expect(regex.matches[0].occurrences).toBeGreaterThan(1);
  });

  it('insensible à la casse par défaut, sensible sur demande ; espaces de la requête normalisés', () => {
    document.body.innerHTML = '<p>Libreville est la capitale</p>';
    expect(ok(findInPage({ query: 'LIBREVILLE' })).totalMatches).toBe(1);
    expect(ok(findInPage({ query: 'LIBREVILLE', caseSensitive: true })).totalMatches).toBe(0);
    expect(ok(findInPage({ query: '  est   la  capitale ' })).totalMatches).toBe(1);
  });

  it('extrait avec contexte : ellipses des deux côtés quand le texte est long', () => {
    document.body.innerHTML = `<p>${'a'.repeat(200)} NEEDLE ${'b'.repeat(200)}</p>`;
    const { snippet } = ok(findInPage({ query: 'needle' })).matches[0];
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
    expect(snippet).toContain('NEEDLE');
    expect(snippet.length).toBeLessThan(200);
  });

  it("section : titre précédent, y compris celui d'un ancêtre ; absente quand il n'y en a pas", () => {
    document.body.innerHTML = '<h2>Notes</h2><div><div><p>valeur 19</p></div></div><p id="seul">orphelin</p>';
    const found = ok(findInPage({ query: 'valeur 19' })).matches[0];
    expect(found.section).toBe('Notes');
    document.body.innerHTML = '<div><p>aucun titre</p></div>';
    expect(ok(findInPage({ query: 'aucun titre' })).matches[0].section).toBeUndefined();
  });

  it('borne limit (1–100), coupe au budget de temps et respecte data-ai-ignore', () => {
    document.body.innerHTML =
      Array.from({ length: 150 }, (_, i) => `<p>mot ${i}</p>`).join('') +
      '<div data-ai-ignore><p>mot caché assistant</p></div>';
    expect(ok(findInPage({ query: 'mot', limit: 9999 })).returned).toBe(100);
    expect(ok(findInPage({ query: 'mot', limit: 0 })).returned).toBe(1);
    expect(ok(findInPage({ query: 'assistant' })).totalMatches).toBe(0);

    const now = vi.spyOn(performance, 'now');
    let t = 0;
    now.mockImplementation(() => (t += 200)); // chaque lecture avance de 200 ms : budget (400 ms) vite dépassé
    document.body.innerHTML = Array.from({ length: 2000 }, (_, i) => `<p>x${i}</p>`).join('');
    expect(ok(findInPage({ query: 'zzz' })).timedOut).toBe(true);
  });

  it('une régexp qui ne correspond à rien renvoie zéro, une requête invalide une erreur explicite', () => {
    document.body.innerHTML = '<p>texte</p>';
    expect(ok(findInPage({ query: '^\\d+$', regex: true })).totalMatches).toBe(0);
    const bad = findInPage({ query: '[', regex: true });
    expect(bad).toHaveProperty('error');
    expect((bad as { error: string }).error).toContain('invalide');
  });
});

describe('readComponent — cas limites', () => {
  it('un wrapper sans identité est lu quand même ; la nature retombe sur la balise', () => {
    document.body.innerHTML = '<div id="w"><p>Un</p><p>Deux</p></div>';
    const report = readComponent(document.getElementById('w') as Element);
    expect(report.kind).toBe('div');
    expect(report.parts.body).toEqual(['Un', 'Deux']);
    expect(report.source).toBe('unknown');
  });

  it('includeReactProps=false omet les props ; sans React, pas de section react', () => {
    document.body.innerHTML = '<div id="c" class="my-card"><p>x</p></div>';
    const target = document.getElementById('c') as HTMLElement;
    function Carte() {}
    (target as unknown as Record<string, unknown>).__reactFiber$z = {
      type: 'div',
      return: { type: Carte, memoizedProps: { a: 1 } },
    };
    expect(readComponent(target).react).toMatchObject({ owner: 'Carte' });
    expect(readComponent(target, { includeReactProps: false }).react).toBeUndefined();
    document.body.innerHTML = '<div id="p"></div>';
    expect(readComponent(document.getElementById('p') as Element).react).toBeUndefined();
  });

  it('plafonne le plan au budget de caractères et le signale', () => {
    document.body.innerHTML = `<div class="my-card">${Array.from({ length: 200 }, (_, i) => `<p>Paragraphe ${i} avec du texte</p>`).join('')}</div>`;
    const report = readComponent(document.querySelector('.my-card') as Element, { maxChars: 1000 });
    expect(report.outline.length).toBeLessThanOrEqual(1100);
    expect(report.outlineTruncated).toBe(true);
    expect(report.parts.body.length).toBeLessThanOrEqual(30);
  });

  it('children : 30 max, éléments masqués exclus ; declared : plafonné à 10 observables', () => {
    document.body.innerHTML = `<div id="root">${Array.from({ length: 40 }, (_, i) => `<p>e${i}</p>`).join('')}<p hidden>nope</p></div>`;
    const root = document.getElementById('root') as HTMLElement;
    expect(readComponent(root).children).toHaveLength(30);
    for (let i = 0; i < 15; i++) {
      const child = root.children[i] as HTMLElement;
      registerObservable(
        { id: `o${i}`, kind: 'status', label: `O${i}`, description: 'd', state: 'ready', getData: () => ({ i }) },
        child,
      );
    }
    expect(readComponent(root).declared).toHaveLength(10);
  });

  it('un observable dont getData lève ne casse pas la lecture', () => {
    document.body.innerHTML = '<div id="r"><p>x</p></div>';
    registerObservable(
      {
        id: 'boom',
        kind: 'card',
        label: 'B',
        description: 'd',
        state: 'ready',
        getData: () => {
          throw new Error('données indisponibles');
        },
      },
      document.getElementById('r') as HTMLElement,
    );
    expect(() => readComponent(document.getElementById('r') as Element)).not.toThrow();
  });
});

describe('extractParts — heuristiques', () => {
  const parts = (html: string) => {
    document.body.innerHTML = html;
    return extractParts(buildOutline(document.body).nodes);
  };

  it('titre = premier titre ; sous-titre = titre suivant de même rang ou plus bas, ou texte au rôle subtitle', () => {
    expect(parts('<h2>Principal</h2><h3>Secondaire</h3><p>corps</p>')).toMatchObject({
      title: 'Principal',
      subtitle: 'Secondaire',
      body: ['corps'],
    });
    expect(parts('<h2>Seul</h2><h1>Plus haut</h1>').subtitle).toBeUndefined();
    expect(parts('<h2>T</h2><span class="x__subtitle">Sous</span>').subtitle).toBe('Sous');
    expect(parts('<span class="x__title">Titre texte</span><p>c</p>')).toMatchObject({ title: 'Titre texte' });
  });

  it('range métadonnées, actions, médias, champs, tableaux, listes ; description reste dans le corps', () => {
    const p = parts(`
      <p class="x__description">Desc</p><span class="x__date">1er mai</span><span class="x__price">12 €</span>
      <a href="/a">Voir</a><button disabled>Non</button><img alt="Photo" src="/p.png">
      <input aria-label="Nom" value="v"><table><thead><tr><th>H</th></tr></thead><tbody><tr><td>c</td></tr></tbody></table>
      <ul><li>Un</li><li><div><b>Deux</b></div></li></ul>`);
    expect(p.body).toEqual(['Desc']);
    expect(p.meta).toEqual([
      { hint: 'date', text: '1er mai' },
      { hint: 'price', text: '12 €' },
    ]);
    expect(p.actions.map((a) => [a.kind, a.label, a.flags.includes('disabled')])).toEqual([
      ['link', 'Voir', false],
      ['button', 'Non', true],
    ]);
    expect(p.media).toMatchObject([{ kind: 'image', label: 'Photo' }]);
    expect(p.fields[0]).toMatchObject({ label: 'Nom', value: 'v' });
    expect(p.tables).toMatchObject([{ headers: ['H'], totalRows: 1 }]);
    expect(p.lists[0].items).toEqual(['Un', 'Deux']);
  });

  it('plafonne le corps à 30 blocs', () => {
    expect(parts(Array.from({ length: 50 }, (_, i) => `<p>b${i}</p>`).join('')).body).toHaveLength(30);
  });
});

describe('discoverComponents — cas limites', () => {
  it('une racine ciblée est elle-même évaluée ; une racine masquée donne un inventaire vide', () => {
    document.body.innerHTML =
      '<div id="d" role="dialog" aria-label="Boîte"><div class="info-card"><h3>Dedans</h3></div></div>';
    const result = discoverComponents({ root: document.getElementById('d') as Element });
    expect(result.components.map((c) => c.kind)).toEqual(['dialog', 'card']);
    document.getElementById('d')!.setAttribute('hidden', '');
    expect(discoverComponents({ root: document.getElementById('d') as Element }).total).toBe(0);
  });

  it("garde-fou maxNodes : signale truncated ; limit plafonné à 500 ; rattache l'id déclaré", () => {
    document.body.innerHTML = Array.from(
      { length: 60 },
      (_, i) => `<div class="stat-card" id="s${i}"><p>${i}</p></div>`,
    ).join('');
    expect(discoverComponents({ maxNodes: 20 }).truncated).toBe(true);
    expect(discoverComponents({ limit: 100000 }).returned).toBe(60);
    registerObservable(
      { id: 'obs-s0', kind: 'card', label: 'S0', description: 'd', state: 'ready', getData: () => ({}) },
      document.getElementById('s0') as HTMLElement,
    );
    expect(discoverComponents({ kinds: ['card'] }).components[0].declared).toBe('obs-s0');
  });
});
