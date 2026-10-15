// =============================================================================
//  @egen-civitas/esm-ai-tools — Tools natifs EGEN
//
//  Tous les imports utilisent les barrels publics @egen-civitas/* officiels.
//  Signatures d'appel vérifiées contre les types réels du framework :
//    showNotification(NotificationDescriptor) → { description: string, kind?, title?, ... }
//    showSnackbar(SnackbarDescriptor)         → { title: string, subtitle?, kind?, ... }
//    showModal(name, props?, onClose?)
//    egenFetch(path, config?)                 → Promise<FetchResponse<T>>
//    navigate({ to })
// =============================================================================

import { navigate } from '@egen-civitas/esm-navigation';
import { showNotification, showSnackbar, showModal } from '@egen-civitas/esm-styleguide';
import { egenFetch } from '@egen-civitas/esm-api';
import { inferRootDomain, buildTenantSubdomainUrl, getTenantStoreState } from '@egen-civitas/esm-tenant';
import type { AIToolDefinition } from '../types.js';
import { getRoutesCatalogForLLM } from '../routes.js';
import { getVisibleUIActions, getUIActionElement, setNativeInputValue, setNativeSelectValue } from '../ui-actions.js';
import { getObservablesCatalogForLLM } from '../observables.js';
import { describeCurrentScreen } from './describe-screen.js';
import {
  isBase64,
  isValidTenantSlug,
  resolveAppRoute,
  sanitizeFilename,
  spaBaseTrimmed,
  validateApiPath,
  validateDownloadUrl,
} from './safety.js';
import { inspectDOMElement, inspectFullInterface, type InspectDetail } from './inspect-element.js';
import { buildStableSelector, getElementRef } from './dom-utils.js';
import { TARGET_PARAMS, resolveTarget } from './target.js';
import { createReadContext, describeTable, isTableElement } from './text-extract.js';
import { readPage } from './page-reader.js';
import { discoverComponents, readComponent } from './component-reader.js';
import { findInPage } from './find-in-page.js';
import { getDomTree, getPageState, isPageLoading, scrollPage, waitForPageReady } from './page-state.js';

export type { DescribedElement, DescribedHeading, DescribedLandmark, ScreenDescription } from './describe-screen.js';
export type {
  ElementInspectionReport,
  InterfaceNodeReport,
  FullInterfaceReport,
  InspectDetail,
  InspectOptions,
} from './inspect-element.js';
export type { PageReadResult, OutlineNode } from './page-reader.js';
export type { ComponentReport, ComponentParts, DiscoverResult, DiscoveredComponent } from './component-reader.js';
export type { FindMatch, FindResult } from './find-in-page.js';
export type { PageState, DomTreeResult, ScrollResult } from './page-state.js';
export type { FieldModel, TableModel } from './text-extract.js';

// ─── navigate ─────────────────────────────────────────────────────────────────

export const navigateTool: AIToolDefinition = {
  id: 'navigate',
  name: 'Naviguer vers une route',
  description:
    "Navigue vers une route interne de l'application EGEN. Utiliser pour emmener l'utilisateur sur une page " +
    'spécifique. IMPORTANT : ne JAMAIS deviner un chemin. Le chemin exact doit provenir soit du catalogue de ' +
    "routes déjà fourni dans le contexte, soit d'un appel préalable au tool list_routes si le contexte ne " +
    "suffit pas ou semble incomplet.",
  parameters: {
    route: {
      type: 'string',
      required: true,
      description: 'Route applicative cible, relative à la racine de la SPA (ex: "/students/123", "/login").',
    },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      // navigate() (voir @egen-civitas/esm-navigation) ne déclenche une vraie navigation SPA QUE si la
      // cible commence déjà par egenSpaBase — sinon rechargement complet de page. C'est donc CE tool qui
      // résout, de façon déterministe, le chemin « logique » reçu (« /login ») vers le chemin SPA, et qui
      // refuse toute destination externe.
      const resolved = resolveAppRoute(String(ctx.args.route));
      if (!resolved.ok) return { success: false, error: resolved.error, durationMs: 0 };
      const target = resolved.value;

      navigate({ to: target });
      return { success: true, data: { route: target }, durationMs: 0 };
    } catch (err) {
      return { success: false, error: String(err), durationMs: 0 };
    }
  },
};

// ─── show_notification ────────────────────────────────────────────────────────

export const showNotificationTool: AIToolDefinition = {
  id: 'show_notification',
  name: 'Afficher une notification',
  description: "Affiche une notification inline à l'utilisateur (succès, erreur, avertissement, information).",
  parameters: {
    description: {
      type: 'string',
      required: true,
      description: 'Message principal de la notification',
    },
    title: { type: 'string', required: false, description: 'Titre optionnel' },
    kind: {
      type: 'string',
      required: false,
      default: 'info',
      enum: ['error', 'info', 'info-square', 'success', 'warning', 'warning-alt'],
      description: 'Type de notification (correspond à NotificationDescriptor.kind)',
    },
    millis: {
      type: 'number',
      required: false,
      default: 5000,
      description: "Durée d'affichage en millisecondes",
    },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      showNotification({
        description: String(ctx.args.description),
        title: ctx.args.title ? String(ctx.args.title) : undefined,
        kind: (ctx.args.kind as any) ?? 'info',
        millis: (ctx.args.millis as number) ?? 5000,
      });
      return { success: true, durationMs: 0 };
    } catch (err) {
      return { success: false, error: String(err), durationMs: 0 };
    }
  },
};

// ─── show_snackbar ────────────────────────────────────────────────────────────

export const showSnackbarTool: AIToolDefinition = {
  id: 'show_snackbar',
  name: 'Afficher une snackbar',
  description: "Affiche un message snackbar temporaire en bas de l'écran.",
  parameters: {
    title: { type: 'string', required: true, description: 'Titre de la snackbar (champ obligatoire)' },
    subtitle: { type: 'string', required: false, description: 'Sous-titre ou message détaillé' },
    kind: {
      type: 'string',
      required: false,
      default: 'info',
      enum: ['success', 'error', 'warning', 'info'],
      description: 'Type de snackbar',
    },
    timeoutInMs: {
      type: 'number',
      required: false,
      default: 5000,
      description: "Durée d'affichage",
    },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      showSnackbar({
        title: String(ctx.args.title),
        subtitle: ctx.args.subtitle ? String(ctx.args.subtitle) : undefined,
        kind: (ctx.args.kind as any) ?? 'info',
        timeoutInMs: (ctx.args.timeoutInMs as number) ?? 5000,
      });
      return { success: true, durationMs: 0 };
    } catch (err) {
      return { success: false, error: String(err), durationMs: 0 };
    }
  },
};

// ─── open_modal ───────────────────────────────────────────────────────────────

export const openModalTool: AIToolDefinition = {
  id: 'open_modal',
  name: 'Ouvrir une modale',
  description:
    'Ouvre une modale EGEN identifiée par son nom. La modale doit être préalablement enregistrée par une app.',
  parameters: {
    name: { type: 'string', required: true, description: 'Nom de la modale à ouvrir' },
    props: { type: 'object', required: false, description: 'Props à passer à la modale' },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      // showModal(modalName: string, props: ModalProps = {}, onClose: () => void = () => {})
      showModal(String(ctx.args.name), (ctx.args.props as Record<string, unknown>) ?? {}, () => {});
      return { success: true, durationMs: 0 };
    } catch (err) {
      return { success: false, error: String(err), durationMs: 0 };
    }
  },
};

// ─── copy_to_clipboard ────────────────────────────────────────────────────────

export const copyToClipboardTool: AIToolDefinition = {
  id: 'copy_to_clipboard',
  name: 'Copier dans le presse-papier',
  description: "Copie du texte dans le presse-papier de l'utilisateur.",
  parameters: {
    text: { type: 'string', required: true, description: 'Texte à copier' },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      const text = String(ctx.args.text);
      await navigator.clipboard.writeText(text);
      return { success: true, data: { copiedLength: text.length }, durationMs: 0 };
    } catch (err) {
      return {
        success: false,
        error: `Impossible d'accéder au presse-papier : ${String(err)}`,
        durationMs: 0,
      };
    }
  },
};

// ─── download_file ────────────────────────────────────────────────────────────

export const downloadFileTool: AIToolDefinition = {
  id: 'download_file',
  name: 'Télécharger un fichier',
  description: "Déclenche le téléchargement d'un fichier depuis une URL ou un contenu base64.",
  parameters: {
    url: { type: 'string', required: false, description: 'URL du fichier à télécharger' },
    content: { type: 'string', required: false, description: 'Contenu base64 du fichier' },
    filename: { type: 'string', required: true, description: 'Nom du fichier téléchargé' },
    mimeType: {
      type: 'string',
      required: false,
      default: 'application/octet-stream',
      description: 'Type MIME',
    },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      const { url, content, filename, mimeType } = ctx.args as Record<string, string>;
      if (!url && !content) {
        return { success: false, error: '"url" ou "content" est requis', durationMs: 0 };
      }
      if (url) {
        const urlError = validateDownloadUrl(url);
        if (urlError) return { success: false, error: urlError, durationMs: 0 };
      } else if (!isBase64(content)) {
        return { success: false, error: '"content" doit être du base64 valide', durationMs: 0 };
      }
      const safeName = sanitizeFilename(filename);
      const link = document.createElement('a');
      link.download = safeName;
      link.rel = 'noopener noreferrer';
      link.href = url ? url : `data:${mimeType ?? 'application/octet-stream'};base64,${content}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true, data: { filename: safeName }, durationMs: 0 };
    } catch (err) {
      return { success: false, error: String(err), durationMs: 0 };
    }
  },
};

// ─── fetch_data ───────────────────────────────────────────────────────────────

export const fetchDataTool: AIToolDefinition = {
  id: 'fetch_data',
  name: 'Récupérer des données API',
  description: "Effectue une requête GET authentifiée vers l'API EGEN via egenFetch (X-Tenant-ID automatique).",
  parameters: {
    endpoint: {
      type: 'string',
      required: true,
      description: 'Endpoint relatif (ex: "/ws/rest/v1/student?limit=20")',
    },
    queryParams: {
      type: 'object',
      required: false,
      description: "Paramètres de requête supplémentaires (mergeés dans l'URL)",
    },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      const endpoint = String(ctx.args.endpoint);
      const pathError = validateApiPath(endpoint);
      if (pathError) return { success: false, error: pathError, durationMs: 0 };
      const queryParams = ctx.args.queryParams as Record<string, string> | undefined;

      let url = endpoint;
      if (queryParams && Object.keys(queryParams).length > 0) {
        const params = new URLSearchParams(Object.entries(queryParams).map(([k, v]) => [k, String(v)]));
        url += (url.includes('?') ? '&' : '?') + params.toString();
      }

      const response = await egenFetch(url);
      return { success: true, data: response.data, durationMs: 0 };
    } catch (err) {
      return { success: false, error: String(err), durationMs: 0 };
    }
  },
};

// ─── refresh_data ─────────────────────────────────────────────────────────────

export const refreshDataTool: AIToolDefinition = {
  id: 'refresh_data',
  name: 'Rafraîchir les données',
  description: 'Invalide le cache SWR pour forcer le rechargement des données.',
  parameters: {
    key: {
      type: 'string',
      required: false,
      description: 'Clé SWR à invalider. Si absent, invalide tout.',
    },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      const { mutate } = await import('swr');
      const key = ctx.args.key as string | undefined;
      if (key) {
        await mutate(key);
      } else {
        await mutate(() => true, undefined, { revalidate: true });
      }
      return { success: true, data: { key: key ?? 'all' }, durationMs: 0 };
    } catch (err) {
      return { success: false, error: String(err), durationMs: 0 };
    }
  },
};

// ─── switch_tenant ────────────────────────────────────────────────────────────

export const switchTenantTool: AIToolDefinition = {
  id: 'switch_tenant',
  name: "Changer d'établissement",
  description: "Redirige l'utilisateur vers un autre établissement (sous-domaine tenant différent).",
  parameters: {
    tenantSlug: {
      type: 'string',
      required: true,
      description: "Slug/identifiant de l'établissement cible",
    },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      const slug = String(ctx.args.tenantSlug).trim();
      if (!isValidTenantSlug(slug)) {
        return { success: false, error: `Identifiant d'établissement invalide : « ${slug} ».`, durationMs: 0 };
      }
      const hostname = window.location.hostname;
      // Domaine racine : priorité au rootDomain explicitement configuré
      // (EGEN_TENANT_ROOT_DOMAIN / setupTenantSystem({ rootDomain })), avec
      // repli heuristique sinon — même source unique de vérité que le reste
      // du système tenant (@egen-civitas/esm-tenant/src/utils/domain-utils.ts),
      // au lieu d'une extraction de domaine réimplémentée localement ici.
      const rootDomain = inferRootDomain(hostname, getTenantStoreState().config.rootDomain);
      const spaBase = window.getEgenSpaBase?.() ?? '/';
      const targetUrl = buildTenantSubdomainUrl(slug, rootDomain, spaBase);
      window.location.href = targetUrl;
      return { success: true, data: { targetUrl }, durationMs: 0 };
    } catch (err) {
      return { success: false, error: String(err), durationMs: 0 };
    }
  },
};

// ─── search ──────────────────────────────────────────────────────────────────

export const searchTool: AIToolDefinition = {
  id: 'search',
  name: 'Lancer une recherche globale',
  description: 'Navigue vers la page de recherche EGEN avec un terme prédéfini.',
  parameters: {
    query: { type: 'string', required: true, description: 'Terme de recherche' },
    category: {
      type: 'string',
      required: false,
      description: 'Catégorie (students, courses, reports…)',
    },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      const query = String(ctx.args.query);
      const category = ctx.args.category as string | undefined;
      const route = `${spaBaseTrimmed()}/search?q=${encodeURIComponent(query)}${
        category ? `&category=${encodeURIComponent(category)}` : ''
      }`;
      navigate({ to: route });
      return { success: true, data: { query, category }, durationMs: 0 };
    } catch (err) {
      return { success: false, error: String(err), durationMs: 0 };
    }
  },
};

// ─── list_routes ──────────────────────────────────────────────────────────────

export const listRoutesTool: AIToolDefinition = {
  id: 'list_routes',
  name: 'Lister les routes disponibles',
  description:
    "Retourne le catalogue des routes de l'application connues (chemin, description, paramètres attendus). " +
    "À appeler AVANT navigate quand on n'est pas certain à 100% du chemin exact d'une page — ne JAMAIS deviner " +
    "un chemin de navigation : soit il figure déjà dans le contexte fourni, soit il faut appeler ce tool pour le vérifier.",
  parameters: {},
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async () => {
    try {
      return { success: true, data: { routes: getRoutesCatalogForLLM() }, durationMs: 0 };
    } catch (err) {
      return { success: false, error: String(err), durationMs: 0 };
    }
  },
};

// ─── list_ui_actions ──────────────────────────────────────────────────────────

export const listUIActionsTool: AIToolDefinition = {
  id: 'list_ui_actions',
  name: "Lister les actions possibles sur l'écran courant",
  description:
    "Retourne le catalogue des boutons, liens et champs actuellement VISIBLES à l'écran (id, description, type). " +
    "Ce catalogue est déjà fourni dans le contexte à chaque message et se met à jour automatiquement quand l'écran " +
    "change — appeler ce tool seulement si le contexte semble tronqué ou pour revérifier après une navigation. " +
    "Ne JAMAIS deviner un id d'action : un id n'existe que s'il apparaît ici ou dans le contexte.",
  parameters: {},
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async () => {
    try {
      return { success: true, data: { actions: getVisibleUIActions() }, durationMs: 0 };
    } catch (err) {
      return { success: false, error: String(err), durationMs: 0 };
    }
  },
};

// ─── click_element ────────────────────────────────────────────────────────────

export const clickElementTool: AIToolDefinition = {
  id: 'click_element',
  name: 'Cliquer sur un élément',
  description:
    "Clique sur un bouton ou un lien de l'écran actuel, identifié par son id (voir le catalogue d'actions du " +
    "contexte, ou list_ui_actions). N'agit QUE sur un élément actuellement visible à l'écran.",
  parameters: {
    actionId: {
      type: 'string',
      required: true,
      description: "Identifiant exact de l'action, tel que fourni dans le catalogue — jamais deviné.",
    },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      const actionId = String(ctx.args.actionId);
      const el = getUIActionElement(actionId);
      if (!el) {
        return {
          success: false,
          error: `Aucun élément visible à l'écran avec l'id "${actionId}". Vérifie le catalogue d'actions courant avant de réessayer.`,
          durationMs: 0,
        };
      }
      el.click();
      return { success: true, data: { actionId }, durationMs: 0 };
    } catch (err) {
      return { success: false, error: String(err), durationMs: 0 };
    }
  },
};

// ─── Aides communes aux tools de lecture ──────────────────────────────────────

function numberArg(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function boolArg(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function detailArg(value: unknown, fallback: InspectDetail): InspectDetail {
  return value === 'compact' || value === 'standard' || value === 'full' ? value : fallback;
}

const fail = (error: string) => ({ success: false as const, error, durationMs: 0 });
const ok = (data: unknown) => ({ success: true as const, data, durationMs: 0 });

function hasTargetArg(args: Record<string, unknown>): boolean {
  return Boolean(args.ref || args.actionId || args.selector);
}

const TARGET_PARAMS_OPTIONAL = {
  ref: { ...TARGET_PARAMS.ref },
  actionId: { ...TARGET_PARAMS.actionId },
  selector: { ...TARGET_PARAMS.selector },
  matchIndex: { ...TARGET_PARAMS.matchIndex },
};

// ─── fill_field ────────────────────────────────────────────────────────────────

const TRUTHY = new Set(['true', '1', 'oui', 'yes', 'on', 'coché', 'checked', 'vrai']);
const FALSY = new Set(['false', '0', 'non', 'no', 'off', 'décoché', 'unchecked', 'faux', '']);

export const fillFieldTool: AIToolDefinition = {
  id: 'fill_field',
  name: 'Remplir un champ',
  description:
    "Renseigne un champ de formulaire de l'écran actuel, identifié par son id (voir le catalogue d'actions du " +
    "contexte, ou list_ui_actions). Gère les champs texte/zone de texte (saisie), les listes <select> (valeur ou " +
    'libellé de l\'option) et les cases à cocher / boutons radio (value = "true" ou "false"). N\'agit QUE sur un ' +
    'champ actuellement visible à l\'écran.',
  parameters: {
    actionId: {
      type: 'string',
      required: true,
      description: 'Identifiant exact du champ, tel que fourni dans le catalogue — jamais deviné.',
    },
    value: {
      type: 'string',
      required: true,
      description: 'Valeur à saisir ; libellé/valeur de l\'option pour un <select> ; "true"/"false" pour une case à cocher.',
    },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      const actionId = String(ctx.args.actionId);
      const value = String(ctx.args.value ?? '');
      const el = getUIActionElement(actionId);
      if (!el) {
        return fail(`Aucun champ visible à l'écran avec l'id "${actionId}". Vérifie le catalogue d'actions courant avant de réessayer.`);
      }

      if (el instanceof HTMLSelectElement) {
        if (el.disabled) return fail(`Le champ "${actionId}" est désactivé.`);
        const result = setNativeSelectValue(el, value);
        if (!result.ok) return fail(`${result.error} Options disponibles : ${result.available.join(' | ')}`);
        return ok({ actionId, selected: result.selected });
      }

      if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
        if (el.disabled) return fail(`Le champ "${actionId}" est désactivé.`);
        const normalized = value.trim().toLowerCase();
        if (!TRUTHY.has(normalized) && !FALSY.has(normalized)) {
          return fail('Pour une case à cocher / un bouton radio, value doit valoir "true" ou "false".');
        }
        const wanted = TRUTHY.has(normalized);
        if (el.checked !== wanted) el.click();
        return ok({ actionId, checked: el.checked });
      }

      if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
        return fail(`L'élément "${actionId}" n'est pas un champ de formulaire.`);
      }
      if (el.disabled || el.readOnly) return fail(`Le champ "${actionId}" est ${el.disabled ? 'désactivé' : 'en lecture seule'}.`);
      setNativeInputValue(el, value);
      return ok({ actionId });
    } catch (err) {
      return fail(String(err));
    }
  },
};

// ─── list_observables ─────────────────────────────────────────────────────────

export const listObservablesTool: AIToolDefinition = {
  id: 'list_observables',
  name: "Lister le contenu descriptif de l'écran",
  description:
    "Retourne le catalogue du contenu descriptif actuellement visible à l'écran (messages, listes, tableaux, " +
    "cartes) déclaré par l'application — position, état sémantique et données structurées. Ce catalogue est déjà " +
    'fourni dans le contexte à chaque message et se met à jour automatiquement ; appeler ce tool seulement si le ' +
    "contexte semble tronqué ou pour revérifier après un changement d'écran.",
  parameters: {},
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async () => {
    try {
      return ok({ observables: getObservablesCatalogForLLM() });
    } catch (err) {
      return fail(String(err));
    }
  },
};

// ─── describe_screen ──────────────────────────────────────────────────────────

export const describeScreenTool: AIToolDefinition = {
  id: 'describe_screen',
  name: "Décrire l'écran courant",
  description:
    "Vue d'ensemble LÉGÈRE de l'écran : titres, zones de page (landmarks), éléments interactifs visibles avec " +
    'leur nom, leur état, leur position et une référence (ref) réutilisable, contenu descriptif déclaré. Premier ' +
    "réflexe pour s'orienter ; pour LIRE le contenu (textes, cartes, tableaux, formulaires) utiliser read_page ; " +
    'pour un composant précis, read_component. Ne remplace PAS click_element/fill_field : une fois l\'élément ' +
    "identifié ici, s'il ne figure pas dans le catalogue d'actions, informer l'utilisateur que cette action " +
    "précise n'est pas encore prise en charge plutôt que de tenter une manipulation directe du DOM.",
  parameters: {
    limit: {
      type: 'number',
      required: false,
      description: "Éléments interactifs renvoyés au maximum (défaut 60, plafond 300). Si truncated=true, relancer avec offset.",
    },
    offset: { type: 'number', required: false, description: "Nombre d'éléments interactifs à sauter (pagination)." },
    includeOffscreen: {
      type: 'boolean',
      required: false,
      description: 'false pour ne garder que les éléments actuellement dans la fenêtre visible. Défaut : true.',
    },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      return ok(
        describeCurrentScreen({
          limit: numberArg(ctx.args.limit),
          offset: numberArg(ctx.args.offset),
          includeOffscreen: boolArg(ctx.args.includeOffscreen),
        }),
      );
    } catch (err) {
      return fail(String(err));
    }
  },
};

// ─── get_page_state ───────────────────────────────────────────────────────────

export const getPageStateTool: AIToolDefinition = {
  id: 'get_page_state',
  name: "État de la page",
  description:
    "Coup d'œil sur la page : URL, titre, langue, position de défilement, élément focalisé, texte sélectionné, " +
    'thème, micro-apps montées, compte d\'éléments par type, modales ouvertes, messages/alertes affichés (avec ' +
    "leur niveau), et surtout si la page est ENCORE EN CHARGEMENT (squelettes, spinners, aria-busy). À appeler " +
    "après une navigation ou une action pour vérifier que l'écran est prêt avant de le lire.",
  parameters: {},
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async () => {
    try {
      const state = getPageState();
      let tenantId: string | null = null;
      try {
        tenantId = (getTenantStoreState().tenantId as string | null | undefined) ?? null;
      } catch {
        // tenant non initialisé
      }
      return ok({ ...state, tenantId });
    } catch (err) {
      return fail(String(err));
    }
  },
};

// ─── read_page ────────────────────────────────────────────────────────────────

export const readPageTool: AIToolDefinition = {
  id: 'read_page',
  name: 'Lire le contenu de la page',
  description:
    "LIT tout ce qui est chargé dans la page (ou dans une zone) sous forme d'un plan structuré et indenté : zones " +
    'de page, composants (cartes, modales, onglets, alertes…), titres, textes, listes, tableaux (aperçu des ' +
    'lignes), formulaires et champs (libellé, valeur, erreurs, options), boutons, liens (avec href), images ' +
    '(alt). Shadow DOM et iframes de même origine inclus. Chaque nœud structurel porte une référence {eNN} à ' +
    'réutiliser avec read_component / read_table / inspect_element. C\'est LE tool pour connaître le contenu ' +
    "d'un écran. Les champs sensibles (mot de passe…) sont toujours masqués. Réponse paginée : si " +
    'lines.nextOffset est non nul, relancer avec offset.',
  parameters: {
    ...TARGET_PARAMS_OPTIONAL,
    includeHidden: {
      type: 'boolean',
      required: false,
      description: 'Lire aussi le contenu masqué (display:none, hidden…). Défaut : false.',
    },
    offset: { type: 'number', required: false, description: 'Première ligne du plan à renvoyer (pagination).' },
    maxChars: { type: 'number', required: false, description: 'Budget de caractères de la réponse (défaut 24000).' },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      let root: Element | undefined;
      if (hasTargetArg(ctx.args)) {
        const target = resolveTarget(ctx.args);
        if (!target.ok) return fail(target.error);
        root = target.el;
      }
      const result = readPage({
        root,
        includeHidden: boolArg(ctx.args.includeHidden),
        offset: numberArg(ctx.args.offset),
        maxChars: numberArg(ctx.args.maxChars),
      });
      return ok({ ...result, pageLoading: isPageLoading() });
    } catch (err) {
      return fail(String(err));
    }
  },
};

// ─── read_component ───────────────────────────────────────────────────────────

export const readComponentTool: AIToolDefinition = {
  id: 'read_component',
  name: 'Lire un composant en détail',
  description:
    "Lit le CONTENU d'un composant précis (titre, sous-titre, carte, tuile, modale, section, notification, " +
    "formulaire, liste…) : ses parties déduites (titre, sous-titre, corps, métadonnées, actions, médias, champs, " +
    'tableaux, listes), le plan complet de son contenu, son identité technique (composants React, bloc Carbon), ' +
    "les données déclarées par l'app à l'intérieur (observables) et les props du composant React propriétaire. " +
    "Cibler par ref (obtenue via read_page / find_in_page / discover_components), actionId ou selector. " +
    'La liste `children` permet de descendre dans un sous-composant.',
  parameters: {
    ...TARGET_PARAMS_OPTIONAL,
    includeHidden: { type: 'boolean', required: false, description: 'Lire aussi le contenu masqué. Défaut : false.' },
    includeReactProps: {
      type: 'boolean',
      required: false,
      description: 'Inclure les props du composant React propriétaire (secrets masqués). Défaut : true.',
    },
    maxChars: { type: 'number', required: false, description: 'Budget de caractères du plan (défaut 12000).' },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      const target = resolveTarget(ctx.args);
      if (!target.ok) return fail(target.error);
      return ok(
        readComponent(target.el, {
          includeHidden: boolArg(ctx.args.includeHidden),
          includeReactProps: boolArg(ctx.args.includeReactProps),
          maxChars: numberArg(ctx.args.maxChars),
        }),
      );
    } catch (err) {
      return fail(String(err));
    }
  },
};

// ─── read_table ───────────────────────────────────────────────────────────────

const TABLE_SELECTOR = 'table, [role="table"], [role="grid"], [role="treegrid"]';

export const readTableTool: AIToolDefinition = {
  id: 'read_table',
  name: 'Lire un tableau',
  description:
    "Lit un tableau complet (<table> ou grille ARIA, y compris Carbon DataTable) : légende, en-têtes, lignes " +
    "(paginées par offset/limit), pied de tableau, colonne triée, sélection. Cibler le tableau — ou un élément qui " +
    "le contient — par ref, actionId ou selector. À utiliser quand read_page indique « lignes de plus ». Ne lit " +
    "que les lignes présentes dans le DOM : une liste virtualisée n'en rend qu'une partie (voir scroll_to).",
  parameters: {
    ...TARGET_PARAMS_OPTIONAL,
    offset: { type: 'number', required: false, description: 'Première ligne à renvoyer (défaut 0).' },
    limit: { type: 'number', required: false, description: 'Nombre de lignes (défaut 50, plafond 500).' },
    includeHidden: { type: 'boolean', required: false, description: 'Inclure les lignes masquées. Défaut : false.' },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      const target = resolveTarget(ctx.args);
      if (!target.ok) return fail(target.error);

      const table = isTableElement(target.el)
        ? target.el
        : (target.el.querySelector(TABLE_SELECTOR) ?? target.el.closest(TABLE_SELECTOR));
      if (!table) return fail("Aucun tableau trouvé dans / autour de cet élément (cibler un <table> ou une grille ARIA).");

      const read = createReadContext({ includeHidden: boolArg(ctx.args.includeHidden) });
      const model = describeTable(table, read, {
        offset: numberArg(ctx.args.offset),
        limit: Math.min(numberArg(ctx.args.limit) ?? 50, 500),
      });
      return ok({ ref: getElementRef(table), selector: buildStableSelector(table), ...model });
    } catch (err) {
      return fail(String(err));
    }
  },
};

// ─── find_in_page ─────────────────────────────────────────────────────────────

export const findInPageTool: AIToolDefinition = {
  id: 'find_in_page',
  name: 'Chercher dans la page',
  description:
    "Retrouve OÙ un texte apparaît dans la page (texte affiché, et avec scope=all aria-label, title, placeholder, " +
    'alt, valeurs de champs) : pour chaque occurrence, la référence du bloc, un extrait avec contexte, la section ' +
    "(titre qui précède), la nature du composant et si c'est visible à l'écran. Idéal pour localiser un nom, un " +
    'montant, un message d\'erreur ou un libellé avant de le lire avec read_component.',
  parameters: {
    query: { type: 'string', required: true, description: 'Texte à chercher (ou expression régulière si regex=true).' },
    regex: { type: 'boolean', required: false, description: 'Interpréter query comme expression régulière (≤ 200 car.).' },
    caseSensitive: { type: 'boolean', required: false, description: 'Respecter la casse. Défaut : false.' },
    scope: {
      type: 'string',
      required: false,
      enum: ['text', 'all'],
      description: '"text" : texte affiché seulement ; "all" (défaut) : + attributs accessibles et valeurs de champs.',
    },
    includeHidden: { type: 'boolean', required: false, description: 'Chercher aussi dans le contenu masqué.' },
    limit: { type: 'number', required: false, description: "Occurrences détaillées (défaut 25, plafond 100)." },
    ...TARGET_PARAMS_OPTIONAL,
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      let root: Element | undefined;
      if (hasTargetArg(ctx.args)) {
        const target = resolveTarget(ctx.args);
        if (!target.ok) return fail(target.error);
        root = target.el;
      }
      const result = findInPage({
        query: String(ctx.args.query ?? ''),
        regex: boolArg(ctx.args.regex),
        caseSensitive: boolArg(ctx.args.caseSensitive),
        scope: ctx.args.scope === 'text' ? 'text' : 'all',
        includeHidden: boolArg(ctx.args.includeHidden),
        limit: numberArg(ctx.args.limit),
        root,
      });
      if ('error' in result) return fail(result.error);
      return ok(result);
    } catch (err) {
      return fail(String(err));
    }
  },
};

// ─── discover_components ──────────────────────────────────────────────────────

export const discoverComponentsTool: AIToolDefinition = {
  id: 'discover_components',
  name: 'Découvrir les composants de la page',
  description:
    "Inventaire des composants présents dans la page : zones de page, cartes/tuiles, modales, onglets, " +
    "accordéons, notifications, tableaux, formulaires, tags, fils d'Ariane, pagination, etc. — avec leur nature, " +
    "titre, extrait, composant React / bloc Carbon et position — et le décompte par nature. kinds=['react-component'] " +
    "liste les composants React eux-mêmes ; reactComponents donne toujours les plus fréquents. À utiliser pour " +
    'savoir quoi lire, puis read_component sur la ref voulue.',
  parameters: {
    kinds: {
      type: 'array',
      required: false,
      items: { type: 'string' },
      description: "Ne garder que ces natures (ex: ['card','dialog','tabs','notification','table','form']).",
    },
    query: { type: 'string', required: false, description: 'Filtre texte sur la nature, le nom (React/Carbon) ou le titre.' },
    limit: { type: 'number', required: false, description: 'Composants détaillés (défaut 100, plafond 500).' },
    includeHidden: { type: 'boolean', required: false, description: 'Inclure les composants masqués.' },
    ...TARGET_PARAMS_OPTIONAL,
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      let root: Element | undefined;
      if (hasTargetArg(ctx.args)) {
        const target = resolveTarget(ctx.args);
        if (!target.ok) return fail(target.error);
        root = target.el;
      }
      const kinds = Array.isArray(ctx.args.kinds) ? ctx.args.kinds.map(String) : undefined;
      return ok(
        discoverComponents({
          root,
          kinds,
          query: ctx.args.query ? String(ctx.args.query) : undefined,
          limit: numberArg(ctx.args.limit),
          includeHidden: boolArg(ctx.args.includeHidden),
        }),
      );
    } catch (err) {
      return fail(String(err));
    }
  },
};

// ─── get_dom_tree ─────────────────────────────────────────────────────────────

export const getDomTreeTool: AIToolDefinition = {
  id: 'get_dom_tree',
  name: "Arbre DOM compact",
  description:
    "Arbre DOM compact (une ligne par nœud : balise, id, classes, rôle, référence, texte direct) en largeur " +
    "d'abord, pour comprendre la STRUCTURE d'une zone sans le volume d'inspect_interface. À utiliser quand " +
    "read_page ne suffit pas à comprendre comment la page est construite (conteneurs, classes, imbrication).",
  parameters: {
    ...TARGET_PARAMS_OPTIONAL,
    maxDepth: { type: 'number', required: false, description: 'Profondeur maximale (défaut 4, plafond 12).' },
    maxNodes: { type: 'number', required: false, description: 'Nombre de nœuds affichés (défaut 250, plafond 1500).' },
    includeText: { type: 'boolean', required: false, description: 'Afficher le texte direct de chaque nœud. Défaut : true.' },
    includeHidden: { type: 'boolean', required: false, description: 'Inclure les nœuds masqués.' },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      let root: Element | undefined;
      if (hasTargetArg(ctx.args)) {
        const target = resolveTarget(ctx.args);
        if (!target.ok) return fail(target.error);
        root = target.el;
      }
      return ok(
        getDomTree({
          root,
          maxDepth: numberArg(ctx.args.maxDepth),
          maxNodes: numberArg(ctx.args.maxNodes),
          includeText: boolArg(ctx.args.includeText),
          includeHidden: boolArg(ctx.args.includeHidden),
        }),
      );
    } catch (err) {
      return fail(String(err));
    }
  },
};

// ─── scroll_to ────────────────────────────────────────────────────────────────

export const scrollToTool: AIToolDefinition = {
  id: 'scroll_to',
  name: 'Faire défiler la page',
  description:
    "Fait défiler la page jusqu'à un élément (centré dans la fenêtre) ou dans une direction (top, bottom, up, " +
    "down), puis renvoie la position obtenue. Utile pour révéler du contenu chargé au défilement (listes " +
    "virtualisées, chargement infini) avant de relire la page. N'a aucun effet sur les données.",
  parameters: {
    ...TARGET_PARAMS_OPTIONAL,
    direction: {
      type: 'string',
      required: false,
      enum: ['top', 'bottom', 'up', 'down'],
      description: "Direction de défilement de la fenêtre si aucune cible n'est donnée (up/down = 85 % de la hauteur visible).",
    },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      if (hasTargetArg(ctx.args)) {
        const target = resolveTarget(ctx.args);
        if (!target.ok) return fail(target.error);
        return ok(scrollPage({ el: target.el }));
      }
      const direction = ctx.args.direction;
      if (direction !== 'top' && direction !== 'bottom' && direction !== 'up' && direction !== 'down') {
        return fail('Fournir une cible (ref, actionId, selector) ou direction (top, bottom, up, down).');
      }
      return ok(scrollPage({ direction }));
    } catch (err) {
      return fail(String(err));
    }
  },
};

// ─── inspect_element ──────────────────────────────────────────────────────────
//
// Complémentaire à describe_screen/read_page (qui restent légers et sémantiques).
// Ce tool est la plongée technique sur UN élément : CSS, cascade, géométrie,
// accessibilité, contenu, React. Voir native/inspect-element.ts.

export const inspectElementTool: AIToolDefinition = {
  id: 'inspect_element',
  name: 'Inspecter un élément en détail',
  description:
    "Rapport technique et visuel sur un élément précis de l'écran actuel : identité (tag, attributs, chemin DOM, " +
    'ref), géométrie et visibilité, style CSS calculé (intégral en detail=full, regroupé en standard), cascade ' +
    "de règles CSS appliquées (full), accessibilité, contenu (texte/valeur, options d'un select, texte injecté " +
    'par CSS ::before/::after, champs sensibles toujours masqués), et — au mieux — le composant React propriétaire ' +
    "et ses props. Si l'élément a été déclaré via useAIActionable/useAIObservable, ses métadonnées déclarées sont " +
    'incluses. À utiliser pour un diagnostic précis (pourquoi cet aspect, ce comportement) — PAS pour lire le ' +
    'contenu (read_page / read_component).',
  parameters: {
    ...TARGET_PARAMS_OPTIONAL,
    detail: {
      type: 'string',
      required: false,
      enum: ['full', 'standard', 'compact'],
      description:
        '"full" (défaut) : tout ; "standard" : CSS regroupé sans cascade ; "compact" : sans CSS. Les sections omises sont listées dans omittedSections.',
    },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      const target = resolveTarget(ctx.args);
      if (!target.ok) return fail(target.error);
      return ok(inspectDOMElement(target.el, target.actionId, { detail: detailArg(ctx.args.detail, 'full') }));
    } catch (err) {
      return fail(String(err));
    }
  },
};

// ─── inspect_interface ────────────────────────────────────────────────────────

export const inspectInterfaceTool: AIToolDefinition = {
  id: 'inspect_interface',
  name: "Inspecter l'interface courante en détail",
  description:
    "Rapport technique (même structure qu'inspect_element) pour CHAQUE élément significatif affiché (boutons, " +
    'champs, labels, titres, images, zones sémantiques…), avec la hiérarchie parent/enfant. Par défaut en ' +
    'detail=standard (CSS regroupé par catégorie, sans cascade) et paginé (120 nœuds) : un rapport « full » sur ' +
    "tout l'écran est énorme. À réserver aux audits techniques/visuels ; pour LIRE l'écran préférer read_page, " +
    "pour la structure get_dom_tree.",
  parameters: {
    rootSelector: {
      type: 'string',
      required: false,
      description: "Sélecteur CSS pour limiter l'inspection à une sous-partie de l'écran (ex: '.main-content'). Si absent, inspecte tout <body>.",
    },
    detail: {
      type: 'string',
      required: false,
      enum: ['full', 'standard', 'compact'],
      description: '"standard" (défaut) ; "compact" : sans CSS ; "full" : CSS intégral + cascade (très volumineux).',
    },
    limit: { type: 'number', required: false, description: 'Nœuds renvoyés (défaut 120, plafond 500).' },
    offset: { type: 'number', required: false, description: 'Nœuds significatifs à sauter (pagination ; voir nextOffset).' },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      const rootSelector = ctx.args.rootSelector ? String(ctx.args.rootSelector) : undefined;
      return ok(
        inspectFullInterface(rootSelector, {
          detail: detailArg(ctx.args.detail, 'standard'),
          limit: numberArg(ctx.args.limit) ?? 120,
          offset: numberArg(ctx.args.offset),
        }),
      );
    } catch (err) {
      return fail(String(err));
    }
  },
};

// ─── navigate_and_inspect / navigate_and_read ─────────────────────────────────
//
// Couvre le besoin d'examiner N'IMPORTE QUELLE interface du projet, pas seulement
// celle affichée — SANS analyse statique (irréalisable : CSS calculé, props React
// et contenu n'existent qu'une fois l'élément monté et rendu). La seule approche
// fiable est de naviguer réellement vers la route, attendre le montage de la
// micro-app ET la fin des indicateurs de chargement, puis lire/inspecter.

const ROUTE_PARAM = {
  type: 'string' as const,
  required: true,
  description: 'Route applicative cible, relative à la racine de la SPA (ex: "/students/123", "/login").',
};

export const navigateAndInspectTool: AIToolDefinition = {
  id: 'navigate_and_inspect',
  name: 'Naviguer puis inspecter une interface',
  description:
    "Navigue vers une route de l'application (voir navigate — même règle : ne jamais deviner un chemin, le " +
    "prendre du catalogue de routes ou de list_routes), attend que l'écran se stabilise et que le chargement se " +
    "termine, puis retourne le même rapport qu'inspect_interface (detail=standard par défaut). Pour LIRE le " +
    'contenu de cette route, préférer navigate_and_read.',
  parameters: {
    route: ROUTE_PARAM,
    rootSelector: {
      type: 'string',
      required: false,
      description: "Sélecteur CSS pour limiter l'inspection à une sous-partie de l'écran cible.",
    },
    detail: {
      type: 'string',
      required: false,
      enum: ['full', 'standard', 'compact'],
      description: '"standard" (défaut) ; "compact" : sans CSS ; "full" : CSS intégral + cascade.',
    },
    limit: { type: 'number', required: false, description: 'Nœuds renvoyés (défaut 120, plafond 500).' },
    offset: { type: 'number', required: false, description: 'Nœuds significatifs à sauter (pagination).' },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      const route = String(ctx.args.route);
      const rootSelector = ctx.args.rootSelector ? String(ctx.args.rootSelector) : undefined;

      const resolved = resolveAppRoute(route);
      if (!resolved.ok) return fail(resolved.error);
      const target = resolved.value;

      navigate({ to: target });
      const ready = await waitForPageReady();

      return ok({
        navigatedTo: target,
        stillLoading: ready.stillLoading,
        ...inspectFullInterface(rootSelector, {
          detail: detailArg(ctx.args.detail, 'standard'),
          limit: numberArg(ctx.args.limit) ?? 120,
          offset: numberArg(ctx.args.offset),
        }),
      });
    } catch (err) {
      return fail(String(err));
    }
  },
};

export const navigateAndReadTool: AIToolDefinition = {
  id: 'navigate_and_read',
  name: 'Naviguer puis lire une page',
  description:
    "Navigue vers une route de l'application (ne jamais deviner un chemin : le prendre du catalogue de routes ou " +
    "de list_routes), attend que l'écran se stabilise et que le chargement se termine, puis lit tout son contenu " +
    "comme read_page (plan structuré : titres, textes, cartes, tableaux, formulaires, liens…). À utiliser pour " +
    "connaître le contenu d'une page différente de celle actuellement affichée.",
  parameters: {
    route: ROUTE_PARAM,
    offset: { type: 'number', required: false, description: 'Première ligne du plan à renvoyer (pagination).' },
    maxChars: { type: 'number', required: false, description: 'Budget de caractères de la réponse (défaut 24000).' },
  },
  moduleName: '@egen-civitas/esm-ai-tools',
  execute: async (ctx) => {
    try {
      const resolved = resolveAppRoute(String(ctx.args.route));
      if (!resolved.ok) return fail(resolved.error);
      const target = resolved.value;

      navigate({ to: target });
      const ready = await waitForPageReady();

      const result = readPage({ offset: numberArg(ctx.args.offset), maxChars: numberArg(ctx.args.maxChars) });
      return ok({ navigatedTo: target, stillLoading: ready.stillLoading, ...result });
    } catch (err) {
      return fail(String(err));
    }
  },
};

// ─── Export groupé ────────────────────────────────────────────────────────────

export const NATIVE_TOOLS: AIToolDefinition[] = [
  navigateTool,
  listRoutesTool,
  listUIActionsTool,
  listObservablesTool,
  describeScreenTool,
  getPageStateTool,
  readPageTool,
  readComponentTool,
  readTableTool,
  findInPageTool,
  discoverComponentsTool,
  getDomTreeTool,
  scrollToTool,
  inspectElementTool,
  inspectInterfaceTool,
  navigateAndInspectTool,
  navigateAndReadTool,
  clickElementTool,
  fillFieldTool,
  showNotificationTool,
  showSnackbarTool,
  openModalTool,
  copyToClipboardTool,
  downloadFileTool,
  fetchDataTool,
  refreshDataTool,
  switchTenantTool,
  searchTool,
];
