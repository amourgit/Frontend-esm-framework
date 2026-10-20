// =============================================================================
//  @egen-civitas/esm-ai-tools — Extraction de contenu (texte, champs, tableaux)
//
//  Briques de lecture partagées par read_page, read_component, read_table et
//  find_in_page. Rien ici n'écrit dans le DOM ni n'appelle le réseau.
// =============================================================================

import {
  collapseWhitespace,
  computeAccessibleName,
  getElementRef,
  isHiddenForReading,
  isTag,
  readFieldValue,
  tagOf,
} from './dom-utils.js';

// ─── Contexte de lecture ──────────────────────────────────────────────────────

/** Balises jamais lues (code, métadonnées, gabarits). */
export const SKIPPED_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'head',
  'meta',
  'link',
  'title',
  'base',
]);

/** Balises « phrasing » : leur contenu s'enchaîne dans une ligne de texte. */
export const INLINE_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'br',
  'button',
  'cite',
  'code',
  'data',
  'del',
  'dfn',
  'em',
  'font',
  'i',
  'img',
  'ins',
  'kbd',
  'label',
  'mark',
  'output',
  'picture',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'svg',
  'time',
  'u',
  'var',
  'wbr',
]);

export interface ReadContext {
  /** Lire aussi ce qui est masqué (display:none, hidden…). */
  includeHidden: boolean;
  /** Longueur max d'un bloc de texte. */
  maxTextLength: number;
  isHidden(el: Element): boolean;
  /** Écarté de la lecture : balise technique, `data-ai-ignore`, ou masqué (sauf includeHidden). */
  isIgnored(el: Element): boolean;
}

export function createReadContext(options: { includeHidden?: boolean; maxTextLength?: number } = {}): ReadContext {
  const includeHidden = options.includeHidden ?? false;
  const cache = new WeakMap<Element, boolean>();
  const isHidden = (el: Element): boolean => {
    let hidden = cache.get(el);
    if (hidden === undefined) {
      try {
        hidden = isHiddenForReading(el);
      } catch {
        hidden = false;
      }
      cache.set(el, hidden);
    }
    return hidden;
  };
  return {
    includeHidden,
    maxTextLength: options.maxTextLength ?? 1500,
    isHidden,
    isIgnored: (el) =>
      SKIPPED_TAGS.has(tagOf(el)) || el.hasAttribute('data-ai-ignore') || (!includeHidden && isHidden(el)),
  };
}

export function roleOf(el: Element): string | undefined {
  const role = el.getAttribute('role');
  return role ? role.trim().split(/\s+/)[0].toLowerCase() : undefined;
}

/** Enfants à lire : contenu du Shadow DOM ouvert d'abord, puis enfants « light ». */
export function childNodesOf(el: Element | ShadowRoot | Document): Node[] {
  const nodes: Node[] = [];
  const shadow = (el as Element).shadowRoot;
  if (shadow) nodes.push(...Array.from(shadow.childNodes));
  nodes.push(...Array.from(el.childNodes));
  return nodes;
}

export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

function safeHref(el: Element): string | null {
  const href = el.getAttribute('href');
  if (href == null) return null;
  if (/^\s*(?:javascript|data|vbscript):/i.test(href)) return '[lien masqué]';
  return href.trim();
}

// ─── Texte inline ─────────────────────────────────────────────────────────────

export function isCheckboxLike(el: Element): boolean {
  if (isTag(el, 'input')) return ['checkbox', 'radio'].includes((el as HTMLInputElement).type);
  return ['checkbox', 'radio', 'switch'].includes(roleOf(el) ?? '');
}

export function isChecked(el: Element): boolean | 'mixed' {
  if (isTag(el, 'input')) return (el as HTMLInputElement).checked;
  const aria = el.getAttribute('aria-checked');
  return aria === 'mixed' ? 'mixed' : aria === 'true';
}

function collectNode(child: Node, ctx: ReadContext, parts: string[], links: boolean): void {
  if (child.nodeType === 3 /* TEXT_NODE */) {
    parts.push(child.textContent ?? '');
    return;
  }
  if (child.nodeType !== 1 /* ELEMENT_NODE */) return;
  const el = child as Element;
  if (ctx.isIgnored(el)) return;
  const tag = tagOf(el);

  if (tag === 'br') {
    parts.push(' ');
    return;
  }
  if (tag === 'img') {
    const alt = collapseWhitespace(el.getAttribute('alt'));
    if (alt) parts.push(` [img: ${alt}] `);
    return;
  }
  if (tag === 'svg') {
    const name =
      collapseWhitespace(el.getAttribute('aria-label')) || collapseWhitespace(el.querySelector('title')?.textContent);
    if (name) parts.push(` [icône: ${name}] `);
    return;
  }
  if (tag === 'input' || tag === 'select' || tag === 'textarea' || isCheckboxLike(el)) {
    if (tag === 'input' && (el as HTMLInputElement).type === 'hidden') return;
    if (isCheckboxLike(el)) {
      parts.push(isChecked(el) === true ? ' ☑ ' : ' ☐ ');
      return;
    }
    const value = readFieldValue(el);
    parts.push(` ⟦${computeAccessibleName(el, 60) || tag}${value ? ` = ${value.value}` : ''}⟧ `);
    return;
  }
  if (tag === 'a' && links) {
    const href = safeHref(el);
    const inner = collapseWhitespace(textOf(el, ctx, false)) || computeAccessibleName(el, 80);
    parts.push(href && inner ? ` [${inner}](${href}) ` : ` ${inner} `);
    return;
  }
  if (tag === 'button' || roleOf(el) === 'button') {
    const label = collapseWhitespace(textOf(el, ctx, false)) || computeAccessibleName(el, 80);
    if (label) parts.push(` ⟦${label}⟧ `);
    return;
  }

  const blockish = !INLINE_TAGS.has(tag);
  if (blockish) parts.push(' ');
  for (const grandChild of childNodesOf(el)) collectNode(grandChild, ctx, parts, links);
  if (blockish) parts.push(' ');
}

function textOf(el: Element, ctx: ReadContext, links: boolean): string {
  const parts: string[] = [];
  for (const child of childNodesOf(el)) collectNode(child, ctx, parts, links);
  return parts.join('');
}

/**
 * Texte lisible d'un élément (ses descendants visibles) : espaces normalisés, liens en `[texte](href)`,
 * boutons en `⟦libellé⟧`, cases en ☑/☐, images/icônes nommées en `[img: alt]`, champs avec leur valeur
 * (masquée si sensible). Ne contient jamais le contenu de script/style ni celui des nœuds masqués.
 */
export function inlineText(el: Element, ctx: ReadContext, options: { links?: boolean } = {}): string {
  // Le contenu d'un champ EST sa valeur (<textarea>) ou ses options (<select>) : il se lit via le modèle de champ,
  // jamais comme du texte — sinon un champ sensible fuirait ici.
  if (isTag(el, 'textarea', 'select')) return '';
  return clip(collapseWhitespace(textOf(el, ctx, options.links ?? true)), ctx.maxTextLength);
}

/** Même rendu pour une suite de nœuds frères (texte + éléments inline d'un même paragraphe). */
export function inlineTextOfNodes(nodes: Node[], ctx: ReadContext, options: { links?: boolean } = {}): string {
  const parts: string[] = [];
  for (const node of nodes) collectNode(node, ctx, parts, options.links ?? true);
  return clip(collapseWhitespace(parts.join('')), ctx.maxTextLength);
}

export function safeHrefOf(el: Element): string | null {
  return safeHref(el);
}

// ─── Champs ───────────────────────────────────────────────────────────────────

export const FIELD_ROLES = new Set([
  'textbox',
  'searchbox',
  'combobox',
  'checkbox',
  'radio',
  'switch',
  'slider',
  'spinbutton',
]);

export function isFieldElement(el: Element): boolean {
  const tag = tagOf(el);
  if (tag === 'input') return (el as HTMLInputElement).type !== 'hidden';
  if (tag === 'select' || tag === 'textarea') return true;
  const role = roleOf(el);
  if (role && FIELD_ROLES.has(role)) return true;
  const editable = el.getAttribute('contenteditable');
  return editable === 'true' || editable === '';
}

export interface FieldModel {
  ref: string;
  tag: string;
  type: string;
  role?: string;
  label: string;
  value?: string;
  redacted?: boolean;
  checked?: boolean | 'mixed';
  options?: Array<{ label: string; value: string; selected: boolean }>;
  optionsTruncated?: boolean;
  placeholder?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  helperText?: string;
  errorMessage?: string;
}

const MAX_SELECT_OPTIONS = 30;

function textOfIds(el: Element, attr: string): string {
  const ids = el.getAttribute(attr);
  if (!ids) return '';
  return ids
    .split(/\s+/)
    .map((id) => collapseWhitespace(el.ownerDocument.getElementById(id)?.textContent))
    .filter(Boolean)
    .join(' ');
}

/** Premier élément correspondant à `selector` dans les 3 niveaux d'ancêtres de `el` (message d'erreur, aide…). */
function queryNearby(el: Element, selector: string): Element | null {
  let scope = el.parentElement;
  for (let level = 0; scope && level < 3; level++, scope = scope.parentElement) {
    const hit = scope.querySelector(selector);
    if (hit && !hit.contains(el)) return hit;
  }
  return null;
}

export function describeField(el: Element, ctx: ReadContext): FieldModel {
  const tag = tagOf(el);
  const role = roleOf(el);
  const type = isTag(el, 'input')
    ? ((el as HTMLInputElement).type || 'text').toLowerCase()
    : tag === 'select'
      ? 'select'
      : tag === 'textarea'
        ? 'textarea'
        : (role ?? 'editable');

  const model: FieldModel = { ref: getElementRef(el), tag, type, label: computeAccessibleName(el, 120) };
  if (role) model.role = role;

  const name = el.getAttribute('name');
  if (name) model.name = name;
  const placeholder = el.getAttribute('placeholder');
  if (placeholder) model.placeholder = placeholder;

  if (isCheckboxLike(el)) {
    model.checked = isChecked(el);
  } else if (tag === 'select') {
    const select = el as HTMLSelectElement;
    const all = Array.from(select.options ?? []);
    model.options = all.slice(0, MAX_SELECT_OPTIONS).map((o) => ({
      label: collapseWhitespace(o.label || o.textContent),
      value: o.value,
      selected: o.selected,
    }));
    if (all.length > MAX_SELECT_OPTIONS) model.optionsTruncated = true;
    const value = readFieldValue(el);
    if (value) model.value = value.value;
  } else if (isTag(el, 'input', 'textarea') || el.getAttribute('contenteditable') != null) {
    const value = readFieldValue(el);
    if (value) {
      model.value = value.value;
      if (value.redacted) model.redacted = true;
    }
  } else {
    // Champ ARIA personnalisé (combobox, slider…) : la valeur est portée par aria-* ou par le texte affiché.
    const text =
      el.getAttribute('aria-valuetext') ?? el.getAttribute('aria-valuenow') ?? inlineText(el, ctx, { links: false });
    if (text) model.value = text;
  }

  const control = el as HTMLInputElement;
  if (el.hasAttribute('required') || el.getAttribute('aria-required') === 'true' || control.required)
    model.required = true;
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || control.disabled)
    model.disabled = true;
  if (el.hasAttribute('readonly') || el.getAttribute('aria-readonly') === 'true' || control.readOnly)
    model.readOnly = true;

  const className = typeof el.className === 'string' ? el.className : '';
  const invalid =
    el.getAttribute('aria-invalid') === 'true' ||
    el.getAttribute('data-invalid') === 'true' ||
    /--invalid\b/.test(className);
  if (invalid) model.invalid = true;

  const errorText =
    textOfIds(el, 'aria-errormessage') ||
    (invalid ? collapseWhitespace(queryNearby(el, '.cds--form-requirement, [role="alert"]')?.textContent) : '');
  if (errorText) model.errorMessage = errorText;

  const helper =
    textOfIds(el, 'aria-describedby') || collapseWhitespace(queryNearby(el, '.cds--form__helper-text')?.textContent);
  if (helper && helper !== errorText) model.helperText = helper;

  return model;
}

// ─── Tableaux ─────────────────────────────────────────────────────────────────

export interface TableModel {
  caption?: string;
  columns: number;
  headers: string[];
  rows: string[][];
  totalRows: number;
  offset: number;
  hasMore: boolean;
  footer?: string[][];
  sortedBy?: { column: string; direction: 'ascending' | 'descending' };
  selectable?: boolean;
}

const TABLE_ROLES = new Set(['table', 'grid', 'treegrid']);
const CELL_ROLES = '[role="cell"], [role="gridcell"], [role="columnheader"], [role="rowheader"]';

export function isTableElement(el: Element): boolean {
  return tagOf(el) === 'table' || TABLE_ROLES.has(roleOf(el) ?? '');
}

function owningTable(el: Element): Element | null {
  return el.parentElement?.closest('table, [role="table"], [role="grid"], [role="treegrid"]') ?? null;
}

function rowCells(row: Element, native: boolean): Element[] {
  if (native) return Array.from(row.children).filter((c) => isTag(c, 'td', 'th'));
  return Array.from(row.querySelectorAll(CELL_ROLES)).filter((c) => c.closest('[role="row"]') === row);
}

function tableCaption(el: Element): string | undefined {
  const native = Array.from(el.children).find((c) => tagOf(c) === 'caption');
  const text =
    collapseWhitespace(native?.textContent) ||
    textOfIds(el, 'aria-labelledby') ||
    collapseWhitespace(el.getAttribute('aria-label')) ||
    collapseWhitespace(
      el.closest('.cds--data-table-container')?.querySelector('.cds--data-table-header__title')?.textContent,
    );
  return text || undefined;
}

export function cellText(cell: Element, ctx: ReadContext): string {
  const text = inlineText(cell, ctx, { links: true }).replace(/\|/g, '\\|');
  return text;
}

function expandCells(cells: Element[], ctx: ReadContext): string[] {
  const out: string[] = [];
  for (const cell of cells) {
    out.push(cellText(cell, ctx));
    const span = Math.min(Number(cell.getAttribute('colspan') ?? cell.getAttribute('aria-colspan') ?? 1) || 1, 20);
    for (let i = 1; i < span; i++) out.push('');
  }
  return out;
}

/** Modèle d'un tableau (natif ou ARIA table/grid), avec pagination par offset/limit sur les lignes de corps. */
export function describeTable(
  el: Element,
  ctx: ReadContext,
  opts: { offset?: number; limit?: number } = {},
): TableModel {
  const native = tagOf(el) === 'table';
  const offset = Math.max(0, opts.offset ?? 0);
  const limit = Math.max(1, opts.limit ?? 20);

  const allRows = (native ? Array.from(el.querySelectorAll('tr')) : Array.from(el.querySelectorAll('[role="row"]')))
    .filter((row) => owningTable(row) === el)
    .filter((row) => ctx.includeHidden || !ctx.isHidden(row));

  let headerRows: Element[] = [];
  let bodyRows: Element[] = [];
  const footRows: Element[] = [];

  for (const row of allRows) {
    const section = native ? tagOf(row.parentElement as Element) : '';
    if (section === 'thead') headerRows.push(row);
    else if (section === 'tfoot') footRows.push(row);
    else bodyRows.push(row);
  }

  if (!native) {
    const isHeader = (row: Element) => rowCells(row, false).some((c) => roleOf(c) === 'columnheader');
    headerRows = bodyRows.filter(isHeader);
    bodyRows = bodyRows.filter((row) => !isHeader(row));
  } else if (headerRows.length === 0 && bodyRows.length > 0) {
    const first = rowCells(bodyRows[0], true);
    if (first.length > 0 && first.every((c) => tagOf(c) === 'th' && c.getAttribute('scope') !== 'row')) {
      headerRows = [bodyRows.shift() as Element];
    }
  }

  const headerRow = headerRows[headerRows.length - 1];
  const headerCells = headerRow ? rowCells(headerRow, native).filter((c) => ctx.includeHidden || !ctx.isHidden(c)) : [];
  const headers = expandCells(headerCells, ctx);

  const body = bodyRows.map((row) =>
    expandCells(
      rowCells(row, native).filter((c) => ctx.includeHidden || !ctx.isHidden(c)),
      ctx,
    ),
  );
  const columns = Math.max(headers.length, ...body.map((r) => r.length), 0);

  const model: TableModel = {
    columns,
    headers,
    rows: body.slice(offset, offset + limit),
    totalRows: body.length,
    offset,
    hasMore: offset + limit < body.length,
  };

  const caption = tableCaption(el);
  if (caption) model.caption = caption;
  if (footRows.length) model.footer = footRows.map((row) => expandCells(rowCells(row, native), ctx));

  const sorted = headerCells.find((c) => ['ascending', 'descending'].includes(c.getAttribute('aria-sort') ?? ''));
  if (sorted) {
    model.sortedBy = {
      column: cellText(sorted, ctx),
      direction: sorted.getAttribute('aria-sort') as 'ascending' | 'descending',
    };
  }
  if (headerCells.some((c) => c.querySelector('input[type="checkbox"], [role="checkbox"]'))) model.selectable = true;

  return model;
}

/** Rend un modèle de tableau en lignes markdown (`| a | b |`). */
export function renderTableRows(model: TableModel): string[] {
  const lines: string[] = [];
  const pad = (cells: string[]) => `| ${Array.from({ length: model.columns }, (_, i) => cells[i] ?? '').join(' | ')} |`;
  if (model.headers.length) {
    lines.push(pad(model.headers));
    lines.push(`| ${Array.from({ length: model.columns }, () => '---').join(' | ')} |`);
  }
  for (const row of model.rows) lines.push(pad(row));
  if (model.footer) for (const row of model.footer) lines.push(`${pad(row)} (pied)`);
  return lines;
}
