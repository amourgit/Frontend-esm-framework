// =============================================================================
//  @egen-civitas/esm-ai-tools — Sérialisation sûre de valeurs arbitraires
//
//  Props React, données d'observables… : tout ce qui est renvoyé au backend
//  doit être borné (profondeur, nombre de clés, longueur), sans cycle, sans
//  fonction exécutable et SANS secret. Les clés évoquant un secret (password,
//  token, authorization…) voient leur valeur masquée quel que soit l'endroit
//  où elles apparaissent.
// =============================================================================

import { REDACTED } from './dom-utils.js';

const SENSITIVE_KEY =
  /pass(?:word|wd)?\b|secret|token|credential|authorization|api[-_]?key|cookie|session[-_]?id|jwt|cvv|cvc|iban/i;

export interface SerializeOptions {
  maxDepth?: number;
  maxKeys?: number;
  maxString?: number;
  /** Clés supplémentaires à masquer (ex: « value » d'un champ sensible). */
  redactKeys?: readonly string[];
  /** Conserver `children` quand c'est du texte (sinon remplacé par une note). */
  keepTextChildren?: boolean;
  /** Note affichée à la place des `children` non textuels. */
  childrenNote?: string;
}

const DEFAULT_CHILDREN_NOTE = '[omis — utiliser inspect_interface pour explorer la sous-arborescence]';

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

export function serializeForAI(value: unknown, options: SerializeOptions = {}): unknown {
  const opts = {
    maxDepth: options.maxDepth ?? 4,
    maxKeys: options.maxKeys ?? 60,
    maxString: options.maxString ?? 500,
    redactKeys: new Set((options.redactKeys ?? []).map((k) => k.toLowerCase())),
    keepTextChildren: options.keepTextChildren ?? false,
    childrenNote: options.childrenNote ?? DEFAULT_CHILDREN_NOTE,
  };
  return walk(value, 0, opts, new WeakSet<object>());
}

type ResolvedOptions = {
  maxDepth: number;
  maxKeys: number;
  maxString: number;
  redactKeys: Set<string>;
  keepTextChildren: boolean;
  childrenNote: string;
};

function walk(value: unknown, depth: number, opts: ResolvedOptions, seen: WeakSet<object>): unknown {
  if (value == null) return value;
  switch (typeof value) {
    case 'function':
      return '[Function]';
    case 'symbol':
      return String(value);
    case 'bigint':
      return `${value}n`;
    case 'string':
      return value.length > opts.maxString ? `${value.slice(0, opts.maxString)}… [tronqué]` : value;
    case 'number':
      return Number.isFinite(value) ? value : String(value);
    case 'boolean':
      return value;
    default:
      break;
  }

  const obj = value as object;
  if (typeof (obj as { $$typeof?: unknown }).$$typeof === 'symbol') return '[ReactElement]';
  if (typeof Node !== 'undefined' && obj instanceof Node) {
    return `[DOM ${(obj as Element).localName ?? obj.nodeName}]`;
  }
  if (seen.has(obj)) return '[Circulaire]';
  if (depth >= opts.maxDepth) return '[…tronqué — profondeur max atteinte]';
  seen.add(obj);

  try {
    if (obj instanceof Date) return Number.isNaN(obj.getTime()) ? 'Invalid Date' : obj.toISOString();
    if (obj instanceof Error) return `${obj.name}: ${obj.message}`;
    if (obj instanceof RegExp) return String(obj);
    if (ArrayBuffer.isView(obj))
      return `[${obj.constructor.name} ${(obj as { byteLength: number }).byteLength} octets]`;
    if (obj instanceof Map) {
      return {
        __map: Array.from(obj.entries())
          .slice(0, opts.maxKeys)
          .map(([k, v]) => [walk(k, depth + 1, opts, seen), walk(v, depth + 1, opts, seen)]),
      };
    }
    if (obj instanceof Set) {
      return {
        __set: Array.from(obj.values())
          .slice(0, opts.maxKeys)
          .map((v) => walk(v, depth + 1, opts, seen)),
      };
    }
    if (Array.isArray(obj)) {
      const items = obj.slice(0, opts.maxKeys).map((v) => walk(v, depth + 1, opts, seen));
      if (obj.length > opts.maxKeys) items.push(`… +${obj.length - opts.maxKeys} éléments` as never);
      return items;
    }

    const out: Record<string, unknown> = {};
    let count = 0;
    for (const key of Object.keys(obj)) {
      const child = (obj as Record<string, unknown>)[key];
      if (key === 'children') {
        out.children =
          opts.keepTextChildren && (typeof child === 'string' || typeof child === 'number')
            ? walk(child, depth + 1, opts, seen)
            : opts.childrenNote;
        continue;
      }
      if (++count > opts.maxKeys) {
        out['…'] = 'tronqué';
        break;
      }
      const sensitive = opts.redactKeys.has(key.toLowerCase()) || isSensitiveKey(key);
      out[key] =
        sensitive && child != null && typeof child !== 'object' ? REDACTED : walk(child, depth + 1, opts, seen);
    }
    return out;
  } catch (err) {
    return `[non sérialisable : ${String(err)}]`;
  } finally {
    seen.delete(obj);
  }
}
