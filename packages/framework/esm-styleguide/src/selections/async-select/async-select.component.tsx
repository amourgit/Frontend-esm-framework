"use client";
// AsyncSelect — sélecteur à options chargées de façon asynchrone (recherche côté
// serveur ou liste préchargée filtrée localement). Design shadcn/ui (Popover +
// Command + Button `outline`) reproduit en Tailwind pur, SANS Radix ni cmdk, dans
// la continuité de `Combobox` : même déclencheur (`h-9`, chevrons à 50 %), même
// panneau (champ de recherche `h-9`, liste `max-h-[300px]`, item actif `bg-accent`).
//
// Par rapport à la version d'origine, le comportement est durci et étendu :
//   • l'option sélectionnée est résolue depuis `value` (options initiales, cache ou
//     `resolveOption`) — plus de déclencheur vide quand `value` est fourni d'emblée ;
//   • requêtes annulables (`AbortSignal`), anti-course (seule la dernière compte),
//     cache par requête, rechargement manuel (`reloadKey` / `controller.refresh()`) ;
//   • la saisie vidée recharge bien la liste initiale ;
//   • pagination / défilement infini, regroupement, options désactivées ;
//   • multi-sélection (tags, limite, retrait au clavier) ;
//   • navigation clavier et ARIA complètes (combobox / listbox, `aria-busy`, région live) ;
//   • tous les textes, rendus et classes de chaque zone sont pilotables.

import * as React from "react";
import { cn } from "../../page-background/page-background.utils.js";
import {
  SelectionCheckIcon,
  SelectionChevronsUpDownIcon,
  SelectionLoaderIcon,
  SelectionSearchIcon,
  SelectionXIcon,
} from "../shared/selection-icons.js";
import { useDebouncedValue } from "../shared/use-debounced-value.js";

// ─── Types publics ──────────────────────────────────────────────────────────

/** Contexte passé au `fetcher` à chaque appel. */
export interface AsyncSelectFetchContext {
  /** Signal d'annulation : à transmettre à `fetch()` pour interrompre les requêtes obsolètes. */
  signal: AbortSignal;
  /** Page demandée (0 = première page). Toujours 0 tant que `hasMore` n'est jamais retourné. */
  page: number;
}

/** Réponse paginée optionnelle du `fetcher` (à la place d'un simple tableau). */
export interface AsyncSelectPage<T> {
  items: T[];
  /** `true` : une page suivante existe (active le défilement infini). */
  hasMore?: boolean;
}

export type AsyncSelectFetcher<T> = (
  query: string,
  context: AsyncSelectFetchContext,
) => Promise<T[] | AsyncSelectPage<T>>;

export interface AsyncSelectItemState {
  isActive: boolean;
  isSelected: boolean;
  isDisabled: boolean;
}

/** Classes additionnelles par zone (fusionnées avec les classes par défaut). */
export interface AsyncSelectClassNames {
  root?: string;
  trigger?: string;
  /** Conteneur du texte / des tags à l'intérieur du déclencheur. */
  triggerValue?: string;
  placeholder?: string;
  tag?: string;
  tagRemove?: string;
  clearButton?: string;
  triggerIcon?: string;
  /** Panneau (équivalent `PopoverContent`). */
  content?: string;
  header?: string;
  searchWrapper?: string;
  searchIcon?: string;
  searchInput?: string;
  searchSpinner?: string;
  list?: string;
  group?: string;
  groupHeading?: string;
  item?: string;
  itemCheck?: string;
  empty?: string;
  hint?: string;
  error?: string;
  skeleton?: string;
  loadMore?: string;
  footer?: string;
}

/** Commandes impératives exposées via la prop `controllerRef`. */
export interface AsyncSelectHandle {
  open: () => void;
  close: () => void;
  focus: () => void;
  /** Vide la sélection (déclenche `onChange`). */
  clear: () => void;
  /** Invalide le cache et recharge la liste courante. */
  refresh: () => void;
}

export interface AsyncSelectBaseProps<T> {
  /** Charge les options. Reçoit la recherche (chaîne vide = liste initiale) et un contexte annulable. */
  fetcher: AsyncSelectFetcher<T>;
  /** Extrait la valeur (unique) d'une option. */
  getOptionValue: (option: T) => string;
  /** Libellé texte d'une option : filtre par défaut, repli d'affichage, tags, ARIA. Défaut : la valeur. */
  getOptionLabel?: (option: T) => string;
  /** Contenu d'une option dans la liste. Défaut : le libellé. */
  renderOption?: (option: T, state: AsyncSelectItemState) => React.ReactNode;
  /** Contenu du déclencheur pour l'option sélectionnée (mode simple). Défaut : le libellé. */
  getDisplayValue?: (option: T) => React.ReactNode;
  /** Titre de groupe : les options consécutives partageant le même titre sont regroupées. */
  getOptionGroup?: (option: T) => string | undefined;
  getOptionDisabled?: (option: T) => boolean;

  /** Charge toute la liste une seule fois (recherche `''`) et filtre localement. Défaut : false. */
  preload?: boolean;
  /**
   * Filtre local. Par défaut actif uniquement en mode `preload` (correspondance sur le libellé).
   * Une fonction l'active aussi en mode serveur (affinage des résultats reçus) ; `false` le désactive.
   */
  filterFn?: ((option: T, query: string) => boolean) | false;
  /** Délai (ms) avant d'interroger le serveur après une frappe. Ignoré en `preload`. Défaut : 300. */
  debounceMs?: number;
  /** Longueur minimale de la recherche avant d'interroger le serveur (`''` reste autorisé). Défaut : 0. */
  minQueryLength?: number;
  /** Ne charge qu'à la première ouverture. `false` : charge dès le montage. Défaut : true. */
  fetchOnOpen?: boolean;
  /** Met en cache les résultats par recherche. Défaut : true. */
  cacheResults?: boolean;
  /** Changer cette valeur invalide le cache et recharge (ex. filtre externe modifié). */
  reloadKey?: string | number;
  /** Options connues à l'avance, pour afficher la sélection sans attendre le chargement. */
  initialOptions?: T[];
  /** Résout une option à partir de sa valeur lorsqu'elle n'est ni dans le cache ni dans `initialOptions`. */
  resolveOption?: (value: string) => Promise<T | undefined> | T | undefined;

  /** Ouverture contrôlée (optionnel). */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Nom de champ pour la soumission de formulaire native (un champ par valeur en multi). */
  name?: string;
  id?: string;
  "aria-label"?: string;
  /** Sert à construire les textes par défaut (« Search {label}… », « No {label} found. »). */
  label: string;

  /** Texte du déclencheur sans sélection. Défaut : « Select... ». */
  placeholder?: string;
  /** Placeholder du champ de recherche. Défaut : « Search {label}... ». */
  searchPlaceholder?: string;
  /** Message quand aucun résultat. Défaut : « No {label} found. ». */
  noResultsMessage?: string;
  /** Message sous `minQueryLength`. Défaut : « Type at least N characters to search. ». */
  minQueryMessage?: string;
  /** Annonce vocale (région live) pendant le chargement. Défaut : « Loading... ». */
  loadingMessage?: string;
  /** Libellé du bouton de nouvelle tentative. Défaut : « Retry ». */
  retryLabel?: string;
  /** Libellé du bouton d'effacement. Défaut : « Clear ». */
  clearLabel?: string;
  /** Libellé accessible du retrait d'un tag. Défaut : « Remove {label} ». */
  removeLabel?: (label: string) => string;
  /** Message d'erreur de repli quand le `fetcher` rejette autre chose qu'une `Error`. */
  errorMessage?: string;
  /** Libellé du bouton d'échec de la page suivante. Défaut : « Failed to load more. Retry ». */
  loadMoreErrorLabel?: string;

  /** Affiche le champ de recherche. Défaut : true. */
  searchable?: boolean;
  /** Re-sélectionner l'option courante la désélectionne (mode simple, comportement d'origine). Défaut : true. */
  clearable?: boolean;
  /** Affiche un bouton « effacer » dans le déclencheur quand il y a une sélection. Défaut : false. */
  showClearButton?: boolean;
  /** Ferme le panneau à la sélection. Défaut : true en simple, false en multi. */
  closeOnSelect?: boolean;

  /** Largeur du composant (nombre = px). Défaut : « 200px ». */
  width?: string | number;
  /** Largeur du panneau : `trigger` (= déclencheur) ou une largeur fixe. Défaut : trigger. */
  contentWidth?: "trigger" | string | number;
  /** Placement vertical du panneau. `auto` bascule en haut si la place manque en bas. Défaut : auto. */
  side?: "auto" | "bottom" | "top";
  /** Alignement horizontal du panneau par rapport au déclencheur. Défaut : start. */
  align?: "start" | "center" | "end";
  /** Écart (px) entre le déclencheur et le panneau. Défaut : 4. */
  sideOffset?: number;
  /** Hauteur max (px) de la liste. Défaut : 300. */
  maxListHeight?: number;

  /** Remplace le squelette de chargement initial. */
  loadingSkeleton?: React.ReactNode;
  /** Remplace l'indicateur de chargement du champ de recherche. */
  loadingIndicator?: React.ReactNode;
  /** Remplace entièrement l'état « aucun résultat ». */
  notFound?: React.ReactNode;
  /** Rendu personnalisé de l'erreur de chargement. */
  renderError?: (error: string, retry: () => void) => React.ReactNode;
  /** Contenu affiché au-dessus du champ de recherche. */
  header?: React.ReactNode;
  /** Contenu affiché sous la liste. */
  footer?: React.ReactNode;
  /** Icône du déclencheur (défaut : chevrons haut/bas). */
  triggerIcon?: React.ReactNode;
  /** Remplace la coche de l'option sélectionnée. */
  checkIcon?: React.ReactNode;
  /** Expose des commandes impératives (`open`, `close`, `focus`, `clear`, `refresh`). */
  controllerRef?: React.Ref<AsyncSelectHandle>;

  classNames?: AsyncSelectClassNames;
  /** Classes du composant racine (fusionnées avec `classNames.root`). */
  className?: string;
  /** Classes du déclencheur (fusionnées avec `classNames.trigger`). */
  triggerClassName?: string;
  style?: React.CSSProperties;
}

export interface AsyncSelectSingleProps<T> extends AsyncSelectBaseProps<T> {
  multiple?: false;
  /** Valeur contrôlée. Chaîne vide = aucune sélection. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, option: T | undefined) => void;
}

export interface AsyncSelectMultipleProps<T> extends AsyncSelectBaseProps<T> {
  multiple: true;
  /** Valeurs contrôlées. */
  value?: string[];
  defaultValue?: string[];
  onChange?: (values: string[], options: T[]) => void;
  /** Nombre maximal de sélections. */
  maxSelected?: number;
  /** Nombre de tags affichés avant « +N ». Défaut : 3. */
  maxVisibleTags?: number;
  /** Rendu personnalisé d'un tag (le bouton de retrait reste géré par le composant). */
  renderTag?: (option: T | undefined, value: string) => React.ReactNode;
}

export type AsyncSelectProps<T> = AsyncSelectSingleProps<T> | AsyncSelectMultipleProps<T>;

// ─── Utilitaires internes ───────────────────────────────────────────────────

const toArray = (v: string | string[] | undefined): string[] =>
  v === undefined || v === "" ? [] : Array.isArray(v) ? v : [v];

const normalizePage = <T,>(res: T[] | AsyncSelectPage<T>): { items: T[]; hasMore: boolean } =>
  Array.isArray(res) ? { items: res, hasMore: false } : { items: res.items ?? [], hasMore: !!res.hasMore };

const toCssSize = (v: string | number): string => (typeof v === "number" ? `${v}px` : v);

const ANIMATION_CSS = `
@keyframes egen-async-select-in-bottom { from { opacity: 0; transform: var(--egen-async-select-from-bottom) scale(0.95); } to { opacity: 1; transform: var(--egen-async-select-to) scale(1); } }
@keyframes egen-async-select-in-top { from { opacity: 0; transform: var(--egen-async-select-from-top) scale(0.95); } to { opacity: 1; transform: var(--egen-async-select-to) scale(1); } }
.egen-async-select-content[data-side="bottom"] { animation: egen-async-select-in-bottom 150ms cubic-bezier(0.16, 1, 0.3, 1); }
.egen-async-select-content[data-side="top"] { animation: egen-async-select-in-top 150ms cubic-bezier(0.16, 1, 0.3, 1); }
@media (prefers-reduced-motion: reduce) { .egen-async-select-content { animation: none !important; } }
`;

type Status = "idle" | "loading" | "ready" | "error";

// ─── Composant ──────────────────────────────────────────────────────────────

export function AsyncSelect<T>(props: AsyncSelectProps<T>) {
  const {
    fetcher,
    getOptionValue,
    getOptionLabel,
    renderOption,
    getDisplayValue,
    getOptionGroup,
    getOptionDisabled,
    preload = false,
    filterFn,
    debounceMs = 300,
    minQueryLength = 0,
    fetchOnOpen = true,
    cacheResults = true,
    reloadKey,
    initialOptions,
    resolveOption,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    disabled = false,
    name,
    id,
    "aria-label": ariaLabel,
    label,
    placeholder = "Select...",
    searchPlaceholder,
    noResultsMessage,
    minQueryMessage,
    loadingMessage = "Loading...",
    retryLabel = "Retry",
    clearLabel = "Clear",
    removeLabel = (l: string) => `Remove ${l}`,
    errorMessage = "Failed to fetch options",
    loadMoreErrorLabel = "Failed to load more. Retry",
    searchable = true,
    clearable = true,
    showClearButton = false,
    closeOnSelect: closeOnSelectProp,
    width = "200px",
    contentWidth = "trigger",
    side = "auto",
    align = "start",
    sideOffset = 4,
    maxListHeight = 300,
    loadingSkeleton,
    loadingIndicator,
    notFound,
    renderError,
    header,
    footer,
    triggerIcon,
    checkIcon,
    controllerRef,
    classNames,
    className,
    triggerClassName,
    style,
  } = props;

  const multiple = props.multiple === true;
  const maxSelected = props.multiple === true ? props.maxSelected : undefined;
  const maxVisibleTags = props.multiple === true ? (props.maxVisibleTags ?? 3) : 3;
  const renderTag = props.multiple === true ? props.renderTag : undefined;
  const closeOnSelect = closeOnSelectProp ?? !multiple;

  const baseId = React.useId();
  const listboxId = `${baseId}-listbox`;
  const getOptionId = (i: number) => `${baseId}-option-${i}`;

  const labelOf = React.useCallback(
    (o: T) => (getOptionLabel ? getOptionLabel(o) : getOptionValue(o)),
    [getOptionLabel, getOptionValue],
  );

  // ── Valeur (contrôlée / non contrôlée) ────────────────────────────────────
  const controlled = props.value !== undefined;
  const [internalValues, setInternalValues] = React.useState<string[]>(() => toArray(props.defaultValue));
  const currentValues = controlled ? toArray(props.value) : internalValues;

  // ── Ouverture (contrôlée / non contrôlée) ─────────────────────────────────
  const openControlled = openProp !== undefined;
  const [openInternal, setOpenInternal] = React.useState(defaultOpen);
  const open = openControlled ? openProp : openInternal;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!openControlled) setOpenInternal(next);
      onOpenChange?.(next);
    },
    [openControlled, onOpenChange],
  );

  // ── Options connues (résolution de la sélection) ──────────────────────────
  const known = React.useRef(new Map<string, T>());
  const attempted = React.useRef(new Set<string>());
  const [, bump] = React.useReducer((x: number) => x + 1, 0);

  React.useMemo(() => {
    initialOptions?.forEach((o) => known.current.set(getOptionValue(o), o));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOptions]);

  const resolveRef = React.useRef(resolveOption);
  resolveRef.current = resolveOption;
  const valuesKey = currentValues.join("\u0000");
  React.useEffect(() => {
    const resolver = resolveRef.current;
    if (!resolver) return undefined;
    let cancelled = false;
    currentValues.forEach((v) => {
      if (known.current.has(v) || attempted.current.has(v)) return;
      attempted.current.add(v);
      Promise.resolve(resolver(v))
        .then((option) => {
          if (cancelled || option === undefined) return;
          known.current.set(v, option);
          bump();
        })
        .catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesKey]);

  // ── Recherche & chargement ────────────────────────────────────────────────
  const [query, setQuery] = React.useState("");
  const serverQuery = useDebouncedValue(preload ? "" : query, preload ? 0 : debounceMs);
  const trimmedServerQuery = serverQuery.trim();
  const tooShort = !preload && trimmedServerQuery.length > 0 && trimmedServerQuery.length < minQueryLength;

  const [items, setItems] = React.useState<T[]>([]);
  const [status, setStatus] = React.useState<Status>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [moreFailed, setMoreFailed] = React.useState(false);
  const [refreshTick, setRefreshTick] = React.useState(0);

  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;
  const getValueRef = React.useRef(getOptionValue);
  getValueRef.current = getOptionValue;
  const cache = React.useRef(new Map<string, { items: T[]; hasMore: boolean; page: number }>());
  const requestId = React.useRef(0);
  const pageRef = React.useRef(0);
  const moreAbort = React.useRef<AbortController | null>(null);

  const shouldFetch = (open || !fetchOnOpen) && !tooShort;
  const fetchKey = `${reloadKey ?? ""}\u0000${refreshTick}\u0000${trimmedServerQuery === "" ? "" : serverQuery}`;

  const register = React.useCallback((list: T[]) => {
    list.forEach((o) => known.current.set(getValueRef.current(o), o));
  }, []);

  React.useEffect(() => {
    if (!shouldFetch) return undefined;

    const cached = cacheResults ? cache.current.get(fetchKey) : undefined;
    if (cached) {
      setItems(cached.items);
      setHasMore(cached.hasMore);
      setMoreFailed(false);
      pageRef.current = cached.page;
      setError(null);
      setStatus("ready");
      return undefined;
    }

    moreAbort.current?.abort();
    const controller = new AbortController();
    const id = ++requestId.current;
    setStatus("loading");
    setError(null);
    setMoreFailed(false);

    Promise.resolve()
      .then(() => fetcherRef.current(trimmedServerQuery === "" ? "" : serverQuery, { signal: controller.signal, page: 0 }))
      .then((res) => {
        if (controller.signal.aborted || id !== requestId.current) return;
        const page = normalizePage(res);
        register(page.items);
        if (cacheResults) cache.current.set(fetchKey, { items: page.items, hasMore: page.hasMore, page: 0 });
        pageRef.current = 0;
        setItems(page.items);
        setHasMore(page.hasMore);
        setStatus("ready");
        bump();
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || id !== requestId.current) return;
        setError(err instanceof Error && err.message ? err.message : errorMessage);
        setStatus("error");
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFetch, fetchKey, cacheResults]);

  const retry = React.useCallback(() => {
    cache.current.delete(fetchKey);
    setRefreshTick((t) => t + 1);
  }, [fetchKey]);

  const loadMore = React.useCallback(async () => {
    if (status !== "ready" || !hasMore || loadingMore) return;
    const id = requestId.current;
    const nextPage = pageRef.current + 1;
    const controller = new AbortController();
    moreAbort.current = controller;
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const res = await fetcherRef.current(trimmedServerQuery === "" ? "" : serverQuery, {
        signal: controller.signal,
        page: nextPage,
      });
      if (controller.signal.aborted || id !== requestId.current) return;
      const page = normalizePage(res);
      register(page.items);
      setItems((prev) => {
        const seen = new Set(prev.map((o) => getValueRef.current(o)));
        const merged = [...prev, ...page.items.filter((o) => !seen.has(getValueRef.current(o)))];
        if (cacheResults) cache.current.set(fetchKey, { items: merged, hasMore: page.hasMore, page: nextPage });
        return merged;
      });
      pageRef.current = nextPage;
      setHasMore(page.hasMore);
    } catch {
      if (!controller.signal.aborted && id === requestId.current) setMoreFailed(true);
    } finally {
      if (moreAbort.current === controller) {
        moreAbort.current = null;
        setLoadingMore(false);
      }
    }
  }, [status, hasMore, loadingMore, trimmedServerQuery, serverQuery, register, cacheResults, fetchKey]);

  // Nettoyage au démontage.
  React.useEffect(
    () => () => {
      requestId.current += 1;
      moreAbort.current?.abort();
    },
    [],
  );

  // ── Liste visible ─────────────────────────────────────────────────────────
  const localFilter = React.useMemo<((o: T, q: string) => boolean) | null>(() => {
    if (filterFn === false) return null;
    if (filterFn) return filterFn;
    if (!preload) return null;
    return (o, q) => {
      const needle = q.trim().toLowerCase();
      return !needle || labelOf(o).toLowerCase().includes(needle);
    };
  }, [filterFn, preload, labelOf]);

  const visible = React.useMemo(
    () => (localFilter && query ? items.filter((o) => localFilter(o, query)) : items),
    [items, localFilter, query],
  );

  const selectedOptions = currentValues.map((v) => known.current.get(v));
  const limitReached = multiple && maxSelected !== undefined && currentValues.length >= maxSelected;
  const isItemDisabled = (o: T) =>
    !!getOptionDisabled?.(o) || (limitReached && !currentValues.includes(getOptionValue(o)));

  // ── Sélection ─────────────────────────────────────────────────────────────
  const emit = (next: string[]) => {
    if (!controlled) setInternalValues(next);
    if (props.multiple === true) {
      props.onChange?.(
        next,
        next.map((v) => known.current.get(v)).filter((o): o is T => o !== undefined),
      );
    } else {
      props.onChange?.(next[0] ?? "", next[0] !== undefined ? known.current.get(next[0]) : undefined);
    }
  };

  const triggerRef = React.useRef<HTMLDivElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  const commit = (option: T) => {
    const v = getOptionValue(option);
    known.current.set(v, option);
    if (multiple) {
      const selected = currentValues.includes(v);
      if (!selected && limitReached) return;
      emit(selected ? currentValues.filter((x) => x !== v) : [...currentValues, v]);
    } else {
      emit(clearable && currentValues[0] === v ? [] : [v]);
    }
    if (closeOnSelect) {
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const removeValue = (v: string) => emit(currentValues.filter((x) => x !== v));
  const clearAll = () => emit([]);

  React.useImperativeHandle(
    controllerRef,
    () => ({
      open: () => !disabled && setOpen(true),
      close: () => setOpen(false),
      focus: () => triggerRef.current?.focus(),
      clear: clearAll,
      refresh: () => {
        cache.current.clear();
        setRefreshTick((t) => t + 1);
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, setOpen, currentValues, controlled],
  );

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [resolvedSide, setResolvedSide] = React.useState<"top" | "bottom">("bottom");
  const interaction = React.useRef<"mouse" | "keyboard">("mouse");

  const firstEnabled = () => Math.max(0, visible.findIndex((o) => !isItemDisabled(o)));

  // Réinitialisation à la fermeture / focus à l'ouverture.
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      return undefined;
    }
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Option active : la sélectionnée (simple) ou la première, à chaque changement de recherche / d'état.
  React.useEffect(() => {
    if (!open) return;
    const selectedIdx =
      !multiple && currentValues[0] !== undefined
        ? visible.findIndex((o) => getOptionValue(o) === currentValues[0] && !isItemDisabled(o))
        : -1;
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : firstEnabled());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, status]);

  React.useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    if (side !== "auto") {
      setResolvedSide(side);
      return;
    }
    const rect = rootRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    const above = rect.top;
    const needed = Math.min(maxListHeight, 300) + 48;
    setResolvedSide(below < needed && above > below ? "top" : "bottom");
  }, [open, side, maxListHeight]);

  // Clic extérieur.
  React.useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, setOpen]);

  React.useEffect(() => {
    if (!open || interaction.current !== "keyboard") return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, open]);

  // Défilement infini : la sentinelle déclenche la page suivante.
  React.useEffect(() => {
    if (!open || !hasMore || status !== "ready" || moreFailed || typeof IntersectionObserver === "undefined") {
      return undefined;
    }
    const node = sentinelRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore();
      },
      { root: listRef.current, rootMargin: "48px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, hasMore, status, moreFailed, loadMore, visible.length]);

  const move = (dir: 1 | -1, from: number) => {
    const n = visible.length;
    if (n === 0) return -1;
    let i = from;
    for (let step = 0; step < n; step++) {
      i = (i + dir + n) % n;
      if (!isItemDisabled(visible[i])) return i;
    }
    return from;
  };

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (e.key === "Backspace" && multiple && query === "" && currentValues.length > 0) {
      removeValue(currentValues[currentValues.length - 1]);
      return;
    }
    if (visible.length === 0) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        interaction.current = "keyboard";
        setActiveIndex((p) => move(1, p));
        break;
      case "ArrowUp":
        e.preventDefault();
        interaction.current = "keyboard";
        setActiveIndex((p) => move(-1, p));
        break;
      case "Home":
        e.preventDefault();
        interaction.current = "keyboard";
        setActiveIndex(firstEnabled());
        break;
      case "End": {
        e.preventDefault();
        interaction.current = "keyboard";
        const last = [...visible].reverse().findIndex((o) => !isItemDisabled(o));
        setActiveIndex(last >= 0 ? visible.length - 1 - last : 0);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const target = visible[activeIndex];
        if (target && !isItemDisabled(target)) commit(target);
        break;
      }
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const positionClass = cn(
    resolvedSide === "bottom" ? "top-full" : "bottom-full",
    align === "start" && "left-0",
    align === "center" && "left-1/2",
    align === "end" && "right-0",
  );
  const contentStyle = {
    width: contentWidth === "trigger" ? "100%" : toCssSize(contentWidth),
    ...(resolvedSide === "bottom" ? { marginTop: sideOffset } : { marginBottom: sideOffset }),
    "--egen-async-select-to": align === "center" ? "translateX(-50%)" : "translateX(0)",
    "--egen-async-select-from-bottom": `${align === "center" ? "translateX(-50%) " : ""}translateY(-8px)`,
    "--egen-async-select-from-top": `${align === "center" ? "translateX(-50%) " : ""}translateY(8px)`,
    transform: align === "center" ? "translateX(-50%)" : "none",
  } as unknown as React.CSSProperties;

  // Regroupement par titre (options consécutives de même groupe).
  const rows: Array<{ heading?: string; entries: Array<{ item: T; index: number }> }> = [];
  visible.forEach((item, index) => {
    const heading = getOptionGroup?.(item);
    const last = rows[rows.length - 1];
    if (last && last.heading === heading) last.entries.push({ item, index });
    else rows.push({ heading, entries: [{ item, index }] });
  });

  const renderRow = ({ item, index }: { item: T; index: number }) => {
    const value = getOptionValue(item);
    const isSelected = currentValues.includes(value);
    const isActive = activeIndex === index;
    const isDisabled = isItemDisabled(item);
    return (
      <div
        key={value}
        id={getOptionId(index)}
        role="option"
        data-index={index}
        data-selected={isActive}
        data-disabled={isDisabled ? "true" : undefined}
        aria-selected={isSelected}
        aria-disabled={isDisabled || undefined}
        onMouseMove={() => {
          if (isDisabled) return;
          interaction.current = "mouse";
          if (activeIndex !== index) setActiveIndex(index);
        }}
        onClick={() => !isDisabled && commit(item)}
        className={cn(
          "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none",
          "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
          "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          classNames?.item,
        )}
      >
        {renderOption ? renderOption(item, { isActive, isSelected, isDisabled }) : labelOf(item)}
        {checkIcon && isSelected ? (
          <span className={cn("ml-auto", classNames?.itemCheck)}>{checkIcon}</span>
        ) : (
          <SelectionCheckIcon
            className={cn("ml-auto size-3", isSelected ? "opacity-100" : "opacity-0", classNames?.itemCheck)}
          />
        )}
      </div>
    );
  };

  const tagLabel = (v: string, o: T | undefined) => (o !== undefined ? labelOf(o) : v);
  const hasSelection = currentValues.length > 0;

  const renderTriggerValue = () => {
    if (!hasSelection) {
      return <span className={cn("truncate text-muted-foreground", classNames?.placeholder)}>{placeholder}</span>;
    }
    if (!multiple) {
      const option = selectedOptions[0];
      return (
        <span className="min-w-0 truncate">
          {option !== undefined ? (getDisplayValue ? getDisplayValue(option) : labelOf(option)) : currentValues[0]}
        </span>
      );
    }
    const visibleTags = currentValues.slice(0, Math.max(0, maxVisibleTags));
    const hidden = currentValues.slice(visibleTags.length);
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        {visibleTags.map((v) => {
          const option = known.current.get(v);
          const text = tagLabel(v, option);
          return (
            <span
              key={v}
              className={cn(
                "inline-flex max-w-full items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground",
                classNames?.tag,
              )}
            >
              <span className="truncate">{renderTag ? renderTag(option, v) : text}</span>
              {!disabled ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={removeLabel(text)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeValue(v);
                  }}
                  className={cn(
                    "rounded-sm opacity-60 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50",
                    classNames?.tagRemove,
                  )}
                >
                  <SelectionXIcon className="size-3" />
                </button>
              ) : null}
            </span>
          );
        })}
        {hidden.length > 0 ? (
          <span
            title={hidden.map((v) => tagLabel(v, known.current.get(v))).join(", ")}
            className={cn("rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground", classNames?.tag)}
          >
            +{hidden.length}
          </span>
        ) : null}
      </span>
    );
  };

  const resolvedSearchPlaceholder = searchPlaceholder ?? `Search ${label.toLowerCase()}...`;
  const resolvedNoResults = noResultsMessage ?? `No ${label.toLowerCase()} found.`;
  const resolvedMinQuery = minQueryMessage ?? `Type at least ${minQueryLength} characters to search.`;
  const isLoading = status === "loading";

  return (
    <div
      ref={rootRef}
      style={{ width: toCssSize(width), ...style }}
      className={cn("relative", className, classNames?.root)}
    >
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_CSS }} />

      {name
        ? multiple
          ? currentValues.map((v) => <input key={v} type="hidden" name={name} value={v} />)
          : <input type="hidden" name={name} value={currentValues[0] ?? ""} />
        : null}

      {/* Annonce vocale du chargement */}
      <span role="status" aria-live="polite" className="sr-only">
        {isLoading ? loadingMessage : ""}
      </span>

      <div
        ref={triggerRef}
        id={id}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel ?? label}
        aria-disabled={disabled || undefined}
        aria-busy={isLoading || undefined}
        data-disabled={disabled ? "true" : undefined}
        data-state={open ? "open" : "closed"}
        onClick={() => !disabled && setOpen(!open)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(true);
          } else if (!open && multiple && e.key === "Backspace" && hasSelection) {
            removeValue(currentValues[currentValues.length - 1]);
          }
        }}
        className={cn(
          "flex min-h-9 w-full shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xs transition-all outline-none",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "data-[disabled=true]:pointer-events-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
          triggerClassName,
          classNames?.trigger,
        )}
      >
        <span className={cn("flex min-w-0 flex-1 items-center", classNames?.triggerValue)}>{renderTriggerValue()}</span>
        {showClearButton && hasSelection && !disabled ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label={clearLabel}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
            className={cn(
              "shrink-0 rounded-sm opacity-50 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring/50",
              classNames?.clearButton,
            )}
          >
            <SelectionXIcon className="size-4" />
          </button>
        ) : null}
        {triggerIcon ?? <SelectionChevronsUpDownIcon className={cn("size-3 shrink-0 opacity-50", classNames?.triggerIcon)} />}
      </div>

      {open ? (
        <div
          data-side={resolvedSide}
          data-state="open"
          style={contentStyle}
          className={cn(
            "egen-async-select-content absolute z-50 rounded-md border border-border bg-popover p-0 text-popover-foreground shadow-md outline-hidden",
            positionClass,
            classNames?.content,
          )}
          onKeyDown={onPanelKeyDown}
        >
          <div className="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
            {header ? <div className={classNames?.header}>{header}</div> : null}

            {searchable ? (
              <div
                className={cn(
                  "relative flex h-9 items-center gap-2 border-b border-border px-3",
                  classNames?.searchWrapper,
                )}
              >
                <SelectionSearchIcon className={cn("size-4 shrink-0 opacity-50", classNames?.searchIcon)} />
                <input
                  ref={inputRef}
                  type="text"
                  role="searchbox"
                  autoComplete="off"
                  spellCheck={false}
                  aria-controls={listboxId}
                  aria-activedescendant={visible.length ? getOptionId(activeIndex) : undefined}
                  placeholder={resolvedSearchPlaceholder}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    interaction.current = "keyboard";
                  }}
                  className={cn(
                    "flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
                    classNames?.searchInput,
                  )}
                />
                {isLoading && visible.length > 0 ? (
                  <span
                    className={cn("flex shrink-0 items-center text-muted-foreground", classNames?.searchSpinner)}
                    aria-hidden
                  >
                    {loadingIndicator ?? <SelectionLoaderIcon className="size-4 animate-spin" />}
                  </span>
                ) : null}
              </div>
            ) : (
              // Sans recherche : un focus invisible capte le clavier (flèches / Entrée).
              <input
                ref={inputRef}
                readOnly
                aria-label={ariaLabel ?? label}
                aria-controls={listboxId}
                aria-activedescendant={visible.length ? getOptionId(activeIndex) : undefined}
                className="sr-only"
              />
            )}

            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-multiselectable={multiple || undefined}
              aria-busy={isLoading || undefined}
              style={{ maxHeight: maxListHeight }}
              className={cn("scroll-py-1 overflow-x-hidden overflow-y-auto", classNames?.list)}
            >
              {tooShort ? (
                <div className={cn("py-6 text-center text-sm text-muted-foreground", classNames?.hint)}>
                  {resolvedMinQuery}
                </div>
              ) : status === "error" ? (
                renderError ? (
                  renderError(error ?? errorMessage, retry)
                ) : (
                  <div
                    role="alert"
                    className={cn("flex flex-col items-center gap-2 p-4 text-center text-sm text-destructive", classNames?.error)}
                  >
                    <span>{error ?? errorMessage}</span>
                    <button
                      type="button"
                      onClick={retry}
                      className="rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {retryLabel}
                    </button>
                  </div>
                )
              ) : (isLoading || status === "idle") && visible.length === 0 ? (
                loadingSkeleton ?? (
                  <div className={cn("p-1", classNames?.skeleton)} aria-hidden>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-2 rounded-sm px-2 py-1.5">
                        <div className="size-6 animate-pulse rounded-full bg-muted" />
                        <div className="flex flex-1 flex-col gap-1">
                          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : visible.length === 0 ? (
                notFound ?? <div className={cn("py-6 text-center text-sm", classNames?.empty)}>{resolvedNoResults}</div>
              ) : (
                rows.map((row, i) => (
                  <div
                    key={`${row.heading ?? "_"}-${i}`}
                    role="group"
                    aria-label={row.heading}
                    className={cn("overflow-hidden p-1 text-foreground", classNames?.group)}
                  >
                    {row.heading ? (
                      <div
                        className={cn(
                          "px-2 py-1.5 text-xs font-medium text-muted-foreground",
                          classNames?.groupHeading,
                        )}
                      >
                        {row.heading}
                      </div>
                    ) : null}
                    {row.entries.map(renderRow)}
                  </div>
                ))
              )}

              {hasMore && status === "ready" ? (
                <div ref={sentinelRef} className={cn("flex items-center justify-center p-2 text-xs text-muted-foreground", classNames?.loadMore)}>
                  {moreFailed ? (
                    <button
                      type="button"
                      onClick={() => void loadMore()}
                      className="rounded-md px-2 py-1 text-destructive outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      {loadMoreErrorLabel}
                    </button>
                  ) : loadingMore ? (
                    loadingIndicator ?? <SelectionLoaderIcon className="size-4 animate-spin" />
                  ) : null}
                </div>
              ) : null}
            </div>

            {footer ? <div className={classNames?.footer}>{footer}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
