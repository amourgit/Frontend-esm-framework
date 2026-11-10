import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import template from 'lodash-es/template';
import { describe, expect, it, vi } from 'vitest';
/* eslint-disable @typescript-eslint/no-require-imports */
const bootstrap = require('./bootstrap');
const { resolveTarget, targetWindowBridge } = require('./targets');
/* eslint-enable @typescript-eslint/no-require-imports */
const { THEME_SCRIPT, ACTIONS_SCRIPT, buildHeadBootstrap, buildBodyBootstrap, bootstrapFileName } = bootstrap;

const EJS = readFileSync(resolve(__dirname, '../src/index.ejs'), 'utf8');

/** Exécute un script du navigateur contre un `window` / `document` factices. */
function run(source: string, globals: Record<string, unknown>) {
  const names = Object.keys(globals);
  return new Function(...names, source)(...names.map((name) => globals[name]));
}

function themeAfter(source: string, storage: 'throws' | string | null) {
  const setAttribute = vi.fn();
  const localStorage = {
    getItem: () => {
      if (storage === 'throws') throw new Error('stockage interdit');
      return storage;
    },
  };
  run(source, { window: { localStorage }, document: { documentElement: { setAttribute } } });
  return setAttribute.mock.calls;
}

describe('anti-FOUC du thème : fichier natif ≡ bloc inline Web', () => {
  // Le bloc inline Web est le premier `<script>` introduit par `<% if (!egenBootstrap) { %>`.
  const inline = /<% if \(!egenBootstrap\) \{ %><script>([^]*?)<\/script>/.exec(EJS)?.[1] ?? '';

  it('retrouve bien le bloc inline du gabarit', () => {
    expect(inline).toContain("getItem('egen-theme-mode')");
  });

  it.each([['light'], ['dark'], ['blue'], [''], [null], ['throws']])(
    'même résultat pour un stockage = %j',
    (storage) => {
      expect(themeAfter(THEME_SCRIPT, storage as string | null)).toEqual(themeAfter(inline, storage as string | null));
    },
  );

  it('la valeur par défaut est « dark » ; « light » est respecté', () => {
    expect(themeAfter(THEME_SCRIPT, null)).toEqual([['data-theme', 'dark']]);
    expect(themeAfter(THEME_SCRIPT, 'light')).toEqual([['data-theme', 'light']]);
    expect(themeAfter(THEME_SCRIPT, 'throws')).toEqual([['data-theme', 'dark']]);
  });
});

describe('buildHeadBootstrap', () => {
  it('thème d’abord, puis chaque pont fourni ; les ponts absents sont ignorés', () => {
    const source = buildHeadBootstrap({
      bridges: ['{"egenTarget":"ios"}', null, undefined, false, '{"egenTenantMode":"off"}'],
    });
    expect(source.startsWith(THEME_SCRIPT)).toBe(true);
    expect(source).toContain('Object.assign(window, {"egenTarget":"ios"});');
    expect(source).toContain('Object.assign(window, {"egenTenantMode":"off"});');
    expect(source.match(/Object\.assign/g)).toHaveLength(2);
    expect(source.indexOf('egenTarget')).toBeLessThan(source.indexOf('egenTenantMode'));
  });

  it('sans pont : uniquement le thème, et pas de code qui référence un script HTML', () => {
    expect(buildHeadBootstrap()).toBe(THEME_SCRIPT + '\n');
    expect(buildHeadBootstrap({ bridges: ['{"a":1}'] })).not.toMatch(/<\/?script/i);
  });

  it('le pont egenTarget produit un code qui pose bien window.egenTarget', () => {
    const win: Record<string, unknown> = { localStorage: { getItem: () => null } };
    const bridge = JSON.stringify(targetWindowBridge(resolveTarget(nativeEnv())));
    run(buildHeadBootstrap({ bridges: [bridge] }), {
      window: win,
      document: { documentElement: { setAttribute() {} } },
    });
    expect(win.egenTarget).toBe('android');
  });
});

function nativeEnv() {
  return {
    EGEN_TARGET: 'android',
    EGEN_ENV: 'production',
    EGEN_API_URL: 'https://api.exemple.ga/egen',
    EGEN_ESM_IMPORTMAP: '{"imports":{"@egen/x":"./x.js"}}',
    EGEN_ROUTES: '{"@egen/x":{}}',
  };
}

describe('buildBodyBootstrap', () => {
  const base = { apiUrl: '/egen', spaPath: '/app', env: 'production', offline: false, configUrls: '' };

  it('appelle initializeSpa avec les mêmes valeurs que le bloc inline Web', () => {
    const initializeSpa = vi.fn();
    run(buildBodyBootstrap({ ...base, configUrls: '"a.json","b.json"' }), {
      initializeSpa,
      document: { addEventListener() {} },
    });
    expect(initializeSpa).toHaveBeenCalledWith({
      apiUrl: '/egen',
      spaPath: '/app',
      env: 'production',
      offline: false,
      configUrls: ['a.json', 'b.json'],
    });
  });

  it('offline est un booléen littéral, jamais une chaîne', () => {
    const initializeSpa = vi.fn();
    run(buildBodyBootstrap({ ...base, offline: true }), { initializeSpa, document: { addEventListener() {} } });
    expect(initializeSpa.mock.calls[0][0].offline).toBe(true);
  });

  it("serviceWorker : omis, il n'est pas émis (initializeSpa le fait suivre offline) ; explicite, il est un booléen littéral", () => {
    const run1 = vi.fn();
    run(buildBodyBootstrap({ ...base, offline: true }), { initializeSpa: run1, document: { addEventListener() {} } });
    expect(run1.mock.calls[0][0]).not.toHaveProperty('serviceWorker');

    const run2 = vi.fn();
    run(buildBodyBootstrap({ ...base, offline: true, serviceWorker: false }), {
      initializeSpa: run2,
      document: { addEventListener() {} },
    });
    expect(run2.mock.calls[0][0]).toMatchObject({ offline: true, serviceWorker: false });

    const run3 = vi.fn();
    run(buildBodyBootstrap({ ...base, offline: false, serviceWorker: true }), {
      initializeSpa: run3,
      document: { addEventListener() {} },
    });
    expect(run3.mock.calls[0][0]).toMatchObject({ offline: false, serviceWorker: true });
  });

  it('échappe les chaînes (aucune injection de code par une valeur de configuration)', () => {
    const initializeSpa = vi.fn();
    const hostile = '"});alert(1);({"';
    run(buildBodyBootstrap({ ...base, apiUrl: hostile }), { initializeSpa, document: { addEventListener() {} } });
    expect(initializeSpa).toHaveBeenCalledTimes(1);
    expect(initializeSpa.mock.calls[0][0].apiUrl).toBe(hostile);
  });
});

describe('actions du gabarit d’erreur (remplacent onclick)', () => {
  function setup() {
    let listener: (event: unknown) => void = () => {};
    const reload = vi.fn();
    const copyText = vi.fn();
    run(ACTIONS_SCRIPT, {
      document: { addEventListener: (_: string, fn: (event: unknown) => void) => (listener = fn) },
      location: { reload },
      window: { copyText },
    });
    const click = (action: string | null, parent: unknown = {}) =>
      listener({
        target: { closest: () => (action ? { getAttribute: () => action, parentElement: parent } : null) },
      });
    return { click, reload, copyText };
  }

  it('reload → location.reload()', () => {
    const { click, reload } = setup();
    click('reload');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('copy → window.copyText(parent du bouton), comme onclick="copyText(this.parentElement)"', () => {
    const { click, copyText } = setup();
    const parent = { id: 'snippet' };
    click('copy', parent);
    expect(copyText).toHaveBeenCalledWith(parent);
  });

  it('un clic hors d’une action, ou une action inconnue, ne fait rien', () => {
    const { click, reload, copyText } = setup();
    click(null);
    click('inconnue');
    expect(reload).not.toHaveBeenCalled();
    expect(copyText).not.toHaveBeenCalled();
  });
});

describe('bootstrapFileName', () => {
  it('nom stable pour un même contenu, différent dès que le contenu change', () => {
    expect(bootstrapFileName('head', 'a')).toBe(bootstrapFileName('head', 'a'));
    expect(bootstrapFileName('head', 'a')).not.toBe(bootstrapFileName('head', 'b'));
    expect(bootstrapFileName('head', 'a')).toMatch(/^bootstrap-head\.[0-9a-f]{16}\.js$/);
    expect(bootstrapFileName('body', 'a')).toMatch(/^bootstrap\.[0-9a-f]{16}\.js$/);
  });
});

/**
 * Rendu RÉEL du gabarit `index.ejs` (même moteur que HtmlWebpackPlugin) pour les deux cibles : tests de build B7.
 */
describe('index.ejs rendu', () => {
  const render = (overrides: Record<string, unknown>) =>
    template(EJS)({
      egenDefaultLocale: 'fr',
      egenPageTitle: 'EGEN',
      egenFavicon: '/app/favicon.ico',
      egenPublicPath: '/app',
      egenCssFilename: 'egen.css',
      htmlWebpackPlugin: { tags: { headTags: '<script src="/app/egen.js"></script>', bodyTags: '' } },
      egenExtraAssets: [],
      egenImportmapDef: '{"imports":{"@egen/x":"./x.js"}}',
      egenImportmapUrl: '/app/importmap.json',
      egenRoutesDef: '{"@egen/x":{}}',
      egenRoutesUrl: '/app/routes.registry.json',
      egenCoreImportmap: false,
      egenCoreRoutes: false,
      egenAiConfigDef: '{"egenAiEnabled":true}',
      egenTenantConfigDef: '{"egenTenantMode":"off"}',
      egenTargetConfigDef: null,
      egenApiUrl: '/egen',
      egenEnvironment: 'production',
      egenOffline: false,
      egenConfigUrls: '',
      egenCsp: null,
      egenBootstrap: null,
      ...overrides,
    });

  const target = resolveTarget(nativeEnv());
  const nativeHtml = render({
    egenTargetConfigDef: JSON.stringify(targetWindowBridge(target)),
    egenCsp: target.csp,
    egenBootstrap: { head: 'bootstrap-head.aaaa.js', body: 'bootstrap.bbbb.js' },
  });
  const webHtml = render({});

  const scripts = (html: string) =>
    [...html.matchAll(/<script\b([^>]*)>([^]*?)<\/script>/g)].map(([, attributes, body]) => ({ attributes, body }));
  const isExecutableInline = ({ attributes }: { attributes: string }) =>
    !/\bsrc=/.test(attributes) && !/type="(systemjs-importmap|egen-routes)"/.test(attributes);

  describe('Web : inchangé', () => {
    it('garde ses scripts et gestionnaires inline, sans CSP', () => {
      expect(webHtml).not.toContain('Content-Security-Policy');
      expect(webHtml).toContain("getItem('egen-theme-mode')");
      expect(webHtml).toContain('initializeSpa({');
      expect(webHtml).toContain('onclick="location.reload()"');
      expect(webHtml).toContain('onclick="copyText(this.parentElement)"');
      expect(webHtml).toContain('Object.assign(window, {"egenAiEnabled":true});');
      expect(webHtml).not.toContain('data-egen-action');
      expect(webHtml).not.toContain('bootstrap');
    });

    it('rendu de référence : le HTML Web ne change pas (règle R2)', () => {
      // Le gabarit natif (egenBootstrap) a été ajouté SANS toucher au rendu Web : ce rendu a été comparé octet pour octet
      // à celui du gabarit précédent sur 32 combinaisons de paramètres avant d'être figé. Toute modification
      // volontaire du HTML Web doit mettre ce fichier à jour (`vitest -u`) et être justifiée en revue.
      expect(webHtml).toMatchSnapshot();
    });

    it('ne pose pas le pont egenTarget (cible web)', () => {
      expect(webHtml).not.toContain('egenTarget');
    });
  });

  describe("natif : compatible avec script-src 'self'", () => {
    it('ne contient AUCUN script exécutable inline', () => {
      expect(scripts(nativeHtml).filter(isExecutableInline)).toEqual([]);
    });

    it('ne contient AUCUN gestionnaire d’événement inline (onclick, onload…)', () => {
      expect(nativeHtml).not.toMatch(/\son[a-z]+\s*=/i);
      expect(nativeHtml).toContain('data-egen-action="reload"');
      expect(nativeHtml).toContain('data-egen-action="copy"');
    });

    it('ne référence ni service worker ni import map / routes distantes', () => {
      expect(nativeHtml).not.toContain('service-worker');
      expect(nativeHtml).not.toContain('/importmap.json');
      expect(nativeHtml).not.toContain('routes.registry.json');
      expect(scripts(nativeHtml).filter((s) => /\bsrc=/.test(s.attributes) && /type=/.test(s.attributes))).toEqual([]);
    });

    it('pose la CSP issue de resolveTarget, avant tout script', () => {
      const csp = `<meta http-equiv="Content-Security-Policy" content="${target.csp}">`;
      expect(nativeHtml).toContain(csp);
      expect(nativeHtml.indexOf(csp)).toBeLessThan(nativeHtml.indexOf('<script'));
      expect(target.csp).not.toContain('unsafe-eval');
    });

    it('charge le démarrage de tête avant les bundles, et initializeSpa après', () => {
      const head = nativeHtml.indexOf('src="/app/bootstrap-head.aaaa.js"');
      const bundle = nativeHtml.indexOf('src="/app/egen.js"');
      const body = nativeHtml.indexOf('src="/app/bootstrap.bbbb.js"');
      expect(head).toBeGreaterThan(-1);
      expect(head).toBeLessThan(bundle);
      expect(bundle).toBeLessThan(body);
    });

    it('les ponts window.egen* ne sont plus inline (ils sont dans le fichier de tête)', () => {
      expect(nativeHtml).not.toContain('Object.assign(window');
      expect(nativeHtml).not.toContain('initializeSpa(');
    });

    it('garde les blocs de DONNÉES inline (non exécutables, hors CSP) lus par SystemJS et le registre de routes', () => {
      const types = scripts(nativeHtml).map((s) => /type="([^"]+)"/.exec(s.attributes)?.[1]);
      expect(types).toContain('systemjs-importmap');
      expect(types).toContain('egen-routes');
    });
  });
});
