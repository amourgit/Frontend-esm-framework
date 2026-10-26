/** @category Section */
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../page-background/page-background.utils.js';
import { useSectionContext } from './section.context.js';
import type {
  SectionBodyProps,
  SectionDensity,
  SectionFooterLayout,
  SectionFooterProps,
  SectionHeaderLayout,
  SectionHeaderProps,
  SectionTitleSize,
} from './section.types.js';

// =============================================================================
//  Parties du squelette Section : SectionDivider, SectionHeader, SectionBody,
//  SectionFooter. Chacune lit la configuration de son `Section` parent (ton,
//  densité, dispositions, classNames) et reste utilisable seule.
//
//  Couleurs : variables CSS surchargeables (valeurs par défaut pour un fond
//  sombre) — `--section-fg`, `--section-muted`, `--section-line`,
//  `--section-accent`. Le texte reste clair quel que soit le thème, car le fond
//  de page (PageBackground) est toujours sombre.
// =============================================================================

/** Durée du repli — doit rester alignée sur `duration-300` du corps. */
const COLLAPSE_MS = 320;

const HEADER_PAD: Record<SectionDensity, string> = {
  compact: 'pb-2',
  comfortable: 'pb-3',
  spacious: 'pb-4',
};
const BODY_PAD: Record<SectionDensity, string> = {
  compact: 'pt-3',
  comfortable: 'pt-4',
  spacious: 'pt-6',
};
const FOOTER_GAP: Record<SectionDensity, string> = {
  compact: 'mt-3',
  comfortable: 'mt-4',
  spacious: 'mt-6',
};
const FOOTER_PAD: Record<SectionDensity, string> = {
  compact: 'pt-2',
  comfortable: 'pt-3',
  spacious: 'pt-4',
};

const TITLE_SIZE: Record<SectionTitleSize, string> = {
  sm: 'text-base font-medium leading-snug',
  md: 'text-xl font-light leading-tight sm:text-2xl',
  lg: 'text-2xl font-light leading-tight sm:text-3xl',
};

const HEADER_ROW: Record<SectionHeaderLayout, string> = {
  split: 'flex-wrap items-center justify-between',
  stacked: 'flex-col items-start',
  centered: 'flex-col items-center text-center',
};
const HEADER_ACTIONS: Record<SectionHeaderLayout, string> = {
  split: 'ml-auto justify-end',
  stacked: 'justify-start',
  centered: 'justify-center',
};
const FOOTER_JUSTIFY: Record<SectionFooterLayout, string> = {
  between: 'justify-between',
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
};

/** Trait fin pleine largeur, légèrement visible : ni bordure ni fond. */
export function SectionDivider({ className }: { className?: string }) {
  const { classNames } = useSectionContext();
  return (
    <div
      role="presentation"
      aria-hidden="true"
      data-section-part="divider"
      className={cn('h-px w-full shrink-0 bg-(--section-line,rgba(255,255,255,0.12))', classNames.divider, className)}
    />
  );
}

function CollapseToggle() {
  const { collapsed, toggle, labels, bodyId } = useSectionContext();
  const label = collapsed ? labels.expand : labels.collapse;
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-expanded={!collapsed}
      aria-controls={bodyId}
      className={cn(
        'inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 p-0',
        'bg-transparent text-(--section-muted,rgba(255,255,255,0.65)) outline-none transition-colors duration-150',
        'hover:bg-(--section-fg,#fff)/10 hover:text-(--section-fg,#fff)',
        'focus-visible:ring-2 focus-visible:ring-(--section-accent,#34d399)/70',
      )}
    >
      <svg
        viewBox="0 0 16 16"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={cn('transition-transform duration-300 motion-reduce:transition-none', !collapsed && 'rotate-180')}
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    </button>
  );
}

/** En-tête : titre à gauche, actions à droite (disposition par défaut), puis trait fin. */
export function SectionHeader({
  title,
  titleAs = 'h2',
  titleSize = 'md',
  icon,
  description,
  count,
  actions,
  children,
  layout,
  divider,
  className,
}: SectionHeaderProps) {
  const ctx = useSectionContext();
  const { classNames, density, collapsible } = ctx;
  const resolvedLayout = layout ?? ctx.headerLayout;
  const showDivider = divider ?? ctx.divider;
  const TitleTag = titleAs;
  const hasCount = count !== undefined && count !== null && count !== '';
  const hasActions = actions !== undefined && actions !== null && actions !== false;

  return (
    <div data-section-part="header" className={cn('flex flex-col', classNames.header, className)}>
      <div className={cn('flex gap-x-4 gap-y-2', HEADER_ROW[resolvedLayout], HEADER_PAD[density])}>
        {children !== undefined && children !== null ? (
          <div className="min-w-0 flex-1">{children}</div>
        ) : (
          <div
            className={cn(
              'flex min-w-0 flex-col gap-1',
              resolvedLayout === 'split' && 'flex-1 basis-48',
              classNames.heading,
            )}
          >
            <div className={cn('flex min-w-0 items-center gap-2.5', resolvedLayout === 'centered' && 'justify-center')}>
              {icon ? (
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center text-(--section-accent,#34d399)',
                    classNames.leading,
                  )}
                >
                  {icon}
                </span>
              ) : null}
              {title ? (
                <TitleTag
                  id={ctx.headingId}
                  className={cn(
                    'm-0 min-w-0 text-balance tracking-tight text-(--section-fg,#fff)',
                    TITLE_SIZE[titleSize],
                    classNames.title,
                  )}
                >
                  {title}
                </TitleTag>
              ) : null}
              {hasCount ? (
                <span
                  className={cn(
                    'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5',
                    'bg-(--section-fg,#fff)/10 text-[11px] font-medium leading-none text-(--section-muted,rgba(255,255,255,0.65))',
                    classNames.count,
                  )}
                >
                  {count}
                </span>
              ) : null}
            </div>
            {description ? (
              <p
                className={cn(
                  'm-0 max-w-3xl text-sm leading-relaxed text-(--section-muted,rgba(255,255,255,0.65))',
                  classNames.description,
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
        )}

        {hasActions || collapsible ? (
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5',
              HEADER_ACTIONS[resolvedLayout],
              children !== undefined && children !== null && resolvedLayout === 'split' && 'shrink-0',
              classNames.actions,
            )}
          >
            {actions}
            {collapsible ? <CollapseToggle /> : null}
          </div>
        ) : null}
      </div>
      {showDivider ? <SectionDivider /> : null}
    </div>
  );
}

/** Corps : contenu libre, repliable avec le `Section` parent. */
export function SectionBody({ children, flush = false, maxHeight, className }: SectionBodyProps) {
  const { classNames, density, collapsible, collapsed, bodyId } = useSectionContext();

  // `overflow: hidden` n'est posé que pendant l'animation de repli et quand le
  // corps est replié : en régime établi il reste visible, pour ne pas rogner
  // ombres, anneaux de focus ni effets de survol des cartes.
  const [clip, setClip] = useState(collapsed);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return undefined;
    }
    setClip(true);
    const timer = setTimeout(() => setClip(collapsed), COLLAPSE_MS);
    return () => clearTimeout(timer);
  }, [collapsed]);

  const content = (
    <div
      data-section-part="body"
      className={cn(
        'min-w-0',
        !flush && BODY_PAD[density],
        maxHeight && 'overflow-y-auto overscroll-contain',
        classNames.body,
        className,
      )}
      style={maxHeight ? { maxHeight } : undefined}
    >
      {children}
    </div>
  );

  if (!collapsible) {
    return <div id={bodyId}>{content}</div>;
  }

  return (
    <div
      id={bodyId}
      aria-hidden={collapsed || undefined}
      // `inert` : le contenu replié n'est ni focusable ni lu (attribut natif, absent des types React 18).
      {...(collapsed ? ({ inert: '' } as Record<string, unknown>) : {})}
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
        collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
      )}
    >
      <div className={cn('min-h-0', clip && 'overflow-hidden')}>{content}</div>
    </div>
  );
}

/** Pied : contenu à gauche, actions à droite (disposition par défaut), précédé d'un trait fin. */
export function SectionFooter({ children, actions, layout, divider, className }: SectionFooterProps) {
  const ctx = useSectionContext();
  const { classNames, density, collapsible, collapsed } = ctx;
  const resolvedLayout = layout ?? ctx.footerLayout;
  const showDivider = divider ?? ctx.footerDivider;
  const hasChildren = children !== undefined && children !== null && children !== false;
  const hasActions = actions !== undefined && actions !== null && actions !== false;

  // Un `Section` replié ne montre que son en-tête.
  if (collapsible && collapsed) {
    return null;
  }

  return (
    <div data-section-part="footer" className={cn('flex flex-col', FOOTER_GAP[density], classNames.footer, className)}>
      {showDivider ? <SectionDivider /> : null}
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-(--section-muted,rgba(255,255,255,0.65))',
          FOOTER_PAD[density],
          FOOTER_JUSTIFY[resolvedLayout],
        )}
      >
        {hasChildren ? <div className={cn('min-w-0', classNames.footerStart)}>{children}</div> : null}
        {hasActions ? (
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5',
              resolvedLayout === 'between' && 'ml-auto',
              classNames.footerEnd,
            )}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
