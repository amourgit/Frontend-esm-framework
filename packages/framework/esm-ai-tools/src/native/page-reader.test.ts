import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _clearElementRefs, resolveElementRef } from './dom-utils.js';
import { readPage, buildOutline, renderOutline } from './page-reader.js';

/** happy-dom ne calcule aucune géométrie : on donne une taille non nulle à tous les éléments. */
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
  <header><nav aria-label="Principal"><a href="/home">Accueil</a><a href="/students">Étudiants</a></nav></header>
  <main>
    <h1>Tableau de bord</h1>
    <p>Bienvenue <b>Samuel</b>, voici l'état du jour.</p>
    <div class="cds--tile">
      <h3>Effectif</h3>
      <span class="card__subtitle">Année 2026</span>
      <p>1 245 étudiants actifs</p>
      <a href="/students">Voir la liste</a>
    </div>
    <table>
      <caption>Étudiants</caption>
      <thead><tr><th>Nom</th><th aria-sort="ascending">Classe</th></tr></thead>
      <tbody><tr><td>Ada</td><td>6e</td></tr><tr><td>Bob</td><td><a href="/c/5e">5e</a></td></tr></tbody>
    </table>
    <form aria-label="Recherche">
      <label for="q">Nom</label><input id="q" value="ada" required>
      <input type="password" value="s3cret-pass" aria-label="Mot de passe">
      <input type="hidden" name="csrf" value="csrf-token-123">
      <select aria-label="Classe"><option>6e</option><option selected>5e</option></select>
      <input type="checkbox" id="c1" checked><label for="c1">Actif</label>
      <button disabled>Envoyer</button>
    </form>
    <ul><li>Premier</li><li>Second <a href="/x">lien</a></li></ul>
    <dl><dt>Ville</dt><dd>Libreville</dd></dl>
    <img src="/logo.png" alt="Logo EGEN"><img src="/deco.png" alt="">
    <div style="display:none">Contenu caché</div>
    <div hidden>Aussi caché</div>
    <div data-ai-ignore>Panneau assistant</div>
    <script>var secret = 'script-content';</script>
    <style>.a { color: red }</style>
  </main>`;

describe('readPage', () => {
  beforeEach(() => {
    document.body.innerHTML = FIXTURE;
    mockLayout();
    _clearElementRefs();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('produit un plan structuré avec landmarks, titres, texte et liens', () => {
    const { outline } = readPage();
    expect(outline).toContain('- navigation "Principal"');
    expect(outline).toContain('- link "Accueil"');
    expect(outline).toContain('→ /home');
    expect(outline).toContain('- heading[1] "Tableau de bord"');
    expect(outline).toContain("- text: Bienvenue Samuel, voici l'état du jour.");
  });

  it('reconnaît une carte Carbon et déduit les rôles de texte', () => {
    const { outline } = readPage();
    expect(outline).toMatch(/- card .*\(carbon: tile\)/);
    expect(outline).toContain('- text(subtitle): Année 2026');
    expect(outline).toContain('- text: 1 245 étudiants actifs');
    expect(outline).toContain('- link "Voir la liste"');
  });

  it('lit les tableaux : légende, dimensions, tri, lignes et liens de cellule', () => {
    const { outline } = readPage();
    expect(outline).toContain('- table "Étudiants"');
    expect(outline).toContain('(2 lignes × 2 colonnes, trié par Classe ↑)');
    expect(outline).toContain('| Nom | Classe |');
    expect(outline).toContain('| Ada | 6e |');
    expect(outline).toContain('| Bob | [5e](/c/5e) |');
  });

  it('lit les champs avec valeur, options, état — sans jamais exposer un secret', () => {
    const { outline } = readPage();
    expect(outline).toContain('field[text] "Nom" {');
    expect(outline).toContain('= "ada"');
    expect(outline).toContain('requis');
    expect(outline).toContain('options: 6e | *5e');
    expect(outline).toContain('field[checkbox] "Actif"');
    expect(outline).toContain('= coché');
    expect(outline).toContain('- button "Envoyer"');
    expect(outline).toContain('[disabled]');
    expect(outline).toContain('= "••••••"');
    expect(outline).not.toContain('s3cret-pass');
    expect(outline).not.toContain('csrf-token-123');
  });

  it('lit listes, définitions et images (décoratives ignorées)', () => {
    const { outline } = readPage();
    expect(outline).toContain('- list');
    expect(outline).toContain('- item: Premier');
    expect(outline).toContain('- item: Second [lien](/x)');
    expect(outline).toContain('- definition: Ville: Libreville');
    expect(outline).toContain('- image "Logo EGEN"');
    expect(outline).not.toContain('deco.png');
  });

  it('ignore le contenu masqué, les scripts, les styles et data-ai-ignore', () => {
    const { outline } = readPage();
    expect(outline).not.toContain('Contenu caché');
    expect(outline).not.toContain('Aussi caché');
    expect(outline).not.toContain('Panneau assistant');
    expect(outline).not.toContain('script-content');
    expect(outline).not.toContain('color: red');
  });

  it('includeHidden révèle le contenu masqué (et le signale)', () => {
    const { outline } = readPage({ includeHidden: true });
    expect(outline).toContain('Contenu caché');
    expect(outline).not.toContain('Panneau assistant');
  });

  it('les références résolvent vers le bon élément et restent stables', () => {
    const first = readPage();
    const ref = /heading\[1\] "Tableau de bord" \{(e\d+)\}/.exec(first.outline)?.[1] as string;
    expect(resolveElementRef(ref)?.textContent).toBe('Tableau de bord');
    const second = readPage();
    expect(second.outline).toContain(`{${ref}}`);
  });

  it('pagine par lignes et indique nextOffset', () => {
    const full = readPage();
    expect(full.lines.nextOffset).toBeNull();
    const part = readPage({ maxChars: 1000 });
    document.body.innerHTML = Array.from({ length: 300 }, (_, i) => `<p>Paragraphe numéro ${i} avec du texte</p>`).join(
      '',
    );
    const long = readPage({ maxChars: 1000 });
    expect(long.lines.nextOffset).not.toBeNull();
    const next = readPage({ maxChars: 1000, offset: long.lines.nextOffset as number });
    expect(next.outline.split('\n')[0]).not.toBe(long.outline.split('\n')[0]);
    expect(long.notes.join(' ')).toContain('offset=');
    expect(part.lines.total).toBeGreaterThan(0);
  });

  it('cible une sous-arborescence et la lit comme un composant', () => {
    const tile = document.querySelector('.cds--tile') as Element;
    const { outline } = readPage({ root: tile });
    expect(outline.startsWith('- card')).toBe(true);
    expect(outline).toContain('Voir la liste');
    expect(outline).not.toContain('Tableau de bord');
  });

  it('aperçu de tableau borné, avec renvoi vers read_table', () => {
    document.body.innerHTML =
      '<table><thead><tr><th>N</th></tr></thead><tbody>' +
      Array.from({ length: 40 }, (_, i) => `<tr><td>L${i}</td></tr>`).join('') +
      '</tbody></table>';
    const { outline } = readPage();
    expect(outline).toContain('(40 lignes × 1 colonnes)');
    expect(outline).toContain('| L14 |');
    expect(outline).not.toContain('| L15 |');
    expect(outline).toMatch(/25 lignes de plus — read_table ref=e\d+ offset=15/);
  });

  it('garde-fou : signale truncated quand maxNodes est atteint', () => {
    document.body.innerHTML = Array.from({ length: 50 }, (_, i) => `<p>p${i}</p>`).join('');
    const build = buildOutline(document.body, { maxNodes: 10 });
    expect(build.truncated).toBe(true);
    expect(readPage({ maxNodes: 10 }).notes.join(' ')).toContain('Garde-fou');
  });

  it('lit le Shadow DOM ouvert', () => {
    document.body.innerHTML = '<div id="host"></div>';
    const host = document.getElementById('host') as HTMLElement;
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<h2>Titre interne</h2><p>Contenu du composant web</p>';
    const { outline } = readPage();
    expect(outline).toContain('heading[2] "Titre interne"');
    expect(outline).toContain('Contenu du composant web');
  });

  it('rend un plan vide avec une note explicite', () => {
    document.body.innerHTML = '';
    const result = readPage();
    expect(result.outline).toBe('');
    expect(result.notes.join(' ')).toContain('Aucun contenu lisible');
  });

  it('renderOutline est pur : deux rendus du même plan sont identiques', () => {
    const { nodes } = buildOutline(document.body);
    expect(renderOutline(nodes)).toEqual(renderOutline(nodes));
  });
});
