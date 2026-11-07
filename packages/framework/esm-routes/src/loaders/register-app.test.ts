import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerModuleWithConfigSystem } from '@egen-civitas/esm-config';
import { setCapabilityResolver } from '@egen-civitas/esm-globals';
import { registerApp } from './pages';
import { tryRegisterExtension } from './components';

vi.mock('@egen-civitas/esm-config', () => ({ registerModuleWithConfigSystem: vi.fn() }));
vi.mock('@egen-civitas/esm-feature-flags', () => ({ getFeatureFlag: vi.fn() }));
vi.mock('single-spa', () => ({
  registerApplication: vi.fn(),
  pathToActiveWhen: vi.fn(),
}));
vi.mock('./components', () => ({
  tryRegisterExtension: vi.fn(),
  tryRegisterFeatureFlag: vi.fn(),
  tryRegisterModal: vi.fn(),
  tryRegisterWorkspace: vi.fn(),
  tryRegisterWorkspace2: vi.fn(),
  tryRegisterWorkspaceGroup: vi.fn(),
  tryRegisterWorkspaceGroups2: vi.fn(),
  tryRegisterWorkspaceWindows2: vi.fn(),
}));

const routesWithExtension = { extensions: [{ name: 'e', component: 'c', slot: 's' }] };

describe('registerApp — filtrage plateforme / capacité (F2)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    setCapabilityResolver(null);
    delete (window as { egenTarget?: unknown }).egenTarget;
    vi.restoreAllMocks();
  });

  it('enregistre une app sans champs (comportement historique)', () => {
    registerApp('@egen/app', routesWithExtension as never);

    expect(registerModuleWithConfigSystem).toHaveBeenCalledWith('@egen/app');
    expect(tryRegisterExtension).toHaveBeenCalledTimes(1);
  });

  it("n'enregistre RIEN (ni config, ni extensions) pour une app d'une autre plateforme", () => {
    registerApp('@egen/ios-only', { ...routesWithExtension, platforms: ['ios'] } as never);

    expect(registerModuleWithConfigSystem).not.toHaveBeenCalled();
    expect(tryRegisterExtension).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('@egen/ios-only'),
      expect.objectContaining({ app: '@egen/ios-only', reason: 'platform' }),
    );
  });

  it("n'enregistre pas une app dont une capacité requise manque, mais l'enregistre quand elle est disponible", () => {
    const routes = { ...routesWithExtension, requiredCapabilities: ['camera'] } as never;

    registerApp('@egen/camera-app', routes);
    expect(registerModuleWithConfigSystem).not.toHaveBeenCalled();

    setCapabilityResolver(() => true);
    registerApp('@egen/camera-app', routes);
    expect(registerModuleWithConfigSystem).toHaveBeenCalledWith('@egen/camera-app');
    expect(tryRegisterExtension).toHaveBeenCalledTimes(1);
  });
});
