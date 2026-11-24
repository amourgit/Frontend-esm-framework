import { setupLayoutHeightSync } from './layout-sync';
import { start, triggerAppChange } from 'single-spa';
import { setupTheme } from '@egen-civitas/esm-theme';
import { setupTenantSystem } from '@egen-civitas/esm-tenant';
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
  invertAliases,
  integrateBreakpoints,
  interpolateUrl,
  messageEgenServiceWorker,
  egenFetch,
  provide,
  registerApp,
  registerDefaultCalendar,
  getPlatform,
  registerPlatformCapabilities,
  registerEgenServiceWorker,
  renderActionableNotifications,
  renderInlineNotifications,
  renderLoadingSpinner,
  renderPageBackground,
  renderSnackbars,
  setupPageTransitions,
  renderToasts,
  renderWorkbench,
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
} from '@egen-civitas/esm-framework/src/internal';
import { initDevAuthBypass, isDevAuthBypassEnabled, setAuthorizationProvider } from '@egen-civitas/esm-api';
import { setupI18n } from './locale.js';
import './routing-events.js';
import './events.js';
import { appName, getCoreExtensions } from './ui/index.js';
import { setupCoreConfig } from './core-config.js';
import { bindPlatformSession } from './native-session.js';
import { resolveApiUrl } from './paths.js';
import { HostIncompatibleError, isHostIncompatible, renderHostIncompatibleScreen } from './host-incompatible.js';
import { setupOfflineMode } from './offline-setup.js';

// =============================================================================
//  Bypass d'authentification pour tests sans backend
//
//  Activé via window.egenDevNoAuth === true (posé au runtime par
//  `egen develop`) OU process.env.EGEN_DEV_NO_AUTH === 'true' (build-time,
//  DefinePlugin) — voir isDevAuthBypassEnabled() dans
//  @egen-civitas/esm-api/src/dev-auth-bypass.ts pour le détail des deux
//  canaux et pourquoi le premier existe (esm-app-shell est un paquet
//  pré-compilé côté app consommatrice : le build-time seul n'y suffit plus).
//  En production réelle aucun des deux canaux n'est actif, donc ce bloc est
//  inerte.
//
//  La logique est centralisée dans @egen-civitas/esm-api :
//    - initDevAuthBypass() :
//        1. Intercepte window.fetch pour /ws/rest/v1/session → retourne
//           session fictive (empêche getSessionStore() de détruire la
//           session via refetchCurrentUser)
//        2. Injecte la session fictive dans sessionStore (composants React
//           immédiats)
//    - isDevAuthBypassEnabled() : source de vérité unique, réutilisée
//      ci-dessous pour décider aussi de désactiver la redirection 401→/login.
// =============================================================================

function applyDevNoAuthBypass() {
  // initDevAuthBypass() est no-op si le bypass n'est pas activé.
  initDevAuthBypass();

  if (isDevAuthBypassEnabled()) {
    // Désactiver la redirection 401 → /login dans egenFetch (couche réseau)
    provide(
      {
        '@egen-civitas/esm-api': {
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
/**
 * Rend les capacités de plateforme consultables AVANT l'enregistrement des apps (filtrage `requiredCapabilities`).
 * Un Host manquant ou incompatible ne bloque pas le démarrage ici (l'écran d'incompatibilité relève de C5) :
 * aucune capacité n'est alors supposée, donc les apps qui en exigent sont simplement écartées.
 */
function setupPlatform() {
  return registerPlatformCapabilities().catch((error) => {
    console.error('[egen] Les capacités de plateforme ne sont pas disponibles :', error);
    // Host natif manquant ou incompatible : on n'enregistre AUCUNE app, le démarrage s'arrête sur un écran bloquant.
    if (isHostIncompatible(error)) {
      throw error instanceof HostIncompatibleError ? error : new HostIncompatibleError(error.message);
    }
  });
}

async function setupApps() {
  await setupRouteMapOverrides();
  const routes = await getCurrentRouteMap();

  // Alias de l'import map (alias -> nom du paquet) : une app est enregistrée dans le système de configuration sous son
  // nom de paquet ET sous ses alias (son espace de noms de traduction/configuration). Une table illisible ne doit pas
  // empêcher le démarrage : les apps sont alors enregistrées sous leur seul nom de paquet, comme avant.
  let aliasesByApp = new Map<string, Array<string>>();
  try {
    aliasesByApp = invertAliases((await getCurrentPageMap()).aliases);
  } catch (error) {
    console.warn("[egen] Table d'alias de l'import map illisible, alias ignorés :", error);
  }

  const modules: typeof window.installedModules = [];
  const registrationPromises = Object.entries(routes).map(async ([module, appRoutes]) => {
    modules.push([module, appRoutes]);
    registerApp(module, appRoutes, aliasesByApp.get(module));
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
      const { preferredCalendar } = await getConfig<StyleguideConfigObject>('@egen-civitas/esm-styleguide');

      for (const entry of Object.entries(preferredCalendar)) {
        registerDefaultCalendar(entry[0], entry[1] as CalendarIdentifier);
      }
    })
    .then(() => start());
}

function handleInitFailure(e: Error) {
  console.error(e);
  if (isHostIncompatible(e)) {
    renderHostIncompatibleScreen(e);
    return;
  }
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
        clearDevOverridesButton.className = 'egen-btn';
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

function showPageBackground() {
  renderPageBackground(document.querySelector('#egen-page-background-container'));
}

function showWorkbench() {
  renderWorkbench({
    railLeft: document.querySelector('#egen-rail-left-container'),
    railRight: document.querySelector('#egen-rail-right-container'),
    zoneLeft: document.querySelector('#egen-zone-left-container'),
    zoneRight: document.querySelector('#egen-zone-right-container'),
    zoneBottom: document.querySelector('#egen-zone-bottom-container'),
  });
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
    await setupOfflineMode({
      serviceWorkerEnabled: window.serviceWorkerEnabled,
      registerServiceWorker: () => registerEgenServiceWorker(`${window.getEgenSpaBase()}service-worker.js`),
      activateOfflineCapability,
      startStaticDependencyPrecaching: setupOfflineStaticDependencyPrecaching,
    });
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
  const sessionPathUrl = resolveApiUrl(`${restBaseUrl}/session`);

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

  // Natif : le fournisseur d'autorisation (jeton du Host) doit être posé AVANT tout appel réseau, car
  // `setupApiModule()` lance `refetchCurrentUser()` immédiatement. Inerte en Web. Voir native-session.ts.
  bindPlatformSession(getPlatform(), setAuthorizationProvider);

  setupImportMapOverrides();

  const offlineEnabled = window.offlineEnabled;
  const closeLoading = showLoadingSpinner();
  const provideConfigs = createConfigLoader(configUrls);

  // ── Thème EGEN : une seule source, le backend du Core (même origine) ─────
  // Démarré en parallèle de l'import du styleguide. Le thème de repli embarqué est appliqué tout de suite ;
  // `setupTheme()` ne lève jamais : si le backend ne répond pas ou renvoie un thème refusé, le repli reste.
  const themeReady = setupTheme();

  // ── Tenant system setup ─────────────────────────────────────────────────
  // Initialisé juste avant le boot des apps. COMPLÈTEMENT INERTE si
  // EGEN_TENANT_MODE="off" ou absent — zéro overhead.
  //
  // Configuration (voir @egen-civitas/esm-tenant/src/config/env.ts pour le détail) :
  //   .env (build)      → EGEN_TENANT_MODE=multi | single | off, etc.
  //   window.* (runtime) → window.egenTenantMode = 'multi' (pont injecté par
  //                        rspack.config.js + index.ejs, seul canal
  //                        fonctionnel — pas d'import.meta.env dans ce build)
  //   setupTenantSystem  → options inline ci-dessous (priorité maximale)
  //
  // Rôle STRICT de ce système : capturer l'ID tenant depuis l'URL (sous-
  // domaine) et le rendre disponible dans le store global + `X-Tenant-ID`
  // sur chaque requête backend (voir @egen-civitas/esm-api). AUCUNE validation
  // frontend (existence, statut, thème, permissions) — c'est une
  // responsabilité backend. 100% synchrone, ne peut pas échouer : pas de
  // `.catch()` nécessaire, pas de registry à charger.
  setupTenantSystem();

  return Promise.all([import('@egen-civitas/esm-styleguide/src/index'), themeReady]).then(([_styleguide]) => {
    integrateBreakpoints();
    setupLayoutHeightSync();
    showToasts();
    showPageBackground();
    showWorkbench();
    setupPageTransitions();
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
      .then(setupPlatform)
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
