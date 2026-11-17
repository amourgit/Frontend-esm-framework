import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Checkbox,
  MenuDivider,
  MenuItem,
  MenuList,
  PasswordInput,
  Skeleton,
  StructuredList,
  StructuredListBody,
  StructuredListCell,
  StructuredListRow,
} from './index';

describe('Checkbox', () => {
  it('se coche au clic et prévient son parent', async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox aria-label="Accepter" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole('checkbox', { name: 'Accepter' });
    expect(box).not.toBeChecked();
    await userEvent.click(box);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(box).toBeChecked();
  });
});

describe('Accordion', () => {
  it('déplie et replie une section au clic', async () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger>Section A</AccordionTrigger>
          <AccordionContent>Contenu A</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const trigger = screen.getByRole('button', { name: 'Section A' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Contenu A')).toBeVisible();
  });
});

describe('PasswordInput', () => {
  it('masque la saisie puis la révèle avec le bouton œil', async () => {
    render(<PasswordInput label="Mot de passe" showPasswordLabel="Afficher" hidePasswordLabel="Masquer" />);
    const field = screen.getByLabelText('Mot de passe');
    expect(field).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Afficher' }));
    expect(field).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('button', { name: 'Masquer' }));
    expect(field).toHaveAttribute('type', 'password');
  });
});

describe('MenuList / MenuItem', () => {
  it('rend des entrées bouton et lien, avec séparateur', async () => {
    const onClick = vi.fn();
    render(
      <MenuList aria-label="Actions">
        <MenuItem onClick={onClick}>Déconnexion</MenuItem>
        <MenuDivider />
        <MenuItem href="/aide" target="_blank">
          Aide
        </MenuItem>
      </MenuList>,
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Déconnexion' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    const link = screen.getByRole('menuitem', { name: 'Aide' });
    expect(link).toHaveAttribute('href', '/aide');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});

describe('StructuredList', () => {
  it('compose lignes et cellules avec des rôles de tableau', () => {
    render(
      <StructuredList aria-label="Configuration">
        <StructuredListBody>
          <StructuredListRow>
            <StructuredListCell>Clé</StructuredListCell>
            <StructuredListCell>Valeur</StructuredListCell>
          </StructuredListRow>
        </StructuredListBody>
      </StructuredList>,
    );
    expect(screen.getByRole('table', { name: 'Configuration' })).toBeInTheDocument();
    expect(screen.getAllByRole('cell').map((c) => c.textContent)).toEqual(['Clé', 'Valeur']);
  });
});

describe('Skeleton', () => {
  it('est un bloc décoratif', () => {
    render(<Skeleton data-testid="sk" className="h-4 w-20" />);
    expect(screen.getByTestId('sk')).toHaveAttribute('data-slot', 'skeleton');
  });
});
