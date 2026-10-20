import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _clearElementRefs } from './dom-utils.js';
import { describeCurrentScreen } from './describe-screen.js';
import { inspectDOMElement, inspectFullInterface } from './inspect-element.js';

const RECT = {
  x: 5,
  y: 5,
  width: 100,
  height: 20,
  top: 5,
  left: 5,
  right: 105,
  bottom: 25,
  toJSON: () => ({}),
} as DOMRect;
const get = (html: string, selector = '*') => {
  document.body.innerHTML = html;
  return document.body.querySelector(selector) as HTMLElement;
};

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(RECT);
  _clearElementRefs();
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('inspect_element : contenu enrichi', () => {
  it('select : options (libellé, valeur, sélection) et valeur affichée', () => {
    const report = inspectDOMElement(
      get('<select aria-label="Classe"><option value="a">A</option><option value="b" selected>B</option></select>'),
    );
    expect(report.content.options).toEqual([
      { label: 'A', value: 'a', selected: false },
      { label: 'B', value: 'b', selected: true },
    ]);
    expect(report.content.formValue).toMatchObject({ value: 'B', redacted: false });
  });

  it('plafonne les options à 50 et expose cases cochées, lien résolu et image', () => {
    const many = Array.from({ length: 80 }, (_, i) => `<option>o${i}</option>`).join('');
    expect(inspectDOMElement(get(`<select>${many}</select>`)).content.options).toHaveLength(50);
    expect(inspectDOMElement(get('<input type="checkbox" checked>')).content.checked).toBe(true);
    expect(inspectDOMElement(get('<input type="radio">')).content.checked).toBe(false);
    expect(inspectDOMElement(get('<a href="/classes">Classes</a>')).content.href).toMatch(/\/classes$/);
    expect(inspectDOMElement(get('<img src="/logo.png" alt="Logo">')).content.media).toMatchObject({ alt: 'Logo' });
  });

  it('champ sensible : valeur masquée et marquée redacted, pour password comme pour un nom évocateur', () => {
    for (const html of [
      '<input type="password" value="hunter2">',
      '<input name="api_token" value="hunter2">',
      '<textarea name="secret">hunter2</textarea>',
    ]) {
      const report = inspectDOMElement(get(html));
      expect(report.content.formValue).toMatchObject({ value: '••••••', redacted: true });
      expect(JSON.stringify(report)).not.toContain('hunter2');
    }
  });

  it("un CONTENEUR (formulaire, modale…) ne divulgue pas la valeur des champs qu'il contient : inspection, nom accessible, état de page, arbre DOM", async () => {
    const { getDomTree, getPageState } = await import('./page-state.js');
    const html = `<div role="dialog" aria-label="Saisie" id="d" tabindex="0"><p>Instruction</p><textarea name="secret_note">hunter2</textarea><textarea name="commentaire">note publique</textarea><input type="password" value="hunter2"></div>`;
    const dialog = get(html, '#d');
    const report = inspectDOMElement(dialog);
    expect(JSON.stringify(report)).not.toContain('hunter2');
    expect(report.content.textContent).toBe('Instruction');
    expect(JSON.stringify(getPageState())).not.toContain('hunter2');
    expect(getDomTree().tree).not.toContain('hunter2');
    expect(getDomTree().tree).not.toContain('note publique');
    document.body.innerHTML =
      '<div tabindex="0" id="focusable"><textarea name="secret">hunter2</textarea>Libellé</div>';
    expect(JSON.stringify(describeCurrentScreen())).not.toContain('hunter2');
    expect(
      describeCurrentScreen().interactiveElements.find((e) => e.accessibleName.startsWith('Libellé')),
    ).toBeDefined();
  });

  it("texte injecté par CSS (::before / ::after) : lu quand c'est une chaîne, ignoré sinon", () => {
    const target = get('<span id="icone"></span>');
    const real = window.getComputedStyle.bind(window);
    const contents: Record<string, string> = { '::before': '"★ "', '::after': '' };
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element, pseudo?: string) => {
      const style = real(el);
      return pseudo ? ({ content: contents[pseudo] } as CSSStyleDeclaration) : style;
    }) as never);
    expect(inspectDOMElement(target).content.pseudoElements).toEqual({ before: '★ ' });
    contents['::before'] = 'none';
    contents['::after'] = 'counter(x)';
    expect(inspectDOMElement(target).content.pseudoElements).toBeUndefined();
    contents['::after'] = "'fin'";
    expect(inspectDOMElement(target).content.pseudoElements).toEqual({ after: 'fin' });
  });

  it('une erreur de calcul de style ne fait pas échouer le rapport', () => {
    const target = get('<span></span>');
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation(((el: Element, pseudo?: string) => {
      if (pseudo) throw new Error('pseudo non supporté');
      return real(el);
    }) as never);
    expect(() => inspectDOMElement(target)).not.toThrow();
    expect(inspectDOMElement(target).content.pseudoElements).toBeUndefined();
  });
});

describe('niveaux de détail', () => {
  it('full : tout ; standard : CSS regroupé sans cascade ; compact : aucun CSS ni props React', () => {
    const target = get('<button id="b" class="cds--btn">OK</button>');
    (target as unknown as Record<string, unknown>).__reactProps$x = { onClick: () => {}, label: 'OK' };
    (target as unknown as Record<string, unknown>).__reactFiber$x = { type: 'button' };

    const full = inspectDOMElement(target);
    expect(full.omittedSections).toEqual([]);
    expect(Object.keys(full.computedStyle.allProperties).length).toBeGreaterThan(0);

    const standard = inspectDOMElement(target, undefined, { detail: 'standard' });
    expect(standard.omittedSections).toEqual([
      'appliedCSSRules',
      'computedStyle.allProperties',
      'computedStyle.cssText',
    ]);
    expect(standard.computedStyle.allProperties).toEqual({});
    expect(standard.computedStyle.cssText).toBe('');
    expect(Object.keys(standard.computedStyle.byCategory).length).toBeGreaterThan(0);
    expect(standard.appliedCSSRules).toEqual([]);

    const compact = inspectDOMElement(target, undefined, { detail: 'compact' });
    expect(compact.omittedSections).toContain('computedStyle.byCategory');
    expect(compact.omittedSections).toContain('react.props');
    expect(compact.computedStyle.byCategory).toEqual({});
    expect(compact.react).toMatchObject({ available: true });
    expect(compact.react.props).toBeUndefined();
    expect(compact.identity.ref).toMatch(/^e\d+$/);
  });

  it('inspectFullInterface : pagination cohérente (offset, nextOffset, nodeIndex, parent) et zones ignorées', () => {
    document.body.innerHTML = `<main id="m"><button>A</button><button>B</button><div data-ai-ignore><button>Assistant</button></div></main>`;
    const all = inspectFullInterface(undefined, { detail: 'compact' });
    expect(all.nodes.some((n) => n.content.textContent === 'Assistant')).toBe(false);
    const total = all.totalMeaningfulNodesFound;
    const page1 = inspectFullInterface(undefined, { detail: 'compact', limit: 1 });
    expect(page1).toMatchObject({ offset: 0, nextOffset: 1, truncated: true });
    const pageN = inspectFullInterface(undefined, { detail: 'compact', limit: 1, offset: total - 1 });
    expect(pageN).toMatchObject({ nextOffset: null, truncated: false });
    expect(pageN.nodes[0].nodeIndex).toBe(total - 1);
    const buttons = all.nodes.filter((n) => n.identity.tagName === 'button');
    const main = all.nodes.find((n) => n.identity.id === 'm');
    expect(buttons.every((b) => b.parentNodeIndex === main?.nodeIndex)).toBe(true);
  });
});

describe('describe_screen : états de chaque élément interactif', () => {
  it('rend désactivé, coché, déplié, sélectionné, pressé, invalide (natif et ARIA)', () => {
    document.body.innerHTML = `
      <button aria-label="Off" disabled></button><div role="button" aria-label="OffAria" aria-disabled="true"></div>
      <input type="checkbox" aria-label="Case" checked><input type="radio" aria-label="Radio">
      <div role="switch" aria-label="Bascule" aria-checked="true" tabindex="0"></div>
      <div role="checkbox" aria-label="CaseAria" aria-checked="false" tabindex="0"></div>
      <button aria-label="Menu" aria-expanded="true"></button><div role="tab" aria-label="Onglet" aria-selected="false"></div>
      <button aria-label="Gras" aria-pressed="true"></button><input aria-label="Courriel" aria-invalid="true" value="x">
      <textarea aria-label="Note">Texte</textarea>`;
    const byName = (name: string) =>
      describeCurrentScreen().interactiveElements.find((e) => e.accessibleName === name)!.state;
    expect(byName('Off')).toEqual({ disabled: true });
    expect(byName('OffAria')).toEqual({ disabled: true });
    expect(byName('Case')).toEqual({ checked: true });
    expect(byName('Radio')).toEqual({ checked: false });
    expect(byName('Bascule')).toEqual({ checked: true });
    expect(byName('CaseAria')).toEqual({ checked: false });
    expect(byName('Menu')).toEqual({ expanded: true });
    expect(byName('Onglet')).toEqual({ selected: false });
    expect(byName('Gras')).toEqual({ pressed: true });
    expect(byName('Courriel')).toEqual({ value: 'x', invalid: true });
    expect(byName('Note')).toEqual({ value: 'Texte' });
  });

  it('includeOffscreen=false retire ce qui est hors fenêtre ; limit borné 1–300 ; offset négatif ramené à 0', () => {
    document.body.innerHTML = '<button id="vu">Vu</button><button id="bas">Bas</button>';
    vi.restoreAllMocks();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return { ...RECT, top: this.id === 'bas' ? 9000 : 5, bottom: this.id === 'bas' ? 9020 : 25 } as DOMRect;
    });
    expect(describeCurrentScreen({ includeOffscreen: false }).interactiveElements.map((e) => e.accessibleName)).toEqual(
      ['Vu'],
    );
    expect(describeCurrentScreen().interactiveElements).toHaveLength(2);
    expect(describeCurrentScreen({ limit: 0 }).interactiveElements).toHaveLength(1);
    expect(describeCurrentScreen({ limit: 99999, offset: -3 })).toMatchObject({ offset: 0, totalInteractive: 2 });
  });

  it('titres cachés exclus, landmarks plafonnés à 20, éléments en Shadow DOM inclus', () => {
    document.body.innerHTML = `<h1>Visible</h1><h2 style="display:none">Caché</h2>${Array.from({ length: 30 }, () => '<nav aria-label="n"></nav>').join('')}<div id="host"></div>`;
    (document.getElementById('host') as HTMLElement).attachShadow({ mode: 'open' }).innerHTML =
      '<button aria-label="Dans l\'ombre"></button>';
    const screen = describeCurrentScreen();
    expect(screen.headings).toEqual([{ level: 1, text: 'Visible' }]);
    expect(screen.landmarks).toHaveLength(20);
    expect(screen.interactiveElements.some((e) => e.accessibleName === "Dans l'ombre")).toBe(true);
  });
});
