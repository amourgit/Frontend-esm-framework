import type { SpaConfig } from '@egen-civitas/esm-framework/src/internal';
import { setupPaths } from './paths.js';

export function setupUtils() {
  Object.defineProperty(window, 'copyText', {
    value: (source: HTMLElement) => {
      const sel = window.getSelection();

      if (sel) {
        const r = document.createRange();
        r.selectNode(source);
        sel.removeAllRanges();
        sel.addRange(r);
        document.execCommand('copy');
        sel.removeAllRanges();
      }
    },
    writable: false,
    configurable: false,
  });
}

function wireSpaPaths() {
  const baseElement = document.createElement('base');
  const baseHref = window.getEgenSpaBase();
  baseElement.href = baseHref;
  document.head.appendChild(baseElement);
  __webpack_public_path__ = baseHref;
}

let initPromise: Promise<void> | null = null;

/**
 * Initializes the Egen Frontend App Shell.
 * @param config The global configuration to apply.
 */
function initializeSpa(config: SpaConfig) {
  if (initPromise) {
    return initPromise;
  }

  setupUtils();
  setupPaths(config);
  wireSpaPaths();
  initPromise = Promise.resolve(__webpack_init_sharing__('default')).then(async () => {
    const shareScope = __webpack_share_scopes__.default;
    // MF will deduplicate these as they're aliased at build time, but at runtime
    // apps try to load `@egen-civitas/esm-framework`, so here we provide a runtime
    // alias that resolves to the "internal" copy of the framework
    if (shareScope['@egen-civitas/esm-framework/src/internal'] && !shareScope['@egen-civitas/esm-framework']) {
      shareScope['@egen-civitas/esm-framework'] = shareScope['@egen-civitas/esm-framework/src/internal'];
    }

    // `serviceWorker` est indépendant de `offline` ; absent, il suit `offline` (comportement historique).
    const { configUrls = [], offline = false, serviceWorker = offline } = config;
    Object.defineProperty(window, 'offlineEnabled', {
      value: offline,
      writable: false,
      configurable: false,
    });
    Object.defineProperty(window, 'serviceWorkerEnabled', {
      value: serviceWorker,
      writable: false,
      configurable: false,
    });

    const { run } = await import(/* webpackPreload: true */ './run');
    return run(configUrls);
  });
  return initPromise;
}

Object.defineProperty(window, 'initializeSpa', {
  value: initializeSpa,
  writable: false,
  configurable: false,
});
