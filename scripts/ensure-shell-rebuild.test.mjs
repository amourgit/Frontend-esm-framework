import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bundledBy, missingShellChangeset, packagesOf } from './ensure-shell-rebuild.mjs';

const SHELL = '@egen-civitas/esm-app-shell';
const bundled = ['@egen-civitas/esm-framework', '@egen-civitas/esm-styleguide'];
const cs = (...names) => `---\n${names.map((n) => `'${n}': minor`).join('\n')}\n---\n\nTexte.\n`;

test('lit les paquets cités dans un changeset (quotes simples, doubles ou absentes)', () => {
  assert.deepEqual(packagesOf(`---\n'a/b': patch\n"c": minor\nd: major\n---\ntexte`), ['a/b', 'c', 'd']);
  assert.deepEqual(packagesOf('pas de front-matter'), []);
});

test('les paquets embarqués sont les dépendances @egen-civitas du shell, hors lui-même', () => {
  const pkg = {
    name: SHELL,
    dependencies: { '@egen-civitas/esm-framework': '^3', react: '^18' },
    devDependencies: { '@egen-civitas/esm-styleguide': '^3' },
  };
  assert.deepEqual(bundledBy(pkg).sort(), bundled);
});

test('un paquet embarqué change sans le shell : changeset ajouté, avec la cause', () => {
  const t = missingShellChangeset({ shellName: SHELL, bundled, changesets: [cs('@egen-civitas/esm-styleguide')] });
  assert.match(t, /'@egen-civitas\/esm-app-shell': patch/);
  assert.match(t, /esm-styleguide/);
  assert.doesNotMatch(t, /esm-framework/);
});

test('le shell est déjà dans un changeset : rien à ajouter', () => {
  assert.equal(
    missingShellChangeset({ shellName: SHELL, bundled, changesets: [cs('@egen-civitas/esm-styleguide'), cs(SHELL)] }),
    null,
  );
});

test('aucun paquet embarqué ne change : rien à ajouter', () => {
  assert.equal(missingShellChangeset({ shellName: SHELL, bundled, changesets: [cs('@egen-civitas/esm-cli')] }), null);
  assert.equal(missingShellChangeset({ shellName: SHELL, bundled, changesets: [] }), null);
});
