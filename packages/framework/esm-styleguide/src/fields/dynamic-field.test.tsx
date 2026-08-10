import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DynamicField } from '.';

describe('DynamicField', () => {
  it('renders a labelled text input', () => {
    render(<DynamicField label="Nom complet" />);
    expect(screen.getByLabelText('Nom complet')).toBeInTheDocument();
  });

  it('calls onChange with the new value when typing', () => {
    const onChange = vi.fn();
    render(<DynamicField label="Nom complet" value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Nom complet'), { target: { value: 'Amour' } });

    expect(onChange).toHaveBeenCalledWith('Amour');
  });

  it('applies the requested variant as a root class', () => {
    const { container } = render(<DynamicField label="Champ" variant="filled" />);
    // eslint-disable-next-line testing-library/no-node-access
    expect(container.firstElementChild?.className).toMatch(/field--filled/);
  });

  it('marks the field as required and shows the asterisk', () => {
    render(<DynamicField label="Champ requis" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('surfaces a failing validation rule as a message', () => {
    render(
      <DynamicField
        label="E-mail"
        value="pas-un-email"
        onChange={() => {}}
        validation={{
          rules: [{ regex: /^\S+@\S+\.\S+$/, message: "Format d'e-mail invalide.", type: 'error' }],
          realTimeValidation: true,
          showMessages: true,
          showIcons: true,
        }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent("Format d'e-mail invalide.");
  });

  it('does not show a validation message when the value satisfies all rules', () => {
    render(
      <DynamicField
        label="E-mail"
        value="ok@example.com"
        onChange={() => {}}
        validation={{
          rules: [{ regex: /^\S+@\S+\.\S+$/, message: "Format d'e-mail invalide.", type: 'error' }],
          realTimeValidation: true,
          showMessages: true,
          showIcons: true,
        }}
      />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables the input when disabled is passed', () => {
    render(<DynamicField label="Champ désactivé" disabled />);
    expect(screen.getByLabelText('Champ désactivé')).toBeDisabled();
  });
});
