import type { FileHandle } from '../../types.js';

/**
 * Registre interne des fichiers choisis par l'utilisateur en Web. Un `FileHandle` ne porte jamais le binaire (contrat
 * v1) : le `File` du navigateur est conservé ici, sous un identifiant opaque, jusqu'à ce que le consommateur
 * (capacités fichiers, tâche C7) le récupère puis le libère. Non exporté par le point d'entrée du package.
 */
const files = new Map<string, File>();
let counter = 0;

function newId(): string {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null;
  counter += 1;
  return random ?? `web-file-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2)}`;
}

/** Enregistre un fichier et retourne son handle (sans binaire). */
export function registerWebFile(file: File): FileHandle {
  const id = newId();
  files.set(id, file);
  return { id, name: file.name, size: file.size, mime: file.type || 'application/octet-stream' };
}

/** @internal */
export function getWebFile(id: string): File | undefined {
  return files.get(id);
}

/** @internal Libère le fichier : à appeler dès qu'il a été lu ou téléversé. */
export function releaseWebFile(id: string): boolean {
  return files.delete(id);
}
