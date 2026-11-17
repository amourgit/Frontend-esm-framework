import React from 'react';
import { NotificationBanner } from '../ui/index.js';
/** @module @category UI */

export interface NotificationProps {
  notification: InlineNotificationMeta;
}

export interface NotificationDescriptor {
  description: string;
  action?: string;
  kind?: InlineNotificationType;
  critical?: boolean;
  millis?: number;
  title?: string;
  onAction?: () => void;
}

export interface InlineNotificationMeta extends NotificationDescriptor {
  id: number;
}

export type InlineNotificationType = 'error' | 'info' | 'info-square' | 'success' | 'warning' | 'warning-alt';

export const Notification: React.FC<NotificationProps> = ({ notification }) => {
  const { description, action, kind, critical, title, onAction } = notification;

  return (
    <NotificationBanner
      kind={kind || 'info'}
      title={title || undefined}
      subtitle={description}
      actionLabel={action}
      onAction={onAction}
    />
  );
};
