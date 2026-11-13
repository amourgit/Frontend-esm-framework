import { afterEach, describe, expect, it } from 'vitest';
import { PlatformError } from '@egen-civitas/esm-platform';
import { HostIncompatibleError, isHostIncompatible, renderHostIncompatibleScreen } from './host-incompatible';

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.lang = '';
});

describe('isHostIncompatible (écran d’incompatibilité)', () => {
  it('reconnaît INCOMPATIBLE et HostIncompatibleError', () => {
    expect(isHostIncompatible(new PlatformError('INCOMPATIBLE', 'Host manquant'))).toBe(true);
    expect(isHostIncompatible(new HostIncompatibleError('x'))).toBe(true);
  });

  it('ignore les autres erreurs (le démarrage n’est pas bloqué pour elles)', () => {
    expect(isHostIncompatible(new PlatformError('TIMEOUT', 't', { retryable: true }))).toBe(false);
    expect(isHostIncompatible(new Error('boom'))).toBe(false);
    expect(isHostIncompatible(undefined)).toBe(false);
  });
});

describe('renderHostIncompatibleScreen', () => {
  it('affiche un écran bloquant en français avec le détail technique', () => {
    document.documentElement.lang = 'fr';
    renderHostIncompatibleScreen(new PlatformError('INCOMPATIBLE', 'Host manquant : cible "android"'));
    const screen = document.querySelector('.egen-host-incompatible')!;
    expect(screen.getAttribute('role')).toBe('alert');
    expect(screen.querySelector('h1')!.textContent).toContain('Mise à jour');
    expect(screen.textContent).toContain('Host manquant');
    expect(screen.querySelector('button')).not.toBeNull();
  });

  it('affiche l’anglais si la langue du document est anglaise', () => {
    document.documentElement.lang = 'en';
    renderHostIncompatibleScreen(new HostIncompatibleError('x'));
    expect(document.querySelector('h1')!.textContent).toBe('Application update required');
  });

  it('n’injecte jamais le message d’erreur comme HTML', () => {
    renderHostIncompatibleScreen(new PlatformError('INCOMPATIBLE', '<img src=x onerror=alert(1)>'));
    expect(document.querySelector('img')).toBeNull();
  });
});
