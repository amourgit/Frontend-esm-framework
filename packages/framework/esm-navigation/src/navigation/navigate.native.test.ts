import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { navigateToUrl } from 'single-spa';
import { navigate } from './navigate';

const open = vi.fn();
vi.mock('single-spa');
vi.mock('@egen-civitas/esm-platform', () => ({ getPlatform: () => ({ openExternal: { open } }) }));

/**
 * G3 — en natif, `navigate()` ne doit JAMAIS faire `location.assign` vers une URL absolue : cela remplacerait le SPA dans
 * le WebView par du contenu distant. La sortie passe par `platform.openExternal` (liste blanche de schémas, côté Host).
 */
describe('navigate — cible native', () => {
  const originalLocation = window.location;
  const assign = vi.fn();

  beforeEach(() => {
    open.mockReset().mockResolvedValue(undefined);
    assign.mockClear();
    vi.mocked(navigateToUrl).mockClear();
    delete (window as any).location;
    // @ts-ignore
    window.location = { assign, origin: 'https://app.localhost' };
    window.getEgenSpaBase = () => '/app/';
  });

  afterEach(() => {
    window.location = originalLocation;
    delete (window as { egenTarget?: unknown }).egenTarget;
  });

  it.each(['android', 'ios'] as const)(
    '%s : une URL absolue sort par openExternal, jamais par location.assign',
    (target) => {
      window.egenTarget = target;
      navigate({ to: 'https://autre-site.exemple.ga/page' });
      expect(open).toHaveBeenCalledWith('https://autre-site.exemple.ga/page');
      expect(assign).not.toHaveBeenCalled();
    },
  );

  it('mailto: et tel: passent aussi par openExternal', () => {
    window.egenTarget = 'android';
    navigate({ to: 'mailto:contact@exemple.ga' });
    navigate({ to: 'tel:+24101020304' });
    expect(open).toHaveBeenCalledTimes(2);
    expect(assign).not.toHaveBeenCalled();
  });

  it("un schéma dangereux est transmis à openExternal, qui le refuse : aucune navigation, l'erreur est journalisée", async () => {
    window.egenTarget = 'android';
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    open.mockRejectedValue(new Error('schéma non autorisé'));

    navigate({ to: 'javascript:alert(1)' });
    await vi.waitFor(() => expect(error).toHaveBeenCalled());

    expect(assign).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('un chemin du SPA reste une navigation interne (single-spa)', () => {
    window.egenTarget = 'android';
    navigate({ to: '/app/home' });
    expect(navigateToUrl).toHaveBeenCalledWith('/app/home');
    expect(open).not.toHaveBeenCalled();
  });

  it('une URL de la MÊME origine devient un chemin interne (pas de sortie)', () => {
    window.egenTarget = 'android';
    navigate({ to: 'https://app.localhost/app/page' });
    expect(navigateToUrl).toHaveBeenCalledWith('/app/page');
    expect(open).not.toHaveBeenCalled();
  });

  it('Web : comportement historique inchangé (location.assign pour une URL absolue)', () => {
    navigate({ to: 'https://autre-site.exemple.ga/page' });
    expect(assign).toHaveBeenCalledWith('https://autre-site.exemple.ga/page');
    expect(open).not.toHaveBeenCalled();
  });
});
