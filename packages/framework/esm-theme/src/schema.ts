// ============================================================================
//  EGEN THEME ENGINE — Validation structurelle (zod)
// ============================================================================
//
//  Le schéma de thème est volontairement OUVERT (n'importe quelle app peut
//  ajouter ses propres clés sans modifier le moteur). On ne peut donc pas
//  valider chaque feuille avec un type précis (couleur, longueur,
//  cubic-bezier...) sans réintroduire une liste fermée de clés connues, ce
//  qui contredirait ce principe d'ouverture.
//
//  Ce que CE fichier valide (structure, pas sémantique) :
//  - `priority` doit être un nombre fini (sinon comparaison de priorité
//    impossible/dangereuse — cf. loader.ts).
//  - Toute l'arborescence ne doit contenir QUE des types JSON "plats"
//    valides (string | number | boolean | null | tableau-de-ça | objet-de-ça).
//    Ça élimine les payloads malformés/inattendus (fonctions sérialisées en
//    chaînes bizarres, structures circulaires impossibles en JSON natif
//    mais re-vérifiées par sécurité, profondeur/poids excessifs...).
//
//  La validation de SÉCURITÉ des valeurs CSS (caractères autorisés,
//  longueur max) est faite séparément dans `flatten.ts` (`isSafeCssValue`),
//  au moment de la sérialisation — c'est elle qui bloque réellement
//  l'injection CSS. Ce fichier ne fait que rejeter les fichiers
//  structurellement invalides AVANT même de tenter de les aplatir.
// ============================================================================

import { z } from 'zod';

/** Profondeur maximale acceptée pour un fichier de thème (anti-bombe JSON). */
const MAX_DEPTH = 12;

/** Nombre de clés maximum à un même niveau d'objet (anti-bombe JSON). */
const MAX_KEYS_PER_LEVEL = 500;

/**
 * Valeur JSON "plate" générique, récursive, avec garde-fous anti-abus
 * (profondeur et largeur). Représente n'importe quelle valeur de thème
 * valide, sans présupposer de clé précise.
 */
function themeValueSchema(depth = 0): z.ZodType<unknown> {
  if (depth > MAX_DEPTH) {
    // Au-delà de la profondeur max, on accepte uniquement des primitives —
    // ça empêche un payload pathologique de provoquer une récursion infinie
    // ou un stack overflow lors du parsing du schéma.
    return z.union([z.string(), z.number(), z.boolean(), z.null()]);
  }

  return z.lazy(() =>
    z.union([
      z.string().max(4000, 'Valeur trop longue (max 4000 caractères)'),
      z.number().finite(),
      z.boolean(),
      z.null(),
      z.array(themeValueSchema(depth + 1)).max(MAX_KEYS_PER_LEVEL),
      z.record(z.string(), themeValueSchema(depth + 1)).refine((obj) => Object.keys(obj).length <= MAX_KEYS_PER_LEVEL, {
        message: `Trop de clés à ce niveau (max ${MAX_KEYS_PER_LEVEL})`,
      }),
    ]),
  );
}

/**
 * Schéma de validation structurelle d'un fichier de thème JSON.
 * Volontairement permissif sur le contenu (`.passthrough()` implicite via
 * `z.record`) — seule la FORME générale est vérifiée, jamais une liste
 * fermée de clés.
 */
export const themeSchemaValidator = z
  .object({
    priority: z.number().finite({ message: '"priority" doit être un nombre fini' }),
    meta: z.record(z.string(), themeValueSchema()).optional(),
  })
  .catchall(themeValueSchema());

export interface ThemeValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valide la structure d'un JSON de thème chargé depuis une URL distante.
 * Ne lève jamais d'exception — retourne un résultat exploitable par l'appelant.
 */
export function validateThemeSchema(json: unknown): ThemeValidationResult {
  const result = themeSchemaValidator.safeParse(json);

  if (result.success) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) => `${issue.path.join('.') || '(racine)'} — ${issue.message}`),
  };
}
