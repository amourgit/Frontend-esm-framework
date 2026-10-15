import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _clearElementRefs,
  buildStableSelector,
  computeAccessibleName,
  getElementRef,
  getReactOwnerChain,
  isSensitiveField,
  readFieldValue,
  resolveElementRef,
  walkElementsDeep,
} from './dom-utils.js';
import { serializeForAI } from './serialize.js';
import { createReadContext, describeTable, inlineText } from './text-extract.js';
import { describeCurrentScreen } from './describe-screen.js';

const field = (html: string): Element => {
  document.body.innerHTML = html;
  return document.body.firstElementChild as Element;
};

describe('isSensitiveField / readFieldValue', () => {
  it('masque mots de passe, champs cachés et noms/libellés évocateurs (FR et EN)', () => {
    for (const html of [
      '<input type="password" value="x">',
      '<input type="hidden" name="csrf" value="x">',
      '<input name="user_pin" value="x">',
      '<input autocomplete="cc-number" value="x">',
      '<input aria-label="Mot de passe" value="x">',
      '<input placeholder="Numéro de passeport" value="x">',
      '<textarea name="api_token">x</textarea>',
      '<label for="i">Code OTP</label><input id="i" value="x">',
    ]) {
      const el = field(html).tagName === 'LABEL' ? (document.getElementById('i') as Element) : field(html);
      expect(isSensitiveField(el), html).toBe(true);
      expect(readFieldValue(el)).toEqual({ value: '••••••', redacted: true });
    }
  });

  it('ne masque pas les champs ordinaires (pas de faux positif sur « shipping », « spinner »)', () => {
    for (const html of [
      '<input name="email" value="a@b.ga">',
      '<input name="shipping" value="x">',
      '<input name="spinner" value="x">',
    ]) {
      expect(isSensitiveField(field(html)), html).toBe(false);
    }
    expect(readFieldValue(field('<input value="Ada">'))).toEqual({ value: 'Ada', redacted: false });
  });

  it("lit la valeur affichée d'un <select> (libellés des options choisies)", () => {
    const el = field('<select><option value="a">Alpha</option><option value="b" selected>Bêta</option></select>');
    expect(readFieldValue(el)).toEqual({ value: 'Bêta', redacted: false });
  });
});

describe('computeAccessibleName', () => {
  it("suit l'ordre aria-labelledby > aria-label > label > placeholder > title", () => {
    document.body.innerHTML =
      '<span id="l">Libellé externe</span><input id="a" aria-labelledby="l" aria-label="Autre">';
    expect(computeAccessibleName(document.getElementById('a') as Element)).toBe('Libellé externe');
    expect(computeAccessibleName(field('<input aria-label="Nom" placeholder="p" title="t">'))).toBe('Nom');
    expect(computeAccessibleName(field('<input placeholder="Saisir" title="t">'))).toBe('Saisir');
    expect(computeAccessibleName(field('<img alt="Logo">'))).toBe('Logo');
    expect(computeAccessibleName(field('<svg><title>Icône</title></svg>'))).toBe('Icône');
    expect(computeAccessibleName(field('<input type="submit" value="Envoyer">'))).toBe('Envoyer');
  });
});

describe('références et sélecteurs', () => {
  beforeEach(() => _clearElementRefs());

  it("une ref est stable, résout l'élément et expire quand il quitte la page", () => {
    const el = field('<div id="x"><p>a</p></div>');
    const ref = getElementRef(el);
    expect(getElementRef(el)).toBe(ref);
    expect(resolveElementRef(ref)).toBe(el);
    el.remove();
    expect(resolveElementRef(ref)).toBeNull();
    expect(resolveElementRef('e424242')).toBeNull();
  });

  it("buildStableSelector retrouve l'élément", () => {
    document.body.innerHTML = '<div><p>un</p><p>deux</p></div>';
    const second = document.querySelectorAll('p')[1];
    expect(document.querySelector(buildStableSelector(second))).toBe(second);
  });
});

describe('walkElementsDeep', () => {
  it('traverse les Shadow DOM ouverts et écarte les sous-arbres demandés', () => {
    document.body.innerHTML = '<div id="host"></div><section id="skip"><b>x</b></section><i id="after"></i>';
    (document.getElementById('host') as HTMLElement).attachShadow({ mode: 'open' }).innerHTML =
      '<span id="inner"></span>';
    const ids = Array.from(walkElementsDeep(document.body, {}, (el) => el.id === 'skip')).map(
      (el) => el.id || el.localName,
    );
    expect(ids).toEqual(['host', 'inner', 'after']);
  });
});

describe('getReactOwnerChain', () => {
  it('liste les composants propriétaires et ignore les noms minifiés', () => {
    const el = field('<div></div>');
    function Inner() {}
    function Outer() {}
    const a = () => {};
    Object.defineProperty(a, 'name', { value: 'a' });
    (el as unknown as Record<string, unknown>).__reactFiber$z = {
      type: 'div',
      return: { type: Inner, return: { type: a, return: { type: Outer } } },
    };
    expect(getReactOwnerChain(el)).toEqual(['Inner', 'Outer']);
    expect(getReactOwnerChain(field('<p></p>'))).toEqual([]);
  });
});

describe('serializeForAI', () => {
  it('masque les clés secrètes à toute profondeur, gère cycles, fonctions, Map/Set et dates', () => {
    const circular: Record<string, unknown> = { name: 'c' };
    circular.self = circular;
    const out = serializeForAI({
      user: { name: 'Ada', password: 'p', nested: { apiKey: 'k', Authorization: 'Bearer x' } },
      circular,
      fn: () => 1,
      map: new Map([['a', 1]]),
      set: new Set([1, 2]),
      date: new Date('2026-01-02T03:04:05Z'),
      element: document.body,
    }) as any;
    expect(out.user.password).toBe('••••••');
    expect(out.user.nested.apiKey).toBe('••••••');
    expect(out.user.nested.Authorization).toBe('••••••');
    expect(out.user.name).toBe('Ada');
    expect(out.circular.self).toBe('[Circulaire]');
    expect(out.fn).toBe('[Function]');
    expect(out.map).toEqual({ __map: [['a', 1]] });
    expect(out.set).toEqual({ __set: [1, 2] });
    expect(out.date).toBe('2026-01-02T03:04:05.000Z');
    expect(out.element).toBe('[DOM body]');
  });

  it('borne profondeur, nombre de clés et longueur de chaîne ; children omis sauf texte', () => {
    const deep = { a: { b: { c: { d: { e: 1 } } } } };
    expect(JSON.stringify(serializeForAI(deep, { maxDepth: 2 }))).toContain('profondeur max');
    const many = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, i]));
    expect(Object.keys(serializeForAI(many, { maxKeys: 5 }) as object)).toHaveLength(6);
    expect(String(serializeForAI('x'.repeat(1000), { maxString: 10 }))).toContain('tronqué');
    expect((serializeForAI({ children: 'texte' }) as any).children).toContain('omis');
    expect((serializeForAI({ children: 'texte' }, { keepTextChildren: true }) as any).children).toBe('texte');
    expect((serializeForAI({ value: 'secret-value' }, { redactKeys: ['value'] }) as any).value).toBe('••••••');
  });
});

describe('describeTable (ARIA et colspan)', () => {
  it('lit une grille ARIA et étend les colspan', () => {
    document.body.innerHTML = `
      <div role="grid" aria-label="Notes">
        <div role="row"><div role="columnheader">Nom</div><div role="columnheader" aria-sort="descending">Note</div></div>
        <div role="row"><div role="gridcell">Ada</div><div role="gridcell">19</div></div>
        <div role="row"><div role="gridcell">Bob</div><div role="gridcell"><input type="checkbox" checked></div></div>
      </div>
      <table id="t"><tr><th colspan="2">Groupe</th></tr><tr><td>1</td><td>2</td></tr></table>`;
    const grid = describeTable(document.querySelector('[role="grid"]') as Element, createReadContext());
    expect(grid).toMatchObject({ caption: 'Notes', headers: ['Nom', 'Note'], totalRows: 2 });
    expect(grid.rows).toEqual([
      ['Ada', '19'],
      ['Bob', '☑'],
    ]);
    expect(grid.sortedBy).toEqual({ column: 'Note', direction: 'descending' });
    const table = describeTable(document.getElementById('t') as Element, createReadContext());
    expect(table.headers).toEqual(['Groupe', '']);
    expect(table.rows).toEqual([['1', '2']]);
  });
});

describe('inlineText', () => {
  it('échappe les | des cellules, masque les valeurs sensibles inline, neutralise javascript:', () => {
    const ctx = createReadContext();
    expect(
      inlineText(
        field('<p>a <a href="javascript:alert(1)">x</a> <input type="password" value="s" aria-label="mdp"></p>'),
        ctx,
      ),
    ).toBe('a [x]([lien masqué]) ⟦mdp = ••••••⟧');
  });
});

describe('describe_screen : refs, landmarks, pagination, redaction unifiée', () => {
  beforeEach(() => {
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
    _clearElementRefs();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('expose ref, inViewport, landmarks et masque les champs sensibles par nom (pas seulement type=password)', () => {
    document.body.innerHTML = `
      <nav aria-label="Principal"><a href="/a">A</a></nav>
      <main><h1>Titre</h1><input name="user_token" value="tok-123" aria-label="Jeton"><select aria-label="Classe"><option selected>6e</option></select></main>
      <div data-ai-ignore><button>Assistant</button></div>`;
    const screen = describeCurrentScreen();
    expect(screen.landmarks.map((l) => l.role)).toEqual(['nav', 'main']);
    expect(screen.landmarks[0].name).toBe('Principal');
    const token = screen.interactiveElements.find((e) => e.accessibleName === 'Jeton');
    expect(token?.state.value).toBe('••••••');
    expect(token?.ref).toMatch(/^e\d+$/);
    expect(token?.inViewport).toBe(true);
    expect(screen.interactiveElements.find((e) => e.tag === 'select')?.state.value).toBe('6e');
    expect(screen.interactiveElements.some((e) => e.accessibleName === 'Assistant')).toBe(false);
    expect(JSON.stringify(screen)).not.toContain('tok-123');
  });

  it('pagine avec limit/offset et signale truncated', () => {
    document.body.innerHTML = Array.from({ length: 25 }, (_, i) => `<button>B${i}</button>`).join('');
    const first = describeCurrentScreen({ limit: 10 });
    expect(first.interactiveElements).toHaveLength(10);
    expect(first.totalInteractive).toBe(25);
    expect(first.truncated).toBe(true);
    const last = describeCurrentScreen({ limit: 10, offset: 20 });
    expect(last.interactiveElements.map((e) => e.accessibleName)).toEqual(['B20', 'B21', 'B22', 'B23', 'B24']);
    expect(last.truncated).toBe(false);
  });
});
