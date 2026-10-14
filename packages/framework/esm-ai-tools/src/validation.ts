// =============================================================================
//  @egen-civitas/esm-ai-tools — Validation des arguments de tools
// =============================================================================

import type { AIToolParam, AIToolValidationResult } from './types.js';

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Valide et coerce les arguments d'un tool selon son schéma.
 * Retourne les arguments coercés (ex: "42" → 42 pour type 'number').
 */
export function validateToolArgs(
  args: Record<string, unknown>,
  schema: Record<string, AIToolParam>,
): AIToolValidationResult {
  const errors: string[] = [];
  const coercedArgs: Record<string, unknown> = {};

  for (const [paramName, paramDef] of Object.entries(schema)) {
    const value = args[paramName];
    const isPresent = value !== undefined && value !== null;

    // Requis ?
    if (paramDef.required && !isPresent) {
      if (paramDef.default !== undefined) {
        coercedArgs[paramName] = paramDef.default;
        continue;
      }
      errors.push(`Paramètre requis manquant : "${paramName}"`);
      continue;
    }

    // Absent + optionnel
    if (!isPresent) {
      if (paramDef.default !== undefined) coercedArgs[paramName] = paramDef.default;
      continue;
    }

    // Coercion + validation de type
    const { coerced, error } = coerceValue(value, paramName, paramDef);
    if (error) {
      errors.push(error);
      continue;
    }
    coercedArgs[paramName] = coerced;

    // Enum
    if (paramDef.enum && !paramDef.enum.includes(coerced)) {
      errors.push(`"${paramName}" doit être l'une des valeurs : ${paramDef.enum.map(String).join(', ')}`);
    }
  }

  // Paramètres non déclarés : transmis tels quels (non bloquant), sauf les clés qui altéreraient le prototype
  for (const key of Object.keys(args)) {
    if (!(key in schema) && !UNSAFE_KEYS.has(key)) {
      coercedArgs[key] = args[key];
    }
  }

  return { valid: errors.length === 0, errors, coercedArgs };
}

function coerceValue(value: unknown, name: string, param: AIToolParam): { coerced: unknown; error?: string } {
  switch (param.type) {
    case 'string':
      if (typeof value === 'string') return { coerced: value };
      if (typeof value === 'number' || typeof value === 'boolean') return { coerced: String(value) };
      return { coerced: value, error: `"${name}" doit être une chaîne (reçu: ${typeof value})` };

    case 'number': {
      if (typeof value === 'number' && Number.isFinite(value)) return { coerced: value };
      // Seule une chaîne numérique non vide est convertie : Number('') vaut 0, Number([5]) vaut 5, Number(true) vaut 1.
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return { coerced: parsed };
      }
      return { coerced: value, error: `"${name}" doit être un nombre (reçu: ${JSON.stringify(value)})` };
    }

    case 'boolean':
      if (typeof value === 'boolean') return { coerced: value };
      if (value === 1 || (typeof value === 'string' && value.trim().toLowerCase() === 'true')) return { coerced: true };
      if (value === 0 || (typeof value === 'string' && value.trim().toLowerCase() === 'false')) return { coerced: false };
      return { coerced: value, error: `"${name}" doit être un booléen (reçu: ${JSON.stringify(value)})` };

    case 'array':
      if (Array.isArray(value)) return { coerced: value };
      return { coerced: value, error: `"${name}" doit être un tableau (reçu: ${typeof value})` };

    case 'object':
      if (typeof value === 'object' && !Array.isArray(value)) return { coerced: value };
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return { coerced: parsed };
        } catch {
          // chaîne non JSON : erreur de type ci-dessous
        }
      }
      return { coerced: value, error: `"${name}" doit être un objet (reçu: ${typeof value})` };

    default:
      return { coerced: value };
  }
}

/**
 * Vérifie si l'utilisateur possède les privilèges requis par le tool.
 */
export function checkToolPermissions(
  requiredPrivileges: string[],
  userPrivileges: string[],
): { allowed: boolean; missing: string[] } {
  if (!requiredPrivileges.length) return { allowed: true, missing: [] };

  const userPrivsSet = new Set(userPrivileges);
  const missing = requiredPrivileges.filter((p) => !userPrivsSet.has(p));

  return { allowed: missing.length === 0, missing };
}
