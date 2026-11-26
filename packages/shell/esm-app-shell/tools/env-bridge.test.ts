import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { assertSafeBridgeKeys, FORBIDDEN_BRIDGE_KEY, ALLOWED_BRIDGE_KEYS } = require('./env-bridge');

const config = readFileSync(resolve(__dirname, '../rspack.config.js'), 'utf8');

describe('assertSafeBridgeKeys (G1)', () => {
  it.each([
    'EGEN_TENANT_SECRET',
    'EGEN_DEV_TOKEN',
    'EGEN_DEV_API_KEY',
    'EGEN_DEV_APIKEY',
    'EGEN_TENANT_PASSWORD',
    'EGEN_TENANT_PASSWD',
    'EGEN_PRIVATE_KEY',
    'EGEN_DB_CREDENTIALS',
    'egenTenantToken',
    'egenTenantSecret',
  ])('refuse %s', (key) => {
    expect(() => assertSafeBridgeKeys('TEST', [key])).toThrow(/évoque un secret/);
  });

  it('liste tous les noms fautifs et nomme le pont', () => {
    expect(() => assertSafeBridgeKeys('EGEN_TENANT_*', ['EGEN_TENANT_MODE', 'EGEN_TENANT_TOKEN', 'EGEN_TENANT_PASSWORD'])).toThrow(
      /Pont EGEN_TENANT_\* : EGEN_TENANT_TOKEN, EGEN_TENANT_PASSWORD/,
    );
  });

  it.each([
    'EGEN_TENANT_JWKS', // ensemble de clés PUBLIQUES
    'EGEN_TENANT_JWKS_URL',
    'EGEN_TENANT_REQUIRED_PRIVILEGES', // « privilege » n'est pas « private »
    'EGEN_TENANT_JWT_CLAIM',
    'egenTarget',
    'egenTenantMode',
  ])('accepte %s', (key) => {
    expect(() => assertSafeBridgeKeys('TEST', [key])).not.toThrow();
  });

  it("la liste d'exceptions est vide : toute exception doit être ajoutée, commentée et relue", () => {
    expect(ALLOWED_BRIDGE_KEYS.size).toBe(0);
  });

  it('une exception explicite est respectée', () => {
    ALLOWED_BRIDGE_KEYS.add('EGEN_TENANT_PUBLIC_TOKEN_KEY');
    try {
      expect(() => assertSafeBridgeKeys('TEST', ['EGEN_TENANT_PUBLIC_TOKEN_KEY'])).not.toThrow();
    } finally {
      ALLOWED_BRIDGE_KEYS.delete('EGEN_TENANT_PUBLIC_TOKEN_KEY');
    }
  });
});

describe('ponts réels de rspack.config.js', () => {
  const tenantTable = config.match(/const EGEN_TENANT_ENV_TO_WINDOW_KEY = \{([\s\S]*?)\};/)?.[1] ?? '';
  const tenantKeys = [...tenantTable.matchAll(/(EGEN_TENANT_[A-Z_]+):\s*'(egenTenant[A-Za-z]+)'/g)].flatMap((m) => [
    m[1],
    m[2],
  ]);

  it('la liste est bien extraite (le test voit la vraie liste)', () => {
    expect(tenantKeys.length).toBeGreaterThanOrEqual(10);
  });

  it('aucun nom du pont EGEN_TENANT_* ne trahit un secret', () => {
    expect(() => assertSafeBridgeKeys('EGEN_TENANT_*', tenantKeys)).not.toThrow();
  });

  it('la config appelle le garde-fou sur le pont (le build échoue si un nom suspect est ajouté)', () => {
    expect(config).toMatch(/assertSafeBridgeKeys\('EGEN_TENANT_\*'/);
  });

  it('le motif interdit reste insensible à la casse', () => {
    expect(FORBIDDEN_BRIDGE_KEY.flags).toContain('i');
  });
});
