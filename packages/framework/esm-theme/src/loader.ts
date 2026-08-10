// ============================================================================
//  EGEN THEME ENGINE — Chargeur de fichiers JSON par priorité
// ============================================================================

import type { ThemeSchema, LoadedTheme } from './types';
import { validateThemeSchema } from './schema';

interface FetchedFile {
  url: string;
  json: ThemeSchema;
  /** Hash léger du corps brut (avant parsing) — sert à la détection de changement en polling. */
  contentHash: string;
}

/**
 * Hash synchrone rapide (djb2) — sert UNIQUEMENT à détecter un changement de
 * contenu entre deux polls, jamais à des fins de sécurité/intégrité.
 */
function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Charge un seul fichier JSON de thème depuis une URL, valide sa structure
 * (zod), et retourne null si le fetch échoue, si le JSON est invalide, ou
 * si sa structure ne respecte pas le schéma attendu.
 */
async function fetchThemeJson(url: string): Promise<FetchedFile | null> {
  try {
    // Ajout d'un cache-buster pour le hot-reload (évite le cache navigateur)
    const fetchUrl = url.includes('?') ? url : `${url}?_t=${Date.now()}`;
    const res = await fetch(fetchUrl, {
      headers: { Accept: 'application/json' },
      // Pas de cache pour que le hot-reload fonctionne
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`[egen/esm-theme] ⚠️  HTTP ${res.status} pour "${url}" → ignoré`);
      return null;
    }

    const rawText = await res.text();
    const contentHash = hashString(rawText);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.warn(`[egen/esm-theme] ⚠️  JSON invalide pour "${url}" →`, parseErr);
      return null;
    }

    const validation = validateThemeSchema(parsed);
    if (!validation.valid) {
      console.warn(
        `[egen/esm-theme] ⚠️  Fichier de thème structurellement invalide, rejeté : "${url}"\n` +
          validation.errors.map((e) => `    - ${e}`).join('\n'),
      );
      return null;
    }

    return { url, json: parsed as ThemeSchema, contentHash };
  } catch (err) {
    console.warn(`[egen/esm-theme] ⚠️  Impossible de charger "${url}" →`, err);
    return null;
  }
}

/**
 * Détermine, de façon déterministe et reproductible, le fichier gagnant
 * parmi une liste de fichiers valides (priorité la plus haute).
 *
 * En cas d'égalité de priorité : le départage se fait par ordre
 * alphabétique de l'URL — donc TOUJOURS le même résultat, peu importe
 * l'ordre dans lequel `themeUrls` a été déclaré ou l'ordre de réponse
 * réseau. En développement, une égalité est traitée comme une erreur de
 * configuration explicite (le moteur lève) plutôt qu'un simple warning
 * silencieux, pour forcer la résolution du conflit avant la mise en prod.
 */
function pickWinner(valid: FetchedFile[]): FetchedFile {
  const sorted = [...valid].sort((a, b) => {
    const pa = typeof a.json.priority === 'number' ? a.json.priority : -Infinity;
    const pb = typeof b.json.priority === 'number' ? b.json.priority : -Infinity;
    if (pb !== pa) return pb - pa; // priorité décroissante
    return a.url.localeCompare(b.url); // départage déterministe par URL
  });

  const winner = sorted[0];
  const winnerPriority = typeof winner.json.priority === 'number' ? winner.json.priority : -Infinity;
  const ties = sorted.filter((f) => (typeof f.json.priority === 'number' ? f.json.priority : -Infinity) === winnerPriority);

  if (ties.length > 1) {
    const tieUrls = ties.map((t) => t.url).join(', ');
    const message = `[egen/esm-theme] Égalité de priorité (${winnerPriority}) entre plusieurs fichiers de thème : ${tieUrls}. Départage déterministe par ordre alphabétique d'URL → "${winner.url}" retenu. Corrigez les valeurs "priority" pour lever l'ambiguïté.`;

    if (process.env.NODE_ENV !== 'production') {
      // En dev, une égalité de priorité est une erreur de configuration —
      // on la signale fort pour qu'elle soit corrigée avant la mise en prod.
      throw new Error(message);
    }
    console.warn(message);
  }

  return winner;
}

/**
 * Charge tous les fichiers de thème fournis, valide leur structure, et
 * retourne le fichier ayant la priorité la plus élevée (départage
 * déterministe en cas d'égalité — cf. `pickWinner`).
 */
export async function loadHighestPriorityTheme(themeUrls: string[]): Promise<LoadedTheme | null> {
  if (!themeUrls || themeUrls.length === 0) {
    console.warn('[egen/esm-theme] Aucun URL de thème fourni.');
    return null;
  }

  const results = await Promise.all(themeUrls.map(fetchThemeJson));
  const valid = results.filter((r): r is FetchedFile => r !== null);

  if (valid.length === 0) {
    console.warn('[egen/esm-theme] Aucun fichier de thème valide chargé.');
    return null;
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.group('[egen/esm-theme] 📂 Fichiers de thème détectés');
    for (const { url, json } of valid) {
      const p = typeof json.priority === 'number' ? json.priority : 'N/A';
      const name = json.meta?.name ?? url;
      // eslint-disable-next-line no-console
      console.log(`  • ${name} (priority = ${p}) — ${url}`);
    }
    // eslint-disable-next-line no-console
    console.groupEnd();
  }

  const winner = pickWinner(valid);
  const winnerPriority = typeof winner.json.priority === 'number' ? winner.json.priority : -Infinity;

  if (process.env.NODE_ENV !== 'production') {
    const name = winner.json.meta?.name ?? winner.url;
    // eslint-disable-next-line no-console
    console.log(`[egen/esm-theme] 🏆 Thème retenu : "${name}" (priority = ${winnerPriority})`);
  }

  return {
    url: winner.url,
    priority: winnerPriority,
    schema: winner.json,
  };
}

/**
 * Variante optimisée pour le polling de hot-reload : compare le hash de
 * contenu brut de CHAQUE fichier à la dernière exécution AVANT de
 * sélectionner un gagnant. Si rien n'a changé, retourne `{ changed: false }`
 * sans qu'aucun JSON n'ait eu besoin d'être re-flatten/ré-injecté en aval —
 * seul le coût réseau (fetch) est conservé (incompressible sans support
 * ETag côté serveur), mais tout le pipeline parsing→flatten→injection est
 * évité.
 *
 * @param previousHashes Map url → hash de la précédente exécution
 */
export async function loadHighestPriorityThemeIfChanged(
  themeUrls: string[],
  previousHashes: Map<string, string>,
): Promise<{ changed: false } | { changed: true; theme: LoadedTheme; hashes: Map<string, string> }> {
  if (!themeUrls || themeUrls.length === 0) {
    return { changed: false };
  }

  const results = await Promise.all(themeUrls.map(fetchThemeJson));
  const valid = results.filter((r): r is FetchedFile => r !== null);

  if (valid.length === 0) {
    return { changed: false };
  }

  const nextHashes = new Map<string, string>();
  let anyChanged = valid.length !== previousHashes.size;

  for (const file of valid) {
    nextHashes.set(file.url, file.contentHash);
    if (previousHashes.get(file.url) !== file.contentHash) {
      anyChanged = true;
    }
  }

  if (!anyChanged) {
    return { changed: false };
  }

  const winner = pickWinner(valid);
  const winnerPriority = typeof winner.json.priority === 'number' ? winner.json.priority : -Infinity;

  return {
    changed: true,
    theme: { url: winner.url, priority: winnerPriority, schema: winner.json },
    hashes: nextHashes,
  };
}
