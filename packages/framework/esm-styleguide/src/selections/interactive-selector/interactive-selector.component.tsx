/** @category InteractiveSelector */
import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import type { InteractiveSelectorProps } from './interactive-selector.types';
import styles from './interactive-selector.module.scss';

/**
 * `InteractiveSelector` — sélecteur à panneaux qui s'étirent au clic : un
 * seul panneau "actif" à la fois (image nette, étiquette icône+titre+
 * description visible, 7 parts de flex), les autres réduits à un simple
 * bandeau (1 part de flex, image assombrie/zoomée, étiquette masquée).
 *
 * Comportement repris à l'identique du composant source :
 * - entrée en cascade des panneaux au montage (décalage de 180ms par index,
 *   annulé au démontage) ;
 * - transition `flex`/`box-shadow`/`background-size`/... en 700ms
 *   ease-in-out sur chaque panneau au changement de sélection.
 *
 * Entièrement générique : ni les options (image/titre/description/icône) ni
 * le texte d'en-tête ne sont figés dans le composant — tout vient des props
 * (voir `InteractiveSelectorProps`). Ajout par rapport au composant source :
 * navigation clavier (les panneaux sont des boutons, `Entrée`/`Espace`
 * sélectionnent) — aucun changement visuel, uniquement un manque
 * d'accessibilité comblé pour un composant destiné à être partagé entre
 * plusieurs apps.
 *
 * @example
 * ```tsx
 * <InteractiveSelector
 *   title="Escape in Style"
 *   subtitle="Discover luxurious camping experiences in nature's most breathtaking spots."
 *   options={[
 *     { title: 'Luxury Tent', description: 'Cozy glamping under the stars', image: '/tent.jpg', icon: <TentIcon /> },
 *   ]}
 * />
 * ```
 */
export function InteractiveSelector({
  options,
  defaultActiveIndex = 0,
  onChange,
  title,
  subtitle,
  className,
  style,
}: InteractiveSelectorProps) {
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);
  const [animatedOptions, setAnimatedOptions] = useState<number[]>([]);

  const handleOptionClick = (index: number) => {
    if (index !== activeIndex) {
      setActiveIndex(index);
      onChange?.(index);
    }
  };

  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    options.forEach((_, i) => {
      const timer = setTimeout(() => {
        setAnimatedOptions((previous) => [...previous, i]);
      }, 180 * i);
      timers.push(timer);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
    // Entrée en cascade jouée une seule fois, au montage — comme le composant source.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={classNames(styles.root, className)} style={style}>
      {(title || subtitle) && (
        <div className={styles.header}>
          {title && <h1 className={classNames(styles.title, styles.fadeInTop, styles.delay300)}>{title}</h1>}
          {subtitle && <p className={classNames(styles.subtitle, styles.fadeInTop, styles.delay600)}>{subtitle}</p>}
        </div>
      )}

      <div className={styles.spacer} />

      <div className={styles.options}>
        {options.map((option, index) => {
          const isActive = activeIndex === index;
          const isAnimatedIn = animatedOptions.includes(index);

          return (
            <div
              key={index}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              aria-label={option.title}
              className={styles.option}
              style={{
                backgroundImage: `url('${option.image}')`,
                backgroundSize: isActive ? 'auto 100%' : 'auto 120%',
                opacity: isAnimatedIn ? 1 : 0,
                transform: isAnimatedIn ? 'translateX(0)' : 'translateX(-60px)',
                borderColor: isActive ? 'var(--colors-on-primary)' : 'var(--colors-neutral-800)',
                boxShadow: isActive
                  ? '0 20px 60px color-mix(in srgb, var(--colors-neutral-950) 50%, transparent)'
                  : '0 10px 30px color-mix(in srgb, var(--colors-neutral-950) 30%, transparent)',
                flex: isActive ? '7 1 0%' : '1 1 0%',
                zIndex: isActive ? 10 : 1,
              }}
              onClick={() => handleOptionClick(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleOptionClick(index);
                }
              }}
            >
              <div
                className={styles.shadowOverlay}
                style={{
                  bottom: isActive ? '0' : '-40px',
                  boxShadow: isActive
                    ? 'inset 0 -120px 120px -120px var(--colors-neutral-950), inset 0 -120px 120px -80px var(--colors-neutral-950)'
                    : 'inset 0 -120px 0px -120px var(--colors-neutral-950), inset 0 -120px 0px -80px var(--colors-neutral-950)',
                }}
              />

              <div className={styles.label}>
                <div className={styles.iconBadge}>{option.icon}</div>
                <div className={styles.info}>
                  <div
                    className={styles.optionTitle}
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? 'translateX(0)' : 'translateX(25px)',
                    }}
                  >
                    {option.title}
                  </div>
                  <div
                    className={styles.optionDescription}
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? 'translateX(0)' : 'translateX(25px)',
                    }}
                  >
                    {option.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default InteractiveSelector;
