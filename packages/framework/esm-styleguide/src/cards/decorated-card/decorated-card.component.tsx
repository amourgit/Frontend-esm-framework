/** @category DecoratedCard */
import React, { forwardRef } from 'react';
import classNames from 'classnames';
import { CornerBrackets, DotsPattern, GradientLines, PlusIcons } from './card-decorations';
import type { CardProps } from './decorated-card.types';
import styles from './decorated-card.module.scss';

/**
 * `DecoratedCard` — carte prête à l'emploi avec 8 traitements décoratifs de
 * bordure (`variant`). Ne pose AUCUNE taille fixe — `width`/`height` ne sont
 * jamais imposées, la carte s'adapte entièrement à son contenu (`children`).
 *
 * Contenu et apparence 100% personnalisables :
 * - `title`/`description`/`children` : n'importe quel `ReactNode`.
 * - `className`/`style` : surcharge du cadre décoratif.
 * - `contentClassName`/`contentStyle` : surcharge du padding interne, sans
 *   toucher à la bordure décorative.
 * - `dotsColor` : couleur des pastilles du variant `'dots'`.
 *
 * @example
 * ```tsx
 * <DecoratedCard variant="lifted" title="Statut du tenant" description="Actif depuis 3 mois">
 *   <StatusBadge status="active" />
 * </DecoratedCard>
 * ```
 */
export const DecoratedCard = forwardRef<HTMLDivElement, CardProps>(
  ({
    variant = 'default',
    size = 'default',
    title,
    description,
    children,
    className,
    style,
    contentClassName,
    contentStyle,
    dotsColor = 'var(--colors-success-500)',
    ...rest
  }, ref) => {
    const content = (
      <div className={classNames(styles.content, contentClassName)} style={contentStyle}>
        {title && <h3 className={styles.title}>{title}</h3>}
        {description && <p className={styles.description}>{description}</p>}
        {children}
      </div>
    );

    const rootClassName = classNames(styles.card, styles[`card--${variant}`], className);

    switch (variant) {
      case 'dots':
        return (
          <div ref={ref} className={rootClassName} style={style} {...rest}>
            <DotsPattern dotsColor={dotsColor} />
            <div className={styles.dotsInner}>{content}</div>
          </div>
        );

      case 'gradient':
        return (
          <div ref={ref} className={rootClassName} style={style} {...rest}>
            <GradientLines />
            <div className={styles.gradientInner}>{content}</div>
          </div>
        );

      case 'inner':
        return (
          <div ref={ref} className={rootClassName} style={style} {...rest}>
            <div className={styles.innerPanel}>{content}</div>
          </div>
        );

      case 'plus':
        return (
          <div ref={ref} className={rootClassName} style={style} {...rest}>
            <PlusIcons />
            {content}
          </div>
        );

      case 'corners':
        return (
          <div ref={ref} className={rootClassName} style={style} {...rest}>
            <CornerBrackets />
            {content}
          </div>
        );

      case 'mirror':
        return (
          <div ref={ref} className={rootClassName} style={style} {...rest}>
            <div className={classNames(styles.mirrorSurface, styles[`mirrorSurface--${size}`])}>{content}</div>
            <div className={styles.mirrorShadow} />
          </div>
        );

      default:
        // 'default', 'neubrutalism', 'lifted' — pas de décoration additionnelle,
        // uniquement le cadre (bordure/ombre) porté par card--{variant}.
        return (
          <div ref={ref} className={rootClassName} style={style} {...rest}>
            {content}
          </div>
        );
    }
  },
);

DecoratedCard.displayName = 'DecoratedCard';

export default DecoratedCard;
