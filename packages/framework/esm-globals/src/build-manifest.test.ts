import { describe, expect, it } from 'vitest';
import { validateBuildManifest } from './build-manifest';

const SRI = 'sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC';
const valid = () => ({
  shellVersion: '2.10.0',
  frameworkVersion: '4.0.0',
  protocolVersion: 1,
  apps: [
    { name: '@egen-civitas/esm-home-app', version: '9.0.2', integrity: SRI },
    { name: '@egen-civitas/esm-login-app', version: '1.0.0-next.3', integrity: 'sha256-abc123+/=' },
  ],
});

describe('validateBuildManifest', () => {
  it('accepte un manifeste valide et le restitue sans les champs inconnus', () => {
    const result = validateBuildManifest({
      ...valid(),
      futur: 'x',
      apps: valid().apps.map((a) => ({ ...a, extra: 1 })),
    });
    expect(result).toEqual({ valid: true, manifest: valid() });
  });

  it.each([
    ['null', null],
    ['tableau', []],
    ['chaîne', 'x'],
  ])('refuse une entrée non objet (%s)', (_l, value) => {
    expect(validateBuildManifest(value)).toEqual({ valid: false, errors: ['le manifeste doit être un objet'] });
  });

  it.each([
    ['shellVersion absent', { shellVersion: undefined }, /shellVersion/],
    ['shellVersion non semver', { shellVersion: '2.10' }, /shellVersion/],
    ['frameworkVersion non semver', { frameworkVersion: 'latest' }, /frameworkVersion/],
    ['protocolVersion 0', { protocolVersion: 0 }, /protocolVersion/],
    ['protocolVersion décimal', { protocolVersion: 1.5 }, /protocolVersion/],
    ['protocolVersion textuel', { protocolVersion: '1' }, /protocolVersion/],
    ['apps non tableau', { apps: {} }, /apps doit être un tableau/],
  ])('refuse : %s', (_l, patch, message) => {
    const result = validateBuildManifest({ ...valid(), ...patch });
    expect(result.valid).toBe(false);
    expect((result as { errors: string[] }).errors.join('|')).toMatch(message);
  });

  it.each([
    ['nom vide', { name: '' }, /name/],
    ['version avec plage (pas exacte)', { version: '^1.0.0' }, /version/],
    ['intégrité absente', { integrity: undefined }, /integrity/],
    ['intégrité md5', { integrity: 'md5-abc' }, /integrity/],
    ['intégrité sans empreinte', { integrity: 'sha256-' }, /integrity/],
  ])('refuse une app : %s', (_l, patch, message) => {
    const manifest = valid();
    manifest.apps[0] = { ...manifest.apps[0], ...patch } as never;
    const result = validateBuildManifest(manifest);
    expect(result.valid).toBe(false);
    expect((result as { errors: string[] }).errors.join('|')).toMatch(message);
  });

  it('refuse un nom d’app en double', () => {
    const manifest = valid();
    manifest.apps.push({ ...manifest.apps[0] });
    expect((validateBuildManifest(manifest) as { errors: string[] }).errors.join('|')).toMatch(/en double/);
  });

  it('refuse une app qui n’est pas un objet', () => {
    const result = validateBuildManifest({ ...valid(), apps: ['x', null] });
    expect((result as { errors: string[] }).errors).toEqual([
      'apps[0] doit être un objet',
      'apps[1] doit être un objet',
    ]);
  });

  it('liste TOUTES les erreurs en une fois et ne lève jamais', () => {
    const result = validateBuildManifest({ shellVersion: 1, frameworkVersion: 2, protocolVersion: 'x', apps: [{}] });
    expect(result.valid).toBe(false);
    expect((result as { errors: string[] }).errors.length).toBeGreaterThanOrEqual(6);
  });
});
