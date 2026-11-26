import { isPlainObject } from './guards.js';
import type { CapabilityId } from './types.js';

/** Retourne un message d'erreur, ou `null` si les arguments sont valides. */
export type Validator = (args: unknown[]) => string | null;

export interface MethodDescriptor {
  validate: Validator;
  /** `app-to-host` (défaut) ou `host-to-app` (rappel : l'hôte appelle l'app). */
  direction?: 'app-to-host' | 'host-to-app';
}

export interface CapabilityDescriptor {
  id: CapabilityId;
  /** Version majeure de la capacité. */
  version: number;
  /** Accordée sans approbation explicite (lecture sans risque). */
  defaultGrant: boolean;
  methods: Record<string, MethodDescriptor>;
  /** Événements nommés ; si `dynamicEvents`, tout nom d'événement est un sujet filtré par le grant. */
  events: readonly string[];
  dynamicEvents?: boolean;
  /** Clés de configuration de grant qui sont des listes, avec leur mode de comparaison. */
  listKeys: Record<string, 'exact' | 'pattern' | 'slot'>;
  /** Valeur d'une liste quand ni l'app ni l'opérateur n'en fixent. */
  listDefaults: Record<string, readonly string[]>;
}

/* ───────── Aides de validation ───────── */

const none: Validator = (a) => (a.length === 0 ? null : 'aucun argument attendu');
const str = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;

const oneString =
  (max: number): Validator =>
  (a) =>
    a.length === 1 && str(a[0], max) ? null : `un argument texte (≤ ${max}) attendu`;

/** Chemin interne d'une app : `/…`, sans `//`, sans schéma, sans espace ni caractère de contrôle, ≤ 2000. */
export function isInternalPath(p: unknown): p is string {
  if (typeof p !== 'string' || p.length === 0 || p.length > 2000) return false;
  if (p[0] !== '/' || p[1] === '/' || p[1] === '\\') return false;
  // eslint-disable-next-line no-control-regex
  return !/[\s\u0000-\u001f\u007f\\]/.test(p) && !/^\/[a-z][a-z0-9+.-]*:/i.test(p);
}

const SLOT_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;
export const isSlotName = (s: unknown): s is string => typeof s === 'string' && SLOT_RE.test(s);
const TOPIC_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/;
export const isTopic = (t: unknown): t is string => typeof t === 'string' && TOPIC_RE.test(t);

const objectArg = (a: unknown[], check: (o: Record<string, unknown>) => string | null, optional = false): string | null => {
  if (a.length === 0 && optional) return null;
  if (a.length !== 1 || !isPlainObject(a[0])) return 'un objet est attendu';
  return check(a[0]);
};

const KINDS = ['info', 'success', 'warning', 'error'];
const LEVELS = ['debug', 'info', 'warn', 'error'];

const m = (validate: Validator, direction?: MethodDescriptor['direction']): MethodDescriptor => ({ validate, direction });

/**
 * Catalogue des capacités v1 (doc 17 §5). Toute capacité hors catalogue est refusée.
 *
 * RÈGLE D'OR (doc 17 §2) : le SDK ne transporte que ce dont le Core est LUI-MÊME la source (état d'interface et services propres
 * du Core). Identité/session, droits, thème et appels API viennent de leurs sources (Keycloak, backends, source de thème) :
 * une app embarquée les obtient directement, jamais relayés par le Core (voir `REMOVED_CAPABILITIES`).
 */
export const CAPABILITIES: Readonly<Record<CapabilityId, CapabilityDescriptor>> = Object.freeze({
  tenant: { id: 'tenant', version: 1, defaultGrant: true, methods: { get: m(none) }, events: ['change'], listKeys: {}, listDefaults: {} },
  locale: { id: 'locale', version: 1, defaultGrant: true, methods: { get: m(none) }, events: ['change'], listKeys: {}, listDefaults: {} },
  navigation: {
    id: 'navigation',
    version: 1,
    defaultGrant: true,
    methods: {
      report: m((a) => {
        if (a.length < 1 || a.length > 2 || !isInternalPath(a[0])) return 'chemin interne attendu';
        if (a[1] === undefined) return null;
        const o = a[1];
        if (!isPlainObject(o)) return 'options : objet attendu';
        if (o.replace !== undefined && typeof o.replace !== 'boolean') return 'replace : booléen attendu';
        if (o.title !== undefined && !str(o.title, 300)) return 'title : texte ≤ 300 attendu';
        return null;
      }),
      navigate: m((a) => (a.length === 1 && isInternalPath(a[0]) ? null : 'chemin interne attendu')),
      setTitle: m(oneString(300)),
      resize: m((a) => (a.length === 1 && typeof a[0] === 'number' && Number.isFinite(a[0]) && a[0] >= 0 && a[0] <= 100_000 ? null : 'hauteur (0 à 100000) attendue')),
    },
    events: ['goto'],
    listKeys: {},
    listDefaults: {},
  },
  events: {
    id: 'events',
    version: 1,
    defaultGrant: false,
    methods: { publish: m((a) => (a.length >= 1 && a.length <= 2 && isTopic(a[0]) ? null : 'sujet attendu (minuscules, chiffres, . _ -)')) },
    events: [],
    dynamicEvents: true,
    listKeys: { publish: 'pattern', subscribe: 'pattern' },
    listDefaults: { publish: [], subscribe: [] },
  },
  notifications: {
    id: 'notifications',
    version: 1,
    defaultGrant: false,
    methods: {
      show: m((a) =>
        objectArg(a, (o) => {
          if (!KINDS.includes(o.kind as string)) return 'kind invalide';
          if (o.id !== undefined && !(typeof o.id === 'string' && /^[A-Za-z0-9._:-]{1,100}$/.test(o.id))) return 'id : [A-Za-z0-9._:-], ≤ 100';
          if (!str(o.title, 200)) return 'title : texte ≤ 200 attendu';
          if (o.subtitle !== undefined && !str(o.subtitle, 500)) return 'subtitle : texte ≤ 500 attendu';
          if (o.timeoutMs !== undefined && !(typeof o.timeoutMs === 'number' && o.timeoutMs >= 0 && o.timeoutMs <= 60_000)) return 'timeoutMs : 0 à 60000';
          return null;
        }),
      ),
    },
    events: [],
    listKeys: {},
    listDefaults: {},
  },
  dialogs: {
    id: 'dialogs',
    version: 1,
    defaultGrant: false,
    methods: {
      confirm: m((a) =>
        objectArg(a, (o) => {
          if (!str(o.title, 200) || !str(o.message, 2000)) return 'title et message attendus';
          if (o.danger !== undefined && typeof o.danger !== 'boolean') return 'danger : booléen attendu';
          return null;
        }),
      ),
    },
    events: [],
    listKeys: {},
    listDefaults: {},
  },
  flags: {
    id: 'flags',
    version: 1,
    defaultGrant: false,
    methods: { isEnabled: m(oneString(200)) },
    events: ['change'],
    listKeys: { names: 'exact' },
    listDefaults: { names: [] },
  },
  config: { id: 'config', version: 1, defaultGrant: true, methods: { get: m(none) }, events: ['change'], listKeys: {}, listDefaults: {} },
  telemetry: {
    id: 'telemetry',
    version: 1,
    defaultGrant: true,
    methods: {
      log: m((a) => (a.length >= 2 && a.length <= 3 && LEVELS.includes(a[0] as string) && str(a[1], 2000) && (a[2] === undefined || isPlainObject(a[2])) ? null : 'log(level, message, ctx?)')),
      metric: m((a) => (a.length >= 2 && a.length <= 3 && str(a[0], 100) && typeof a[1] === 'number' && Number.isFinite(a[1]) && (a[2] === undefined || isPlainObject(a[2])) ? null : 'metric(name, value, tags?)')),
    },
    events: [],
    listKeys: {},
    listDefaults: {},
  },
  'ai-tools': {
    id: 'ai-tools',
    version: 1,
    defaultGrant: false,
    methods: {
      register: m((a) =>
        a.length === 1 && Array.isArray(a[0]) && a[0].length > 0 && a[0].length <= 50 &&
        a[0].every((t) => isPlainObject(t) && str(t.name, 100) && str(t.description, 1000) && (t.inputSchema === undefined || isPlainObject(t.inputSchema)))
          ? null
          : 'tableau de { name, description, inputSchema? } attendu',
      ),
      unregister: m((a) => (a.length === 1 && Array.isArray(a[0]) && a[0].length <= 50 && a[0].every((n) => str(n, 100)) ? null : 'tableau de noms attendu')),
      invoke: m((a) => (a.length === 2 && str(a[0], 100) && isPlainObject(a[1]) ? null : 'invoke(name, args)'), 'host-to-app'),
    },
    events: [],
    listKeys: { tools: 'pattern' },
    listDefaults: { tools: [] },
  },
  extensions: {
    id: 'extensions',
    version: 1,
    defaultGrant: false,
    methods: {
      // Découverte : métadonnées des extensions attachées à un slot du Core (filtrées par les privilèges de l'utilisateur côté Core).
      list: m((a) => (a.length === 1 && isSlotName(a[0]) ? null : 'nom de slot attendu (minuscules, chiffres, tirets)')),
    },
    events: [],
    dynamicEvents: true,
    // `discover` : slots dont l'app peut LIRE les extensions ; `contribute` : slots où l'app peut AJOUTER ses composants (approbation opérateur).
    listKeys: { discover: 'slot', contribute: 'slot' },
    listDefaults: { discover: [], contribute: [] },
  },
  lifecycle: {
    id: 'lifecycle',
    version: 1,
    defaultGrant: true,
    methods: { ready: m(none), canLeave: m(none, 'host-to-app') },
    events: ['visibility', 'focus'],
    listKeys: {},
    listDefaults: {},
  },
});

export const CAPABILITY_IDS = Object.keys(CAPABILITIES) as CapabilityId[];

export function getCapability(id: string): CapabilityDescriptor | undefined {
  return Object.prototype.hasOwnProperty.call(CAPABILITIES, id) ? CAPABILITIES[id as CapabilityId] : undefined;
}

/** Valide les arguments d'un appel `cap.method` ; `null` = valide. */
export function validateCall(cap: string, method: string, args: unknown[], direction: 'app-to-host' | 'host-to-app' = 'app-to-host'): string | null {
  const d = getCapability(cap);
  if (!d) return `capacité inconnue : ${cap}`;
  const md = Object.prototype.hasOwnProperty.call(d.methods, method) ? d.methods[method] : undefined;
  if (!md) return `méthode inconnue : ${cap}.${method}`;
  if ((md.direction ?? 'app-to-host') !== direction) return `sens interdit pour ${cap}.${method}`;
  return md.validate(args);
}

/**
 * Capacités volontairement ABSENTES du SDK, avec la raison et la voie à suivre. Demandées dans un manifeste, elles sont
 * rejetées avec ce message (au lieu d'un « capacité inconnue » sans explication).
 */
export const REMOVED_CAPABILITIES: Readonly<Record<string, string>> = Object.freeze({
  session: "l'identité ne vient pas du Core : l'app obtient son jeton auprès de Keycloak (OIDC)",
  auth: "l'authentification ne vient pas du Core : l'app obtient son jeton auprès de Keycloak (OIDC)",
  permissions: "les droits sont portés par le jeton et le backend de l'app, pas par le Core",
  theme: "le thème vient de sa source (service de thèmes), pas du Core",
  api: "l'app appelle ses backends avec son propre jeton Keycloak ; le Core ne relaie pas d'appels authentifiés",
});
