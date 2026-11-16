// Sécurité des valeurs CSS. TokiForge n'échappe que les retours à la ligne et `<` (escapeCSSValue) : cela n'empêche pas
// une valeur de sortir de sa déclaration (`red; } body { … }`). EGEN conserve donc une liste blanche stricte (ADR-004).

const SAFE_CSS_VALUE_RE = /^[a-zA-Z0-9 ,.#%()_+\-:/!'"&*=@[\]~^]*$/;
const MAX_VALUE_LENGTH = 1000;
const SAFE_URL_RE = /url\(\s*['"]?(https:\/\/|\/(?!\/))/gi;
const ANY_URL_RE = /url\(/gi;

export type CssSafety = { ok: true } | { ok: false; reason: string };

export function checkCssValue(value: string): CssSafety {
  if (value.length > MAX_VALUE_LENGTH)
    return { ok: false, reason: `valeur trop longue (${value.length} > ${MAX_VALUE_LENGTH} caractères)` };
  if (!SAFE_CSS_VALUE_RE.test(value)) return { ok: false, reason: 'contient un ou plusieurs caractères non autorisés' };
  // Durcissement par rapport à l'ancien moteur : un `/*` non refermé transformerait en commentaire tout le reste de la feuille.
  if (value.includes('/*') || value.includes('*/'))
    return { ok: false, reason: 'commentaire CSS interdit dans une valeur' };
  if ((value.match(ANY_URL_RE) ?? []).length !== (value.match(SAFE_URL_RE) ?? []).length) {
    return { ok: false, reason: 'url(...) doit utiliser le schéma https:// ou un chemin relatif au site' };
  }
  return { ok: true };
}

/** Texte CSS d'une feuille du document (tableaux joints par « , »), ou `null` si le type n'est pas une feuille. */
export function serializeLeaf(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ');
  if (value === null) return 'initial';
  return String(value);
}
