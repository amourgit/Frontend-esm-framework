import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AsyncSelect, type AsyncSelectHandle, type AsyncSelectProps } from './async-select.component';

interface User {
  id: string;
  name: string;
  group?: string;
  locked?: boolean;
}

const USERS: User[] = [
  { id: '1', name: 'Alice', group: 'Staff' },
  { id: '2', name: 'Bob', group: 'Staff' },
  { id: '3', name: 'Charlie', group: 'Guests', locked: true },
];

const search = (q: string) => USERS.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()));

const base = {
  label: 'Users',
  getOptionValue: (u: User) => u.id,
  getOptionLabel: (u: User) => u.name,
  debounceMs: 0,
};

function setup(overrides: Partial<AsyncSelectProps<User>> = {}, fetcher = vi.fn(async (q: string) => search(q))) {
  const utils = render(<AsyncSelect<User> {...(base as object)} fetcher={fetcher} {...(overrides as object)} />);
  return { fetcher, user: userEvent.setup(), ...utils };
}

const trigger = () => screen.getByRole('combobox');

afterEach(() => vi.useRealTimers());

describe('AsyncSelect', () => {
  it('ne charge rien avant la première ouverture puis charge la liste initiale', async () => {
    const { fetcher, user } = setup();
    expect(fetcher).not.toHaveBeenCalled();

    await user.click(trigger());
    expect(await screen.findByRole('option', { name: /Alice/ })).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe('');
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('charge dès le montage avec fetchOnOpen=false', async () => {
    const { fetcher } = setup({ fetchOnOpen: false });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  });

  it('interroge le serveur à la frappe et recharge la liste initiale quand la recherche est vidée', async () => {
    const { fetcher, user } = setup();
    await user.click(trigger());
    await screen.findByRole('option', { name: /Alice/ });

    await user.type(screen.getByRole('searchbox'), 'bo');
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
    expect(fetcher.mock.calls.map((c) => c[0])).toContain('bo');

    await user.clear(screen.getByRole('searchbox'));
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));
  });

  it('temporise les requêtes avec debounceMs', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { fetcher, user } = setup({ debounceMs: 300 });
    await user.click(trigger());
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    await user.type(screen.getByRole('searchbox'), 'ali');
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(fetcher.mock.calls[1][0]).toBe('ali');
  });

  it('ignore la réponse d’une requête obsolète (anti-course) et annule son signal', async () => {
    const resolvers: Record<string, (v: User[]) => void> = {};
    const signals: Record<string, AbortSignal> = {};
    const fetcher = vi.fn(
      (q: string, ctx: { signal: AbortSignal }) =>
        new Promise<User[]>((resolve) => {
          resolvers[q] = resolve;
          signals[q] = ctx.signal;
        }),
    );
    const { user } = setup({}, fetcher as never);
    await user.click(trigger());
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    await user.type(screen.getByRole('searchbox'), 'a');
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(signals[''].aborted).toBe(true);

    // La réponse tardive de la liste initiale ne doit pas écraser la recherche « a ».
    await act(async () => {
      resolvers['a']([USERS[0]]);
      resolvers['']?.(USERS);
    });
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
  });

  it('en mode preload, charge une seule fois et filtre localement', async () => {
    const { fetcher, user } = setup({ preload: true });
    await user.click(trigger());
    await screen.findByRole('option', { name: /Alice/ });

    await user.type(screen.getByRole('searchbox'), 'char');
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('sélectionne une option, appelle onChange(value, option) et ferme le panneau', async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await user.click(trigger());
    await user.click(await screen.findByRole('option', { name: /Bob/ }));

    expect(onChange).toHaveBeenCalledWith('2', USERS[1]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger()).toHaveTextContent('Bob');
  });

  it('re-sélectionner l’option courante la désélectionne (clearable)', async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange, defaultValue: '2', initialOptions: USERS });
    expect(trigger()).toHaveTextContent('Bob');

    await user.click(trigger());
    await user.click(await screen.findByRole('option', { name: /Bob/ }));
    expect(onChange).toHaveBeenLastCalledWith('', undefined);
    expect(trigger()).toHaveTextContent('Select...');
  });

  it('affiche la sélection initiale via initialOptions sans attendre le chargement', () => {
    setup({ value: '1', initialOptions: USERS });
    expect(trigger()).toHaveTextContent('Alice');
  });

  it('résout la sélection via resolveOption quand elle est inconnue', async () => {
    const resolveOption = vi.fn(async (v: string) => USERS.find((u) => u.id === v));
    setup({ value: '3', resolveOption });
    await waitFor(() => expect(trigger()).toHaveTextContent('Charlie'));
    expect(resolveOption).toHaveBeenCalledWith('3');
  });

  it('affiche l’erreur et permet de réessayer', async () => {
    const fetcher = vi
      .fn<(q: string) => Promise<User[]>>()
      .mockRejectedValueOnce(new Error('Boom'))
      .mockResolvedValueOnce(USERS);
    const { user } = setup({}, fetcher as never);
    await user.click(trigger());

    expect(await screen.findByRole('alert')).toHaveTextContent('Boom');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('option', { name: /Alice/ })).toBeInTheDocument();
  });

  it('affiche le message « aucun résultat » personnalisable', async () => {
    const { user } = setup({ noResultsMessage: 'Personne !' });
    await user.click(trigger());
    await screen.findByRole('option', { name: /Alice/ });
    await user.type(screen.getByRole('searchbox'), 'zzz');
    expect(await screen.findByText('Personne !')).toBeInTheDocument();
  });

  it('respecte minQueryLength sans interroger le serveur', async () => {
    const { fetcher, user } = setup({ minQueryLength: 3 });
    await user.click(trigger());
    await screen.findByRole('option', { name: /Alice/ });
    const calls = fetcher.mock.calls.length;

    await user.type(screen.getByRole('searchbox'), 'al');
    expect(await screen.findByText(/at least 3 characters/)).toBeInTheDocument();
    expect(fetcher.mock.calls.length).toBe(calls);
  });

  it('regroupe les options et désactive celles indiquées', async () => {
    const onChange = vi.fn();
    const { user } = setup({ getOptionGroup: (u: User) => u.group, getOptionDisabled: (u: User) => !!u.locked, onChange });
    await user.click(trigger());
    await screen.findByRole('option', { name: /Alice/ });

    expect(screen.getByRole('group', { name: 'Staff' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Guests' })).toBeInTheDocument();
    const charlie = screen.getByRole('option', { name: /Charlie/ });
    expect(charlie).toHaveAttribute('aria-disabled', 'true');
    await user.click(charlie);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('se pilote au clavier (flèches + Entrée, Échap)', async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    trigger().focus();
    await user.keyboard('{ArrowDown}');
    await screen.findByRole('option', { name: /Alice/ });

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('2', USERS[1]);

    await user.keyboard('{ArrowDown}');
    await screen.findByRole('listbox');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('ne s’ouvre pas lorsqu’il est désactivé', async () => {
    const { user } = setup({ disabled: true });
    await user.click(trigger());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-disabled', 'true');
  });

  it('expose le bouton d’effacement et émet une valeur vide', async () => {
    const onChange = vi.fn();
    const { user } = setup({ showClearButton: true, defaultValue: '1', initialOptions: USERS, onChange });
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenCalledWith('', undefined);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('écrit la valeur dans un champ caché pour les formulaires natifs', () => {
    const { container } = setup({ name: 'user', value: '2', initialOptions: USERS });
    expect(container.querySelector('input[type="hidden"][name="user"]')).toHaveValue('2');
  });

  it('expose des commandes impératives (open / clear / refresh)', async () => {
    const ref = React.createRef<AsyncSelectHandle>();
    const onChange = vi.fn();
    const { fetcher } = setup({ controllerRef: ref, defaultValue: '1', initialOptions: USERS, onChange });

    act(() => ref.current?.open());
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    act(() => ref.current?.refresh());
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));

    act(() => ref.current?.clear());
    expect(onChange).toHaveBeenCalledWith('', undefined);
  });

  it('charge la page suivante via la sentinelle (défilement infini)', async () => {
    let trigger$: (() => void) | undefined;
    const OriginalIO = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) {
        trigger$ = () => cb([{ isIntersecting: true } as IntersectionObserverEntry], this as never);
      }
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    } as never;

    try {
      const fetcher = vi.fn(async (_q: string, ctx: { page: number }) =>
        ctx.page === 0 ? { items: [USERS[0], USERS[1]], hasMore: true } : { items: [USERS[1], USERS[2]], hasMore: false },
      );
      const { user } = setup({}, fetcher as never);
      await user.click(trigger());
      await screen.findByRole('option', { name: /Alice/ });
      expect(screen.getAllByRole('option')).toHaveLength(2);

      await act(async () => {
        trigger$?.();
      });
      await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3)); // Bob dédoublonné
      expect(fetcher.mock.calls[1][1].page).toBe(1);
    } finally {
      globalThis.IntersectionObserver = OriginalIO;
    }
  });

  describe('multi-sélection', () => {
    it('cumule les valeurs, affiche des tags et reste ouvert', async () => {
      const onChange = vi.fn();
      const { user } = setup({ multiple: true, onChange });
      await user.click(trigger());
      await user.click(await screen.findByRole('option', { name: /Alice/ }));
      await user.click(screen.getByRole('option', { name: /Bob/ }));

      expect(onChange).toHaveBeenLastCalledWith(['1', '2'], [USERS[0], USERS[1]]);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(trigger()).toHaveTextContent('Alice');
      expect(trigger()).toHaveTextContent('Bob');
    });

    it('retire un tag via son bouton sans ouvrir le panneau', async () => {
      const onChange = vi.fn();
      const { user } = setup({ multiple: true, defaultValue: ['1', '2'], initialOptions: USERS, onChange });
      await user.click(screen.getByRole('button', { name: 'Remove Alice' }));
      expect(onChange).toHaveBeenLastCalledWith(['2'], [USERS[1]]);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('respecte maxSelected et maxVisibleTags', async () => {
      const onChange = vi.fn();
      const { user } = setup({
        multiple: true,
        maxSelected: 2,
        maxVisibleTags: 1,
        defaultValue: ['1', '2'],
        initialOptions: USERS,
        onChange,
      });
      expect(trigger()).toHaveTextContent('+1');

      await user.click(trigger());
      const charlie = await screen.findByRole('option', { name: /Charlie/ });
      expect(charlie).toHaveAttribute('aria-disabled', 'true');
      await user.click(charlie);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('retire la dernière valeur avec Retour arrière dans une recherche vide', async () => {
      const onChange = vi.fn();
      const { user } = setup({ multiple: true, defaultValue: ['1', '2'], initialOptions: USERS, onChange });
      await user.click(trigger());
      await screen.findByRole('searchbox');
      await user.keyboard('{Backspace}');
      expect(onChange).toHaveBeenLastCalledWith(['1'], [USERS[0]]);
    });

    it('écrit un champ caché par valeur', () => {
      const { container } = setup({ multiple: true, name: 'users', value: ['1', '3'], initialOptions: USERS });
      const inputs = container.querySelectorAll('input[type="hidden"][name="users"]');
      expect(Array.from(inputs).map((i) => (i as HTMLInputElement).value)).toEqual(['1', '3']);
    });
  });
});
