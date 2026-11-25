/** Version majeure du protocole d'intégration embarquée (poignée de main `{ egen: 2 }`). */
export const EGEN_EMBED_PROTOCOL = 2;

/** Protocoles que l'hôte sait parler : 2 (ce paquet) et 1 (pont `esm-nextjs-utils`, y compris 1.1). */
export const SUPPORTED_PROTOCOLS: readonly number[] = [2, 1];

/** Limites par défaut (doc 17 §3.1). Surchargeables par l'opérateur. */
export interface Limits {
  /** Taille maximale estimée d'un message (octets). */
  maxMessageBytes: number;
  /** Requêtes entrantes par seconde et par pair. */
  requestsPerSecond: number;
  /** Délai d'un appel sortant (ms). */
  callTimeoutMs: number;
  /** Abonnements simultanés acceptés d'un pair. */
  maxSubscriptions: number;
  /** Événements sortants par seconde (au-delà : abandon). */
  eventsPerSecond: number;
  /** Délai de la poignée de main (ms) avant repli sur le protocole 1.1. */
  handshakeTimeoutMs: number;
  /** Intervalle de vivacité (ms) ; 0 désactive. */
  pingIntervalMs: number;
}

export const DEFAULT_LIMITS: Readonly<Limits> = Object.freeze({
  maxMessageBytes: 256 * 1024,
  requestsPerSecond: 100,
  callTimeoutMs: 10_000,
  maxSubscriptions: 100,
  eventsPerSecond: 1000,
  handshakeTimeoutMs: 5000,
  pingIntervalMs: 30_000,
});

export const ERROR_CODES = [
  'DENIED',
  'UNKNOWN_CAPABILITY',
  'UNKNOWN_METHOD',
  'INVALID_ARGS',
  'TIMEOUT',
  'RATE_LIMITED',
  'TOO_LARGE',
  'CLOSED',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
