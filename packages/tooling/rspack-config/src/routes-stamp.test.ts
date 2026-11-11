import { describe, expect, it } from 'vitest';
import { resolveFrameworkRange, stampRoutes } from './routes-stamp';

describe('resolveFrameworkRange', () => {
  it('reprend la peerDependency sur esm-framework', () => {
    expect(resolveFrameworkRange({ '@egen-civitas/esm-framework': '>=3.0.0', react: '18.x' })).toBe('>=3.0.0');
    expect(resolveFrameworkRange({ '@egen-civitas/esm-framework': '^4.0.0' })).toBe('^4.0.0');
  });

  it.each([
    ['absente', { react: '18.x' }],
    ['plage invalide', { '@egen-civitas/esm-framework': 'pas une plage' }],
    ['valeur non textuelle', { '@egen-civitas/esm-framework': 5 as never }],
  ])('retourne undefined : %s', (_label, peers) => {
    expect(resolveFrameworkRange(peers)).toBeUndefined();
  });

  it('retourne undefined sans peerDependencies', () => {
    expect(resolveFrameworkRange(undefined)).toBeUndefined();
  });
});

describe('stampRoutes', () => {
  const source = JSON.stringify({ $schema: 'x', pages: [{ component: 'a', route: 'home' }] });

  it('ajoute version et frameworkRange en conservant le contenu source', () => {
    const stamped = JSON.parse(
      stampRoutes(source, { version: '9.0.2', peerDependencies: { '@egen-civitas/esm-framework': '>=3.0.0' } }),
    );
    expect(stamped).toEqual({
      $schema: 'x',
      pages: [{ component: 'a', route: 'home' }],
      version: '9.0.2',
      frameworkRange: '>=3.0.0',
    });
  });

  it("n'ajoute AUCUN champ frameworkRange quand il n'y a pas de plage valide (format historique)", () => {
    const stamped = JSON.parse(stampRoutes(Buffer.from(source), { version: '1.0.0', peerDependencies: {} }));
    expect(stamped).toEqual({ $schema: 'x', pages: [{ component: 'a', route: 'home' }], version: '1.0.0' });
    expect(stamped).not.toHaveProperty('frameworkRange');
  });

  it('écrase une version ou une plage déjà présentes dans le source (la valeur du build fait foi)', () => {
    const withOld = JSON.stringify({ version: '0.0.0', frameworkRange: '^1.0.0' });
    const stamped = JSON.parse(
      stampRoutes(withOld, { version: '2.0.0', peerDependencies: { '@egen-civitas/esm-framework': '^4.0.0' } }),
    );
    expect(stamped).toMatchObject({ version: '2.0.0', frameworkRange: '^4.0.0' });
  });
});
