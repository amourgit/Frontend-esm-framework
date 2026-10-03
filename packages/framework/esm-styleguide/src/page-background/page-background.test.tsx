import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { GlobalPageBackground, PageBackground, PageBackgroundProvider, renderPageBackground } from './index';
import { pageBackgroundStore } from './page-background.store';

// Chaque « app » du shell vit dans sa propre racine React : on reproduit ça avec
// des racines séparées, sans aucun parent React commun.
beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const mounted: Array<{ root: Root; host: HTMLElement }> = [];

async function mount(node: React.ReactNode) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  mounted.push({ root, host });
  await act(async () => root.render(node));
  return { root, host };
}

async function unmount(entry: { root: Root; host: HTMLElement }) {
  await act(async () => entry.root.unmount());
  entry.host.remove();
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await unmount(m);
  pageBackgroundStore.setState({ config: null, owner: null });
});

describe('page-background : store global partagé entre racines React', () => {
  it("n'affiche rien tant qu'aucune page n'a déclaré de fond (fallback=\"none\")", async () => {
    const shell = await mount(<GlobalPageBackground fallback="none" />);
    expect(shell.host.innerHTML).toBe('');
  });

  it("le fond déclaré par <PageBackground> dans une autre racine s'affiche dans le rendu global", async () => {
    const shell = await mount(<GlobalPageBackground fallback="none" />);
    await mount(<PageBackground imageSrc="/a.jpg" imageAlt="Fond A" />);
    const img = shell.host.querySelector('img[alt="Fond A"]');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/a.jpg');
  });

  it('le fond disparaît du rendu global quand la page est démontée', async () => {
    const shell = await mount(<GlobalPageBackground fallback="none" />);
    const page = await mount(<PageBackground imageSrc="/a.jpg" imageAlt="Fond A" />);
    expect(shell.host.querySelector('img')).not.toBeNull();
    await unmount(page);
    expect(shell.host.innerHTML).toBe('');
  });

  it("un démontage tardif de l'ancienne page n'efface pas le fond de la nouvelle (changement d'app)", async () => {
    const shell = await mount(<GlobalPageBackground fallback="none" />);
    const oldPage = await mount(<PageBackground imageSrc="/old.jpg" imageAlt="Ancien" />);
    await mount(<PageBackground imageSrc="/new.jpg" imageAlt="Nouveau" />);
    expect(shell.host.querySelector('img[alt="Nouveau"]')).not.toBeNull();

    await unmount(oldPage); // l'ancienne app se démonte APRÈS que la nouvelle a monté
    expect(shell.host.querySelector('img[alt="Nouveau"]')).not.toBeNull();
  });

  it('changer les props met le fond à jour sans repasser par « aucun fond » (pas de clignotement)', async () => {
    const seen: Array<string | null> = [];
    const unsubscribe = pageBackgroundStore.subscribe((s) => seen.push(s.config?.imageSrc ?? null));
    const page = await mount(<PageBackground imageSrc="/a.jpg" />);
    await act(async () => page.root.render(<PageBackground imageSrc="/b.jpg" />));
    unsubscribe();
    expect(seen).toEqual(['/a.jpg', '/b.jpg']);
  });

  it('renderPageBackground(conteneur) monte le rendu global du shell', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    await act(async () => renderPageBackground(host));
    expect(host.innerHTML).toBe(''); // fond par défaut : rien

    const page = await mount(<PageBackground imageSrc="/shell.jpg" imageAlt="Via le shell" />);
    expect(host.querySelector('img[alt="Via le shell"]')).not.toBeNull();
    await unmount(page);
    expect(host.innerHTML).toBe('');
    host.remove();
  });

  it('<PageBackgroundProvider> (déprécié) reste inoffensif : mêmes résultats avec ou sans', async () => {
    const shell = await mount(
      <PageBackgroundProvider>
        <GlobalPageBackground fallback="none" />
      </PageBackgroundProvider>,
    );
    await mount(
      <PageBackgroundProvider>
        <PageBackground imageSrc="/compat.jpg" imageAlt="Compat" />
      </PageBackgroundProvider>,
    );
    expect(shell.host.querySelector('img[alt="Compat"]')).not.toBeNull();
  });

  it('customComponent est rendu tel quel dans le fond global', async () => {
    const shell = await mount(<GlobalPageBackground fallback="none" />);
    await mount(<PageBackground customComponent={<span data-testid="custom">fond perso</span>} />);
    expect(shell.host.textContent).toContain('fond perso');
  });
});
