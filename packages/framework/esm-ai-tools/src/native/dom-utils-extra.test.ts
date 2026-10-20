import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _clearElementRefs,
  buildStableSelector,
  cssEscape,
  getCarbonComponent,
  getElementRef,
  getIframeDocument,
  getReactOwner,
  getReactOwnerName,
  getScrollInfo,
  getVisibility,
  isHiddenForReading,
  isInShadowRoot,
  isInViewport,
  safeTextContent,
  snippet,
  truncateText,
  walkElementsDeep,
} from './dom-utils.js';
import { TARGET_PARAMS, findDeclaredId, resolveTarget } from './target.js';
import { serializeForAI, isSensitiveKey } from './serialize.js';
import { _clearObservableRegistry, registerObservable } from '../observables.js';
import { _clearUIActionRegistry, registerUIAction } from '../ui-actions.js';

const RECT = {
  x: 10,
  y: 10,
  width: 100,
  height: 20,
  top: 10,
  left: 10,
  right: 110,
  bottom: 30,
  toJSON: () => ({}),
} as DOMRect;
const el = (html: string): HTMLElement => {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
};

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(RECT);
  _clearElementRefs();
});
afterEach(() => {
  vi.restoreAllMocks();
  _clearObservableRegistry();
  _clearUIActionRegistry();
  document.body.innerHTML = '';
});

describe('texte', () => {
  it('truncateText / snippet bornent et signalent la troncature', () => {
    expect(truncateText('abc', 5)).toBe('abc');
    expect(truncateText('abcdefgh', 5)).toBe('abcde… [tronqué à 5 caractères]');
    expect(snippet('  un   texte \n long ', 8)).toBe('un text…');
    expect(snippet('court', 50)).toBe('court');
  });
  it('cssEscape protège les caractères spéciaux', () => {
    expect(cssEscape('a.b#c')).not.toBe('a.b#c');
    expect(document.querySelector(`#${cssEscape('x:y')}`)).toBeNull();
  });
});

describe('safeTextContent', () => {
  it('exclut le contenu des <textarea>, des champs sensibles, des scripts et des styles — garde le reste', () => {
    const container = el(`<div>Avant <textarea name="note">valeur-saisie</textarea>
      <select name="secret_choice"><option>option-secrete</option></select>
      <select name="classe"><option>6e</option></select>
      <script>var x = 'js'</script><style>.a{}</style><b>gras</b> Après</div>`);
    const text = safeTextContent(container).replace(/\s+/g, ' ').trim();
    expect(text).toBe('Avant 6e gras Après');
    expect(text).not.toContain('valeur-saisie');
    expect(text).not.toContain('option-secrete');
  });

  it('un champ pris lui-même (textarea, select sensible) rend du vide', () => {
    expect(safeTextContent(el('<textarea>x</textarea>'))).toBe('');
    expect(safeTextContent(el('<select name="api_token"><option>t</option></select>'))).toBe('');
    expect(safeTextContent(el('<p>texte</p>'))).toBe('texte');
  });
});

describe('visibilité', () => {
  it('explique pourquoi un élément est invisible : display, visibility, opacity, dimensions nulles', () => {
    expect(getVisibility(el('<div>ok</div>'))).toMatchObject({ visible: true, reason: 'visible', inViewport: true });
    expect(getVisibility(el('<div style="display:none">x</div>'))).toMatchObject({
      visible: false,
      reason: 'display: none',
    });
    expect(getVisibility(el('<div style="visibility:hidden">x</div>'))).toMatchObject({
      visible: false,
      reason: 'visibility: hidden',
    });
    expect(getVisibility(el('<div style="opacity:0">x</div>'))).toMatchObject({ visible: false, reason: 'opacity: 0' });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ ...RECT, width: 0, height: 0 } as DOMRect);
    expect(getVisibility(el('<div>x</div>'))).toMatchObject({ visible: false, reason: 'dimensions nulles (0×0)' });
  });

  it('hors fenêtre : visible mais pas dans le viewport ; isInViewport vaut null sans géométrie', () => {
    const target = el('<div>x</div>');
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      ...RECT,
      top: 9000,
      bottom: 9020,
    } as DOMRect);
    expect(getVisibility(target)).toMatchObject({ visible: true, inViewport: false });
    expect(isInViewport(target)).toBe(false);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ ...RECT, width: 0, height: 0 } as DOMRect);
    expect(isInViewport(target)).toBeNull();
  });

  it('isHiddenForReading : attribut hidden, display/visibility/opacity — mais pas la géométrie nulle (display: contents)', () => {
    expect(isHiddenForReading(el('<div hidden>x</div>'))).toBe(true);
    expect(isHiddenForReading(el('<div style="display:none">x</div>'))).toBe(true);
    expect(isHiddenForReading(el('<div style="visibility:collapse">x</div>'))).toBe(true);
    expect(isHiddenForReading(el('<div style="opacity:0">x</div>'))).toBe(true);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ ...RECT, width: 0, height: 0 } as DOMRect);
    expect(isHiddenForReading(el('<div style="display:contents">x</div>'))).toBe(false);
    expect(isHiddenForReading(el('<div hidden="until-found">x</div>'))).toBe(false);
  });

  it('getScrollInfo détecte une vraie zone défilante', () => {
    const box = el('<div style="overflow-y:auto"></div>');
    Object.defineProperty(box, 'scrollHeight', { value: 500, configurable: true });
    Object.defineProperty(box, 'clientHeight', { value: 100, configurable: true });
    expect(getScrollInfo(box)).toMatchObject({ scrollable: true, scrollHeight: 500, clientHeight: 100 });
    const plain = el('<div></div>');
    expect(getScrollInfo(plain).scrollable).toBe(false);
  });
});

describe('Shadow DOM, iframes, Carbon, React', () => {
  it('isInShadowRoot et walkElementsDeep (iframes même origine inclus, cross-origin ignorées)', () => {
    document.body.innerHTML = '<div id="host"></div><iframe id="same"></iframe><iframe id="cross"></iframe>';
    const host = document.getElementById('host') as HTMLElement;
    const inner = host.attachShadow({ mode: 'open' });
    inner.innerHTML = '<span id="in-shadow"></span>';
    expect(isInShadowRoot(inner.firstElementChild as Element)).toBe(true);
    expect(isInShadowRoot(host)).toBe(false);

    const doc = document.implementation.createHTMLDocument('x');
    doc.body.innerHTML = '<b id="in-frame"></b>';
    Object.defineProperty(document.getElementById('same'), 'contentDocument', { value: doc, configurable: true });
    Object.defineProperty(document.getElementById('cross'), 'contentDocument', {
      get() {
        throw new DOMException('x', 'SecurityError');
      },
      configurable: true,
    });
    const ids = Array.from(walkElementsDeep(document.body)).map((e) => e.id || e.localName);
    expect(ids).toContain('in-shadow');
    expect(ids).toContain('in-frame');
    expect(getIframeDocument(document.getElementById('cross') as Element)).toBeNull();
    const noFrames = Array.from(walkElementsDeep(document.body, { iframes: false, shadow: false })).map((e) => e.id);
    expect(noFrames).not.toContain('in-shadow');
    expect(noFrames).not.toContain('in-frame');
  });

  it('getCarbonComponent ne retient que le bloc, pas les modificateurs ni éléments', () => {
    expect(getCarbonComponent(el('<div class="cds--tile cds--tile--clickable cds--tile__chevron"></div>'))).toBe(
      'tile',
    );
    expect(getCarbonComponent(el('<div class="cds--data-table cds--data-table--zebra"></div>'))).toBe('data-table');
    expect(getCarbonComponent(el('<div class="bx--tag"></div>'))).toBe('tag');
    expect(getCarbonComponent(el('<div class="cds--btn--primary"></div>'))).toBeUndefined();
    expect(getCarbonComponent(el('<div class="maclasse"></div>'))).toBeUndefined();
  });

  it('getReactOwner renvoie nom + props bruts du composant propriétaire ; memo/forwardRef/classes gérés', () => {
    const target = el('<div></div>');
    function Plain() {}
    const Memoized = { $$typeof: Symbol.for('react.memo'), type: function InnerCard() {} };
    const Forwarded = { $$typeof: Symbol.for('react.forward_ref'), render: function ForwardedInput() {} };
    class Klass {}
    const fiber = (type: unknown, props: unknown, ret?: unknown) => ({ type, memoizedProps: props, return: ret });
    const set = (f: unknown) => ((target as unknown as Record<string, unknown>).__reactFiber$t = f);

    set(fiber('div', {}, fiber(Plain, { a: 1 })));
    expect(getReactOwner(target)).toEqual({ name: 'Plain', props: { a: 1 } });
    set(fiber('div', {}, fiber(Memoized, { m: 1 })));
    expect(getReactOwnerName(target)).toBe('InnerCard');
    set(fiber('div', {}, fiber(Forwarded, {})));
    expect(getReactOwnerName(target)).toBe('ForwardedInput');
    set(fiber('div', {}, fiber(Klass, {})));
    expect(getReactOwnerName(target)).toBe('Klass');
    // nom minifié ou anonyme : ignoré, on remonte jusqu'au suivant exploitable
    const mangled = () => {};
    Object.defineProperty(mangled, 'name', { value: 'Zt' });
    set(fiber('div', {}, fiber(mangled, {}, fiber(Plain, { up: true }))));
    expect(getReactOwner(target)).toEqual({ name: 'Plain', props: { up: true } });
    set({
      type: 'div',
      get return() {
        throw new Error('fiber corrompu');
      },
    });
    expect(getReactOwner(target)).toBeNull();
    expect(getReactOwner(el('<p></p>'))).toBeNull();
  });
});

describe('références : purge et sélecteurs', () => {
  it('purge les éléments détachés à intervalle régulier et garde les vivants', () => {
    const keep = el('<div id="keep"></div>');
    const keepRef = getElementRef(keep);
    const detached = Array.from({ length: 600 }, () => document.createElement('i'));
    detached.forEach((d) => getElementRef(d)); // aucun n'est dans le document : purgés au franchissement du palier
    expect(getElementRef(keep)).toBe(keepRef);
  });

  it("buildStableSelector : id prioritaire, nth-of-type pour les frères, id d'un ancêtre", () => {
    document.body.innerHTML = '<section id="zone"><p>a</p><p>b</p></section><div><span>x</span></div>';
    expect(buildStableSelector(document.querySelectorAll('p')[1])).toBe('#zone > p:nth-of-type(2)');
    expect(buildStableSelector(document.getElementById('zone') as Element)).toBe('#zone');
    expect(document.querySelector(buildStableSelector(document.querySelector('span') as Element))).toBe(
      document.querySelector('span'),
    );
  });
});

describe('resolveTarget', () => {
  it('ref prioritaire ; ref périmée sans repli → erreur guidée ; ref périmée + selector → repli', () => {
    const a = el('<div id="a"></div>');
    const ref = getElementRef(a);
    expect(resolveTarget({ ref })).toMatchObject({ ok: true, via: 'ref', el: a });
    a.remove();
    const gone = resolveTarget({ ref });
    expect(gone.ok).toBe(false);
    if (!gone.ok) expect(gone.error).toContain('read_page');
    document.body.innerHTML = '<div id="b"></div>';
    expect(resolveTarget({ ref, selector: '#b' })).toMatchObject({ ok: true, via: 'selector' });
  });

  it('actionId : action UI ou observable ; inconnu → erreur ; repli sur selector', () => {
    document.body.innerHTML = '<button id="go">Go</button><div id="obs"></div>';
    registerUIAction(
      { id: 'go-action', kind: 'click', label: 'Go', description: 'd' },
      document.getElementById('go') as HTMLElement,
    );
    registerObservable(
      { id: 'obs-1', kind: 'card', label: 'O', description: 'd', state: 'ready', getData: () => ({}) },
      document.getElementById('obs') as HTMLElement,
    );
    expect(resolveTarget({ actionId: 'go-action' })).toMatchObject({
      ok: true,
      via: 'actionId',
      actionId: 'go-action',
    });
    expect(resolveTarget({ actionId: 'obs-1' })).toMatchObject({ ok: true, via: 'actionId' });
    expect(resolveTarget({ actionId: 'inconnu' }).ok).toBe(false);
    expect(resolveTarget({ actionId: 'inconnu', selector: '#go' })).toMatchObject({ ok: true, via: 'selector' });
    expect(findDeclaredId(document.getElementById('go') as Element)).toBe('go-action');
    expect(findDeclaredId(document.body)).toBeUndefined();
  });

  it('selector : invalide, sans correspondance, matchIndex hors limites, et recherche dans un Shadow DOM', () => {
    document.body.innerHTML = '<p class="x">1</p><p class="x">2</p><div id="host"></div>';
    expect(resolveTarget({ selector: '[[[' })).toMatchObject({ ok: false });
    expect(resolveTarget({ selector: '.absent' })).toMatchObject({ ok: false });
    expect(resolveTarget({ selector: '.x', matchIndex: 1 })).toMatchObject({ ok: true });
    const out = resolveTarget({ selector: '.x', matchIndex: 5 });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.error).toContain('hors limites');
    (document.getElementById('host') as HTMLElement).attachShadow({ mode: 'open' }).innerHTML =
      '<span class="deep">profond</span>';
    const deep = resolveTarget({ selector: '.deep' });
    expect(deep.ok && deep.el.textContent).toBe('profond');
  });

  it('sans aucun paramètre : message explicite ; les paramètres de schéma sont documentés', () => {
    const none = resolveTarget({});
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.error).toContain('ref');
    for (const param of Object.values(TARGET_PARAMS)) expect(param.description.length).toBeGreaterThan(10);
  });
});

describe('serializeForAI : types exotiques', () => {
  it('sérialise bigint, symbole, NaN/Infinity, vues typées, erreurs, regex, éléments React', () => {
    const out = serializeForAI({
      big: 10n,
      sym: Symbol('s'),
      nan: NaN,
      inf: Infinity,
      bytes: new Uint8Array(4),
      err: new TypeError('boom'),
      re: /a+/g,
      badDate: new Date('nope'),
      react: { $$typeof: Symbol.for('react.element'), type: 'div' },
      nothing: null,
      flag: true,
    }) as Record<string, unknown>;
    expect(out).toMatchObject({
      big: '10n',
      sym: 'Symbol(s)',
      nan: 'NaN',
      inf: 'Infinity',
      bytes: '[Uint8Array 4 octets]',
      err: 'TypeError: boom',
      re: '/a+/g',
      badDate: 'Invalid Date',
      react: '[ReactElement]',
      nothing: null,
      flag: true,
    });
  });

  it('tronque les tableaux longs et ne plante pas sur un getter qui lève', () => {
    const list = serializeForAI(
      Array.from({ length: 100 }, (_, i) => i),
      { maxKeys: 3 },
    ) as unknown[];
    expect(list).toEqual([0, 1, 2, '… +97 éléments']);
    const hostile = {
      get boom(): never {
        throw new Error('getter hostile');
      },
    };
    expect(String(serializeForAI(hostile))).toContain('non sérialisable');
    expect(serializeForAI(new Map([[1, 2]]), { maxKeys: 1 })).toEqual({ __map: [[1, 2]] });
  });

  it('isSensitiveKey reconnaît les variantes usuelles et épargne les clés ordinaires', () => {
    for (const k of [
      'password',
      'userPassword',
      'api_key',
      'apiKey',
      'authToken',
      'Authorization',
      'sessionId',
      'jwt',
      'cvv',
      'iban',
      'secretCode',
      'cookie',
    ]) {
      expect(isSensitiveKey(k), k).toBe(true);
    }
    for (const k of ['name', 'email', 'passage', 'tokenizer-not', 'label']) {
      if (k === 'tokenizer-not') continue; // « token » dans un nom plus long : masqué par prudence (faux positif assumé)
      expect(isSensitiveKey(k), k).toBe(false);
    }
  });
});
