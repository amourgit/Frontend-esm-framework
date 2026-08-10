import type { SpaConfig } from '@egen/esm-framework/src/internal';

function _createSpaBase(baseUrl: string) {
  return () => baseUrl;
}

function setupPaths(config: SpaConfig) {
  let error = false;
  if (!config.apiUrl) {
    console.error(
      'initializeSpa() was called without supplying an apiUrl. This means that the application cannot communicate with the backend.',
    );
    error = true;
  }

  if (!config.spaPath) {
    console.error(
      'initializeSpa() was called without supplying a spaPath. This means that the application cannot properly generate urls.',
    );
    error = true;
  }

  if (error) {
    throw new Error(
      'One or more required properties in the basic configuration of the application was missing and the application cannot be rendered. Please see the browser console for details.',
    );
  }

  // Object.defineProperty used to make these read-only
  Object.defineProperty(window, 'egenBase', {
    value: config.apiUrl,
    writable: false,
    configurable: false,
  });
  Object.defineProperty(window, 'spaBase', {
    value: config.spaPath,
    writable: false,
    configurable: false,
  });
  Object.defineProperty(window, 'spaEnv', {
    value: config.env || 'production',
    writable: false,
    configurable: false,
  });
  Object.defineProperty(window, 'spaVersion', {
    value: process.env.BUILD_VERSION ?? 'local',
    writable: false,
    configurable: false,
  });

  const spaBaseWithSlash = window.spaBase.endsWith('/') ? window.spaBase : window.spaBase + '/';
  Object.defineProperty(window, 'getEgenSpaBase', {
    value: _createSpaBase(spaBaseWithSlash),
    writable: false,
    configurable: false,
  });
}

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
    // apps try to load `@egen/esm-framework`, so here we provide a runtime
    // alias that resolves to the "internal" copy of the framework
    if (shareScope['@egen/esm-framework/src/internal'] && !shareScope['@egen/esm-framework']) {
      shareScope['@egen/esm-framework'] = shareScope['@egen/esm-framework/src/internal'];
    }

    const { configUrls = [], offline = false } = config;
    Object.defineProperty(window, 'offlineEnabled', {
      value: offline,
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
