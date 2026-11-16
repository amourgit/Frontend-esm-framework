import { validateThemeDocument } from '../model/validate.js';
import type { LoadedTheme, ThemeDocument } from '../model/types.js';

const LOG = '[egen-civitas/esm-theme]';

interface Fetched {
  url: string;
  document: ThemeDocument;
  priority: number;
  hash: string;
}

function hashString(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/** Charge et valide un thème ; `null` si le réseau, le JSON ou la structure échouent (jamais d'exception). */
async function fetchTheme(url: string): Promise<Fetched | null> {
  try {
    const res = await fetch(url.includes('?') ? url : `${url}?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      console.warn(`${LOG} ${url} — HTTP ${res.status}`);
      return null;
    }
    const text = await res.text();
    const parsed: unknown = JSON.parse(text);
    const verdict = validateThemeDocument(parsed);
    if (!verdict.valid) {
      console.warn(`${LOG} ${url} — thème invalide :\n  ${verdict.errors.join('\n  ')}`);
      return null;
    }
    if (verdict.warnings.length && process.env.NODE_ENV !== 'production')
      console.warn(`${LOG} ${url} — valeurs ignorées :\n  ${verdict.warnings.join('\n  ')}`);
    const document = parsed as ThemeDocument;
    return { url, document, priority: document.priority as number, hash: hashString(text) };
  } catch (err) {
    console.warn(`${LOG} ${url} — chargement impossible :`, err);
    return null;
  }
}

/** Plus haute priorité ; à égalité, le premier de la liste (avec avertissement). */
function pickWinner(files: Fetched[]): Fetched | null {
  if (files.length === 0) return null;
  const sorted = [...files].sort((a, b) => b.priority - a.priority);
  const ties = sorted.filter((f) => f.priority === sorted[0].priority);
  if (ties.length > 1)
    console.warn(
      `${LOG} Égalité de priorité (${sorted[0].priority}) entre : ${ties.map((t) => t.url).join(', ')}. Retenu : ${sorted[0].url}`,
    );
  return sorted[0];
}

const toLoaded = (f: Fetched): LoadedTheme => ({ url: f.url, priority: f.priority, document: f.document });

/** Documents en ligne : validés comme les thèmes distants (un document invalide est ignoré, jamais appliqué). */
function inlineThemes(documents: ThemeDocument[]): Fetched[] {
  return documents.flatMap((document, i) => {
    const verdict = validateThemeDocument(document);
    if (!verdict.valid) {
      console.warn(`${LOG} (document en ligne #${i}) — thème invalide :\n  ${verdict.errors.join('\n  ')}`);
      return [];
    }
    return [
      {
        url: `(inline:${i})`,
        document,
        priority: document.priority as number,
        hash: hashString(JSON.stringify(document)),
      },
    ];
  });
}

export async function loadWinningTheme(urls: string[], documents: ThemeDocument[] = []): Promise<LoadedTheme | null> {
  const files = [
    ...(await Promise.all(urls.map(fetchTheme))).filter((f): f is Fetched => f !== null),
    ...inlineThemes(documents),
  ];
  const winner = pickWinner(files);
  return winner ? toLoaded(winner) : null;
}

/** Variante du hot-reload : indique si le contenu a changé depuis `previous` (hash par URL). */
export async function loadIfChanged(
  urls: string[],
  previous: Map<string, string>,
): Promise<{ changed: false } | { changed: true; theme: LoadedTheme; hashes: Map<string, string> }> {
  const files = (await Promise.all(urls.map(fetchTheme))).filter((f): f is Fetched => f !== null);
  const hashes = new Map(files.map((f) => [f.url, f.hash]));
  const same = hashes.size === previous.size && [...hashes].every(([u, h]) => previous.get(u) === h);
  const winner = pickWinner(files);
  return same || !winner ? { changed: false } : { changed: true, theme: toLoaded(winner), hashes };
}
