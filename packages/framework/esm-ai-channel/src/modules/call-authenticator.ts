// =============================================================================
//  Module — Authentification des appels de tools (backend → frontend)
//
//  Le frontend n'a aucune intelligence propre : il exécute ce que le backend lui
//  demande. Reste une question de confiance — « cet ordre vient-il vraiment de
//  MON backend ? » — que ni TLS seul (proxy d'entreprise, URL de canal altérée)
//  ni l'origine du message (un script de la page peut fabriquer une trame) ne
//  tranchent. On s'appuie donc sur des STANDARDS plutôt que sur un format maison :
//
//    • JWS compact (RFC 7515) / JWT (RFC 7519), vérifié par la bibliothèque `jose`
//      (WebCrypto, sans dépendance) ;
//    • clés publiques au format JWKS (RFC 7517), épinglées dans le build ou, pour
//      la rotation, servies par une URL JWKS distante ;
//    • typage explicite du jeton (en-tête `typ`, RFC 8725) et liste blanche
//      d'algorithmes asymétriques (jamais `none`, jamais HS*) contre la confusion
//      d'algorithme.
//
//  Le backend signe l'APPEL ENTIER ; le frontend exécute le contenu signé et
//  ignore les champs non signés de la trame (voir `EGEN_AI_TOOL_CALL_CLAIMS`).
//  Un ordre n'est exécuté que s'il est : signé par une clé connue, destiné à ce
//  frontend (`aud`), lié à CETTE session (`sub` = sessionId du `session.welcome`),
//  récent (`iat`/`exp`) et unique (`jti` = callId, anti-rejeu dans le dispatcher).
// =============================================================================

import {
  createLocalJWKSet,
  createRemoteJWKSet,
  errors,
  jwtVerify,
  type JSONWebKeySet,
  type JWTVerifyGetKey,
} from 'jose';
import { getAIConfig } from '@egen-civitas/esm-ai-config';
import type { ServerPayloadMap } from '../protocol.js';

export type ToolCallPayload = ServerPayloadMap['tool.call'];

export type SignedCallMode = 'off' | 'warn' | 'enforce';

/** Constantes du contrat avec le backend (à reproduire à l'identique côté serveur). */
export const EGEN_AI_TOOL_CALL_CONTRACT = {
  /** En-tête JWS `typ` — empêche d'utiliser un autre JWT du système comme ordre de tool. */
  typ: 'egen-ai-call+jwt',
  /** Claim `aud` : destinataire = le frontend EGEN. */
  audience: 'egen-ai:frontend',
  /** Claims exigés : exp, iat, jti (= callId), sub (= sessionId), aud. Claims applicatifs : tool, args, timeoutMs?, streamId?. */
  claims: ['tool', 'args', 'timeoutMs', 'streamId'],
} as const;

/** Âge maximal accepté d'un jeton (secondes, depuis `iat`) et tolérance de dérive d'horloge. */
export const DEFAULT_MAX_TOKEN_AGE_SEC = 120;
export const DEFAULT_CLOCK_TOLERANCE_SEC = 30;

export type CallRejectionCode =
  | 'missing' //       aucune signature fournie (mode enforce)
  | 'malformed' //     jeton illisible
  | 'signature' //     signature invalide ou clé inconnue
  | 'algorithm' //     algorithme non autorisé
  | 'expired' //       jeton expiré ou trop ancien
  | 'session' //       lié à une autre session (ou aucune session active)
  | 'claims' //        claim absent / incorrect (aud, typ, jti, tool, args…)
  | 'mismatch' //      la trame non signée contredit le contenu signé
  | 'replay' //        callId déjà exécuté
  | 'key-unavailable'; // aucune clé exploitable (JWKS invalide ou injoignable)

export type CallAuthResult =
  | {
      ok: true;
      /** Appel à exécuter : contenu SIGNÉ si `authenticated`, trame brute sinon (modes off / warn). */
      call: ToolCallPayload;
      authenticated: boolean;
      warning?: string;
    }
  | { ok: false; code: CallRejectionCode; message: string };

export interface CallAuthenticator {
  readonly mode: SignedCallMode;
  authenticate(payload: ToolCallPayload): Promise<CallAuthResult>;
}

export interface CallAuthenticatorOptions {
  mode: SignedCallMode | string;
  /** JWKS public épinglé (objet ou JSON). Prioritaire sur `jwksUrl`. */
  jwks?: JSONWebKeySet | string | null;
  /** JWKS distant (https) pour la rotation de clés. */
  jwksUrl?: string | null;
  algorithms?: readonly string[];
  /** Session courante du canal (`session.welcome`) — l'appel doit y être lié. */
  getSessionId: () => string | null;
  clockToleranceSec?: number;
  maxTokenAgeSec?: number;
  now?: () => number;
  /** Destinataire des avertissements (défaut : console.warn, dédoublonné 60 s). */
  onWarning?: (message: string) => void;
  /** Injection d'un résolveur de clés (tests). */
  keyResolver?: JWTVerifyGetKey;
}

const PRIVATE_JWK_MEMBERS = ['d', 'p', 'q', 'dp', 'dq', 'qi', 'k'];

/** Un mode inconnu (faute de frappe) échoue FERMÉ : on ne retombe jamais silencieusement sur « off ». */
export function normalizeSignedCallMode(mode: unknown): SignedCallMode {
  return mode === 'off' || mode === 'warn' || mode === 'enforce' ? mode : 'enforce';
}

function parseJwks(input: JSONWebKeySet | string | null | undefined): { jwks?: JSONWebKeySet; error?: string } {
  if (input == null || input === '') return {};
  let value: unknown = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(input);
    } catch {
      return { error: 'JWKS invalide (JSON illisible)' };
    }
  }
  const keys = (value as { keys?: unknown })?.keys;
  if (!Array.isArray(keys) || keys.length === 0) return { error: 'JWKS invalide (aucune clé)' };
  if (keys.some((k) => !k || typeof k !== 'object' || PRIVATE_JWK_MEMBERS.some((m) => m in (k as object)))) {
    return { error: 'JWKS refusé : il contient une clé privée ou symétrique' };
  }
  return { jwks: value as JSONWebKeySet };
}

function reject(code: CallRejectionCode, message: string): CallAuthResult {
  return { ok: false, code, message };
}

function mapVerificationError(err: unknown): { code: CallRejectionCode; message: string } {
  if (err instanceof errors.JWTExpired) return { code: 'expired', message: 'Jeton expiré' };
  if (err instanceof errors.JOSEAlgNotAllowed)
    return { code: 'algorithm', message: 'Algorithme de signature non autorisé' };
  if (
    err instanceof errors.JWSSignatureVerificationFailed ||
    err instanceof errors.JWKSNoMatchingKey ||
    err instanceof errors.JWKSMultipleMatchingKeys
  ) {
    return { code: 'signature', message: 'Signature invalide ou clé inconnue' };
  }
  if (err instanceof errors.JWTClaimValidationFailed) {
    if (err.claim === 'sub') return { code: 'session', message: 'Appel lié à une autre session' };
    if (err.claim === 'iat' || err.claim === 'exp' || err.claim === 'nbf')
      return { code: 'expired', message: 'Jeton hors de sa période de validité' };
    return { code: 'claims', message: `Claim « ${err.claim ?? '?'} » invalide` };
  }
  if (err instanceof errors.JWKSTimeout || err instanceof errors.JWKSInvalid) {
    return { code: 'key-unavailable', message: 'Clés de vérification indisponibles' };
  }
  if (err instanceof errors.JWSInvalid || err instanceof errors.JWTInvalid)
    return { code: 'malformed', message: 'Jeton illisible' };
  if (err instanceof errors.JOSEError) return { code: 'claims', message: 'Jeton refusé' };
  // Erreur réseau lors de la récupération du JWKS distant, WebCrypto indisponible…
  return { code: 'key-unavailable', message: 'Vérification impossible (clés ou WebCrypto indisponibles)' };
}

/** Convertit des claims déjà vérifiés par `jose` en appel exécutable — valide leur FORME (le backend est de confiance, pas son schéma). */
function claimsToCall(claims: Record<string, unknown>): { call?: ToolCallPayload; error?: string } {
  const { jti, tool, args, timeoutMs, streamId } = claims;
  if (typeof jti !== 'string' || !jti || jti.length > 200) return { error: 'jti (callId) manquant ou invalide' };
  if (typeof tool !== 'string' || !tool || tool.length > 128) return { error: 'claim « tool » manquant ou invalide' };
  const argsValue = args === undefined ? {} : args;
  if (typeof argsValue !== 'object' || argsValue === null || Array.isArray(argsValue))
    return { error: 'claim « args » doit être un objet' };
  if (
    timeoutMs !== undefined &&
    !(typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 600_000)
  ) {
    return { error: 'claim « timeoutMs » invalide' };
  }
  if (streamId !== undefined && !(typeof streamId === 'string' && streamId.length <= 200))
    return { error: 'claim « streamId » invalide' };
  return {
    call: {
      callId: jti,
      tool,
      arguments: argsValue as Record<string, unknown>,
      ...(timeoutMs !== undefined ? { timeoutMs: timeoutMs as number } : {}),
      ...(streamId !== undefined ? { streamId: streamId as string } : {}),
    },
  };
}

export function createCallAuthenticator(options: CallAuthenticatorOptions): CallAuthenticator {
  const mode = normalizeSignedCallMode(options.mode);
  const algorithms = [...(options.algorithms?.length ? options.algorithms : ['ES256'])];
  const now = options.now ?? Date.now;
  const clockTolerance = options.clockToleranceSec ?? DEFAULT_CLOCK_TOLERANCE_SEC;
  const maxTokenAge = options.maxTokenAgeSec ?? DEFAULT_MAX_TOKEN_AGE_SEC;

  const lastWarned = new Map<string, number>();
  const warn = (message: string) => {
    if (options.onWarning) return options.onWarning(message);
    const t = now();
    if (t - (lastWarned.get(message) ?? 0) < 60_000) return;
    lastWarned.set(message, t);
    console.warn(`[EGEN AI Channel] ${message}`);
  };

  // Résolveur de clés construit à la demande, puis mémoïsé (jose met en cache le JWKS distant).
  let keyResolution: { getKey?: JWTVerifyGetKey; error?: string } | null = null;
  const resolveKeys = () => {
    if (keyResolution) return keyResolution;
    if (options.keyResolver) return (keyResolution = { getKey: options.keyResolver });
    const parsed = parseJwks(options.jwks);
    if (parsed.error) return (keyResolution = { error: parsed.error });
    if (parsed.jwks) return (keyResolution = { getKey: createLocalJWKSet(parsed.jwks) });
    if (options.jwksUrl) {
      try {
        return (keyResolution = { getKey: createRemoteJWKSet(new URL(options.jwksUrl)) });
      } catch {
        return (keyResolution = { error: 'URL JWKS invalide' });
      }
    }
    return (keyResolution = { error: 'Aucune clé publique configurée' });
  };

  async function verify(token: string, envelopeCallId: string): Promise<CallAuthResult> {
    const sessionId = options.getSessionId();
    if (!sessionId) return reject('session', 'Aucune session active : appel non liable');

    const keys = resolveKeys();
    if (!keys.getKey) return reject('key-unavailable', keys.error ?? 'Clés de vérification indisponibles');

    let claims: Record<string, unknown>;
    try {
      const { payload } = await jwtVerify(token, keys.getKey, {
        algorithms,
        audience: EGEN_AI_TOOL_CALL_CONTRACT.audience,
        typ: EGEN_AI_TOOL_CALL_CONTRACT.typ,
        subject: sessionId,
        requiredClaims: ['exp', 'iat', 'jti', 'sub', 'aud'],
        clockTolerance,
        maxTokenAge,
        currentDate: new Date(now()),
      });
      claims = payload as Record<string, unknown>;
    } catch (err) {
      const { code, message } = mapVerificationError(err);
      return reject(code, message);
    }

    const converted = claimsToCall(claims);
    if (!converted.call) return reject('claims', converted.error ?? 'Claims invalides');
    // La trame non signée ne doit pas contredire le contenu signé (bug de backend ou manipulation).
    if (converted.call.callId !== envelopeCallId)
      return reject('mismatch', 'Le callId de la trame ne correspond pas au jeton signé');
    return { ok: true, call: converted.call, authenticated: true };
  }

  return {
    mode,
    async authenticate(payload) {
      if (mode === 'off') return { ok: true, call: payload, authenticated: false };

      const token = typeof payload.jws === 'string' && payload.jws ? payload.jws : null;
      if (!token) {
        if (mode === 'enforce') {
          return reject('missing', 'Appel non signé refusé (security.signedToolCalls=enforce)');
        }
        warn(
          'Appel de tool NON SIGNÉ accepté (security.signedToolCalls=warn) — passer en « enforce » une fois le backend prêt.',
        );
        return { ok: true, call: payload, authenticated: false, warning: 'unsigned' };
      }

      const verdict = await verify(token, payload.callId);
      if (verdict.ok) return verdict;
      if (mode === 'enforce') return verdict;
      warn(
        `Signature d'appel de tool invalide (${verdict.code} : ${verdict.message}) — accepté car security.signedToolCalls=warn.`,
      );
      return { ok: true, call: payload, authenticated: false, warning: verdict.code };
    },
  };
}

/** Authentificateur piloté par la configuration IA courante (security.*), lié à la session du canal. */
export function createConfiguredCallAuthenticator(getSessionId: () => string | null): CallAuthenticator {
  const { security } = getAIConfig();
  return createCallAuthenticator({
    mode: security.signedToolCalls,
    jwks: security.channelJwks,
    jwksUrl: security.channelJwksUrl,
    algorithms: security.channelAlgorithms,
    getSessionId,
  });
}
