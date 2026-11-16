import { z } from 'zod';
import { checkCssValue, serializeLeaf } from './css-safety.js';

const MAX_DEPTH = 12;
const MAX_KEYS_PER_LEVEL = 500;

function valueSchema(depth = 0): z.ZodType<unknown> {
  if (depth > MAX_DEPTH) return z.union([z.string(), z.number(), z.boolean(), z.null()]);
  return z.lazy(() =>
    z.union([
      z.string().max(4000, 'Valeur trop longue (max 4000 caractères)'),
      z.number().finite(),
      z.boolean(),
      z.null(),
      z.array(valueSchema(depth + 1)).max(MAX_KEYS_PER_LEVEL),
      z.record(z.string(), valueSchema(depth + 1)).refine((o) => Object.keys(o).length <= MAX_KEYS_PER_LEVEL, {
        message: `Trop de clés à ce niveau (max ${MAX_KEYS_PER_LEVEL})`,
      }),
    ]),
  );
}

const shape = { meta: z.record(z.string(), valueSchema()).optional() };
/** Thème de base : `priority` obligatoire. */
const baseValidator = z
  .object({ priority: z.number().finite({ message: '"priority" doit être un nombre fini' }), ...shape })
  .catchall(valueSchema());
/** Surcharge : `priority` facultative. */
const overrideValidator = z.object({ priority: z.number().finite().optional(), ...shape }).catchall(valueSchema());

export interface ThemeValidationResult {
  valid: boolean;
  /** Erreurs bloquantes (structure, clé réservée). */
  errors: string[];
  /** Valeurs refusées au rendu (non sûres) : le thème reste utilisable, ces feuilles sont ignorées. */
  warnings: string[];
}

const ROOT_IGNORED = new Set(['priority', 'meta']);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** `value` est réservé par TokiForge pour désigner une feuille : une section ne peut pas porter cette clé. */
function scan(node: unknown, path: string[], errors: string[], warnings: string[]): void {
  if (isObject(node)) {
    for (const [k, v] of Object.entries(node)) {
      if (path.length === 0 && ROOT_IGNORED.has(k)) continue;
      if (k === 'value' && path.length > 0) errors.push(`${[...path, k].join('.')} — la clé « value » est réservée`);
      else scan(v, [...path, k], errors, warnings);
    }
    return;
  }
  const verdict = checkCssValue(serializeLeaf(node));
  if (!verdict.ok) warnings.push(`${path.join('.')} — ${verdict.reason}`);
}

function run(validator: typeof baseValidator | typeof overrideValidator, json: unknown): ThemeValidationResult {
  const parsed = validator.safeParse(json);
  if (!parsed.success)
    return {
      valid: false,
      errors: parsed.error.issues.map((i) => `${i.path.join('.') || '(racine)'} — ${i.message}`),
      warnings: [],
    };
  const errors: string[] = [];
  const warnings: string[] = [];
  scan(json, [], errors, warnings);
  return { valid: errors.length === 0, errors, warnings };
}

export const validateThemeDocument = (json: unknown): ThemeValidationResult => run(baseValidator, json);
export const validateThemeOverride = (json: unknown): ThemeValidationResult => run(overrideValidator, json);
