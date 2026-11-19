import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Accordion,
  Badge,
  Button,
  IconButton,
  TextLink,
  TextInput,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Checkbox,
  MenuDivider,
  MenuItem,
  MenuList,
  PasswordInput,
  RadioGroup,
  RadioGroupItem,
  SearchInput,
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

describe('RadioGroup', () => {
  it('ne garde qu’un choix et prévient son parent', async () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup defaultValue="fr" onValueChange={onValueChange} aria-label="Langue">
        <RadioGroupItem value="fr" aria-label="Français" />
        <RadioGroupItem value="en" aria-label="English" />
      </RadioGroup>,
    );
    expect(screen.getByRole('radio', { name: 'Français' })).toBeChecked();
    await userEvent.click(screen.getByRole('radio', { name: 'English' }));
    expect(onValueChange).toHaveBeenCalledWith('en');
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Français' })).not.toBeChecked();
  });
});

describe('SearchInput', () => {
  it('transmet la saisie, propose « effacer » et se vide avec Échap', async () => {
    const onValueChange = vi.fn();
    render(<SearchInput label="Rechercher" clearLabel="Effacer" onValueChange={onValueChange} />);
    const box = screen.getByRole('searchbox', { name: 'Rechercher' });
    expect(screen.queryByRole('button', { name: 'Effacer' })).not.toBeInTheDocument();
    await userEvent.type(box, 'ab');
    expect(onValueChange).toHaveBeenLastCalledWith('ab');
    await userEvent.click(screen.getByRole('button', { name: 'Effacer' }));
    expect(box).toHaveValue('');
    await userEvent.type(box, 'x{Escape}');
    expect(box).toHaveValue('');
  });
});

describe('transmission des refs (React 18)', () => {
  it('Button, IconButton, TextLink, Input, TextInput et Badge exposent leur élément DOM', () => {
    const refs = {
      button: React.createRef<HTMLButtonElement>(),
      icon: React.createRef<HTMLButtonElement>(),
      link: React.createRef<HTMLAnchorElement>(),
      text: React.createRef<HTMLInputElement>(),
      badge: React.createRef<HTMLSpanElement>(),
      password: React.createRef<HTMLInputElement>(),
      search: React.createRef<HTMLInputElement>(),
    };
    render(
      <div>
        <Button ref={refs.button}>b</Button>
        <IconButton ref={refs.icon} icon={<svg />} label="i" noTooltip />
        <TextLink ref={refs.link} href="/x">
          l
        </TextLink>
        <TextInput ref={refs.text} label="t" />
        <Badge ref={refs.badge}>g</Badge>
        <PasswordInput ref={refs.password} label="p" />
        <SearchInput ref={refs.search} label="s" />
      </div>,
    );
    expect(refs.button.current).toBeInstanceOf(HTMLButtonElement);
    expect(refs.icon.current).toBeInstanceOf(HTMLButtonElement);
    expect(refs.link.current).toBeInstanceOf(HTMLAnchorElement);
    expect(refs.text.current).toBeInstanceOf(HTMLInputElement);
    expect(refs.badge.current).toBeInstanceOf(HTMLSpanElement);
    expect(refs.password.current).toBeInstanceOf(HTMLInputElement);
    expect(refs.search.current).toBeInstanceOf(HTMLInputElement);
  });
});
