import { isPlainObject } from './guards.js';

/**
 * Droits de l'iframe d'une app embarquée (doc 17 §7 bis) : deux attributs posés par l'hôte, négociés comme les capacités.
 * L'app **demande** (`egen-config.json` → `iframe`), l'opérateur **approuve** (plafond), l'hôte **applique** l'intersection.
 */
export interface IframeRights {
  /** Jetons de l'attribut `sandbox` à ajouter au socle de l'hôte (`allow-downloads`, `allow-modals`…). */
  sandbox?: string[];
  /** Permissions de l'attribut `allow` (`clipboard-write`, `fullscreen`…). */
  allow?: string[];
}

/** Droits effectifs : toujours complets, jetons validés par liste blanche, sans doublon. */
export interface EffectiveIframeRights {
  sandbox: string[];
  allow: string[];
}

/** Plafond approuvé par l'opérateur pour l'iframe : `false` n'accorde rien. */
export type ApprovedIframe = IframeRights | false;

/**
 * Listes blanches STRICTES : une app ne peut jamais s'auto-accorder un droit hors liste.
 * `allow-top-navigation*` est volontairement absent : une app embarquée ne pilote jamais la fenêtre du Core.
 */
export const IFRAME_SANDBOX_TOKENS: readonly string[] = Object.freeze([
  'allow-downloads',
  'allow-forms',
  'allow-modals',
  'allow-pointer-lock',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-presentation',
  'allow-same-origin',
  'allow-scripts',
]);

export const IFRAME_ALLOW_TOKENS: readonly string[] = Object.freeze([
  'autoplay',
  'camera',
  'clipboard-read',
  'clipboard-write',
  'display-capture',
  'fullscreen',
  'geolocation',
  'microphone',
  'picture-in-picture',
  'web-share',
]);

const KEYS = [
  ['sandbox', IFRAME_SANDBOX_TOKENS],
  ['allow', IFRAME_ALLOW_TOKENS],
] as const;

const MAX_TOKENS = 20;

/** Valide un bloc `iframe` (demande ou plafond). Retourne les erreurs ; vide = valide. */
export function validateIframeRights(input: unknown, where = 'iframe'): string[] {
  if (input === undefined) return [];
  if (!isPlainObject(input)) return [`${where} : objet { sandbox, allow } attendu`];
  const errors: string[] = [];
  for (const [key, known] of KEYS) {
    const list = input[key];
    if (list === undefined) continue;
    if (!Array.isArray(list) || list.length > MAX_TOKENS) {
      errors.push(`${where}.${key} : tableau (≤ ${MAX_TOKENS}) de jetons attendu`);
      continue;
    }
    const seen = new Set<string>();
    for (const token of list) {
      if (typeof token !== 'string' || !known.includes(token)) errors.push(`${where}.${key} : jeton « ${String(token)} » hors liste blanche (${known.join(', ')})`);
      else if (seen.has(token)) errors.push(`${where}.${key} : jeton « ${token} » en double`);
      else seen.add(token);
    }
  }
  for (const key of Object.keys(input)) if (key !== 'sandbox' && key !== 'allow') errors.push(`${where}.${key} : clé inconnue (sandbox | allow)`);
  return errors;
}

const known = (list: unknown, whitelist: readonly string[]): string[] =>
  Array.isArray(list) ? [...new Set(list.filter((t): t is string => typeof t === 'string' && whitelist.includes(t)))] : [];

/**
 * Calcule les droits effectifs : demande ∩ plafond, chaque jeton validé par liste blanche.
 * Une demande absente n'accorde rien (l'app doit demander), un plafond absent ou `false` non plus.
 */
export function effectiveIframe(requested: IframeRights | undefined, approved: ApprovedIframe | undefined): EffectiveIframeRights {
  const out: EffectiveIframeRights = { sandbox: [], allow: [] };
  if (!requested || !approved) return out;
  for (const [key, whitelist] of KEYS) {
    const ceiling = known(approved[key], whitelist);
    out[key] = known(requested[key], whitelist).filter((t) => ceiling.includes(t));
  }
  return out;
}

/** Ramène des droits quelconques à des droits valides (jetons hors liste et doublons écartés) : garde de l'hôte. */
export function sanitizeIframeRights(rights: IframeRights | undefined): EffectiveIframeRights {
  return { sandbox: known(rights?.sandbox, IFRAME_SANDBOX_TOKENS), allow: known(rights?.allow, IFRAME_ALLOW_TOKENS) };
}
