import React, { act } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import i18next from 'i18next';

// Le setup global des tests remplace esm-react-utils et react-i18next par des mocks (décorateur
// identité, ComponentContext nul) : ici on veut précisément le vrai décorateur et le vrai contexte.
vi.mock('@egen-civitas/esm-react-utils', async () => vi.importActual('@egen-civitas/esm-react-utils'));
vi.mock('react-i18next', async () => vi.importActual('react-i18next'));

// Sondes : chaque morceau du plan de travail affiche le module de son ComponentContext.
// (Les composants réels sont couverts par workbench.test.tsx ; ici on vérifie le montage par le shell.)
// Les imports sont faits dans la fabrique : `vi.mock` est hissé avant les imports du fichier.
vi.mock('./tool-window-rail.component.js', async () => {
  const { useContext } = await import('react');
  const { ComponentContext } = await import('@egen-civitas/esm-react-utils');
  const Probe = ({ id }: { id: string }) => <span data-testid={id}>{useContext(ComponentContext).moduleName}</span>;
  return { LeftRail: () => <Probe id="railLeft" />, RightRail: () => <Probe id="railRight" /> };
});
vi.mock('./tool-window-zone.component.js', async () => {
  const { useContext } = await import('react');
  const { ComponentContext } = await import('@egen-civitas/esm-react-utils');
  return {
    ToolWindowZone: ({ anchor }: { anchor: string }) => (
      <span data-testid={`zone-${anchor}`}>{useContext(ComponentContext).moduleName}</span>
    ),
  };
});

import { renderWorkbench } from './workbench.render';

beforeAll(async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // Le shell expose i18next sur window avant de monter le plan de travail.
  await i18next.init({ lng: 'fr', resources: {} });
  window.i18next = i18next;
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('renderWorkbench', () => {
  it('monte chaque rail et chaque zone avec un ComponentContext (sinon ExtensionSlot lève une erreur)', async () => {
    const targets = Object.fromEntries(
      ['railLeft', 'railRight', 'zoneLeft', 'zoneRight', 'zoneBottom'].map((name) => {
        const el = document.createElement('div');
        document.body.appendChild(el);
        return [name, el];
      }),
    ) as unknown as Parameters<typeof renderWorkbench>[0];

    await act(async () => {
      renderWorkbench(targets);
    });

    for (const id of ['railLeft', 'railRight', 'zone-left', 'zone-right', 'zone-bottom']) {
      expect(document.querySelector(`[data-testid="${id}"]`)?.textContent).toBe('@egen-civitas/esm-styleguide');
    }
  });
});
