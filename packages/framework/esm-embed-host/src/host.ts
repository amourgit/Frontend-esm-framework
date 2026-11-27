import { sanitizeIframeRights, type CapabilityDenied, type CapabilityGranted, type EffectiveGrants, type IframeRights, type Limits } from '@egen-civitas/esm-embed-protocol';
import { createBus } from './bus.js';
import { HostConnection } from './connection.js';
import { buildCoreUrl, buildEmbedSrc, coreSubpath, createRateLimiter, stripSensitive, toAppPath, toCorePath, normalizeAppPath, type NavigationOptions } from './navigation.js';
import type { HostProviders, Unsub } from './providers.js';
import type { HostControls } from './table.js';

export interface EmbedHostOptions {
  /** Nom du module (= `name` de `egen-config.json`). */
  moduleName: string;
  /** URL de base de l'application embarquée. */
  src: string;
  /** Origine autorisée (défaut : origine de `src`). Jamais `*`. */
  allowedOrigin?: string;
  /** Grants effectifs (`effectiveGrants(manifeste.capabilities, approuvés)`). */
  grants: EffectiveGrants;
  providers: HostProviders;
  /**
   * Droits d'iframe EFFECTIFS (`effectiveIframe(manifeste.iframe, approuvés.iframe)`) : ils étendent le socle
   * (`allow-scripts allow-same-origin allow-forms allow-popups`). Les jetons hors liste blanche sont écartés.
   */
  iframe?: IframeRights;
  title?: string;
  minHeight?: number;
  /** Navigation partagée Core ↔ app (URL du Core = source de vérité). Absent ou `none` : opaque. */
  navigation?: NavigationOptions;
  /** Navigation demandée par l'app vers le Core (défaut : `singleSpaNavigate`). */
  onNavigate?: (to: string) => void;
  limits?: Partial<Limits>;
  hostVersion?: string;
  window?: Window;
  onConnect?(granted: CapabilityGranted[], denied: CapabilityDenied[]): void;
  onClose?(reason: string): void;
}

export interface EmbedHost {
  readonly iframe: HTMLIFrameElement;
  readonly connection: HostConnection;
  mount(container: Element): void;
  /** L'app accepte-t-elle qu'on la quitte ? `true` si non connectée, sans réponse, ou en cas d'erreur (on ne piège jamais l'utilisateur). */
  canLeave(timeoutMs?: number): Promise<boolean>;
  destroy(): void;
}

/** Socle d'isolation appliqué à toute app embarquée ; les droits négociés (`iframe`) ne peuvent que l'étendre. */
const BASE_SANDBOX = ['allow-scripts', 'allow-same-origin', 'allow-forms', 'allow-popups'];

/**
 * Hôte d'une app embarquée : iframe sécurisée, poignée de main v2 (`HostConnection`), navigation partagée,
 * événements de cycle de vie. Une seule voie : le protocole 2 (SDK `esm-embed-client`).
 * Sécurité : messages acceptés seulement de l'iframe elle-même ET de l'origine autorisée ; envoi toujours avec une origine explicite.
 */
export function createEmbedHost(opts: EmbedHostOptions): EmbedHost {
  const win: Window = opts.window ?? window;
  const doc = win.document;
  const nav = opts.navigation && (opts.navigation.mode ?? 'history') !== 'none' ? { ...opts.navigation, mode: opts.navigation.mode ?? ('history' as const) } : undefined;
  const spaBase = (): string => (win as any).getEgenSpaBase?.() ?? '/';
  const currentCorePath = (): string | null => {
    if (!nav) return null;
    const sub = coreSubpath(win.location.pathname, spaBase(), nav.route);
    return sub === null ? null : stripSensitive(sub + win.location.search + win.location.hash, nav.sensitiveParams);
  };
  let lastCorePath = currentCorePath() ?? '/';
  const initialAppPath = nav ? (toAppPath(lastCorePath, nav) ?? '/') : '/';
  const src = nav ? buildEmbedSrc(opts.src, initialAppPath, nav.mode) : opts.src;
  const origin = opts.allowedOrigin ?? new URL(src, win.location.href).origin;
  if (origin === '*' || origin === 'null') throw new Error('allowedOrigin invalide : une origine explicite est requise.');
  const rights = sanitizeIframeRights(opts.iframe);
  const sandbox = [...new Set([...BASE_SANDBOX, ...rights.sandbox])].join(' ');
  if (origin === win.location.origin && /allow-scripts/.test(sandbox) && /allow-same-origin/.test(sandbox)) {
    console.warn(`[egen] ${opts.moduleName} : application embarquée de même origine que le Shell avec « allow-scripts allow-same-origin » : le bac à sable est sans effet. Héberger l'application sur une autre origine (sous-domaine).`);
  }

  const iframe = doc.createElement('iframe');
  iframe.src = src;
  iframe.title = opts.title ?? opts.moduleName;
  iframe.setAttribute('sandbox', sandbox);
  if (rights.allow.length) iframe.setAttribute('allow', rights.allow.join('; '));
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  iframe.setAttribute('data-egen-fill', '');
  iframe.style.cssText = `width:100%;border:0;display:block;min-height:${opts.minHeight ?? 400}px`;

  const channel = createBus();
  const allowLocation = createRateLimiter();
  const stop: Unsub[] = [];
  let seq = 0;

  const postRaw = (message: unknown, transfer?: Transferable[]) => iframe.contentWindow?.postMessage(message, origin, transfer);

  /** Page courante annoncée par l'app → URL du Core. */
  const reportLocation = (path: unknown, o?: { replace?: boolean; title?: string }) => {
    if (!nav || !allowLocation()) return;
    if (typeof o?.title === 'string') {
      iframe.title = o.title.slice(0, 200);
      nav.onTitle?.(iframe.title);
    }
    const corePath = toCorePath(path, nav);
    if (!corePath || corePath === lastCorePath) return;
    lastCorePath = corePath;
    win.history[o?.replace ? 'replaceState' : 'pushState'](win.history.state, '', buildCoreUrl(spaBase(), nav.route, corePath));
  };

  const controls: HostControls = {
    channel,
    report: (path, o) => reportLocation(path, o),
    navigate: (to) => {
      if (normalizeAppPath(to) === null) return;
      (opts.onNavigate ?? ((t) => (win as any).singleSpaNavigate?.(spaBase() + t.replace(/^\//, ''))))(to);
    },
    setTitle: (t) => void (iframe.title = String(t).slice(0, 200)),
    resize: (h) => {
      if (Number.isFinite(h) && h >= 0) iframe.style.height = `${Math.min(Math.ceil(h), 100_000)}px`;
    },
  };

  const connection = new HostConnection({
    moduleName: opts.moduleName,
    grants: opts.grants,
    providers: opts.providers,
    controls,
    post: postRaw,
    limits: opts.limits,
    hostVersion: opts.hostVersion,
    onConnect: opts.onConnect,
    onClose: opts.onClose,
  });

  const onMessage = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow || event.origin !== origin) return;
    connection.handle(event.data);
  };

  return {
    iframe,
    connection,
    mount(container) {
      win.addEventListener('message', onMessage as EventListener);
      stop.push(() => win.removeEventListener('message', onMessage as EventListener));

      const onLoad = () => connection.hello();
      iframe.addEventListener('load', onLoad);
      stop.push(() => iframe.removeEventListener('load', onLoad));

      if (nav) {
        const onCoreLocation = () => {
          const cur = currentCorePath();
          if (cur === null || cur === lastCorePath) return;
          lastCorePath = cur;
          const appPath = toAppPath(cur, nav);
          if (!appPath) return;
          if (connection.connected) channel.emit('goto', { path: appPath, seq: ++seq });
          else iframe.src = buildEmbedSrc(opts.src, appPath, nav.mode);
        };
        win.addEventListener('single-spa:routing-event', onCoreLocation);
        win.addEventListener('popstate', onCoreLocation);
        stop.push(() => {
          win.removeEventListener('single-spa:routing-event', onCoreLocation);
          win.removeEventListener('popstate', onCoreLocation);
        });
      }

      const onVisibility = () => channel.emit('visibility', !doc.hidden);
      const onFocus = () => channel.emit('focus', true);
      const onBlur = () => channel.emit('focus', false);
      doc.addEventListener('visibilitychange', onVisibility);
      win.addEventListener('focus', onFocus);
      win.addEventListener('blur', onBlur);
      stop.push(() => {
        doc.removeEventListener('visibilitychange', onVisibility);
        win.removeEventListener('focus', onFocus);
        win.removeEventListener('blur', onBlur);
      });

      container.appendChild(iframe);
    },
    async canLeave(timeoutMs = 1500) {
      if (!connection.connected) return true;
      try {
        const r = await Promise.race([connection.callApp<boolean>('lifecycle', 'canLeave'), new Promise<undefined>((res) => setTimeout(res, timeoutMs))]);
        return r === undefined ? true : !!r;
      } catch {
        return true;
      }
    },
    destroy() {
      while (stop.length) stop.pop()!();
      connection.destroy();
      iframe.remove();
    },
  };
}
