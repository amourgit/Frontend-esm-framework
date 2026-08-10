import React, { useState } from 'react';
import type { Meta, StoryObj } from 'storybook-react-rsbuild';
import { DynamicField } from './dynamic-field.component';
import { UserIcon } from '../icons/icons';

const meta: Meta<typeof DynamicField> = {
  title: 'Components/Fields/DynamicField',
  component: DynamicField,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['outlined', 'filled', 'standard'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof DynamicField>;

const ControlledField: React.FC<React.ComponentProps<typeof DynamicField>> = (props) => {
  const [value, setValue] = useState(props.value ?? '');
  return <DynamicField {...props} value={value} onChange={setValue} />;
};

export const Outlined: Story = {
  render: (args) => <ControlledField {...args} />,
  args: {
    variant: 'outlined',
    label: "Nom d'utilisateur",
    fieldIcon: { icon: UserIcon, position: 'left' },
  },
};

export const Filled: Story = {
  render: (args) => <ControlledField {...args} />,
  args: {
    variant: 'filled',
    label: 'Adresse e-mail',
    type: 'email',
  },
};

export const Standard: Story = {
  render: (args) => <ControlledField {...args} />,
  args: {
    variant: 'standard',
    label: 'Recherche',
    type: 'search',
  },
};

export const WithValidation: Story = {
  render: (args) => <ControlledField {...args} />,
  args: {
    variant: 'outlined',
    label: 'Mot de passe',
    type: 'password',
    required: true,
    validation: {
      rules: [
        { regex: /.{8,}/, message: 'Au moins 8 caractères.', type: 'error' },
        { regex: /[A-Z]/, message: 'Au moins une majuscule.', type: 'warning' },
        { regex: /.{8,}/, message: 'Mot de passe robuste.', type: 'success' },
      ],
      showIcons: true,
      showMessages: true,
    },
  },
};
