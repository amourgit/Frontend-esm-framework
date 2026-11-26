// @vitest-environment happy-dom
import { createElement } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EgenProvider, useEgen, useEgenNotify, useEgenTenant } from './react.js';
import { FakeShell, grant } from './__tests__/fake-shell.js';

afterEach(() => document.body.replaceChildren());

function Who() {
  const { value, loading } = useEgenTenant();
  const c = useEgen();
  return createElement('div', { 'data-testid': 'who' }, `${c.connected ? 'on' : 'off'}:${loading ? '…' : (value as any)?.id ?? 'anon'}`);
}

describe('liaison React', () => {
  it('connecte, fournit le client et lit le tenant', async () => {
    const shell = new FakeShell();
    render(createElement(EgenProvider, { options: { moduleName: shell.moduleName, hostOrigins: [shell.origin], window: shell.appWindow as any, host: shell.hostWindow as any, timeoutMs: 500 }, loading: createElement('i', null, 'chargement') }, createElement(Who)));
    expect(screen.getByText('chargement')).toBeTruthy();
    await act(async () => {
      shell.hello();
      shell.accept([grant('tenant')], { tenant: { get: () => ({ id: 'acme' }) } }, 'nonce-0123456789', { subscribe: () => () => undefined });
    });
    await waitFor(() => expect(screen.getByTestId('who').textContent).toBe('on:acme'));
  });

  it('mode autonome : les enfants sont rendus, le tenant est absent', async () => {
    const shell = new FakeShell();
    render(createElement(EgenProvider, { options: { moduleName: shell.moduleName, hostOrigins: [shell.origin], window: shell.appWindow as any, host: shell.hostWindow as any, timeoutMs: 50 } }, createElement(Who)));
    await waitFor(() => expect(screen.getByTestId('who').textContent).toBe('off:anon'));
  });

  it('useEgen hors provider lève une erreur explicite', () => {
    const orig = console.error;
    console.error = () => undefined;
    expect(() => render(createElement(Who))).toThrow(/EgenProvider/);
    console.error = orig;
  });
});

function Toaster({ local }: { local: (t: unknown) => void }) {
  const { notify, coreDisplays } = useEgenNotify(local);
  return createElement(
    'div',
    null,
    coreDisplays ? null : createElement('div', { 'data-testid': 'local-toaster' }, 'toaster local'),
    createElement('button', { onClick: () => void notify({ kind: 'info', title: 'hello' }) }, 'notifier'),
  );
}

describe('useEgenNotify', () => {
  it('le Core affiche : l’app ne rend pas son toaster et n’appelle pas l’affichage local', async () => {
    const shell = new FakeShell();
    const local = vi.fn();
    const shown = vi.fn(async () => ({ displayed: true }));
    render(createElement(EgenProvider, { options: { moduleName: shell.moduleName, hostOrigins: [shell.origin], window: shell.appWindow as any, host: shell.hostWindow as any, timeoutMs: 500, capabilities: ['notifications'] } }, createElement(Toaster, { local })));
    await act(async () => {
      shell.hello();
      shell.accept([grant('notifications')], { notifications: { show: shown } });
    });
    const btn = await screen.findByRole('button', { name: 'notifier' });
    expect(screen.queryByTestId('local-toaster')).toBeNull();
    await act(async () => btn.click());
    await waitFor(() => expect(shown).toHaveBeenCalledTimes(1));
    expect(local).not.toHaveBeenCalled();
  });

  it('autonome : l’app rend son toaster et affiche elle-même', async () => {
    const shell = new FakeShell();
    const local = vi.fn();
    render(createElement(EgenProvider, { options: { moduleName: shell.moduleName, hostOrigins: [shell.origin], window: shell.appWindow as any, host: shell.hostWindow as any, timeoutMs: 40 } }, createElement(Toaster, { local })));
    const btn = await screen.findByRole('button', { name: 'notifier' });
    expect(screen.getByTestId('local-toaster')).not.toBeNull();
    await act(async () => btn.click());
    expect(local).toHaveBeenCalledTimes(1);
  });
});
