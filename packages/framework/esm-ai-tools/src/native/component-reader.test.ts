import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _clearElementRefs, getElementRef } from './dom-utils.js';
import { classifyComponent } from './components.js';
import { discoverComponents, readComponent } from './component-reader.js';
import { findInPage } from './find-in-page.js';
import { _clearObservableRegistry, registerObservable } from '../observables.js';

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

const FIXTURE = `
  <main>
    <h1>Étudiants</h1>
    <div class="student-card" id="card-ada">
      <h3 class="student-card__title">Ada Lovelace</h3>
      <span class="student-card__subtitle">Terminale S</span>
      <p class="student-card__description">Major de promotion</p>
      <span class="student-card__date">12 mars 2026</span>
      <img src="/ada.png" alt="Photo d'Ada">
      <button>Contacter</button>
      <a href="/students/ada">Dossier</a>
    </div>
    <div class="student-card" id="card-bob">
      <h3>Bob Martin</h3>
      <p>Hello <b>wor</b>ld en cours</p>
    </div>
    <div role="dialog" aria-label="Confirmer la suppression"><p>Cette action est définitive.</p></div>
    <div class="cds--inline-notification cds--inline-notification--error" role="alert"><p>Échec de l'enregistrement</p></div>
    <h2>Contact</h2>
    <div><input aria-label="Courriel" placeholder="nom@exemple.ga" value="ada@exemple.ga"></div>
  </main>`;

describe('classifyComponent', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('identifie landmarks, ARIA, Carbon, classes et custom elements', () => {
    document.body.innerHTML = `
      <nav id="n"></nav>
      <div id="d" role="dialog"></div>
      <div id="c" class="cds--tile"></div>
      <div id="k" class="user-card"></div>
      <x-widget id="w"></x-widget>
      <div id="plain" class="wrapper"></div>`;
    const kind = (id: string) => classifyComponent(document.getElementById(id) as Element);
    expect(kind('n')).toMatchObject({ kind: 'navigation', source: 'native', structural: true });
    expect(kind('d')).toMatchObject({ kind: 'dialog', source: 'aria' });
    expect(kind('c')).toMatchObject({ kind: 'card', source: 'carbon', name: 'tile' });
    expect(kind('k')).toMatchObject({ kind: 'card', source: 'class' });
    expect(kind('w')).toMatchObject({ kind: 'custom-element', name: 'x-widget' });
    expect(kind('plain')).toBeNull();
  });

  it("n'érige pas en composants les parties internes d'une carte (BEM, composé, imbriqué)", () => {
    document.body.innerHTML = `
      <div class="card"><div class="card__body" id="bem"></div><div class="card-body" id="nested"></div></div>`;
    expect(classifyComponent(document.getElementById('bem') as Element)).toBeNull();
    expect(classifyComponent(document.getElementById('nested') as Element)).toBeNull();
  });

  it('un <section> ou role=region sans nom reste un simple conteneur', () => {
    document.body.innerHTML = '<section id="a"></section><section id="b" aria-label="Résumé"></section>';
    expect(classifyComponent(document.getElementById('a') as Element)).toBeNull();
    expect(classifyComponent(document.getElementById('b') as Element)).toMatchObject({ kind: 'region' });
  });
});

describe('readComponent', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
    mockLayout();
    _clearElementRefs();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    _clearObservableRegistry();
    document.body.innerHTML = '';
  });

  it('isole titre, sous-titre, corps, métadonnées, actions et médias', () => {
    const report = readComponent(document.getElementById('card-ada') as Element);
    expect(report.kind).toBe('card');
    expect(report.parts.title).toBe('Ada Lovelace');
    expect(report.parts.subtitle).toBe('Terminale S');
    expect(report.parts.body).toEqual(['Major de promotion']);
    expect(report.parts.meta).toEqual([{ hint: 'date', text: '12 mars 2026' }]);
    expect(report.parts.actions.map((a) => a.label)).toEqual(['Contacter', 'Dossier']);
    expect(report.parts.actions[1].href).toBe('/students/ada');
    expect(report.parts.media).toMatchObject([{ kind: 'image', label: "Photo d'Ada" }]);
  });

  it('fournit le plan complet, une référence, un sélecteur et les enfants pour descendre', () => {
    const el = document.getElementById('card-ada') as Element;
    const report = readComponent(el);
    expect(report.ref).toBe(getElementRef(el));
    expect(report.selector).toBe('#card-ada');
    expect(report.outline).toContain('heading[3] "Ada Lovelace"');
    expect(report.children.map((c) => c.tag)).toContain('button');
    expect(report.outlineTruncated).toBe(false);
    expect(report.visible).toBe(true);
  });

  it("lit les champs avec leur valeur et fait apparaître les données déclarées par l'app", () => {
    const el = document.getElementById('card-bob') as HTMLElement;
    registerObservable(
      {
        id: 'student-bob',
        kind: 'card',
        label: 'Fiche Bob',
        description: 'Fiche étudiant',
        state: 'ready',
        getData: () => ({ nom: 'Bob', moyenne: 14.5, password: 'hunter2' }),
      },
      el,
    );
    const report = readComponent(el);
    expect(report.declared).toHaveLength(1);
    expect(report.declared[0]).toMatchObject({ id: 'student-bob', label: 'Fiche Bob' });
    const data = report.declared[0].data as Record<string, unknown>;
    expect(data.nom).toBe('Bob');
    expect(data.password).toBe('••••••');
  });

  it('expose les props du composant React propriétaire, secrets masqués', () => {
    const el = document.getElementById('card-ada') as HTMLElement;
    function StudentCard() {}
    (el as unknown as Record<string, unknown>).__reactFiber$abc = {
      type: 'div',
      return: {
        type: StudentCard,
        memoizedProps: { student: { name: 'Ada', apiToken: 'tok-123' }, onClick: () => {} },
      },
    };
    const report = readComponent(el);
    expect(report.identity.react).toEqual(['StudentCard']);
    expect(report.react?.owner).toBe('StudentCard');
    expect(JSON.stringify(report.react?.props)).not.toContain('tok-123');
    expect(JSON.stringify(report.react?.props)).toContain('Ada');
    expect(JSON.stringify(report.react?.props)).toContain('[Function]');
  });
});

describe('discoverComponents', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
    mockLayout();
    _clearElementRefs();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('inventorie les composants par nature avec compte et titres', () => {
    const result = discoverComponents();
    expect(result.byKind.card).toBe(2);
    expect(result.byKind.dialog).toBe(1);
    expect(result.byKind.notification).toBeGreaterThanOrEqual(1);
    expect(result.byKind.main).toBe(1);
    const dialog = result.components.find((c) => c.kind === 'dialog');
    expect(dialog?.title).toBe('Confirmer la suppression');
    expect(result.components.find((c) => c.kind === 'card')?.title).toBe('Ada Lovelace');
  });

  it("n'inclut ni boutons ni champs par défaut, mais les natures demandées oui", () => {
    expect(discoverComponents().byKind.button).toBeUndefined();
    const only = discoverComponents({ kinds: ['dialog'] });
    expect(only.components.map((c) => c.kind)).toEqual(['dialog']);
  });

  it('filtre par texte et borne le nombre de résultats', () => {
    expect(discoverComponents({ query: 'bob' }).components).toHaveLength(1);
    const limited = discoverComponents({ kinds: ['card'], limit: 1 });
    expect(limited.returned).toBe(1);
    expect(limited.total).toBe(2);
    expect(limited.truncated).toBe(true);
  });

  it('liste les composants React rencontrés', () => {
    const el = document.getElementById('card-ada') as HTMLElement;
    function StudentCard() {}
    (el as unknown as Record<string, unknown>).__reactFiber$x = { type: 'div', return: { type: StudentCard } };
    const result = discoverComponents({ kinds: ['react-component'] });
    expect(result.reactComponents).toEqual([{ name: 'StudentCard', count: 1 }]);
    expect(result.components[0]).toMatchObject({ kind: 'react-component', react: 'StudentCard' });
  });
});

describe('findInPage', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
    mockLayout();
    _clearElementRefs();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('localise un texte avec bloc, extrait, section et composant', () => {
    const result = findInPage({ query: 'major de promotion' });
    if ('error' in result) throw new Error(result.error);
    expect(result.totalMatches).toBe(1);
    expect(result.matches[0]).toMatchObject({ tag: 'p', matchedIn: 'text', section: 'Ada Lovelace' });
    expect(result.matches[0].snippet).toContain('Major de promotion');
  });

  it('retrouve un mot coupé par des balises inline', () => {
    const result = findInPage({ query: 'hello world' });
    if ('error' in result) throw new Error(result.error);
    expect(result.totalMatches).toBe(1);
  });

  it('cherche aussi dans les attributs accessibles et les valeurs de champs (scope all)', () => {
    const all = findInPage({ query: 'exemple' });
    if ('error' in all) throw new Error(all.error);
    expect(all.matches.map((m) => m.matchedIn).sort()).toEqual(['placeholder', 'value']);
    const textOnly = findInPage({ query: 'exemple', scope: 'text' });
    if ('error' in textOnly) throw new Error(textOnly.error);
    expect(textOnly.totalMatches).toBe(0);
  });

  it("ne cherche jamais dans la valeur d'un champ sensible", () => {
    document.body.innerHTML = '<input type="password" value="s3cret" aria-label="Mot de passe">';
    const result = findInPage({ query: 's3cret' });
    if ('error' in result) throw new Error(result.error);
    expect(result.totalMatches).toBe(0);
  });

  it('supporte regex, sensibilité à la casse et signale les requêtes invalides', () => {
    const regex = findInPage({ query: 'Ada|Bob', regex: true, caseSensitive: true, scope: 'text' });
    if ('error' in regex) throw new Error(regex.error);
    expect(regex.totalMatches).toBeGreaterThanOrEqual(2);
    expect(findInPage({ query: '(', regex: true })).toHaveProperty('error');
    expect(findInPage({ query: '   ' })).toHaveProperty('error');
    expect(findInPage({ query: 'a'.repeat(300), regex: true })).toHaveProperty('error');
  });

  it('ignore le contenu masqué sauf includeHidden', () => {
    document.body.innerHTML = '<div style="display:none">Trésor caché</div><p>visible</p>';
    const hidden = findInPage({ query: 'trésor' });
    if ('error' in hidden) throw new Error(hidden.error);
    expect(hidden.totalMatches).toBe(0);
    const shown = findInPage({ query: 'trésor', includeHidden: true });
    if ('error' in shown) throw new Error(shown.error);
    expect(shown.totalMatches).toBe(1);
  });

  it('cible les liens et boutons comme blocs distincts et limite les résultats', () => {
    const link = findInPage({ query: 'Dossier', scope: 'text' });
    if ('error' in link) throw new Error(link.error);
    expect(link.matches[0].tag).toBe('a');
    const limited = findInPage({ query: 'a', limit: 2, scope: 'text' });
    if ('error' in limited) throw new Error(limited.error);
    expect(limited.returned).toBe(2);
    expect(limited.truncated).toBe(true);
  });
});
