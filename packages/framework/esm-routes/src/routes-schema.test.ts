// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..');
const schema = JSON.parse(readFileSync(join(root, 'schema', 'routes.schema.json'), 'utf8'));
const validate = new Ajv({ strict: true, strictRequired: false, allowUnionTypes: true, allErrors: true }).compile(
  schema,
);

const errorsOf = (value: unknown) => {
  validate(value);
  return (validate.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`).join(' | ');
};

describe('routes.schema.json', () => {
  it('est un schéma valide (mode strict) et expose les clés du contrat EgenAppRoutes', () => {
    expect(Object.keys(schema.properties).sort()).toEqual(
      [
        '$schema',
        'version',
        'frameworkRange',
        'platforms',
        'requiredCapabilities',
        'backendDependencies',
        'optionalBackendDependencies',
        'pages',
        'extensions',
        'featureFlags',
        'modals',
        'workspaces',
        'workspaceGroups',
        'workspaceGroups2',
        'workspaceWindows2',
        'workspaces2',
      ].sort(),
    );
  });

  describe('routes.json réels du core', () => {
    const fixtures = readdirSync(join(__dirname, '__fixtures__')).filter((f) => f.endsWith('.routes.json'));

    it('au moins 3 fixtures réelles', () => {
      expect(fixtures.length).toBeGreaterThanOrEqual(3);
    });

    it.each(fixtures)('%s est valide', (file) => {
      const value = JSON.parse(readFileSync(join(__dirname, '__fixtures__', file), 'utf8'));
      expect(errorsOf(value)).toBe('');
    });

    it.each(fixtures)('%s reste valide une fois estampillé (version, frameworkRange)', (file) => {
      const value = JSON.parse(readFileSync(join(__dirname, '__fixtures__', file), 'utf8'));
      expect(errorsOf({ ...value, version: '9.0.2', frameworkRange: '>=3.0.0' })).toBe('');
    });
  });

  describe('contrat multiplateforme', () => {
    it('accepte platforms, requiredCapabilities, frameworkRange et une app vide', () => {
      expect(
        errorsOf({
          platforms: ['android', 'ios'],
          requiredCapabilities: ['camera', 'secureStorage'],
          frameworkRange: '^4.0.0',
        }),
      ).toBe('');
      expect(errorsOf({})).toBe('');
      expect(errorsOf({ platforms: [] })).toBe('');
    });

    it.each([
      ['plateforme inconnue', { platforms: ['windows'] }, /platforms\/0/],
      ['plateforme en double', { platforms: ['ios', 'ios'] }, /platforms/],
      ['platforms non tableau', { platforms: 'ios' }, /platforms/],
      ['capacité mal formée', { requiredCapabilities: ['camera;drop'] }, /requiredCapabilities\/0/],
      ['requiredCapabilities non tableau', { requiredCapabilities: 'camera' }, /requiredCapabilities/],
      ['frameworkRange non textuel', { frameworkRange: 4 }, /frameworkRange/],
    ])('refuse : %s', (_label, value, message) => {
      expect(errorsOf(value)).toMatch(message);
    });
  });

  describe('structure', () => {
    it.each([
      ['clé inconnue au sommet (faute de frappe « platform »)', { platform: ['ios'] }, /additional properties/],
      ['page sans route ni routeRegex', { pages: [{ component: 'a' }] }, /oneOf|must match exactly one/],
      [
        'page avec route ET routeRegex',
        { pages: [{ component: 'a', route: 'x', routeRegex: 'y' }] },
        /must match exactly one/,
      ],
      ['page sans component', { pages: [{ route: 'x' }] }, /component/],
      ['online non booléen', { pages: [{ component: 'a', route: 'x', online: 'oui' }] }, /online/],
      ['extension sans component', { extensions: [{ name: 'e' }] }, /component/],
      [
        'extension : clé inconnue',
        { extensions: [{ name: 'e', component: 'c', slott: 's' }] },
        /additional properties/,
      ],
      ['workspace sans groups', { workspaces: [{ name: 'w', title: 't', type: 'x', component: 'c' }] }, /groups/],
      ['workspace2 sans window', { workspaces2: [{ name: 'w', component: 'c' }] }, /window/],
      ['persistance inconnue', { workspaceGroups2: [{ name: 'g', persistence: 'jamais' }] }, /persistence/],
      ['featureFlag incomplet', { featureFlags: [{ flagName: 'f' }] }, /label|description/],
    ])('refuse : %s', (_label, value, message) => {
      expect(errorsOf(value)).toMatch(message);
    });

    it('accepte les formes valides des autres définitions', () => {
      expect(
        errorsOf({
          optionalBackendDependencies: {
            mod: '^1.0.0',
            autre: { version: '2.x', feature: { flagName: 'f', label: 'l', description: 'd' } },
          },
          extensions: [
            { name: 'e', slots: ['a', 'b'], component: 'c', privileges: ['p1', 'p2'], meta: { topbar: { level: 1 } } },
          ],
          pages: [
            { component: 'a', routeRegex: '^x', online: true, offline: false, containerDomId: 'id' },
            { component: 'b', route: true },
          ],
          workspaceGroups: [{ name: 'g', members: ['w'] }],
          workspaceWindows2: [{ name: 'win', group: 'g', width: 'wider', order: 1 }],
        }),
      ).toBe('');
    });
  });
});
