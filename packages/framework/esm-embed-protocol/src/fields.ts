const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Copie uniquement les chemins listés (notation pointée) d'une source, en valeurs clonables.
 * Les clés `__proto__`, `constructor`, `prototype` sont ignorées ; seules les propriétés propres sont lues.
 */
export function pickFields(source: unknown, fields: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const path of fields) {
    const keys = path.split('.');
    if (keys.length === 0 || keys.some((k) => !k || FORBIDDEN_KEYS.has(k))) continue;
    let from: unknown = source;
    for (const k of keys) {
      if (from !== null && typeof from === 'object' && Object.prototype.hasOwnProperty.call(from, k)) from = (from as Record<string, unknown>)[k];
      else {
        from = undefined;
        break;
      }
    }
    if (from === undefined) continue;
    let value: unknown;
    try {
      value = structuredClone(from);
    } catch {
      continue;
    }
    let to = out;
    for (let i = 0; i < keys.length - 1; i++) {
      const existing = to[keys[i]];
      to = (Object.prototype.hasOwnProperty.call(to, keys[i]) && existing !== null && typeof existing === 'object' ? existing : (to[keys[i]] = {})) as Record<string, unknown>;
    }
    to[keys[keys.length - 1]] = value;
  }
  return out;
}
