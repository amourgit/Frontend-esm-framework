/** @module @category UI */
import React, { useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import classNames from 'classnames';
import { CloseIcon } from '../icons';
import { LiquidGlassCard } from '../glass-card';
import { toastKindConfig } from './toast-kind.config';
import { ToastProgressBar } from './toast-progress-bar.component';
import type { ToastAction, ToastProps } from './toast.types';
import styles from './toast.module.scss';

export type { ToastAction, ToastVariant, ToastProps, ToastDescriptor, ToastNotificationMeta, ToastType } from './toast.types';

/**
 * `Toast` — présentation d'une notification unique. Reçoit `{ toast, closeToast }`
 * exactement comme avant (voir `ActiveToasts`, dont l'abonnement RxJS et la
 * logique de dédoublonnage ne changent pas) — seul le rendu visuel change.
 *
 * Design "verre liquide" (`LiquidGlassCard`) avec 3 variantes, choisies via
 * `toast.variant` :
 * - `'default'` (implicite) : barre de progression = compte à rebours avant
 *   fermeture automatique (`duration`, 4000ms par défaut si aucune action).
 * - `'transfer'` : barre de progression = valeur réelle (`toast.progress`,
 *   0-100), pour un transfert/téléversement en cours. Ferme automatiquement
 *   ~1,2s après avoir atteint 100.
 * - `'actions'` : une ou plusieurs commandes (`toast.actions`), chacune avec
 *   son propre style et son propre comportement de fermeture.
 *
 * Tout le contenu textuel (`title`, `description`, `eyebrow`, libellés des
 * actions) est entièrement fourni par l'appelant, quelle que soit la variante.
 */
export const Toast: React.FC<ToastProps> = ({ toast, closeToast }) => {
  const {
    description,
    kind = 'info',
    critical,
    title,
    actionButtonLabel,
    onActionButtonClick,
    variant = 'default',
    eyebrow,
    progress,
    actions,
    duration,
    toastKey: _toastKey, // consommé par ActiveToasts pour le dédoublonnage, pas par l'affichage
  } = toast;

  const config = toastKindConfig[kind];
  const Icon = config.icon;
  const colorVar = `var(--colors-${config.colorToken}-500)`;

  // ── Actions effectives : `actions` (nouveau) prime, sinon on retombe sur le
  //    couple historique actionButtonLabel/onActionButtonClick (compatibilité totale). ──
  const effectiveActions: ToastAction[] = useMemo(() => {
    if (actions?.length) {
      return actions;
    }
    if (actionButtonLabel && onActionButtonClick) {
      return [{ label: actionButtonLabel, onClick: onActionButtonClick, kind: 'primary' }];
    }
    return [];
  }, [actions, actionButtonLabel, onActionButtonClick]);

  const handleActionClick = useCallback(
    (action: ToastAction) => {
      action.onClick();
      if (action.closeOnClick !== false) {
        closeToast();
      }
    },
    [closeToast],
  );

  // ── Auto-fermeture ──────────────────────────────────────────────────────────
  // 'default' sans action : 4000ms par défaut (comportement du design source).
  // 'default' avec action(s) : pas d'auto-fermeture par défaut (laisse le temps de cliquer).
  // 'transfer' : pas d'auto-fermeture tant que progress < 100.
  // 'actions' : jamais d'auto-fermeture par défaut.
  const effectiveDuration =
    duration ?? (variant === 'default' && effectiveActions.length === 0 ? 4000 : undefined);

  useEffect(() => {
    if (variant === 'transfer') {
      if ((progress ?? 0) >= 100) {
        const timer = setTimeout(closeToast, 1200);
        return () => clearTimeout(timer);
      }
      return;
    }
    if (effectiveDuration) {
      const timer = setTimeout(closeToast, effectiveDuration);
      return () => clearTimeout(timer);
    }
  }, [variant, progress, effectiveDuration, closeToast]);

  const eyebrowText = eyebrow ?? config.defaultEyebrow;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -15, scale: 0.95, filter: 'blur(2px)', transition: { duration: 0.18 } }}
      layout
      className={styles.wrapper}
    >
      <LiquidGlassCard
        blurIntensity="xl"
        glowIntensity={critical ? 'lg' : 'sm'}
        shadowIntensity="md"
        borderRadius="var(--border-radius-lg)"
        className={classNames(styles.card, styles[`card--${config.colorToken}`])}
      >
        <div className={styles.body}>
          <Icon className={styles.icon} size={20} />

          <div className={styles.textArea}>
            <span className={styles.eyebrow}>{eyebrowText}</span>
            {title && <p className={styles.title}>{title}</p>}
            <div className={styles.description}>{description}</div>
          </div>

          <button type="button" onClick={closeToast} className={styles.closeButton} aria-label="Fermer">
            <CloseIcon size={14} />
          </button>
        </div>

        {effectiveActions.length > 0 && (
          <div className={styles.actionsRow}>
            {effectiveActions.map((action, index) => (
              <button
                key={action.id ?? index}
                type="button"
                className={classNames(styles.actionButton, styles[`actionButton--${action.kind ?? 'primary'}`])}
                onClick={() => handleActionClick(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {variant === 'transfer' ? (
          <ToastProgressBar colorVar={colorVar} mode="progress" value={progress} />
        ) : (
          effectiveDuration && <ToastProgressBar colorVar={colorVar} mode="countdown" durationMs={effectiveDuration} />
        )}
      </LiquidGlassCard>
    </motion.div>
  );
};
