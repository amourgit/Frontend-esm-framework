/** @category Content Section */
import React from 'react';
import styles from './content-section.module.scss';

export interface ContentSectionProps {
  /** Identifiant HTML de la section (ancre, `aria-labelledby`...). */
  id?: string;
  /** Balise racine du composant. @default 'section' */
  as?: 'section' | 'div' | 'aside';
  /** Habillage visuel. @default 'transparent' */
  variant?: 'transparent' | 'panel';
  /** Titre de la section. Omis (avec description et actions) : aucun en-tête n'est rendu. */
  title?: React.ReactNode;
  /** Niveau de titre HTML. @default 'h2' */
  titleAs?: 'h2' | 'h3';
  /** Texte ou contenu descriptif sous le titre. */
  description?: React.ReactNode;
  /** Contenu aligné à droite du titre (bouton « Voir tout », filtre...). */
  actions?: React.ReactNode;
  /** Libellé d'accessibilité, si le titre visuel ne suffit pas à décrire la section. */
  ariaLabel?: string;
  /** Retire le padding et l'habillage du variant `panel`. @default false */
  bare?: boolean;
  /** Classe additionnelle sur la racine. */
  className?: string;
  children?: React.ReactNode;
}

/**
 * Squelette réutilisable pour une section de contenu de page : un titre
 * optionnel, une description optionnelle, un slot d'actions optionnel
 * (ex. « Voir tout ») et une zone de contenu libre.
 *
 * Factorise le motif titre/description/actions/contenu que chaque section
 * d'une page réécrivait à la main. Entièrement personnalisable :
 * - `as` change la balise racine (`section` par défaut, `div`/`aside` pour une
 *   zone qui n'est pas sémantiquement une section de page, ex. un panneau latéral).
 * - `variant` change l'habillage : `transparent` (par défaut, posé directement
 *   sur le fond de la page) ou `panel` (carte vitrée).
 * - `titleAs` change le niveau de titre HTML (`h2` par défaut).
 * - `actions` reçoit n'importe quel contenu (bouton, lien, menu...), aligné
 *   à droite du titre.
 * - `bare` retire le padding et l'habillage du variant `panel`, pour les
 *   sections qui gèrent elles-mêmes leur mise en page interne.
 */
export function ContentSection({
  id,
  as = 'section',
  variant = 'transparent',
  title,
  titleAs = 'h2',
  description,
  actions,
  ariaLabel,
  bare = false,
  className,
  children,
}: ContentSectionProps) {
  const Root = as;
  const TitleTag = titleAs;
  const hasHeader = Boolean(title || description || actions);

  return (
    <Root
      id={id}
      aria-label={ariaLabel}
      className={[
        styles.root,
        variant === 'panel' ? styles.panel : styles.transparent,
        bare && variant === 'panel' ? styles.bare : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {hasHeader && (
        <div className={styles.header}>
          <div className={styles.headerText}>
            {title && <TitleTag className={styles.title}>{title}</TitleTag>}
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      <div className={styles.body}>{children}</div>
    </Root>
  );
}

/* ============================================================================
 *  GUIDE D'UTILISATION — ContentSection
 * ============================================================================
 *  Section simple, posée sur le fond de la page :
 *
 *    <ContentSection title="À la une">
 *      <HeroMosaic mainTile={...} secondaryTiles={...} onSelectTile={...} />
 *    </ContentSection>
 *
 *  Section avec description et action à droite :
 *
 *    <ContentSection
 *      title="Actualités"
 *      description="Les dernières publications de l'organisation."
 *      actions={<button onClick={...}>Voir tout</button>}
 *    >
 *      <BlogSection articles={articles} />
 *    </ContentSection>
 *
 *  Carte vitrée (panneau latéral) :
 *
 *    <ContentSection as="div" variant="panel" title="Raccourcis" bare>
 *      <QuickLinks items={items} onSelectItem={...} />
 *    </ContentSection>
 *
 *  Omettre `title`, `description` et `actions` rend uniquement le conteneur et
 *  son contenu, sans en-tête — utile quand le composant enfant affiche déjà
 *  son propre titre (cas de TeamCalendar et DocumentList).
 * ==========================================================================*/
