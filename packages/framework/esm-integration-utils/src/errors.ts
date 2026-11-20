/**
 * Traite une erreur interceptée dans un composant (équivalent de `componentDidCatch` de
 * esm-react-utils) : enrichit l'erreur et, par défaut, la relance de façon asynchrone pour que
 * la console / les outils de suivi la voient sans casser le reste de la page.
 */
export function reportComponentError(
  err: any,
  opts: { throwErrorsToConsole?: boolean } = {},
  extra?: Record<string, unknown>,
): void {
  if (err && typeof err === 'object' && extra) err.extra = Object.assign(err.extra || {}, extra);
  if (opts.throwErrorsToConsole ?? true) {
    setTimeout(() => {
      throw err;
    });
  }
}
