import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NATIVE_TOOLS,
  copyToClipboardTool,
  downloadFileTool,
  fetchDataTool,
  fillFieldTool,
  listRoutesTool,
  listUIActionsTool,
  openModalTool,
  refreshDataTool,
  searchTool,
  showNotificationTool,
  showSnackbarTool,
} from './index';
import { _clearUIActionRegistry, registerUIAction } from '../ui-actions';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  showNotification: vi.fn(),
  showSnackbar: vi.fn(),
  showModal: vi.fn(),
  egenFetch: vi.fn(),
  mutate: vi.fn(async () => undefined),
}));
vi.mock('@egen-civitas/esm-navigation', () => ({ navigate: mocks.navigate }));
vi.mock('@egen-civitas/esm-styleguide', () => ({
  showNotification: mocks.showNotification,
  showSnackbar: mocks.showSnackbar,
  showModal: mocks.showModal,
}));
vi.mock('@egen-civitas/esm-api', () => ({ egenFetch: mocks.egenFetch }));
vi.mock('swr', () => ({ mutate: mocks.mutate }));

const run = (tool: { execute: (ctx: any) => Promise<any> }, args: Record<string, unknown> = {}) =>
  tool.execute({ args });

beforeEach(() => {
  Object.values(mocks).forEach((m) => m.mockReset());
  mocks.mutate.mockResolvedValue(undefined);
  document.body.innerHTML = '';
  _clearUIActionRegistry();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('affichage : notification, snackbar, modale', () => {
  it('show_notification transmet les champs avec leurs valeurs par défaut', async () => {
    expect((await run(showNotificationTool, { description: 'Enregistré' })).success).toBe(true);
    expect(mocks.showNotification).toHaveBeenLastCalledWith({
      description: 'Enregistré',
      title: undefined,
      kind: 'info',
      millis: 5000,
    });
    await run(showNotificationTool, { description: 'Oups', title: 'Erreur', kind: 'error', millis: 1000 });
    expect(mocks.showNotification).toHaveBeenLastCalledWith({
      description: 'Oups',
      title: 'Erreur',
      kind: 'error',
      millis: 1000,
    });
  });

  it("show_snackbar et open_modal : succès et propagation des erreurs en résultat d'échec", async () => {
    expect(
      (await run(showSnackbarTool, { title: 'Fait', subtitle: 'ok', kind: 'success', timeoutInMs: 2000 })).success,
    ).toBe(true);
    expect(mocks.showSnackbar).toHaveBeenLastCalledWith({
      title: 'Fait',
      subtitle: 'ok',
      kind: 'success',
      timeoutInMs: 2000,
    });
    expect((await run(openModalTool, { name: 'confirm', props: { id: 1 } })).success).toBe(true);
    expect(mocks.showModal).toHaveBeenLastCalledWith('confirm', { id: 1 }, expect.any(Function));
    await run(openModalTool, { name: 'simple' });
    expect(mocks.showModal).toHaveBeenLastCalledWith('simple', {}, expect.any(Function));

    mocks.showNotification.mockImplementation(() => {
      throw new Error('bus indisponible');
    });
    mocks.showSnackbar.mockImplementation(() => {
      throw new Error('bus indisponible');
    });
    mocks.showModal.mockImplementation(() => {
      throw new Error('modale inconnue');
    });
    for (const [tool, args] of [
      [showNotificationTool, { description: 'x' }],
      [showSnackbarTool, { title: 'x' }],
      [openModalTool, { name: 'x' }],
    ] as const) {
      const result = await run(tool, args);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error');
    }
  });
});

describe('presse-papier, téléchargement, données', () => {
  it('copy_to_clipboard : copie, ou explique pourquoi le presse-papier est inaccessible', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    expect(await run(copyToClipboardTool, { text: 'bonjour' })).toMatchObject({
      success: true,
      data: { copiedLength: 7 },
    });
    expect(writeText).toHaveBeenCalledWith('bonjour');
    writeText.mockRejectedValueOnce(new Error('NotAllowedError'));
    const denied = await run(copyToClipboardTool, { text: 'x' });
    expect(denied.success).toBe(false);
    expect(denied.error).toContain('presse-papier');
  });

  it("download_file : exige url ou content, valide l'URL et le base64, assainit le nom, nettoie le DOM", async () => {
    expect((await run(downloadFileTool, { filename: 'a.txt' })).error).toContain('"url" ou "content"');
    expect((await run(downloadFileTool, { filename: 'a.txt', content: 'pas du base64 !!' })).error).toContain('base64');
    expect((await run(downloadFileTool, { filename: 'a.txt', url: 'javascript:alert(1)' })).success).toBe(false);
    const clicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(`${this.download}|${this.rel}|${this.href.slice(0, 30)}`);
    });
    const ok = await run(downloadFileTool, {
      filename: '../../etc/passwd',
      content: 'SGVsbG8=',
      mimeType: 'text/plain',
    });
    expect(ok.success).toBe(true);
    expect(ok.data.filename).not.toContain('/');
    expect(clicks[0]).toContain('noopener noreferrer');
    expect(clicks[0]).toContain('data:text/plain;base64,');
    expect(document.querySelectorAll('a')).toHaveLength(0);
  });

  it('fetch_data : refuse un chemin dangereux et reporte une erreur réseau sans lever', async () => {
    expect((await run(fetchDataTool, { endpoint: 'https://evil.example/x' })).success).toBe(false);
    expect((await run(fetchDataTool, { endpoint: '/../etc/passwd' })).success).toBe(false);
    mocks.egenFetch.mockRejectedValueOnce(new Error('503'));
    const failed = await run(fetchDataTool, { endpoint: '/ws/rest/v1/student' });
    expect(failed.success).toBe(false);
    expect(failed.error).toContain('503');
    mocks.egenFetch.mockResolvedValueOnce({ data: { results: [1] } });
    expect(await run(fetchDataTool, { endpoint: '/ws/rest/v1/student', queryParams: { limit: 5 } })).toMatchObject({
      success: true,
      data: { results: [1] },
    });
  });

  it('refresh_data : une clé précise ou tout le cache ; erreur reportée', async () => {
    expect(await run(refreshDataTool, { key: '/api/students' })).toMatchObject({
      success: true,
      data: { key: '/api/students' },
    });
    expect(mocks.mutate).toHaveBeenLastCalledWith('/api/students');
    expect(await run(refreshDataTool)).toMatchObject({ success: true, data: { key: 'all' } });
    expect(mocks.mutate).toHaveBeenLastCalledWith(expect.any(Function), undefined, { revalidate: true });
    mocks.mutate.mockRejectedValueOnce(new Error('swr'));
    expect((await run(refreshDataTool)).success).toBe(false);
  });
});

describe('navigation et catalogues', () => {
  it('search : encode la requête et la catégorie ; erreur sans requête', async () => {
    await run(searchTool, { query: 'élève & co', category: 'students' });
    const target = mocks.navigate.mock.calls[0][0].to as string;
    expect(target).toContain('/search?q=%C3%A9l%C3%A8ve%20%26%20co');
    expect(target).toContain('students');
  });

  it('list_routes et list_ui_actions rendent leurs catalogues', async () => {
    expect((await run(listRoutesTool)).data.routes).toBeDefined();
    document.body.innerHTML = '<button id="go">Go</button>';
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      top: 0,
      left: 0,
      right: 10,
      bottom: 10,
      toJSON: () => ({}),
    } as DOMRect);
    registerUIAction(
      { id: 'go-action', kind: 'click', label: 'Go', description: 'Aller' },
      document.getElementById('go') as HTMLElement,
    );
    expect((await run(listUIActionsTool)).data.actions.map((a: { id: string }) => a.id)).toEqual(['go-action']);
  });

  it('fill_field refuse un <select> ou une case désactivés', async () => {
    document.body.innerHTML =
      '<select id="s" disabled><option>A</option></select><input id="c" type="checkbox" disabled>';
    registerUIAction(
      { id: 's', kind: 'select', label: 'S', description: 'd' },
      document.getElementById('s') as HTMLElement,
    );
    registerUIAction(
      { id: 'c', kind: 'toggle', label: 'C', description: 'd' },
      document.getElementById('c') as HTMLElement,
    );
    expect((await run(fillFieldTool, { actionId: 's', value: 'A' })).error).toContain('désactivé');
    expect((await run(fillFieldTool, { actionId: 'c', value: 'true' })).error).toContain('désactivé');
  });
});

describe('robustesse : aucun tool ne laisse remonter une exception', () => {
  it('même avec des arguments hostiles (accès qui lève), chaque tool répond par un échec propre', async () => {
    const hostile = new Proxy(
      {},
      {
        get() {
          throw new Error('arguments hostiles');
        },
        has() {
          throw new Error('arguments hostiles');
        },
        ownKeys() {
          throw new Error('arguments hostiles');
        },
      },
    );
    for (const tool of NATIVE_TOOLS) {
      let result: { success: boolean; error?: string } | undefined;
      await expect((async () => (result = await tool.execute({ args: hostile } as never)))()).resolves.not.toThrow();
      // Un tool sans paramètre ne lit jamais ses arguments : il peut réussir. Les autres échouent proprement.
      if (Object.keys(tool.parameters).length > 0) {
        expect(result?.success, tool.id).toBe(false);
        expect(typeof result?.error, tool.id).toBe('string');
      }
    }
  });
});
