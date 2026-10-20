import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignJWT, exportJWK, generateKeyPair, type JWK } from 'jose';
import {
  EGEN_AI_TOOL_CALL_CONTRACT,
  createCallAuthenticator,
  normalizeSignedCallMode,
  type CallAuthResult,
  type ToolCallPayload,
} from './modules/call-authenticator.js';

const SESSION = 'sess-1';
const NOW = 1_800_000_000_000; // ms — horloge figée pour tous les tests

interface Signer {
  jwks: { keys: JWK[] };
  sign(claims?: Record<string, unknown>, opts?: SignOptions): Promise<string>;
}
interface SignOptions {
  header?: Record<string, unknown>;
  iat?: number;
  exp?: number;
  aud?: string;
  sub?: string;
  jti?: string;
  privateKey?: CryptoKey | Uint8Array;
}

async function makeSigner(kid = 'k1', alg = 'ES256'): Promise<Signer & { privateKey: CryptoKey }> {
  const { publicKey, privateKey } = await generateKeyPair(alg, { extractable: true });
  const jwk = { ...(await exportJWK(publicKey)), kid, alg, use: 'sig' };
  return {
    jwks: { keys: [jwk] },
    privateKey: privateKey as CryptoKey,
    async sign(claims = {}, opts = {}) {
      const iat = opts.iat ?? Math.floor(NOW / 1000);
      return new SignJWT({ tool: 'navigate', args: { route: '/students' }, ...claims })
        .setProtectedHeader({ alg, typ: EGEN_AI_TOOL_CALL_CONTRACT.typ, kid, ...opts.header })
        .setIssuedAt(iat)
        .setExpirationTime(opts.exp ?? iat + 60)
        .setAudience(opts.aud ?? EGEN_AI_TOOL_CALL_CONTRACT.audience)
        .setSubject(opts.sub ?? SESSION)
        .setJti(opts.jti ?? 'call-1')
        .sign((opts.privateKey ?? privateKey) as CryptoKey);
    },
  };
}

const frame = (extra: Partial<ToolCallPayload> = {}): ToolCallPayload => ({
  callId: 'call-1',
  tool: 'evil_tool',
  arguments: { route: 'https://evil.example' },
  ...extra,
});

function makeAuth(signer: Signer, extra: Record<string, unknown> = {}) {
  return createCallAuthenticator({
    mode: 'enforce',
    jwks: signer.jwks,
    getSessionId: () => SESSION,
    now: () => NOW,
    onWarning: () => undefined,
    ...extra,
  });
}

const expectRejected = (result: CallAuthResult, code: string) => {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe(code);
};

describe('mode « enforce »', () => {
  let signer: Awaited<ReturnType<typeof makeSigner>>;
  beforeEach(async () => {
    signer = await makeSigner();
  });

  it('exécute le contenu SIGNÉ et ignore les champs non signés de la trame', async () => {
    const jws = await signer.sign({
      tool: 'navigate',
      args: { route: '/students' },
      timeoutMs: 5000,
      streamId: 'st-1',
    });
    const result = await makeAuth(signer).authenticate(frame({ jws }));
    expect(result).toEqual({
      ok: true,
      authenticated: true,
      call: {
        callId: 'call-1',
        tool: 'navigate',
        arguments: { route: '/students' },
        timeoutMs: 5000,
        streamId: 'st-1',
      },
    });
  });

  it('refuse un appel sans signature', async () => {
    expectRejected(await makeAuth(signer).authenticate(frame()), 'missing');
  });

  it("refuse une signature altérée (jeton modifié) et une signature d'une autre clé", async () => {
    const jws = await signer.sign();
    const [h, p, s] = jws.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), tool: 'delete_all' }),
    ).toString('base64url');
    expectRejected(await makeAuth(signer).authenticate(frame({ jws: `${h}.${tamperedPayload}.${s}` })), 'signature');

    const attacker = await makeSigner('k1'); // même kid, autre clé
    expectRejected(await makeAuth(signer).authenticate(frame({ jws: await attacker.sign() })), 'signature');
    const unknownKid = await makeSigner('inconnu');
    expectRejected(await makeAuth(signer).authenticate(frame({ jws: await unknownKid.sign() })), 'signature');
  });

  it('refuse un jeton expiré ou émis trop longtemps avant (même non expiré)', async () => {
    const iat = Math.floor(NOW / 1000);
    expectRejected(
      await makeAuth(signer).authenticate(frame({ jws: await signer.sign({}, { iat: iat - 600, exp: iat - 300 }) })),
      'expired',
    );
    // exp futur, mais iat vieux de 10 minutes : refusé par l'âge maximal
    expectRejected(
      await makeAuth(signer).authenticate(frame({ jws: await signer.sign({}, { iat: iat - 600, exp: iat + 3600 }) })),
      'expired',
    );
    // tolérance d'horloge : expiré depuis 10 s seulement → accepté
    const ok = await makeAuth(signer).authenticate(
      frame({ jws: await signer.sign({}, { iat: iat - 70, exp: iat - 10 }) }),
    );
    expect(ok.ok).toBe(true);
  });

  it("lie l'appel à la session : autre session ou aucune session → refusé", async () => {
    const jws = await signer.sign({}, { sub: 'autre-session' });
    expectRejected(await makeAuth(signer).authenticate(frame({ jws })), 'session');
    expectRejected(
      await makeAuth(signer, { getSessionId: () => null }).authenticate(frame({ jws: await signer.sign() })),
      'session',
    );
  });

  it('refuse un mauvais destinataire (aud) ou un mauvais type de jeton (typ)', async () => {
    expectRejected(
      await makeAuth(signer).authenticate(frame({ jws: await signer.sign({}, { aud: 'autre-service' }) })),
      'claims',
    );
    expectRejected(
      await makeAuth(signer).authenticate(frame({ jws: await signer.sign({}, { header: { typ: 'JWT' } }) })),
      'claims',
    );
  });

  it('refuse un callId de trame différent du jti signé', async () => {
    expectRejected(
      await makeAuth(signer).authenticate(frame({ callId: 'call-AUTRE', jws: await signer.sign() })),
      'mismatch',
    );
  });

  it('valide la forme des claims applicatifs (le backend est de confiance, pas son schéma)', async () => {
    const auth = makeAuth(signer);
    expectRejected(await auth.authenticate(frame({ jws: await signer.sign({ tool: '' }) })), 'claims');
    expectRejected(await auth.authenticate(frame({ jws: await signer.sign({ tool: 42 }) })), 'claims');
    expectRejected(await auth.authenticate(frame({ jws: await signer.sign({ args: ['x'] }) })), 'claims');
    expectRejected(await auth.authenticate(frame({ jws: await signer.sign({ timeoutMs: -1 }) })), 'claims');
    const noArgs = await auth.authenticate(frame({ jws: await signer.sign({ args: undefined }) }));
    expect(noArgs).toMatchObject({ ok: true, call: { arguments: {} } });
  });

  it("résiste à la confusion d'algorithme : alg=none, HS256 signé avec la clé publique, algorithme hors liste", async () => {
    const auth = makeAuth(signer);
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: EGEN_AI_TOOL_CALL_CONTRACT.typ })).toString(
      'base64url',
    );
    const body = Buffer.from(
      JSON.stringify({
        tool: 'navigate',
        args: {},
        jti: 'call-1',
        sub: SESSION,
        aud: EGEN_AI_TOOL_CALL_CONTRACT.audience,
        iat: NOW / 1000,
        exp: NOW / 1000 + 60,
      }),
    ).toString('base64url');
    expect((await auth.authenticate(frame({ jws: `${header}.${body}.` }))).ok).toBe(false);

    const hmacSecret = new TextEncoder().encode(JSON.stringify(signer.jwks.keys[0]));
    const hs256 = await new SignJWT({ tool: 'navigate', args: {} })
      .setProtectedHeader({ alg: 'HS256', typ: EGEN_AI_TOOL_CALL_CONTRACT.typ, kid: 'k1' })
      .setIssuedAt(Math.floor(NOW / 1000))
      .setExpirationTime(Math.floor(NOW / 1000) + 60)
      .setAudience(EGEN_AI_TOOL_CALL_CONTRACT.audience)
      .setSubject(SESSION)
      .setJti('call-1')
      .sign(hmacSecret);
    expect((await auth.authenticate(frame({ jws: hs256 }))).ok).toBe(false);

    // Clé ES384 valide mais algorithme non autorisé par la configuration (ES256 seul)
    const es384 = await makeSigner('k384', 'ES384');
    const mixed = createCallAuthenticator({
      mode: 'enforce',
      jwks: es384.jwks,
      algorithms: ['ES256'],
      getSessionId: () => SESSION,
      now: () => NOW,
    });
    expectRejected(await mixed.authenticate(frame({ jws: await es384.sign() })), 'algorithm');
  });

  it('échoue FERMÉ sans clé exploitable : JWKS absent, illisible, vide ou contenant une clé privée/symétrique', async () => {
    const jws = await signer.sign();
    const make = (jwks: unknown) =>
      createCallAuthenticator({ mode: 'enforce', jwks: jwks as never, getSessionId: () => SESSION, now: () => NOW });
    expectRejected(await make(undefined).authenticate(frame({ jws })), 'key-unavailable');
    expectRejected(await make('{pas du json').authenticate(frame({ jws })), 'key-unavailable');
    expectRejected(await make({ keys: [] }).authenticate(frame({ jws })), 'key-unavailable');
    const privateJwk = { ...(await exportJWK(signer.privateKey)), kid: 'k1', alg: 'ES256' };
    expectRejected(await make({ keys: [privateJwk] }).authenticate(frame({ jws })), 'key-unavailable');
    expectRejected(
      await make({ keys: [{ kty: 'oct', k: 'c2VjcmV0', kid: 'k1' }] }).authenticate(frame({ jws })),
      'key-unavailable',
    );
  });

  it("accepte un JWKS fourni en chaîne JSON (variable d'environnement) et gère la rotation (plusieurs kid)", async () => {
    const next = await makeSigner('k2');
    const both = { keys: [...signer.jwks.keys, ...next.jwks.keys] };
    const auth = createCallAuthenticator({
      mode: 'enforce',
      jwks: JSON.stringify(both),
      getSessionId: () => SESSION,
      now: () => NOW,
    });
    expect((await auth.authenticate(frame({ jws: await signer.sign() }))).ok).toBe(true);
    expect((await auth.authenticate(frame({ jws: await next.sign() }))).ok).toBe(true);
  });

  it("utilise un JWKS distant (rotation) quand aucune clé n'est épinglée", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(signer.jwks), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    try {
      const auth = createCallAuthenticator({
        mode: 'enforce',
        jwksUrl: 'https://api.exemple.ga/.well-known/jwks.json',
        getSessionId: () => SESSION,
        now: () => NOW,
      });
      expect((await auth.authenticate(frame({ jws: await signer.sign() }))).ok).toBe(true);
      expect((await auth.authenticate(frame({ jws: await signer.sign({}, { jti: 'call-1' }) }))).ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1); // mis en cache
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("JWKS distant injoignable → refus (key-unavailable), jamais d'exécution par défaut", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('réseau coupé');
      }),
    );
    try {
      const auth = createCallAuthenticator({
        mode: 'enforce',
        jwksUrl: 'https://api.exemple.ga/jwks',
        getSessionId: () => SESSION,
        now: () => NOW,
      });
      expectRejected(await auth.authenticate(frame({ jws: await signer.sign() })), 'key-unavailable');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('cas limites du jeton', () => {
  let signer: Awaited<ReturnType<typeof makeSigner>>;
  beforeEach(async () => {
    signer = await makeSigner();
  });

  it('un jws absent, vide ou non textuel équivaut à « non signé » (jamais exécuté en enforce)', async () => {
    const auth = makeAuth(signer);
    for (const jws of [undefined, '', 123, null, {}, []]) {
      expectRejected(await auth.authenticate(frame({ jws: jws as never })), 'missing');
    }
  });

  it('refuse un jeton illisible (pas un JWS, base64 invalide, parties manquantes)', async () => {
    const auth = makeAuth(signer);
    for (const jws of ['pas-un-jeton', 'a.b', 'a.b.c', '....', 'eyJhbGciOiJFUzI1NiJ9.e30.']) {
      const result = await auth.authenticate(frame({ jws }));
      expect(result.ok, jws).toBe(false);
    }
  });

  it('refuse un jeton pas encore valide (nbf dans le futur)', async () => {
    const iat = Math.floor(NOW / 1000);
    const token = await new SignJWT({ tool: 'navigate', args: {} })
      .setProtectedHeader({ alg: 'ES256', typ: EGEN_AI_TOOL_CALL_CONTRACT.typ, kid: 'k1' })
      .setIssuedAt(iat)
      .setNotBefore(iat + 3600)
      .setExpirationTime(iat + 7200)
      .setAudience(EGEN_AI_TOOL_CALL_CONTRACT.audience)
      .setSubject(SESSION)
      .setJti('call-1')
      .sign(signer.privateKey);
    expectRejected(await makeAuth(signer).authenticate(frame({ jws: token })), 'expired');
  });

  it('exige tous les claims de base (exp, iat, jti, sub, aud) — chacun, individuellement', async () => {
    const iat = Math.floor(NOW / 1000);
    const build = (omit: string) => {
      const jwt = new SignJWT({ tool: 'navigate', args: {} }).setProtectedHeader({
        alg: 'ES256',
        typ: EGEN_AI_TOOL_CALL_CONTRACT.typ,
        kid: 'k1',
      });
      if (omit !== 'iat') jwt.setIssuedAt(iat);
      if (omit !== 'exp') jwt.setExpirationTime(iat + 60);
      if (omit !== 'aud') jwt.setAudience(EGEN_AI_TOOL_CALL_CONTRACT.audience);
      if (omit !== 'sub') jwt.setSubject(SESSION);
      if (omit !== 'jti') jwt.setJti('call-1');
      return jwt.sign(signer.privateKey);
    };
    for (const omit of ['iat', 'exp', 'aud', 'sub', 'jti']) {
      const result = await makeAuth(signer).authenticate(frame({ jws: await build(omit) }));
      expect(result.ok, `sans ${omit}`).toBe(false);
    }
    expect((await makeAuth(signer).authenticate(frame({ jws: await build('none') }))).ok).toBe(true);
  });

  it('refuse des claims applicatifs hors bornes (jti trop long, tool trop long, timeoutMs excessif, streamId non textuel)', async () => {
    const auth = makeAuth(signer);
    expectRejected(
      await auth.authenticate(frame({ callId: 'x'.repeat(300), jws: await signer.sign({}, { jti: 'x'.repeat(300) }) })),
      'claims',
    );
    expectRejected(await auth.authenticate(frame({ jws: await signer.sign({ tool: 't'.repeat(200) }) })), 'claims');
    expectRejected(await auth.authenticate(frame({ jws: await signer.sign({ timeoutMs: 999_999_999 }) })), 'claims');
    expectRejected(await auth.authenticate(frame({ jws: await signer.sign({ streamId: 42 }) })), 'claims');
    expectRejected(await auth.authenticate(frame({ jws: await signer.sign({ args: 'texte' }) })), 'claims');
    expectRejected(await auth.authenticate(frame({ jws: await signer.sign({ args: null }) })), 'claims');
  });

  it("refuse un jeton dont l'en-tête déclare une extension critique inconnue (crit)", async () => {
    // jose refuse déjà de SIGNER avec un `crit` inconnu : on forge l'en-tête à la main.
    const [header, payload, signature] = (await signer.sign()).split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(header, 'base64url').toString()), crit: ['exp-x'], 'exp-x': 1 }),
    ).toString('base64url');
    expect((await makeAuth(signer).authenticate(frame({ jws: `${forged}.${payload}.${signature}` }))).ok).toBe(false);
  });

  it('en mode warn, un jeton illisible est accepté avec avertissement et sans authentification', async () => {
    const warnings: string[] = [];
    const auth = createCallAuthenticator({
      mode: 'warn',
      jwks: signer.jwks,
      getSessionId: () => SESSION,
      now: () => NOW,
      onWarning: (m) => warnings.push(m),
    });
    const result = await auth.authenticate(frame({ jws: 'pas-un-jeton' }));
    expect(result).toMatchObject({ ok: true, authenticated: false, warning: 'malformed', call: { tool: 'evil_tool' } });
    expect(warnings[0]).toContain('malformed');
  });

  it('utilise le résolveur de clés injecté et un URL JWKS invalide échoue fermé', async () => {
    const jws = await signer.sign();
    const custom = createCallAuthenticator({
      mode: 'enforce',
      keyResolver: (async () => (await import('jose')).importJWK(signer.jwks.keys[0], 'ES256')) as never,
      getSessionId: () => SESSION,
      now: () => NOW,
    });
    expect((await custom.authenticate(frame({ jws }))).ok).toBe(true);
    const badUrl = createCallAuthenticator({
      mode: 'enforce',
      jwksUrl: 'pas une url',
      getSessionId: () => SESSION,
      now: () => NOW,
    });
    expectRejected(await badUrl.authenticate(frame({ jws })), 'key-unavailable');
  });

  it("refuse l'algorithme EdDSA quand seul ES256 est autorisé, et l'accepte si la config le permet", async () => {
    const ed = await makeSigner('ked', 'EdDSA').catch(() => null);
    if (!ed) return; // runtime sans Ed25519 : rien à vérifier
    const only256 = createCallAuthenticator({
      mode: 'enforce',
      jwks: ed.jwks,
      algorithms: ['ES256'],
      getSessionId: () => SESSION,
      now: () => NOW,
    });
    expectRejected(await only256.authenticate(frame({ jws: await ed.sign() })), 'algorithm');
    const allowed = createCallAuthenticator({
      mode: 'enforce',
      jwks: ed.jwks,
      algorithms: ['EdDSA'],
      getSessionId: () => SESSION,
      now: () => NOW,
    });
    expect((await allowed.authenticate(frame({ jws: await ed.sign() }))).ok).toBe(true);
  });
});

describe('mode « warn »', () => {
  it('accepte tout mais signale : non signé, signature invalide ; exécute le contenu signé si valide', async () => {
    const signer = await makeSigner();
    const warnings: string[] = [];
    const auth = createCallAuthenticator({
      mode: 'warn',
      jwks: signer.jwks,
      getSessionId: () => SESSION,
      now: () => NOW,
      onWarning: (m) => warnings.push(m),
    });

    const unsigned = await auth.authenticate(frame());
    expect(unsigned).toMatchObject({ ok: true, authenticated: false, call: { tool: 'evil_tool' } });

    const other = await makeSigner('k1');
    const invalid = await auth.authenticate(frame({ jws: await other.sign() }));
    expect(invalid).toMatchObject({ ok: true, authenticated: false, warning: 'signature' });
    expect(warnings).toHaveLength(2);

    const valid = await auth.authenticate(frame({ jws: await signer.sign() }));
    expect(valid).toMatchObject({ ok: true, authenticated: true, call: { tool: 'navigate' } });
    expect(warnings).toHaveLength(2);
  });

  it('dédoublonne les avertissements dans la console (60 s)', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    let t = NOW;
    const auth = createCallAuthenticator({ mode: 'warn', getSessionId: () => SESSION, now: () => t });
    await auth.authenticate(frame());
    await auth.authenticate(frame());
    expect(spy).toHaveBeenCalledTimes(1);
    t += 61_000;
    await auth.authenticate(frame());
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});

describe('mode « off » et modes inconnus', () => {
  it('« off » laisse passer la trame telle quelle, sans toucher au champ jws', async () => {
    const auth = createCallAuthenticator({ mode: 'off', getSessionId: () => null });
    const call = frame({ jws: 'n-importe-quoi' });
    expect(await auth.authenticate(call)).toEqual({ ok: true, authenticated: false, call });
  });

  it('un mode inconnu (faute de frappe) échoue fermé : « enforce »', async () => {
    expect(normalizeSignedCallMode('enforced')).toBe('enforce');
    expect(normalizeSignedCallMode(undefined)).toBe('enforce');
    expect(normalizeSignedCallMode('off')).toBe('off');
    expectRejected(
      await createCallAuthenticator({ mode: 'oops', getSessionId: () => SESSION }).authenticate(frame()),
      'missing',
    );
  });
});

afterEach(() => vi.restoreAllMocks());
