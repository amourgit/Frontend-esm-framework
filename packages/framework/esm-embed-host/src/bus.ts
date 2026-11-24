import type { Unsub } from './providers.js';

/** Bus interne hôte → app (navigation.goto, lifecycle.visibility/focus). */
export interface Bus {
  on(name: string, cb: (v: unknown) => void): Unsub;
  emit(name: string, value?: unknown): void;
}

export function createBus(): Bus {
  const map = new Map<string, Set<(v: unknown) => void>>();
  return {
    on(name, cb) {
      let set = map.get(name);
      if (!set) map.set(name, (set = new Set()));
      set.add(cb);
      return () => set!.delete(cb);
    },
    emit(name, value) {
      for (const cb of [...(map.get(name) ?? [])]) {
        try {
          cb(value);
        } catch {
          /* un abonné fautif ne doit pas bloquer les autres */
        }
      }
    },
  };
}
