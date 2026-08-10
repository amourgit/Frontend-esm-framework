import { start, triggerAppChange } from 'single-spa';
import { setupThemeEngine } from '@egen/esm-theme';
import { setupTenantSystem } from '@egen/esm-tenant';
import { type CalendarIdentifier } from '@internationalized/date';
import {
  activateOfflineCapability,
  dispatchConnectivityChanged,
  dispatchPrecacheStaticDependencies,
  type ExtensionDefinition,
  finishRegisteringAllApps,
  fireEgenEvent,
  getConfig,
  getCurrentPageMap,
  getCurrentRouteMap,
  getCurrentUser,
  integrateBreakpoints,
  interpolateUrl,
  messageEgenServiceWorker,
  egenFetch,
  provide,
  registerApp,
  registerDefaultCalendar,
  registerEgenServiceWorker,
  renderActionableNotifications,
  renderInlineNotifications,
  renderLoadingSpinner,
  renderSnackbars,
  renderToasts,
  renderWorkspaceWindowsAndMenu,
  restBaseUrl,
  setupApiModule,
  setupHistory,
  setupImportMapOverrides,
  setupModals,
  setupRouteMapOverrides,
  showActionableNotification,
  showNotification,
  showSnackbar,
  showToast,
  subscribeActionableNotificationShown,
  subscribeConnectivity,
  subscribeNotificationShown,
  subscribePrecacheStaticDependencies,
  subscribeSnackbarShown,
  subscribeToastShown,
  tryRegisterExtension,
  type Config,
  type StyleguideConfigObject,
} from '@egen/esm-framework/src/internal';
import { initDevAuthBypass } from '@egen/esm-api';
import { setupI18n } from './locale';
import './routing-events';
import './events';
import { appName, getCoreExtensions } from './ui';
import { setupCoreConfig } from './core-config';

// =============================================================================
//  EGEN_DEV_NO_AUTH — Bypass d'authentification pour tests sans backend
//
//  Activé en positionnant EGEN_DEV_NO_AUTH=true dans l'environnement de build.
//  En production réelle ce flag sera absent (false), donc ce bloc est inerte.
//
//  Effets quand activé :
//    1. Désactive la redirection 401 → /login dans egenFetch
//       (via override config @egen/esm-api.redirectAuthFailure.enabled)
//    2. Injecte une session admin fictive dans le sessionStore global
//       pour que les composants qui appellent useSession() reçoivent un
//       utilisateur authentifié sans appel réseau.
// =============================================================================
//  EGEN_DEV_NO_AUTH — Bypass d'authentification pour tests sans backend
//
//  Activé via EGEN_DEV_NO_AUTH=true dans le .env (injecté par rspack DefinePlugin).
//
//  La logique est centralisée dans @egen/esm-api → initDevAuthBypass() :
//    1. Intercepte window.fetch pour /ws/rest/v1/session → retourne session fictive
//       (empêche getSessionStore() de détruire la session via refetchCurrentUser)
//    2. Injecte la session fictive dans sessionStore (composants React immédiats)
//    3. Désactive la redirection 401→/login dans egenFetch
// =============================================================================

function applyDevNoAuthBypass() {
  // initDevAuthBypass() est no-op si EGEN_DEV_NO_AUTH !== 'true'
  initDevAuthBypass();

  if (process.env.EGEN_DEV_NO_AUTH === 'true') {
    // Désactiver la redirection 401 → /login dans egenFetch (couche réseau)
    provide(
      {
        '@egen/esm-api': {
          redirectAuthFailure: {
            enabled: false,
            url: '',
            errors: [],
            resolvePromise: true,
          },
        },
      },
      'egen-dev-no-auth-config',
    );
  }
}

// @internal
// used to track when the window.installedModules global is finalised
// so we can pre-load all modules
const REGISTRATION_PROMISES = Symbol('egen_registration_promises');

/**
 * Sets up the frontend modules (apps). Uses the defined export
 * from the root modules of the apps. This is done by reading the
 * list of apps from the routes.registry.json file, which serves
 * as the registry of all apps in the application.
 */
async function setupApps() {
  await setupRouteMapOverrides();
  const routes = await getCurrentRouteMap();

  const modules: typeof window.installedModules = [];
  const registrationPromises = Object.entries(routes).map(async ([module, appRoutes]) => {
    modules.push([module, appRoutes]);
    registerApp(module, appRoutes);
  });

  window[REGISTRATION_PROMISES] = Promise.all(registrationPromises);
  Object.defineProperty(window, 'installedModules', {
    value: modules,
    writable: false,
    configurable: false,
  });
}

/**
 * Loads the provided configurations and sets them in the system.
 */
async function loadConfigs(configs: Array<{ name: string; value: Config }>) {
  for (const config of configs) {
    provide(config.value, config.name);
  }
}

/**
 * Invoked when the connectivity is changed.
 */
function connectivityChanged() {
  if (!window.offlineEnabled) {
    return;
  }

  const online = navigator.onLine;
  // NB We do not wait for this to be done; it is simply scheduled
  triggerAppChange();

  dispatchConnectivityChanged(online);
  showToast({
    critical: true,
    description: `Connection: ${online ? 'online' : 'offline'}`,
    title: 'App',
    kind: online ? 'success' : 'warning',
  });
}

/**
 * Runs the shell by importing the translations and starting single SPA.
 */
async function runShell() {
  return setupI18n()
    .catch((err) => console.error(`Failed to initialize translations`, err))
    .then(async () => {
      const { preferredCalendar } = await getConfig<StyleguideConfigObject>('@egen/esm-styleguide');

      for (const entry of Object.entries(preferredCalendar)) {
        registerDefaultCalendar(entry[0], entry[1] as CalendarIdentifier);
      }
    })
    .then(() => start());
}

function handleInitFailure(e: Error) {
  console.error(e);
  renderFatalErrorPage(e);
}

function renderFatalErrorPage(e?: Error) {
  const template = document.querySelector<HTMLTemplateElement>('#app-error');

  if (template) {
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const messageContainer = fragment.querySelector('[data-var="message"]');

    if (messageContainer) {
      messageContainer.textContent = e?.message || 'No additional information available.';
    }

    if (
      localStorage.getItem('egen:devtools') &&
      Object.keys(localStorage).some((k) => k.startsWith('import-map-override:'))
    ) {
      const appErrorActionButtons = fragment?.querySelector('#buttons');
      if (appErrorActionButtons) {
        const clearDevOverridesButton = document.createElement('button');
        clearDevOverridesButton.className = 'cds--btn';
        clearDevOverridesButton.innerHTML = 'Clear dev overrides';
        clearDevOverridesButton.onclick = clearDevOverrides;
        appErrorActionButtons.appendChild(clearDevOverridesButton);
      }
    }

    document.body.appendChild(fragment);
  }
}

function clearDevOverrides() {
  const keysToRemove = Object.keys(localStorage).filter(
    (key) =>
      key.startsWith('import-map-override:') &&
      !['import-map-override:react', 'import-map-override:react-dom'].includes(key),
  );
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  location.reload();
}

function createConfigLoader(configUrls: Array<string>) {
  const loadingConfigs = Promise.all(
    configUrls.map((configUrl) => {
      const interpolatedUrl = interpolateUrl(configUrl);
      return fetch(interpolatedUrl)
        .then((res) => res.json())
        .then((config) => ({
          name: configUrl,
          value: config,
        }))
        .catch((err) => {
          console.error(`Loading the config from "${configUrl}" failed.`, err);
          return {
            name: configUrl,
            value: {},
          };
        });
    }),
  );
  return () => loadingConfigs.then(loadConfigs);
}

function showNotifications() {
  renderInlineNotifications(document.querySelector('.egen-inline-notifications-container'));
  return;
}

function showActionableNotifications() {
  renderActionableNotifications(document.querySelector('.egen-actionable-notifications-container'));
}

function showToasts() {
  renderToasts(document.querySelector('.egen-toasts-container'));
}

function showWorkspacesAndActionMenu() {
  renderWorkspaceWindowsAndMenu(document.querySelector('#egen-workspaces-container'));
}

function showSnackbars() {
  renderSnackbars(document.querySelector('.egen-snackbars-container'));
}

function showModals() {
  setupModals(document.querySelector('.egen-modals-container'));
}

function showLoadingSpinner() {
  return renderLoadingSpinner(document.body);
}

/**
 * Registers the extensions coming from the app shell itself.
 */
function registerCoreExtensions() {
  const extensions = getCoreExtensions();
  for (const extension of extensions) {
    // FIXME This "core extensions" concept should likely be retired
    tryRegisterExtension(appName, extension as unknown as ExtensionDefinition);
  }
}

async function setupOffline() {
  try {
    await registerEgenServiceWorker(`${window.getEgenSpaBase()}service-worker.js`);
    await activateOfflineCapability();
    setupOfflineStaticDependencyPrecaching();
  } catch (error) {
    console.error('Error while setting up offline mode.', error);
    showNotification({
      kind: 'error',
      title: 'Offline Setup Error',
      description: error.message,
    });
  }
}

function setupOfflineStaticDependencyPrecaching() {
  const precacheDelay = 1000 * 60 * 5;
  let lastPrecache: Date | null = null;

  subscribeOnlineAndLoginChange((online, hasLoggedInUser) => {
    const hasExceededPrecacheDelay = !lastPrecache || new Date().getTime() - lastPrecache.getTime() > precacheDelay;

    if (hasLoggedInUser && online && hasExceededPrecacheDelay) {
      lastPrecache = new Date();
      dispatchPrecacheStaticDependencies();
    }
  });
}

function subscribeOnlineAndLoginChange(cb: (online: boolean, hasLoggedInUser: boolean) => void) {
  let isOnline = false;
  let hasLoggedInUser = false;

  getCurrentUser({ includeAuthStatus: false }).subscribe((user) => {
    hasLoggedInUser = !!user;
    cb(isOnline, hasLoggedInUser);
  });

  subscribeConnectivity(({ online }) => {
    isOnline = online;
    cb(online, hasLoggedInUser);
  });
}

async function precacheGlobalStaticDependencies() {
  await precacheImportMap();

  // By default, cache the session endpoint.
  // This ensures that a lot of user/session related functions also work offline.
  const sessionPathUrl = new URL(`${window.egenBase}${restBaseUrl}/session`, window.location.origin).href;

  await messageEgenServiceWorker({
    type: 'registerDynamicRoute',
    url: sessionPathUrl,
    strategy: 'network-first',
  });

  await egenFetch(`${restBaseUrl}/session`).catch((e) =>
    console.warn(
      'Failed to precache the user session data from the app shell. MFs depending on this data may run into problems while offline.',
      e,
    ),
  );
}

async function precacheImportMap() {
  const importMap = await getCurrentPageMap();
  await messageEgenServiceWorker({
    type: 'onImportMapChanged',
    importMap,
  });
}

function registerOfflineHandlers() {
  window.addEventListener('offline', connectivityChanged);
  window.addEventListener('online', connectivityChanged);
}

function setupOfflineCssClasses() {
  subscribeConnectivity(({ online }) => {
    const body = document.querySelector('body')!;
    if (online) {
      body.classList.remove('egen-offline');
    } else {
      body.classList.add('egen-offline');
    }
  });
}

export function run(configUrls: Array<string>) {
  // Doit être appelé en tout premier — avant tout fetch réseau et toute
  // initialisation d'app — pour que le config override et la session fictive
  // soient en place avant que les modules ne les lisent.
  applyDevNoAuthBypass();

  setupImportMapOverrides();

  const offlineEnabled = window.offlineEnabled;
  const closeLoading = showLoadingSpinner();
  const provideConfigs = createConfigLoader(configUrls);

  // ── Moteur de thème EGEN : initialisation anticipée ──────────────────────
  // Démarrer le moteur en parallèle de l'import styleguide.
  // Les URLs de thème peuvent être surchargées via window.egenThemeUrls (optionnel).
  // Le thème par défaut (theme.default.json) est toujours chargé en premier.
  // ── Construction des URLs de thème ──────────────────────────────────────
  // On NE PEUT PAS utiliser `new URL('./assets/themes/...', import.meta.url)`
  // dans un bundle rspack : import.meta.url pointe vers le fichier bundle JS,
  // et la résolution relative rate la destination réelle du CopyPlugin
  // (qui copie src/assets/* → dist/* SANS le préfixe 'assets/').
  //
  // On utilise à la place une URL construite depuis la racine de la page :
  //   - document.baseURI  → respecte la balise <base> si présente
  //   - window.egenPublicPath → injecté par le serveur si le contexte est sous-chemin
  //
  // Le fichier est accessible à : <publicPath>/themes/theme.default.json
  function resolveThemeUrl(filename: string): string {
    const publicPath: string =
      (window as any).egenPublicPath ??
      (window as any).__webpack_public_path__ ??
      '';
    const base = publicPath
      ? `${window.location.origin}/${publicPath.replace(/^\/|\/$/g, '')}/`
      : document.baseURI || `${window.location.origin}/`;
    return new URL(`themes/${filename}`, base).href;
  }

  const themeUrls: string[] = [
    // Thème par défaut (priority=1) — toujours chargé
    resolveThemeUrl('theme.default.json'),
    // Surcharge optionnelle tenant/marque : window.egenThemeUrls[] (priority>1)
    ...(Array.isArray((window as any).egenThemeUrls) ? (window as any).egenThemeUrls : []),
  ];

  const themeReady = setupThemeEngine({
    themeUrls,
    // Hot-reload uniquement en développement
    pollIntervalMs: process.env.NODE_ENV === 'development' ? 4000 : 0,
    onApplied: (theme, cssVars) => {
      if (process.env.NODE_ENV !== 'production') {
        const name = theme.schema?.meta?.name ?? theme.url;
        const count =
          Object.keys(cssVars.base).length + Object.keys(cssVars.light).length + Object.keys(cssVars.dark).length;
        // eslint-disable-next-line no-console
        console.info(`[egen/esm-theme] ✅ Thème appliqué : "${name}" (${count} vars CSS)`);
      }
    },
    onError: (err) => {
      console.warn('[egen/esm-theme] Le thème par défaut sera utilisé.', err.message);
    },
  }).catch((err) => {
    // Erreur non bloquante : l'app démarre quand même avec les fallbacks SCSS
    console.warn('[egen/esm-theme] Initialisation thème échouée (fallback SCSS actif):', err);
  });

  // ── Tenant system setup ─────────────────────────────────────────────────
  // Initialisé juste avant le boot des apps. COMPLÈTEMENT INERTE si
  // EGEN_TENANT_MODE="off" ou absent — zéro overhead.
  //
  // Configuration (voir @egen/esm-tenant/src/config/env.ts pour le détail) :
  //   .env (build)      → EGEN_TENANT_MODE=multi | single | off, etc.
  //   window.* (runtime) → window.egenTenantMode = 'multi' (pont injecté par
  //                        rspack.config.js + index.ejs, seul canal
  //                        fonctionnel — pas d'import.meta.env dans ce build)
  //   setupTenantSystem  → options inline ci-dessous (priorité maximale)
  //
  // Rôle STRICT de ce système : capturer l'ID tenant depuis l'URL (sous-
  // domaine) et le rendre disponible dans le store global + `X-Tenant-ID`
  // sur chaque requête backend (voir @egen/esm-api). AUCUNE validation
  // frontend (existence, statut, thème, permissions) — c'est une
  // responsabilité backend. 100% synchrone, ne peut pas échouer : pas de
  // `.catch()` nécessaire, pas de registry à charger.
  setupTenantSystem();

  return Promise.all([import('@egen/esm-styleguide/src/index'), themeReady]).then(([_styleguide]) => {
    integrateBreakpoints();
    showToasts();
    showModals();
    showNotifications();
    showActionableNotifications();
    showSnackbars();
    showWorkspacesAndActionMenu();
    subscribeNotificationShown(showNotification);
    subscribeActionableNotificationShown(showActionableNotification);
    subscribeToastShown(showToast);
    subscribeSnackbarShown(showSnackbar);
    subscribePrecacheStaticDependencies(precacheGlobalStaticDependencies);
    setupApiModule();
    setupHistory();
    registerCoreExtensions();
    setupCoreConfig();

    const polyfillReady =
      typeof Intl !== 'undefined' && 'DurationFormat' in Intl
        ? Promise.resolve()
        : import(
            /* webpackChunkName: "intl-durationformat-polyfill" */
            '@formatjs/intl-durationformat/lib/polyfill'
          ).then(() => undefined);

    return polyfillReady
      .then(setupApps)
      .then(() => Promise.resolve(finishRegisteringAllApps()))
      .then(offlineEnabled ? setupOfflineCssClasses : undefined)
      .then(offlineEnabled ? registerOfflineHandlers : undefined)
      .then(provideConfigs)
      .then(runShell)
      .catch(handleInitFailure)
      .then(closeLoading)
      .then(offlineEnabled ? setupOffline : undefined)
      .then(() => {
        // intentionally not returned so that processing the "started" event doesn't block
        fireEgenEvent('started');
      });
  });
}
