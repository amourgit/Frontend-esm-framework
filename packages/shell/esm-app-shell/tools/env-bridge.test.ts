import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { assertSafeBridgeKeys, FORBIDDEN_BRIDGE_KEY, ALLOWED_BRIDGE_KEYS } = require('./env-bridge');

const config = readFileSync(resolve(__dirname, '../rspack.config.js'), 'utf8');

describe('assertSafeBridgeKeys (G1)', () => {
  it.each([
    'EGEN_AI_SECRET',
    'EGEN_AI_CHANNEL_TOKEN',
    'EGEN_AI_API_KEY',
    'EGEN_AI_APIKEY',
    'EGEN_TENANT_PASSWORD',
    'EGEN_TENANT_PASSWD',
    'EGEN_PRIVATE_KEY',
    'EGEN_DB_CREDENTIALS',
    'egenAiChannelToken',
    'egenTenantSecret',
  ])('refuse %s', (key) => {
    expect(() => assertSafeBridgeKeys('TEST', [key])).toThrow(/évoque un secret/);
  });

  it('liste tous les noms fautifs et nomme le pont', () => {
    expect(() => assertSafeBridgeKeys('EGEN_AI_*', ['EGEN_AI_ENABLED', 'EGEN_AI_TOKEN', 'EGEN_AI_PASSWORD'])).toThrow(
      /Pont EGEN_AI_\* : EGEN_AI_TOKEN, EGEN_AI_PASSWORD/,
    );
  });

  it.each([
    'EGEN_AI_CHANNEL_JWKS', // ensemble de clés PUBLIQUES
    'EGEN_AI_CHANNEL_JWKS_URL',
    'EGEN_AI_REQUIRED_PRIVILEGES', // « privilege » n'est pas « private »
    'EGEN_TENANT_JWT_CLAIM',
    'egenTarget',
    'egenAiChannelUrl',
  ])('accepte %s', (key) => {
    expect(() => assertSafeBridgeKeys('TEST', [key])).not.toThrow();
  });

  it("la liste d'exceptions est vide : toute exception doit être ajoutée, commentée et relue", () => {
    expect(ALLOWED_BRIDGE_KEYS.size).toBe(0);
  });

  it('une exception explicite est respectée', () => {
    ALLOWED_BRIDGE_KEYS.add('EGEN_AI_PUBLIC_TOKEN_KEY');
    try {
      expect(() => assertSafeBridgeKeys('TEST', ['EGEN_AI_PUBLIC_TOKEN_KEY'])).not.toThrow();
    } finally {
      ALLOWED_BRIDGE_KEYS.delete('EGEN_AI_PUBLIC_TOKEN_KEY');
    }
  });
});

describe('ponts réels de rspack.config.js', () => {
  const aiKeys = [
    ...(config.match(/const EGEN_AI_ENV_KEYS = \[([\s\S]*?)\];/)?.[1] ?? '').matchAll(/'(EGEN_AI_[A-Z_]+)'/g),
  ].map((m) => m[1]);
  const tenantTable = config.match(/const EGEN_TENANT_ENV_TO_WINDOW_KEY = \{([\s\S]*?)\};/)?.[1] ?? '';
  const tenantKeys = [...tenantTable.matchAll(/(EGEN_TENANT_[A-Z_]+):\s*'(egenTenant[A-Za-z]+)'/g)].flatMap((m) => [
    m[1],
    m[2],
  ]);

  it('les deux listes sont bien extraites (le test voit les vraies listes)', () => {
    expect(aiKeys.length).toBeGreaterThanOrEqual(15);
    expect(aiKeys).toContain('EGEN_AI_CHANNEL_JWKS');
    expect(tenantKeys.length).toBeGreaterThanOrEqual(10);
  });

  it('aucun nom du pont EGEN_AI_* ne trahit un secret', () => {
    expect(() => assertSafeBridgeKeys('EGEN_AI_*', aiKeys)).not.toThrow();
  });

  it('aucun nom du pont EGEN_TENANT_* ne trahit un secret', () => {
    expect(() => assertSafeBridgeKeys('EGEN_TENANT_*', tenantKeys)).not.toThrow();
  });

  it('la config appelle le garde-fou sur les deux ponts (le build échoue si un nom suspect est ajouté)', () => {
    expect(config).toMatch(/assertSafeBridgeKeys\('EGEN_AI_\*', EGEN_AI_ENV_KEYS\)/);
    expect(config).toMatch(/assertSafeBridgeKeys\('EGEN_TENANT_\*'/);
  });

  it('le motif interdit reste insensible à la casse', () => {
    expect(FORBIDDEN_BRIDGE_KEY.flags).toContain('i');
  });
});
