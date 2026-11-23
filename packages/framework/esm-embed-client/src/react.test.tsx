// @vitest-environment happy-dom
import { createElement } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EgenProvider, useEgen, useEgenSession } from './react.js';
import { FakeShell, grant } from './__tests__/fake-shell.js';

afterEach(() => document.body.replaceChildren());

function Who() {
  const { value, loading } = useEgenSession();
  const c = useEgen();
  return createElement('div', { 'data-testid': 'who' }, `${c.connected ? 'on' : 'off'}:${loading ? '…' : (value as any)?.user?.display ?? 'anon'}`);
}

describe('liaison React', () => {
  it('connecte, fournit le client et lit la session', async () => {
    const shell = new FakeShell();
    render(createElement(EgenProvider, { options: { moduleName: shell.moduleName, hostOrigins: [shell.origin], window: shell.appWindow as any, host: shell.hostWindow as any, timeoutMs: 500 }, loading: createElement('i', null, 'chargement') }, createElement(Who)));
    expect(screen.getByText('chargement')).toBeTruthy();
    await act(async () => {
      shell.hello();
      shell.accept([grant('session')], { session: { get: () => ({ user: { display: 'Sam' } }) } }, 'nonce-0123456789', { subscribe: () => () => undefined });
    });
    await waitFor(() => expect(screen.getByTestId('who').textContent).toBe('on:Sam'));
  });

  it('mode autonome : les enfants sont rendus, la session est absente', async () => {
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
