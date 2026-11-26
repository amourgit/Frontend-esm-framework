export type Unsub = () => void;

/** Valeur lisible et observable fournie par le Core. */
export interface Watchable<T> {
  get(): T | Promise<T>;
  subscribe?(cb: (value: T) => void): Unsub;
}

export interface CallerContext {
  /** Nom du module de l'app appelante (non falsifiable : porté par la connexion, pas par le message). */
  moduleName: string;
}

export interface NotificationInput {
  /** Clé de dédoublonnage facultative : un même `id` ne produit pas deux toasts rapprochés. */
  id?: string;
  kind: 'info' | 'success' | 'warning' | 'error';
  title: string;
  subtitle?: string;
  timeoutMs?: number;
}

export interface ExtensionInfo {
  name: string;
  moduleName: string;
  order?: number;
  meta: Record<string, unknown>;
}

/**
 * Services du Core mis à disposition des apps embarquées. Toute capacité sans fournisseur est
 * automatiquement refusée à la négociation (`UNAVAILABLE`) : on ne promet que ce qu'on sait servir.
 *
 * Règle d'or (doc 17 §2) : seulement ce dont le Core est lui-même la source. Pas d'identité/session, de droits, de thème ni d'appels
 * API relayés : l'app les obtient directement auprès de leurs sources (Keycloak, backends, service de thèmes).
 */
export interface HostProviders {
  tenant?: Watchable<{ id: string | null }>;
  locale?: Watchable<string>;
  config?: Watchable<Record<string, unknown>>;
  flags?: { isEnabled(name: string): boolean | Promise<boolean>; subscribe?(cb: () => void): Unsub };
  events?: { publish(topic: string, payload: unknown, ctx: CallerContext): void; subscribe(topic: string, cb: (payload: unknown) => void): Unsub };
  /** Affiche le toast dans l'interface du Core ; retourne `false` si non affiché (doublon, etc.). Le Core attribue le toast à son app d'origine. */
  notifications?: { show(n: NotificationInput, ctx: CallerContext): void | boolean | Promise<void | boolean> };
  dialogs?: { confirm(d: { title: string; message: string; danger?: boolean }, ctx: CallerContext): boolean | Promise<boolean> };
  /** Extensions attachées à un slot du Core (apps internes, framework, autres apps) : métadonnées seulement, jamais le rendu. */
  extensions?: { list(slot: string): ExtensionInfo[] | Promise<ExtensionInfo[]>; subscribe?(slot: string, cb: (list: ExtensionInfo[]) => void): Unsub };
  telemetry?: {
    log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ctx: Record<string, unknown> | undefined, from: CallerContext): void;
    metric(name: string, value: number, tags: Record<string, unknown> | undefined, from: CallerContext): void;
  };
}
