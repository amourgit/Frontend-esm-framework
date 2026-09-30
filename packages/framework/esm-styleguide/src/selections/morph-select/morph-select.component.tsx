"use client";
// Source d'origine : beui.dev/components/motion/select — design copié à
// l'identique ; seuls ont été adaptés : imports (framer-motion, cn du
// styleguide, icônes inline) et les points de personnalisation (props
// `transition`, `stagger`, `radius`, `icon`, `label`…) ajoutés pour que le
// composant consommateur pilote entièrement le rendu.

import {
  AnimatePresence,
  motion,
  type Transition,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../page-background/page-background.utils.js";
import { SelectionCheckIcon, SelectionChevronDownIcon } from "../shared/selection-icons.js";

// Shared-layout morph: trigger box grows into the panel and back, one surface.
/** Transition « ressort » par défaut du morph (surchargeable via la prop `transition`). */
export const MORPH_SELECT_DEFAULT_TRANSITION: Transition = { type: "spring", duration: 0.5, bounce: 0.22 };
// Trigger and panel header share this row so the morph stays seamless.
const ROW =
  "flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-sm";

const DEFAULT_STAGGER = 0.035;
const DEFAULT_STAGGER_DELAY = 0.08;

const ITEM: Variants = {
  hidden: { opacity: 0, y: -6, filter: "blur(3px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)" },
};

interface MorphContextValue {
  value: string | undefined;
  open: boolean;
  setOpen: (open: boolean) => void;
  select: (value: string) => void;
  register: (value: string, label: string) => void;
  unregister: (value: string) => void;
  labelFor: (value: string | undefined) => string | undefined;
  placeholder: string;
  setPlaceholder: (p: string) => void;
  reduce: boolean;
  layoutId: string;
  triggerId: string;
  listId: string;
  disabled: boolean;
  transition: Transition;
  radius: number;
  stagger: number;
  staggerDelay: number;
}

const MorphContext = createContext<MorphContextValue | null>(null);

function useMorphContext(component: string) {
  const ctx = useContext(MorphContext);
  if (!ctx) throw new Error(`${component} must be used within <MorphSelect>`);
  return ctx;
}

export interface MorphSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Ouverture contrôlée (optionnel). */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** Transition du morph trigger ↔ panneau (défaut : ressort 0.5s, bounce 0.22). */
  transition?: Transition;
  /** Rayon de bordure (px) de la surface morphée. Défaut : 12. */
  radius?: number;
  /** Délai entre l'apparition de deux items (s). Défaut : 0.035. */
  stagger?: number;
  /** Délai avant la première apparition d'item (s). Défaut : 0.08. */
  staggerDelay?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Select whose trigger morphs into the panel via a shared layoutId — instead of
 * a separate dropdown opening, the trigger itself grows into the menu and
 * shrinks back, never detaching. Composable like `Select` (the gooey variant).
 */
export function MorphSelect({
  value,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  transition = MORPH_SELECT_DEFAULT_TRANSITION,
  radius = 12,
  stagger = DEFAULT_STAGGER,
  staggerDelay = DEFAULT_STAGGER_DELAY,
  className,
  children,
}: MorphSelectProps) {
  const reduce = useReducedMotion() ?? false;
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [openInternal, setOpenInternal] = useState(defaultOpen);
  const openControlled = openProp !== undefined;
  const open = openControlled ? openProp : openInternal;
  const setOpen = useCallback(
    (next: boolean) => {
      if (!openControlled) setOpenInternal(next);
      onOpenChange?.(next);
    },
    [openControlled, onOpenChange],
  );
  const [internal, setInternal] = useState(defaultValue);
  // ref-counted: items render twice (hidden registrar + open panel), so a
  // label is only dropped once every copy with that value has unmounted.
  const [labels, setLabels] = useState<
    Map<string, { label: string; count: number }>
  >(new Map());
  const [placeholder, setPlaceholder] = useState("Select");

  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  const select = useCallback(
    (next: string) => {
      if (!controlled) setInternal(next);
      onValueChange?.(next);
      setOpen(false);
    },
    [controlled, onValueChange, setOpen],
  );

  const register = useCallback((v: string, label: string) => {
    setLabels((m) => {
      const next = new Map(m);
      next.set(v, { label, count: (m.get(v)?.count ?? 0) + 1 });
      return next;
    });
  }, []);
  const unregister = useCallback((v: string) => {
    setLabels((m) => {
      const entry = m.get(v);
      if (!entry) return m;
      const next = new Map(m);
      if (entry.count <= 1) next.delete(v);
      else next.set(v, { label: entry.label, count: entry.count - 1 });
      return next;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, setOpen]);

  const ctx = useMemo<MorphContextValue>(
    () => ({
      value: current,
      open,
      setOpen,
      select,
      register,
      unregister,
      labelFor: (v) => (v === undefined ? undefined : labels.get(v)?.label),
      placeholder,
      setPlaceholder,
      reduce,
      layoutId: `${baseId}-surface`,
      triggerId: `${baseId}-trigger`,
      listId: `${baseId}-list`,
      disabled,
      transition,
      radius,
      stagger,
      staggerDelay,
    }),
    [
      current,
      open,
      setOpen,
      select,
      register,
      unregister,
      labels,
      placeholder,
      reduce,
      baseId,
      disabled,
      transition,
      radius,
      stagger,
      staggerDelay,
    ],
  );

  return (
    <MorphContext.Provider value={ctx}>
      <div ref={rootRef} className={cn("relative", className)}>
        {children}
      </div>
    </MorphContext.Provider>
  );
}

export interface MorphSelectValueProps {
  placeholder?: string;
  className?: string;
}

export function MorphSelectValue({
  placeholder,
  className,
}: MorphSelectValueProps) {
  const ctx = useMorphContext("MorphSelectValue");
  // surface the placeholder so the morph header (rendered by content) matches
  useEffect(() => {
    if (placeholder) ctx.setPlaceholder(placeholder);
  }, [placeholder, ctx.setPlaceholder]);
  const label = ctx.labelFor(ctx.value);
  return (
    <span
      className={cn(
        label ? "text-foreground" : "text-muted-foreground",
        className,
      )}
    >
      {label ?? placeholder ?? "Select"}
    </span>
  );
}

export interface MorphSelectTriggerProps {
  className?: string;
  /** Remplace le chevron par défaut (ex. une autre icône). */
  icon?: ReactNode;
  children: ReactNode;
}

export function MorphSelectTrigger({
  className,
  icon,
  children,
}: MorphSelectTriggerProps) {
  const ctx = useMorphContext("MorphSelectTrigger");
  const iconNode = icon ?? <SelectionChevronDownIcon className="h-4 w-4" />;
  return (
    <>
      {/* invisible sizer reserves the closed height (the morph surface is
          absolute, so this keeps surrounding layout from shifting) */}
      <div
        aria-hidden
        // `inert` n'est pas typé par React 18 : posé en attribut brut.
        {...({ inert: "" } as Record<string, unknown>)}
        className={cn(ROW, "invisible rounded-xl border border-border")}
      >
        {children}
        {iconNode}
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {!ctx.open ? (
          <motion.button
            key="trigger"
            layoutId={ctx.layoutId}
            type="button"
            id={ctx.triggerId}
            disabled={ctx.disabled}
            aria-haspopup="listbox"
            aria-expanded={ctx.open}
            aria-controls={ctx.listId}
            onClick={() => ctx.setOpen(true)}
            transition={ctx.reduce ? { duration: 0 } : ctx.transition}
            style={{ borderRadius: ctx.radius }}
            className={cn(
              ROW,
              "absolute inset-x-0 top-0 z-10 border border-border bg-background text-foreground outline-none transition-colors",
              "hover:border-input focus-visible:ring-2 focus-visible:ring-foreground/20",
              "disabled:pointer-events-none disabled:opacity-50",
              className,
            )}
          >
            <motion.span layout="position" className="min-w-0 truncate">
              {children}
            </motion.span>
            <motion.span layout="position" className="text-muted-foreground">
              {iconNode}
            </motion.span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export interface MorphSelectContentProps {
  className?: string;
  /** Classes du bouton d'en-tête (miroir du trigger). */
  headerClassName?: string;
  /** Classes de la liste (`<ul>`). Défaut : `p-1`. */
  listClassName?: string;
  /** Remplace le chevron de l'en-tête (il pivote de 180° à l'ouverture). */
  icon?: ReactNode;
  children: ReactNode;
}

export function MorphSelectContent({
  className,
  headerClassName,
  listClassName,
  icon,
  children,
}: MorphSelectContentProps) {
  const ctx = useMorphContext("MorphSelectContent");
  const label = ctx.labelFor(ctx.value);
  const list: Variants = useMemo(
    () => ({
      hidden: {},
      show: { transition: { staggerChildren: ctx.stagger, delayChildren: ctx.staggerDelay } },
    }),
    [ctx.stagger, ctx.staggerDelay],
  );
  return (
    <>
      {/* always-mounted, hidden — keeps item label registrations alive while
          closed so the trigger shows the selected value before first open */}
      <div className="hidden">{children}</div>

      <AnimatePresence initial={false} mode="popLayout">
        {ctx.open ? (
          <motion.div
            key="panel"
            layoutId={ctx.layoutId}
            id={ctx.listId}
            role="listbox"
            aria-labelledby={ctx.triggerId}
            transition={ctx.reduce ? { duration: 0 } : ctx.transition}
            style={{ borderRadius: ctx.radius }}
            className={cn(
              "absolute inset-x-0 top-0 z-30 overflow-hidden border border-border bg-background shadow-lg",
              className,
            )}
          >
            {/* header mirrors the trigger (continuous morph) and collapses the
                panel back into the trigger when clicked */}
            <motion.button
              type="button"
              layout="position"
              aria-expanded
              onClick={() => ctx.setOpen(false)}
              className={cn(ROW, "outline-none", headerClassName)}
            >
              <span
                className={cn(
                  "min-w-0 truncate",
                  label ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label ?? ctx.placeholder}
              </span>
              <motion.span
                animate={{ rotate: 180 }}
                transition={ctx.reduce ? { duration: 0 } : ctx.transition}
                className="text-muted-foreground"
              >
                {icon ?? <SelectionChevronDownIcon className="h-4 w-4" />}
              </motion.span>
            </motion.button>

            <div className="h-px bg-border" />

            <motion.ul
              initial="hidden"
              animate="show"
              variants={ctx.reduce ? undefined : list}
              className={cn("p-1", listClassName)}
            >
              {children}
            </motion.ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export interface MorphSelectItemProps {
  value: string;
  disabled?: boolean;
  /**
   * Libellé affiché dans le trigger quand l'item est sélectionné. Requis si
   * `children` n'est pas une simple chaîne (sinon `value` est utilisé).
   */
  label?: string;
  /** Remplace la coche affichée sur l'item sélectionné. */
  indicator?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function MorphSelectItem({
  value,
  disabled = false,
  label: labelProp,
  indicator,
  className,
  children,
}: MorphSelectItemProps) {
  const ctx = useMorphContext("MorphSelectItem");
  const selected = ctx.value === value;
  const label = labelProp ?? (typeof children === "string" ? children : value);

  useLayoutEffect(() => {
    ctx.register(value, label);
    return () => ctx.unregister(value);
  }, [ctx.register, ctx.unregister, value, label]);

  return (
    <motion.li variants={ctx.reduce ? undefined : ITEM}>
      <button
        type="button"
        role="option"
        aria-selected={selected}
        disabled={disabled}
        onClick={() => ctx.select(value)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm outline-none transition-colors",
          selected
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:bg-muted",
          "disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
      >
        {children}
        {selected ? (indicator ?? <SelectionCheckIcon className="h-3.5 w-3.5 shrink-0" />) : null}
      </button>
    </motion.li>
  );
}

export default MorphSelect;
