/**
 * Protocole du pont Shell ↔ application embarquée (iframe). Version 1.
 * Toutes les messages sont enveloppés : `{ egen: 1, moduleName, message }`.
 */
export const EGEN_EMBED_PROTOCOL = 1;

/** Données initiales transmises à l'application embarquée. */
export interface EmbedInit {
  moduleName: string;
  /** Langue courante (i18next du Shell). */
  locale?: string;
  /** Base d'URL du Shell (`getEgenSpaBase()`), pour construire des liens. */
  spaBase: string;
  /** Session filtrée par liste blanche (voir `sessionFields`) ; absente tant que non chargée. */
  session?: Record<string, unknown>;
}

export type HostToEmbed =
  | { kind: 'init'; payload: EmbedInit }
  | { kind: 'session'; session: Record<string, unknown> }
  | { kind: 'locale'; locale: string };

export type EmbedToHost =
  | { kind: 'ready' }
  | { kind: 'navigate'; to: string }
  | { kind: 'resize'; height: number }
  | { kind: 'title'; title: string };

export interface Envelope<T> {
  egen: typeof EGEN_EMBED_PROTOCOL;
  moduleName: string;
  message: T;
}

export function wrap<T>(moduleName: string, message: T): Envelope<T> {
  return { egen: EGEN_EMBED_PROTOCOL, moduleName, message };
}

export function isEnvelope(data: unknown, moduleName: string): data is Envelope<{ kind: string }> {
  const d = data as Envelope<{ kind?: unknown }> | null;
  return (
    !!d &&
    typeof d === 'object' &&
    d.egen === EGEN_EMBED_PROTOCOL &&
    d.moduleName === moduleName &&
    !!d.message &&
    typeof d.message === 'object' &&
    typeof d.message.kind === 'string'
  );
}

/**
 * Champs de session transmis par défaut. `sessionId` n'est JAMAIS dans cette liste : un identifiant
 * de session ne doit pas être confié à une application tierce embarquée.
 */
export const DEFAULT_SESSION_FIELDS = ['authenticated', 'locale', 'allowedLocales', 'user.uuid', 'user.display', 'user.username'];

/** Copie uniquement les chemins listés (notation pointée). */
export function pickFields(source: unknown, fields: string[]): Record<string, unknown> {
  const out: Record<string, any> = {};
  for (const path of fields) {
    const keys = path.split('.');
    let from: any = source;
    for (const k of keys) from = from != null && typeof from === 'object' ? from[k] : undefined;
    if (from === undefined) continue;
    let to = out;
    keys.slice(0, -1).forEach((k) => (to = to[k] ??= {}));
    to[keys[keys.length - 1]] = from;
  }
  return out;
}
