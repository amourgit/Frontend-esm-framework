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
      const src = typeof opts.url === 'function' ? opts.url(props) : opts.url;
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
      iframe.style.cssText = `width:100%;border:0;display:block;min-height:${opts.minHeight ?? 400}px`;

      const send = (message: HostToEmbed) => iframe.contentWindow?.postMessage(wrap(opts.moduleName, message), origin);
      const stop: Unsubscribe[] = [];
      let ready = false;
      let lastSession: Record<string, unknown> | undefined;

      const onMessage = (event: MessageEvent) => {
        if (event.source !== iframe.contentWindow || event.origin !== origin) return;
        if (!isEnvelope(event.data, opts.moduleName)) return;
        const msg = event.data.message as EmbedToHost;
        switch (msg.kind) {
          case 'ready':
            ready = true;
            send({
              kind: 'init',
              payload: {
                moduleName: opts.moduleName,
                locale: (window as any).i18next?.language,
                spaBase: (window as any).getEgenSpaBase?.() ?? '/',
                session: lastSession,
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
        }
      };
      window.addEventListener('message', onMessage);
      stop.push(() => window.removeEventListener('message', onMessage));

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
