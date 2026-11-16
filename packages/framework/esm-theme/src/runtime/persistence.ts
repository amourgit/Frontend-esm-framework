import { validateThemeOverride } from '../model/validate.js';
import type { ThemeOverride, ThemeStorage } from '../model/types.js';

const FORMAT_VERSION = 1;

interface Stored {
  v: number;
  overrides: ThemeOverride[];
}

/** Stockage par défaut : `localStorage` si utilisable, sinon `null` (la persistance est alors simplement inactive). */
export function defaultStorage(): ThemeStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Surcharges globales persistées (versionnées, validées à la lecture : un contenu altéré est ignoré, jamais appliqué). */
export function createOverrideStore(storage: ThemeStorage | null, key: string | null) {
  const enabled = storage !== null && key !== null;
  const read = (): ThemeOverride[] => {
    if (!enabled) return [];
    try {
      const parsed = JSON.parse(storage!.getItem(key!) ?? 'null') as Stored | null;
      if (!parsed || parsed.v !== FORMAT_VERSION || !Array.isArray(parsed.overrides)) return [];
      return parsed.overrides.filter(
        (o) =>
          o && typeof o.id === 'string' && typeof o.priority === 'number' && validateThemeOverride(o.document).valid,
      );
    } catch {
      return [];
    }
  };
  const write = (overrides: ThemeOverride[]) => {
    if (!enabled) return;
    try {
      if (overrides.length === 0) storage!.removeItem(key!);
      else storage!.setItem(key!, JSON.stringify({ v: FORMAT_VERSION, overrides } satisfies Stored));
    } catch {
      /* quota / stockage bloqué : la surcharge reste active pour la session */
    }
  };
  return {
    enabled,
    load: read,
    save(override: ThemeOverride) {
      write([...read().filter((o) => o.id !== override.id), override]);
    },
    remove(id?: string) {
      write(id === undefined ? [] : read().filter((o) => o.id !== id));
    },
  };
}
