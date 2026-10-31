import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { findMonorepoRoot, loadMonorepoEnv } from '@egen-civitas/rspack-config';
import { logWarn } from './logger';

/** Variable d'environnement désignant le dossier de branding (favicon, icône PWA) du projet client. */
export const BRAND_DIR_ENV = 'EGEN_BRAND_DIR';

/**
 * Résout le dossier de branding fourni par le projet client, qui remplace les assets neutres de l'app-shell
 * (favicon, icône PWA). Le framework reste ainsi générique : aucune identité visuelle n'y est embarquée.
 *
 * - Source : `EGEN_BRAND_DIR` dans l'environnement, sinon dans les `.env*` du monorepo consommateur.
 * - Un chemin relatif est résolu depuis la racine du monorepo consommateur (ou `cwd` hors monorepo), jamais
 *   depuis le dossier de travail d'un sous-processus : `egen build` s'exécute depuis `node_modules`.
 * - Valeur absente → `undefined` (aucun avertissement). Valeur invalide → avertissement et `undefined`, sans
 *   jamais faire échouer la commande.
 *
 * @param cwd Dossier de départ pour trouver la racine du monorepo consommateur.
 * @param mode Mode `.env` à lire (`development`, `production`…).
 * @returns Le chemin absolu du dossier, ou `undefined`.
 */
export function resolveBrandDir(cwd: string, mode = 'development'): string | undefined {
  const monorepoRoot = findMonorepoRoot(cwd);
  const requested = process.env[BRAND_DIR_ENV] || loadMonorepoEnv(cwd, mode)[BRAND_DIR_ENV];
  if (!requested) {
    return undefined;
  }

  const brandDir = resolve(monorepoRoot ?? cwd, requested);
  if (!existsSync(brandDir) || !statSync(brandDir).isDirectory()) {
    logWarn(`${BRAND_DIR_ENV}="${requested}" ne désigne pas un dossier existant (${brandDir}) : ignoré.`);
    return undefined;
  }

  return brandDir;
}
