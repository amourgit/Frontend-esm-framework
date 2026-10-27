import React from 'react';
import type { Meta, StoryObj } from 'storybook-react-rsbuild';
import { ActionableNotificationComponent } from './actionable-notification.component.js';

const meta: Meta<typeof ActionableNotificationComponent> = {
  title: 'Components/ActionableNotification',
  component: ActionableNotificationComponent,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof ActionableNotificationComponent>;

export const Default: Story = {
  args: {
    notification: {
      id: 1,
      title: 'Documents',
      subtitle: 'No documents have been recorded for this entity.',
      actionButtonLabel: 'Record documents',
      onActionButtonClick: () => {},
    },
  },
};

export const WithProgressLabel: Story = {
  args: {
    notification: {
      id: 2,
      title: 'Session ended',
      subtitle: 'The current session has been ended.',
      actionButtonLabel: 'Undo',
      progressActionLabel: 'Undoing...',
      onActionButtonClick: () => {},
    },
  },
};

export const ErrorKind: Story = {
  args: {
    notification: {
      id: 3,
      title: 'Error',
      subtitle: 'Failed to submit the form. Please try again.',
      kind: 'error',
      actionButtonLabel: 'Retry',
      onActionButtonClick: () => {},
    },
  },
};
