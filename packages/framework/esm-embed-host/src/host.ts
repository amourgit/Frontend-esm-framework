import { type CapabilityDenied, type CapabilityGranted, type EffectiveGrants, type Limits } from '@egen-civitas/esm-embed-protocol';
import { createBus } from './bus.js';
import { HostConnection } from './connection.js';
import { buildCoreUrl, buildEmbedSrc, coreSubpath, createRateLimiter, stripSensitive, toAppPath, toCorePath, normalizeAppPath, type NavigationOptions } from './navigation.js';
import type { HostProviders, Unsub } from './providers.js';
import type { HostControls } from './table.js';

export interface EmbedHostOptions {
  /** Nom du module (= `name` du manifeste). */
  moduleName: string;
  /** URL de base de l'application embarquée. */
  src: string;
  /** Origine autorisée (défaut : origine de `src`). Jamais `*`. */
  allowedOrigin?: string;
  /** Grants effectifs (`effectiveGrants(manifeste.capabilities, approuvés)`). */
  grants: EffectiveGrants;
  providers: HostProviders;
  /** Attribut `sandbox` (défaut : scripts, même origine, formulaires, popups). */
  sandbox?: string;
  title?: string;
  minHeight?: number;
  /** Navigation partagée Core ↔ app (URL du Core = source de vérité). Absent ou `none` : opaque. */
  navigation?: NavigationOptions;
  /** Navigation demandée par l'app vers le Core (défaut : `singleSpaNavigate`). */
  onNavigate?: (to: string) => void;
  limits?: Partial<Limits>;
  hostVersion?: string;
  /** Accepter aussi les apps qui parlent encore le pont 1.1 (défaut : oui). */
  legacy?: boolean;
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

const DEFAULT_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups';

/**
 * Hôte d'une app embarquée : iframe sécurisée, poignée de main v2 (`HostConnection`), navigation partagée,
 * événements de cycle de vie, et pont 1.1 pour les apps qui ne parlent pas encore le protocole 2.
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
  const sandbox = opts.sandbox ?? DEFAULT_SANDBOX;
  if (origin === win.location.origin && /allow-scripts/.test(sandbox) && /allow-same-origin/.test(sandbox)) {
    console.warn(`[egen] ${opts.moduleName} : application embarquée de même origine que le Shell avec « allow-scripts allow-same-origin » : le bac à sable est sans effet. Héberger l'application sur une autre origine (sous-domaine).`);
  }

  const iframe = doc.createElement('iframe');
  iframe.src = src;
  iframe.title = opts.title ?? opts.moduleName;
  iframe.setAttribute('sandbox', sandbox);
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  iframe.setAttribute('data-egen-fill', '');
  iframe.style.cssText = `width:100%;border:0;display:block;min-height:${opts.minHeight ?? 400}px`;

  const channel = createBus();
  const allowLocation = createRateLimiter();
  const stop: Unsub[] = [];
  let seq = 0;
  let legacySeen = false;
  let legacyReady = false;

  const postRaw = (message: unknown, transfer?: Transferable[]) => iframe.contentWindow?.postMessage(message, origin, transfer);
  const legacySend = (message: unknown) => postRaw({ egen: 1, moduleName: opts.moduleName, message });

  /** Page courante annoncée par l'app → URL du Core (partagé entre le protocole 2 et le pont 1.1). */
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

  /**
   * Pont 1.1 : compatibilité des apps qui ne parlent pas encore le protocole 2. La session n'est PLUS transmise (règle d'or,
   * doc 17 §2) : une app obtient son identité auprès de Keycloak. Seuls restent la langue, la navigation, le titre et la hauteur.
   */
  const handleLegacy = async (data: any) => {
    if (opts.legacy === false || connection.connected) return;
    if (!data || data.egen !== 1 || data.moduleName !== opts.moduleName || !data.message || typeof data.message.kind !== 'string') return;
    const msg = data.message;
    switch (msg.kind) {
      case 'ready': {
        legacySeen = true;
        legacyReady = true;
        const locale = opts.providers.locale ? await opts.providers.locale.get() : (win as any).i18next?.language;
        legacySend({ kind: 'init', payload: { moduleName: opts.moduleName, locale, spaBase: spaBase(), navigation: nav ? { mode: nav.mode, route: nav.route } : undefined } });
        break;
      }
      case 'navigate':
        controls.navigate?.(msg.to);
        break;
      case 'resize':
        controls.resize?.(msg.height);
        break;
      case 'title':
        if (typeof msg.title === 'string') iframe.title = msg.title.slice(0, 200);
        break;
      case 'location':
        legacySeen = true;
        reportLocation(msg.path, { replace: !!msg.replace, title: msg.title });
        break;
    }
  };

  const onMessage = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow || event.origin !== origin) return;
    if (!connection.handle(event.data)) void handleLegacy(event.data);
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
          else if (legacySeen) legacySend({ kind: 'goto', path: appPath, seq: ++seq });
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

      // Pont 1.1 : la langue est poussée après `ready`.
      const p = opts.providers;
      if (p.locale?.subscribe) stop.push(p.locale.subscribe((l) => legacyReady && !connection.connected && l && legacySend({ kind: 'locale', locale: l })));

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
