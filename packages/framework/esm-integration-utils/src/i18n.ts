import type { Unsubscribe } from './types.js';

type I18n = {
  t: (key: string, options?: Record<string, unknown>) => string;
  on: (event: string, cb: (...a: any[]) => void) => void;
  off: (event: string, cb: (...a: any[]) => void) => void;
};

const getI18n = (): I18n | undefined => (globalThis as any).window?.i18next ?? (globalThis as any).i18next;

/**
 * Fonction de traduction liée à l'espace de noms du module (`moduleName`).
 * Utilise l'instance i18next partagée par le Shell (`window.i18next`) : les fichiers
 * `translations/*.json` du module y sont chargés par le Shell via `importTranslation`.
 */
export function createTranslator(moduleName: string) {
  return (key: string, defaultValue?: string, options: Record<string, unknown> = {}): string => {
    const i18n = getI18n();
    if (!i18n) return defaultValue ?? key;
    return i18n.t(key, { ns: moduleName, defaultValue: defaultValue ?? key, ...options });
  };
}

/** Prévient quand la langue change ou que des traductions sont chargées (pour redessiner). */
export function watchTranslations(onChange: () => void): Unsubscribe {
  const i18n = getI18n();
  if (!i18n) return () => {};
  const events = ['languageChanged', 'loaded', 'added'];
  events.forEach((e) => i18n.on(e, onChange));
  return () => events.forEach((e) => i18n.off(e, onChange));
}
