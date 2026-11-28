import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './index';

describe('Dialog', () => {
  const Example = ({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) => (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger>Ouvrir</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer le site</DialogTitle>
          <DialogDescription>Action définitive.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button type="button">Confirmer</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  it('ouvre une vraie boîte de dialogue nommée et décrite, et la referme avec Échap', async () => {
    const onOpenChange = vi.fn();
    render(<Example onOpenChange={onOpenChange} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    const dialog = await screen.findByRole('dialog', { name: 'Supprimer le site' });
    expect(dialog).toHaveAccessibleDescription('Action définitive.');
    expect(within(dialog).getByRole('button', { name: 'Confirmer' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('propose un bouton de fermeture accessible', async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
    await userEvent.click(await screen.findByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('DropdownMenu', () => {
  it("s'ouvre au clavier, déclenche l'action choisie puis se referme", async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={onSelect}>Modifier</DropdownMenuItem>
          <DropdownMenuItem>Supprimer</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    screen.getByRole('button', { name: 'Actions' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Modifier' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('Tabs', () => {
  it('affiche le panneau de l’onglet actif et change au clic', async () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">Détails</TabsTrigger>
          <TabsTrigger value="b">Activité</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Contenu A</TabsContent>
        <TabsContent value="b">Contenu B</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'Détails' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Contenu A')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Activité' }));
    expect(screen.getByText('Contenu B')).toBeInTheDocument();
    expect(screen.queryByText('Contenu A')).not.toBeInTheDocument();
  });
});

describe('Table', () => {
  it('rend un vrai tableau sémantique (en-têtes de colonne et cellules)', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Rôle</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Awa</TableCell>
            <TableCell>Admin</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Nom', 'Rôle']);
    expect(screen.getByRole('cell', { name: 'Awa' })).toBeInTheDocument();
  });
});

describe('Alert', () => {
  it('annonce une notification avec ses variantes d’état', () => {
    render(
      <Alert variant="warning">
        <AlertTitle>Attention</AlertTitle>
        <AlertDescription>Quota presque atteint.</AlertDescription>
      </Alert>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Attention');
    expect(alert).toHaveClass('border-l-(--warning)');
  });
});
