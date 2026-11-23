import type { LifeCycles } from 'single-spa';
import {
  assertLifecycleOptions,
  resolveMountTarget,
  toLifecycleExport,
  watchSession,
  watchTranslations,
  type LifecycleExport,
  type LifecycleOptions,
  type Unsubscribe,
} from '@egen-civitas/esm-integration-utils';
import {
  buildCoreUrl,
  buildEmbedSrc,
  coreSubpath,
  createRateLimiter,
  stripSensitive,
  toAppPath,
  toCorePath,
  type NavigationOptions,
} from './navigation.js';
import { DEFAULT_SESSION_FIELDS, isEnvelope, pickFields, wrap, type EmbedToHost, type HostToEmbed } from './protocol.js';

export interface EmbedLifecycleOptions extends LifecycleOptions {
  /** URL de l'application embarquée (ou fonction des props Single-SPA). */
  url: string | ((props: Record<string, any>) => string);
  /** Origine autorisée pour les messages (défaut : origine de `url`). Jamais de « * ». */
  allowedOrigin?: string;
  /** Champs de session transmis (notation pointée). Défaut : `DEFAULT_SESSION_FIELDS` (sans `sessionId`). */
  sessionFields?: string[];
  /** Attribut `sandbox` de l'iframe (défaut : scripts + même origine + formulaires + popups). */
  sandbox?: string;
  /** Titre accessible de l'iframe. */
  title?: string;
  /** Hauteur minimale en px tant que l'application n'a pas annoncé la sienne (défaut 400). */
  minHeight?: number;
  /** Navigation demandée par l'application (défaut : `singleSpaNavigate(spaBase + chemin)`). */
  onNavigate?: (to: string) => void;
  /**
   * Navigation partagée (protocole 1.1) : l'URL du Core reflète la page courante de l'application et inversement
   * (actualisation, retour/avance, lien partageable). Absent ou `mode: 'none'` : comportement opaque d'origine.
   */
  navigation?: NavigationOptions;
}

const DEFAULT_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups';
const SAFE_PATH = /^\/(?!\/)[^\s\\]*$/;

/** Chemin relatif interne uniquement (`/x`), jamais d'URL absolue ni `//hôte`. */
export function isSafeInternalPath(to: unknown): to is string {
  return typeof to === 'string' && SAFE_PATH.test(to);
}

/**
 * Lifecycles Single-SPA qui affichent une application autonome (ex. Next.js avec SSR) dans une iframe
 * et la relient au Shell par un pont `postMessage` :
 *   Shell → app : langue, session filtrée ; app → Shell : prêt, navigation, hauteur, titre.
 * Sécurité : messages acceptés seulement de l'iframe elle-même ET de l'origine autorisée ; envoi toujours
 * avec une origine cible explicite ; navigation limitée aux chemins internes.
 */
export function getEmbedLifecycle(userOpts: EmbedLifecycleOptions): LifeCycles {
  assertLifecycleOptions(userOpts);
  const opts = userOpts;
  const fields = opts.sessionFields ?? DEFAULT_SESSION_FIELDS;
  const mounted = new Map<string, { iframe: HTMLIFrameElement; stop: Unsubscribe[] }>();

  return {
    bootstrap: () => Promise.resolve(),
    mount: (props: any) => {
      const target = resolveMountTarget(props);
      const baseUrl = typeof opts.url === 'function' ? opts.url(props) : opts.url;
      const nav = opts.navigation && (opts.navigation.mode ?? 'history') !== 'none' ? { ...opts.navigation, mode: opts.navigation.mode ?? 'history' } : undefined;
      const spaBase = (): string => (window as any).getEgenSpaBase?.() ?? '/';
      /** Page courante du Core, en chemin (`/x?q#h`) relatif à la route de l'application ; `null` hors de cette page. */
      const currentCorePath = (): string | null => {
        if (!nav) return null;
        const sub = coreSubpath(window.location.pathname, spaBase(), nav.route);
        if (sub === null) return null;
        const raw = sub + window.location.search + window.location.hash;
        return stripSensitive(raw, nav.sensitiveParams);
      };
      let lastCorePath = currentCorePath() ?? '/';
      const initialAppPath = nav ? toAppPath(lastCorePath, nav) ?? '/' : '/';
      const src = nav ? buildEmbedSrc(baseUrl, initialAppPath, nav.mode) : baseUrl;
      const origin = opts.allowedOrigin ?? new URL(src, window.location.href).origin;
      if (origin === '*' || origin === 'null') throw new Error('allowedOrigin invalide : une origine explicite est requise.');

      const sandbox = opts.sandbox ?? DEFAULT_SANDBOX;
      if (origin === window.location.origin && /allow-scripts/.test(sandbox) && /allow-same-origin/.test(sandbox)) {
        console.warn(
          `[egen] ${opts.moduleName} : application embarquée de même origine que le Shell avec « allow-scripts allow-same-origin » : ` +
            "le bac à sable est sans effet. Héberger l'application sur une autre origine (sous-domaine).",
        );
      }
      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.title = opts.title ?? opts.featureName;
      iframe.setAttribute('sandbox', sandbox);
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      // Demande au Shell de donner à ce conteneur la hauteur de
      // #egen-scroll-region (règle :has(> [data-egen-fill]) du styleguide).
      iframe.setAttribute('data-egen-fill', '');
      iframe.style.cssText = `width:100%;border:0;display:block;min-height:${opts.minHeight ?? 400}px`;

      const send = (message: HostToEmbed) => iframe.contentWindow?.postMessage(wrap(opts.moduleName, message), origin);
      const stop: Unsubscribe[] = [];
      let ready = false;
      let lastSession: Record<string, unknown> | undefined;
      let bridgeSeen = false;
      let seq = 0;
      const allowLocation = createRateLimiter();

      const onMessage = (event: MessageEvent) => {
        if (event.source !== iframe.contentWindow || event.origin !== origin) return;
        if (!isEnvelope(event.data, opts.moduleName)) return;
        const msg = event.data.message as EmbedToHost;
        switch (msg.kind) {
          case 'ready':
            ready = true;
            bridgeSeen = true;
            send({
              kind: 'init',
              payload: {
                moduleName: opts.moduleName,
                locale: (window as any).i18next?.language,
                spaBase: (window as any).getEgenSpaBase?.() ?? '/',
                session: lastSession,
                navigation: nav ? { mode: nav.mode!, route: nav.route } : undefined,
              },
            });
            break;
          case 'navigate':
            if (isSafeInternalPath(msg.to)) {
              (opts.onNavigate ?? ((to) => (window as any).singleSpaNavigate?.(((window as any).getEgenSpaBase?.() ?? '/') + to.replace(/^\//, ''))))(msg.to);
            }
            break;
          case 'resize':
            if (Number.isFinite(msg.height) && msg.height >= 0) iframe.style.height = `${Math.min(Math.ceil(msg.height), 100_000)}px`;
            break;
          case 'title':
            if (typeof msg.title === 'string') iframe.title = msg.title.slice(0, 200);
            break;
          case 'location': {
            if (!nav || !allowLocation()) break;
            bridgeSeen = true;
            if (typeof msg.title === 'string') {
              iframe.title = msg.title.slice(0, 200);
              nav.onTitle?.(iframe.title);
            }
            const corePath = toCorePath(msg.path, nav);
            if (!corePath || corePath === lastCorePath) break;
            lastCorePath = corePath;
            const url = buildCoreUrl(spaBase(), nav.route, corePath);
            // History API (surchargée par Single-SPA) : la page reste active (la route correspond toujours), sans remontage.
            window.history[msg.replace ? 'replaceState' : 'pushState'](window.history.state, '', url);
            break;
          }
        }
      };
      window.addEventListener('message', onMessage);
      stop.push(() => window.removeEventListener('message', onMessage));

      if (nav) {
        // poignée de main à chaque chargement de l'iframe (le script injectable n'a pas besoin de connaître l'origine du Shell)
        const onLoad = () => send({ kind: 'hello' });
        iframe.addEventListener('load', onLoad);
        stop.push(() => iframe.removeEventListener('load', onLoad));
        // URL du Core modifiée hors de l'application (retour/avance, lien) → l'application suit
        const onCoreLocation = () => {
          const cur = currentCorePath();
          if (cur === null || cur === lastCorePath) return;
          lastCorePath = cur;
          const appPath = toAppPath(cur, nav);
          if (!appPath) return;
          if (bridgeSeen) send({ kind: 'goto', path: appPath, seq: ++seq });
          else iframe.src = buildEmbedSrc(baseUrl, appPath, nav.mode);
        };
        window.addEventListener('single-spa:routing-event', onCoreLocation);
        window.addEventListener('popstate', onCoreLocation);
        stop.push(() => {
          window.removeEventListener('single-spa:routing-event', onCoreLocation);
          window.removeEventListener('popstate', onCoreLocation);
        });
      }

      stop.push(
        watchSession((session) => {
          lastSession = pickFields(session, fields);
          if (ready) send({ kind: 'session', session: lastSession });
        }),
      );
      stop.push(
        watchTranslations(() => {
          const locale = (window as any).i18next?.language;
          if (ready && locale) send({ kind: 'locale', locale });
        }),
      );

      target.appendChild(iframe);
      mounted.set(props.name, { iframe, stop });
      return Promise.resolve();
    },
    unmount: (props: any) => {
      const m = mounted.get(props.name);
      if (m) {
        m.stop.forEach((s) => s());
        m.iframe.remove();
        mounted.delete(props.name);
      }
      return Promise.resolve();
    },
  } as LifeCycles;
}

/** Export prêt pour `routes.json` : fonction → promesse de lifecycles. */
export function getSyncLifecycle(options: EmbedLifecycleOptions): LifecycleExport {
  return toLifecycleExport(getEmbedLifecycle(options));
}
