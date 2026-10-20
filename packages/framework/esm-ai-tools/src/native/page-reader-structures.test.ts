import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _clearElementRefs } from './dom-utils.js';
import { buildOutline, readPage } from './page-reader.js';
import { _clearObservableRegistry, registerObservable } from '../observables.js';
import { _clearUIActionRegistry, registerUIAction } from '../ui-actions.js';

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
const mockLayout = (override?: (el: Element) => Partial<DOMRect> | undefined) =>
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return { ...RECT, ...(override?.(this) ?? {}) } as DOMRect;
  });

const outlineOf = (html: string, options = {}) => {
  document.body.innerHTML = html;
  return readPage(options).outline;
};

beforeEach(() => {
  mockLayout();
  _clearElementRefs();
});
afterEach(() => {
  vi.restoreAllMocks();
  _clearObservableRegistry();
  _clearUIActionRegistry();
  document.body.innerHTML = '';
});

describe('états et indications portés par les nœuds', () => {
  it('reporte les états ARIA : sélectionné, courant, déplié/replié, pressé, occupé, désactivé', () => {
    const out = outlineOf(`
      <div role="tablist" aria-label="Onglets">
        <button role="tab" aria-selected="true">Général</button>
        <button role="tab" aria-selected="false" aria-disabled="true">Avancé</button>
      </div>
      <a href="/a" aria-current="page">Accueil</a>
      <button aria-expanded="true">Menu ouvert</button>
      <button aria-expanded="false">Menu fermé</button>
      <button aria-pressed="true">Gras</button>
      <div class="widget" aria-busy="true"><p>Chargement…</p></div>`);
    expect(out).toMatch(/- item \[selected\]: Général/);
    expect(out).toMatch(/- item \[disabled\]: Avancé/);
    expect(out).toMatch(/- link "Accueil" \{e\d+\} → \/a \[current\]/);
    expect(out).toMatch(/- button "Menu ouvert" \{e\d+\} \[expanded\]/);
    expect(out).toMatch(/- button "Menu fermé" \{e\d+\} \[collapsed\]/);
    expect(out).toMatch(/- button "Gras" \{e\d+\} \[pressed\]/);
    expect(out).toMatch(/\[busy\]/);
  });

  it('signale hors-fenêtre (offscreen) et zone défilante (scrollable) sans toucher au contenu', () => {
    document.body.innerHTML = `
      <div class="panel" id="off"><h2>Bas de page</h2></div>
      <div class="panel" id="scroll" style="overflow-y:auto"><h2>Liste</h2></div>`;
    vi.restoreAllMocks();
    mockLayout((el) => (el.id === 'off' ? { top: 5000, bottom: 5020 } : undefined));
    const scroller = document.getElementById('scroll') as HTMLElement;
    Object.defineProperty(scroller, 'scrollHeight', { value: 900, configurable: true });
    Object.defineProperty(scroller, 'clientHeight', { value: 200, configurable: true });
    const out = readPage().outline;
    expect(out).toMatch(/- panel .*\{e\d+\} \[offscreen\]/);
    expect(out).toMatch(/- panel .*\[scrollable\]/);
    expect(out).toContain('heading[2] "Bas de page"');
  });

  it('includeHidden marque ce qui est masqué avec [hidden]', () => {
    const out = outlineOf('<main><div class="card" style="display:none"><h3>Secret</h3></div></main>', {
      includeHidden: true,
    });
    expect(out).toMatch(/- card .*\[hidden\]/);
    expect(out).toContain('Secret');
  });

  it("un <details> fermé est signalé replié et son contenu n'est pas lu ; ouvert, il l'est", () => {
    const closed = outlineOf('<details><summary>Plus</summary><p>Contenu caché par défaut</p></details>');
    expect(closed).toMatch(/- accordion "Plus" \{e\d+\} \[collapsed\]/);
    expect(closed).not.toContain('Contenu caché par défaut');
    const open = outlineOf('<details open><summary>Plus</summary><p>Visible</p></details>');
    expect(open).toContain('Visible');
  });
});

describe('titres, rôles ARIA et médias', () => {
  it('lit role=heading avec aria-level (borné 1–6, défaut 2), role=link, role=button, role=img', () => {
    const out = outlineOf(`
      <div role="heading" aria-level="4">Niveau quatre</div>
      <div role="heading" aria-level="9">Niveau invalide</div>
      <div role="heading">Sans niveau</div>
      <span role="link" tabindex="0">Lien ARIA</span>
      <div role="button">Bouton ARIA</div>
      <div role="img" aria-label="Graphique des notes"></div>`);
    expect(out).toContain('heading[4] "Niveau quatre"');
    expect(out).toContain('heading[2] "Niveau invalide"');
    expect(out).toContain('heading[2] "Sans niveau"');
    expect(out).toMatch(/- link "Lien ARIA"/);
    expect(out).toMatch(/- button "Bouton ARIA"/);
    expect(out).toContain('- image "Graphique des notes"');
  });

  it('lit un SVG nommé, ignore un SVG décoratif ; vidéo/audio/canvas deviennent des médias', () => {
    const out = outlineOf(`
      <svg aria-label="Logo vectoriel"></svg><svg></svg>
      <video aria-label="Présentation" src="/v.mp4"></video>
      <audio controls style="display:inline-block" title="Podcast" src="/a.mp3"></audio>
      <canvas aria-label="Courbe"></canvas>`);
    expect(out).toContain('- image "Logo vectoriel"');
    expect(out).toContain('- media[video] "Présentation"');
    expect(out).toContain('src=/v.mp4');
    expect(out).toContain('- media[audio] "Podcast"');
    expect(out).toContain('- media[canvas] "Courbe"');
    expect(out.match(/- image/g)).toHaveLength(1);
  });

  it('abrège les sources : URL de data: résumée, URL très longue tronquée', () => {
    const long = `/img/${'x'.repeat(400)}.png`;
    const out = outlineOf(
      `<img alt="Inline" src="data:image/png;base64,${'A'.repeat(500)}"><img alt="Longue" src="${long}">`,
    );
    expect(out).toMatch(/- image "Inline" \{e\d+\} src=data:image\/png;base64…\(\d+ car\.\)/);
    expect(out).not.toContain('AAAAAAAAAA');
    const longLine = out.split('\n').find((l) => l.includes('"Longue"')) as string;
    expect(longLine.length).toBeLessThan(300);
    expect(longLine).toContain('…');
  });

  it('un lien ou un bouton « enveloppe » (carte cliquable) expose son contenu en enfants', () => {
    const out = outlineOf(`
      <a href="/classes/1"><div><h3>Terminale</h3><p>32 élèves</p></div></a>
      <button><div><span>Enregistrer</span><small>Ctrl+S</small></div></button>`);
    expect(out).toMatch(/- link "Terminale 32 élèves" \{e\d+\} → \/classes\/1/);
    expect(out).toMatch(/\n {2}- heading\[3\] "Terminale"/);
    expect(out).toMatch(/\n {2}- text: 32 élèves/);
    expect(out).toMatch(/- button "Enregistrer\s?Ctrl\+S"/);
  });

  it('un <picture> seul est lu comme son <img>, et un lien sans href reste du texte', () => {
    const out = outlineOf(
      '<picture><source srcset="/a.webp"><img src="/a.png" alt="Photo"></picture><a>pas un lien</a>',
    );
    expect(out).toContain('- image "Photo"');
    expect(out).toContain('- text: pas un lien');
  });
});

describe('iframes', () => {
  it("lit le contenu d'une iframe de même origine", () => {
    document.body.innerHTML = '<iframe title="Aide" src="/aide"></iframe>';
    const frame = document.querySelector('iframe') as HTMLIFrameElement;
    const doc = document.implementation.createHTMLDocument('aide');
    doc.body.innerHTML = "<h1>Page d'aide</h1><p>Texte de l'iframe</p>";
    Object.defineProperty(frame, 'contentDocument', { value: doc, configurable: true });
    const out = readPage().outline;
    expect(out).toMatch(/- iframe "Aide" \{e\d+\} src=\/aide/);
    expect(out).toContain('heading[1] "Page d\'aide"');
    expect(out).toContain("Texte de l'iframe");
  });

  it('signale une iframe inaccessible (cross-origin) sans planter', () => {
    document.body.innerHTML = '<iframe src="https://autre.example/x"></iframe>';
    const frame = document.querySelector('iframe') as HTMLIFrameElement;
    Object.defineProperty(frame, 'contentDocument', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
      configurable: true,
    });
    const out = readPage().outline;
    expect(out).toMatch(/- iframe \{e\d+\} src=https:\/\/autre\.example\/x \[cross-origin\]/);
  });
});

describe('listes et définitions', () => {
  it("liste sans <li> : repli sur le contenu ; liste vide : rien d'émis", () => {
    expect(outlineOf('<ul><div>Entrée A</div><div>Entrée B</div></ul>')).toMatch(/- list[\s\S]*- text: Entrée A/);
    expect(outlineOf('<ul></ul><p>Fin</p>')).not.toContain('- list');
  });

  it('élément de liste structuré (sous-liste, blocs) : enfants récursifs ; item vide ignoré', () => {
    const out = outlineOf(`
      <ul>
        <li>Parent<ul><li>Enfant 1</li><li>Enfant 2</li></ul></li>
        <li><div><h4>Titre d'item</h4></div></li>
        <li></li>
      </ul>`);
    expect(out).toContain('- list');
    expect(out).toMatch(/- item\n? *\n?/);
    expect(out).toContain('- item: Enfant 1');
    expect(out).toContain('- item: Enfant 2');
    expect(out).toContain('heading[4] "Titre d\'item"');
    expect(out.match(/- item/g)!.length).toBeGreaterThanOrEqual(4);
  });

  it('plafonne les éléments de liste et indique combien ne sont pas affichés', () => {
    document.body.innerHTML = `<ul>${Array.from({ length: 12 }, (_, i) => `<li>E${i}</li>`).join('')}</ul>`;
    const { nodes } = buildOutline(document.body, { maxListItems: 5 });
    expect(nodes[0].children).toHaveLength(6);
    expect(nodes[0].children[5].text).toContain('+7 éléments non affichés');
    expect(readPage({ maxListItems: 5 }).outline).toContain('… +7 éléments non affichés');
  });

  it('rôles listbox/option et menu/menuitem sont des listes', () => {
    const out = outlineOf(`
      <div role="listbox" aria-label="Classes"><div role="option" aria-selected="true">6e</div><div role="option">5e</div></div>
      <div role="menu"><div role="menuitem">Copier</div></div>`);
    expect(out).toContain('- list "Classes"');
    expect(out).toContain('- item [selected]: 6e');
    expect(out).toContain('- item: Copier');
  });

  it('<dl> : plusieurs définitions pour un terme, plusieurs termes', () => {
    const out = outlineOf('<dl><dt>Langues</dt><dd>Français</dd><dd>Anglais</dd><dt>Pays</dt><dd>Gabon</dd></dl>');
    expect(out).toContain('- definition: Langues: Français; Anglais');
    expect(out).toContain('- definition: Pays: Gabon');
  });
});

describe('champs : toutes les variantes de rendu', () => {
  it('case indéterminée, placeholder, textarea, contenteditable, champ ARIA personnalisé', () => {
    const out = outlineOf(`
      <div role="checkbox" aria-checked="mixed" aria-label="Tout"></div>
      <input aria-label="Ville" placeholder="Libreville">
      <textarea aria-label="Note">Observation</textarea>
      <div contenteditable="true" aria-label="Éditeur">Texte riche</div>
      <div role="combobox" aria-label="Pays" aria-valuetext="Gabon"></div>
      <div role="slider" aria-label="Volume" aria-valuenow="7"></div>`);
    expect(out).toContain('field[checkbox] "Tout"');
    expect(out).toContain('= indéterminé');
    expect(out).toMatch(/field\[text\] "Ville" \{e\d+\} \(placeholder: "Libreville"\)/);
    expect(out).toContain('field[textarea] "Note"');
    expect(out).toContain('= "Observation"');
    expect(out).toContain('"Éditeur"');
    expect(out).toContain('= "Texte riche"');
    expect(out).toContain('field[combobox] "Pays"');
    expect(out).toContain('= "Gabon"');
    expect(out).toContain('field[slider] "Volume"');
    expect(out).toContain('= "7"');
  });

  it('rend erreur, aide, requis, désactivé, lecture seule et options tronquées', () => {
    const options = Array.from({ length: 40 }, (_, i) => `<option>Option ${i}</option>`).join('');
    const out = outlineOf(`
      <div class="cds--form-item">
        <label for="mail">Courriel</label>
        <input id="mail" type="email" value="x" aria-invalid="true" aria-describedby="aide" aria-errormessage="err" required>
        <div id="aide">Format : nom@domaine.ga</div>
        <div id="err">Adresse invalide</div>
      </div>
      <input aria-label="Figé" value="v" disabled><input aria-label="Lu" value="v" readonly>
      <select aria-label="Choix">${options}</select>`);
    expect(out).toMatch(
      /field\[email\] "Courriel".* = "x" \[requis, invalide\] erreur: "Adresse invalide" aide: "Format : nom@domaine\.ga"/,
    );
    expect(out).toMatch(/field\[text\] "Figé".*\[disabled, désactivé\]/);
    expect(out).toMatch(/field\[text\] "Lu".*lecture seule/);
    expect(out).toContain('| …');
    const choice = out.split('\n').find((l) => l.includes('"Choix"')) as string;
    expect(choice.split('options:')[1].match(/Option \d+/g)).toHaveLength(30);
  });

  it("un <label> qui enveloppe son champ n'est pas dupliqué en texte", () => {
    const out = outlineOf('<label>Accepter les conditions <input type="checkbox"></label>');
    expect(out).toContain('field[checkbox] "Accepter les conditions"');
    expect(out).not.toContain('- text: Accepter');
  });
});

describe("déclarations de l'app rattachées à ce qui est lu", () => {
  it('étiquette les éléments déclarés (action et observable) et crée un composant pour un conteneur déclaré sans identité', () => {
    document.body.innerHTML = `
      <div id="zone"><p>Contenu métier</p></div>
      <button id="save">Enregistrer</button>`;
    registerObservable(
      {
        id: 'zone-notes',
        kind: 'table',
        label: 'Zone des notes',
        description: 'Notes',
        state: 'ready',
        getData: () => ({}),
      },
      document.getElementById('zone') as HTMLElement,
    );
    registerUIAction(
      { id: 'save-btn', kind: 'click', label: 'Enregistrer', description: 'Sauvegarde' },
      document.getElementById('save') as HTMLElement,
    );
    const out = readPage().outline;
    expect(out).toMatch(/- table "Zone des notes" \{e\d+\} \(déclaré: zone-notes\)/);
    expect(out).toContain('Contenu métier');
    expect(out).toMatch(/- button "Enregistrer" \{e\d+\} \(déclaré: save-btn\)/);
    const { nodes } = buildOutline(document.body);
    const button = nodes.find((n) => n.kind === 'button');
    expect(button?.declared).toMatchObject({ id: 'save-btn', source: 'action' });
  });
});

describe("lecture d'un conteneur unique et limites", () => {
  it('un wrapper sans identité lu directement expose son contenu au même niveau', () => {
    document.body.innerHTML = '<div id="w"><p>Un</p><p>Deux</p></div>';
    const outline = readPage({ root: document.getElementById('w') as Element }).outline;
    expect(outline.split('\n')).toEqual(['- text: Un', '- text: Deux']);
  });

  it('offset au-delà du plan : plan vide mais cohérent', () => {
    document.body.innerHTML = '<p>Seul</p>';
    const result = readPage({ offset: 99 });
    expect(result.outline).toBe('');
    expect(result.lines).toMatchObject({ total: 1, offset: 1, returned: 0, nextOffset: null });
  });

  it("plafonne la profondeur d'imbrication sans exploser la pile", () => {
    document.body.innerHTML = `${'<div>'.repeat(300)}<p>Au fond</p>${'</div>'.repeat(300)}`;
    expect(() => readPage()).not.toThrow();
  });

  it('un texte très long est tronqué à maxTextLength', () => {
    document.body.innerHTML = `<p>${'mot '.repeat(2000)}</p>`;
    const { nodes } = buildOutline(document.body, { maxTextLength: 100 });
    expect(nodes[0].text!.length).toBeLessThanOrEqual(100);
    expect(nodes[0].text!.endsWith('…')).toBe(true);
  });
});
