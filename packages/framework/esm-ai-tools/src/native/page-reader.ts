// =============================================================================
//  @egen-civitas/esm-ai-tools — Lecteur de page (read_page / read_component)
//
//  Parcourt le DOM réel (Shadow DOM ouverts et iframes même origine compris) et
//  en produit un PLAN structuré : landmarks, composants, titres, textes, listes,
//  tableaux, formulaires, champs (avec valeur et erreurs), boutons, liens,
//  images. Chaque nœud structurel porte une référence stable (`{e42}`) que
//  l'agent réutilise avec read_component / read_table / inspect_element.
//
//  Le plan est d'abord un ARBRE (OutlineNode) — exploité tel quel par
//  read_component pour isoler titre / sous-titre / corps / actions — puis rendu
//  en lignes de texte compactes, à la manière d'un instantané d'accessibilité :
//
//    - main {e3}
//      - heading[1] "Étudiants" {e4}
//      - card "Effectif" {e8} (react: StatCard · carbon: tile)
//        - text: 1 245 étudiants actifs
//        - link "Voir la liste" {e9} → /students
//
//  Garde-fous : nombre d'éléments visités, taille des textes, aperçu des
//  tableaux/listes. Aucun champ sensible n'est lisible (voir dom-utils).
// =============================================================================

import { getVisibleObservableEntries } from '../observables.js';
import { getVisibleUIActionEntries } from '../ui-actions.js';
import { classifyComponent, getComponentTitle } from './components.js';
import {
  buildStableSelector,
  collapseWhitespace,
  computeAccessibleName,
  getClassComponentWord,
  getElementRef,
  getIframeDocument,
  getReactOwnerName,
  getScrollInfo,
  isInViewport,
  isTag,
  snippet,
  tagOf,
} from './dom-utils.js';
import {
  INLINE_TAGS,
  type FieldModel,
  type ReadContext,
  type TableModel,
  childNodesOf,
  createReadContext,
  describeField,
  describeTable,
  inlineText,
  inlineTextOfNodes,
  isFieldElement,
  isTableElement,
  renderTableRows,
  roleOf,
  safeHrefOf,
} from './text-extract.js';
import { serializeForAI } from './serialize.js';

// ─── Modèle ───────────────────────────────────────────────────────────────────

export type OutlineKind =
  | 'region'
  | 'component'
  | 'heading'
  | 'text'
  | 'list'
  | 'item'
  | 'definition'
  | 'table'
  | 'field'
  | 'button'
  | 'link'
  | 'image'
  | 'media'
  | 'iframe';

export interface DeclaredInfo {
  id: string;
  source: 'action' | 'observable';
  kind: string;
  label: string;
  description: string;
  state?: string;
}

export interface OutlineNode {
  kind: OutlineKind;
  tag: string;
  /** Référence stable de l'élément (absente des blocs de texte, qui peuvent en regrouper plusieurs). */
  ref?: string;
  /** Landmark (main, navigation…) ou nature du composant (card, dialog, tabs…). */
  role?: string;
  label?: string;
  text?: string;
  level?: number;
  href?: string;
  src?: string;
  /** Rôle éditorial d'un bloc de texte déduit des classes : title, subtitle, description, meta… */
  hint?: string;
  flags: string[];
  react?: string;
  carbon?: string;
  declared?: DeclaredInfo;
  field?: FieldModel;
  table?: TableModel;
  children: OutlineNode[];
}

export interface BuildOptions {
  includeHidden?: boolean;
  /** Garde-fou : éléments parcourus au maximum (défaut 20 000). */
  maxNodes?: number;
  /** Lignes de tableau en aperçu (défaut 15). */
  maxTableRows?: number;
  /** Éléments de liste conservés (défaut 80). */
  maxListItems?: number;
  /** Longueur max d'un bloc de texte (défaut 1500). */
  maxTextLength?: number;
}

interface BuildContext extends ReadContext {
  maxNodes: number;
  visited: number;
  truncated: boolean;
  maxTableRows: number;
  maxListItems: number;
  depth: number;
  declared: Map<Element, DeclaredInfo>;
  stats: Record<string, number>;
}

const MAX_DEPTH = 80;

/** Éléments qui imposent un découpage en blocs (ne peuvent pas être aplatis dans une ligne de texte). */
const BLOCKISH =
  'div, p, ul, ol, li, table, h1, h2, h3, h4, h5, h6, section, article, form, nav, header, footer, main, aside, dl, ' +
  'fieldset, figure, details, dialog, blockquote, pre, input, select, textarea, [role="heading"], [role="list"], ' +
  '[role="table"], [role="textbox"], [role="combobox"], [role="checkbox"], [role="radio"], [role="switch"]';

const INLINE_SAFE_ROLES = new Set(['button', 'link', 'presentation', 'none', 'text', 'img']);

const LIST_SELECTOR =
  'ul, ol, menu, [role="list"], [role="listbox"], [role="menu"], [role="menubar"], [role="tablist"], [role="tree"], [role="radiogroup"]';
const ITEM_SELECTOR =
  'li, [role="listitem"], [role="option"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="tab"], [role="treeitem"]';
const LIST_ROLES = new Set(['list', 'listbox', 'menu', 'menubar', 'tablist', 'tree', 'radiogroup']);

const TEXT_HINTS = new Set([
  'title',
  'subtitle',
  'subheading',
  'heading',
  'eyebrow',
  'kicker',
  'overline',
  'description',
  'desc',
  'caption',
  'meta',
  'label',
  'value',
  'date',
  'author',
  'status',
  'summary',
  'price',
  'count',
  'number',
]);
const HINT_ALIASES: Record<string, string> = {
  subheading: 'subtitle',
  eyebrow: 'subtitle',
  kicker: 'subtitle',
  overline: 'subtitle',
  desc: 'description',
  heading: 'title',
};

const REFERENCED_KINDS = new Set<OutlineKind>([
  'region',
  'component',
  'heading',
  'table',
  'field',
  'button',
  'link',
  'image',
  'media',
  'iframe',
  'list',
]);

// ─── Utilitaires de nœuds ─────────────────────────────────────────────────────

function newNode(kind: OutlineKind, el: Element, ctx: BuildContext, extra: Partial<OutlineNode> = {}): OutlineNode {
  ctx.stats[kind] = (ctx.stats[kind] ?? 0) + 1;
  const node: OutlineNode = { kind, tag: tagOf(el), flags: [], children: [], ...extra };
  if (kind !== 'text') node.ref = getElementRef(el);
  addStateFlags(el, node, ctx);
  const declared = ctx.declared.get(el);
  if (declared) node.declared = declared;
  return node;
}

function addStateFlags(el: Element, node: OutlineNode, ctx: BuildContext): void {
  const flags = node.flags;
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') flags.push('disabled');
  if (el.getAttribute('aria-selected') === 'true') flags.push('selected');
  const current = el.getAttribute('aria-current');
  if (current && current !== 'false') flags.push('current');
  const expanded = el.getAttribute('aria-expanded');
  if (expanded === 'true') flags.push('expanded');
  else if (expanded === 'false') flags.push('collapsed');
  if (el.getAttribute('aria-pressed') === 'true') flags.push('pressed');
  if (el.getAttribute('aria-busy') === 'true') flags.push('busy');
  if (ctx.includeHidden && ctx.isHidden(el)) flags.push('hidden');
  if (REFERENCED_KINDS.has(node.kind)) {
    try {
      if (isInViewport(el) === false) flags.push('offscreen');
      if (node.kind === 'region' || node.kind === 'component' || node.kind === 'list' || node.kind === 'table') {
        if (getScrollInfo(el).scrollable) flags.push('scrollable');
      }
    } catch {
      // géométrie indisponible : on n'ajoute simplement pas ces indications
    }
  }
}

function headingLevel(el: Element): number | null {
  const match = /^h([1-6])$/.exec(tagOf(el));
  if (match) return Number(match[1]);
  if (roleOf(el) === 'heading') {
    const level = Number(el.getAttribute('aria-level'));
    return level >= 1 && level <= 6 ? level : 2;
  }
  return null;
}

function textHint(source: Element): string | undefined {
  const word = getClassComponentWord(source, TEXT_HINTS, true);
  return word ? (HINT_ALIASES[word] ?? word) : undefined;
}

function shortSrc(src: string): string {
  if (src.startsWith('data:'))
    return `data:${src.slice(5, src.indexOf(',') > 0 ? src.indexOf(',') : 20)}…(${src.length} car.)`;
  return src.length > 200 ? `${src.slice(0, 200)}…` : src;
}

function isInlineFlow(el: Element): boolean {
  const tag = tagOf(el);
  if (!INLINE_TAGS.has(tag)) return false;
  const role = roleOf(el);
  if (role && !INLINE_SAFE_ROLES.has(role)) return false;
  if (el.shadowRoot && el.shadowRoot.childNodes.length > 0) return false;
  return el.querySelector(BLOCKISH) === null;
}

/** Contrôle de formulaire associé à un <label> (attribut `for` ou contrôle imbriqué), ou `null`. */
function controlOfLabel(label: Element): Element | null {
  if (tagOf(label) !== 'label') return null;
  const forId = label.getAttribute('for');
  const control = forId ? label.ownerDocument.getElementById(forId) : label.querySelector('input, select, textarea');
  return control && isTag(control, 'input', 'select', 'textarea') && (control as HTMLInputElement).type !== 'hidden'
    ? control
    : null;
}

// ─── Construction de l'arbre ──────────────────────────────────────────────────

function walkChildren(parent: Element | ShadowRoot, out: OutlineNode[], ctx: BuildContext): void {
  if (ctx.depth > MAX_DEPTH) return;
  ctx.depth++;
  try {
    let run: Node[] = [];
    const flush = () => {
      if (run.length) flushRun(run, parent as Element, out, ctx);
      run = [];
    };

    for (const child of childNodesOf(parent as Element)) {
      if (ctx.truncated) break;
      if (child.nodeType === 3) {
        run.push(child);
        continue;
      }
      if (child.nodeType !== 1) continue;
      const el = child as Element;
      if (ctx.visited++ >= ctx.maxNodes) {
        ctx.truncated = true;
        break;
      }
      if (ctx.isIgnored(el)) continue;
      const labelled = controlOfLabel(el);
      if (labelled) {
        // Le texte du <label> est déjà le libellé du champ. Label « à côté » (for=…) : on l'ignore, le champ sera lu
        // à sa place ; label qui ENVELOPPE son champ : on lit le champ ici (sinon il disparaîtrait du plan).
        if (el.contains(labelled) && !ctx.isIgnored(labelled)) {
          flush();
          visit(labelled, out, ctx);
        }
        continue;
      }
      if (isInlineFlow(el)) {
        run.push(el);
        continue;
      }
      flush();
      visit(el, out, ctx);
    }
    flush();
  } finally {
    ctx.depth--;
  }
}

function flushRun(run: Node[], parent: Element, out: OutlineNode[], ctx: BuildContext): void {
  const elements = run.filter((n) => n.nodeType === 1) as Element[];
  const hasText = run.some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '');

  // Plusieurs éléments inline côte à côte SANS texte nu autour (rangée « date · image · bouton », menu de liens,
  // paire libellé/valeur) : chacun est un segment à part — fusionnés en une seule ligne, leurs références, leur
  // rôle éditorial (date, titre…) et leur nature (lien, bouton, image) seraient perdus. Dès qu'il y a du texte
  // nu (« Voir <a>la liste</a> pour… »), le paragraphe reste une seule ligne avec liens inline.
  if (!hasText && elements.length >= 2) {
    for (const el of elements) emitSegment([el], parent, out, ctx);
    return;
  }
  emitSegment(run, parent, out, ctx);
}

function emitSegment(run: Node[], parent: Element, out: OutlineNode[], ctx: BuildContext): void {
  const elements = run.filter((n) => n.nodeType === 1) as Element[];
  const hasText = run.some((n) => n.nodeType === 3 && (n.textContent ?? '').trim() !== '');

  if (!hasText && elements.length === 1) {
    const only = elements[0];
    const tag = tagOf(only);
    if ((tag === 'a' && only.hasAttribute('href')) || roleOf(only) === 'link')
      return void out.push(linkNode(only, ctx));
    if (tag === 'button' || roleOf(only) === 'button') return void out.push(buttonNode(only, ctx));
    if (tag === 'svg') {
      const name = computeAccessibleName(only, 80);
      if (name) out.push(newNode('image', only, ctx, { text: name }));
      return;
    }
    if (tag === 'img' || tag === 'picture') {
      const image = imageNode(tag === 'picture' ? (only.querySelector('img') ?? only) : only, ctx);
      if (image) out.push(image);
      return;
    }
  }

  const text = inlineTextOfNodes(run, ctx);
  if (!text) return;
  const source = !hasText && elements.length === 1 ? elements[0] : parent;
  const node: OutlineNode = { kind: 'text', tag: tagOf(source), text, flags: [], children: [] };
  const hint = textHint(source);
  if (hint) node.hint = hint;
  ctx.stats.text = (ctx.stats.text ?? 0) + 1;
  out.push(node);
}

function linkNode(el: Element, ctx: BuildContext): OutlineNode {
  const label = collapseWhitespace(inlineText(el, ctx, { links: false })) || computeAccessibleName(el, 120);
  const node = newNode('link', el, ctx, { href: safeHrefOf(el) ?? undefined });
  if (el.querySelector(BLOCKISH)) {
    // Lien « enveloppe » (carte cliquable…) : on lit son contenu comme des enfants.
    if (label) node.label = snippet(label, 80);
    walkChildren(el, node.children, ctx);
  } else {
    node.text = label;
  }
  return node;
}

function buttonNode(el: Element, ctx: BuildContext): OutlineNode {
  const label = collapseWhitespace(inlineText(el, ctx, { links: false })) || computeAccessibleName(el, 120);
  const node = newNode('button', el, ctx);
  if (el.querySelector(BLOCKISH)) {
    if (label) node.label = snippet(label, 80);
    walkChildren(el, node.children, ctx);
  } else {
    node.text = label;
  }
  return node;
}

function imageNode(el: Element, ctx: BuildContext): OutlineNode | null {
  const alt =
    collapseWhitespace(el.getAttribute('alt')) ||
    collapseWhitespace(el.getAttribute('aria-label')) ||
    collapseWhitespace(el.getAttribute('title'));
  if (!alt && roleOf(el) !== 'img') return null; // image décorative
  const node = newNode('image', el, ctx, { text: alt });
  const src = (el as HTMLImageElement).currentSrc || el.getAttribute('src');
  if (src) node.src = shortSrc(src);
  return node;
}

function visit(el: Element, out: OutlineNode[], ctx: BuildContext): void {
  const tag = tagOf(el);
  const role = roleOf(el);

  const level = headingLevel(el);
  if (level) {
    out.push(newNode('heading', el, ctx, { level, text: inlineText(el, ctx) }));
    return;
  }

  if (isTableElement(el)) {
    const model = describeTable(el, ctx, { limit: ctx.maxTableRows });
    out.push(newNode('table', el, ctx, { label: model.caption, table: model }));
    return;
  }

  if (isFieldElement(el)) {
    const model = describeField(el, ctx);
    out.push(newNode('field', el, ctx, { field: model, label: model.label }));
    return;
  }

  if (tag === 'dl') return void visitDefinitions(el, out, ctx);
  if (tag === 'ul' || tag === 'ol' || tag === 'menu' || (role && LIST_ROLES.has(role)))
    return void visitList(el, out, ctx);

  if ((tag === 'a' && el.hasAttribute('href')) || role === 'link') return void out.push(linkNode(el, ctx));
  if (tag === 'button' || role === 'button') return void out.push(buttonNode(el, ctx));

  if (tag === 'img' || role === 'img') {
    const image = imageNode(el, ctx);
    if (image) out.push(image);
    return;
  }
  if (tag === 'svg') {
    const name = computeAccessibleName(el, 80);
    if (name) out.push(newNode('image', el, ctx, { text: name }));
    return;
  }
  if (tag === 'video' || tag === 'audio' || tag === 'canvas') {
    const label = collapseWhitespace(el.getAttribute('aria-label')) || collapseWhitespace(el.getAttribute('title'));
    const node = newNode('media', el, ctx, { label: label || undefined });
    const src = el.getAttribute('src');
    if (src) node.src = shortSrc(src);
    out.push(node);
    return;
  }
  if (tag === 'iframe' || tag === 'frame') {
    const node = newNode('iframe', el, ctx, { label: collapseWhitespace(el.getAttribute('title')) || undefined });
    const src = el.getAttribute('src');
    if (src) node.src = shortSrc(src);
    const doc = getIframeDocument(el);
    if (doc?.body) walkChildren(doc.body, node.children, ctx);
    else node.flags.push('cross-origin');
    out.push(node);
    return;
  }

  const declared = ctx.declared.get(el);
  const identity = classifyComponent(el);
  if (identity || declared) {
    const kind = identity ? identity.kind : (declared as DeclaredInfo).kind;
    const node = newNode(identity?.structural ? 'region' : 'component', el, ctx, {
      role: kind,
      label: getComponentTitle(el) ?? declared?.label,
    });
    if (identity?.source === 'carbon' && identity.name) node.carbon = identity.name;
    const react = getReactOwnerName(el);
    if (react) node.react = react;

    if (tag === 'details' && !(el as HTMLDetailsElement).open) {
      node.flags.push('collapsed');
    } else {
      walkChildren(el, node.children, ctx);
    }
    out.push(node);
    return;
  }

  // Simple wrapper sans identité : on lit directement son contenu.
  walkChildren(el, out, ctx);
}

function visitList(el: Element, out: OutlineNode[], ctx: BuildContext): void {
  const items = Array.from(el.querySelectorAll(ITEM_SELECTOR))
    .filter((item) => item.parentElement?.closest(LIST_SELECTOR) === el)
    .filter((item) => !ctx.isIgnored(item));

  const node = newNode('list', el, ctx, {
    role: roleOf(el) ?? tagOf(el),
    label: collapseWhitespace(el.getAttribute('aria-label')) || undefined,
  });
  if (items.length === 0) {
    walkChildren(el, node.children, ctx);
    if (node.children.length) out.push(node);
    return;
  }

  for (const item of items.slice(0, ctx.maxListItems)) {
    const itemNode = newNode('item', item, ctx);
    if (item.querySelector(BLOCKISH) === null) {
      itemNode.text = inlineText(item, ctx);
      if (!itemNode.text) continue;
    } else {
      walkChildren(item, itemNode.children, ctx);
      if (itemNode.children.length === 0) continue;
    }
    node.children.push(itemNode);
  }
  if (items.length > ctx.maxListItems) {
    node.children.push({
      kind: 'text',
      tag: 'li',
      text: `… +${items.length - ctx.maxListItems} éléments non affichés`,
      flags: [],
      children: [],
    });
  }
  out.push(node);
}

function visitDefinitions(el: Element, out: OutlineNode[], ctx: BuildContext): void {
  let term = '';
  let defs: string[] = [];
  const emit = () => {
    if (term || defs.length) {
      ctx.stats.definition = (ctx.stats.definition ?? 0) + 1;
      out.push({
        kind: 'definition',
        tag: 'dl',
        text: `${term}${term && defs.length ? ': ' : ''}${defs.join('; ')}`,
        flags: [],
        children: [],
      });
    }
    term = '';
    defs = [];
  };
  for (const child of Array.from(el.querySelectorAll('dt, dd'))) {
    if (ctx.isIgnored(child)) continue;
    if (tagOf(child) === 'dt') {
      if (defs.length) emit();
      term = inlineText(child, ctx);
    } else {
      defs.push(inlineText(child, ctx));
    }
  }
  emit();
}

// ─── Déclarations de l'app (useAIActionable / useAIObservable) ────────────────

function collectDeclared(): Map<Element, DeclaredInfo> {
  const map = new Map<Element, DeclaredInfo>();
  try {
    for (const { definition, element } of getVisibleUIActionEntries()) {
      map.set(element, {
        id: definition.id,
        source: 'action',
        kind: definition.kind,
        label: definition.label,
        description: definition.description,
      });
    }
    for (const { definition, element } of getVisibleObservableEntries()) {
      map.set(element, {
        id: definition.id,
        source: 'observable',
        kind: definition.kind,
        label: definition.label,
        description: definition.description,
        state: definition.state,
      });
    }
  } catch {
    // les registres ne doivent jamais empêcher la lecture
  }
  return map;
}

function createBuildContext(options: BuildOptions): BuildContext {
  const base = createReadContext({ includeHidden: options.includeHidden, maxTextLength: options.maxTextLength });
  return {
    ...base,
    maxNodes: options.maxNodes ?? 20000,
    visited: 0,
    truncated: false,
    maxTableRows: options.maxTableRows ?? 15,
    maxListItems: options.maxListItems ?? 80,
    depth: 0,
    declared: collectDeclared(),
    stats: {},
  };
}

export interface OutlineBuild {
  nodes: OutlineNode[];
  stats: Record<string, number>;
  elementsVisited: number;
  truncated: boolean;
  ctx: ReadContext;
}

/**
 * Construit le plan d'un élément. `body` / `html` : on lit leur contenu ; tout autre élément est lui-même
 * un nœud du plan (son contenu en enfants).
 */
export function buildOutline(root: Element, options: BuildOptions = {}): OutlineBuild {
  const ctx = createBuildContext(options);
  const nodes: OutlineNode[] = [];
  if (isTag(root, 'body', 'html')) {
    walkChildren(isTag(root, 'html') ? (root.ownerDocument.body ?? root) : root, nodes, ctx);
  } else {
    visit(root, nodes, ctx);
  }
  return { nodes, stats: ctx.stats, elementsVisited: ctx.visited, truncated: ctx.truncated, ctx };
}

// ─── Rendu texte ──────────────────────────────────────────────────────────────

const quote = (text: string) => `"${text.replace(/"/g, '\\"')}"`;
const flagsOf = (node: OutlineNode) => (node.flags.length ? ` [${node.flags.join(', ')}]` : '');
const refOf = (node: OutlineNode) => (node.ref ? ` {${node.ref}}` : '');

function metaOf(node: OutlineNode): string {
  const meta: string[] = [];
  if (node.react) meta.push(`react: ${node.react}`);
  if (node.carbon) meta.push(`carbon: ${node.carbon}`);
  if (node.declared) meta.push(`déclaré: ${node.declared.id}`);
  return meta.length ? ` (${meta.join(' · ')})` : '';
}

function fieldLine(node: OutlineNode): string {
  const f = node.field as FieldModel;
  let line = `field[${f.type}]${f.label ? ` ${quote(f.label)}` : ''}${refOf(node)}`;
  if (f.checked !== undefined)
    line += f.checked === true ? ' = coché' : f.checked === 'mixed' ? ' = indéterminé' : ' = non coché';
  else if (f.value !== undefined && f.value !== '') line += ` = ${quote(f.value)}`;
  else if (f.placeholder) line += ` (placeholder: ${quote(f.placeholder)})`;
  if (f.options?.length) {
    line += ` options: ${f.options.map((o) => `${o.selected ? '*' : ''}${o.label}`).join(' | ')}${f.optionsTruncated ? ' | …' : ''}`;
  }
  const extra = [
    f.required && 'requis',
    f.disabled && 'désactivé',
    f.readOnly && 'lecture seule',
    f.invalid && 'invalide',
  ].filter(Boolean) as string[];
  const all = [...node.flags, ...extra];
  if (all.length) line += ` [${all.join(', ')}]`;
  if (f.errorMessage) line += ` erreur: ${quote(f.errorMessage)}`;
  if (f.helperText) line += ` aide: ${quote(f.helperText)}`;
  return line;
}

/** Rend un plan en lignes de texte indentées (2 espaces par niveau). */
export function renderOutline(nodes: OutlineNode[], depth = 0, lines: string[] = []): string[] {
  const pad = '  '.repeat(depth);
  for (const node of nodes) {
    switch (node.kind) {
      case 'heading':
        lines.push(`${pad}- heading[${node.level}] ${quote(node.text ?? '')}${refOf(node)}${flagsOf(node)}`);
        break;
      case 'text':
        lines.push(`${pad}- text${node.hint ? `(${node.hint})` : ''}: ${node.text}`);
        break;
      case 'region':
      case 'component':
        lines.push(
          `${pad}- ${node.role ?? node.kind}${node.label ? ` ${quote(node.label)}` : ''}${refOf(node)}${flagsOf(node)}${metaOf(node)}`,
        );
        renderOutline(node.children, depth + 1, lines);
        break;
      case 'list':
        lines.push(
          `${pad}- list${node.label ? ` ${quote(node.label)}` : ''}${refOf(node)} (${node.children.length} éléments)${flagsOf(node)}${metaOf(node)}`,
        );
        renderOutline(node.children, depth + 1, lines);
        break;
      case 'item':
        lines.push(`${pad}- item${flagsOf(node)}${node.text !== undefined ? `: ${node.text}` : ''}`);
        renderOutline(node.children, depth + 1, lines);
        break;
      case 'definition':
        lines.push(`${pad}- definition: ${node.text}`);
        break;
      case 'table': {
        const t = node.table as TableModel;
        const sorted = t.sortedBy
          ? `, trié par ${t.sortedBy.column} ${t.sortedBy.direction === 'ascending' ? '↑' : '↓'}`
          : '';
        lines.push(
          `${pad}- table${node.label ? ` ${quote(node.label)}` : ''}${refOf(node)} (${t.totalRows} lignes × ${t.columns} colonnes${sorted})${flagsOf(node)}${metaOf(node)}`,
        );
        for (const row of renderTableRows(t)) lines.push(`${pad}  ${row}`);
        if (t.hasMore)
          lines.push(
            `${pad}  … ${t.totalRows - t.rows.length} lignes de plus — read_table ref=${node.ref} offset=${t.rows.length}`,
          );
        break;
      }
      case 'field':
        lines.push(`${pad}- ${fieldLine(node)}${metaOf(node)}`);
        break;
      case 'button':
        lines.push(
          `${pad}- button${node.text ? ` ${quote(node.text)}` : node.label ? ` ${quote(node.label)}` : ''}${refOf(node)}${flagsOf(node)}${metaOf(node)}`,
        );
        renderOutline(node.children, depth + 1, lines);
        break;
      case 'link':
        lines.push(
          `${pad}- link${node.text ? ` ${quote(node.text)}` : node.label ? ` ${quote(node.label)}` : ''}${refOf(node)}${node.href ? ` → ${node.href}` : ''}${flagsOf(node)}${metaOf(node)}`,
        );
        renderOutline(node.children, depth + 1, lines);
        break;
      case 'image':
        lines.push(
          `${pad}- image${node.text ? ` ${quote(node.text)}` : ''}${refOf(node)}${node.src ? ` src=${node.src}` : ''}`,
        );
        break;
      case 'media':
        lines.push(
          `${pad}- media[${node.tag}]${node.label ? ` ${quote(node.label)}` : ''}${refOf(node)}${node.src ? ` src=${node.src}` : ''}`,
        );
        break;
      case 'iframe':
        lines.push(
          `${pad}- iframe${node.label ? ` ${quote(node.label)}` : ''}${refOf(node)}${node.src ? ` src=${node.src}` : ''}${flagsOf(node)}`,
        );
        renderOutline(node.children, depth + 1, lines);
        break;
    }
  }
  return lines;
}

// ─── API de haut niveau : read_page ───────────────────────────────────────────

export interface ReadPageOptions extends BuildOptions {
  root?: Element;
  /** Index de la première ligne à renvoyer (pagination). */
  offset?: number;
  /** Budget de caractères de la réponse (défaut 24 000). */
  maxChars?: number;
}

export interface PageReadResult {
  url: string;
  title: string;
  lang: string | null;
  root: { ref: string; selector: string; tag: string };
  /** Plan indenté du contenu (voir en-tête du module pour le format). */
  outline: string;
  lines: { total: number; offset: number; returned: number; nextOffset: number | null };
  stats: Record<string, number>;
  /** true si le garde-fou sur le nombre d'éléments parcourus a été atteint. */
  truncated: boolean;
  notes: string[];
}

export function readPage(options: ReadPageOptions = {}): PageReadResult {
  const root = options.root ?? document.body;
  const build = buildOutline(root, options);
  const all = renderOutline(build.nodes);

  const offset = Math.max(0, Math.min(options.offset ?? 0, all.length));
  const budget = Math.max(1000, options.maxChars ?? 24000);
  const slice: string[] = [];
  let chars = 0;
  let index = offset;
  for (; index < all.length; index++) {
    const cost = all[index].length + 1;
    if (chars + cost > budget && slice.length > 0) break;
    slice.push(all[index]);
    chars += cost;
  }
  const nextOffset = index < all.length ? index : null;

  const notes: string[] = [];
  if (nextOffset !== null)
    notes.push(
      `Réponse tronquée au budget de ${budget} caractères : relancer avec offset=${nextOffset} pour la suite.`,
    );
  if (build.truncated)
    notes.push(
      `Garde-fou atteint (${options.maxNodes ?? 20000} éléments parcourus) : cibler une zone avec ref ou rootSelector.`,
    );
  if (all.length === 0)
    notes.push(
      'Aucun contenu lisible trouvé (page vide, encore en chargement, ou contenu masqué — essayer includeHidden).',
    );

  return {
    url: root.ownerDocument.location?.href ?? window.location.href,
    title: root.ownerDocument.title,
    lang: root.ownerDocument.documentElement.getAttribute('lang'),
    root: { ref: getElementRef(root), selector: buildStableSelector(root), tag: tagOf(root) },
    outline: slice.join('\n'),
    lines: { total: all.length, offset, returned: slice.length, nextOffset },
    stats: { ...build.stats, elementsVisited: build.elementsVisited },
    truncated: build.truncated,
    notes,
  };
}

/** Sérialise (borné, sans secret) une donnée déclarée par l'app — utilisé par read_component. */
export function safeDeclaredData(value: unknown): unknown {
  return serializeForAI(value, { maxDepth: 5, maxKeys: 80, maxString: 400, keepTextChildren: true });
}
