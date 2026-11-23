import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importDynamic } from '@egen-civitas/esm-dynamic-loading';
import { registerModuleLoad } from '@egen-civitas/esm-config';
import { loadLifeCycles } from './load-lifecycles';
import { setModuleAliases } from './module-aliases';

vi.mock('@egen-civitas/esm-dynamic-loading', () => ({ importDynamic: vi.fn() }));
vi.mock('@egen-civitas/esm-config', () => ({ registerModuleLoad: vi.fn() }));
vi.mock('single-spa', () => ({}));

const lifecycles = { bootstrap: vi.fn(), mount: vi.fn(), unmount: vi.fn() };
const loaded = () => vi.mocked(registerModuleLoad).mock.calls.map((c) => c[0]);

describe('loadLifeCycles — marquage « chargé » sous le nom du paquet ET sous ses alias', () => {
  beforeEach(() => {
    vi.mocked(importDynamic).mockReset();
    vi.mocked(registerModuleLoad).mockReset();
  });

  it('marque le paquet et chaque alias après startupApp()', async () => {
    const startupApp = vi.fn();
    vi.mocked(importDynamic).mockResolvedValue({ startupApp, root: () => lifecycles });
    setModuleAliases('@egen/app-a', ['@egen-civitas/app-a']);

    await loadLifeCycles('@egen/app-a', 'root');

    expect(startupApp).toHaveBeenCalledTimes(1);
    expect(loaded()).toEqual(['@egen/app-a', '@egen-civitas/app-a']);
  });

  it('une app sans startupApp est aussi marquée sous ses alias', async () => {
    vi.mocked(importDynamic).mockResolvedValue({ root: () => lifecycles });
    setModuleAliases('@egen/app-b', ['@egen-civitas/app-b', '@autre/app-b']);

    await loadLifeCycles('@egen/app-b', 'root');

    expect(loaded()).toEqual(['@egen/app-b', '@egen-civitas/app-b', '@autre/app-b']);
  });

  it('sans alias : comportement historique (un seul marquage)', async () => {
    vi.mocked(importDynamic).mockResolvedValue({ root: () => lifecycles });

    await loadLifeCycles('@egen/app-sans-alias', 'root');

    expect(loaded()).toEqual(['@egen/app-sans-alias']);
  });

  it("n'initialise qu'une fois par app (le marquage n'est pas répété)", async () => {
    vi.mocked(importDynamic).mockResolvedValue({ root: () => lifecycles });
    setModuleAliases('@egen/app-c', ['@egen-civitas/app-c']);

    await loadLifeCycles('@egen/app-c', 'root');
    await loadLifeCycles('@egen/app-c', 'root');

    expect(loaded()).toEqual(['@egen/app-c', '@egen-civitas/app-c']);
  });
});
