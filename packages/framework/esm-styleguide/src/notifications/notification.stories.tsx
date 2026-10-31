import React from 'react';
import type { Meta, StoryObj } from 'storybook-react-rsbuild';
import { Notification } from './notification.component.js';

const notificationMeta: Meta<typeof Notification> = {
  title: 'Components/Notification',
  component: Notification,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default notificationMeta;
type NotificationStory = StoryObj<typeof Notification>;

export const Info: NotificationStory = {
  args: {
    notification: {
      id: 1,
      title: 'Note',
      description: 'This entity has an active session.',
      kind: 'info',
    },
  },
};

export const Error: NotificationStory = {
  args: {
    notification: {
      id: 2,
      title: 'Error',
      description: 'Failed to load entity data.',
      kind: 'error',
    },
  },
};

export const Warning: NotificationStory = {
  args: {
    notification: {
      id: 3,
      title: 'Warning',
      description: 'This form has unsaved changes.',
      kind: 'warning',
    },
  },
};

export const WithAction: NotificationStory = {
  args: {
    notification: {
      id: 4,
      title: 'Documents',
      description: 'No documents have been recorded for this entity.',
      kind: 'info',
      action: 'Record documents',
    },
  },
};
