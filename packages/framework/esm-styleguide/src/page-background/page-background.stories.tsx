import React from 'react';
import type { Meta, StoryObj } from 'storybook-react-rsbuild';
import { AnimatedHomeBackground } from './page-background.component.js';
import { GradientWave } from './gradient-wave.component.js';

const meta: Meta<typeof GradientWave> = {
  title: 'Components/PageBackground/GradientWave',
  component: GradientWave,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof GradientWave>;

export const Default: Story = {
  render: (args) => (
    <div className="relative h-96 w-full overflow-hidden rounded-xl!">
      <GradientWave {...args} />
    </div>
  ),
};

export const CustomPalette: Story = {
  render: (args) => (
    <div className="relative h-96 w-full overflow-hidden rounded-xl!">
      <GradientWave {...args} />
    </div>
  ),
  args: {
    colors: ['#4f46e5', '#a5b4fc', '#0ea5e9'],
    darkenTop: true,
  },
};

export const FullPageAnimatedBackground: StoryObj<typeof AnimatedHomeBackground> = {
  render: () => (
    // AnimatedHomeBackground est `fixed inset-0` par conception (pensé pour
    // couvrir tout le viewport) : dans ce canvas Storybook, il recouvre donc
    // toute la fenêtre de preview plutôt que ce seul conteneur.
    <AnimatedHomeBackground />
  ),
};
