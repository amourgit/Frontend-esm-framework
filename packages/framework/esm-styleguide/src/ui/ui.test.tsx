import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Badge,
  Button,
  IconButton,
  InlineLoading,
  Layer,
  Link,
  Separator,
  Spinner,
  Switch,
  TextInput,
  Tile,
  TileContent,
  TileTitle,
} from './index';
import { cn } from './cn';

describe('cn', () => {
  it('fusionne les classes Tailwind : la dernière gagne, les valeurs fausses sont ignorées', () => {
    expect(cn('px-4 py-2', 'px-2')).toBe('py-2 px-2');
    expect(cn('a', false && 'b', undefined, null, ['c'])).toBe('a c');
  });
});

describe('Button', () => {
  it('est un vrai <button> cliquable avec sa variante et sa taille exposées', async () => {
    const onClick = vi.fn();
    render(
      <Button variant="outline" size="sm" onClick={onClick}>
        Enregistrer
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Enregistrer' });
    expect(button).toHaveAttribute('data-variant', 'outline');
    expect(button).toHaveAttribute('data-size', 'sm');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('désactivé : ne reçoit aucun clic', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Non
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Non' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('`className` surcharge le style de base (surchargeable par le consommateur)', () => {
    render(<Button className="h-12 bg-red-500">Grand</Button>);
    const classes = screen.getByRole('button').className;
    expect(classes).toContain('h-12');
    expect(classes).not.toContain('h-9');
  });

  it("`asChild` rend l'enfant (un lien) avec les classes du bouton", () => {
    render(
      <Button asChild>
        <a href="/accueil">Accueil</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Accueil' });
    expect(link).toHaveAttribute('data-slot', 'button');
    expect(link).toHaveAttribute('href', '/accueil');
  });
});

describe('IconButton', () => {
  it('est nommé par son libellé et déclenche le clic', async () => {
    const onClick = vi.fn();
    render(<IconButton label="Fermer" icon={<svg data-testid="icone" />} onClick={onClick} noTooltip />);
    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('icone')).toBeInTheDocument();
  });

  it("garde le libellé accessible avec l'infobulle activée", () => {
    render(<IconButton label="Supprimer" icon={<svg />} />);
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument();
  });
});

describe('Link', () => {
  it('un lien externe reçoit rel="noopener noreferrer"', () => {
    render(
      <Link href="https://exemple.test" target="_blank">
        Docs
      </Link>,
    );
    expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('un lien interne ne reçoit pas de rel', () => {
    render(<Link href="/aide">Aide</Link>);
    expect(screen.getByRole('link', { name: 'Aide' })).not.toHaveAttribute('rel');
  });
});

describe('TextInput', () => {
  it('relie le libellé au champ et transmet la saisie', async () => {
    const onChange = vi.fn();
    render(<TextInput label="Nom" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Nom'), 'Awa');
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("annonce l'aide, puis l'erreur à sa place avec aria-invalid", () => {
    const { rerender } = render(<TextInput label="Email" helperText="Adresse pro" />);
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Adresse pro');
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');

    rerender(<TextInput label="Email" helperText="Adresse pro" errorText="Format invalide" />);
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Format invalide');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('`hideLabel` masque le libellé visuellement mais le garde accessible', () => {
    render(<TextInput label="Recherche" hideLabel />);
    expect(screen.getByLabelText('Recherche')).toBeInTheDocument();
    expect(screen.getByText('Recherche')).toHaveClass('sr-only');
  });
});

describe('Switch', () => {
  it('bascule au clic et prévient son parent', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Mode sombre" onCheckedChange={onCheckedChange} />);
    const toggle = screen.getByRole('switch', { name: 'Mode sombre' });
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(toggle).toBeChecked();
  });

  it('se commande au clavier (espace)', async () => {
    render(<Switch aria-label="Alertes" />);
    const toggle = screen.getByRole('switch', { name: 'Alertes' });
    toggle.focus();
    await userEvent.keyboard(' ');
    expect(toggle).toBeChecked();
  });
});

describe('InlineLoading', () => {
  it("annonce l'état en cours avec sa description", () => {
    render(<InlineLoading description="Enregistrement…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Enregistrement…');
    expect(screen.getByRole('status')).toHaveAttribute('data-status', 'active');
  });

  it("n'affiche rien quand il est inactif", () => {
    const { container } = render(<InlineLoading status="inactive" description="x" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('montre les états terminé et erreur', () => {
    const { rerender } = render(<InlineLoading status="finished" description="Enregistré" />);
    expect(screen.getByRole('status')).toHaveAttribute('data-status', 'finished');
    rerender(<InlineLoading status="error" description="Échec" />);
    expect(screen.getByRole('status')).toHaveAttribute('data-status', 'error');
  });
});

describe('Tile, Layer, Badge, Separator, Spinner', () => {
  it('Tile compose ses sous-parties', () => {
    render(
      <Tile role="article">
        <TileTitle>Titre</TileTitle>
        <TileContent>Contenu</TileContent>
      </Tile>,
    );
    expect(screen.getByText('Titre')).toHaveAttribute('data-slot', 'tile-title');
    expect(screen.getByRole('article')).toHaveAttribute('data-slot', 'tile');
  });

  it('Layer est une simple surface, surchargeable', () => {
    render(<Layer className="bg-muted">Zone</Layer>);
    expect(screen.getByText('Zone')).toHaveClass('bg-muted');
    expect(screen.getByText('Zone')).not.toHaveClass('bg-card');
  });

  it('Badge et Separator se rendent avec leur slot', () => {
    render(
      <div>
        <Badge variant="secondary">Nouveau</Badge>
        <Separator data-testid="sep" />
      </div>,
    );
    expect(screen.getByText('Nouveau')).toHaveAttribute('data-slot', 'badge');
    expect(screen.getByTestId('sep')).toHaveAttribute('data-slot', 'separator');
  });

  it('Spinner est annoncé comme un statut', () => {
    render(<Spinner />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });
});
