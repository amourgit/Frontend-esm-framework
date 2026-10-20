import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _clearElementRefs } from './dom-utils.js';
import {
  cellText,
  childNodesOf,
  clip,
  createReadContext,
  describeField,
  describeTable,
  inlineText,
  inlineTextOfNodes,
  isCheckboxLike,
  isChecked,
  isFieldElement,
  isTableElement,
  renderTableRows,
  roleOf,
} from './text-extract.js';

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
const first = (html: string): Element => {
  document.body.innerHTML = html;
  return document.body.firstElementChild as Element;
};
const ctx = createReadContext();

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(RECT);
  _clearElementRefs();
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('contexte de lecture', () => {
  it('ignore balises techniques, data-ai-ignore et masqué (sauf includeHidden) ; met le résultat en cache', () => {
    document.body.innerHTML =
      '<script>1</script><style>a{}</style><template></template><p data-ai-ignore>x</p><p hidden>h</p><p>ok</p>';
    const read = createReadContext();
    const [script, style, template, ignored, hidden, ok] = Array.from(document.body.children);
    for (const e of [script, style, template, ignored, hidden]) expect(read.isIgnored(e)).toBe(true);
    expect(read.isIgnored(ok)).toBe(false);
    const all = createReadContext({ includeHidden: true });
    expect(all.isIgnored(hidden)).toBe(false);
    expect(all.isIgnored(ignored)).toBe(true); // data-ai-ignore reste toujours exclu
    const fresh = createReadContext();
    const spy = vi.spyOn(window, 'getComputedStyle');
    fresh.isHidden(ok);
    fresh.isHidden(ok);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("roleOf prend le premier rôle ; clip tronque avec une ellipse ; childNodesOf inclut le Shadow DOM d'abord", () => {
    expect(roleOf(first('<div role="Button link"></div>'))).toBe('button');
    expect(roleOf(first('<div></div>'))).toBeUndefined();
    expect(clip('abcdef', 4)).toBe('abc…');
    expect(clip('abc', 4)).toBe('abc');
    const host = first('<div>lumière</div>');
    host.attachShadow({ mode: 'open' }).innerHTML = '<b>ombre</b>';
    expect(childNodesOf(host).map((n) => n.textContent)).toEqual(['ombre', 'lumière']);
  });
});

describe('inlineText', () => {
  it('normalise les espaces, convertit liens et boutons, et masque les liens dangereux', () => {
    const p = first(
      '<p>Voir   <a href="/liste">la\n liste</a>, ou <button>Valider</button>.<br>Fin <a href="javascript:x()">piège</a> <a href="data:text/html,x">d</a></p>',
    );
    expect(inlineText(p, ctx)).toBe(
      'Voir [la liste](/liste) , ou ⟦Valider⟧ . Fin [piège]([lien masqué]) [d]([lien masqué])',
    );
    expect(inlineText(p, ctx, { links: false })).toContain('Voir la liste');
  });

  it('lien sans href : texte seul ; lien sans texte : nom accessible ; bouton icône : aria-label', () => {
    expect(inlineText(first('<p><a>nu</a></p>'), ctx)).toBe('nu');
    expect(inlineText(first('<p><a href="/x" aria-label="Accueil"><svg></svg></a></p>'), ctx)).toBe('[Accueil](/x)');
    expect(inlineText(first('<p><button aria-label="Fermer"></button></p>'), ctx)).toBe('⟦Fermer⟧');
    expect(inlineText(first('<p><role-x role="button">Cliquer</role-x></p>'), ctx)).toBe('⟦Cliquer⟧');
  });

  it('images et icônes nommées, cases à cocher, champs inline (valeur masquée si sensible)', () => {
    expect(
      inlineText(first('<p><img alt="Logo"><img alt=""><svg aria-label="Alerte"></svg><svg></svg></p>'), ctx),
    ).toBe('[img: Logo] [icône: Alerte]');
    expect(inlineText(first('<p><input type="checkbox" checked><input type="radio"></p>'), ctx)).toBe('☑ ☐');
    expect(
      inlineText(
        first(
          '<p><input aria-label="Nom" value="Ada"><select aria-label="Cl"><option selected>6e</option></select><input type="hidden" value="x"></p>',
        ),
        ctx,
      ),
    ).toBe('⟦Nom = Ada⟧ ⟦Cl = 6e⟧');
    expect(inlineText(first('<p><input type="password" aria-label="mdp" value="zzz"></p>'), ctx)).toBe(
      '⟦mdp = ••••••⟧',
    );
    expect(
      inlineText(
        first(
          '<section><div role="switch" aria-checked="true"></div><span role="checkbox" aria-checked="false"></span></section>',
        ),
        ctx,
      ),
    ).toBe('☑ ☐');
  });

  it('sépare les blocs par un espace, fusionne les éléments inline, ignore masqué et script', () => {
    expect(
      inlineText(
        first(
          '<div><div>Un</div><div>Deux</div><span>Trois</span><span>Quatre</span><script>x</script><i hidden>nope</i></div>',
        ),
        ctx,
      ),
    ).toBe('Un Deux TroisQuatre');
  });

  it('borne la longueur (maxTextLength) et lit le Shadow DOM', () => {
    expect(inlineText(first(`<p>${'mot '.repeat(100)}</p>`), createReadContext({ maxTextLength: 20 })).length).toBe(20);
    const host = first('<div></div>');
    host.attachShadow({ mode: 'open' }).innerHTML = "<span>dans l'ombre</span>";
    expect(inlineText(host, ctx)).toBe("dans l'ombre");
  });

  it('inlineTextOfNodes rend une suite de nœuds frères', () => {
    const p = first('<p>Début <b>gras</b> fin</p>');
    expect(inlineTextOfNodes(Array.from(p.childNodes), ctx)).toBe('Début gras fin');
  });
});

describe('champs', () => {
  it("reconnaît ce qui est un champ (et ce qui n'en est pas)", () => {
    expect(isFieldElement(first('<input>'))).toBe(true);
    expect(isFieldElement(first('<input type="hidden">'))).toBe(false);
    expect(isFieldElement(first('<select></select>'))).toBe(true);
    expect(isFieldElement(first('<div role="searchbox"></div>'))).toBe(true);
    expect(isFieldElement(first('<div contenteditable></div>'))).toBe(true);
    expect(isFieldElement(first('<div contenteditable="false"></div>'))).toBe(false);
    expect(isFieldElement(first('<p></p>'))).toBe(false);
    expect(isCheckboxLike(first('<input type="radio">'))).toBe(true);
    expect(isCheckboxLike(first('<input type="text">'))).toBe(false);
    expect(isChecked(first('<div role="checkbox" aria-checked="mixed"></div>'))).toBe('mixed');
    expect(isChecked(first('<div role="switch" aria-checked="true"></div>'))).toBe(true);
  });

  it('modèle complet : nom, type, valeur, options sélectionnées, drapeaux', () => {
    const select = describeField(
      first(
        '<select name="classe" aria-label="Classe" required><option value="a">A</option><option value="b" selected>B</option></select>',
      ),
      ctx,
    );
    expect(select).toMatchObject({
      tag: 'select',
      type: 'select',
      label: 'Classe',
      name: 'classe',
      value: 'B',
      required: true,
      options: [
        { label: 'A', value: 'a', selected: false },
        { label: 'B', value: 'b', selected: true },
      ],
    });
    const text = describeField(
      first('<input aria-label="Ville" aria-required="true" aria-readonly="true" value="Port-Gentil">'),
      ctx,
    );
    expect(text).toMatchObject({ type: 'text', value: 'Port-Gentil', required: true, readOnly: true });
    expect(describeField(first('<input type="password" aria-label="x" value="s">'), ctx)).toMatchObject({
      redacted: true,
      value: '••••••',
    });
    expect(describeField(first('<input type="checkbox" aria-label="ok" checked>'), ctx)).toMatchObject({
      type: 'checkbox',
      checked: true,
    });
  });

  it("erreur et aide : Carbon, role=alert voisin, aria-errormessage ; jamais d'erreur inventée", () => {
    document.body.innerHTML = `
      <div class="cds--form-item"><input id="a" class="cds--text-input cds--text-input--invalid" aria-label="A" value="x">
        <div class="cds--form-requirement">Champ invalide</div><div class="cds--form__helper-text">Aide Carbon</div></div>
      <div><input id="b" aria-label="B" aria-invalid="true"><div role="alert">Erreur alerte</div></div>
      <div><input id="c" aria-label="C"><div role="alert">Pas pour C</div></div>`;
    const get = (id: string) => describeField(document.getElementById(id) as Element, ctx);
    expect(get('a')).toMatchObject({ invalid: true, errorMessage: 'Champ invalide', helperText: 'Aide Carbon' });
    expect(get('b')).toMatchObject({ invalid: true, errorMessage: 'Erreur alerte' });
    const c = get('c');
    expect(c.invalid).toBeUndefined();
    expect(c.errorMessage).toBeUndefined();
  });
});

describe('tableaux', () => {
  const table = (rows: number, extra = '') =>
    first(
      `<table><thead><tr><th>N</th><th>V</th></tr></thead><tbody>${Array.from({ length: rows }, (_, i) => `<tr><td>L${i}</td><td>${i}</td></tr>`).join('')}</tbody>${extra}</table>`,
    );

  it('pagine par offset/limit et indique hasMore', () => {
    const t = table(10);
    expect(describeTable(t, ctx, { limit: 4 })).toMatchObject({ totalRows: 10, hasMore: true, offset: 0 });
    const last = describeTable(t, ctx, { offset: 8, limit: 4 });
    expect(last.rows).toEqual([
      ['L8', '8'],
      ['L9', '9'],
    ]);
    expect(last.hasMore).toBe(false);
    expect(describeTable(t, ctx, { offset: -5, limit: 0 })).toMatchObject({ offset: 0 });
  });

  it('lit le pied de tableau, une première ligne <th> sans <thead>, la sélection et ignore les lignes masquées', () => {
    expect(describeTable(table(1, '<tfoot><tr><td>Total</td><td>1</td></tr></tfoot>'), ctx).footer).toEqual([
      ['Total', '1'],
    ]);
    const noHead = first('<table><tr><th>Nom</th><th>Age</th></tr><tr><td>Ada</td><td>36</td></tr></table>');
    expect(describeTable(noHead, ctx)).toMatchObject({ headers: ['Nom', 'Age'], rows: [['Ada', '36']] });
    const selectable = first(
      '<table><thead><tr><th><input type="checkbox" aria-label="Tout"></th><th>Nom</th></tr></thead><tbody><tr><td><input type="checkbox"></td><td>x</td></tr></tbody></table>',
    );
    expect(describeTable(selectable, ctx).selectable).toBe(true);
    const hiddenRow = first(
      '<table><tbody><tr><td>vu</td></tr><tr style="display:none"><td>caché</td></tr></tbody></table>',
    );
    expect(describeTable(hiddenRow, ctx).rows).toEqual([['vu']]);
    expect(describeTable(hiddenRow, createReadContext({ includeHidden: true })).rows).toEqual([['vu'], ['caché']]);
  });

  it('ne mélange pas un tableau imbriqué avec son parent ; légende Carbon ; échappe les |', () => {
    const outer = first(
      '<table><tbody><tr><td>externe<table><tbody><tr><td>interne</td></tr></tbody></table></td></tr></tbody></table>',
    );
    expect(describeTable(outer, ctx).rows).toHaveLength(1);
    document.body.innerHTML =
      '<div class="cds--data-table-container"><h4 class="cds--data-table-header__title">Élèves</h4><table id="t"><tbody><tr><td>a|b</td></tr></tbody></table></div>';
    const t = document.getElementById('t') as Element;
    expect(describeTable(t, ctx).caption).toBe('Élèves');
    expect(cellText(t.querySelector('td') as Element, ctx)).toBe('a\\|b');
  });

  it('isTableElement ; rendu markdown avec en-têtes, séparateur, pied et colonnes manquantes complétées', () => {
    expect(isTableElement(first('<div role="grid"></div>'))).toBe(true);
    expect(isTableElement(first('<ul></ul>'))).toBe(false);
    const lines = renderTableRows({
      columns: 3,
      headers: ['A', 'B'],
      rows: [['1']],
      totalRows: 1,
      offset: 0,
      hasMore: false,
      footer: [['T']],
    });
    expect(lines).toEqual(['| A | B |  |', '| --- | --- | --- |', '| 1 |  |  |', '| T |  |  | (pied)']);
    expect(
      renderTableRows({ columns: 1, headers: [], rows: [['x']], totalRows: 1, offset: 0, hasMore: false }),
    ).toEqual(['| x |']);
  });
});
