import React from 'react';
import type { Meta, StoryObj } from 'storybook-react-rsbuild';
import { CardHeader } from './card-header.component.js';
import { AddIcon } from '../icons/index.js';
import { Button } from '../ui/index.js';

const meta: Meta<typeof CardHeader> = {
  title: 'Components/CardHeader',
  component: CardHeader,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CardHeader>;

export const Default: Story = {
  args: {
    title: 'Metrics',
  },
};

export const WithAction: Story = {
  args: {
    title: 'Documents',
  },
  render: (args) => (
    <CardHeader {...args}>
      <Button variant="ghost">
        <AddIcon size={16} aria-hidden="true" />
        Add
      </Button>
    </CardHeader>
  ),
};
