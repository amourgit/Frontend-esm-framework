/** @category Section */
import React, { Children, isValidElement, useCallback, useId, useMemo, useState } from 'react';
import { cn } from '../page-background/page-background.utils.js';
import { DEFAULT_SECTION_LABELS, SectionContext, type SectionContextValue } from './section.context.js';
import { SectionAction } from './section-action.component.js';
import { SectionGrid } from './section-grid.component.js';
import { SectionBody, SectionDivider, SectionFooter, SectionHeader } from './section-parts.component.js';
import type { SectionProps } from './section.types.js';

// =============================================================================
//  SECTION — squelette réutilisable pour toute section de page
//
//    ┌ En-tête ─────────────────────────────────────────────┐
//    │ [icône] Titre  (compteur)               [actions…]  ▾ │
//    │ Description                                          │
//    ├──────────────────── trait fin ───────────────────────┤  ← 1 px, opacité réduite
//    │ Corps : contenu libre (SectionGrid, liste, carte...) │
//    ├──────────────────── trait fin ───────────────────────┤
//    │ Pied : contenu                              [actions] │
//    └──────────────────────────────────────────────────────┘
//
//  Aucune bordure, aucun fond par défaut : la section est posée directement
//  sur le fond de page. Tout est optionnel et configurable (voir le guide
//  d'utilisation en bas de fichier).
// =============================================================================

const TONE_ON_LIGHT = '[--section-fg:#0f172a] [--section-muted:rgba(15,23,42,0.62)] [--section-line:rgba(15,23,42,0.14)]';

const VARIANT: Record<NonNullable<SectionProps['variant']>, string> = {
  plain: '',
  glass: 'rounded-2xl p-5 backdrop-blur-xl ring-1 ring-inset ring-(--section-line,rgba(255,255,255,0.12))',
};
const GLASS_FILL = { onDark: 'bg-black/40', onLight: 'bg-white/70' } as const;

const PART_TYPES = new Set<unknown>([SectionHeader, SectionBody, SectionFooter]);

function isPresent(node: React.ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== '';
}

function SectionRoot({
  id,
  as: Root = 'section',
  ariaLabel,
  variant = 'plain',
  tone = 'onDark',
  density = 'comfortable',
  title,
  titleAs,
  titleSize,
  icon,
  description,
  count,
  actions,
  header,
  headerLayout = 'split',
  divider = true,
  footer,
  footerActions,
  footerLayout = 'between',
  footerDivider = true,
  bodyMaxHeight,
  bodyFlush,
  collapsible = false,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  labels,
  className,
  classNames = {},
  children,
}: SectionProps) {
  const reactId = useId();
  const headingId = `${reactId}-title`;
  const bodyId = `${reactId}-body`;

  const [innerCollapsed, setInnerCollapsed] = useState(defaultCollapsed);
  const collapsed = collapsible && (collapsedProp ?? innerCollapsed);
  const toggle = useCallback(() => {
    const next = !collapsed;
    if (collapsedProp === undefined) {
      setInnerCollapsed(next);
    }
    onCollapsedChange?.(next);
  }, [collapsed, collapsedProp, onCollapsedChange]);

  const hasTitle = isPresent(title);
  const labelsValue = useMemo(() => ({ ...DEFAULT_SECTION_LABELS, ...labels }), [labels]);
  const ctx = useMemo<SectionContextValue>(
    () => ({
      tone,
      density,
      classNames,
      labels: labelsValue,
      headerLayout,
      footerLayout,
      divider,
      footerDivider,
      collapsible,
      collapsed,
      toggle,
      headingId: hasTitle ? headingId : undefined,
      bodyId,
    }),
    [
      tone,
      density,
      classNames,
      labelsValue,
      headerLayout,
      footerLayout,
      divider,
      footerDivider,
      collapsible,
      collapsed,
      toggle,
      hasTitle,
      headingId,
      bodyId,
    ],
  );

  const hasHeader =
    hasTitle ||
    isPresent(description) ||
    isPresent(actions) ||
    isPresent(icon) ||
    isPresent(header) ||
    (count !== undefined && count !== null && count !== '') ||
    collapsible;
  const hasFooter = isPresent(footer) || isPresent(footerActions);
  const hasBody = isPresent(children);
  const composed = Children.toArray(children).some((child) => isValidElement(child) && PART_TYPES.has(child.type));

  return (
    <SectionContext.Provider value={ctx}>
      <Root
        id={id}
        aria-label={ariaLabel}
        aria-labelledby={!ariaLabel && hasTitle ? headingId : undefined}
        data-section-variant={variant}
        className={cn(
          'relative flex w-full min-w-0 flex-col text-(--section-fg,#fff)',
          tone === 'onLight' && TONE_ON_LIGHT,
          VARIANT[variant],
          variant === 'glass' && GLASS_FILL[tone],
          className,
          classNames.root,
        )}
      >
        {hasHeader ? (
          <SectionHeader
            title={title}
            titleAs={titleAs}
            titleSize={titleSize}
            icon={icon}
            description={description}
            count={count}
            actions={actions}
          >
            {header}
          </SectionHeader>
        ) : null}
        {hasBody ? (
          composed ? (
            children
          ) : (
            <SectionBody flush={bodyFlush} maxHeight={bodyMaxHeight}>
              {children}
            </SectionBody>
          )
        ) : null}
        {hasFooter ? <SectionFooter actions={footerActions}>{footer}</SectionFooter> : null}
      </Root>
    </SectionContext.Provider>
  );
}

/**
 * `Section` — squelette en-tête / corps / pied. Les parties sont aussi
 * disponibles en statiques : `Section.Header`, `Section.Body`, `Section.Footer`,
 * `Section.Divider`, `Section.Action`, `Section.Grid`.
 */
export const Section = Object.assign(SectionRoot, {
  Header: SectionHeader,
  Body: SectionBody,
  Footer: SectionFooter,
  Divider: SectionDivider,
  Action: SectionAction,
  Grid: SectionGrid,
});

/* ============================================================================
 *  GUIDE D'UTILISATION — Section
 * ============================================================================
 *  Cas courant — raccourcis `title` / `actions` / `footer` :
 *
 *    <Section
 *      title="Actualités"
 *      count={8}
 *      actions={<SectionAction onClick={...}>Voir tout</SectionAction>}
 *      footer="6 articles sur 8"
 *      footerActions={<SectionAction size="sm" href="/informations/news">Tout lire →</SectionAction>}
 *    >
 *      <SectionGrid minItemWidth="16rem" gap="lg">{cards}</SectionGrid>
 *    </Section>
 *
 *  Filtres dans l'en-tête (plusieurs SectionAction avec `active`) :
 *
 *    <Section title="Annonces" actions={levels.map((l) => (
 *      <SectionAction key={l} size="sm" active={l === level} onClick={() => setLevel(l)}>{l}</SectionAction>
 *    ))}>…</Section>
 *
 *  Disposition de l'en-tête / du pied :
 *
 *    <Section headerLayout="stacked" footerLayout="center" …>
 *
 *  En-tête libre (remplace titre + description + actions) :
 *
 *    <Section header={<MyToolbar />}>…</Section>
 *
 *  Composition manuelle — dès qu'un enfant est une partie, rien n'est
 *  enveloppé automatiquement, vous placez chaque partie où vous voulez :
 *
 *    <Section ariaLabel="Équipe" collapsible>
 *      <Section.Header title="Équipe" actions={…} />
 *      <Section.Body maxHeight="20rem">…</Section.Body>
 *      <Section.Footer layout="end">…</Section.Footer>
 *    </Section>
 *
 *  Repli : `collapsible` (+ `defaultCollapsed`, ou `collapsed` /
 *  `onCollapsedChange` en mode contrôlé). Un `Section` replié ne montre que
 *  son en-tête.
 *
 *  Personnalisation fine :
 *    - `classNames={{ title: '…', divider: '…', body: '…' }}` pour chaque partie ;
 *    - variables CSS `--section-fg`, `--section-muted`, `--section-line`,
 *      `--section-accent` (via `style` ou une classe) ;
 *    - `tone="onLight"` pour un fond clair, `variant="glass"` pour un panneau
 *      vitré, `density="compact" | "spacious"` pour les espacements.
 *
 *  Sans trait : `divider={false}` (sous l'en-tête) / `footerDivider={false}`.
 * ==========================================================================*/
