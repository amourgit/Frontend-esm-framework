const { existsSync, statSync } = require('node:fs');
const { join, resolve } = require('node:path');

/**
 * Fichiers d'identité visuelle que le shell sait recevoir d'un consommateur (voir `EGEN_BRAND_DIR`).
 * Le shell lui-même n'embarque que des valeurs par défaut NEUTRES (aucune marque) pour ces deux fichiers.
 */
const BRAND_FILES = {
  /** Favicon, servi à `${spaPath}/favicon.ico`. */
  favicon: 'favicon.ico',
  /** Icône de l'application installable (PWA), au moins 512 × 512 px. */
  pwaIcon: 'icon-512.png',
};
exports.BRAND_FILES = BRAND_FILES;

const isDirectory = (path) => existsSync(path) && statSync(path).isDirectory();

/**
 * Résout le « branding » du shell : un dossier optionnel fourni par le consommateur (client) qui
 * REMPLACE les assets neutres par défaut. Le shell reste ainsi générique : toute identité (logo,
 * favicon) vit dans le projet client, jamais dans le framework.
 *
 * @param {NodeJS.ProcessEnv} env - Variables d'environnement (`EGEN_BRAND_DIR`).
 * @param {{ defaultAssetsDir: string }} options - Dossier des assets neutres livrés avec le shell.
 * @returns {{
 *   brandDir: string | undefined,
 *   pwaIconPath: string,
 *   copyPatterns: Array<Record<string, unknown>>,
 * }}
 */
exports.resolveBranding = (env, { defaultAssetsDir }) => {
  const requested = env.EGEN_BRAND_DIR;
  const brandDir = requested && isDirectory(requested) ? resolve(requested) : undefined;

  if (requested && !brandDir) {
    console.warn(`EGEN_BRAND_DIR="${requested}" n'est pas un dossier existant : assets de marque par défaut conservés.`);
  }

  const customPwaIcon = brandDir ? join(brandDir, BRAND_FILES.pwaIcon) : undefined;
  const pwaIconPath = customPwaIcon && existsSync(customPwaIcon) ? customPwaIcon : join(defaultAssetsDir, BRAND_FILES.pwaIcon);

  return {
    brandDir,
    pwaIconPath,
    // Les assets du client sont copiés APRÈS ceux du shell et les écrasent (même nom de fichier).
    copyPatterns: [{ from: defaultAssetsDir }, ...(brandDir ? [{ from: brandDir, force: true, priority: 1 }] : [])],
  };
};
