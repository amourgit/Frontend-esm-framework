import React from 'react';
import type { Meta, StoryObj } from 'storybook-react-rsbuild';
import { ResponsiveWrapper } from './responsive-wrapper.component.js';
import { TextInput } from '../ui/index.js';

const meta: Meta<typeof ResponsiveWrapper> = {
  title: 'Components/ResponsiveWrapper',
  component: ResponsiveWrapper,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Wraps children in a Layer (plain surface) on tablet viewports, providing a light background for form inputs. Use the Layout toolbar to toggle between desktop and tablet.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ResponsiveWrapper>;

export const Default: Story = {
  render: () => (
    <ResponsiveWrapper>
      <TextInput id="example" label="Entity name" placeholder="Enter name" />
    </ResponsiveWrapper>
  ),
};
