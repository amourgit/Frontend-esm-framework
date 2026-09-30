"use client";
// Combobox — design shadcn/ui (Popover + Command + Button `outline`) reproduit
// à l'identique en Tailwind pur, SANS Radix ni cmdk (absents du monorepo) :
// même déclencheur (`w-full max-w-xs justify-between`, chevrons haut/bas à
// 50 %), même panneau (`p-0`, champ de recherche `h-9`, liste `max-h-[300px]`,
// item actif `bg-accent`, coche `ml-auto`). Le comportement suit l'exemple
// d'origine : re-sélectionner l'option courante la désélectionne, le panneau
// se ferme à la sélection.
//
// Tout est pilotable par le composant consommateur : items, valeur
// (contrôlée ou non), ouverture, textes, filtre, rendu des options / du
// déclencheur, placement du panneau et classes de chaque zone.

import * as React from "react";
import { cn } from "../../page-background/page-background.utils.js";
import {
  SelectionCheckIcon,
  SelectionChevronsUpDownIcon,
  SelectionSearchIcon,
} from "../shared/selection-icons.js";

export interface ComboboxItemData {
  /** Valeur retournée par `onValueChange`. */
  value: string;
  /** Libellé affiché (option + déclencheur). */
  label: string;
  /** Texte secondaire affiché sous le libellé. */
  description?: string;
  /** Icône affichée avant le libellé. */
  icon?: React.ReactNode;
  /** Titre de groupe : les items consécutifs partageant la même valeur sont regroupés. */
  group?: string;
  disabled?: boolean;
  /** Mots-clés additionnels pris en compte par la recherche. */
  keywords?: string[];
}

export interface ComboboxItemState {
  isActive: boolean;
  isSelected: boolean;
}

/** Classes additionnelles par zone (fusionnées avec les classes par défaut). */
export interface ComboboxClassNames {
  root?: string;
  trigger?: string;
  /** Panneau (équivalent `PopoverContent`). */
  content?: string;
  searchWrapper?: string;
  searchIcon?: string;
  searchInput?: string;
  list?: string;
  group?: string;
  groupHeading?: string;
  item?: string;
  itemCheck?: string;
  empty?: string;
}

export interface ComboboxProps {
  items: ComboboxItemData[];
  /** Valeur contrôlée. Chaîne vide = aucune sélection. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Ouverture contrôlée (optionnel). */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Texte du déclencheur sans sélection. Défaut : « Select... ». */
  placeholder?: string;
  /** Placeholder du champ de recherche. Défaut : « Search... ». */
  searchPlaceholder?: string;
  /** Message quand aucun item ne correspond. Défaut : « No results found. ». */
  emptyMessage?: string;
  /** Affiche le champ de recherche. Défaut : true. */
  searchable?: boolean;
  /** Re-sélectionner l'option courante la désélectionne (comportement shadcn). Défaut : true. */
  allowDeselect?: boolean;
  /** Ferme le panneau à la sélection. Défaut : true. */
  closeOnSelect?: boolean;
  /** Filtre personnalisé ; `false` désactive le filtrage (recherche côté serveur). */
  filterFn?: ((item: ComboboxItemData, query: string) => boolean) | false;
  /** Appelé à chaque frappe dans le champ de recherche. */
  onSearchChange?: (query: string) => void;
  /** Placement vertical du panneau. `auto` bascule en haut si la place manque en bas. Défaut : auto. */
  side?: "auto" | "bottom" | "top";
  /** Alignement horizontal du panneau par rapport au déclencheur. Défaut : center. */
  align?: "start" | "center" | "end";
  /** Écart (px) entre le déclencheur et le panneau. Défaut : 4. */
  sideOffset?: number;
  /** Rendu personnalisé du contenu d'une option (remplace icône/libellé/description). */
  renderItem?: (item: ComboboxItemData, state: ComboboxItemState) => React.ReactNode;
  /** Rendu personnalisé du texte du déclencheur. */
  renderValue?: (selected: ComboboxItemData | undefined) => React.ReactNode;
  /** Icône du déclencheur (défaut : chevrons haut/bas). */
  triggerIcon?: React.ReactNode;
  /** Remplace la coche de l'option sélectionnée. */
  checkIcon?: React.ReactNode;
  /** Nom de champ pour la soumission de formulaire native. */
  name?: string;
  id?: string;
  "aria-label"?: string;
  classNames?: ComboboxClassNames;
  className?: string;
  style?: React.CSSProperties;
}

const defaultFilter = (item: ComboboxItemData, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.label, item.value, item.description, ...(item.keywords ?? [])]
    .filter(Boolean)
    .some((s) => String(s).toLowerCase().includes(q));
};

const ANIMATION_CSS = `
@keyframes egen-combobox-in-bottom { from { opacity: 0; transform: var(--egen-combobox-from-bottom) scale(0.95); } to { opacity: 1; transform: var(--egen-combobox-to) scale(1); } }
@keyframes egen-combobox-in-top { from { opacity: 0; transform: var(--egen-combobox-from-top) scale(0.95); } to { opacity: 1; transform: var(--egen-combobox-to) scale(1); } }
.egen-combobox-content[data-side="bottom"] { animation: egen-combobox-in-bottom 150ms cubic-bezier(0.16, 1, 0.3, 1); }
.egen-combobox-content[data-side="top"] { animation: egen-combobox-in-top 150ms cubic-bezier(0.16, 1, 0.3, 1); }
@media (prefers-reduced-motion: reduce) { .egen-combobox-content { animation: none !important; } }
`;

export function Combobox({
  items,
  value,
  defaultValue = "",
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  searchable = true,
  allowDeselect = true,
  closeOnSelect = true,
  filterFn,
  onSearchChange,
  side = "auto",
  align = "center",
  sideOffset = 4,
  renderItem,
  renderValue,
  triggerIcon,
  checkIcon,
  name,
  id,
  "aria-label": ariaLabel,
  classNames,
  className,
  style,
}: ComboboxProps) {
  const baseId = React.useId();
  const listboxId = `${baseId}-listbox`;
  const getOptionId = (i: number) => `${baseId}-option-${i}`;

  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const current = controlled ? value : internalValue;

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

  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [resolvedSide, setResolvedSide] = React.useState<"top" | "bottom">("bottom");
  const interaction = React.useRef<"mouse" | "keyboard">("mouse");

  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selected = React.useMemo(() => items.find((i) => i.value === current), [items, current]);

  const filtered = React.useMemo(() => {
    if (filterFn === false) return items;
    const fn = filterFn ?? defaultFilter;
    return items.filter((item) => fn(item, query));
  }, [items, query, filterFn]);

  const commit = React.useCallback(
    (next: string) => {
      const resolved = allowDeselect && next === current ? "" : next;
      if (!controlled) setInternalValue(resolved);
      onValueChange?.(resolved);
      if (closeOnSelect) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    },
    [allowDeselect, current, controlled, onValueChange, closeOnSelect, setOpen],
  );

  // Réinitialisation à la fermeture / positionnement + focus à l'ouverture.
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const idx = filtered.findIndex((i) => i.value === current && !i.disabled);
    setActiveIndex(idx >= 0 ? idx : Math.max(0, filtered.findIndex((i) => !i.disabled)));
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    if (side !== "auto") {
      setResolvedSide(side);
      return;
    }
    const rect = rootRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    const above = rect.top;
    setResolvedSide(below < 340 && above > below ? "top" : "bottom");
  }, [open, side]);

  // Clic extérieur.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, setOpen]);

  // Première option activée à chaque changement de recherche (comme cmdk).
  React.useEffect(() => {
    if (!open) return;
    setActiveIndex(Math.max(0, filtered.findIndex((i) => !i.disabled)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  React.useEffect(() => {
    if (!open || interaction.current !== "keyboard") return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const move = (dir: 1 | -1, from: number) => {
    const n = filtered.length;
    if (n === 0) return -1;
    let i = from;
    for (let step = 0; step < n; step++) {
      i = (i + dir + n) % n;
      if (!filtered[i].disabled) return i;
    }
    return from;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
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
    if (filtered.length === 0) return;
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
        setActiveIndex(Math.max(0, filtered.findIndex((i) => !i.disabled)));
        break;
      case "End": {
        e.preventDefault();
        interaction.current = "keyboard";
        const last = [...filtered].reverse().findIndex((i) => !i.disabled);
        setActiveIndex(last >= 0 ? filtered.length - 1 - last : 0);
        break;
      }
      case "Enter": {
        e.preventDefault();
        const target = filtered[activeIndex];
        if (target && !target.disabled) commit(target.value);
        break;
      }
    }
  };

  const positionClass = cn(
    resolvedSide === "bottom" ? "top-full" : "bottom-full",
    align === "start" && "left-0",
    align === "center" && "left-1/2",
    align === "end" && "right-0",
  );
  const contentStyle = {
    ...(resolvedSide === "bottom" ? { marginTop: sideOffset } : { marginBottom: sideOffset }),
    "--egen-combobox-to": align === "center" ? "translateX(-50%)" : "translateX(0)",
    "--egen-combobox-from-bottom": `${align === "center" ? "translateX(-50%) " : ""}translateY(-8px)`,
    "--egen-combobox-from-top": `${align === "center" ? "translateX(-50%) " : ""}translateY(8px)`,
    transform: align === "center" ? "translateX(-50%)" : "none",
  } as unknown as React.CSSProperties;

  // Regroupement par titre `group` (items consécutifs de même groupe).
  const rows: Array<{ heading?: string; entries: Array<{ item: ComboboxItemData; index: number }> }> = [];
  filtered.forEach((item, index) => {
    const last = rows[rows.length - 1];
    if (last && last.heading === item.group) last.entries.push({ item, index });
    else rows.push({ heading: item.group, entries: [{ item, index }] });
  });

  const renderOption = ({ item, index }: { item: ComboboxItemData; index: number }) => {
    const isSelected = current === item.value;
    const isActive = activeIndex === index;
    return (
      <div
        key={item.value}
        id={getOptionId(index)}
        role="option"
        data-index={index}
        data-selected={isActive}
        data-disabled={item.disabled ? "true" : undefined}
        aria-selected={isSelected}
        aria-disabled={item.disabled || undefined}
        onMouseMove={() => {
          if (item.disabled) return;
          interaction.current = "mouse";
          if (activeIndex !== index) setActiveIndex(index);
        }}
        onClick={() => !item.disabled && commit(item.value)}
        className={cn(
          "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none",
          "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
          "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          classNames?.item,
        )}
      >
        {renderItem ? (
          renderItem(item, { isActive, isSelected })
        ) : (
          <>
            {item.icon}
            {item.description ? (
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{item.label}</span>
                <span className="truncate text-xs text-muted-foreground">{item.description}</span>
              </span>
            ) : (
              item.label
            )}
          </>
        )}
        {checkIcon && isSelected ? (
          <span className={cn("ml-auto", classNames?.itemCheck)}>{checkIcon}</span>
        ) : (
          <SelectionCheckIcon
            className={cn("ml-auto", isSelected ? "opacity-100" : "opacity-0", classNames?.itemCheck)}
          />
        )}
      </div>
    );
  };

  return (
    <div
      ref={rootRef}
      style={style}
      className={cn("relative w-full max-w-xs", className, classNames?.root)}
    >
      <style dangerouslySetInnerHTML={{ __html: ANIMATION_CSS }} />

      {name ? <input type="hidden" name={name} value={current} /> : null}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "inline-flex h-9 w-full shrink-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium whitespace-nowrap text-foreground shadow-xs transition-all outline-none",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:opacity-50",
          classNames?.trigger,
        )}
      >
        <span className="min-w-0 truncate">
          {renderValue ? renderValue(selected) : selected ? selected.label : placeholder}
        </span>
        {triggerIcon ?? <SelectionChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />}
      </button>

      {open ? (
        <div
          data-side={resolvedSide}
          data-state="open"
          style={contentStyle}
          className={cn(
            "egen-combobox-content absolute z-50 w-72 rounded-md border border-border bg-popover p-0 text-popover-foreground shadow-md outline-hidden",
            positionClass,
            classNames?.content,
          )}
          onKeyDown={onKeyDown}
        >
          <div className="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
            {searchable ? (
              <div
                className={cn(
                  "flex h-9 items-center gap-2 border-b border-border px-3",
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
                  aria-activedescendant={filtered.length ? getOptionId(activeIndex) : undefined}
                  placeholder={searchPlaceholder}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    interaction.current = "keyboard";
                    onSearchChange?.(e.target.value);
                  }}
                  className={cn(
                    "flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
                    classNames?.searchInput,
                  )}
                />
              </div>
            ) : (
              // Sans recherche : un focus invisible capte le clavier (flèches / Entrée).
              <input
                ref={inputRef}
                readOnly
                aria-label={ariaLabel}
                aria-controls={listboxId}
                aria-activedescendant={filtered.length ? getOptionId(activeIndex) : undefined}
                className="sr-only"
              />
            )}

            <div
              ref={listRef}
              id={listboxId}
              role="listbox"
              className={cn("max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto", classNames?.list)}
            >
              {filtered.length === 0 ? (
                <div className={cn("py-6 text-center text-sm", classNames?.empty)}>{emptyMessage}</div>
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
                    {row.entries.map(renderOption)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
