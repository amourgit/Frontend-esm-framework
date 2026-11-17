import * as React from 'react';
import { CheckCircle2Icon, CircleAlertIcon, InfoIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './alert.js';
import { Button } from './button.js';
import { cn } from './cn.js';

type NotificationKind = 'error' | 'info' | 'info-square' | 'success' | 'warning' | 'warning-alt';

type NotificationBannerProps = Omit<React.ComponentProps<'div'>, 'title'> & {
  kind?: NotificationKind | string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Texte du bouton d'action (sans lui, pas de bouton). */
  actionLabel?: string;
  onAction?: () => void;
  /** Croix de fermeture (sans lui, pas de croix). */
  onClose?: () => void;
  closeLabel?: string;
  /** Libellé lu par les lecteurs d'écran pour le type de notification. */
  statusLabel?: string;
};

function variantFor(kind: string | undefined): 'info' | 'success' | 'warning' | 'error' {
  if (kind === 'error') return 'error';
  if (kind === 'success') return 'success';
  if (kind === 'warning' || kind === 'warning-alt') return 'warning';
  return 'info';
}

const ICONS = {
  info: InfoIcon,
  success: CheckCircle2Icon,
  warning: TriangleAlertIcon,
  error: CircleAlertIcon,
} as const;

/** Bandeau de notification : icône d'état, titre, message, action et fermeture optionnels (remplace `InlineNotification` / `ActionableNotification`). */
function NotificationBanner({
  kind,
  title,
  subtitle,
  actionLabel,
  onAction,
  onClose,
  closeLabel = 'Close',
  statusLabel,
  className,
  ...props
}: NotificationBannerProps) {
  const variant = variantFor(kind);
  const titleId = React.useId();
  // Avec une action ou une fermeture, la notification est interactive : boîte de dialogue d'alerte nommée par son titre.
  const interactive = Boolean(actionLabel || onClose);
  const Icon = ICONS[variant];
  return (
    <Alert
      variant={variant}
      data-kind={variant}
      role={interactive ? 'alertdialog' : 'alert'}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : statusLabel}
      className={cn('grid-cols-[auto_1fr_auto] items-center gap-x-3', className)}
      {...props}
    >
      <Icon aria-hidden="true" />
      <div className="col-start-2 min-w-0">
        {title ? <AlertTitle id={titleId}>{title}</AlertTitle> : null}
        {subtitle ? <AlertDescription>{subtitle}</AlertDescription> : null}
      </div>
      <div className="col-start-3 flex items-center gap-1">
        {actionLabel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
        {onClose ? (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label={closeLabel} title={closeLabel}>
            <XIcon aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </Alert>
  );
}

export { NotificationBanner, type NotificationBannerProps, type NotificationKind };
