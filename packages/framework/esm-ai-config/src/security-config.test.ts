import { describe, expect, it } from 'vitest';
import { buildDefaultConfig, validateAIConfig, type AIConfig } from './index.js';

const PUBLIC_JWK = {
  kty: 'EC',
  crv: 'P-256',
  x: 'f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU',
  y: 'x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0',
  kid: 'k1',
  alg: 'ES256',
};

const config = (security: Partial<AIConfig['security']> = {}): AIConfig => {
  const base = buildDefaultConfig();
  return { ...base, security: { ...base.security, ...security } };
};

describe("configuration de l'authentification des appels de tools", () => {
  it('défauts : désactivé, ES256 seul, canal en clair interdit hors local, aucun épinglage', () => {
    const { security } = buildDefaultConfig();
    expect(security).toMatchObject({
      signedToolCalls: 'off',
      channelJwks: '',
      channelJwksUrl: '',
      channelAlgorithms: ['ES256'],
      allowInsecureChannel: false,
      allowedChannelHosts: [],
    });
    expect(validateAIConfig(buildDefaultConfig())).toMatchObject({ valid: true, errors: [] });
  });

  it('enforce sans aucune clé est une ERREUR (aucun appel ne serait authentifiable) ; warn sans clé un avertissement', () => {
    expect(validateAIConfig(config({ signedToolCalls: 'enforce' })).errors.join(' ')).toContain('sans clé publique');
    const warn = validateAIConfig(config({ signedToolCalls: 'warn' }));
    expect(warn.valid).toBe(true);
    expect(warn.warnings.join(' ')).toContain('sans clé publique');
  });

  it('accepte un JWKS public valide, ou une URL JWKS https', () => {
    expect(
      validateAIConfig(config({ signedToolCalls: 'enforce', channelJwks: JSON.stringify({ keys: [PUBLIC_JWK] }) })),
    ).toMatchObject({ valid: true });
    expect(
      validateAIConfig(
        config({ signedToolCalls: 'enforce', channelJwksUrl: 'https://api.egen.ga/.well-known/jwks.json' }),
      ),
    ).toMatchObject({ valid: true });
    expect(
      validateAIConfig(config({ signedToolCalls: 'warn', channelJwksUrl: 'http://localhost:8080/jwks' })),
    ).toMatchObject({ valid: true });
  });

  it('refuse un JWKS contenant une clé privée ou symétrique (elle serait publiée dans le bundle)', () => {
    for (const key of [
      { ...PUBLIC_JWK, d: 'cle-privee' },
      { kty: 'oct', k: 'c2VjcmV0', kid: 'k1' },
      { kty: 'RSA', n: 'x', e: 'AQAB', p: 'x' },
    ]) {
      const result = validateAIConfig(
        config({ signedToolCalls: 'enforce', channelJwks: JSON.stringify({ keys: [key] }) }),
      );
      expect(result.valid).toBe(false);
      expect(result.errors.join(' ')).toContain('PRIVÈRE');
    }
  });

  it('refuse un JWKS illisible ou vide, une URL JWKS en http distant ou invalide', () => {
    expect(validateAIConfig(config({ channelJwks: '{pas du json' })).errors.join(' ')).toContain('JSON invalide');
    expect(validateAIConfig(config({ channelJwks: '{"keys":[]}' })).errors.join(' ')).toContain('non vide');
    expect(validateAIConfig(config({ channelJwksUrl: 'http://api.egen.ga/jwks' })).errors.join(' ')).toContain('https');
    expect(validateAIConfig(config({ channelJwksUrl: 'n-importe-quoi' })).errors.join(' ')).toContain('URL invalide');
  });

  it('refuse les algorithmes non asymétriques ou inconnus (none, HS256…), et une liste vide', () => {
    for (const algs of [['none'], ['HS256'], ['ES256', 'HS512'], []]) {
      expect(validateAIConfig(config({ channelAlgorithms: algs })).valid).toBe(false);
    }
    expect(validateAIConfig(config({ channelAlgorithms: ['ES256', 'ES384'] })).valid).toBe(true);
    expect(validateAIConfig(config({ channelAlgorithms: ['EdDSA'] })).warnings.join(' ')).toContain('EdDSA');
  });

  it('refuse un mode inconnu (faute de frappe) au lieu de le laisser passer', () => {
    const result = validateAIConfig(config({ signedToolCalls: 'enforced' as never }));
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('off | warn | enforce');
  });

  it("avertit quand channelJwks et channelJwksUrl sont tous deux définis (l'épinglé l'emporte)", () => {
    const result = validateAIConfig(
      config({ channelJwks: JSON.stringify({ keys: [PUBLIC_JWK] }), channelJwksUrl: 'https://api.egen.ga/jwks' }),
    );
    expect(result.warnings.join(' ')).toContain('seul channelJwks');
  });
});
