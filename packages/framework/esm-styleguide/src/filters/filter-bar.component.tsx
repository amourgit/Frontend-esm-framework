/**
 * FilterBar — barre de filtres générique et pilotée par configuration
 * ============================================================================
 * Composant de référence pour tout écran qui a besoin de filtrer une liste de
 * contenu (articles, utilisateurs, tenants, commandes…) sans connaître à
 * l'avance quels champs seront filtrables : les champs, leurs opérateurs et
 * leurs valeurs possibles sont entièrement fournis en configuration, jamais
 * codés en dur dans ce fichier.
 *
 * Le fichier est organisé en quatre parties :
 *
 *   1. Types de base + composant <FilterBar> — le "moteur" d'affichage.
 *      Il ne connaît rien du métier : on lui donne des `FilterFieldDef[]`
 *      déjà complètement résolus (id, libellé, type, opérateurs, options) et
 *      il gère l'interaction (ajout, édition, suppression, clavier,
 *      popovers, accessibilité, animations).
 *
 *   2. Couche "schéma JSON" (`FilterSchema`, `useFilterSchema`) — le
 *      "cerveau" qui permet de décrire les champs filtrables sous forme de
 *      simple JSON (catégories et données possibles), y compris des champs
 *      en cascade (ex : Sous-catégorie qui dépend de Catégorie), et qui
 *      déduit automatiquement les `FilterFieldDef[]` attendus par
 *      <FilterBar>, opérateurs compris.
 *
 *   3. Un moteur d'évaluation générique (`evaluateFilter`, `matchesFilters`)
 *      qui montre comment interpréter l'état `Filter[]` produit par le
 *      composant pour réellement filtrer du contenu, côté client ou pour
 *      construire une requête serveur.
 *
 *   4. Une démo commentée (`FilterBarDemo`) qui sert de mode d'emploi
 *      complet, du JSON de configuration jusqu'au filtrage réel d'une liste
 *      d'articles.
 *
 * Couleurs : ce composant ne code aucune couleur en dur. Toutes les couleurs
 * passent par des variables CSS (`--fb-*`) définies dans la section 1. Si
 * votre application expose déjà les tokens de theme.default.json, il suffit
 * de faire pointer ces variables vers les vraies (ex :
 * `--fb-fg: var(--color-fg-default)`) pour que ce composant hérite
 * immédiatement de votre thème réel, sans toucher au reste du fichier.
 */

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { createPortal } from "react-dom";

/* ============================================================================
 * 1. TYPES DE BASE + COMPOSANT <FilterBar>
 * ==========================================================================*/

/** Type d'éditeur de valeur géré nativement par <FilterBar>. */
export type FilterFieldType = "text" | "number" | "date" | "select";

export interface FilterOption {
  value: string;
  label: string;
  glyph?: React.ReactNode;
}

export interface FilterOperatorDef {
  value: string;
  label: string;
  /** Uniquement pertinent pour un champ "select" : autorise plusieurs valeurs. */
  multi?: boolean;
  /**
   * Nombre de valeurs brutes attendues pour un champ texte/nombre/date :
   * 0 = aucune valeur (ex : "est vide"), 1 = valeur unique (défaut), 2 =
   * plage (ex : "entre min et max"). Sans effet sur un champ "select".
   */
  arity?: 0 | 1 | 2;
}

export interface FilterFieldDef {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Type d'éditeur de valeur. Absent = "select" (comportement historique). */
  type?: FilterFieldType;
  operators: FilterOperatorDef[];
  options?: FilterOption[];
  loadOptions?: (query: string) => Promise<FilterOption[]>;
}

/**
 * Un filtre actif. `values` est toujours un tableau de chaînes, y compris
 * pour un champ nombre/date/booléen : à l'appelant de les convertir au
 * moment de l'exploitation (voir la section 3 pour un exemple complet).
 * Pour un champ date, le format attendu est celui d'un <input type="date">
 * (AAAA-MM-JJ).
 */
export interface Filter {
  id: string;
  field: string;
  operator: string;
  values: string[];
}

export interface FilterBarProps {
  fields: FilterFieldDef[];
  value: Filter[];
  onChange: (filters: Filter[]) => void;

  addLabel?: string;
  emptyLabel?: string;
  clearLabel?: string;
  /**
   * Autorise plusieurs filtres actifs sur le même champ en même temps.
   * Par défaut (false), un champ déjà filtré disparaît de la liste
   * "Ajouter un filtre" tant qu'il n'a pas été retiré — un seul filtre par
   * champ à la fois, comme la plupart des barres de filtres à opérateurs.
   */
  allowDuplicateFields?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `f_${Math.random().toString(36).slice(2, 9)}`;

const springy: Transition = { type: "spring", stiffness: 560, damping: 34, mass: 0.7 };

function fieldById(fields: FilterFieldDef[], id: string) {
  return fields.find((f) => f.id === id);
}

function operatorByValue(field: FilterFieldDef | undefined, value: string) {
  return field?.operators.find((o) => o.value === value);
}

interface ValueSummary {
  text: string;
  empty: boolean;
  glyphs: React.ReactNode[];
}

/** Résumé affiché dans le segment "valeur" pour un champ de type "select". */
function summarizeOptions(options: FilterOption[] | undefined, values: string[]): ValueSummary {
  if (!values.length) return { text: "Choisir…", empty: true, glyphs: [] };
  const find = (v: string) => options?.find((o) => o.value === v);
  const label = (v: string) => find(v)?.label ?? v;

  const glyphs = values
    .map((v) => find(v)?.glyph)
    .filter(Boolean)
    .slice(0, 3) as React.ReactNode[];
  if (values.length === 1) return { text: label(values[0]), empty: false, glyphs };
  if (values.length <= 3) return { text: values.map(label).join(", "), empty: false, glyphs };
  return { text: `${label(values[0])} +${values.length - 1}`, empty: false, glyphs };
}

/** Résumé affiché dans le segment "valeur" pour un champ texte / nombre / date. */
function summarizeScalarValue(
  fieldType: "text" | "number" | "date",
  arity: number,
  values: string[]
): ValueSummary {
  if (arity === 0) return { text: "—", empty: false, glyphs: [] };

  const hasContent = values.some((v) => v !== "" && v !== undefined && v !== null);
  if (!hasContent) return { text: "Choisir une valeur…", empty: true, glyphs: [] };

  const format = (v: string) => {
    if (!v) return "…";
    if (fieldType !== "date") return v;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString();
  };

  if (arity === 2) {
    return { text: `${format(values[0] ?? "")} – ${format(values[1] ?? "")}`, empty: false, glyphs: [] };
  }
  return { text: format(values[0] ?? ""), empty: false, glyphs: [] };
}

interface PopoverProps {
  anchorKey: string;
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Popover({ anchorKey, label, onClose, children }: PopoverProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const [dark, setDark] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  React.useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-fb-anchor="${anchorKey}"]`);
    setAnchor(el);
    setDark(!!el?.closest(".dark"));
  }, [anchorKey]);

  const keyRef = React.useRef(anchorKey);
  keyRef.current = anchorKey;
  React.useEffect(
    () => () => {
      document.querySelector<HTMLElement>(`[data-fb-anchor="${keyRef.current}"]`)?.focus();
    },
    []
  );

  React.useLayoutEffect(() => {
    if (!anchor) return;
    const place = () => {
      const el = ref.current;
      if (!el) return;
      const a = anchor.getBoundingClientRect();
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const gap = 6;
      let left = a.left;
      let top = a.bottom + gap;
      left = Math.min(left, window.innerWidth - w - 8);
      left = Math.max(8, left);
      if (top + h > window.innerHeight - 8) top = a.top - gap - h;
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor]);

  React.useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        !(anchor && anchor.contains(e.target as Node))
      )
        onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div className={dark ? "dark" : ""} style={{ display: "contents" }}>
      <motion.div
        ref={ref}
        role="dialog"
        aria-label={label}
        initial={reduce ? false : { opacity: 0, y: -3, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999, zIndex: 60 }}
        className="min-w-[13rem] max-w-[18rem] overflow-hidden rounded-lg border border-[var(--fb-border)] bg-[var(--fb-bg-surface)] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.25)]"
      >
        {children}
      </motion.div>
    </div>,
    document.body
  );
}

interface ListItem {
  value: string;
  label: string;
  glyph?: React.ReactNode;
  selected?: boolean;
}

interface SearchListProps {
  key?: React.Key;
  items: ListItem[];
  multi: boolean;
  loading?: boolean;
  error?: boolean;
  searchable?: boolean;
  placeholder?: string;
  onQuery?: (q: string) => void;
  onPick: (value: string) => void;
  onRetry?: () => void;
  ariaLabel: string;
}

function SearchList({
  items,
  multi,
  loading,
  error,
  searchable = true,
  placeholder = "Rechercher…",
  onQuery,
  onPick,
  onRetry,
  ariaLabel,
}: SearchListProps) {
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listId = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const filtered = React.useMemo(() => {
    if (onQuery) return items;
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((i) => i.label.toLowerCase().includes(needle));
  }, [items, q, onQuery]);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  React.useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const commit = (i: number) => {
    const item = filtered[i];
    if (item) onPick(item.value);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(filtered.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(active);
    }
  };

  return (
    <div>
      {searchable && (
        <div className="border-b border-[var(--fb-border)] p-1.5">
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
            aria-label={ariaLabel}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              onQuery?.(e.target.value);
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent px-1.5 py-1 text-[13px] text-[var(--fb-fg)] outline-none placeholder:text-[var(--fb-fg-subtle)]"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      )}

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-multiselectable={multi || undefined}
        aria-label={ariaLabel}
        className="max-h-60 overflow-y-auto p-1"
        onKeyDown={onKeyDown}
        tabIndex={-1}
      >
        {loading && (
          <li className="flex items-center gap-2 px-2 py-3 text-[13px] text-[var(--fb-fg-muted)]">
            <Spinner /> Chargement des options…
          </li>
        )}

        {error && !loading && (
          <li className="px-2 py-2.5 text-[13px]">
            <p className="text-[var(--fb-fg-muted)]">Impossible de charger les options.</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 rounded-md px-1.5 py-0.5 text-[13px] font-medium text-[var(--fb-fg)] underline decoration-[var(--fb-fg-subtle)] underline-offset-2 hover:decoration-[var(--fb-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fb-accent)]/60"
            >
              Réessayer
            </button>
          </li>
        )}

        {!loading && !error && filtered.length === 0 && (
          <li className="px-2 py-3 text-[13px] text-[var(--fb-fg-muted)]">Aucun résultat</li>
        )}

        {!loading &&
          !error &&
          filtered.map((item, i) => {
            const isActive = i === active;
            return (
              <li
                key={item.value}
                id={`${listId}-${i}`}
                data-idx={i}
                role="option"
                aria-selected={multi ? !!item.selected : isActive}
                onMouseEnter={() => setActive(i)}
                onClick={() => onPick(item.value)}
                className={[
                  "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[var(--fb-fg)]",
                  isActive ? "bg-[var(--fb-bg-active)]" : "bg-transparent",
                ].join(" ")}
              >
                {multi && (
                  <span
                    aria-hidden
                    className={[
                      "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                      item.selected
                        ? "border-[var(--fb-border-strong)] bg-[var(--fb-border-strong)] text-[var(--fb-fg-on-accent)]"
                        : "border-[var(--fb-border)]",
                    ].join(" ")}
                  >
                    {item.selected && <CheckIcon />}
                  </span>
                )}
                {item.glyph && (
                  <span className="shrink-0" aria-hidden>
                    {item.glyph}
                  </span>
                )}
                <span className="truncate">{item.label}</span>
                {!multi && item.selected && (
                  <span className="ml-auto text-[var(--fb-fg-muted)]">
                    <CheckIcon />
                  </span>
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}

interface InputValueEditorProps {
  key?: React.Key;
  inputType: "text" | "number" | "date";
  arity: 1 | 2;
  values: string[];
  onCommit: (values: string[]) => void;
  ariaLabel: string;
  rangeLabels?: [string, string];
  placeholder?: string;
}

/** Éditeur de valeur pour les champs texte / nombre / date (simple ou en plage). */
function InputValueEditor({
  inputType,
  arity,
  values,
  onCommit,
  ariaLabel,
  rangeLabels = ["Min", "Max"],
  placeholder,
}: InputValueEditorProps) {
  const firstRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => firstRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const inputClass =
    "w-full rounded-md border border-[var(--fb-border)] bg-transparent px-2 py-1.5 text-[13px] text-[var(--fb-fg)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--fb-accent)]/60";

  if (arity === 2) {
    const [a = "", b = ""] = values;
    return (
      <div className="flex items-start gap-2 p-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] text-[var(--fb-fg-muted)]">{rangeLabels[0]}</span>
          <input
            ref={firstRef}
            type={inputType}
            value={a}
            aria-label={`${ariaLabel} — ${rangeLabels[0]}`}
            onChange={(e) => onCommit([e.target.value, b])}
            className={inputClass}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[11px] text-[var(--fb-fg-muted)]">{rangeLabels[1]}</span>
          <input
            type={inputType}
            value={b}
            aria-label={`${ariaLabel} — ${rangeLabels[1]}`}
            onChange={(e) => onCommit([a, e.target.value])}
            className={inputClass}
          />
        </label>
      </div>
    );
  }

  const [v = ""] = values;
  return (
    <div className="p-2">
      <input
        ref={firstRef}
        type={inputType}
        value={v}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => onCommit([e.target.value])}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        }}
        className={inputClass}
      />
    </div>
  );
}

interface SegmentProps {
  role: "field" | "operator" | "value";
  children: React.ReactNode;
  onOpen: () => void;
  registerRef: (el: HTMLButtonElement | null) => void;
  tabIndex: number;
  ariaLabel: string;
  anchorKey: string;
  onFocus: () => void;
  muted?: boolean;
  active?: boolean;
  flash?: boolean;
  disabled?: boolean;
}

function Segment({
  role,
  children,
  onOpen,
  registerRef,
  tabIndex,
  ariaLabel,
  anchorKey,
  onFocus,
  muted,
  active,
  flash,
  disabled,
}: SegmentProps) {
  return (
    <button
      type="button"
      ref={registerRef}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={active}
      aria-disabled={disabled || undefined}
      data-fb-anchor={anchorKey}
      onFocus={onFocus}
      onClick={onOpen}
      data-flash={flash ? "" : undefined}
      className={[
        "relative flex items-center gap-1 whitespace-nowrap px-2 py-[4px] text-[13px] leading-[1.35] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--fb-accent)]/70",
        disabled ? "cursor-default" : "active:scale-[0.98]",
        muted ? "text-[var(--fb-fg-muted)]" : "text-[var(--fb-fg)]",
        active ? "bg-[var(--fb-bg-active)]" : disabled ? "" : "hover:bg-[var(--fb-bg-hover)]",
        role === "field" ? "rounded-l-md font-medium" : "",
        "data-[flash]:animate-[fb-flash_620ms_ease-out]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

type OpenState =
  | { kind: "add" }
  | { kind: "field"; filterId: string }
  | { kind: "operator"; filterId: string }
  | { kind: "value"; filterId: string }
  | null;

export function FilterBar({
  fields,
  value,
  onChange,
  addLabel = "Filtre",
  emptyLabel = "Ajouter un filtre",
  clearLabel = "Réinitialiser",
  allowDuplicateFields = false,
  disabled,
  className,
  "aria-label": ariaLabel = "Filtres",
}: FilterBarProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = React.useState<OpenState>(null);
  const [flashId, setFlashId] = React.useState<string | null>(null);

  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [focusIdx, setFocusIdx] = React.useState(0);

  const [asyncState, setAsyncState] = React.useState<
    Record<string, { loading: boolean; error: boolean; options: FilterOption[] }>
  >({});

  const itemMeta: { filterId?: string; kind: string }[] = [];
  value.forEach((f) => {
    itemMeta.push({ filterId: f.id, kind: "field" });
    itemMeta.push({ filterId: f.id, kind: "operator" });
    itemMeta.push({ filterId: f.id, kind: "value" });
    itemMeta.push({ filterId: f.id, kind: "remove" });
  });
  itemMeta.push({ kind: "add" });

  React.useEffect(() => {
    if (focusIdx > itemMeta.length - 1) setFocusIdx(itemMeta.length - 1);
  }, [itemMeta.length, focusIdx]);

  const focusItem = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, itemMeta.length - 1));
    setFocusIdx(clamped);
    itemRefs.current[clamped]?.focus();
  };

  const onToolbarKeyDown = (e: React.KeyboardEvent) => {
    if (open) return;
    const last = itemMeta.length - 1;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusItem(focusIdx >= last ? 0 : focusIdx + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusItem(focusIdx <= 0 ? last : focusIdx - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusItem(last);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      const meta = itemMeta[focusIdx];
      if (meta?.filterId) {
        e.preventDefault();
        removeFilter(meta.filterId, focusIdx);
      }
    }
  };

  const addFilter = (fieldId: string) => {
    const field = fieldById(fields, fieldId);
    if (!field) return;
    const firstOp = field.operators[0];
    const filter: Filter = { id: uid(), field: fieldId, operator: firstOp?.value ?? "is", values: [] };
    onChange([...value, filter]);
    setOpen((firstOp?.arity ?? 1) === 0 ? null : { kind: "value", filterId: filter.id });
  };

  const changeField = (filterId: string, fieldId: string) => {
    const field = fieldById(fields, fieldId);
    const firstOp = field?.operators[0];
    onChange(
      value.map((f) =>
        f.id === filterId
          ? { ...f, field: fieldId, operator: firstOp?.value ?? f.operator, values: [] }
          : f
      )
    );
    setOpen((firstOp?.arity ?? 1) === 0 ? null : { kind: "value", filterId });
  };

  const changeOperator = (filterId: string, opValue: string) => {
    const filter = value.find((f) => f.id === filterId);
    const field = fieldById(fields, filter?.field ?? "");
    const nextOp = operatorByValue(field, opValue);
    const arity = nextOp?.arity ?? 1;
    onChange(
      value.map((f) => {
        if (f.id !== filterId) return f;
        const values = arity === 0 ? [] : nextOp?.multi ? f.values : f.values.slice(0, arity);
        return { ...f, operator: opValue, values };
      })
    );
    // Un opérateur sans valeur (arity 0) n'a rien à éditer ; sinon on
    // enchaîne directement sur l'édition de la valeur pour fluidifier le
    // parcours (pas besoin d'un second clic).
    setOpen(arity === 0 ? null : { kind: "value", filterId });
  };

  const toggleValue = (filterId: string, optionValue: string, multi: boolean) => {
    onChange(
      value.map((f) => {
        if (f.id !== filterId) return f;
        if (!multi) return { ...f, values: [optionValue] };
        const has = f.values.includes(optionValue);
        return {
          ...f,
          values: has ? f.values.filter((v) => v !== optionValue) : [...f.values, optionValue],
        };
      })
    );
    setFlashId(filterId);
    window.setTimeout(() => setFlashId((c) => (c === filterId ? null : c)), 640);
    if (!multi) setOpen(null);
  };

  const setScalarValues = (filterId: string, values: string[]) => {
    onChange(value.map((f) => (f.id === filterId ? { ...f, values } : f)));
  };

  const removeFilter = (filterId: string, atIdx?: number) => {
    onChange(value.filter((f) => f.id !== filterId));
    setOpen(null);
    const target = Math.max(0, (atIdx ?? focusIdx) - 1);
    requestAnimationFrame(() => focusItem(target));
  };

  const clearAll = () => {
    onChange([]);
    setOpen(null);
    requestAnimationFrame(() => focusItem(0));
  };

  const ensureOptions = React.useCallback((field: FilterFieldDef, query = "") => {
    if (!field.loadOptions) return;
    setAsyncState((s) => ({
      ...s,
      [field.id]: { loading: true, error: false, options: s[field.id]?.options ?? [] },
    }));
    field
      .loadOptions(query)
      .then((options) =>
        setAsyncState((s) => ({ ...s, [field.id]: { loading: false, error: false, options } }))
      )
      .catch(() =>
        setAsyncState((s) => ({ ...s, [field.id]: { loading: false, error: true, options: [] } }))
      );
  }, []);

  React.useEffect(() => {
    if (!open || open.kind !== "value") return;
    const filter = value.find((f) => f.id === open.filterId);
    const field = fieldById(fields, filter?.field ?? "");
    if (field?.loadOptions && !asyncState[field.id]?.options.length) ensureOptions(field);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  let itemIndex = 0;
  const nextRef = () => {
    const idx = itemIndex++;
    return {
      idx,
      register: (el: HTMLButtonElement | null) => (itemRefs.current[idx] = el),
      tabIndex: idx === focusIdx ? 0 : -1,
      onFocus: () => setFocusIdx(idx),
    };
  };

  const anchorKey = !open ? null : open.kind === "add" ? "add" : `${open.filterId}:${open.kind}`;

  const popoverLabel = (() => {
    if (!open) return "";
    if (open.kind === "add") return emptyLabel;
    if (open.kind === "field") return "Modifier le champ du filtre";
    if (open.kind === "operator") return "Choisir un opérateur";
    const filter = value.find((f) => f.id === open.filterId);
    const field = fieldById(fields, filter?.field ?? "");
    return field ? `Valeur pour ${field.label}` : "Valeur du filtre";
  })();

  const openPopoverContent = () => {
    if (!open) return null;

    if (open.kind === "add" || open.kind === "field") {
      // Un champ déjà utilisé par un autre filtre actif n'est pas reproposé,
      // sauf si `allowDuplicateFields` l'autorise explicitement. Le filtre en
      // cours d'édition (mode "field") ne s'exclut pas lui-même.
      const currentFilterId = open.kind === "field" ? open.filterId : null;
      const usedFieldIds = new Set(value.filter((f) => f.id !== currentFilterId).map((f) => f.field));
      const items: ListItem[] = fields
        .filter((f) => allowDuplicateFields || !usedFieldIds.has(f.id))
        .map((f) => ({ value: f.id, label: f.label, glyph: f.icon }));
      return (
        <SearchList
          key={anchorKey ?? undefined}
          ariaLabel={popoverLabel}
          items={items}
          multi={false}
          onPick={(v) => (open.kind === "add" ? addFilter(v) : changeField(open.filterId, v))}
        />
      );
    }

    const filter = value.find((f) => f.id === open.filterId);
    const field = fieldById(fields, filter?.field ?? "");
    if (!filter || !field) return null;

    if (open.kind === "operator") {
      const items: ListItem[] = field.operators.map((o) => ({
        value: o.value,
        label: o.label,
        selected: o.value === filter.operator,
      }));
      return (
        <SearchList
          key={anchorKey ?? undefined}
          ariaLabel={popoverLabel}
          items={items}
          multi={false}
          searchable={items.length > 6}
          onPick={(v) => changeOperator(filter.id, v)}
        />
      );
    }

    // open.kind === "value"
    const op = operatorByValue(field, filter.operator);
    const arity = op?.arity ?? 1;
    if (arity === 0) return null; // rien à éditer (ex : "est vide")

    const fieldType = field.type ?? "select";

    if (fieldType === "text" || fieldType === "number" || fieldType === "date") {
      return (
        <InputValueEditor
          key={anchorKey ?? undefined}
          inputType={fieldType}
          arity={arity as 1 | 2}
          values={filter.values}
          onCommit={(vals) => setScalarValues(filter.id, vals)}
          ariaLabel={popoverLabel}
          rangeLabels={fieldType === "date" ? ["Du", "Au"] : ["Min", "Max"]}
          placeholder={fieldType === "text" ? "Rechercher…" : undefined}
        />
      );
    }

    // "select" (inclut les champs booléens, traduits en options Oui/Non par
    // la couche schéma — voir section 2)
    const multi = !!op?.multi;
    const async = field.loadOptions ? asyncState[field.id] : undefined;
    const source = field.loadOptions ? async?.options ?? [] : field.options ?? [];
    const items: ListItem[] = source.map((o) => ({
      value: o.value,
      label: o.label,
      glyph: o.glyph,
      selected: filter.values.includes(o.value),
    }));
    return (
      <SearchList
        key={anchorKey ?? undefined}
        ariaLabel={popoverLabel}
        items={items}
        multi={multi}
        loading={async?.loading}
        error={async?.error}
        onQuery={field.loadOptions ? (q) => ensureOptions(field, q) : undefined}
        onRetry={() => ensureOptions(field)}
        onPick={(v) => toggleValue(filter.id, v, multi)}
      />
    );
  };

  const showClear = value.length > 1;

  return (
    <div
      role="toolbar"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      aria-disabled={disabled || undefined}
      onKeyDown={onToolbarKeyDown}
      className={[
        "flex flex-wrap items-center gap-1.5",
        disabled ? "pointer-events-none opacity-50" : "",
        className ?? "",
      ].join(" ")}
    >
      {/*
        Tokens de couleur locaux, avec valeurs de repli neutres. Si
        theme.default.json (ou l'équivalent de votre application) expose déjà
        ses propres variables, redéfinissez simplement les `--fb-*`
        ci-dessous pour pointer dessus (ex: --fb-fg: var(--color-fg-default)) :
        aucune autre ligne du composant n'a besoin de changer.
      */}
      <style>{`
:root {
  --fb-fg: #18181b;
  --fb-fg-muted: #71717a;
  --fb-fg-subtle: #a1a1aa;
  --fb-fg-on-accent: #ffffff;
  --fb-bg-surface: #ffffff;
  --fb-bg-chip: rgba(24, 24, 27, 0.04);
  --fb-bg-hover: rgba(24, 24, 27, 0.06);
  --fb-bg-active: rgba(24, 24, 27, 0.08);
  --fb-border: rgba(24, 24, 27, 0.09);
  --fb-border-strong: #18181b;
  --fb-accent: #3b82f6;
  --fb-accent-rgb: 59 130 246;
}
.dark {
  --fb-fg: #f4f4f5;
  --fb-fg-muted: #a1a1aa;
  --fb-fg-subtle: #71717a;
  --fb-fg-on-accent: #18181b;
  --fb-bg-surface: #18181b;
  --fb-bg-chip: rgba(255, 255, 255, 0.05);
  --fb-bg-hover: rgba(255, 255, 255, 0.08);
  --fb-bg-active: rgba(255, 255, 255, 0.12);
  --fb-border: rgba(255, 255, 255, 0.08);
  --fb-border-strong: #f4f4f5;
  --fb-accent: #60a5fa;
  --fb-accent-rgb: 96 165 250;
}
@keyframes fb-flash {
  0% { background-color: rgb(var(--fb-accent-rgb) / 0.18); }
  100% { background-color: transparent; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes fb-flash {
    0%, 100% { background-color: transparent; }
  }
}
`}</style>
      <AnimatePresence initial={false} mode="popLayout">
        {value.map((filter) => {
          const field = fieldById(fields, filter.field);
          const op = operatorByValue(field, filter.operator);
          const arity = op?.arity ?? 1;
          const fieldType = field?.type ?? "select";
          const summary =
            arity === 0
              ? { text: "—", empty: false, glyphs: [] as React.ReactNode[] }
              : fieldType === "select"
              ? summarizeOptions(field?.loadOptions ? asyncState[field.id]?.options : field?.options, filter.values)
              : summarizeScalarValue(fieldType, arity, filter.values);

          const fieldItem = nextRef();
          const opItem = nextRef();
          const valueItem = nextRef();
          const removeItem = nextRef();
          const isFlashing = flashId === filter.id;

          return (
            <motion.div
              key={filter.id}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={springy}
              className="group flex items-stretch overflow-hidden rounded-md border border-[var(--fb-border)] bg-[var(--fb-bg-chip)]"
            >
              <Segment
                role="field"
                registerRef={fieldItem.register}
                tabIndex={fieldItem.tabIndex}
                onFocus={fieldItem.onFocus}
                anchorKey={`${filter.id}:field`}
                active={open?.kind === "field" && open.filterId === filter.id}
                ariaLabel={`Champ : ${field?.label ?? filter.field}. Modifier le champ.`}
                onOpen={() => setOpen({ kind: "field", filterId: filter.id })}
              >
                {field?.icon && (
                  <span className="text-[var(--fb-fg-muted)]" aria-hidden>
                    {field.icon}
                  </span>
                )}
                {field?.label ?? filter.field}
              </Segment>

              <span aria-hidden className="w-px self-stretch bg-[var(--fb-border)]" />

              <Segment
                role="operator"
                registerRef={opItem.register}
                tabIndex={opItem.tabIndex}
                onFocus={opItem.onFocus}
                anchorKey={`${filter.id}:operator`}
                muted
                active={open?.kind === "operator" && open.filterId === filter.id}
                ariaLabel={`Opérateur : ${op?.label ?? filter.operator}. Modifier l'opérateur.`}
                onOpen={() => setOpen({ kind: "operator", filterId: filter.id })}
              >
                {op?.label ?? filter.operator}
              </Segment>

              <span aria-hidden className="w-px self-stretch bg-[var(--fb-border)]" />

              <Segment
                role="value"
                registerRef={valueItem.register}
                tabIndex={valueItem.tabIndex}
                onFocus={valueItem.onFocus}
                anchorKey={`${filter.id}:value`}
                muted={summary.empty || arity === 0}
                disabled={arity === 0}
                active={open?.kind === "value" && open.filterId === filter.id}
                flash={isFlashing}
                ariaLabel={
                  arity === 0
                    ? `Valeur : aucune valeur requise pour l'opérateur ${op?.label ?? filter.operator}.`
                    : `Valeur : ${summary.empty ? "aucune sélectionnée" : summary.text}. Modifier la valeur.`
                }
                onOpen={() => {
                  if (arity === 0) return;
                  setOpen({ kind: "value", filterId: filter.id });
                }}
              >
                {!summary.empty && summary.glyphs.length > 0 && (
                  <span className="flex shrink-0 items-center gap-0.5" aria-hidden>
                    {summary.glyphs.map((g, i) => (
                      <span key={i} className="flex items-center">
                        {g}
                      </span>
                    ))}
                  </span>
                )}
                <span className="max-w-[12rem] truncate font-medium text-[var(--fb-fg)]">
                  {summary.empty ? (
                    <span className="font-normal text-[var(--fb-fg-subtle)]">{summary.text}</span>
                  ) : (
                    summary.text
                  )}
                </span>
              </Segment>

              <button
                type="button"
                ref={removeItem.register}
                tabIndex={removeItem.tabIndex}
                onFocus={removeItem.onFocus}
                onClick={() => removeFilter(filter.id, removeItem.idx)}
                aria-label={`Supprimer le filtre ${field?.label ?? filter.field}`}
                className="flex items-center px-1.5 text-[var(--fb-fg-subtle)] transition-colors hover:bg-[var(--fb-bg-hover)] hover:text-[var(--fb-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--fb-accent)]/70 active:scale-[0.98]"
              >
                <CloseIcon />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {(() => {
        const addItem = nextRef();
        const isEmpty = value.length === 0;
        return (
          <button
            type="button"
            ref={addItem.register}
            tabIndex={addItem.tabIndex}
            onFocus={addItem.onFocus}
            data-fb-anchor="add"
            aria-label={isEmpty ? emptyLabel : addLabel}
            aria-haspopup="listbox"
            aria-expanded={open?.kind === "add"}
            onClick={() => setOpen({ kind: "add" })}
            className="flex items-center gap-1 rounded-md border border-dashed border-[var(--fb-border)] px-2 py-[6px] text-[13px] font-medium leading-none text-[var(--fb-fg-muted)] transition-colors hover:border-[var(--fb-border-strong)]/40 hover:bg-[var(--fb-bg-hover)] hover:text-[var(--fb-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fb-accent)]/70 active:scale-[0.98]"
          >
            <PlusIcon />
            {isEmpty ? emptyLabel : addLabel}
          </button>
        );
      })()}

      {showClear && (
        <button
          type="button"
          onClick={clearAll}
          className="ml-0.5 rounded-md px-2 py-[6px] text-[13px] leading-none text-[var(--fb-fg-muted)] transition-colors hover:bg-[var(--fb-bg-hover)] hover:text-[var(--fb-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fb-accent)]/70"
        >
          {clearLabel}
        </button>
      )}

      {open && anchorKey && (
        <Popover anchorKey={anchorKey} label={popoverLabel} onClose={() => setOpen(null)}>
          {openPopoverContent()}
        </Popover>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 6.2l2.2 2.3L9.5 3.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="animate-spin">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1.5" />
      <path d="M12.5 7A5.5 5.5 0 0 0 7 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default FilterBar;

/* ============================================================================
 * 2. COUCHE SCHÉMA JSON — décrire les champs filtrables en JSON, cascades comprises
 * ==========================================================================*/

/** Type d'un champ tel que décrit dans le JSON de configuration. */
export type FilterSchemaFieldType = FilterFieldType | "boolean";

export interface FilterFieldSchema {
  id: string;
  label: string;
  type: FilterSchemaFieldType;
  icon?: React.ReactNode;

  /** Champ "select" : liste statique d'options. */
  options?: FilterOption[];

  /**
   * Champ "select" à chargement distant (recherche serveur). `parentValues`
   * contient les valeurs actuellement choisies pour le champ dont ce champ
   * dépend (`dependsOn`), vide si aucun.
   */
  loadOptions?: (query: string, context: { parentValues: string[] }) => Promise<FilterOption[]>;

  /** Id d'un autre champ du schéma dont ce champ dépend (cascade). */
  dependsOn?: string;

  /**
   * Cascade statique : options possibles selon la valeur actuellement
   * choisie pour le champ parent. Clé = valeur du parent.
   * Exemple : { politique: [...], sport: [...] }
   */
  optionsByParent?: Record<string, FilterOption[]>;

  /** Permet de remplacer les opérateurs déduits automatiquement du "type". */
  operators?: FilterOperatorDef[];
}

export interface FilterSchema {
  fields: FilterFieldSchema[];
}

/** Opérateurs par défaut, déduits automatiquement du type d'un champ. */
export const DEFAULT_OPERATORS: Record<FilterSchemaFieldType, FilterOperatorDef[]> = {
  text: [
    { value: "contains", label: "contient" },
    { value: "not_contains", label: "ne contient pas" },
    { value: "equals", label: "est exactement" },
    { value: "starts_with", label: "commence par" },
    { value: "is_empty", label: "est vide", arity: 0 },
    { value: "is_not_empty", label: "n'est pas vide", arity: 0 },
  ],
  number: [
    { value: "eq", label: "=" },
    { value: "neq", label: "≠" },
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
    { value: "between", label: "entre", arity: 2 },
  ],
  date: [
    { value: "on", label: "le" },
    { value: "before", label: "avant le" },
    { value: "after", label: "après le" },
    { value: "between", label: "entre", arity: 2 },
  ],
  boolean: [{ value: "is", label: "est" }],
  select: [
    { value: "is", label: "est" },
    { value: "is_not", label: "n'est pas" },
    { value: "is_any_of", label: "est l'un de", multi: true },
  ],
};

/** Options par défaut d'un champ booléen (personnalisables via `options` dans le schéma). */
export const DEFAULT_BOOLEAN_OPTIONS: FilterOption[] = [
  { value: "true", label: "Oui" },
  { value: "false", label: "Non" },
];

/**
 * Traduit un schéma JSON + l'état courant des filtres en `FilterFieldDef[]`
 * prêts à être passés à <FilterBar>. C'est ici que se fait toute la
 * "déduction" : opérateurs par défaut, résolution des options en cascade
 * (statique via `optionsByParent`, ou distante via `loadOptions`), et
 * masquage des champs dont le parent n'a pas encore de valeur.
 *
 * Fonction pure (aucun état interne) : `useFilterSchema` ci-dessous l'appelle
 * dans un `useMemo`, mais rien n'empêche de l'appeler ailleurs (sélecteur
 * Redux, rendu serveur, tests…).
 */
export function buildFilterFields(schema: FilterSchema, filters: Filter[]): FilterFieldDef[] {
  const parentValuesOf = (fieldId: string) => filters.find((f) => f.field === fieldId)?.values ?? [];

  return schema.fields
    .filter((f) => !f.dependsOn || parentValuesOf(f.dependsOn).length > 0)
    .map((f): FilterFieldDef => {
      // Un booléen est un "select" à deux options figées : on réutilise tout
      // le pipeline de rendu du type "select" sans dupliquer de code.
      if (f.type === "boolean") {
        return {
          id: f.id,
          label: f.label,
          icon: f.icon,
          type: "select",
          operators: f.operators ?? DEFAULT_OPERATORS.boolean,
          options: f.options ?? DEFAULT_BOOLEAN_OPTIONS,
        };
      }

      const operators = f.operators ?? DEFAULT_OPERATORS[f.type];

      if (f.type !== "select") {
        return { id: f.id, label: f.label, icon: f.icon, type: f.type, operators };
      }

      const parentVals = f.dependsOn ? parentValuesOf(f.dependsOn) : [];

      if (f.optionsByParent) {
        return {
          id: f.id,
          label: f.label,
          icon: f.icon,
          type: "select",
          operators,
          options: parentVals.flatMap((pv) => f.optionsByParent?.[pv] ?? []),
        };
      }
      if (f.loadOptions) {
        return {
          id: f.id,
          label: f.label,
          icon: f.icon,
          type: "select",
          operators,
          loadOptions: (q) => f.loadOptions!(q, { parentValues: parentVals }),
        };
      }
      return { id: f.id, label: f.label, icon: f.icon, type: "select", operators, options: f.options ?? [] };
    });
}

/**
 * Nettoie une liste de filtres après un changement, pour que les cascades
 * restent cohérentes :
 *   1. un filtre dont le champ parent a disparu ou n'a plus de valeur est
 *      retiré ;
 *   2. un filtre dont les valeurs ne correspondent plus au parent (cascade
 *      statique) voit ses valeurs invalides purgées, sans être supprimé.
 * La boucle est bornée par `schema.fields.length`, la profondeur maximale
 * possible d'une chaîne de cascades (A dépend de B dépend de C…).
 */
export function cleanCascadingFilters(schema: FilterSchema, next: Filter[]): Filter[] {
  let cleaned = next;

  for (let pass = 0; pass < schema.fields.length; pass++) {
    let mutated = false;

    const survivors = cleaned.filter((flt) => {
      const def = schema.fields.find((f) => f.id === flt.field);
      if (!def?.dependsOn) return true;
      const parent = cleaned.find((p) => p.field === def.dependsOn);
      const alive = !!parent && parent.values.length > 0;
      if (!alive) mutated = true;
      return alive;
    });

    const purged = survivors.map((flt) => {
      const def = schema.fields.find((f) => f.id === flt.field);
      if (!def?.dependsOn || !def.optionsByParent) return flt;
      const parent = survivors.find((p) => p.field === def.dependsOn);
      const allowed = new Set(
        (parent?.values ?? []).flatMap((pv) => def.optionsByParent?.[pv]?.map((o) => o.value) ?? [])
      );
      const values = flt.values.filter((v) => allowed.has(v));
      if (values.length !== flt.values.length) mutated = true;
      return values.length === flt.values.length ? flt : { ...flt, values };
    });

    cleaned = purged;
    if (!mutated) break;
  }

  return cleaned;
}

/**
 * Hook de confort : combine `buildFilterFields` et `cleanCascadingFilters`
 * pour qu'un composant consommateur n'ait jamais à connaître ces deux
 * fonctions. Usage typique :
 *
 *   const [filters, setFilters] = useState<Filter[]>([]);
 *   const { fields, onChange } = useFilterSchema(schema, filters, setFilters);
 *   <FilterBar fields={fields} value={filters} onChange={onChange} />
 *
 * Astuce : si `schema` est construit dynamiquement (et non une constante de
 * module comme dans la démo plus bas), pensez à le mémoïser (`useMemo`) côté
 * appelant pour éviter un recalcul de `fields` à chaque rendu.
 */
export function useFilterSchema(
  schema: FilterSchema,
  filters: Filter[],
  onFiltersChange: (next: Filter[]) => void
): { fields: FilterFieldDef[]; onChange: (next: Filter[]) => void } {
  const fields = React.useMemo(() => buildFilterFields(schema, filters), [schema, filters]);

  const onChange = React.useCallback(
    (next: Filter[]) => onFiltersChange(cleanCascadingFilters(schema, next)),
    [schema, onFiltersChange]
  );

  return { fields, onChange };
}

/* ============================================================================
 * 3. MOTEUR D'ÉVALUATION GÉNÉRIQUE — comment interpréter les Filter[] produits
 * ==========================================================================*/

/**
 * Évalue un opérateur pour UNE valeur scalaire. Ne connaît rien du métier :
 * uniquement le type du champ (pour distinguer un "between" numérique d'un
 * "between" date), l'opérateur, la valeur de l'item et les valeurs choisies
 * dans le filtre.
 */
function evaluateScalar(
  fieldType: FilterFieldType,
  operator: string,
  itemValue: unknown,
  values: string[]
): boolean {
  const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

  switch (operator) {
    case "is_empty":
      return str(itemValue) === "";
    case "is_not_empty":
      return str(itemValue) !== "";
    case "contains":
      return str(itemValue).toLowerCase().includes(str(values[0]).toLowerCase());
    case "not_contains":
      return !str(itemValue).toLowerCase().includes(str(values[0]).toLowerCase());
    case "starts_with":
      return str(itemValue).toLowerCase().startsWith(str(values[0]).toLowerCase());
    case "equals":
      return str(itemValue).toLowerCase() === str(values[0]).toLowerCase();
    case "is":
      return str(itemValue) === values[0];
    case "is_not":
      return str(itemValue) !== values[0];
    case "is_any_of":
      return values.includes(str(itemValue));
    case "eq":
      return Number(itemValue) === Number(values[0]);
    case "neq":
      return Number(itemValue) !== Number(values[0]);
    case "gt":
      return Number(itemValue) > Number(values[0]);
    case "gte":
      return Number(itemValue) >= Number(values[0]);
    case "lt":
      return Number(itemValue) < Number(values[0]);
    case "lte":
      return Number(itemValue) <= Number(values[0]);
    case "between": {
      const [min, max] = values;
      if (fieldType === "date") {
        const t = new Date(str(itemValue)).getTime();
        const okMin = !min || t >= new Date(min).getTime();
        const okMax = !max || t <= new Date(max).getTime();
        return okMin && okMax;
      }
      const n = Number(itemValue);
      const okMin = min === undefined || min === "" || n >= Number(min);
      const okMax = max === undefined || max === "" || n <= Number(max);
      return okMin && okMax;
    }
    case "on":
      return str(itemValue).slice(0, 10) === str(values[0]).slice(0, 10);
    case "before":
      return new Date(str(itemValue)).getTime() < new Date(values[0]).getTime();
    case "after":
      return new Date(str(itemValue)).getTime() > new Date(values[0]).getTime();
    default:
      return true; // opérateur inconnu : on ne masque rien plutôt que de tout cacher
  }
}

/**
 * Comme `evaluateScalar`, mais accepte aussi un champ "multi-valeurs" côté
 * contenu (ex : `article.tags: string[]`) : l'item satisfait la condition dès
 * qu'au moins une de ses valeurs la satisfait.
 */
export function evaluateFilter(
  fieldType: FilterFieldType,
  operator: string,
  itemValue: unknown,
  values: string[]
): boolean {
  if (Array.isArray(itemValue)) return itemValue.some((v) => evaluateScalar(fieldType, operator, v, values));
  return evaluateScalar(fieldType, operator, itemValue, values);
}

/** Un filtre sans valeur n'est pas encore "prêt" : on ne l'applique pas encore. */
export function isFilterReady(operator: string, values: string[]): boolean {
  if (operator === "is_empty" || operator === "is_not_empty") return true;
  return values.some((v) => v !== "" && v !== undefined);
}

/**
 * Applique une liste de `Filter[]` (issue de <FilterBar>) à un item
 * quelconque, via un simple accesseur `getValue(item, fieldId)` fourni par
 * l'appelant : ce moteur ne connaît donc jamais la forme réelle du contenu
 * filtré, ce qui le rend réutilisable pour n'importe quelle liste (articles,
 * utilisateurs, commandes…).
 */
export function matchesFilters<T>(
  item: T,
  filters: Filter[],
  schema: FilterSchema,
  getValue: (item: T, fieldId: string) => unknown
): boolean {
  return filters.every((f) => {
    if (!isFilterReady(f.operator, f.values)) return true;
    const def = schema.fields.find((s) => s.id === f.field);
    const type = def?.type;
    const fieldType: FilterFieldType = type === "boolean" || type === undefined ? "select" : type;
    return evaluateFilter(fieldType, f.operator, getValue(item, f.field), f.values);
  });
}

/* ============================================================================
 * 4. DÉMO COMMENTÉE — mode d'emploi complet, du JSON jusqu'au filtrage réel
 * ==========================================================================
 *
 * Cas d'usage choisi : une liste d'articles (comme sur civitas-news), mais le
 * même schéma fonctionnerait pour n'importe quel contenu — utilisateurs,
 * tenants, commandes… Rien dans <FilterBar> ni dans la couche schéma ne
 * connaît la notion d'"article".
 *
 * ÉTAPE 1 — décrire les champs filtrables en JSON (FilterSchema).
 * ----------------------------------------------------------------------- */

interface DemoArticle {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  category: string;
  subcategory: string;
  tags: string[];
  views: number;
  publishedAt: string; // ISO (AAAA-MM-JJ)
  featured: boolean;
}

// Cascade statique Catégorie → Sous-catégorie : la clé est la valeur du
// champ parent ("category"), la valeur est la liste d'options à proposer.
const SUBCATEGORIES_BY_CATEGORY: Record<string, FilterOption[]> = {
  politique: [
    { value: "national", label: "National" },
    { value: "international", label: "International" },
    { value: "institutions", label: "Institutions" },
  ],
  sport: [
    { value: "football", label: "Football" },
    { value: "basketball", label: "Basketball" },
    { value: "athletisme", label: "Athlétisme" },
  ],
  economie: [
    { value: "marches", label: "Marchés" },
    { value: "entreprises", label: "Entreprises" },
    { value: "emploi", label: "Emploi" },
  ],
  culture: [
    { value: "musique", label: "Musique" },
    { value: "cinema", label: "Cinéma" },
    { value: "litterature", label: "Littérature" },
  ],
};

// Simule un appel réseau de recherche de tags. En production, remplacez le
// corps de cette fonction par un vrai `fetch()` vers votre API — la
// signature attendue par `loadOptions` (query, { parentValues }) ne change pas.
const ALL_TAGS = ["élections", "corruption", "budget", "diplomatie", "santé", "éducation", "climat", "sécurité"];
function simulateTagSearch(query: string): Promise<FilterOption[]> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const needle = query.trim().toLowerCase();
      const matches = ALL_TAGS.filter((t) => t.toLowerCase().includes(needle));
      resolve(matches.map((t) => ({ value: t, label: t })));
    }, 350);
  });
}

const demoSchema: FilterSchema = {
  fields: [
    {
      id: "status",
      label: "Statut",
      type: "select",
      options: [
        { value: "draft", label: "Brouillon" },
        { value: "published", label: "Publié" },
        { value: "archived", label: "Archivé" },
      ],
    },
    {
      id: "category",
      label: "Catégorie",
      type: "select",
      options: [
        { value: "politique", label: "Politique" },
        { value: "sport", label: "Sport" },
        { value: "economie", label: "Économie" },
        { value: "culture", label: "Culture" },
      ],
    },
    {
      // N'apparaît dans "Ajouter un filtre" que si "category" a déjà une
      // valeur choisie ; ses options changent selon laquelle (cascade).
      id: "subcategory",
      label: "Sous-catégorie",
      type: "select",
      dependsOn: "category",
      optionsByParent: SUBCATEGORIES_BY_CATEGORY,
    },
    {
      // Champ "select" à recherche distante : aucune option statique, tout
      // vient de `loadOptions` (voir simulateTagSearch ci-dessus).
      id: "tags",
      label: "Tags",
      type: "select",
      loadOptions: (query) => simulateTagSearch(query),
    },
    { id: "title", label: "Titre", type: "text" },
    { id: "views", label: "Vues", type: "number" },
    { id: "publishedAt", label: "Date de publication", type: "date" },
    { id: "featured", label: "À la une", type: "boolean" },
  ],
};

// ÉTAPE 2 — un peu de contenu à filtrer.
const DEMO_ARTICLES: DemoArticle[] = [
  { id: "1", title: "Le budget 2027 dévoilé à l'Assemblée", status: "published", category: "politique", subcategory: "national", tags: ["budget", "élections"], views: 4300, publishedAt: "2026-09-02", featured: true },
  { id: "2", title: "Sommet régional sur le climat à Libreville", status: "published", category: "politique", subcategory: "international", tags: ["climat", "diplomatie"], views: 2100, publishedAt: "2026-08-20", featured: false },
  { id: "3", title: "Les Panthères qualifiées pour la CAN", status: "published", category: "sport", subcategory: "football", tags: ["football"], views: 9800, publishedAt: "2026-09-10", featured: true },
  { id: "4", title: "Réforme du système éducatif : ce qui change", status: "draft", category: "politique", subcategory: "institutions", tags: ["éducation"], views: 120, publishedAt: "2026-09-15", featured: false },
  { id: "5", title: "Les marchés locaux résistent à l'inflation", status: "published", category: "economie", subcategory: "marches", tags: ["budget"], views: 1560, publishedAt: "2026-07-30", featured: false },
  { id: "6", title: "Festival de musique urbaine à Port-Gentil", status: "published", category: "culture", subcategory: "musique", tags: [], views: 870, publishedAt: "2026-09-05", featured: false },
  { id: "7", title: "Nouvelle campagne de vaccination lancée", status: "published", category: "politique", subcategory: "national", tags: ["santé"], views: 3400, publishedAt: "2026-06-18", featured: false },
  { id: "8", title: "Championnat national de basketball : bilan", status: "archived", category: "sport", subcategory: "basketball", tags: [], views: 640, publishedAt: "2026-05-02", featured: false },
];

// L'accesseur générique attendu par `matchesFilters` : il fait le lien entre
// l'id d'un champ du schéma et la propriété réelle de l'objet filtré. Cette
// indirection est ce qui permet de réutiliser le même moteur pour n'importe
// quelle forme de contenu, même quand les noms de champ diffèrent des noms
// de propriété.
function getArticleFieldValue(article: DemoArticle, fieldId: string): unknown {
  switch (fieldId) {
    case "status":
      return article.status;
    case "category":
      return article.category;
    case "subcategory":
      return article.subcategory;
    case "tags":
      return article.tags;
    case "title":
      return article.title;
    case "views":
      return article.views;
    case "publishedAt":
      return article.publishedAt;
    case "featured":
      return article.featured;
    default:
      return undefined;
  }
}

// ÉTAPE 5 (bonus) — traduire les filtres actifs en query params côté serveur.
// Convention illustrée ici : les lookups façon django-filter (`__icontains`,
// `__gte`, `__lte`, `__in`…), puisque civitas-news s'appuie sur Django REST
// Framework — à adapter au contrat réel de votre backend si celui-ci diffère.
const OPERATOR_TO_LOOKUP: Record<string, string> = {
  contains: "icontains",
  not_contains: "icontains",
  equals: "iexact",
  starts_with: "istartswith",
  is_empty: "isnull",
  is_not_empty: "isnull",
  eq: "exact",
  neq: "exact",
  gt: "gt",
  gte: "gte",
  lt: "lt",
  lte: "lte",
  on: "exact",
  before: "lt",
  after: "gt",
  is: "exact",
  is_not: "exact",
  is_any_of: "in",
};

function buildQueryParams(filters: Filter[]): string {
  const params = new URLSearchParams();
  for (const f of filters) {
    if (!isFilterReady(f.operator, f.values)) continue;

    if (f.operator === "between") {
      const [min, max] = f.values;
      if (min) params.append(`${f.field}__gte`, min);
      if (max) params.append(`${f.field}__lte`, max);
      continue;
    }
    if (f.operator === "is_empty") {
      params.append(`${f.field}__isnull`, "true");
      continue;
    }
    if (f.operator === "is_not_empty") {
      params.append(`${f.field}__isnull`, "false");
      continue;
    }

    const lookup = OPERATOR_TO_LOOKUP[f.operator] ?? "exact";
    const paramValue = f.operator === "is_any_of" ? f.values.join(",") : f.values[0] ?? "";
    params.append(`${f.field}__${lookup}`, paramValue);
  }
  return params.toString();
}

/**
 * ÉTAPE 3, 4 & 5 réunies — le composant à copier/adapter dans votre écran :
 *
 *   1. état des filtres actifs (`useState<Filter[]>`) ;
 *   2. déduction des champs + nettoyage des cascades (`useFilterSchema`) ;
 *   3. rendu de la barre (`<FilterBar>`) ;
 *   4. consommation de `filters` pour filtrer réellement le contenu, ici de
 *      deux façons : côté client (`matchesFilters`) pour la liste affichée,
 *      et côté serveur (`buildQueryParams`) pour montrer comment la même
 *      donnée alimenterait un appel à votre API.
 *
 * Pour l'essayer : importez `FilterBarDemo` et rendez-le tel quel dans une
 * page ou un storybook — tout est autonome, aucune donnée externe requise.
 */
export function FilterBarDemo() {
  const [filters, setFilters] = React.useState<Filter[]>([]);
  const { fields, onChange } = useFilterSchema(demoSchema, filters, setFilters);

  const visibleArticles = React.useMemo(
    () => DEMO_ARTICLES.filter((a) => matchesFilters(a, filters, demoSchema, getArticleFieldValue)),
    [filters]
  );

  const queryString = React.useMemo(() => buildQueryParams(filters), [filters]);

  return (
    <div className="flex flex-col gap-4">
      <FilterBar fields={fields} value={filters} onChange={onChange} aria-label="Filtrer les articles" />

      <ul className="flex flex-col gap-2">
        {visibleArticles.map((a) => (
          <li
            key={a.id}
            className="rounded-md border border-[var(--fb-border)] px-3 py-2 text-[13px] text-[var(--fb-fg)]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{a.title}</span>
              {a.featured && <span className="text-[var(--fb-fg-muted)]">★ à la une</span>}
            </div>
            <div className="mt-0.5 text-[12px] text-[var(--fb-fg-muted)]">
              {a.category} / {a.subcategory} · {a.views} vues · {new Date(a.publishedAt).toLocaleDateString()}
            </div>
          </li>
        ))}
        {visibleArticles.length === 0 && (
          <li className="rounded-md border border-dashed border-[var(--fb-border)] px-3 py-4 text-center text-[13px] text-[var(--fb-fg-muted)]">
            Aucun article ne correspond à ces filtres.
          </li>
        )}
      </ul>

      <details className="text-[12px] text-[var(--fb-fg-muted)]">
        <summary className="cursor-pointer select-none">Voir l'état brut (à des fins pédagogiques)</summary>
        <p className="mt-2">État `filters` produit par &lt;FilterBar&gt; :</p>
        <pre className="mt-1 overflow-x-auto rounded-md bg-[var(--fb-bg-chip)] p-2">
          {JSON.stringify(filters, null, 2)}
        </pre>
        <p className="mt-2">Query string équivalente (convention django-filter) :</p>
        <pre className="mt-1 overflow-x-auto rounded-md bg-[var(--fb-bg-chip)] p-2">
          ?{queryString || "(aucun filtre actif)"}
        </pre>
      </details>
    </div>
  );
}