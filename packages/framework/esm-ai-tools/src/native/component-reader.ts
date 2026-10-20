// =============================================================================
//  @egen-civitas/esm-ai-tools — Lecture d'un composant / inventaire des composants
//
//  read_component : « qu'y a-t-il DANS ce composant ? » — titre, sous-titre,
//  corps, métadonnées, actions, médias, champs, tableaux, listes, plus l'identité
//  technique (composants React, bloc Carbon) et les données déclarées par l'app.
//  Les « parties » (titre/sous-titre/corps…) sont déduites par heuristique à
//  partir de la structure et des noms de classes : le plan complet (`outline`)
//  reste la source de vérité.
//
//  discover_components : inventaire des composants présents dans la page (par
//  nature, avec compte), pour que l'agent sache ce qu'il peut ensuite lire.
// =============================================================================

import { getVisibleObservableEntries } from '../observables.js';
import { classifyComponent, getComponentTitle, type ComponentSource } from './components.js';
import {
  buildStableSelector,
  collapseWhitespace,
  computeAccessibleName,
  getCarbonComponent,
  getElementRef,
  getReactOwner,
  getReactOwnerChain,
  getReactOwnerName,
  getVisibility,
  isInViewport,
  isInShadowRoot,
  roundedRect,
  snippet,
  tagOf,
  walkElementsDeep,
} from './dom-utils.js';
import {
  type BuildOptions,
  type DeclaredInfo,
  type OutlineNode,
  buildOutline,
  renderOutline,
  safeDeclaredData,
} from './page-reader.js';
import { createReadContext, inlineText, roleOf, type FieldModel } from './text-extract.js';
import { serializeForAI } from './serialize.js';

// ─── Parties d'un composant ───────────────────────────────────────────────────

const META_HINTS = new Set([
  'meta',
  'date',
  'author',
  'status',
  'price',
  'count',
  'number',
  'caption',
  'label',
  'value',
  'summary',
]);

export interface ComponentParts {
  title?: string;
  subtitle?: string;
  /** Blocs de texte restants, dans l'ordre de lecture (30 max). */
  body: string[];
  /** Textes à rôle de donnée (date, auteur, statut, prix…), avec l'indice déduit des classes. */
  meta: Array<{ hint: string; text: string }>;
  actions: Array<{ ref?: string; kind: 'button' | 'link'; label: string; href?: string; flags: string[] }>;
  media: Array<{ ref?: string; kind: 'image' | 'media'; label?: string; src?: string }>;
  fields: FieldModel[];
  tables: Array<{ ref?: string; caption?: string; totalRows: number; columns: number; headers: string[] }>;
  lists: Array<{ ref?: string; label?: string; items: string[] }>;
}

function flatten(nodes: OutlineNode[], out: OutlineNode[] = []): OutlineNode[] {
  for (const node of nodes) {
    out.push(node);
    flatten(node.children, out);
  }
  return out;
}

/** Nœuds de texte hors listes et tableaux (qui ont leur propre restitution). */
function flattenText(nodes: OutlineNode[], out: OutlineNode[] = []): OutlineNode[] {
  for (const node of nodes) {
    if (node.kind === 'text') out.push(node);
    else if (node.kind !== 'list' && node.kind !== 'table') flattenText(node.children, out);
  }
  return out;
}

export function extractParts(nodes: OutlineNode[], rootLabel?: string): ComponentParts {
  const all = flatten(nodes);
  const parts: ComponentParts = { body: [], meta: [], actions: [], media: [], fields: [], tables: [], lists: [] };

  const headings = all.filter((n) => n.kind === 'heading' && n.text);
  const titleHeading = headings[0];
  const subtitleHeading = titleHeading
    ? headings.find((h) => h !== titleHeading && (h.level ?? 6) >= (titleHeading.level ?? 1))
    : undefined;
  // Le texte des listes et des tableaux est déjà restitué par `lists` / `tables` : on ne le recopie pas dans `body`.
  const texts = flattenText(nodes).filter((n) => n.text);

  const titleText = texts.find((n) => n.hint === 'title');
  parts.title = titleHeading?.text ?? titleText?.text ?? rootLabel;
  const subtitleText = texts.find((n) => n.hint === 'subtitle');
  parts.subtitle =
    subtitleText?.text ?? (subtitleHeading && subtitleHeading !== titleHeading ? subtitleHeading.text : undefined);

  for (const text of texts) {
    if (text.text === parts.title || text.text === parts.subtitle) continue;
    if (text.hint && META_HINTS.has(text.hint)) parts.meta.push({ hint: text.hint, text: text.text as string });
    else if (parts.body.length < 30) parts.body.push(text.text as string);
  }

  for (const node of all) {
    switch (node.kind) {
      case 'button':
      case 'link':
        parts.actions.push({
          ref: node.ref,
          kind: node.kind,
          label: node.text ?? node.label ?? '',
          href: node.href,
          flags: node.flags,
        });
        break;
      case 'image':
      case 'media':
        parts.media.push({ ref: node.ref, kind: node.kind, label: node.text ?? node.label, src: node.src });
        break;
      case 'field':
        if (node.field) parts.fields.push(node.field);
        break;
      case 'table':
        if (node.table)
          parts.tables.push({
            ref: node.ref,
            caption: node.table.caption,
            totalRows: node.table.totalRows,
            columns: node.table.columns,
            headers: node.table.headers,
          });
        break;
      case 'list':
        parts.lists.push({
          ref: node.ref,
          label: node.label,
          items: node.children
            .map((c) => c.text ?? flatten([c]).find((n) => n.text)?.text ?? '')
            .filter(Boolean)
            .slice(0, 20),
        });
        break;
      default:
        break;
    }
  }
  return parts;
}

// ─── Props React du composant propriétaire ────────────────────────────────────

function getOwnerComponentProps(el: Element): { name?: string; props?: unknown } {
  const owner = getReactOwner(el);
  if (!owner) return {};
  return { name: owner.name, props: serializeForAI(owner.props, { maxDepth: 4, maxKeys: 40, keepTextChildren: true }) };
}

// ─── read_component ───────────────────────────────────────────────────────────

export interface ReadComponentOptions extends BuildOptions {
  /** Budget de caractères du plan (défaut 12 000). */
  maxChars?: number;
  includeReactProps?: boolean;
}

export interface DeclaredReport extends DeclaredInfo {
  data?: unknown;
}

export interface ComponentReport {
  ref: string;
  selector: string;
  tag: string;
  role?: string;
  kind: string;
  source?: ComponentSource | 'unknown';
  identity: { react: string[]; carbon?: string; customElement?: string; shadowDom: boolean };
  name: string;
  visible: boolean;
  inViewport: boolean;
  rect: { x: number; y: number; width: number; height: number };
  parts: ComponentParts;
  /** Plan complet du contenu du composant (même format que read_page). */
  outline: string;
  outlineTruncated: boolean;
  /** Déclarations de l'app (useAIObservable) sur ce composant et à l'intérieur, avec leurs données. */
  declared: DeclaredReport[];
  react?: { owner?: string; props?: unknown };
  /** Enfants directs significatifs, pour descendre d'un niveau avec read_component ref=… */
  children: Array<{ ref: string; tag: string; kind?: string; label?: string }>;
}

export function readComponent(el: Element, options: ReadComponentOptions = {}): ComponentReport {
  const build = buildOutline(el, options);
  const identity = classifyComponent(el);
  const rootLabel = getComponentTitle(el);

  const lines = renderOutline(build.nodes);
  const budget = Math.max(1000, options.maxChars ?? 12000);
  const kept: string[] = [];
  let chars = 0;
  for (const line of lines) {
    if (chars + line.length + 1 > budget && kept.length > 0) break;
    kept.push(line);
    chars += line.length + 1;
  }

  const declared: DeclaredReport[] = [];
  try {
    for (const entry of getVisibleObservableEntries()) {
      if (entry.element !== el && !el.contains(entry.element)) continue;
      if (declared.length >= 10) break;
      declared.push({
        id: entry.definition.id,
        source: 'observable',
        kind: entry.definition.kind,
        label: entry.definition.label,
        description: entry.definition.description,
        state: entry.definition.state,
        data: safeDeclaredData(entry.getData()),
      });
    }
  } catch {
    // les registres ne doivent jamais empêcher la lecture
  }

  const ctx = createReadContext({ includeHidden: options.includeHidden });
  const children = Array.from(el.children)
    .filter((c) => !ctx.isIgnored(c))
    .slice(0, 30)
    .map((c) => {
      const childIdentity = classifyComponent(c);
      const label = computeAccessibleName(c, 60) || snippet(inlineText(c, ctx, { links: false }), 60);
      return { ref: getElementRef(c), tag: tagOf(c), kind: childIdentity?.kind, label: label || undefined };
    });

  const visibility = getVisibility(el);
  const report: ComponentReport = {
    ref: getElementRef(el),
    selector: buildStableSelector(el),
    tag: tagOf(el),
    role: roleOf(el),
    kind: identity?.kind ?? build.nodes[0]?.role ?? tagOf(el),
    source: identity?.source ?? 'unknown',
    identity: {
      react: getReactOwnerChain(el),
      carbon: getCarbonComponent(el),
      customElement: tagOf(el).includes('-') ? tagOf(el) : undefined,
      shadowDom: isInShadowRoot(el),
    },
    name: computeAccessibleName(el, 120) || rootLabel || '',
    visible: visibility.visible,
    inViewport: visibility.inViewport,
    rect: roundedRect(el),
    parts: extractParts(build.nodes, rootLabel),
    outline: kept.join('\n'),
    outlineTruncated: kept.length < lines.length || build.truncated,
    declared,
    children,
  };

  if (options.includeReactProps !== false) {
    const owner = getOwnerComponentProps(el);
    if (owner.name) report.react = { owner: owner.name, props: owner.props };
  }
  return report;
}

// ─── discover_components ──────────────────────────────────────────────────────

/** Natures listées seulement à la demande : déjà couvertes par describe_screen / read_page. */
const EXCLUDED_BY_DEFAULT = new Set(['button', 'link', 'field', 'list']);

export interface DiscoverOptions {
  root?: Element;
  includeHidden?: boolean;
  /** Ne garder que ces natures (card, dialog, tabs, notification, table, form, react-component…). */
  kinds?: string[];
  /** Filtre texte sur la nature, le nom (React/Carbon) ou le titre. */
  query?: string;
  limit?: number;
  maxNodes?: number;
}

export interface DiscoveredComponent {
  ref: string;
  kind: string;
  source: ComponentSource | 'react';
  name?: string;
  react?: string;
  carbon?: string;
  title?: string;
  snippet?: string;
  tag: string;
  inViewport: boolean | null;
  declared?: string;
}

export interface DiscoverResult {
  total: number;
  returned: number;
  truncated: boolean;
  byKind: Record<string, number>;
  /** Composants React rencontrés (noms utilisables seulement), les plus fréquents d'abord. */
  reactComponents: Array<{ name: string; count: number }>;
  components: DiscoveredComponent[];
}

export function discoverComponents(options: DiscoverOptions = {}): DiscoverResult {
  const root = options.root ?? document.body;
  const ctx = createReadContext({ includeHidden: options.includeHidden });
  const limit = Math.max(1, Math.min(options.limit ?? 100, 500));
  const maxNodes = options.maxNodes ?? 20000;
  // Inventaire de ce qui est VISIBLE : une racine masquée (sauf includeHidden) n'a rien à inventorier.
  if (options.root && ctx.isIgnored(options.root)) {
    return { total: 0, returned: 0, truncated: false, byKind: {}, reactComponents: [], components: [] };
  }
  const wanted = options.kinds?.length ? new Set(options.kinds.map((k) => k.toLowerCase())) : null;
  const query = options.query?.trim().toLowerCase();

  const declared = new Map<Element, string>();
  try {
    for (const entry of getVisibleObservableEntries()) declared.set(entry.element, entry.definition.id);
  } catch {
    // ignoré
  }

  const byKind: Record<string, number> = {};
  const reactCounts = new Map<string, number>();
  const components: DiscoveredComponent[] = [];
  let total = 0;
  let visited = 0;
  let truncated = false;

  // Une racine explicite est elle-même évaluée (ex: cibler une carte pour la voir comme « card »).
  const scanned = function* (): Generator<Element> {
    if (options.root && !ctx.isIgnored(options.root)) yield options.root;
    yield* walkElementsDeep(root, {}, ctx.isIgnored);
  };

  for (const el of scanned()) {
    if (visited++ >= maxNodes) {
      truncated = true;
      break;
    }

    const identity = classifyComponent(el);
    const owner = getReactOwnerName(el);
    const parentOwner = el.parentElement ? getReactOwnerName(el.parentElement) : undefined;
    const reactBoundary = Boolean(owner) && owner !== parentOwner;
    if (reactBoundary) reactCounts.set(owner as string, (reactCounts.get(owner as string) ?? 0) + 1);

    // Un même élément peut être à la fois « card » (identité) et racine d'un composant React : il est listé
    // sous la nature qui correspond au filtre demandé (par défaut : son identité, hors natures exclues).
    const candidates = [identity?.kind, reactBoundary ? 'react-component' : undefined].filter(Boolean) as string[];
    const kind = wanted
      ? candidates.find((k) => wanted.has(k))
      : candidates.find((k) => k !== 'react-component' && !EXCLUDED_BY_DEFAULT.has(k));
    if (!kind) continue;

    const title = getComponentTitle(el, 80);
    if (query) {
      const haystack = [kind, identity?.name, owner, title].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(query)) continue;
    }

    total++;
    byKind[kind] = (byKind[kind] ?? 0) + 1;
    if (components.length >= limit) continue;

    components.push({
      ref: getElementRef(el),
      kind,
      source: identity?.source ?? 'react',
      name: identity?.name,
      react: owner,
      carbon: getCarbonComponent(el),
      title,
      snippet: snippet(inlineText(el, ctx, { links: false }), 100) || undefined,
      tag: tagOf(el),
      inViewport: isInViewport(el),
      declared: declared.get(el),
    });
  }

  return {
    total,
    returned: components.length,
    truncated: truncated || total > components.length,
    byKind,
    reactComponents: Array.from(reactCounts, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 60),
    components,
  };
}

/** Réutilisé par les tests / d'autres modules pour obtenir le texte brut d'un composant. */
export function componentText(el: Element, options: { includeHidden?: boolean } = {}): string {
  return collapseWhitespace(inlineText(el, createReadContext(options), { links: false }));
}
