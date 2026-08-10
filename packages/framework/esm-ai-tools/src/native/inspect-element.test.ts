import { describe, it, expect, beforeEach } from 'vitest';
import { inspectDOMElement, inspectFullInterface } from './inspect-element';
import { registerUIAction, _clearUIActionRegistry } from '../ui-actions';
import { registerObservable, _clearObservableRegistry } from '../observables';

describe('inspectDOMElement — identité', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('capture tag, id, classes, attributs et dataset', () => {
    document.body.innerHTML = `<div id="card" class="card featured" data-testid="pricing-card" data-tier="pro"></div>`;
    const el = document.getElementById('card')!;
    const report = inspectDOMElement(el);

    expect(report.identity.tagName).toBe('div');
    expect(report.identity.id).toBe('card');
    expect(report.identity.classList).toEqual(['card', 'featured']);
    expect(report.identity.attributes['data-testid']).toBe('pricing-card');
    expect(report.identity.dataset.tier).toBe('pro');
  });

  it('construit un stableSelector basé sur #id quand disponible', () => {
    document.body.innerHTML = `<div id="unique-id"></div>`;
    const el = document.getElementById('unique-id')!;
    expect(inspectDOMElement(el).identity.stableSelector).toBe('#unique-id');
  });

  it('construit un stableSelector nth-of-type en repli sans id', () => {
    document.body.innerHTML = `<div id="parent"><span>a</span><span>b</span></div>`;
    const spans = document.querySelectorAll('#parent span');
    const secondSpan = spans[1] as HTMLElement;
    const selector = inspectDOMElement(secondSpan).identity.stableSelector;
    expect(selector).toContain('nth-of-type(2)');
  });
});

describe('inspectDOMElement — style calculé', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it("expose l'intégralité des propriétés calculées via allProperties (indépendant de cssText)", () => {
    document.body.innerHTML = `<button id="b" style="color: red; font-weight: bold;">x</button>`;
    const el = document.getElementById('b')!;
    const { allProperties } = inspectDOMElement(el).computedStyle;
    expect(Object.keys(allProperties).length).toBeGreaterThan(0);
    expect(allProperties.color).toBeTruthy();
  });

  it('regroupe les propriétés pertinentes par catégorie', () => {
    document.body.innerHTML = `<button id="b"></button>`;
    const el = document.getElementById('b')!;
    const { byCategory } = inspectDOMElement(el).computedStyle;
    expect(byCategory).toHaveProperty('boxModel');
    expect(byCategory).toHaveProperty('typography');
    expect(byCategory).toHaveProperty('layout');
    expect(byCategory).toHaveProperty('visual');
    expect(byCategory).toHaveProperty('interaction');
  });
});

describe('inspectDOMElement — cascade CSS', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('retrouve les règles de style dont le sélecteur matche l\'élément, avec spécificité et source', () => {
    document.body.innerHTML = `
      <style>#target { color: blue; } .shared { font-weight: bold; }</style>
      <button id="target" class="shared">x</button>
    `;
    const el = document.getElementById('target')!;
    const rules = inspectDOMElement(el).appliedCSSRules;

    const idRule = rules.find((r) => r.selector === '#target');
    const classRule = rules.find((r) => r.selector === '.shared');
    expect(idRule?.cssText).toContain('color');
    expect(classRule?.cssText).toContain('font-weight');
    expect(idRule?.specificity).toMatch(/^\d+,\d+,\d+$/);
  });

  it('ne fait pas échouer le rapport si une règle a un sélecteur non supporté par .matches()', () => {
    document.body.innerHTML = `<style>::-webkit-scrollbar { width: 4px; }</style><div id="d"></div>`;
    const el = document.getElementById('d')!;
    expect(() => inspectDOMElement(el)).not.toThrow();
  });
});

describe('inspectDOMElement — rédaction des champs sensibles', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('masque la valeur ET l\'attribut brut d\'un champ type="password"', () => {
    document.body.innerHTML = `<input id="pwd" type="password" value="hunter2" name="password" />`;
    const el = document.getElementById('pwd')! as HTMLInputElement;
    const report = inspectDOMElement(el);

    expect(report.content.formValue?.value).toBe('••••••');
    expect(report.content.formValue?.redacted).toBe(true);
    expect(report.identity.attributes.value).toBe('••••••');
  });

  it('masque un champ dont le nom évoque une donnée sensible même en type="text"', () => {
    document.body.innerHTML = `<input id="tok" type="text" value="abc123" name="api_token" />`;
    const el = document.getElementById('tok')! as HTMLInputElement;
    expect(inspectDOMElement(el).content.formValue?.redacted).toBe(true);
  });

  it('laisse passer la valeur d\'un champ normal', () => {
    document.body.innerHTML = `<input id="q" type="text" value="paris" name="search" />`;
    const el = document.getElementById('q')! as HTMLInputElement;
    const report = inspectDOMElement(el);
    expect(report.content.formValue?.value).toBe('paris');
    expect(report.content.formValue?.redacted).toBe(false);
  });
});

describe('inspectDOMElement — React best-effort', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('dégrade proprement (available: false) sans fiber React présent', () => {
    document.body.innerHTML = `<button id="b"></button>`;
    const el = document.getElementById('b')!;
    const react = inspectDOMElement(el).react;
    expect(react.available).toBe(false);
    expect(typeof react.reason).toBe('string');
  });

  it('détecte le composant propriétaire et sérialise les props via les expandos __reactFiber$*/__reactProps$*', () => {
    document.body.innerHTML = `<button id="b"></button>`;
    const el = document.getElementById('b')! as unknown as Record<string, unknown>;
    function SubmitButton() {}
    el['__reactFiber$test'] = { type: SubmitButton, return: null };
    el['__reactProps$test'] = { onClick: () => {}, label: 'Envoyer', children: 'texte' };

    const react = inspectDOMElement(el as unknown as Element).react;
    expect(react.available).toBe(true);
    expect(react.componentName).toBe('SubmitButton');
    expect((react.props as Record<string, unknown>).onClick).toBe('[Function]');
    expect(String((react.props as Record<string, unknown>).children)).toContain('omis');
  });

  it('ne lève jamais, même sur un fiber malformé', () => {
    document.body.innerHTML = `<button id="b"></button>`;
    const el = document.getElementById('b')! as unknown as Record<string, unknown>;
    el['__reactFiber$bad'] = { type: { get render() { throw new Error('boom'); } }, return: null };
    expect(() => inspectDOMElement(el as unknown as Element)).not.toThrow();
  });
});

describe('inspectDOMElement — métadonnées déclarées (ui-actions/observables)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _clearUIActionRegistry();
    _clearObservableRegistry();
  });

  it('retrouve la définition déclarée quand actionId correspond à une action enregistrée', () => {
    document.body.innerHTML = `<button id="b"></button>`;
    const el = document.getElementById('b')!;
    registerUIAction({ id: 'demo:submit', kind: 'click', label: 'Enregistrer', description: 'Sauvegarde.' }, el);

    const report = inspectDOMElement(el, 'demo:submit');
    expect(report.declaredMetadata.registeredAction?.id).toBe('demo:submit');
    expect(report.declaredMetadata.registeredAction?.description).toBe('Sauvegarde.');
  });

  it('retrouve la définition déclarée d\'un observable', () => {
    document.body.innerHTML = `<div id="table"></div>`;
    const el = document.getElementById('table')!;
    registerObservable(
      { id: 'demo:table', kind: 'table', label: 'Étudiants', description: 'Liste des étudiants.', getData: () => [] },
      el,
    );

    const report = inspectDOMElement(el, 'demo:table');
    expect(report.declaredMetadata.registeredObservable?.id).toBe('demo:table');
  });

  it('retourne null proprement quand rien n\'est déclaré', () => {
    document.body.innerHTML = `<div id="anonymous"></div>`;
    const el = document.getElementById('anonymous')!;
    const report = inspectDOMElement(el);
    expect(report.declaredMetadata.registeredAction).toBeNull();
    expect(report.declaredMetadata.registeredObservable).toBeNull();
  });
});

describe('inspectFullInterface', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('élague les div/span purement structurels sans identité ni texte propre', () => {
    document.body.innerHTML = `
      <div><div><div>
        <h1>Titre</h1>
        <div><button id="btn-a">Action</button></div>
        <div class="wrapper-vide"></div>
      </div></div></div>
    `;
    const report = inspectFullInterface();
    const emptyWrapperDivs = report.nodes.filter(
      (n) => n.identity.tagName === 'div' && !n.identity.id && !n.identity.attributes['data-testid'],
    );
    expect(emptyWrapperDivs.length).toBe(0);
    expect(report.nodes.some((n) => n.identity.tagName === 'h1')).toBe(true);
    expect(report.nodes.some((n) => n.identity.tagName === 'button')).toBe(true);
  });

  it('construit la hiérarchie parentNodeIndex correctement', () => {
    document.body.innerHTML = `<section id="parent"><button id="child">x</button></section>`;
    const report = inspectFullInterface();
    const parent = report.nodes.find((n) => n.identity.id === 'parent')!;
    const child = report.nodes.find((n) => n.identity.id === 'child')!;
    expect(child.parentNodeIndex).toBe(parent.nodeIndex);
  });

  it('respecte rootSelector pour scoper à une sous-arborescence', () => {
    document.body.innerHTML = `
      <div id="outside"><button id="outside-btn">x</button></div>
      <div id="scope"><button id="inside-btn">y</button></div>
    `;
    const report = inspectFullInterface('#scope');
    const ids = report.nodes.map((n) => n.identity.id);
    expect(ids).toContain('inside-btn');
    expect(ids).not.toContain('outside-btn');
  });

  it('tronque au-delà de la limite et le signale via truncated + totalMeaningfulNodesFound', () => {
    let html = '';
    for (let i = 0; i < 600; i++) html += `<button id="btn-${i}">${i}</button>`;
    document.body.innerHTML = html;

    const report = inspectFullInterface();
    expect(report.totalMeaningfulNodesFound).toBe(600);
    expect(report.nodes.length).toBeLessThan(600);
    expect(report.truncated).toBe(true);
  });
});
