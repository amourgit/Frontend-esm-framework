// =============================================================================
//  @egen-civitas/esm-ai-tools — find_in_page
//
//  Retrouve OÙ un texte apparaît dans la page : pour chaque occurrence, la
//  référence du bloc qui la contient, un extrait avec contexte, la section
//  (titre précédent), le composant et la position. Les mots coupés par des
//  balises inline (« Hello <b>wor</b>ld ») sont retrouvés, car la recherche se
//  fait sur le texte du BLOC, pas nœud par nœud.
// =============================================================================

import { classifyComponent } from './components.js';
import {
  buildStableSelector,
  collapseWhitespace,
  getElementRef,
  getReactOwnerName,
  isInViewport,
  isSensitiveField,
  isFormControl,
  snippet,
  tagOf,
} from './dom-utils.js';
import { INLINE_TAGS, childNodesOf, createReadContext, type ReadContext } from './text-extract.js';

const MAX_RAW_MATCHES = 1000;
const TIME_BUDGET_MS = 400;
const MAX_REGEX_LENGTH = 200;
const SEARCHABLE_ATTRIBUTES = ['aria-label', 'title', 'placeholder', 'alt'] as const;

export interface FindOptions {
  query: string;
  /** Interpréter `query` comme une expression régulière (≤ 200 caractères). */
  regex?: boolean;
  caseSensitive?: boolean;
  /** « text » : texte affiché ; « all » : + aria-label, title, placeholder, alt et valeurs de champs. Défaut : all. */
  scope?: 'text' | 'all';
  includeHidden?: boolean;
  limit?: number;
  root?: Element;
}

export interface FindMatch {
  ref: string;
  tag: string;
  /** Nature du composant englobant si connue (card, dialog…), sinon la balise. */
  kind: string;
  /** « text » ou le nom de l'attribut / « value » dans lequel la correspondance a été trouvée. */
  matchedIn: string;
  occurrences: number;
  snippet: string;
  selector: string;
  inViewport: boolean | null;
  /** Titre (h1–h6) le plus proche qui précède, pour situer l'occurrence. */
  section?: string;
  react?: string;
}

export interface FindResult {
  query: string;
  totalMatches: number;
  returned: number;
  truncated: boolean;
  timedOut: boolean;
  matches: FindMatch[];
}

interface Block {
  el: Element;
  text: string;
}

type Matcher = (text: string) => { index: number; length: number; count: number } | null;

function buildMatcher(options: FindOptions): Matcher | { error: string } {
  const query = options.query;
  if (!query || !query.trim()) return { error: 'La requête est vide.' };

  if (options.regex) {
    if (query.length > MAX_REGEX_LENGTH)
      return { error: `Expression régulière trop longue (max ${MAX_REGEX_LENGTH} caractères).` };
    let re: RegExp;
    try {
      re = new RegExp(query, `g${options.caseSensitive ? '' : 'i'}`);
    } catch (err) {
      return { error: `Expression régulière invalide : ${String(err)}` };
    }
    return (text) => {
      re.lastIndex = 0;
      const first = re.exec(text.slice(0, 5000));
      if (!first) return null;
      let count = 1;
      while (count < 50 && re.exec(text.slice(0, 5000))) count++;
      return { index: first.index, length: Math.max(first[0].length, 1), count };
    };
  }

  const needle = collapseWhitespace(query);
  const fold = (s: string) => (options.caseSensitive ? s : s.toLowerCase());
  const folded = fold(needle);
  return (text) => {
    const haystack = fold(text);
    const index = haystack.indexOf(folded);
    if (index < 0) return null;
    let count = 1;
    let from = index + folded.length;
    while (count < 50) {
      const next = haystack.indexOf(folded, from);
      if (next < 0) break;
      count++;
      from = next + folded.length;
    }
    return { index, length: folded.length, count };
  };
}

/** Éléments inline qui forment malgré tout un bloc de recherche à part : une cible précise (lien, bouton). */
const OWN_BLOCK_INLINE = new Set(['a', 'button']);

interface BlockState {
  buffer: string[];
  owner: Element;
}

/**
 * Texte de chaque « bloc » (conteneur non inline) : les éléments inline sont fusionnés dans leur parent,
 * sauf liens et boutons, qui sont leur propre bloc.
 */
function collectBlocks(root: Element, ctx: ReadContext, deadline: number): { blocks: Block[]; timedOut: boolean } {
  const blocks: Block[] = [];
  let timedOut = false;
  let counter = 0;

  const flush = (state: BlockState): void => {
    const text = collapseWhitespace(state.buffer.join(''));
    if (text) blocks.push({ el: state.owner, text });
    state.buffer.length = 0;
  };

  const walk = (container: Element | ShadowRoot, state: BlockState): void => {
    for (const child of childNodesOf(container as Element)) {
      if (timedOut) return;
      if (child.nodeType === 3) {
        state.buffer.push(child.textContent ?? '');
        continue;
      }
      if (child.nodeType !== 1) continue;
      const el = child as Element;
      if (++counter % 500 === 0 && performance.now() > deadline) {
        timedOut = true;
        return;
      }
      if (ctx.isIgnored(el)) continue;
      if (isFormControl(el)) continue; // valeurs traitées via l'option scope « all »
      const tag = tagOf(el);
      if (INLINE_TAGS.has(tag) && !OWN_BLOCK_INLINE.has(tag)) {
        walk(el, state);
        continue;
      }
      // Bloc (ou lien/bouton) : on clôt le texte en cours, on lit ce bloc à part, puis on reprend.
      flush(state);
      const inner: BlockState = { buffer: [], owner: el };
      walk(el, inner);
      flush(inner);
    }
  };

  const top: BlockState = { buffer: [], owner: root };
  walk(root, top);
  flush(top);
  return { blocks, timedOut };
}

function nearestHeading(el: Element): string | undefined {
  let current: Element | null = el;
  for (let depth = 0; current && depth < 8; depth++, current = current.parentElement) {
    if (/^h[1-6]$/.test(tagOf(current)) && current !== el) return snippet(current.textContent ?? '', 80);
    let sibling = current.previousElementSibling;
    for (let i = 0; sibling && i < 12; i++, sibling = sibling.previousElementSibling) {
      if (/^h[1-6]$/.test(tagOf(sibling)) || sibling.getAttribute('role') === 'heading')
        return snippet(sibling.textContent ?? '', 80);
      const nested = sibling.querySelector('h1, h2, h3, h4, h5, h6');
      if (nested) return snippet(nested.textContent ?? '', 80);
    }
  }
  return undefined;
}

function contextSnippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + length + 60);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

export function findInPage(options: FindOptions): FindResult | { error: string } {
  const matcher = buildMatcher(options);
  if ('error' in matcher) return matcher;

  const root = options.root ?? document.body;
  const ctx = createReadContext({ includeHidden: options.includeHidden });
  const limit = Math.max(1, Math.min(options.limit ?? 25, 100));
  if (options.root && ctx.isIgnored(options.root)) {
    return { query: options.query, totalMatches: 0, returned: 0, truncated: false, timedOut: false, matches: [] };
  }
  const deadline = performance.now() + TIME_BUDGET_MS;

  const raw: Array<{
    el: Element;
    matchedIn: string;
    text: string;
    hit: { index: number; length: number; count: number };
  }> = [];

  const { blocks, timedOut: blocksTimedOut } = collectBlocks(root, ctx, deadline);
  for (const block of blocks) {
    const hit = matcher(block.text);
    if (hit) raw.push({ el: block.el, matchedIn: 'text', text: block.text, hit });
    if (raw.length >= MAX_RAW_MATCHES) break;
  }

  let timedOut = blocksTimedOut;
  if ((options.scope ?? 'all') === 'all' && raw.length < MAX_RAW_MATCHES) {
    let counter = 0;
    const attrScan = (parent: Element): void => {
      for (const el of Array.from(parent.children)) {
        if (timedOut || raw.length >= MAX_RAW_MATCHES) return;
        if (++counter % 500 === 0 && performance.now() > deadline) {
          timedOut = true;
          return;
        }
        if (ctx.isIgnored(el)) continue;
        for (const attr of SEARCHABLE_ATTRIBUTES) {
          const value = el.getAttribute(attr);
          if (!value) continue;
          if (attr === 'placeholder' && isSensitiveField(el)) continue;
          const hit = matcher(collapseWhitespace(value));
          if (hit) raw.push({ el, matchedIn: attr, text: collapseWhitespace(value), hit });
        }
        if (isFormControl(el) && !isSensitiveField(el) && tagOf(el) !== 'select') {
          const value = (el as HTMLInputElement).value;
          const type = (el as HTMLInputElement).type;
          if (value && type !== 'checkbox' && type !== 'radio') {
            const hit = matcher(collapseWhitespace(value));
            if (hit) raw.push({ el, matchedIn: 'value', text: collapseWhitespace(value), hit });
          }
        }
        if (el.shadowRoot) attrScan(el.shadowRoot as unknown as Element);
        attrScan(el);
      }
    };
    attrScan(root);
  }

  const matches: FindMatch[] = raw.slice(0, limit).map(({ el, matchedIn, text, hit }) => ({
    ref: getElementRef(el),
    tag: tagOf(el),
    kind: classifyComponent(el)?.kind ?? tagOf(el),
    matchedIn,
    occurrences: hit.count,
    snippet: contextSnippet(text, hit.index, hit.length),
    selector: buildStableSelector(el),
    inViewport: isInViewport(el),
    section: nearestHeading(el),
    react: getReactOwnerName(el),
  }));

  return {
    query: options.query,
    totalMatches: raw.length,
    returned: matches.length,
    truncated: raw.length > matches.length || raw.length >= MAX_RAW_MATCHES,
    timedOut,
    matches,
  };
}
