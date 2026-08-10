import React from 'react';
import type { Meta, StoryObj } from 'storybook-react-rsbuild';
import { EgenDatePicker } from './egen-date-picker.component';

const meta: Meta<typeof EgenDatePicker> = {
  title: 'Components/DatePicker',
  component: EgenDatePicker,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EgenDatePicker>;

export const Default: Story = {
  args: {
    labelText: 'Date of birth',
  },
};

export const WithDefaultValue: Story = {
  args: {
    labelText: 'Appointment date',
    defaultValue: new Date(2025, 5, 15),
  },
};

export const Invalid: Story = {
  args: {
    labelText: 'Visit date',
    invalid: true,
    invalidText: 'A date is required.',
  },
};

export const Disabled: Story = {
  args: {
    labelText: 'Date of birth',
    isDisabled: true,
  },
};

export const SmallSize: Story = {
  args: {
    labelText: 'Date',
    size: 'sm',
  },
};

export const WithMinAndMaxDate: Story = {
  args: {
    labelText: 'Select a date',
    minDate: new Date(2025, 0, 1),
    maxDate: new Date(2025, 11, 31),
  },
};
