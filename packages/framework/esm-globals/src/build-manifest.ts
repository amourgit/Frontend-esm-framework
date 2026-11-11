/**
 * Manifeste de build d'un artefact SPA (produit par `egen-distributions`, lu au démarrage par le Host / le shell).
 * Il dit exactement ce que contient l'artefact : un Host peut refuser de démarrer avec un artefact dont le protocole
 * ne lui convient pas, et l'intégrité de chaque app est vérifiable.
 */
export interface BuildManifestApp {
  /** Nom du package de l'app. */
  name: string;
  /** Version exacte embarquée. */
  version: string;
  /** Empreinte SRI du bundle (`sha256-…`, `sha384-…` ou `sha512-…`). */
  integrity: string;
}

export interface BuildManifest {
  shellVersion: string;
  frameworkVersion: string;
  /** Version du protocole Host ↔ Shell que cet artefact parle (entier ≥ 1). */
  protocolVersion: number;
  apps: Array<BuildManifestApp>;
}

export type BuildManifestValidation =
  { valid: true; manifest: BuildManifest } | { valid: false; errors: Array<string> };

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const SRI = /^sha(?:256|384|512)-[A-Za-z0-9+/]+={0,2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Valide un manifeste de build NON FIABLE (JSON lu d'un fichier). Liste TOUTES les erreurs, ne lève jamais.
 * Les champs inconnus sont ignorés (compatibilité ascendante) et ne figurent pas dans `manifest`.
 *
 * @category Platform
 */
export function validateBuildManifest(value: unknown): BuildManifestValidation {
  const errors: Array<string> = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ['le manifeste doit être un objet'] };
  }

  const { shellVersion, frameworkVersion, protocolVersion, apps } = value;

  if (typeof shellVersion !== 'string' || !SEMVER.test(shellVersion)) {
    errors.push('shellVersion doit être une version semver (ex. 2.10.0)');
  }
  if (typeof frameworkVersion !== 'string' || !SEMVER.test(frameworkVersion)) {
    errors.push('frameworkVersion doit être une version semver (ex. 4.0.0)');
  }
  if (typeof protocolVersion !== 'number' || !Number.isInteger(protocolVersion) || protocolVersion < 1) {
    errors.push('protocolVersion doit être un entier ≥ 1');
  }

  const validApps: Array<BuildManifestApp> = [];
  if (!Array.isArray(apps)) {
    errors.push('apps doit être un tableau');
  } else {
    const seen = new Set<string>();
    apps.forEach((app, index) => {
      const where = `apps[${index}]`;
      if (!isRecord(app)) {
        errors.push(`${where} doit être un objet`);
        return;
      }
      const { name, version, integrity } = app;
      if (typeof name !== 'string' || name.length === 0) {
        errors.push(`${where}.name doit être une chaîne non vide`);
      } else if (seen.has(name)) {
        errors.push(`${where}.name "${name}" est en double`);
      } else {
        seen.add(name);
      }
      if (typeof version !== 'string' || !SEMVER.test(version)) {
        errors.push(`${where}.version doit être une version semver exacte`);
      }
      if (typeof integrity !== 'string' || !SRI.test(integrity)) {
        errors.push(`${where}.integrity doit être une empreinte SRI (sha256-…, sha384-… ou sha512-…)`);
      }
      if (typeof name === 'string' && typeof version === 'string' && typeof integrity === 'string') {
        validApps.push({ name, version, integrity });
      }
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    manifest: {
      shellVersion: shellVersion as string,
      frameworkVersion: frameworkVersion as string,
      protocolVersion: protocolVersion as number,
      apps: validApps,
    },
  };
}
