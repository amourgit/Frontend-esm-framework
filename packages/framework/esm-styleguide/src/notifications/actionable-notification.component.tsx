import React, { useState } from 'react';
import { getCoreTranslation } from '@egen-civitas/esm-translations';
import { NotificationBanner } from '../ui/index.js';
/** @module @category UI */

export interface ActionableNotificationProps {
  notification: ActionableNotificationMeta;
}

export interface ActionableNotificationDescriptor {
  actionButtonLabel: string;
  onActionButtonClick(): void;
  onClose?(): void;
  subtitle: string;
  title?: string;
  kind?: ActionableNotificationType | string;
  critical?: boolean;
  progressActionLabel?: string;
}

export interface ActionableNotificationMeta extends ActionableNotificationDescriptor {
  id: number;
}

export type ActionableNotificationType = 'error' | 'info' | 'info-square' | 'success' | 'warning' | 'warning-alt';

export const ActionableNotificationComponent: React.FC<ActionableNotificationProps> = ({ notification }) => {
  const {
    actionButtonLabel,
    onActionButtonClick = () => {},
    subtitle,
    kind,
    title,
    critical: _critical,
    progressActionLabel,
    id,
    ...props
  } = notification;

  const [actionText, setActionText] = useState(actionButtonLabel);

  const handleActionClick = () => {
    onActionButtonClick();
    if (progressActionLabel) {
      setActionText(progressActionLabel);
    }
  };

  return (
    <NotificationBanner
      kind={(kind as ActionableNotificationType) || 'info'}
      actionLabel={actionText}
      onAction={handleActionClick}
      statusLabel={getCoreTranslation('actionableNotification', 'Actionable notification')}
      subtitle={subtitle}
      title={title}
      {...props}
    />
  );
};
