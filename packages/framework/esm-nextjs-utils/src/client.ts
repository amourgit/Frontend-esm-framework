/**
 * Côté application embarquée (Next.js ou autre) : s'exécute DANS l'iframe, sans dépendance au Framework.
 * Ne l'utiliser que côté navigateur (dans un `useEffect` pour Next.js : pas pendant le rendu serveur).
 */
import { isEnvelope, wrap, type EmbedInit, type EmbedToHost, type HostToEmbed } from './protocol.js';

export type { EmbedInit } from './protocol.js';

export interface EgenBridgeOptions {
  /** Nom du module (identique à `moduleName` du lifecycle côté Shell). */
  moduleName: string;
  /** Origines du Shell autorisées. Obligatoire, jamais « * ». */
  allowedHostOrigins: string[];
}

export interface EgenBridge {
  /** Résolue à la réception des données initiales du Shell. */
  ready: Promise<EmbedInit>;
  /** Dernières données connues (session, langue). */
  getState(): Partial<EmbedInit>;
  /** S'abonne aux changements (session, langue) ; renvoie le désabonnement. */
  subscribe(listener: (state: Partial<EmbedInit>) => void): () => void;
  /** Demande une navigation du Shell vers un chemin interne (`/accueil`). */
  navigate(to: string): void;
  /** Annonce la hauteur du contenu (le Shell redimensionne l'iframe). */
  setHeight(height: number): void;
  /** Annonce un titre accessible pour l'iframe. */
  setTitle(title: string): void;
  /** Annonce automatiquement la hauteur du document (ResizeObserver). */
  autoResize(): () => void;
  destroy(): void;
}

export function createEgenBridge(opts: EgenBridgeOptions): EgenBridge {
  if (!opts.allowedHostOrigins?.length || opts.allowedHostOrigins.some((o) => o === '*' || o === 'null')) {
    throw new Error('allowedHostOrigins : au moins une origine explicite est requise (jamais « * »).');
  }
  const host = window.parent;
  if (host === window) throw new Error("createEgenBridge doit s'exécuter dans une iframe affichée par le Shell EGEN.");

  let state: Partial<EmbedInit> = {};
  const listeners = new Set<(s: Partial<EmbedInit>) => void>();
  let resolveReady!: (i: EmbedInit) => void;
  const ready = new Promise<EmbedInit>((r) => (resolveReady = r));
  // L'origine du Shell n'est connue qu'à la première réponse : le message `ready` est donc envoyé à chaque origine autorisée.
  let hostOrigin: string | undefined;

  const emit = () => listeners.forEach((l) => l(state));
  const onMessage = (event: MessageEvent) => {
    if (event.source !== host || !opts.allowedHostOrigins.includes(event.origin)) return;
    if (!isEnvelope(event.data, opts.moduleName)) return;
    hostOrigin = event.origin;
    const msg = event.data.message as HostToEmbed;
    if (msg.kind === 'init') {
      state = { ...msg.payload };
      resolveReady(msg.payload);
      emit();
    } else if (msg.kind === 'session') {
      state = { ...state, session: msg.session };
      emit();
    } else if (msg.kind === 'locale') {
      state = { ...state, locale: msg.locale };
      emit();
    }
  };
  window.addEventListener('message', onMessage);

  const send = (message: EmbedToHost) => {
    const targets = hostOrigin ? [hostOrigin] : opts.allowedHostOrigins;
    targets.forEach((o) => host.postMessage(wrap(opts.moduleName, message), o));
  };
  send({ kind: 'ready' });

  return {
    ready,
    getState: () => state,
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    navigate: (to) => send({ kind: 'navigate', to }),
    setHeight: (height) => send({ kind: 'resize', height }),
    setTitle: (title) => send({ kind: 'title', title }),
    autoResize() {
      const ro = new ResizeObserver(() => send({ kind: 'resize', height: document.documentElement.scrollHeight }));
      ro.observe(document.documentElement);
      return () => ro.disconnect();
    },
    destroy() {
      window.removeEventListener('message', onMessage);
      listeners.clear();
    },
  };
}
