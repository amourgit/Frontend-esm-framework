import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { connectToEgen, type ConnectOptions } from './connect.js';
import type { EgenClient, JsonObject, ThemeState } from './client.js';

const EgenContext = createContext<EgenClient | null>(null);

export interface EgenProviderProps {
  options: ConnectOptions;
  /** Affiché pendant la poignée de main (au plus `timeoutMs`). */
  loading?: ReactNode;
  children?: ReactNode;
}

/** Connecte l'app au Shell EGEN et fournit le client. Les enfants ne sont rendus qu'une fois la connexion résolue (connectée ou autonome). */
export function EgenProvider({ options, loading = null, children }: EgenProviderProps) {
  const [client, setClient] = useState<EgenClient | null>(null);
  const optionsRef = useRef(options);
  useEffect(() => {
    let cancelled = false;
    let current: EgenClient | undefined;
    connectToEgen(optionsRef.current).then((c) => {
      if (cancelled) c.close();
      else {
        current = c;
        setClient(c);
      }
    });
    return () => {
      cancelled = true;
      current?.close();
    };
  }, []);
  if (!client) return createElement(EgenContext.Provider, { value: null }, loading);
  return createElement(EgenContext.Provider, { value: client }, children);
}

/** Client EGEN ; lève si utilisé hors de `EgenProvider` ou avant la fin de la connexion. */
export function useEgen(): EgenClient {
  const c = useContext(EgenContext);
  if (!c) throw new Error('[egen-embed] useEgen doit être appelé sous <EgenProvider> (après la connexion).');
  return c;
}

interface Live<T> {
  value: T | undefined;
  loading: boolean;
  error: unknown;
}

function useLive<T>(client: EgenClient, enabled: boolean, get: () => Promise<T>, watch: (cb: (v: T) => void) => Promise<() => void>): Live<T> {
  const [state, setState] = useState<Live<T>>({ value: undefined, loading: enabled, error: undefined });
  useEffect(() => {
    if (!enabled) return setState({ value: undefined, loading: false, error: undefined });
    let off: (() => void) | undefined;
    let dead = false;
    get()
      .then((v) => !dead && setState({ value: v, loading: false, error: undefined }))
      .catch((error) => !dead && setState({ value: undefined, loading: false, error }));
    watch((v) => !dead && setState({ value: v, loading: false, error: undefined }))
      .then((o) => (dead ? o() : (off = o)))
      .catch(() => undefined);
    return () => {
      dead = true;
      off?.();
    };
  }, [client, enabled]);
  return state;
}

export function useEgenSession(): Live<JsonObject> {
  const c = useEgen();
  return useLive(c, c.has('session'), () => c.session.get(), (cb) => c.session.onChange(cb));
}

export function useEgenTheme(): Live<ThemeState> {
  const c = useEgen();
  return useLive(c, c.has('theme'), () => c.theme.get(), (cb) => c.theme.onChange(cb));
}

/** Abonnement à un sujet du bus d'événements (grant `events.subscribe`). */
export function useEgenEvent(topic: string, handler: (payload: unknown) => void): void {
  const c = useEgen();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!c.has('events')) return;
    let off: (() => void) | undefined;
    let dead = false;
    c.events
      .subscribe(topic, (p) => ref.current(p))
      .then((o) => (dead ? o() : (off = o)))
      .catch(() => undefined);
    return () => {
      dead = true;
      off?.();
    };
  }, [c, topic]);
}
